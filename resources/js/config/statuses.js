// Order status model.
//
// These ten values are the production app's own `OrderStatus` enum (see
// `SHIPPING_STATION_SPEC.md` §3.1) — not SAP's `U_OrderState`. The two cutovers
// that brought them in, 04–05.11.2026:
//
//   * payment is no longer a boolean next to the status — "ממתין לתשלום",
//     "בהקפה" and "שולם" are themselves statuses, in sequence with the rest;
//   * "ready for delivery" (SAP's "ארוז") splits into a real shipping flow:
//     packing → a courier link that keeps its tracking number → handover.
//
// SAP's eight `U_OrderState` codes still exist as the *source* a fixture is
// built from — see `demo/orders.js` for that one-time mapping — but nothing
// downstream of that mapping ever sees a SAP code again, and the SAP state
// names (מעבדה, ארוז, נשלח, סגור…) do not appear anywhere past it.
//
// `credit` is `paid`'s stand-in on the happy path: an order on credit terms is
// exactly as settled as a paid one for every step after it, so the flow and
// the rail treat the two as one position (see `flowIdOf`). `completed` stayed
// in the old SAP-era model as a leftover from the system before this one; it
// has no place here and this console never sets or shows it.
//
// Display text is not here: it lives in the locale catalogs under `status.*`,
// so the same id renders in Hebrew or English without touching this file.
export const ORDER_STATUSES = [
    { id: 'pending_payment', tone: 'amber' },
    { id: 'credit', tone: 'purple' },
    { id: 'paid', tone: 'blue' },
    { id: 'in_production', tone: 'blue' },
    { id: 'packing', tone: 'teal' },
    { id: 'awaiting_courier', tone: 'amber' },
    { id: 'shipped', tone: 'green' },
    { id: 'ready_for_pickup', tone: 'teal' },
    { id: 'collected', tone: 'green' },
    { id: 'cancelled', tone: 'red' },
];

export const ORDER_STATUS = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status.id, status]),
);

export const ORDER_STATUS_IDS = ORDER_STATUSES.map((status) => status.id);

/**
 * The happy path, in order — drives the progress rail on an order. Shipping
 * and self-pickup part ways after `packing`, so each gets its own path; both
 * start the same.
 */
export const ORDER_FLOW = {
    shipping: [
        'pending_payment',
        'paid',
        'in_production',
        'packing',
        'awaiting_courier',
        'shipped',
    ],
    pickup: [
        'pending_payment',
        'paid',
        'in_production',
        'packing',
        'ready_for_pickup',
        'collected',
    ],
};

/** `credit` sits where `paid` does on every flow — the two are one position. */
const FLOW_ALIAS = { credit: 'paid' };

export const flowIdOf = (status) => FLOW_ALIAS[status] || status;

/** Which of the two paths this order travels. */
export function flowFor(order) {
    return order?.shipTo === 'pickup' || order?.deliveryType === 'pickup'
        ? ORDER_FLOW.pickup
        : ORDER_FLOW.shipping;
}

/** Where this order sits along its own flow; `-1` for anything off it (cancelled). */
export function statusIndex(order) {
    return flowFor(order).indexOf(flowIdOf(order?.status));
}

/**
 * Payment, which is a field of its own and never a step in the flow.
 *
 * `paid` is `U_PayedSite = Y`. `credit` (בהקפה) is an order that went ahead
 * unpaid under the practitioner's approved credit terms: the money is owed and
 * collected later, and the work does not wait for it. These booleans persist
 * for the order's whole life — `order.status` moves on to `in_production` and
 * beyond, but whether it got there paid outright or on credit still answers
 * questions later (an unpaid credit order still owes a collection link after
 * it ships).
 */
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

/** Statuses that mean the order is finished and needs no further action. */
export const TERMINAL_STATUS_IDS = ['shipped', 'collected', 'cancelled'];

/** Statuses the shipping station cares about — from the lab onward. */
export const DELIVERY_STATUS_IDS = [
    'in_production',
    'packing',
    'awaiting_courier',
    'ready_for_pickup',
    'shipped',
    'collected',
];
