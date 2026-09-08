// The deliveries desk: which orders are on it, what handling stage each one is
// in, and the four things an agent does from here — assign a courier, type in a
// tracking number, mark an order as shipped, and chase a missing power of
// attorney.
//
// Rows are read from the loaded dataset and written back to it, so an assignment
// made here is the same assignment the order's delivery tab reads. Every mutation
// updates the record optimistically and calls persist(), which is a no-op against
// the fixture.
//
// Three rules from the business live here:
//
//   1. Courier delivery requires a signed power of attorney (ייפוי כוח) from the
//      recipient: the courier hands the medicine to whoever opens the door, or
//      leaves it at the address, so without a signature there is nobody to
//      attribute the handover to. An order cannot be marked shipped without one.
//      Self-pickup skips this entirely — the recipient identifies themselves at
//      the counter.
//   2. No courier company the pharmacy works with exposes an API. Tracking
//      numbers are read off the shipping label and typed in by hand; nothing here
//      queries a carrier or invents a status.
//   3. A courier is identified on the label and in the tracking number by a
//      single letter code. The code is fixed configuration; the company name and
//      phone behind it are the pharmacy's own settings and are edited here.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { COURIER, ORDER_FLOW, WEEKDAY_IDS } from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { FALLBACK_LOCALE, loc, searchHaystack } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { statusOf } from '@/stores/orders';

/** The status at which an order joins the deliveries desk. */
const DESK_ENTRY_STATUS = 'lab';

/**
 * The statuses that put an order on the deliveries desk: everything from the
 * moment the lab starts work up to delivery, plus the closed-out `completed` so
 * yesterday's handovers stay auditable on the same screen.
 */
export const DESK_STATUS_IDS = [
    ...ORDER_FLOW.slice(ORDER_FLOW.indexOf(DESK_ENTRY_STATUS)),
];

/**
 * The statuses at which a courier order has not left the pharmacy yet, and its
 * power of attorney is therefore still worth chasing.
 */
const PRE_DISPATCH_STATUS_IDS = ORDER_FLOW.slice(
    ORDER_FLOW.indexOf(DESK_ENTRY_STATUS),
    ORDER_FLOW.indexOf('sent'),
);

/**
 * Handling stages. These are derived predicates, not a stored field: an order's
 * stage follows from its status, how it leaves the pharmacy and whether a courier
 * has been assigned, so nothing can go stale.
 */
export const DELIVERY_STAGES = [
    { id: 'all', match: () => true },
    {
        id: 'assign',
        match: (order) =>
            statusOf(order) === 'packed' &&
            order.deliveryType === 'courier' &&
            !order.courier,
    },
    {
        id: 'handed',
        match: (order) =>
            statusOf(order) === 'packed' &&
            order.deliveryType === 'courier' &&
            Boolean(order.courier),
    },
    { id: 'transit', match: (order) => statusOf(order) === 'sent' },
    {
        id: 'pickup',
        match: (order) =>
            order.deliveryType === 'pickup' &&
            ['lab', 'packed'].includes(statusOf(order)),
    },
    {
        id: 'done',
        match: (order) => statusOf(order) === 'closed',
    },
];

export const DELIVERY_STAGE_IDS = DELIVERY_STAGES.map((stage) => stage.id);

const DELIVERY_STAGE = Object.fromEntries(
    DELIVERY_STAGES.map((stage) => [stage.id, stage]),
);

/** A stage by id; an id the model does not know falls back to "everything". */
export function deliveryStage(id) {
    return DELIVERY_STAGE[id] || DELIVERY_STAGES[0];
}

/**
 * The shape of a courier tracking number: the courier's letter code, six digits,
 * then `IL` — as printed on the shipping label. Checked, never generated.
 */
export const TRACKING_PATTERN = /^[A-Z]\d{6}IL$/;

/** True while `value` is a complete, well-formed tracking number. */
export function isTracking(value) {
    return TRACKING_PATTERN.test(String(value || '').trim());
}

/** `signed` | `requested` | `missing` — where an order's power of attorney is. */
export function poaState(order) {
    if (order.poaSigned) {
        return 'signed';
    }

    if (order.poaRequestedAt) {
        return 'requested';
    }

    return 'missing';
}

/** The three states the power-of-attorney panel groups its orders by. */
export const POA_STATES = ['missing', 'requested', 'signed'];

/** Everything the queue's free-text box searches, in both languages. */
export function deliveryHaystack(order) {
    return searchHaystack(
        order.id,
        order.patient.name,
        order.patient.phone,
        order.tracking,
        order.address.city,
    );
}

/**
 * Does an order survive the queue's filters? `filters` is the screen's URL state,
 * so this is also what a pasted link reproduces.
 */
/**
 * What the delivery desk may be narrowed by. The stage stays a control of its
 * own above the table — it is how the desk is read, not a filter of it.
 */
export const DELIVERY_FILTER_FIELDS = [
    {
        key: 'status',
        group: 'state',
        kind: 'set',
        prefix: 'status',
        values: (order) => [statusOf(order)],
    },
    {
        key: 'tracking',
        group: 'state',
        kind: 'set',
        prefix: 'deliveries.filter.trackingState',
        values: (order) => [order.tracking ? 'yes' : 'no'],
    },
    {
        key: 'signed',
        group: 'state',
        kind: 'set',
        prefix: 'deliveries.filter.poaState',
        values: (order) => [order.poaSigned ? 'yes' : 'no'],
    },
    {
        key: 'type',
        group: 'how',
        kind: 'set',
        prefix: 'fulfilment',
        values: (order) => [order.deliveryType],
    },
    {
        key: 'courier',
        group: 'how',
        kind: 'set',
        values: (order) => [order.courier || 'none'],
    },
    {
        // Keyed by the record's Hebrew source text, so a filtered link opens on
        // the same city whichever language the reader is in.
        key: 'city',
        group: 'where',
        kind: 'set',
        values: (order) =>
            order.address?.city
                ? [loc(order.address.city, FALLBACK_LOCALE)]
                : [],
    },
    {
        key: 'point',
        group: 'where',
        kind: 'set',
        values: (order) => [order.pickupPoint || 'none'],
    },
];

export const DELIVERY_FILTER_GROUPS = ['state', 'how', 'where'];

/**
 * The two narrowings the desk owns itself: which stage of the desk is being
 * read, and the free-text search. Every other field goes through the shared
 * filter engine.
 */
export function matchesFilters(order, filters) {
    if (!deliveryStage(filters.stage).match(order)) {
        return false;
    }

    const needle = String(filters.q || '')
        .trim()
        .toLowerCase();

    return !needle || deliveryHaystack(order).includes(needle);
}

/** One CSV cell, quoted so a comma or a quote inside a name survives. */
function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * The export behind the screen's download button. The caller supplies the header
 * row and one array of already-resolved cells per delivery, because the words in
 * both are locale-dependent and belong to the view.
 */
export function deliveriesToCsv(headers, rows) {
    return [headers, ...rows]
        .map((row) => row.map(csvCell).join(','))
        .join('\n');
}

export const useDeliveriesStore = defineStore('deliveries', () => {
    const dataset = useDatasetStore();

    /**
     * The pharmacy's edits to the courier mapping, keyed by courier id:
     * `{ name, phone }`. The letter code is configuration and is never edited.
     */
    const courierEdits = ref({});

    /** Every order the deliveries desk is responsible for. */
    const deskOrders = computed(() =>
        dataset.orders.filter((order) =>
            DESK_STATUS_IDS.includes(statusOf(order)),
        ),
    );

    const courierOrders = computed(() =>
        deskOrders.value.filter((order) => order.deliveryType === 'courier'),
    );

    const pickupOrders = computed(() =>
        deskOrders.value.filter((order) => order.deliveryType === 'pickup'),
    );

    /**
     * The courier orders the power-of-attorney panel is about: the ones still in
     * the pharmacy's hands. Once a parcel is dispatched, chasing the signature is
     * no longer this desk's job.
     */
    const poaOrders = computed(() =>
        courierOrders.value.filter((order) =>
            PRE_DISPATCH_STATUS_IDS.includes(statusOf(order)),
        ),
    );

    /**
     * Undispatched courier orders with no signature on file. Every one of them is
     * blocked from handover, which is why the panel exists as its own pane.
     */
    const poaPending = computed(() =>
        poaOrders.value.filter((order) => !order.poaSigned),
    );

    // ---- pickup points (V2) ---------------------------------------------------

    /** Partner shops and practitioners collecting for their patients. */
    const pickupPoints = computed(() =>
        Array.isArray(dataset.data.pickupPoints)
            ? dataset.data.pickupPoints
            : [],
    );

    const pointById = (id) =>
        pickupPoints.value.find((point) => point.id === id) || null;

    /** Today's weekday id, off the pinned clock. */
    const todayId = computed(() => WEEKDAY_IDS[now().getDay()]);

    /** Pickup orders bound for a point that are still in the pharmacy. */
    const ordersAtPoint = (id) =>
        deskOrders.value.filter(
            (order) =>
                order.pickupPoint === id &&
                ['lab', 'packed'].includes(statusOf(order)),
        );

    /** The points whose dispatch day is today, with what is waiting for each. */
    const pointsDueToday = computed(() =>
        pickupPoints.value
            .filter(
                (point) => point.active && point.days.includes(todayId.value),
            )
            .map((point) => {
                const waiting = ordersAtPoint(point.id);

                return {
                    point,
                    orders: waiting,
                    ready: waiting.filter(
                        (order) => statusOf(order) === 'packed',
                    ),
                };
            }),
    );

    /** The daily alert: how many points go out today and what is waiting for them. */
    const todayAlert = computed(() => ({
        points: pointsDueToday.value.length,
        orders: pointsDueToday.value.reduce(
            (sum, row) => sum + row.orders.length,
            0,
        ),
        ready: pointsDueToday.value.reduce(
            (sum, row) => sum + row.ready.length,
            0,
        ),
    }));

    /** Parcels handed to one courier and not yet dispatched — its pickup list. */
    const courierPickupList = (courierId) =>
        deskOrders.value.filter(
            (order) =>
                order.deliveryType === 'courier' &&
                order.courier === courierId &&
                statusOf(order) === 'packed',
        );

    function bag(name) {
        if (!Array.isArray(dataset.data[name])) {
            dataset.data[name] = [];
        }

        return dataset.data[name];
    }

    function writeLog(row) {
        const log = bag('log');

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: {
                daysAgo: 0,
                iso: isoDaysAgo(0),
                time: hm(now()),
                stamp: stamp(0),
            },
            actorType: 'agent',
            actor: dataset.me?.name || null,
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    /** Create or update a pickup point. */
    async function savePickupPoint(form, existingId = null) {
        const rows = bag('pickupPoints');
        const card =
            form.kind === 'practitioner'
                ? dataset.practitioners.find(
                      (row) => row.code === form.practitionerCode,
                  )
                : null;
        const text = (value) =>
            value?.trim() ? { he: value.trim(), en: value.trim() } : null;
        const record = {
            kind: form.kind,
            practitionerCode: card ? card.code : null,
            name: card
                ? card.name
                : {
                      he: form.name.he.trim(),
                      en: form.name.en.trim() || form.name.he.trim(),
                  },
            city: card ? card.city || null : text(form.city),
            address: card ? card.clinic || null : text(form.address),
            days: [...form.days],
            courier: form.courier || null,
            notes: text(form.notes),
            active: form.active !== false,
        };

        if (!existingId) {
            const highest = rows.reduce((top, row) => {
                const digits = String(row.id).match(/(\d+)$/);

                return digits ? Math.max(top, Number(digits[1])) : top;
            }, 0);
            const point = { id: `pp-${highest + 1}`, ...record };

            rows.push(point);
            writeLog({
                act: 'pickup_point_create',
                entType: 'system',
                ent: point.id,
                to: point.name.he,
            });
            await persist('pickup-points', point);

            return { created: true, point };
        }

        const point = rows.find((row) => row.id === existingId);

        if (!point) {
            return { created: false, point: null };
        }

        Object.assign(point, record);
        writeLog({
            act: 'pickup_point_update',
            entType: 'system',
            ent: point.id,
            to: point.name.he,
        });
        await persist(`pickup-points/${point.id}`, point, 'PUT');

        return { created: false, point };
    }

    /** The name the pharmacy typed for a courier, or null while the catalog's stands. */
    function courierNameEdit(id) {
        return courierEdits.value[id]?.name || null;
    }

    /** The contact number for a courier: the pharmacy's edit, else the configured one. */
    function courierPhone(id) {
        return courierEdits.value[id]?.phone ?? COURIER[id]?.phone ?? '';
    }

    function find(orderId) {
        return dataset.orders.find((order) => order.id === orderId) || null;
    }

    /** Drop one exception flag from an order once the condition no longer holds. */
    function clearFlag(order, flag) {
        order.flags = (order.flags || []).filter((id) => id !== flag);
    }

    /**
     * Assign the courier and record the hand-typed tracking number. This does not
     * move the order's status — handing a parcel to a courier and dispatching it
     * are two separate acts, and only the second one is `shipped`.
     */
    async function assignCourier(orderId, { courier, tracking, sentOn }) {
        const order = find(orderId);

        if (!order) {
            return;
        }

        order.courier = courier;
        order.tracking = String(tracking || '').trim() || null;
        order.sentOn = sentOn || null;
        clearFlag(order, 'courier');

        await persist(`orders/${order.id}/courier`, {
            courier: order.courier,
            tracking: order.tracking,
            sentOn: order.sentOn,
        });
    }

    /**
     * Mark an order as dispatched. Refused without a signed power of attorney —
     * the same rule the courier at the counter is held to.
     */
    async function markShipped(orderId, sentOn) {
        const order = find(orderId);

        if (!order || !order.courier || !order.poaSigned) {
            return false;
        }

        order.status = 'sent';
        order.sentOn = sentOn || isoDaysAgo(0);
        clearFlag(order, 'courier');

        await persist(`orders/${order.id}/shipped`, { sentOn: order.sentOn });

        return true;
    }

    /**
     * Record that the power of attorney was requested from the recipient. The
     * signature itself arrives from the customer, so nothing here marks it signed.
     */
    async function requestPoa(orderId) {
        const order = find(orderId);

        if (!order || order.poaSigned) {
            return;
        }

        order.poaRequestedAt = stamp();

        await persist(`orders/${order.id}/poa-request`, {
            requestedAt: order.poaRequestedAt,
        });
    }

    /** Request the power of attorney from several recipients in one pass. */
    async function requestPoaAll(orderIds) {
        for (const id of orderIds) {
            await requestPoa(id);
        }
    }

    /** Record that the customer was told their order is ready to collect. */
    async function notifyPickupReady(orderId) {
        const order = find(orderId);

        if (!order) {
            return;
        }

        order.pickupNotifiedAt = stamp();

        await persist(`orders/${order.id}/pickup-notice`, {
            notifiedAt: order.pickupNotifiedAt,
        });
    }

    /**
     * Save the courier mapping. New orders read the updated names; orders already
     * placed keep the letter code stored on them, which is what their shipping
     * label carries.
     *
     * @param {Array<{id: string, name: string, phone: string}>} rows
     */
    async function saveCourierMap(rows) {
        courierEdits.value = Object.fromEntries(
            rows.map((row) => [
                row.id,
                { name: row.name.trim(), phone: row.phone.trim() },
            ]),
        );

        await persist('settings/couriers', { couriers: rows });
    }

    return {
        courierEdits,
        deskOrders,
        courierOrders,
        pickupOrders,
        poaOrders,
        poaPending,
        pickupPoints,
        pointById,
        todayId,
        ordersAtPoint,
        pointsDueToday,
        todayAlert,
        courierPickupList,
        savePickupPoint,
        courierNameEdit,
        courierPhone,
        assignCourier,
        markShipped,
        requestPoa,
        requestPoaAll,
        notifyPickupReady,
        saveCourierMap,
    };
});
