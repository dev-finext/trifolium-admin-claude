// Order status model.
//
// These are the eight values `ORDR.U_OrderState` actually holds, read from the
// field's own definition in the restored database (`CUFD` + `UFD1`, TableID
// `ORDR`, AliasID `OrderState`) and cross-checked against all 355,046 rows of
// `ORDR`:
//
//     code  SAP label      orders
//     1     הזמנה חדשה      20,289
//     2     בטיפול              10
//     3     מעבדה              865
//     4     ארוז                 5
//     5     נשלח           109,886
//     6     סגור           210,468
//     7     מושהה               92
//     8     מבוטל           13,431
//
// Three corrections against the list this file used to carry, which came from
// the old PHP site's own English glosses rather than from SAP:
//
//   * there is no state 0. Not one order has it.
//   * state 6 סגור was missing, and it is the most common state in the whole
//     system — 59% of every order ever placed. State 7 מושהה was missing too.
//   * everything from 3 upwards was shifted by one: 3 is the lab, not "ready";
//     4 is packed, not "shipped"; 5 is sent, not "delivered".
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
    { id: 'new', code: 1, tone: 'amber' },
    { id: 'in_process', code: 2, tone: 'gray' },
    { id: 'lab', code: 3, tone: 'blue' },
    { id: 'packed', code: 4, tone: 'teal' },
    { id: 'sent', code: 5, tone: 'blue' },
    { id: 'closed', code: 6, tone: 'green' },
    { id: 'on_hold', code: 7, tone: 'gray' },
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

/**
 * The happy path, in order — drives the progress rail on an order.
 *
 * `on_hold` and `cancelled` sit off the path: an order can enter either from
 * anywhere, and neither is a step towards being finished.
 */
export const ORDER_FLOW = [
    'new',
    'in_process',
    'lab',
    'packed',
    'sent',
    'closed',
];

/**
 * States that exist in SAP and are barely used — ten orders for בטיפול, five
 * for ארוז, ninety-two for מושהה, out of 355,046. They are here because they
 * are real, and marked because a screen that gives them equal weight would be
 * lying about where the work actually sits.
 */
export const RARE_STATUS_IDS = ['in_process', 'packed', 'on_hold'];

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

/**
 * Statuses that mean the order is finished and needs no further action.
 *
 * סגור is the pharmacy's own end state; נשלח still has a delivery in flight.
 */
export const TERMINAL_STATUS_IDS = ['closed', 'cancelled'];

/** Statuses a delivery screen cares about. */
export const DELIVERY_STATUS_IDS = ['packed', 'sent', 'closed'];

/** Where an order sits along the flow; `-1` for anything off it. */
export function statusIndex(id) {
    return ORDER_FLOW.indexOf(id);
}
