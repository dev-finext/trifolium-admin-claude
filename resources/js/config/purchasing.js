// Purchasing: purchase orders, supplier delivery notes, supplier invoices and
// the payments that close them, and the batch-handling settings the pharmacy
// controls. Second-version material (dev/progress.js → `purchase-orders`,
// `receiving`, `batches`). Display text lives in the locale catalogs under
// `purchasing.*` and `inventory.*`.
import { isoDaysAgo } from '@/lib/dates';

/** Purchase-order states and their chip tone. */
export const PO_STATES = [
    { id: 'open', tone: 'blue' },
    { id: 'partial', tone: 'amber' },
    { id: 'closed', tone: 'green' },
    { id: 'cancelled', tone: 'gray' },
];

export const PO_STATE = Object.fromEntries(
    PO_STATES.map((state) => [state.id, state]),
);

export const PO_STATE_IDS = PO_STATES.map((state) => state.id);

/** What the purchase-order list may be narrowed by. */
export const PO_FILTER_FIELDS = [
    {
        key: 'pstate',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.state',
        values: (row) => [row.state],
    },
    {
        key: 'pdue',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.filter.dueState',
        values: (row) => [poDueState(row)],
    },
    {
        key: 'psup',
        group: 'who',
        kind: 'set',
        values: (row) => [row.supplierCode],
    },
    {
        key: 'pby',
        group: 'who',
        kind: 'set',
        values: (row) => [row.by?.he || row.by],
    },
    { key: 'pvalue', group: 'size', kind: 'num', value: (row) => row.value },
    {
        key: 'plines',
        group: 'size',
        kind: 'num',
        value: (row) => row.lines.length,
    },
];

export const PO_FILTER_GROUPS = ['state', 'who', 'size'];

/** Whether a purchase order is late, due soon, or has nothing outstanding. */
export function poDueState(row) {
    if (!['open', 'partial'].includes(row.state)) {
        return 'done';
    }

    if (!row.eta) {
        return 'noEta';
    }

    // Against the console's clock, not the browser's: the demo pins it, so a
    // late order stays late on every load.
    return row.eta < isoDaysAgo(0) ? 'late' : 'due';
}

/** What the supplier-note list may be narrowed by. */
export const SUPPLIER_NOTE_FILTER_FIELDS = [
    {
        key: 'nstate',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.noteState',
        values: (note) => [note.state],
    },
    {
        key: 'ninv',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.filter.invoiceState',
        values: (note) => [note.invoice ? 'yes' : 'no'],
    },
    {
        key: 'nsup',
        group: 'who',
        kind: 'set',
        values: (note) => [note.supplierCode],
    },
];

export const SUPPLIER_NOTE_FILTER_GROUPS = ['state', 'who'];

export const PO_RECEIVABLE_STATE_IDS = ['open', 'partial'];

/**
 * A supplier's delivery note opens on receipt and closes only when the supplier's
 * invoice for it arrives — which is how every delivery is proven billed and every
 * invoice proven delivered. `note.invoice` is the id of that invoice record.
 */
export const SUPPLIER_NOTE_STATE_IDS = ['open', 'closed'];

/**
 * Supplier invoices. The state is never typed in: it is read off `paid` against
 * `total` (`supplierInvoiceState`), and only a dispute overrides that reading —
 * a disputed invoice is not paid until the dispute is lifted.
 */
export const SUPPLIER_INVOICE_STATES = [
    { id: 'open', tone: 'amber' },
    { id: 'partial', tone: 'blue' },
    { id: 'paid', tone: 'green' },
    { id: 'disputed', tone: 'red' },
];

export const SUPPLIER_INVOICE_STATE = Object.fromEntries(
    SUPPLIER_INVOICE_STATES.map((state) => [state.id, state]),
);

export const SUPPLIER_INVOICE_STATE_IDS = SUPPLIER_INVOICE_STATES.map(
    (state) => state.id,
);

/** The state an invoice's figures put it in. `disputed` is kept when set. */
export function supplierInvoiceState(invoice) {
    if (invoice.state === 'disputed') {
        return 'disputed';
    }

    const paid = Number(invoice.paid) || 0;

    if (paid <= 0) {
        return 'open';
    }

    return paid + 0.005 >= Number(invoice.total) ? 'paid' : 'partial';
}

/** What is still owed on an invoice. Never negative. */
export function supplierInvoiceOpen(invoice) {
    return Math.max(
        0,
        Math.round(
            ((Number(invoice.total) || 0) - (Number(invoice.paid) || 0)) * 100,
        ) / 100,
    );
}

/** How many days ahead "due this week" reaches. */
export const INVOICE_DUE_SOON_DAYS = 7;

export const INVOICE_DUE_STATE_IDS = ['overdue', 'week', 'later', 'settled'];

/**
 * Where an invoice stands against its due date, against the console's clock.
 * A paid invoice is settled whatever its date; a disputed one still ages.
 */
export function invoiceDueState(invoice) {
    if (supplierInvoiceState(invoice) === 'paid') {
        return 'settled';
    }

    const today = isoDaysAgo(0);

    if (invoice.dueOn < today) {
        return 'overdue';
    }

    return invoice.dueOn <= isoDaysAgo(-INVOICE_DUE_SOON_DAYS)
        ? 'week'
        : 'later';
}

/** What the supplier-invoice list may be narrowed by. */
export const SUPPLIER_INVOICE_FILTER_FIELDS = [
    {
        key: 'istate',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.invoiceState',
        values: (invoice) => [supplierInvoiceState(invoice)],
    },
    {
        key: 'idue',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.invoiceDue',
        values: (invoice) => [invoiceDueState(invoice)],
    },
    {
        key: 'iacct',
        group: 'state',
        kind: 'set',
        prefix: 'purchasing.filter.accountingState',
        values: (invoice) => [invoice.accounting?.sent ? 'sent' : 'pending'],
    },
    {
        key: 'isup',
        group: 'who',
        kind: 'set',
        values: (invoice) => [invoice.supplierCode],
    },
    {
        key: 'icat',
        group: 'who',
        kind: 'set',
        prefix: 'purchasing.expenseCategory',
        values: (invoice) => [invoice.category],
    },
    {
        key: 'itotal',
        group: 'size',
        kind: 'num',
        value: (invoice) => invoice.total,
    },
    {
        key: 'iopen',
        group: 'size',
        kind: 'num',
        value: (invoice) => supplierInvoiceOpen(invoice),
    },
];

export const SUPPLIER_INVOICE_FILTER_GROUPS = ['state', 'who', 'size'];

/** What the supplier-payment list may be narrowed by. */
export const SUPPLIER_PAYMENT_FILTER_FIELDS = [
    {
        key: 'ysup',
        group: 'who',
        kind: 'set',
        values: (payment) => [payment.supplierCode],
    },
    {
        key: 'ymethod',
        group: 'who',
        kind: 'set',
        prefix: 'purchasing.payMethod',
        values: (payment) => [payment.method],
    },
    {
        key: 'yamt',
        group: 'size',
        kind: 'num',
        value: (payment) => payment.amount,
    },
    {
        key: 'yage',
        group: 'size',
        kind: 'num',
        value: (payment) => payment.date?.daysAgo ?? 0,
    },
];

export const SUPPLIER_PAYMENT_FILTER_GROUPS = ['who', 'size'];

/**
 * How batches are drawn for compounding. FEFO — first expired, first out — is
 * what the pharmacy works by; FIFO by receipt date is kept as an option because
 * the specification asked for the switch.
 */
export const PICK_MODE_IDS = ['fefo', 'fifo'];

/** Where a batch comes from; each source numbers its batches under its own prefix. */
export const BATCH_SOURCE_IDS = ['supplier', 'production', 'waste'];

export const PO_RULES = { maxLines: 60 };
