// Suppliers: what kinds there are, how they are paid, and what a supplier card
// must have on file. Labels live in the locale catalogs under `systemContacts.*`.

/** Supplier categories. */
export const SUPPLIER_KIND_IDS = [
    'raw_materials',
    'bases_alcohol',
    'packaging',
    'logistics',
    'services',
];

/** Payment terms the pharmacy trades on. `days` is net days from invoice. */
export const PAYMENT_TERMS = [
    { id: 'immediate', days: 0 },
    { id: 'net30', days: 30 },
    { id: 'net60', days: 60 },
    { id: 'net90', days: 90 },
];

export const PAYMENT_TERM_IDS = PAYMENT_TERMS.map((term) => term.id);

/**
 * A supplier card carries bank details, trade terms and purchase prices — data
 * outside the daily work of the support team — so opening one is gated behind a
 * re-confirmation and written to the system log. The gate stays open until the
 * user leaves the screen or locks it again.
 *
 * There is deliberately no password here: the check is performed against the
 * signed-in admin's own credentials by the backend, never against a value
 * shipped to the browser.
 */
export const SUPPLIER_CARD_GATE = {
    scope: 'session_until_navigate',
    logged: true,
};

/**
 * Compliance documents every active supplier must have on file. A missing or
 * expired bookkeeping certificate blocks *payment*, not purchasing.
 */
export const SUPPLIER_COMPLIANCE_DOCS = [
    { id: 'bookkeeping_cert', blocks: 'payment', expires: true },
    { id: 'withholding_tax', blocks: null, expires: true },
    { id: 'coa', blocks: null, expires: false },
];
