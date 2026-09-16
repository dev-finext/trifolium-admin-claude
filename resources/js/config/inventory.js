// Inventory: warehouses, batch lifecycle, stock movements, adjustments.
// Display text lives in the locale catalogs under `inventory.*`.

/**
 * The warehouses, as `OWHS` holds them. Seven are defined and three hold
 * anything: `01` carries the pharmacy (2,428 items), `02` seven items and `05`
 * one. The lab, the materials room, the herb room and the counter were opened
 * and never used — they are here because SAP has them and a migration carries
 * them, and they read as empty because they are.
 */
export const WAREHOUSES = [
    { id: '01', inUse: true },
    { id: '02', inUse: true },
    { id: '5', inUse: true },
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
];

/** The default a receipt, an issue or a new stock row lands in. */
export const DEFAULT_WAREHOUSE = '01';

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

/** Batch states and their chip tone. */
export const BATCH_STATES = {
    active: { tone: 'green' },
    expiring: { tone: 'amber' },
    expired: { tone: 'red' },
    depleted: { tone: 'gray' },
    rejected: { tone: 'red' },
};

export const BATCH_STATE_IDS = Object.keys(BATCH_STATES);

/** A batch is flagged `expiring` inside this many days of its expiry date. */
export const BATCH_EXPIRY_WARN_DAYS = 90;

/**
 * Kinds of stock movement written to the ledger, and the chip tone each is shown
 * in. The first four are the receipt-and-compounding cycle; production adds a
 * consumption and an output pair, waste its own entry and the monthly merge, and
 * the two counting kinds close the loop for items nobody weighs per order.
 */
export const STOCK_MOVES = [
    { id: 'goods_in', tone: 'green' },
    { id: 'allocated_to_compounding', tone: 'blue' },
    { id: 'released_on_cancel', tone: 'gray' },
    { id: 'adjustment', tone: 'amber' },
    { id: 'production_out', tone: 'purple' },
    { id: 'production_in', tone: 'teal' },
    { id: 'waste_in', tone: 'red' },
    { id: 'waste_merge', tone: 'gray' },
    { id: 'time_consumption', tone: 'blue' },
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
 * One adjustment action, three reasons. A count adjustment *sets* the quantity to
 * what was physically found; damage and rejection *deduct* a quantity from a
 * named batch.
 */
export const ADJUST_REASONS = [
    { id: 'count', mode: 'set' },
    { id: 'damage', mode: 'deduct' },
    { id: 'reject', mode: 'deduct' },
];

export const ADJUST_REASON = Object.fromEntries(
    ADJUST_REASONS.map((reason) => [reason.id, reason]),
);

/**
 * Batch selection for compounding is automatic, nearest expiry first — FEFO,
 * first expired, first out. The pharmacist approves the pick before stock is
 * deducted and may override it in the lab. Since V2 the mode is a setting the
 * console edits (inventorySettings.pickMode); this is the default.
 */
export const BATCH_PICK = { mode: 'fefo', requiresPharmacistApproval: true };

/** Units stock is held in. */
export const STOCK_UNITS = ['g', 'kg', 'ml', 'l', 'unit'];
