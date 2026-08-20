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

/**
 * The status an order takes from the stage its items are at — the inverse of
 * ORDER_TO_ITEM_STAGE, and deliberately written out rather than computed from it.
 *
 * The mapping is not one-to-one, so an inversion in code would have to pick a
 * winner arbitrarily:
 *
 *   awaiting_prep  ← both `credit` and `paid`
 *   delivered      ← both `delivered` and `completed`
 *   packed         → has no status of its own; a packed order is still waiting
 *                    to leave, which is `ready_for_delivery`
 *
 * `statusOf()` resolves the first two by keeping the recorded status whenever it
 * already agrees with the stage, and reaches this table only once the two have
 * diverged — which is what happens while the lab works one formula ahead of
 * another. These values are what such a divergence settles on.
 */
export const STAGE_TO_STATUS = {
    pending_payment: 'pending_payment',
    awaiting_prep: 'paid',
    in_lab: 'in_production',
    ready_pack: 'ready_for_delivery',
    packed: 'ready_for_delivery',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
};

/**
 * The statuses at which an order's money is settled — paid outright, or approved
 * for credit terms with the balance collected later. Either one clears the order
 * for work.
 */
export const SETTLED_STATUS_IDS = ['paid', 'credit'];

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
