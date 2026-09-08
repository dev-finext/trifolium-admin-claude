// The orders domain: selection, filtering and every mutation an agent can make
// to an order.
//
// Three business rules live here rather than in any screen:
//
//   1. Item-level tracking. Every compounded formula carries its own preparation
//      stage, and the ORDER's status is always the LOWEST stage among its
//      non-cancelled items — there are no split orders and no partial shipments.
//      `statusOf()` is that derivation; screens call it instead of reading
//      `order.status`, which is only the last status anyone wrote down.
//   2. A credit order (הקפה) reaches the lab unpaid. No tax document and no
//      allocation number exist until its collection link is paid, and the amount
//      sits in the practitioner's open debt until then.
//   3. Cancelling one item never moves the other items. It refunds that item's
//      share and leaves the rest of the order running.
//
// Mutations update the loaded records optimistically and call `persist()`, which
// is a no-op against the fixture: the console is fully interactive without a
// backend and never pretends a request happened.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    CREDIT,
    LAB_ROLE_IDS,
    ORDER_TO_ITEM_STAGE,
    PAY_LINK,
    SETTLED_STATUS_IDS,
    STAGE_TO_STATUS,
    itemStageIndex,
} from '@/config';
import { persist } from '@/data/source';
import { inRange } from '@/lib/dateRange';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { applyFilters } from '@/lib/facets';
import { locDeep, searchHaystack } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/** Fields the free-text search covers, in both languages. */
export function orderHaystack(order) {
    return searchHaystack(
        order.id,
        order.patient?.name,
        order.patient?.phone,
        order.practitioner?.name,
        order.practitioner?.code,
        order.tracking,
    );
}

/** The compounded formulas on an order — the only items that carry a stage. */
export function trackedItems(order) {
    return (order.items || []).filter((item) => item.kind === 'formula');
}

/** The shelf lines on an order, which are not tracked individually. */
export function shelfItems(order) {
    return (order.items || []).filter((item) => item.kind === 'shelf');
}

/**
 * The items still running. A shelf line carries no stage at all — it is picked,
 * not made — with one exception: cancelling a line writes `cancelled` onto it,
 * whatever its kind, so that is the only stage a shelf line ever holds.
 */
function liveItems(order, kind) {
    return (order.items || []).filter(
        (item) => item.kind === kind && item.stage !== 'cancelled',
    );
}

/** The least advanced stage among the items still running, or null. */
export function lowestStage(order) {
    const live = trackedItems(order).filter(
        (item) => item.stage !== 'cancelled',
    );

    if (!live.length) {
        return null;
    }

    return live.reduce(
        (low, item) =>
            itemStageIndex(item.stage) < itemStageIndex(low) ? item.stage : low,
        live[0].stage,
    );
}

/**
 * The order's real status.
 *
 * Only compounded formulas carry a stage, so only they can move an order along.
 * Three cases, in the order they are decided:
 *
 * 1. Nothing live at all — every line cancelled — and the order is cancelled.
 *
 * 2. Live lines, but no formula among them. Either the order was shelf products
 *    from the start (a third of them are) or its formula was cancelled and the
 *    shelf lines carry on, which is the rule: cancelling one line never moves the
 *    others. There is no lab step here — the lines are picked off the shelf, and
 *    picking IS the packing — so once the money is settled the order reads as
 *    `ready_for_delivery` and lands on the deliveries desk, instead of sitting at
 *    `paid` waiting for a step that does not exist. Before payment and after
 *    dispatch the recorded status stands.
 *
 * 3. A live formula exists, and the lowest stage among them decides. Shelf lines
 *    on the same order ride along: no split orders and no partial shipment, so the
 *    packer takes them when the formula is ready. The recorded status is kept
 *    whenever it already agrees with that stage, because two statuses map onto one
 *    stage and only the record knows which — `credit` and `paid` both sit at
 *    `awaiting_prep`, `delivered` and `completed` both at `delivered`.
 */
export function statusOf(order) {
    if (!order) {
        return '';
    }

    const formulas = liveItems(order, 'formula');
    const shelf = liveItems(order, 'shelf');

    if (!formulas.length && !shelf.length) {
        return (order.items || []).length ? 'cancelled' : order.status;
    }

    if (!formulas.length) {
        return SETTLED_STATUS_IDS.includes(order.status)
            ? 'ready_for_delivery'
            : order.status;
    }

    const lowest = lowestStage(order);

    if (ORDER_TO_ITEM_STAGE[order.status] === lowest) {
        return order.status;
    }

    return STAGE_TO_STATUS[lowest] || order.status;
}

/**
 * Whether an agent may send this order to the lab.
 *
 * This is the *only* status an agent sets by hand, and the reason is that it is
 * the only one no other system can report. Payment is reported by the clearing
 * provider, the compounding stages by the lab as it works the order, dispatch and
 * delivery by the courier. Committing materials to a formula, on the other hand,
 * is somebody deciding to start — there is nothing to observe until they do.
 *
 * Two things have to hold. The money is settled, in one of the two ways it can
 * be — the order is paid, or the practitioner is approved for credit terms and
 * the balance is collected later, which are exactly the `paid` and `credit`
 * statuses. And there is something to compound: a third of the orders are shelf
 * products only, and those have no lab step at all.
 */
export function canSendToLab(order) {
    if (!SETTLED_STATUS_IDS.includes(statusOf(order))) {
        return false;
    }

    return trackedItems(order).some((item) => item.stage !== 'cancelled');
}

/**
 * What cancelling one item refunds: a shelf line refunds its own price, a formula
 * refunds its equal share of what the order charged beyond the shelf lines.
 */
export function itemRefund(order, item) {
    if (!order || !item) {
        return 0;
    }

    if (item.kind === 'shelf') {
        return item.price * item.qty;
    }

    const shelfSum = shelfItems(order).reduce(
        (sum, line) => sum + line.price * line.qty,
        0,
    );
    const formulas = trackedItems(order).length || 1;

    return Math.max(0, Math.round((order.pricing.total - shelfSum) / formulas));
}

/**
 * Where a customer payment link lives. The pharmacy's own host, so the link a
 * customer receives is recognisably the pharmacy's and not a gateway's.
 */
const PAY_LINK_BASE = 'https://pay.trifolium.co.il/p';

/** The customer payment link for an order. */
export function payLink(order) {
    return order?.payToken ? `${PAY_LINK_BASE}/${order.payToken}` : '';
}

/**
 * Apply the list filters. The date range is deliberately NOT applied here: it is
 * the outermost filter, so the status counts a screen shows are always counted
 * inside the range that is already in force.
 *
 * @param {Array} orders
 * @param {{status?, flag?, payer?, fulfilment?, courier?, practitioner?, type?, city?, amount?, q?}} f
 */
/**
 * The fields the order book can be filtered by, declared once.
 *
 * Every `set` field is a multi-select: OR inside the field, AND across fields.
 * Two pseudo-values earn their place because they answer questions the raw data
 * cannot — `status: 'hold'` (an order parked before the lab, whatever its
 * status) and `flag: 'any'` (has some open exception, without naming which).
 *
 * There is no display text here: `group` and every value are ids, and the drawer
 * resolves them through the locale catalogs.
 */
export const ORDER_FILTER_FIELDS = [
    {
        key: 'status',
        group: 'state',
        kind: 'set',
        values: (o) => (o.hold ? [statusOf(o), 'hold'] : [statusOf(o)]),
    },
    {
        key: 'flag',
        group: 'state',
        kind: 'set',
        values: (o) => (o.flags?.length ? [...o.flags, 'any'] : []),
    },
    {
        key: 'docStatus',
        group: 'state',
        kind: 'set',
        prefix: 'docState',
        values: (o) => [o.docStatus || 'none'],
    },
    {
        key: 'type',
        group: 'content',
        kind: 'set',
        prefix: 'orders.type',
        values: (o) => [o.type],
    },
    {
        key: 'payer',
        group: 'money',
        kind: 'set',
        prefix: 'payer',
        values: (o) => [o.payer],
    },
    {
        key: 'credit',
        group: 'money',
        kind: 'set',
        prefix: 'orders.filter.credit',
        values: (o) => [o.credit ? 'yes' : 'no'],
    },
    {
        key: 'total',
        group: 'money',
        kind: 'num',
        value: (o) => o.pricing.total,
    },
    {
        key: 'fulfilment',
        group: 'delivery',
        kind: 'set',
        prefix: 'fulfilment',
        values: (o) => [o.deliveryType],
    },
    {
        key: 'courier',
        group: 'delivery',
        kind: 'set',
        values: (o) => [o.courier || 'none'],
    },
    {
        key: 'poa',
        group: 'delivery',
        kind: 'set',
        prefix: 'orders.filter.poa',
        values: (o) => [o.poaSigned ? 'yes' : 'no'],
    },
    {
        key: 'address',
        group: 'delivery',
        kind: 'set',
        prefix: 'orders.filter.address',
        values: (o) => [o.addressProvided ? 'yes' : 'no'],
    },
    {
        // The Hebrew source text is the city's stable key, so a filtered link
        // opens on the same city whichever language the reader is in.
        key: 'city',
        group: 'delivery',
        kind: 'set',
        values: (o) => (o.address?.city?.he ? [o.address.city.he] : []),
    },
    {
        key: 'practitioner',
        group: 'people',
        kind: 'set',
        values: (o) => [o.practitioner.code],
    },
    {
        key: 'therapy',
        group: 'people',
        kind: 'set',
        prefix: 'therapy',
        values: (o) => [o.practitioner.therapy],
    },
    { key: 'days', group: 'time', kind: 'num', value: (o) => o.daysAgo },
];

/**
 * What the lab may narrow its queue by. The one field that matters most is
 * `todo`: which of the four roles has *not* been marked yet — that is the
 * question the bench asks all day, and it cannot be asked of the order list.
 */
export const LAB_FILTER_FIELDS = [
    {
        key: 'stage',
        group: 'state',
        kind: 'set',
        prefix: 'status',
        values: (o) => [statusOf(o)],
    },
    {
        key: 'urgent',
        group: 'state',
        kind: 'set',
        prefix: 'lab.filter.urgentState',
        values: (o) => [o.urgent ? 'yes' : 'no'],
    },
    {
        key: 'todo',
        group: 'work',
        kind: 'set',
        prefix: 'orders.labRole',
        values: (o) => LAB_ROLE_IDS.filter((role) => !o.lab?.[role]),
    },
    {
        key: 'prep',
        group: 'work',
        kind: 'set',
        values: (o) => [
            ...new Set(
                trackedItems(o)
                    .filter((item) => item.stage !== 'cancelled')
                    .map((item) => item.typeId),
            ),
        ],
    },
    {
        key: 'fulfilment',
        group: 'delivery',
        kind: 'set',
        prefix: 'fulfilment',
        values: (o) => [o.deliveryType],
    },
    {
        key: 'practitioner',
        group: 'people',
        kind: 'set',
        values: (o) => [o.practitioner.code],
    },
    { key: 'waiting', group: 'time', kind: 'num', value: (o) => o.daysAgo },
];

export const LAB_FILTER_GROUPS = [
    'state',
    'work',
    'delivery',
    'people',
    'time',
];

/** The order the drawer lays the field groups out in. */
export const ORDER_FILTER_GROUPS = [
    'state',
    'content',
    'money',
    'delivery',
    'people',
    'time',
];

/** Every filter key, for wiring the URL state and the "clear" action. */
export const ORDER_FILTER_KEYS = ORDER_FILTER_FIELDS.map((f) => f.key);

export function filterOrders(orders, f = {}) {
    const q = String(f.q || '')
        .trim()
        .toLowerCase();

    // The declared fields are handled generically, so adding a filter is a line
    // in ORDER_FILTER_FIELDS rather than another branch here.
    const rows = applyFilters(orders, ORDER_FILTER_FIELDS, f);

    return q ? rows.filter((order) => orderHaystack(order).includes(q)) : rows;
}

/** Restrict a list of orders to a date range. */
export function ordersInRange(orders, range) {
    return orders.filter((order) => inRange(order.iso, range));
}

/** Unique ids for the documentation entries this session writes. */
let entrySequence = 0;

/** "Now", in the three forms a fixture record states a moment in. */
function moment() {
    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(now()),
        stamp: stamp(0),
    };
}

export const useOrdersStore = defineStore('orders', () => {
    const dataset = useDatasetStore();

    const all = computed(() => dataset.orders);
    const templates = computed(() => dataset.data.messageTemplates || []);
    const batchUse = computed(() => dataset.data.batchUse || []);
    const interactions = computed(() => dataset.data.interactions || []);
    const collectionLinks = computed(() => dataset.collectionLinks);

    /** The pinned internal note the fixture carries on the order rail. */
    const pinnedNote = computed(() => dataset.data.orderNote || null);

    /** V2: the managed texts every preparation carries — instructions default, regulatory text. */
    const labSettings = computed(() => dataset.data.labSettings || null);

    /** The agent every action in this session is attributed to. */
    const actor = computed(
        () => dataset.me?.name || dataset.session?.actor || null,
    );

    const flaggedCount = computed(() => dataset.flaggedOrders.length);

    const byId = (id) => all.value.find((order) => order.id === id) || null;

    const messagesFor = (id) =>
        dataset.messages.filter((message) => message.order === id);

    /** The first template of a category — the one an automated send would use. */
    const templateByCategory = (category) =>
        templates.value.find((template) => template.cat === category) || null;

    const templateById = (id) =>
        templates.value.find((template) => template.id === id) || null;

    /** Batches the lab allocated to this order's formulas. */
    const batchesFor = (id) => batchUse.value.filter((row) => row.order === id);

    /** The collection link that covers a practitioner's whole open balance. */
    const collectionLinkFor = (code) =>
        collectionLinks.value.find((link) => link.code === code) || null;

    /** Automatic log and manual agent entries, one stream, newest first. */
    const documentationFor = (order) => {
        const rows = [
            ...(order.documentation || []),
            ...(order.docsExtra || []),
        ];

        // ISO date + wall-clock time sorts correctly as a plain string; the
        // display stamp (dd.mm.yyyy) does not.
        const key = (row) => `${row.when?.iso || ''} ${row.when?.time || ''}`;

        return rows.slice().sort((a, b) => key(b).localeCompare(key(a)));
    };

    /** Every distinct herb on the order's formulas. */
    const herbsOf = (order) => {
        const seen = new Map();

        trackedItems(order).forEach((item) =>
            (item.herbs || []).forEach((herb) => {
                if (!seen.has(herb.id)) {
                    seen.set(herb.id, herb);
                }
            }),
        );

        return [...seen.values()];
    };

    /**
     * Documented interactions between this order's herbs and the medicines the
     * patient declared. One card per herb/medicine pair, however many formulas
     * the herb appears on.
     */
    const interactionsFor = (order) => {
        const meds = order?.patient?.meds || [];

        if (!meds.length) {
            return [];
        }

        const hits = [];
        const seen = new Set();

        herbsOf(order).forEach((herb) => {
            interactions.value
                .filter((row) => row.herbId === herb.id)
                .forEach((row) => {
                    const med = meds.find((drug) =>
                        row.drug.toLowerCase().includes(drug.toLowerCase()),
                    );
                    const key = `${herb.id}|${med}`;

                    if (!med || seen.has(key)) {
                        return;
                    }

                    seen.add(key);
                    hits.push({ id: key, herb, med, drugs: row.drug });
                });
        });

        return hits;
    };

    /**
     * The moment each step of the happy path was reached, read off the order's
     * own audit trail. A step nothing recorded has no date — the rail shows a
     * dash rather than a guess.
     */
    const flowStamps = (order) => {
        const stamps = { pending_payment: order.placed?.stamp || order.stamp };

        (order.audit || []).forEach((row) => {
            if (row.valueType === 'status' && row.to && !stamps[row.to]) {
                stamps[row.to] = row.when?.stamp || null;
            }
        });

        return stamps;
    };

    // ---- mutations -----------------------------------------------------------

    /**
     * Write one row to the order's documentation stream.
     *
     * `actionId` is an id from config/log.js and `detail` a locale key with its
     * parameters, so the entry renders in whichever language it is read back in.
     */
    function logEntry(order, entry) {
        if (!Array.isArray(order.docsExtra)) {
            order.docsExtra = [];
        }

        entrySequence += 1;

        order.docsExtra.push({
            id: `x${entrySequence}`,
            kind: 'agent',
            when: moment(),
            actor: actor.value,
            ...entry,
        });
    }

    /**
     * Clear the exception flags a mutation has just resolved.
     *
     * This only ever removes flags: the dataset asserts which conditions were
     * open when it was built, and the store's job is to retire the ones its own
     * change made untrue — never to invent a new one.
     */
    function reviewFlags(order) {
        const status = statusOf(order);
        const resolved = new Set();

        if (status !== 'pending_payment') {
            resolved.add('pay_stale');
            resolved.add('link_expiring');
        }

        if (status !== 'in_production') {
            resolved.add('lab');
        }

        if (status !== 'ready_for_delivery' || order.courier) {
            resolved.add('courier');
        }

        if (order.addressProvided) {
            resolved.add('address');
        }

        if (order.docStatus !== 'failed') {
            resolved.add('doc_failed');
        }

        if (!order.credit || order.creditPaid) {
            resolved.add('credit_debt');
        }

        if (status === 'cancelled' || status === 'completed') {
            resolved.add('interaction');
        }

        order.flags = (order.flags || []).filter((flag) => !resolved.has(flag));
    }

    /**
     * Move an order's items to the stage the new status puts them in. Cancelled
     * items are left where they are: a cancellation is not undone by the rest of
     * the order moving on.
     */
    function syncItemStages(order, status) {
        const stage = ORDER_TO_ITEM_STAGE[status];

        if (!stage) {
            return;
        }

        trackedItems(order).forEach((item) => {
            if (item.stage !== 'cancelled') {
                item.stage = stage;
            }
        });
    }

    /**
     * Set an order's status, taking its items with it.
     *
     * @param {string} id
     * @param {string} status
     * @param {string} [reason] Written reason, recorded on the entry.
     */
    async function setStatus(id, status, reason = '') {
        const order = byId(id);

        if (!order || !status) {
            return null;
        }

        const from = statusOf(order);

        order.status = status;
        syncItemStages(order, status);
        reviewFlags(order);

        logEntry(order, {
            actionId:
                status === 'cancelled' ? 'order_cancel' : 'order_status_change',
            detail: {
                key: reason ? 'orders.doc.statusReason' : 'orders.doc.status',
                params: { reason },
            },
            valueType: 'status',
            from,
            to: status,
            bad: status === 'cancelled',
        });

        await persist(`orders/${id}/status`, { status, reason }, 'PUT');

        return order;
    }

    /**
     * Send one order to the lab. Returns null when the order is not cleared for
     * it, so a stale button cannot start work on an unpaid order.
     */
    async function sendToLab(id, reason = '') {
        const order = byId(id);

        if (!order || !canSendToLab(order)) {
            return null;
        }

        return setStatus(id, 'in_production', reason);
    }

    /** Ids in a selection that are cleared for the lab. */
    function sendableToLab(ids) {
        return ids.filter((id) => {
            const order = byId(id);

            return order ? canSendToLab(order) : false;
        });
    }

    /** Send every cleared order in a selection. Returns how many moved. */
    async function sendManyToLab(ids, reason = '') {
        const moved = await Promise.all(
            sendableToLab(ids).map((id) => sendToLab(id, reason)),
        );

        return moved.filter(Boolean).length;
    }

    /** Cancel a whole order: nothing is compounded and the stock is released. */
    async function cancelOrder(id, reason = '', cause = null) {
        const order = byId(id);

        if (order) {
            // V2 — the structured reason, on top of the written one
            order.cancelCause = cause || null;
        }

        return setStatus(id, 'cancelled', reason);
    }

    /**
     * Cancel one item and refund its share. The other items carry on — this is
     * what makes item-level tracking worth having.
     */
    async function cancelItem(orderId, itemId, reason = '') {
        const order = byId(orderId);
        const item = (order?.items || []).find((row) => row.id === itemId);

        if (!order || !item) {
            return 0;
        }

        const refund = itemRefund(order, item);

        item.stage = 'cancelled';
        reviewFlags(order);

        logEntry(order, {
            actionId: 'item_cancel_refund',
            detail: {
                key: 'orders.doc.itemCancelled',
                params: { refund, reason },
            },
            bad: true,
        });

        await persist(`orders/${orderId}/items/${itemId}/cancel`, {
            reason,
            refund,
        });

        return refund;
    }

    /**
     * Assign or update the courier and the tracking number.
     *
     * There is no courier API yet: the number is typed in and stored on the
     * order, which is why this writes nothing else.
     */
    async function assignCourier(id, { courier, tracking, shipDate }) {
        const order = byId(id);

        if (!order || !courier) {
            return null;
        }

        order.courier = courier;
        order.tracking = tracking || null;
        reviewFlags(order);

        logEntry(order, {
            actionId: 'tracking_update',
            detail: {
                key: 'orders.doc.courierAssigned',
                params: { tracking: tracking || '', date: shipDate || '' },
            },
            from: order.tracking || '',
            to: tracking || '',
        });

        await persist(`orders/${id}/courier`, { courier, tracking, shipDate });

        return order;
    }

    /** V2: flag an order as urgent, or clear the flag. The lab works it first. */
    async function setUrgent(id, on, reason = '') {
        const order = byId(id);

        if (!order) {
            return null;
        }

        order.urgent = Boolean(on);

        logEntry(order, {
            actionId: 'order_urgent_set',
            detail: {
                key: on ? 'orders.doc.urgentOn' : 'orders.doc.urgentOff',
                params: { reason },
            },
        });

        await persist(
            `orders/${id}/urgent`,
            { urgent: order.urgent, reason },
            'PUT',
        );

        return order;
    }

    /**
     * V2: record who filled a lab role on this order, or clear it. By hand until
     * the station scan of phase B takes over.
     */
    async function setLabRole(id, role, on = true) {
        const order = byId(id);

        if (!order || !LAB_ROLE_IDS.includes(role)) {
            return null;
        }

        if (!order.lab) {
            order.lab = {};
        }

        order.lab[role] = on ? { by: actor.value, when: moment() } : null;

        logEntry(order, {
            actionId: 'lab_role_set',
            detail: {
                key: `orders.doc.labRole.${role}${on ? 'Set' : 'Cleared'}`,
                params: {},
            },
        });

        await persist(`orders/${id}/lab/${role}`, { on }, 'PUT');

        return order;
    }

    /** V2: the preparation fields on one formula — concentration and patient instructions. */
    async function setItemFields(orderId, itemId, fields) {
        const order = byId(orderId);
        const item = (order?.items || []).find((row) => row.id === itemId);

        if (!order || !item) {
            return null;
        }

        const instructions = String(fields.patientInstructions || '').trim();

        item.concentration = fields.concentration || null;
        item.patientInstructions = instructions
            ? { he: instructions, en: instructions }
            : null;

        logEntry(order, {
            actionId: 'order_item_fields_update',
            detail: {
                key: 'orders.doc.itemFields',
                params: { name: item.name?.he || item.id },
            },
        });

        await persist(
            `orders/${orderId}/items/${itemId}/fields`,
            {
                concentration: item.concentration,
                patientInstructions: instructions || null,
            },
            'PUT',
        );

        return item;
    }

    /** V2: change the lab's managed texts — the instructions default and the regulatory warning. */
    async function updateLabSettings(patch) {
        if (!dataset.data.labSettings) {
            dataset.data.labSettings = {};
        }

        Object.assign(dataset.data.labSettings, patch, {
            updated: moment(),
            updatedBy: actor.value,
        });

        const log = Array.isArray(dataset.data.log) ? dataset.data.log : null;

        if (log) {
            log.unshift({
                id: `lg-lab_settings_update-${log.length}`,
                when: moment(),
                actorType: 'agent',
                actor: actor.value,
                act: 'lab_settings_update',
                entType: 'system',
                ent: 'lab-settings',
                valueType: 'plain',
                from: null,
                to: null,
                src: 'manual',
                ip: null,
            });
        }

        await persist('lab/settings', patch, 'PATCH');
    }

    /** V2: a prep sheet was printed for this order — one line in its documentation. */
    async function logPrepSheet(id) {
        const order = byId(id);

        if (!order) {
            return;
        }

        logEntry(order, {
            actionId: 'prep_sheet_print',
            detail: { key: 'orders.doc.prepSheetPrinted', params: {} },
        });

        await persist(`orders/${id}/prep-sheet-print`, {});
    }

    /** Record a payment that arrived outside the payment link. */
    async function recordPayment(id, reason = '') {
        const order = byId(id);

        if (!order) {
            return null;
        }

        // The document is queued, not issued: the provider has not answered yet
        // and inventing a document number here would be a lie on the order.
        order.docStatus = 'queued';
        order.linkExpires = null;
        order.linkState = 'paid';

        logEntry(order, {
            actionId: 'payment_record_manual',
            detail: {
                key: 'orders.doc.paymentRecorded',
                params: { amount: order.pricing.total, reason },
            },
        });

        await persist(`orders/${id}/payment`, { reason });

        return setStatus(id, 'paid', reason);
    }

    /** Move an order onto the practitioner's credit terms. */
    async function moveToCredit(id, reason = '') {
        const order = byId(id);

        if (!order) {
            return null;
        }

        order.credit = true;
        order.creditPaid = false;
        order.docNum = null;
        order.docAlloc = null;
        order.docStatus = 'awaiting_credit';
        order.linkExpires = null;

        logEntry(order, {
            actionId: 'credit_terms_approve',
            detail: {
                key: 'orders.doc.movedToCredit',
                params: { amount: order.pricing.total, reason },
            },
        });

        await persist(`orders/${id}/credit`, { reason });

        return setStatus(id, 'credit', reason);
    }

    /** Ask the invoice provider to issue the document again. */
    async function reissueDocument(id) {
        const order = byId(id);

        if (!order) {
            return null;
        }

        order.docStatus = 'queued';
        order.docReq = null;
        reviewFlags(order);

        logEntry(order, {
            actionId: 'doc_reissue',
            detail: {
                key: 'orders.doc.documentReissued',
                params: { amount: order.pricing.total },
            },
        });

        await persist(`orders/${id}/document/reissue`, {});

        return order;
    }

    /** Credit the points an order earned to the practitioner's wallet. */
    async function creditPoints(id) {
        const order = byId(id);

        if (!order) {
            return 0;
        }

        const points = order.pricing.pointsEarn || 0;

        order.practitioner.points = (order.practitioner.points || 0) + points;

        logEntry(order, {
            actionId: 'points_credit_manual',
            detail: {
                key: 'orders.doc.pointsCredited',
                params: { n: points, code: order.practitioner.code },
            },
        });

        await persist(`orders/${id}/points`, { points });

        return points;
    }

    /** Issue the consolidated collection link for the whole open balance. */
    async function issueCollectionLink(id) {
        const order = byId(id);

        if (!order) {
            return '';
        }

        const link = collectionLinkFor(order.practitioner.code);

        logEntry(order, {
            actionId: 'collection_link_issue',
            detail: {
                key: 'orders.doc.collectionLink',
                params: {
                    amount: order.practitioner.debt || 0,
                    days: CREDIT.linkDays,
                },
            },
        });

        await persist(`orders/${id}/collection-link`, {});

        return link?.url || '';
    }

    /**
     * Record that a message went out on this order. The message log itself is
     * the messaging area's; what belongs on the order is that it happened.
     */
    async function recordMessage(id, { templateId, channel, scheduled }) {
        const order = byId(id);
        const template = templates.value.find((row) => row.id === templateId);

        if (!order) {
            return null;
        }

        logEntry(order, {
            actionId: 'message_send',
            detail: {
                key: scheduled
                    ? 'orders.doc.messageScheduled'
                    : 'orders.doc.messageSent',
                params: { channel: channel || '' },
            },
            template: template ? template.name : null,
        });

        await persist(`orders/${id}/messages`, {
            templateId,
            channel,
            scheduled: Boolean(scheduled),
        });

        return order;
    }

    /**
     * Add a manual documentation entry. Entries are never edited and never
     * deleted: a correction is a new entry that points at the original.
     *
     * @param {string} id
     * @param {string} text What the agent wrote.
     * @param {string} [fixOf] Id of the entry this one corrects.
     */
    async function addDocumentation(id, text, fixOf = '') {
        const order = byId(id);
        const body = String(text || '').trim();

        if (!order || !body) {
            return null;
        }

        if (!Array.isArray(order.docsExtra)) {
            order.docsExtra = [];
        }

        entrySequence += 1;

        const entry = {
            id: `mn${entrySequence}`,
            kind: 'manual',
            when: moment(),
            actor: actor.value,
            text: body,
            fixOf: fixOf || undefined,
        };

        order.docsExtra.push(entry);

        await persist(`orders/${id}/documentation`, { text: body, fixOf });

        return entry;
    }

    /**
     * The rows of an orders CSV export, already resolved to one language. The
     * writing itself is lib/csv.js — this only decides what a row holds.
     *
     * @param {Array} orders
     * @param {string} locale
     * @returns {Array<Array<*>>}
     */
    function exportRows(orders, locale) {
        return orders.map((order) => [
            order.id,
            order.stamp,
            locDeep(order.patient.name, locale),
            order.patient.phone,
            locDeep(order.practitioner.name, locale),
            order.practitioner.code,
            statusOf(order),
            order.payer,
            order.deliveryType,
            order.pricing.total,
            order.tracking || '',
            (order.flags || []).join(' '),
        ]);
    }

    return {
        all,
        templates,
        interactions,
        collectionLinks,
        actor,
        flaggedCount,
        pinnedNote,

        byId,
        messagesFor,
        templateByCategory,
        templateById,
        batchesFor,
        collectionLinkFor,
        documentationFor,
        herbsOf,
        interactionsFor,
        flowStamps,

        setStatus,
        sendToLab,
        sendableToLab,
        sendManyToLab,
        cancelOrder,
        cancelItem,
        assignCourier,
        setUrgent,
        setLabRole,
        setItemFields,
        labSettings,
        updateLabSettings,
        logPrepSheet,
        recordPayment,
        moveToCredit,
        reissueDocument,
        creditPoints,
        issueCollectionLink,
        recordMessage,
        addDocumentation,
        exportRows,
    };
});

/**
 * The action bar an order offers, per status.
 *
 * `effects` is what the confirmation dialog spells out before the action is
 * taken: either an effect id on its own, or `[id, order => params]` when the
 * sentence quotes a figure from the order. `statusTo` adds the "status → x" line
 * without every action repeating it.
 */
export const STATUS_ACTIONS = {
    pending_payment: [
        {
            id: 'send_pay_link',
            icon: 'whatsapp',
            primary: true,
            effects: ['msgToPatient', 'loggedInMessageLog'],
        },
        {
            id: 'mark_paid',
            icon: 'check',
            reason: true,
            statusTo: 'paid',
            effects: ['docQueued', 'payLinkVoided'],
        },
        {
            id: 'move_to_credit',
            icon: 'coin',
            reason: true,
            statusTo: 'credit',
            effects: ['debtIncludes', 'noDocUntilCollected', 'creditApproved'],
        },
    ],
    paid: [
        {
            id: 'send_to_lab',
            icon: 'beaker',
            primary: true,
            statusTo: 'in_production',
            effects: ['batchesAllocated', 'msgByTrigger'],
        },
        { id: 'print_prep_sheet', icon: 'printer', instant: true },
    ],
    credit: [
        {
            id: 'send_to_lab',
            icon: 'beaker',
            primary: true,
            statusTo: 'in_production',
            effects: ['batchesAllocated', 'stillOnDebt'],
        },
        {
            id: 'issue_collection_link',
            icon: 'copy',
            effects: [
                'linkCoversBalance',
                'allOrNothing',
                'oneConsolidatedDoc',
                ['linkValidDays', () => ({ days: CREDIT.linkDays })],
            ],
        },
        { id: 'print_prep_sheet', icon: 'printer', instant: true },
    ],
    in_production: [
        {
            id: 'mark_ready',
            icon: 'check',
            primary: true,
            statusTo: 'ready_for_delivery',
            effects: ['batchesDeducted', 'showsOnDeliveries'],
        },
        { id: 'print_label', icon: 'printer', instant: true },
    ],
    ready_for_delivery: [
        {
            id: 'assign_courier',
            icon: 'truck',
            primary: true,
            assign: true,
            when: (order) => order.deliveryType === 'courier',
        },
        {
            id: 'notify_pickup_ready',
            icon: 'whatsapp',
            primary: true,
            when: (order) => order.deliveryType === 'pickup',
            effects: ['msgPickupReady'],
        },
        {
            id: 'mark_shipped',
            icon: 'send',
            statusTo: 'shipped',
            effects: ['shipDateRecorded', 'msgWithTracking'],
        },
    ],
    shipped: [
        { id: 'update_tracking', icon: 'truck', assign: true },
        {
            id: 'mark_delivered',
            icon: 'check',
            primary: true,
            statusTo: 'delivered',
            effects: ['pointsAccrue', 'docEmailedToCustomer'],
        },
    ],
    delivered: [
        { id: 'print_receipt', icon: 'printer', instant: true },
        {
            id: 'credit_points',
            icon: 'coin',
            primary: true,
            pin: true,
            effects: [
                [
                    'pointsCredit',
                    (order) => ({
                        n: order.pricing.pointsEarn,
                        code: order.practitioner.code,
                    }),
                ],
                'walletNeedsPin',
                'pointsLedgerRow',
            ],
        },
    ],
    completed: [{ id: 'print_receipt', icon: 'printer', instant: true }],
    cancelled: [],
};

/** The collection action an unpaid credit order offers instead of a receipt. */
const COLLECTION_ACTION = {
    id: 'issue_collection_link',
    icon: 'copy',
    effects: [
        'linkCoversBalance',
        'allOrNothing',
        'oneConsolidatedDoc',
        ['linkValidDays', () => ({ days: CREDIT.linkDays })],
    ],
};

/** Statuses at which an unpaid credit order has already left the lab. */
const AFTER_LAB = [
    'in_production',
    'ready_for_delivery',
    'shipped',
    'delivered',
    'completed',
];

/**
 * The actions an order offers right now.
 *
 * An unpaid credit order that already left the lab must offer collection, not a
 * receipt: no document exists for it until the collection link is paid.
 */
export function actionsFor(order) {
    const status = statusOf(order);
    const list = (STATUS_ACTIONS[status] || []).filter(
        (action) => !action.when || action.when(order),
    );

    if (order.credit && !order.creditPaid && AFTER_LAB.includes(status)) {
        return [
            ...list.filter((action) => action.id !== 'print_receipt'),
            {
                ...COLLECTION_ACTION,
                primary: status === 'delivered' || status === 'completed',
            },
        ];
    }

    return list;
}

/**
 * True while an order is still open enough to cancel. A delivered or completed
 * order is closed; a cancelled one cannot be cancelled twice.
 */
export function isCancellable(order) {
    return !['cancelled', 'completed', 'delivered'].includes(statusOf(order));
}

/**
 * Is this order's customer payment link past its window? On expiry the order is
 * cancelled automatically and the stock allocated to it is released, so an
 * expired link is a fact an agent has to see rather than a countdown.
 */
export function payLinkExpired(order) {
    return (
        statusOf(order) === 'pending_payment' && order.daysAgo > PAY_LINK.days
    );
}
