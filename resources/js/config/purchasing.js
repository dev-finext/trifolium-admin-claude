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
