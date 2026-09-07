// Inventory: warehouses, batch lifecycle, stock movements, adjustments.
// Display text lives in the locale catalogs under `inventory.*`.

/** The two stock locations. Raw herbs are compounded; shelf goods are sold as-is. */
export const WAREHOUSES = [{ id: 'raw' }, { id: 'shelf' }];

export const WAREHOUSE_IDS = WAREHOUSES.map((warehouse) => warehouse.id);

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

/** Kinds of stock movement written to the ledger. */
export const STOCK_MOVE_IDS = [
    'goods_in',
    'allocated_to_compounding',
    'released_on_cancel',
    'adjustment',
];

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
