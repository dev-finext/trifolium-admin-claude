// Order and item status model.
//
// One canonical list, owned by this system: the database stores the id itself,
// there are no external status codes. Display text is NOT here — it lives in the
// locale catalogs under `status.*` and `itemStage.*`, so the same id renders in
// Hebrew or English without touching this file.

/**
 * Order statuses. `credit` (בהקפה) is the paid-equivalent state of an order that
 * reached the lab unpaid under approved credit terms: the money is owed, the
 * work goes ahead.
 */
export const ORDER_STATUSES = [
    { id: 'pending_payment', tone: 'amber' },
    { id: 'credit', tone: 'purple' },
    { id: 'paid', tone: 'blue' },
    { id: 'in_production', tone: 'blue' },
    { id: 'ready_for_delivery', tone: 'teal' },
    { id: 'shipped', tone: 'blue' },
    { id: 'delivered', tone: 'green' },
    { id: 'completed', tone: 'green' },
    { id: 'cancelled', tone: 'red' },
];

export const ORDER_STATUS = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status.id, status]),
);

export const ORDER_STATUS_IDS = ORDER_STATUSES.map((status) => status.id);

/** The happy path, in order — drives the progress rail on an order. */
export const ORDER_FLOW = [
    'pending_payment',
    'paid',
    'in_production',
    'ready_for_delivery',
    'shipped',
    'delivered',
];

/**
 * Item-level tracking. Every compounded formula carries its own stage; the lab
 * works four of them (awaiting_prep → in_lab → ready_pack → packed). There is no
 * QC stage — the pharmacist-approval field on the formula replaces it. Shelf
 * products are not tracked separately.
 *
 * An order's status is always the lowest stage among its non-cancelled items:
 * no split orders, no partial shipment.
 */
export const ITEM_STAGES = [
    { id: 'pending_payment', tone: 'amber' },
    { id: 'awaiting_prep', tone: 'gray' },
    { id: 'in_lab', tone: 'blue' },
    { id: 'ready_pack', tone: 'teal' },
    { id: 'packed', tone: 'teal' },
    { id: 'shipped', tone: 'blue' },
    { id: 'delivered', tone: 'green' },
];

export const ITEM_CANCELLED = { id: 'cancelled', tone: 'red' };

export const ITEM_STAGE = Object.fromEntries(
    [...ITEM_STAGES, ITEM_CANCELLED].map((stage) => [stage.id, stage]),
);

export const ITEM_STAGE_IDS = ITEM_STAGES.map((stage) => stage.id);

/** Where an order status places its items when the two are synchronised. */
export const ORDER_TO_ITEM_STAGE = {
    pending_payment: 'pending_payment',
    credit: 'awaiting_prep',
    paid: 'awaiting_prep',
    in_production: 'in_lab',
    ready_for_delivery: 'ready_pack',
    shipped: 'shipped',
    delivered: 'delivered',
    completed: 'delivered',
    cancelled: 'cancelled',
};

/** Position of a stage along the lab progression; `-1` when cancelled. */
export function itemStageIndex(id) {
    return ITEM_STAGE_IDS.indexOf(id);
}

/** Reasons an order can sit on hold before it enters the lab. */
export const HOLD_REASON_IDS = [
    'pending_payment',
    'awaiting_customer',
    'draft',
];

/** Statuses that mean the order is finished and needs no further action. */
export const TERMINAL_STATUS_IDS = ['delivered', 'completed', 'cancelled'];

/** Statuses a delivery screen cares about. */
export const DELIVERY_STATUS_IDS = [
    'ready_for_delivery',
    'shipped',
    'delivered',
];
