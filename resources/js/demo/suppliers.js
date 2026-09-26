// The supplier cards, built from the pharmacy's own supplier ledger.
//
// Until now the console carried seven hand-written suppliers with invented codes
// (`S-104`), while every item card named its supplier by SAP's code (`950001`).
// The two never met, which is why a purchase order could show a bare number
// where a name belongs. These are the real cards, under the real codes, so the
// join closes.
//
// What is SAP's, verbatim, from `demo/real/suppliers.json`:
//   the code, the company name, the supplier group, the payment terms, the
//   currency, the city and street, the open balance, the date the card was
//   opened, and how many items name this supplier.
//
// What is the fixture's, and marked as such on the card:
//   everything that identifies a person — the contact, the phone, the mailbox —
//   which `people.py` replaced during the extract; the company registration
//   number, for the same reason; and the trade detail SAP does not hold at all:
//   bank, trade discount, minimum order, lead time, compliance documents.
//
// `spend12` and `open` are not authored anywhere: applySupplierBalances() in
// demo/purchasing.js derives them from the invoices and payments.
import { chance, pickFrom, spread } from '@/demo/fixture';
import REAL_SUPPLIERS from '@/demo/real/suppliers.json';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * SAP's supplier groups, by `OCRG.GroupCode`, mapped onto what the console
 * calls a supplier kind. The groups are the pharmacy's own; the mapping is the
 * only interpretation, and it is one line each.
 *
 * 113 "אינטרנט" is the catch-all the pharmacy files one-off purchases
 * under — 263 cards, more than every other group together — so it maps to
 * services rather than pretending to be a trade category.
 */
const KIND_BY_GROUP = {
    101: 'raw_materials',
    102: 'raw_materials',
    103: 'bases_alcohol',
    104: 'packaging',
    105: 'logistics',
    106: 'services',
    107: 'services',
    111: 'services',
    112: 'services',
    113: 'services',
};

/** `OCTG.GroupNum` → the console's payment term. */
const TERM_BY_CODE = {
    '-1': 'immediate',
    1: 'net30',
    2: 'net30',
    3: 'net30',
    4: 'net60',
    5: 'net60',
    6: 'net60',
    7: 'net60',
    8: 'net90',
    9: 'immediate',
    10: 'immediate',
    11: 'net90',
    12: 'immediate',
    13: 'net60',
    14: 'net30',
};

const BANKS = [
    L('לאומי', 'Leumi'),
    L('הפועלים', 'Hapoalim'),
    L('מזרחי טפחות', 'Mizrahi Tefahot'),
    L('דיסקונט', 'Discount'),
    L('הבינלאומי', 'First International'),
];

/** A company name is a company name in both languages; only the label differs. */
const named = (name) => L(name, name);

/**
 * The supplier cards.
 *
 * Ordered as the extract ordered them: the ones that actually appear on a
 * purchase document first, then by how many items name them.
 */
export const DEMO_SUPPLIERS = REAL_SUPPLIERS.map((row) => {
    const slot = `supplier:${row.code}`;
    const kind = KIND_BY_GROUP[row.groupCode] || 'services';
    const terms = TERM_BY_CODE[String(row.termsCode)] || 'net30';
    const trades = row.items > 0;

    return {
        // ---- SAP's own
        code: row.code,
        name: named(row.name),
        kind,
        sapGroup: row.groupCode,
        sapGroupName: row.groupName ? named(row.groupName) : null,
        sapTerms: row.terms ? named(row.terms) : null,
        status: row.active === 'Y' ? 'active' : 'suspended',
        city: row.city ? named(row.city) : null,
        addr: row.street ? named(row.street) : null,
        cur: row.currency || '₪',
        terms,
        skus: row.items,
        since: row.createdOn,
        sapBalance: row.balance,

        // ---- replaced during the extract, because it identifies a person
        biz: row.companyNumber,
        contact: named(row.contact),
        mobile: row.phone,
        office: row.phone,
        email: row.email,
        orderMail: row.email,

        // ---- the fixture's own, because SAP does not hold it
        bizType: row.name.includes('בע') ? 'ltd' : 'sole_trader',
        role: L('איש קשר', 'Contact'),
        site: null,
        pay: chance(`${slot}:pay`, 0.85) ? 'transfer' : 'cheque',
        bank: pickFrom(`${slot}:bank`, BANKS),
        branch: String(spread(`${slot}:branch`, 100, 990)),
        acct: String(spread(`${slot}:acct`, 10000000, 99999999)),
        payee: named(row.name),
        tradeDisc: trades ? spread(`${slot}:disc`, 0, 15) : 0,
        minOrder: trades ? spread(`${slot}:min`, 0, 12) * 250 : 0,
        lead: trades ? spread(`${slot}:lead`, 3, 21) : null,
        coa: kind === 'raw_materials',
        books: { valid: '2026-12-31', ok: true },
        tax: {
            rate: chance(`${slot}:tax`, 0.2) ? 30 : 0,
            valid: '2026-12-31',
            ok: true,
        },
        lastReceipt: trades ? isoDaysAgo(spread(`${slot}:recv`, 3, 240)) : null,
        spend12: 0,
        open: 0,
        suspendedWhy: null,
        suspendedWhen: null,
        notes: null,
    };
});

export const SUPPLIER_BY_CODE = Object.fromEntries(
    DEMO_SUPPLIERS.map((supplier) => [supplier.code, supplier]),
);
