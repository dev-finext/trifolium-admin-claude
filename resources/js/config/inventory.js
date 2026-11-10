// Inventory: warehouses, batch lifecycle, stock movements, adjustments.
// Display text lives in the locale catalogs under `inventory.*`.

/**
 * The warehouses, as `OWHS` holds them. Seven are defined and three hold
 * anything: `01` carries the pharmacy (2,428 items), `02` seven items and `05`
 * one. The lab, the materials room, the herb room and the counter were opened
 * and never used — they are here because SAP has them and a migration carries
 * them, and they read as empty because they are.
 *
 * `01` is the one main warehouse (DEMO_INVENTORY_FIXES_PROMPT.md rule 1):
 * selling, holding stock and batch capture for orders count and take from it
 * only. Stock elsewhere shows everywhere but isn't sold until transferred in —
 * real data confirms this: every one of the 700 real batches sits in `01`,
 * `02`/`05` carry quantity-only stock (no batches), the 06/2026 real data has.
 * An inactive warehouse with no stock in it can be deactivated; one holding
 * stock can't.
 */
export const WAREHOUSES = [
    { id: '01', inUse: true, isMain: true },
    { id: '02', inUse: true },
    { id: '5', inUse: true },
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
];

/** The default a receipt, an issue or a new stock row lands in. */
export const DEFAULT_WAREHOUSE = '01';

/** The one main warehouse — selling and batch capture never look elsewhere. */
export const MAIN_WAREHOUSE = WAREHOUSES.find(
    (warehouse) => warehouse.isMain,
).id;

/** The warehouses stock actually moves through — the pickers offer these. */
export const WAREHOUSES_IN_USE = WAREHOUSES.filter(
    (warehouse) => warehouse.inUse,
);

export const WAREHOUSE_IN_USE_IDS = WAREHOUSES_IN_USE.map(
    (warehouse) => warehouse.id,
);

export const WAREHOUSE_IDS = WAREHOUSES.map((warehouse) => warehouse.id);

/**
 * The documents that move stock, as SAP posts them.
 *
 * `sap` is SAP's own object type. Four of them do the work: a goods receipt
 * brings stock in, a goods issue takes it out, a count corrects it and a
 * transfer moves it between warehouses. In the nine years of the live database
 * the receipts and issues are almost all raised by a production order — 64% of
 * receipt lines and 87% of issue lines — with the rest entered by hand.
 */
export const INVENTORY_DOCS = [
    { id: 'goods_receipt', sap: 59, tone: 'green', sign: 1 },
    { id: 'goods_issue', sap: 60, tone: 'red', sign: -1 },
    { id: 'count', sap: 1470000065, tone: 'amber', sign: 0 },
    { id: 'transfer', sap: 67, tone: 'blue', sign: 0 },
];

export const INVENTORY_DOC = Object.fromEntries(
    INVENTORY_DOCS.map((doc) => [doc.id, doc]),
);

export const INVENTORY_DOC_IDS = INVENTORY_DOCS.map((doc) => doc.id);

/**
 * What a document was raised against. SAP writes the production order's own
 * number into the line's `BaseEntry` and marks the line `BaseType` 202; a
 * document entered by hand carries -1, which is `manual` here.
 */
export const INVENTORY_DOC_BASES = ['manual', 'production', 'purchase_order'];

/** The block inventory documents are numbered in — SAP's own 26xxxxx. */
export const INVENTORY_DOC_SERIES = 2600000;

/**
 * Batch states and their chip tone. Always computed from today's date and the
 * batch's quantity/kind — never stored (DEMO_INVENTORY_FIXES_PROMPT.md §5.1).
 * `rejected` is gone: damage now leaves stock through the `spill_damage`
 * reason below, not through a batch state.
 */
export const BATCH_STATES = {
    active: { tone: 'green' },
    expiring: { tone: 'amber' },
    expired: { tone: 'red' },
    depleted: { tone: 'gray' },
    waste: { tone: 'red' },
};

export const BATCH_STATE_IDS = Object.keys(BATCH_STATES);

/** A batch is flagged `expiring` inside this many days of its expiry date. */
export const BATCH_EXPIRY_WARN_DAYS = 90;

/**
 * A batch's state, computed fresh every time — never read from a stored
 * field. `kind: 'waste'` always wins: a waste batch is never "expiring" or
 * "active" for FEFO purposes, whatever its date says.
 */
export function batchState(batch, today = new Date()) {
    if (batch.kind === 'waste') {
        return 'waste';
    }

    if ((batch.qty ?? batch.quantity ?? 0) <= 0) {
        return 'depleted';
    }

    if (batch.expiresOn) {
        const days = Math.floor(
            (new Date(batch.expiresOn) - today) / (1000 * 60 * 60 * 24),
        );

        if (days < 0) {
            return 'expired';
        }

        if (days <= BATCH_EXPIRY_WARN_DAYS) {
            return 'expiring';
        }
    }

    return 'active';
}

/** Kinds of batch (`stock_batches.kind`, DEMO_INVENTORY_FIXES_PROMPT.md §3). */
export const BATCH_KINDS = ['purchase', 'production', 'waste', 'opening'];

/**
 * Kinds of stock movement written to the ledger, and the chip tone each is
 * shown in. Only `allocated_to_compounding` (batch capture for an order) and
 * `production_out` count as consumption — every other kind is excluded from
 * stock analysis (DEMO_INVENTORY_FIXES_PROMPT.md §10.2).
 */
export const STOCK_MOVES = [
    { id: 'goods_in', tone: 'green' },
    { id: 'allocated_to_compounding', tone: 'blue', consumption: true },
    { id: 'released_on_cancel', tone: 'gray' },
    { id: 'manual_in', tone: 'green' },
    { id: 'manual_out', tone: 'amber' },
    { id: 'transfer_out', tone: 'blue' },
    { id: 'transfer_in', tone: 'blue' },
    { id: 'production_out', tone: 'purple', consumption: true },
    { id: 'production_in', tone: 'teal' },
    { id: 'production_return', tone: 'teal' },
    { id: 'waste_in', tone: 'red' },
    { id: 'count', tone: 'amber' },
];

export const STOCK_MOVE = Object.fromEntries(
    STOCK_MOVES.map((move) => [move.id, move]),
);

export const STOCK_MOVE_IDS = STOCK_MOVES.map((move) => move.id);

/**
 * How many of the base unit (a gram, a millilitre, one piece) one stock unit
 * holds. A bill of materials is written in millilitres while SAP keeps the same
 * tincture in litres, so every quantity that crosses from a recipe to a stock
 * row goes through `convertQty`. Mass and volume are treated as 1:1 — the
 * tinctures and oils compounded here are close enough to water for a stock
 * figure, and the alternative is a density per item nobody maintains.
 */
export const UNIT_SCALE = {
    g: 1,
    kg: 1000,
    ml: 1,
    l: 1000,
    unit: 1,
    pack: 1,
    capsule: 1,
};

/** `qty` expressed in unit `to`, or unchanged when either unit is unknown. */
export function convertQty(qty, from, to) {
    if (!from || !to || from === to) {
        return qty;
    }

    const scaleFrom = UNIT_SCALE[from];
    const scaleTo = UNIT_SCALE[to];

    if (!scaleFrom || !scaleTo) {
        return qty;
    }

    return (qty * scaleFrom) / scaleTo;
}

/**
 * The fixed reason list for every manual stock document
 * (DEMO_INVENTORY_FIXES_PROMPT.md rule 4). `dir` says which manual documents
 * offer it: `in` on a manual receipt, `out` on a manual issue, `both` on
 * either (a count correction can go either way). Only `capture`/`production`
 * — the two reasons sales and production write for themselves — count as
 * consumption; nothing in this list does.
 */
export const REASONS = [
    { id: 'po_receipt', dir: 'in' },
    { id: 'purchase_no_order', dir: 'in' },
    { id: 'patient_return', dir: 'in' },
    { id: 'count_correction', dir: 'both' },
    { id: 'waste', dir: 'out' },
    { id: 'spill_damage', dir: 'out' },
    { id: 'sample_use', dir: 'out' },
    // A wrong entry can be wrong in either direction: goods booked in twice
    // come out, goods that were never booked in go in.
    { id: 'mistake_fix', dir: 'both' },
];

export const REASON = Object.fromEntries(
    REASONS.map((reason) => [reason.id, reason]),
);

export const REASONS_IN = REASONS.filter((reason) => reason.dir !== 'out');
export const REASONS_OUT = REASONS.filter((reason) => reason.dir !== 'in');

/**
 * Batch selection is always FEFO — nearest expiry first, expired and waste
 * batches skipped. FIFO and a pharmacist-approval step existed as a toggle
 * through V2; DEMO_INVENTORY_FIXES_PROMPT.md §5.1 retires both, so this is no
 * longer a setting the console edits.
 */
export const BATCH_PICK = { mode: 'fefo' };

/** Units stock is held in. */
export const STOCK_UNITS = ['g', 'kg', 'ml', 'l', 'unit'];
