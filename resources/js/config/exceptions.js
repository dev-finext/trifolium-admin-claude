// Exceptions (חריגים).
//
// Every exception is a named, individually resolvable condition with its own
// next action. There is deliberately no generic "needs attention" state — an
// agent should always know what to do, not merely that something is wrong.
//
// Label, short label and the suggested fix all live in the locale catalog under
// `exception.<id>.*`.
export const EXCEPTION_TYPES = [
    { id: 'credit_debt', tone: 'red' },
    { id: 'doc_failed', tone: 'red' },
    { id: 'link_expiring', tone: 'amber' },
    { id: 'address', tone: 'red' },
    { id: 'msg', tone: 'red' },
    { id: 'pay_stale', tone: 'amber' },
    { id: 'interaction', tone: 'amber' },
    { id: 'lab', tone: 'amber' },
    { id: 'courier', tone: 'amber' },
];

export const EXCEPTION = Object.fromEntries(
    EXCEPTION_TYPES.map((type) => [type.id, type]),
);

export const EXCEPTION_IDS = EXCEPTION_TYPES.map((type) => type.id);

/** Exceptions that block money rather than fulfilment — surfaced in Finance. */
export const FINANCE_EXCEPTION_IDS = [
    'credit_debt',
    'doc_failed',
    'link_expiring',
];

/** Thresholds that decide when a condition becomes an exception. */
export const EXCEPTION_THRESHOLDS = {
    /** An unpaid order becomes `pay_stale` after this many days. */
    payStaleDays: 3,
    /** A payment link becomes `link_expiring` inside this many hours. */
    linkExpiringHours: 24,
    /** An order stuck in the lab becomes `lab` after this many days. */
    labStuckDays: 2,
};
