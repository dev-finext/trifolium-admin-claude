// Money-side configuration: tax documents, credit terms, aging, payment links,
// customer numbering. Display text lives in the locale catalogs.

/**
 * Tax documents. The pharmacy issues nothing itself: a cloud invoice provider
 * issues a חשבונית מס קבלה the moment money arrives and returns the document
 * number together with the tax-authority allocation number.
 *
 * `apiKey` is a masked display value only. A real deployment reads the key from
 * the server environment; it is never shipped to the browser.
 */
export const DOC_PROVIDER = {
    name: 'Green Invoice',
    baseUrl: 'https://api.greeninvoice.co.il/api/v1',
    env: 'production',
    apiKeyMask: 'gi_live_••••4c19',
    retries: 3,
    retryGapMinutes: 5,
};

/** Document kinds. `when` text is in the catalog under `doc.type.<id>.when`. */
export const DOC_TYPES = [
    { id: 'invrec' },
    { id: 'invrec_multi' },
    { id: 'credit' },
];

/** Document lifecycle states and their chip tone. */
export const DOC_STATES = {
    issued: { tone: 'green' },
    failed: { tone: 'red' },
    queued: { tone: 'amber' },
    awaiting_credit: { tone: 'purple' },
    none: { tone: 'gray' },
    credited: { tone: 'amber' },
};

export const DOC_STATE_IDS = Object.keys(DOC_STATES);

/**
 * Credit terms (הקפה). Approved per practitioner, on that practitioner's card
 * only. There is no credit limit: the system warns, it never blocks. Collection
 * is one link for the whole open balance — all or nothing — producing one
 * consolidated document.
 */
export const CREDIT = {
    warnDebt: 3000,
    warnDays: 30,
    allowPartial: false,
    linkDays: 7,
};

/** Debt aging buckets, in days. */
export const AGING_BUCKETS = [
    { id: 'b0', from: 0, to: 30, tone: 'gray' },
    { id: 'b1', from: 31, to: 60, tone: 'amber' },
    { id: 'b2', from: 61, to: 90, tone: 'amber' },
    { id: 'b3', from: 91, to: Infinity, tone: 'red' },
];

/** Which bucket a debt of `days` falls into. */
export function agingBucket(days) {
    return (
        AGING_BUCKETS.find(
            (bucket) => days >= bucket.from && days <= bucket.to,
        ) || AGING_BUCKETS[0]
    );
}

/**
 * Customer payment links. A link lives 7 days; a reminder goes out on day 5. On
 * expiry the order is cancelled automatically and the stock allocated to it is
 * released.
 */
export const PAY_LINK = { days: 7, reminderDay: 5 };

/** Lifecycle of a single payment or collection link, with its chip tone. */
export const LINK_STATES = {
    none: { tone: 'gray' },
    sent: { tone: 'blue' },
    paid: { tone: 'green' },
    expired: { tone: 'red' },
};

export const LINK_STATE_IDS = Object.keys(LINK_STATES);

/**
 * Customer numbering. Historical numbers were kept exactly as they were; new
 * practitioners continue the same running series — there is no renumbering.
 */
export const NUMBERING = { legacyFrom: 11400, legacyTo: 11650, next: 11651 };

/** Payment methods the console can record. */
export const PAYMENT_METHODS = [
    'card',
    'transfer',
    'cash',
    'credit_terms',
    'points',
];

/**
 * Chip tone per ledger movement. The kinds themselves come from the rows, so a
 * kind the data stops carrying stops appearing on screen; this only says how each
 * is coloured — money out is neutral, money in is green, a reversal is purple.
 */
export const TXN_KIND_TONES = {
    charge: 'gray',
    payment: 'green',
    credit: 'purple',
};

/** Chip tone per points movement, on the same reading. */
export const POINT_KIND_TONES = { earn: 'green', spend: 'purple' };
