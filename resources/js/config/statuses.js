// Order status model.
//
// These are the seven values `U_OrderState` actually holds in SAP today, and
// nothing else. The number is what the field stores; the id is what this
// console passes around, so the mapping in either direction is one line.
//
// Two things this file deliberately does NOT have, because SAP does not:
//
//   * a payment step. Payment is its own field (`U_PayedSite`), and an order
//     can be paid or unpaid at any point in the flow. See PAYMENT_STATE_IDS.
//   * a status per formula. There is no status field on an order line — the
//     only thing a line carries of its own is whether it was cancelled.
//
// Display text is not here: it lives in the locale catalogs under `status.*`,
// so the same id renders in Hebrew or English without touching this file.
export const ORDER_STATUSES = [
    { id: 'pending', code: 0, tone: 'amber' },
    { id: 'confirmed', code: 1, tone: 'gray' },
    { id: 'in_production', code: 2, tone: 'blue' },
    { id: 'ready', code: 3, tone: 'teal' },
    { id: 'shipped', code: 4, tone: 'blue' },
    { id: 'delivered', code: 5, tone: 'green' },
    { id: 'cancelled', code: 8, tone: 'red' },
];

export const ORDER_STATUS = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status.id, status]),
);

export const ORDER_STATUS_IDS = ORDER_STATUSES.map((status) => status.id);

/** `U_OrderState` value → the id this console uses. */
export const ORDER_STATUS_BY_CODE = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status.code, status.id]),
);

/** The id → the value `U_OrderState` stores. */
export const orderStatusCode = (id) => ORDER_STATUS[id]?.code ?? null;

/** The happy path, in order — drives the progress rail on an order. */
export const ORDER_FLOW = [
    'pending',
    'confirmed',
    'in_production',
    'ready',
    'shipped',
    'delivered',
];

/**
 * Payment, which is a field of its own and never a step in the flow.
 *
 * `paid` is `U_PayedSite = Y`. `credit` (בהקפה) is an order that went ahead
 * unpaid under the practitioner's approved credit terms: the money is owed and
 * collected later, and the work does not wait for it.
 */
export const PAYMENT_STATE_IDS = ['unpaid', 'paid', 'credit'];

/** Which of the three one order is in. */
export function paymentStateOf(order) {
    if (!order) {
        return 'unpaid';
    }

    if (order.credit && !order.creditPaid) {
        return 'credit';
    }

    return order.paid ? 'paid' : 'unpaid';
}

/** An order whose money is settled — paid outright, or cleared on credit. */
export const isSettled = (order) => paymentStateOf(order) !== 'unpaid';

/** Reasons an order can sit on hold before it goes to the lab. */
export const HOLD_REASON_IDS = ['unpaid', 'awaiting_customer', 'draft'];

/** Statuses that mean the order is finished and needs no further action. */
export const TERMINAL_STATUS_IDS = ['delivered', 'cancelled'];

/** Statuses a delivery screen cares about. */
export const DELIVERY_STATUS_IDS = ['ready', 'shipped', 'delivered'];

/** Where an order sits along the flow; `-1` for cancelled. */
export function statusIndex(id) {
    return ORDER_FLOW.indexOf(id);
}
