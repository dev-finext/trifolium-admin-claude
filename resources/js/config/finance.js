// Money-side configuration: tax documents, credit terms, aging, payment links,
// customer numbering, payment terminals and expense categories. Display text
// lives in the locale catalogs.

/**
 * Tax documents. The pharmacy issues nothing itself: a cloud invoice provider
 * issues the document the moment money arrives and returns the document
 * number together with the tax-authority allocation number.
 *
 * `apiKey` is a masked display value only. A real deployment reads the key from
 * the server environment; it is never shipped to the browser.
 */
export const DOC_PROVIDER = {
    name: 'iCount',
    baseUrl: 'https://api.icount.co.il/api/v3.php',
    env: 'production',
    apiKeyMask: 'ic_live_••••7a2e',
    retries: 3,
    retryGapMinutes: 5,
};

/**
 * Document kinds. `inv` is a tax invoice on its own (goods delivered, money to
 * follow), `receipt` acknowledges money against an invoice already issued,
 * `invrec` is the two in one the moment a card payment clears, `invrec_multi`
 * is the consolidated version a collection link produces, and `credit` reverses
 * a document after payment. Labels and when-text live under `docType.<id>.*`.
 */
export const DOC_TYPES = [
    { id: 'inv' },
    { id: 'receipt' },
    { id: 'invrec' },
    { id: 'invrec_multi' },
    { id: 'credit' },
];

export const DOC_TYPE_IDS = DOC_TYPES.map((type) => type.id);

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
 * What a document line can be. A compounded formula lists one line per
 * component at its own price, then the shelf products, then the charges;
 * discount and points are lines too, so the body of the document adds up on
 * its own. Labels under `finance.docLine.<id>`.
 */
export const DOC_LINE_KIND_IDS = [
    'component',
    'shelf',
    'shipping',
    'fee',
    'discount',
    'points',
];

/**
 * Allocation numbers (מספרי הקצאה) — חשבוניות ישראל. The Israel Tax Authority
 * requires an allocation number on every tax invoice whose total (incl. VAT)
 * reaches the threshold, and the threshold steps DOWN every year:
 *
 *   2024  ₪25,000
 *   2025  ₪20,000
 *   2026  ₪10,000   ← the step in force for this fixture (owner-confirmed)
 *   2027   ₪5,000
 *
 * The provider asks for an allocation on every document it issues for us; only
 * the ones at or above the threshold are *required* to carry one. Below it a
 * refusal is still an exception — the pharmacy sends nothing without its
 * number — but the document itself is valid.
 */
export const ALLOCATION = { thresholdIls: 10000 };

/** Document types an allocation number applies to at all. */
export const ALLOCATION_DOC_TYPE_IDS = ['inv', 'invrec', 'invrec_multi'];

/** Where the allocation request stands, and its chip tone. */
export const ALLOCATION_STATES = {
    granted: { tone: 'green' },
    not_required: { tone: 'gray' },
    refused: { tone: 'red' },
    pending: { tone: 'amber' },
};

export const ALLOCATION_STATE_IDS = Object.keys(ALLOCATION_STATES);

/** Whether the tax authority requires an allocation number on this document. */
export function documentNeedsAllocation(doc) {
    return (
        ALLOCATION_DOC_TYPE_IDS.includes(doc?.type) &&
        Number(doc?.total ?? doc?.amt ?? 0) >= ALLOCATION.thresholdIls
    );
}

/**
 * Where a payment was taken. The consumer site and the practitioner site are
 * two storefronts on the same clearing account; `physical` is the terminal at
 * the counter. A field only — nothing else reads it yet.
 */
export const PAY_TERMINALS = ['consumer_site', 'practitioner_site', 'physical'];

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

/**
 * What a supplier invoice is for. Invented for the demo — the accountant's own
 * chart of accounts replaces it on a real deployment. Labels under
 * `purchasing.expenseCategory.<id>`.
 */
export const EXPENSE_CATEGORY_IDS = [
    'raw_materials',
    'packaging',
    'lab_supplies',
    'shipping',
    'equipment',
    'rent',
    'utilities',
    'professional_services',
    'marketing',
    'other',
];
