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

export const PAYMENT_TERM = Object.fromEntries(
    PAYMENT_TERMS.map((term) => [term.id, term]),
);

/**
 * How a payment to a supplier actually went out. Distinct from the card's
 * preferred method (`supplier.pay`): that is the agreement, this is the fact.
 * Labels under `purchasing.payMethod.<id>`.
 */
export const SUPPLIER_PAYMENT_METHOD_IDS = [
    'transfer',
    'check',
    'card',
    'cash',
];

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
 * Rough conversion into shekels for a card figure, whatever the invoice
 * currency. A card states one balance, so a dollar invoice is read in shekels
 * there; the invoice itself keeps its own currency.
 */
export const SUPPLIER_CARD_TO_ILS = { ILS: 1, EUR: 4, USD: 3.7 };

const inIls = (amount, currency) =>
    amount * (SUPPLIER_CARD_TO_ILS[currency] || 1);

/**
 * What a supplier's invoices say about him: everything billed in the last
 * twelve months (`spend12`) and everything still owed (`open`). The card and
 * the list read these two figures off the record, so whatever changes an
 * invoice — a capture, a payment — writes them again from here, the same way
 * the fixture first wrote them.
 */
export function supplierMoney(code, invoices) {
    const own = (invoices || []).filter(
        (invoice) => invoice.supplierCode === code,
    );

    return {
        spend12: Math.round(
            own
                .filter((invoice) => (invoice.date?.daysAgo ?? 0) <= 365)
                .reduce(
                    (sum, invoice) =>
                        sum +
                        inIls(Number(invoice.total) || 0, invoice.currency),
                    0,
                ),
        ),
        open:
            Math.round(
                own.reduce(
                    (sum, invoice) =>
                        sum +
                        inIls(
                            Math.max(
                                0,
                                (Number(invoice.total) || 0) -
                                    (Number(invoice.paid) || 0),
                            ),
                            invoice.currency,
                        ),
                    0,
                ) * 100,
            ) / 100,
    };
}

/**
 * Compliance documents every active supplier must have on file. A missing or
 * expired bookkeeping certificate blocks *payment*, not purchasing.
 */
export const SUPPLIER_COMPLIANCE_DOCS = [
    { id: 'bookkeeping_cert', blocks: 'payment', expires: true },
    { id: 'withholding_tax', blocks: null, expires: true },
    { id: 'coa', blocks: null, expires: false },
];
