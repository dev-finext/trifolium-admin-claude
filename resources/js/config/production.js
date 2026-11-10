// Production: the orders that turn a bill of materials into a batch of the
// parent item — an in-house tincture, a ground powder, a run of shelf bottles.
// Display text lives in the locale catalogs under `production.*`.
//
// Shelf products are made ahead of time and sold from the finished-goods
// batch; a sale never consumes components. Components leave stock only when a
// production order completes, and they leave from the batches the order was
// issued against.

/**
 * Production-order states and their chip tone.
 *
 * There is no "planned" state: an order is opened to be made, and goes to the
 * lab — its components reserved — the moment it is written ("להוריד מתוכננת,
 * כולם יהיו רגילות"). SAP's own history agrees: 149 released orders against 2
 * planned ones.
 */
export const PRODUCTION_STATES = [
    { id: 'issued', tone: 'amber' },
    { id: 'completed', tone: 'green' },
    { id: 'cancelled', tone: 'gray' },
];

export const PRODUCTION_STATE = Object.fromEntries(
    PRODUCTION_STATES.map((state) => [state.id, state]),
);

export const PRODUCTION_STATE_IDS = PRODUCTION_STATES.map((state) => state.id);

/** States an order can still be received into stock or cancelled in. */
export const PRODUCTION_OPEN_STATE_IDS = ['issued'];

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

/**
 * תאריך יעד — how many days after it is opened a production order is due back
 * from the lab, by the preparation it makes.
 *
 * The internal-production note: "לכל תצורה ישנה הגדרה של ׳תאריך יעד׳ לדוגמא:
 * טינקטורה זה 21 ימי מיצוי". It is not the preparation type's lead time: that
 * one says how long a personal preparation for a customer takes (a tincture
 * mixed from stock, three days), this one how long making the batch itself
 * takes (three weeks of maceration). The person opening the order may move the
 * date — "כאן אנחנו רוצים לקחת בחשבון שיקולים שלנו כמו עומס במעבדה" — so this is
 * where the date starts, not where it must stay.
 *
 * SAP is no guide here: 161 of its 180 orders carry the opening date plus 42
 * days, one default for every preparation. A type with no figure of its own
 * gives no date rather than a borrowed one; setting the figure by item group is
 * the note's second phase.
 */
export function productionDueDays(prepType) {
    const days = Number(prepType?.productionDays);

    return Number.isFinite(days) && days > 0 ? days : null;
}

/**
 * How much of an order has come back into stock so far, in the order's own
 * unit — the sum of its receipts. An order may be received in parts and stays
 * open until the last one ("קליטה חלקית למלאי ... ושאר ההוראה נשארת פתוחה").
 */
export function receivedQty(order) {
    return (order?.receipts || []).reduce(
        (sum, receipt) => sum + (Number(receipt.qty) || 0),
        0,
    );
}

/** Whether an order still open is past its target date. */
export function isOverdue(order, todayIso) {
    return (
        PRODUCTION_OPEN_STATE_IDS.includes(order?.state) &&
        Boolean(order?.dueOn) &&
        order.dueOn < todayIso
    );
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
