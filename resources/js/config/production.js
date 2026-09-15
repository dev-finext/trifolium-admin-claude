// Production: the orders that turn a bill of materials into a batch of the
// parent item — an in-house tincture, a ground powder, a run of shelf bottles.
// Display text lives in the locale catalogs under `production.*`.
//
// Shelf products are made ahead of time and sold from the finished-goods
// batch; a sale never consumes components. Components leave stock only when a
// production order completes, and they leave from the batches the order was
// issued against.

/** Production-order states and their chip tone. */
export const PRODUCTION_STATES = [
    { id: 'planned', tone: 'blue' },
    { id: 'issued', tone: 'amber' },
    { id: 'completed', tone: 'green' },
    { id: 'cancelled', tone: 'gray' },
];

export const PRODUCTION_STATE = Object.fromEntries(
    PRODUCTION_STATES.map((state) => [state.id, state]),
);

export const PRODUCTION_STATE_IDS = PRODUCTION_STATES.map((state) => state.id);

/** States an order can still be edited, issued, completed or cancelled in. */
export const PRODUCTION_OPEN_STATE_IDS = ['planned', 'issued'];

/** The document series a production order is numbered under. */
export const PRODUCTION_SERIES = 'PR-';

/**
 * The stock movements a production order writes: components out of their
 * batches, the output into a new `P-` batch, and what came out as waste into a
 * `W-` batch. All three are STOCK_MOVE_IDS.
 */
export const PRODUCTION_MOVE_KINDS = {
    consume: 'production_out',
    output: 'production_in',
    waste: 'waste_in',
};

/**
 * Shelf life of a batch PRODUCED of an item, in months: the item's own figure
 * first, then the recipe's preparation type, then the family default from the
 * batch settings. Purchased batches keep the supplier's expiry and never come
 * through here.
 */
export function resolveExpiryMonths({ item, prepType, settings }) {
    if (item?.expiryMonths) {
        return item.expiryMonths;
    }

    if (prepType?.expiryMonths) {
        return prepType.expiryMonths;
    }

    return settings?.defaultExpiryMonths?.[item?.family] ?? null;
}

/** What the production-order list may be narrowed by. */
export const PRODUCTION_FILTER_FIELDS = [
    {
        key: 'rstate',
        group: 'state',
        kind: 'set',
        prefix: 'production.state',
        values: (row) => [row.state],
    },
    {
        // A preparation type is a record, not a config id — the screen labels
        // the option from the type's own name.
        key: 'rprep',
        group: 'what',
        kind: 'set',
        values: (row) => (row.prepType ? [row.prepType] : []),
    },
    {
        key: 'ritem',
        group: 'what',
        kind: 'set',
        values: (row) => [row.parentSku],
    },
    {
        key: 'rby',
        group: 'who',
        kind: 'set',
        values: (row) => [row.by?.he || row.by],
    },
    {
        key: 'rwaste',
        group: 'state',
        kind: 'set',
        prefix: 'production.filter.wasteState',
        values: (row) => [row.wasteQty > 0 ? 'yes' : 'no'],
    },
    { key: 'rqty', group: 'size', kind: 'num', value: (row) => row.plannedQty },
];

export const PRODUCTION_FILTER_GROUPS = ['state', 'what', 'who', 'size'];
