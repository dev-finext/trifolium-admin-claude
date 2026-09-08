// Purchasing: purchase orders, supplier delivery notes and the batch-handling
// settings the pharmacy controls. Second-version material (dev/progress.js →
// `purchase-orders`, `receiving`, `batches`). Display text lives in the locale
// catalogs under `purchasing.*` and `inventory.*`.

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

/** States a purchase order still accepts goods in. */
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
    { key: 'psup', group: 'who', kind: 'set', values: (row) => [row.supplierCode] },
    { key: 'pby', group: 'who', kind: 'set', values: (row) => [row.by?.he || row.by] },
    { key: 'pvalue', group: 'size', kind: 'num', value: (row) => row.value },
    { key: 'plines', group: 'size', kind: 'num', value: (row) => row.lines.length },
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

    return row.eta < new Date().toISOString().slice(0, 10) ? 'late' : 'due';
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
        values: (note) => [note.invoice?.num ? 'yes' : 'no'],
    },
    { key: 'nsup', group: 'who', kind: 'set', values: (note) => [note.supplierCode] },
];

export const SUPPLIER_NOTE_FILTER_GROUPS = ['state', 'who'];

export const PO_RECEIVABLE_STATE_IDS = ['open', 'partial'];

/**
 * A supplier's delivery note opens on receipt and closes only when the supplier's
 * invoice for it arrives — which is how every delivery is proven billed and every
 * invoice proven delivered.
 */
export const SUPPLIER_NOTE_STATE_IDS = ['open', 'closed'];

/**
 * How batches are drawn for compounding. FEFO — first expired, first out — is
 * what the pharmacy works by; FIFO by receipt date is kept as an option because
 * the specification asked for the switch.
 */
export const PICK_MODE_IDS = ['fefo', 'fifo'];

/** Where a batch comes from; each source numbers its batches under its own prefix. */
export const BATCH_SOURCE_IDS = ['supplier', 'production', 'waste'];

export const PO_RULES = { maxLines: 60 };
