// The shipping station: one page, from "בהכנה" to "נשלח" / "נאסף"
// (SHIPPING_STATION_SPEC.md). Everything here reads and writes the same order
// records `stores/orders.js` owns — this store adds the station's own
// transitions (packing, courier linking, handover, pickup, cancellation) on
// top, the same way `stores/items.js` and `stores/money.js` layer their own
// views over the same dataset rather than copying it.
//
// Three rules drive the shape of this file:
//
//   1. Only the station moves an order once it is "בהכנה" — see
//      `stores/orders.js`'s own `STATUS_ACTIONS`, which offers nothing past
//      `paid`/`credit` for exactly this reason.
//   2. Every container is scanned before a courier link or a "מוכן לאיסוף" —
//      `lib/containers.js` is the one place that counts them, so the label
//      that gets printed and the number the station expects to scan can never
//      disagree.
//   3. A courier link keeps its tracking number. The old site's never did.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { COURIER, DELIVERY_STATUS_IDS, STATION_STUCK_DAYS } from '@/config';
import { persist } from '@/data/source';
import i18n from '@/i18n';
import {
    containerBarcode,
    orderContainers,
    totalContainers,
} from '@/lib/containers';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { FALLBACK_LOCALE, loc } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useMessagingStore } from '@/stores/messaging';
import { statusOf, useOrdersStore } from '@/stores/orders';

/** The order barcode's own prefix — matches `lib/containers.js:orderBarcode`. */
const ORDER_BARCODE_RE = /^TF-\d+$/;
/** A container barcode: `TF-<id>-<line>-<container>`. */
const CONTAINER_BARCODE_RE = /^(TF-\d+)-(\d+)-(\d+)$/;

/** Every status the station's tabs can show, shipping and pickup alike. */
export const STATION_STATUS_IDS = DELIVERY_STATUS_IDS;

/** This moment, in the shape every event/history row on an order carries. */
function moment() {
    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(now()),
        stamp: stamp(0),
    };
}

// ---- pure order predicates ---------------------------------------------
//
// Exported at module level, not inside the store, so `config/deliveries.js`'s
// own filter fields (the "problem"/"gate" filters a saved view can narrow by)
// read exactly the same rule the station itself acts on — one definition of
// "gated" or "an exception", not two that can drift apart.

export function activeShipmentOf(order) {
    return (order.shipments || []).find((s) => s.status === 'active') || null;
}

export function handedShipmentOf(order) {
    return (order.shipments || []).find((s) => s.status === 'handed') || null;
}

export function packedCount(order) {
    return (order.packChecks || []).length;
}

export function allPacked(order) {
    const total = totalContainers(order);

    return total > 0 && packedCount(order) >= total;
}

/** How long (days) this order has sat in its current status — approximated
 * from the order's own age, since the fixture does not track a per-status
 * clock separately. */
function ageInStatus(order) {
    return order.daysAgo || 0;
}

/** Statuses still open to station action — a shipped/collected/cancelled
 * order has nothing left to fix. */
const STATION_OPEN = [
    'in_production',
    'packing',
    'awaiting_courier',
    'ready_for_pickup',
];

/** Every exception id this order carries right now (spec §5.7). */
export function stationExceptionsOf(order) {
    const status = statusOf(order);
    const list = [];

    if (
        order.shipTo === 'patient' &&
        !order.addressProvided &&
        STATION_OPEN.includes(status)
    ) {
        list.push('address');
    }

    if (
        order.shipTo &&
        order.shipTo !== 'pickup' &&
        ['in_production', 'packing'].includes(status)
    ) {
        const gated =
            order.shipTo === 'me'
                ? !order.courierAuth
                : order.poa?.status !== 'signed';

        if (gated) {
            list.push('poa');
        }
    }

    if (!order.shipTo && STATION_OPEN.includes(status)) {
        list.push('unknown_recipient');
    }

    if (
        status === 'packing' &&
        allPacked(order) &&
        !activeShipmentOf(order) &&
        (order.events || []).some((e) => e.type === 'shipment_link_failed')
    ) {
        list.push('shipment_error');
    }

    const limit = STATION_STUCK_DAYS[status];

    if (limit && ageInStatus(order) >= limit) {
        list.push('stuck');
    }

    return list;
}

/** `'ok'` while nothing blocks a courier link; `'blocked'` otherwise. */
export function stationGateOf(order) {
    return stationExceptionsOf(order).some((id) =>
        ['address', 'poa', 'unknown_recipient'].includes(id),
    )
        ? 'blocked'
        : 'ok';
}

/**
 * What a station list may be narrowed by, and saved as a view (addendum §2.1
 * — every list tab works to the console's own list standard, which includes
 * saved views, scoped to this screen as `shipping-<tab>`). One shared field
 * set: a dimension that does not apply in a given tab just never varies
 * there, which is harmless, not wrong.
 */
export const STATION_FILTER_FIELDS = [
    {
        key: 'gate',
        group: 'state',
        kind: 'set',
        prefix: 'deliveries.filter.gate',
        values: (order) => [stationGateOf(order)],
    },
    {
        key: 'problem',
        group: 'state',
        kind: 'set',
        optionLabel: (id) => i18n.global.t(`exception.${id}.short`),
        values: (order) => stationExceptionsOf(order),
    },
    {
        key: 'shipTo',
        group: 'where',
        kind: 'set',
        prefix: 'deliveries.card.shipTo',
        values: (order) => [order.shipTo || 'none'],
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
        key: 'courier',
        group: 'where',
        kind: 'set',
        values: (order) => [order.courier || 'none'],
    },
];

export const STATION_FILTER_GROUPS = ['state', 'where'];

export const useDeliveriesStore = defineStore('deliveries', () => {
    const dataset = useDatasetStore();
    const orders = useOrdersStore();
    const inventory = useInventoryStore();
    const messaging = useMessagingStore();

    /** The agent every action in this session is attributed to. */
    const actor = computed(
        () => dataset.me?.name || dataset.session?.actor || null,
    );

    // ---- courier settings (SHIPPING_STATION_SPEC.md §5.6) ---------------------

    const courierSettings = computed(() => dataset.data.courierSettings || []);
    const pickupLists = computed(() => dataset.data.courierPickupLists || []);

    const settingsFor = (code) =>
        courierSettings.value.find((row) => row.code === code) || null;

    const activeCouriers = computed(() =>
        courierSettings.value.filter((row) => row.isActive),
    );

    const defaultCourier = computed(
        () => activeCouriers.value.find((row) => row.isDefault) || null,
    );

    /** How many orders of this company are waiting for a driver right now. */
    function awaitingCountFor(code) {
        return orders.all.filter(
            (order) =>
                statusOf(order) === 'awaiting_courier' &&
                order.shipments?.some(
                    (s) => s.courierCode === code && s.status === 'active',
                ),
        ).length;
    }

    async function updateCourierSettings(code, patch) {
        const row = settingsFor(code);

        if (!row) {
            return null;
        }

        if (patch.isActive === false) {
            const waiting = awaitingCountFor(code);

            if (waiting > 0) {
                throw new Error('COURIER_HAS_WAITING_ORDERS');
            }
        }

        if (!row.isActive && patch.isActive) {
            // Code has to be connected to be made active at all.
        }

        Object.assign(row, patch);

        if (patch.isDefault) {
            courierSettings.value.forEach((other) => {
                if (other.code !== code) {
                    other.isDefault = false;
                }
            });
        }

        await persist(`couriers/${code}`, row, 'PUT');

        return row;
    }

    // ---- reading the station ---------------------------------------------

    const stationOrders = computed(() =>
        orders.all.filter((order) =>
            STATION_STATUS_IDS.includes(statusOf(order)),
        ),
    );

    /**
     * Oldest-in-its-current-status first (spec §5.3). The station does not
     * know about urgency — see DEMO_SHIPPING_STATION_ADDENDUM.md §1.1.
     */
    function sortStation(list) {
        return [...list].sort((a, b) => (b.daysAgo || 0) - (a.daysAgo || 0));
    }

    const inProduction = computed(() =>
        sortStation(
            stationOrders.value.filter((o) => statusOf(o) === 'in_production'),
        ),
    );
    const packing = computed(() =>
        sortStation(
            stationOrders.value.filter((o) => statusOf(o) === 'packing'),
        ),
    );
    const awaitingCourier = computed(() =>
        sortStation(
            stationOrders.value.filter(
                (o) => statusOf(o) === 'awaiting_courier',
            ),
        ),
    );
    const readyForPickup = computed(() =>
        sortStation(
            stationOrders.value.filter(
                (o) => statusOf(o) === 'ready_for_pickup',
            ),
        ),
    );
    const pickupOrders = computed(() =>
        sortStation(
            stationOrders.value.filter(
                (o) =>
                    o.shipTo === 'pickup' &&
                    ['in_production', 'packing', 'ready_for_pickup'].includes(
                        statusOf(o),
                    ),
            ),
        ),
    );
    // Shipped, collected, or cancelled from the station itself — the "נשלחו"
    // tab's own rows (spec §5.3). A pre-production cancellation (the orders
    // screen's own, before anything was ever packed) does not belong here.
    const shippedAndDone = computed(() =>
        orders.all.filter((order) => {
            const s = statusOf(order);

            return (
                ['shipped', 'collected'].includes(s) ||
                (s === 'cancelled' &&
                    (order.events || []).some(
                        (event) => event.type === 'cancelled_by_station',
                    ))
            );
        }),
    );

    /** "ממתין לשליח", grouped by the company it is waiting on. */
    const awaitingByCourier = computed(() => {
        const groups = new Map();

        awaitingCourier.value.forEach((order) => {
            const code = activeShipmentOf(order)?.courierCode || 'tapuz';

            if (!groups.has(code)) {
                groups.set(code, []);
            }

            groups.get(code).push(order);
        });

        return [...groups.entries()].map(([code, list]) => ({
            code,
            orders: list,
        }));
    });

    /** Containers, merged with what has actually been scanned so far. */
    function packingOf(order) {
        const checked = new Set((order.packChecks || []).map((c) => c.barcode));

        return orderContainers(order).map((row) => ({
            ...row,
            checked: row.barcodes.filter((b) => checked.has(b)).length,
            barcodes: row.barcodes.map((barcode, i) => ({
                barcode,
                containerNo: i + 1,
                checked: checked.has(barcode),
            })),
        }));
    }

    // ---- exceptions (SHIPPING_STATION_SPEC.md §5.7) ------------------------
    // `stationExceptionsOf` itself is a module-level export above, shared with
    // config/deliveries.js's filter fields.

    const exceptionOrders = computed(() =>
        sortStation(
            stationOrders.value.filter(
                (order) => stationExceptionsOf(order).length,
            ),
        ),
    );

    // ---- writing: events & history ------------------------------------------

    function pushEvent(
        order,
        { type, data = null, visibleToCustomer = false },
    ) {
        if (!Array.isArray(order.events)) {
            order.events = [];
        }

        order.events.push({
            id: `ev-${order.id}-${order.events.length}`,
            type,
            data,
            user: actor.value,
            visibleToCustomer,
            at: moment(),
        });
    }

    /** Every event and status change, newest first, for the order card's history. */
    function historyOf(order) {
        const statusRows = (order.audit || [])
            .filter((row) => row.valueType === 'status')
            .map((row) => ({
                kind: 'status',
                at: row.when,
                from: row.from,
                to: row.to,
                user: null,
            }));
        const eventRows = (order.events || []).map((row) => ({
            kind: 'event',
            type: row.type,
            at: row.at,
            user: row.user,
            data: row.data,
            visibleToCustomer: row.visibleToCustomer,
        }));

        return [...statusRows, ...eventRows].sort((a, b) =>
            `${b.at?.iso || ''} ${b.at?.time || ''}`.localeCompare(
                `${a.at?.iso || ''} ${a.at?.time || ''}`,
            ),
        );
    }

    // ---- packing ------------------------------------------------------------

    /** The first scan of any barcode on a "בהכנה" order starts packing. */
    async function startPacking(order) {
        if (statusOf(order) !== 'in_production') {
            return;
        }

        await orders.setStatus(order.id, 'packing');
        pushEvent(order, { type: 'packing_started' });
    }

    function findOrderByBarcode(code) {
        const orderId = ORDER_BARCODE_RE.test(code)
            ? code
            : CONTAINER_BARCODE_RE.exec(code)?.[1];

        return orderId ? orders.byId(orderId) : null;
    }

    /**
     * Scan one barcode at the station — an order barcode or a container
     * barcode. Returns `{ok, sound, message, order}` for the scan bar to show;
     * never throws.
     */
    async function scanBarcode(code, openOrderId) {
        const trimmed = String(code || '').trim();

        if (!trimmed) {
            return { ok: false, sound: 'error', message: '' };
        }

        if (ORDER_BARCODE_RE.test(trimmed)) {
            const order = orders.byId(trimmed);

            if (!order) {
                return { ok: false, sound: 'error', message: 'orderNotFound' };
            }

            if (!STATION_STATUS_IDS.includes(statusOf(order))) {
                return {
                    ok: false,
                    sound: 'error',
                    message: 'orderNotInStation',
                    params: { status: statusOf(order) },
                    order,
                };
            }

            if (statusOf(order) === 'in_production') {
                await startPacking(order);
            }

            return { ok: true, sound: 'ok', message: 'orderOpened', order };
        }

        const match = CONTAINER_BARCODE_RE.exec(trimmed);

        if (!match) {
            return { ok: false, sound: 'error', message: 'badBarcode' };
        }

        const [, orderId, lineNo, containerNo] = match;
        const order = orders.byId(orderId);

        if (!order) {
            return { ok: false, sound: 'error', message: 'orderNotFound' };
        }

        if (openOrderId && openOrderId !== order.id) {
            return {
                ok: false,
                sound: 'error',
                message: 'belongsToAnotherOrder',
                params: { id: order.id },
                order,
            };
        }

        if (!STATION_STATUS_IDS.includes(statusOf(order))) {
            return {
                ok: false,
                sound: 'error',
                message: 'orderNotInStation',
                params: { status: statusOf(order) },
                order,
            };
        }

        const row = orderContainers(order).find(
            (r) => r.lineNo === Number(lineNo),
        );

        if (!row || Number(containerNo) > row.count) {
            return { ok: false, sound: 'error', message: 'badBarcode' };
        }

        if (statusOf(order) === 'in_production') {
            await startPacking(order);
        }

        const already = (order.packChecks || []).some(
            (c) => c.barcode === trimmed,
        );

        if (already) {
            return {
                ok: false,
                sound: 'warn',
                message: 'alreadyScanned',
                order,
            };
        }

        if (!Array.isArray(order.packChecks)) {
            order.packChecks = [];
        }

        order.packChecks.push({
            orderItemId: row.item.id,
            containerNo: Number(containerNo),
            barcode: trimmed,
            checkedAt: moment(),
            checkedBy: actor.value,
            isManual: false,
        });

        await persist(`orders/${order.id}/pack-checks`, { barcode: trimmed });

        const k = packedCount(order);
        const n = totalContainers(order);

        return {
            ok: true,
            sound: 'ok',
            message: allPacked(order)
                ? order.shipTo === 'pickup'
                    ? 'allScannedPickup'
                    : 'allScannedShipping'
                : 'containerScanned',
            params: {
                k,
                n,
                name: order.patient?.name,
                city: order.address?.city,
            },
            order,
        };
    }

    /** A container whose label cannot be scanned. */
    async function tickManually(order, orderItemId, containerNo, reason) {
        const row = orderContainers(order).find(
            (r) => r.item.id === orderItemId,
        );

        if (!row) {
            return;
        }

        const barcode = containerBarcode(order.id, row.lineNo, containerNo);

        if ((order.packChecks || []).some((c) => c.barcode === barcode)) {
            return;
        }

        if (!Array.isArray(order.packChecks)) {
            order.packChecks = [];
        }

        order.packChecks.push({
            orderItemId,
            containerNo,
            barcode,
            checkedAt: moment(),
            checkedBy: actor.value,
            isManual: true,
            manualReason: reason,
        });

        pushEvent(order, {
            type: 'container_scanned_manual',
            data: { orderItemId, containerNo, reason },
        });

        await persist(`orders/${order.id}/pack-checks`, {
            barcode,
            manual: true,
        });
    }

    /** A shelf line has no printed label of its own — a plain click confirms it. */
    async function tickShelfContainer(order, orderItemId, containerNo) {
        const row = orderContainers(order).find(
            (r) => r.item.id === orderItemId,
        );

        if (!row) {
            return;
        }

        const barcode = containerBarcode(order.id, row.lineNo, containerNo);

        if ((order.packChecks || []).some((c) => c.barcode === barcode)) {
            return;
        }

        if (!Array.isArray(order.packChecks)) {
            order.packChecks = [];
        }

        order.packChecks.push({
            orderItemId,
            containerNo,
            barcode,
            checkedAt: moment(),
            checkedBy: actor.value,
            isManual: false,
        });

        await persist(`orders/${order.id}/pack-checks`, { barcode });
    }

    async function setPackagesCount(order, count) {
        order.packagesCount = Math.min(20, Math.max(1, Number(count) || 1));
        await persist(`orders/${order.id}/packages`, {
            count: order.packagesCount,
        });
    }

    // ---- courier link (SHIPPING_STATION_SPEC.md §7) --------------------------

    function linkPreconditions(order) {
        if (statusOf(order) !== 'packing') {
            return 'wrongStatus';
        }

        if (!allPacked(order)) {
            return 'notFullyPacked';
        }

        if (order.shipTo === 'pickup') {
            return 'isPickupOrder';
        }

        if (
            stationExceptionsOf(order).some((id) =>
                ['address', 'poa', 'unknown_recipient'].includes(id),
            )
        ) {
            return 'gateBlocked';
        }

        return null;
    }

    async function linkCourier(order, { courierCode, packagesCount } = {}) {
        const problem = linkPreconditions(order);

        if (problem) {
            return { ok: false, reason: problem };
        }

        const company = settingsFor(courierCode) || defaultCourier.value;

        if (!company || !company.isActive) {
            return { ok: false, reason: 'noCourier' };
        }

        if (packagesCount) {
            await setPackagesCount(order, packagesCount);
        }

        // The call to the courier's API — simulated, but felt: a short wait,
        // then a real answer.
        await new Promise((resolve) => setTimeout(resolve, 900));

        const tracking = `${COURIER[company.code]?.code || 'T'}${Math.floor(1000000 + Math.random() * 8999999)}IL`;

        order.shipments = [
            ...(order.shipments || []).filter((s) => s.status !== 'active'),
            {
                id: `sh-${order.id}-${(order.shipments || []).length + 1}`,
                courierCode: company.code,
                status: 'active',
                trackingNumber: tracking,
                packagesCount: order.packagesCount || 1,
                isManual: false,
                manualReason: null,
                linkedAt: moment(),
                linkedBy: actor.value,
                cancelledAt: null,
                cancelledBy: null,
                cancelledReason: null,
                handedAt: null,
                handedBy: null,
                pickupListId: null,
            },
        ];
        order.courier = company.code;
        order.tracking = tracking;

        await orders.setStatus(order.id, 'awaiting_courier');
        pushEvent(order, {
            type: 'shipment_linked',
            data: { courier: company.code, tracking },
            visibleToCustomer: true,
        });
        pushEvent(order, { type: 'label_printed' });

        company.lastSuccessAt = moment();
        await persist(`couriers/${courierCode}`, company, 'PUT');

        return { ok: true, tracking, courier: company.code };
    }

    async function retryLink(order) {
        const last = activeShipmentOf(order);

        return linkCourier(order, {
            courierCode: last?.courierCode || order.courier,
        });
    }

    async function enterManualTracking(
        order,
        { courierCode, trackingNumber, reason },
    ) {
        const company = settingsFor(courierCode);

        if (!company) {
            return { ok: false, reason: 'noCourier' };
        }

        order.shipments = [
            ...(order.shipments || []).filter((s) => s.status !== 'active'),
            {
                id: `sh-${order.id}-${(order.shipments || []).length + 1}`,
                courierCode: company.code,
                status: 'active',
                trackingNumber,
                packagesCount: order.packagesCount || 1,
                isManual: true,
                manualReason: reason,
                linkedAt: moment(),
                linkedBy: actor.value,
                handedAt: null,
                handedBy: null,
                pickupListId: null,
            },
        ];
        order.courier = company.code;
        order.tracking = trackingNumber;

        await orders.setStatus(order.id, 'awaiting_courier', reason);
        pushEvent(order, {
            type: 'shipment_manual',
            data: { courier: company.code, tracking: trackingNumber, reason },
            visibleToCustomer: true,
        });
        pushEvent(order, { type: 'label_printed' });

        return { ok: true };
    }

    // ---- handover (SHIPPING_STATION_SPEC.md §9) -------------------------------

    async function printPickupList(courierCode) {
        const list =
            awaitingByCourier.value.find((g) => g.code === courierCode)
                ?.orders || [];

        const row = {
            id: `cpl-${pickupLists.value.length + 1}`,
            courierCode,
            printedAt: moment(),
            printedBy: actor.value,
            handedAt: null,
            handedBy: null,
            note: '',
            orderIds: list.map((order) => order.id),
        };

        if (!Array.isArray(dataset.data.courierPickupLists)) {
            dataset.data.courierPickupLists = [];
        }

        dataset.data.courierPickupLists.push(row);

        list.forEach((order) => {
            const shipment = activeShipmentOf(order);

            if (shipment) {
                shipment.pickupListId = row.id;
            }

            pushEvent(order, {
                type: 'pickup_list_printed',
                data: { listId: row.id },
            });
        });

        await persist('courier-pickup-lists', row);

        return row;
    }

    async function handToCourier(listId, orderIds) {
        const list = pickupLists.value.find((row) => row.id === listId);
        const ticked = new Set(orderIds);
        const moved = [];

        for (const id of list?.orderIds || []) {
            if (!ticked.has(id)) {
                continue;
            }

            const order = orders.byId(id);

            if (!order || statusOf(order) !== 'awaiting_courier') {
                continue;
            }

            const shipment = activeShipmentOf(order);
            const when = moment();

            if (shipment) {
                shipment.status = 'handed';
                shipment.handedAt = when;
                shipment.handedBy = actor.value;
            }

            order.shippedAt = when;
            await orders.setStatus(order.id, 'shipped');
            pushEvent(order, {
                type: 'handed_to_courier',
                data: { listId },
                visibleToCustomer: true,
            });
            moved.push(order.id);
        }

        if (list) {
            list.handedAt = moment();
            list.handedBy = actor.value;
        }

        await persist(`courier-pickup-lists/${listId}/hand-over`, {
            orderIds: moved,
        });

        return moved;
    }

    // ---- self pickup (SHIPPING_STATION_SPEC.md §10) ---------------------------

    async function markReadyForPickup(order) {
        if (
            statusOf(order) !== 'packing' ||
            !allPacked(order) ||
            order.shipTo !== 'pickup'
        ) {
            return;
        }

        await orders.setStatus(order.id, 'ready_for_pickup');
        pushEvent(order, { type: 'ready_for_pickup', visibleToCustomer: true });

        messaging.sendNow({
            templateId: 't6',
            recipient: orders.parcelRecipient(order),
            order: order.id,
            values: { order_no: order.id },
        });
    }

    async function markCollected(order, { collectedByName = '' } = {}) {
        if (statusOf(order) !== 'ready_for_pickup') {
            return;
        }

        const when = moment();

        order.collectedAt = when;
        order.collectedBy = actor.value;
        order.collectedByName = collectedByName || null;

        await orders.setStatus(order.id, 'collected');
        pushEvent(order, { type: 'collected', visibleToCustomer: true });
    }

    async function updateAddress(order, address) {
        order.address = { ...order.address, ...address };
        order.addressProvided = Boolean(
            order.address.city && order.address.street && order.address.num,
        );
        pushEvent(order, { type: 'address_updated' });
        await persist(`orders/${order.id}/address`, order.address, 'PUT');
    }

    /** The "נמען לא ידוע" fix — an order from before `ship_to` existed. */
    async function setShipTo(order, shipTo) {
        order.shipTo = shipTo;
        await persist(`orders/${order.id}/ship-to`, { shipTo }, 'PUT');
    }

    // ---- corrections (SHIPPING_STATION_SPEC.md §3.3, §3.4) --------------------

    /** "החזר צעד" — one step back, with the system password and a reason. */
    async function stepBack(order, reason, { phoneConfirmed = false } = {}) {
        const status = statusOf(order);

        if (status === 'packing') {
            order.packChecks = [];
            await orders.setStatus(order.id, 'in_production', reason);
        } else if (status === 'awaiting_courier') {
            // Tapuz has no cancel call yet (spec §3.3, §7.4) — the agent has
            // to actually call them, and says so before this can proceed.
            if (!phoneConfirmed) {
                return;
            }

            const shipment = activeShipmentOf(order);

            if (shipment) {
                shipment.status = 'cancelled';
                shipment.cancelledAt = moment();
                shipment.cancelledBy = actor.value;
                shipment.cancelledReason = reason;
            }

            order.courier = null;
            order.tracking = null;
            await orders.setStatus(order.id, 'packing', reason);
            pushEvent(order, { type: 'shipment_cancelled', data: { reason } });
        } else if (status === 'ready_for_pickup') {
            await orders.setStatus(order.id, 'packing', reason);
        } else {
            return;
        }

        pushEvent(order, {
            type: 'status_reverted',
            data: { from: status, reason },
        });
    }

    /** Statuses at which the station itself may still cancel an order — up to
     * "מוכן לאיסוף". There is no cancelling "נשלח" or "נאסף" (spec §3.4). */
    const STATION_CANCELLABLE = [
        'in_production',
        'packing',
        'awaiting_courier',
        'ready_for_pickup',
    ];

    /** "ביטול הזמנה" from the station — cancel the shipment, return the stock,
     * then the order's own existing cancellation. */
    async function cancelFromStation(
        order,
        reason,
        { phoneConfirmed = false } = {},
    ) {
        if (!STATION_CANCELLABLE.includes(statusOf(order))) {
            return;
        }

        const shipment = activeShipmentOf(order);

        // An active Tapuz shipment has no cancel call yet — same rule as
        // stepBack. An order with nothing shipped yet needs no such call.
        if (shipment && !phoneConfirmed) {
            return;
        }

        if (shipment) {
            shipment.status = 'cancelled';
            shipment.cancelledAt = moment();
            shipment.cancelledBy = actor.value;
            shipment.cancelledReason = reason;
            order.courier = null;
            order.tracking = null;
            pushEvent(order, { type: 'shipment_cancelled', data: { reason } });
        }

        await inventory.releaseFromOrder(order, reason);
        await orders.cancelOrder(order.id, reason);
        pushEvent(order, { type: 'cancelled_by_station', data: { reason } });
    }

    return {
        courierSettings,
        pickupLists,
        settingsFor,
        activeCouriers,
        defaultCourier,
        awaitingCountFor,
        updateCourierSettings,

        stationOrders,
        inProduction,
        packing,
        awaitingCourier,
        awaitingByCourier,
        readyForPickup,
        pickupOrders,
        shippedAndDone,
        exceptionOrders,
        stationExceptionsOf,
        stationGateOf,

        activeShipmentOf,
        handedShipmentOf,
        packingOf,
        packedCount,
        allPacked,
        historyOf,

        startPacking,
        findOrderByBarcode,
        scanBarcode,
        tickManually,
        tickShelfContainer,
        setPackagesCount,

        linkPreconditions,
        linkCourier,
        retryLink,
        enterManualTracking,

        printPickupList,
        handToCourier,

        markReadyForPickup,
        markCollected,

        updateAddress,
        setShipTo,

        stepBack,
        cancelFromStation,
    };
});
