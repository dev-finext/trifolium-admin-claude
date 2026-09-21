// V3 — תכנון מלאי ורכש. The rules behind the planning report that replaces the
// external Excel the pharmacy keeps today.
//
// Where every rule here comes from:
//
//   * The client's note "ניתוח רכש - אקסל חיצוני בשילוב דוח מהסאפ 14.09.26".
//   * The workbook that note attaches, "קובץ אקסל שע״פ מתנהלים כיום.xls" —
//     fifteen sheets: one raw SAP export (`01.08.25-09.09.26`) and the working
//     sheets the team hand-sorts it into.
//   * The pharmacy's own saved SAP query, `OUQR` 0654 — "דו״ח ירון ניתוח מלאי -
//     ללא בחירת קבוצה - ללא ספירת מלאי" — which is what produced that export.
//
// Display text lives in the locale catalogs under `planning.*`.

/**
 * What counts as consumption.
 *
 * Read off the pharmacy's own query rather than invented: every movement out of
 * stock except the ones below, plus the goods-issue lines a production order
 * raised. The note gives the reason in the buyer's own words — an item counted
 * down by two kilos would otherwise read as 2.2 kg of demand a year when the
 * real demand is 200 grams.
 *
 * The extract (`scripts/extract-sap/extract.py`, `CONSUMPTION_SKIP`) applies the
 * same list to the ten years of `OINM` behind the fixture, so what the report
 * adds up here and what SAP would add up there are the same number.
 */
export const CONSUMPTION_EXCLUDED_SAP_TYPES = [
    { sap: 10000071, id: 'count' },
    { sap: 19, id: 'creditMemo' },
    { sap: 21, id: 'goodsReturn' },
    { sap: 60, id: 'goodsIssue' },
    { sap: 67, id: 'transfer' },
];

/**
 * Which of the console's own stock movements count as consumption.
 *
 * The same rule stated against this system rather than against SAP: a run that
 * drew components counts, a sale counts, an adjustment or a count or a transfer
 * never does. A waste write-off is not demand either — it says a batch spoiled,
 * not that a customer wanted it.
 */
export const CONSUMPTION_MOVE_KINDS = [
    'allocated_to_compounding',
    'production_out',
    'sold',
];

/**
 * How many months of history the report can reach back over. The fixture
 * carries twenty-four so "the same period last year" has something to compare
 * against; the pharmacy's own Excel works on fourteen.
 */
export const PLANNING_HISTORY_MONTHS = 24;

/** The window the report opens on, unless the buyer picks another. */
export const PLANNING_DEFAULT_MONTHS = 14;

/**
 * Months of stock below which a row is flagged.
 *
 * Three is the pharmacy's own default, stated in the note. The note also asks
 * for it to be settable per item group later — "אם נחליט בהמשך של אריזות אנחנו
 * רוצים התראה של חצי שנה" — so the threshold is read through `coverThreshold`,
 * which takes a group override when one is set.
 */
export const COVER_ALERT_MONTHS = 3;

/** Under a third of the threshold the row is not low, it is out. */
export const COVER_CRITICAL_FRACTION = 1 / 3;

/** The threshold for one item group, falling back to the house default. */
export function coverThreshold(group, overrides = {}) {
    const set = overrides?.[group];

    return Number.isFinite(Number(set)) && Number(set) > 0
        ? Number(set)
        : COVER_ALERT_MONTHS;
}

/**
 * How much stock the pharmacy really has to plan against.
 *
 * On hand, plus what is already on its way, less what is promised to an order
 * that has not shipped. Taken from the workbook, where the same arithmetic is
 * in the `חודשי מלאי` column of every sheet: bottle 400100 reads 784 on hand,
 * 630 on order, 45 committed and 367.21 a month, and the sheet says 3.728 —
 * which is (784 + 630 − 45) ÷ 367.21 and nothing else.
 */
export function planningAvailable(row) {
    return (
        (Number(row?.onHand) || 0) +
        (Number(row?.onOrder) || 0) -
        (Number(row?.committed) || 0)
    );
}

/**
 * Months of stock: what is available divided by what goes out in a month.
 *
 * `null` when nothing was consumed in the window — an item with no demand has
 * no cover to speak of, and showing it as infinite cover would put it at the
 * safe end of a sort it does not belong in.
 */
export function monthsOfCover(available, monthly) {
    const rate = Number(monthly) || 0;

    return rate > 0 ? available / rate : null;
}

/** Where a row's cover puts it: out, low, or comfortable. */
export function coverState(cover, threshold = COVER_ALERT_MONTHS) {
    if (cover === null || cover === undefined) {
        return 'noDemand';
    }

    if (cover < threshold * COVER_CRITICAL_FRACTION) {
        return 'critical';
    }

    return cover < threshold ? 'low' : 'ok';
}

export const COVER_STATES = {
    critical: { tone: 'red' },
    low: { tone: 'amber' },
    ok: { tone: 'green' },
    noDemand: { tone: 'gray' },
};

export const COVER_STATE_IDS = ['critical', 'low', 'ok', 'noDemand'];

/**
 * The two places a planned quantity can go.
 *
 * The note left the choice of one column or two to us — "אולי כדאי להפריד ל2
 * עמודות אחת לרכש ואחת ליצור לשיקולך". Two, because an item can be both bought
 * and made: a herb is bought, a tincture is made, and a ground formula is both
 * depending on the week. One column would have to guess which, and a guess in
 * the column the whole screen exists for is the wrong place to guess.
 */
export const PLAN_TARGET_IDS = ['purchase', 'production'];

/**
 * Which target an item can be planned into.
 *
 * Production when the item has a bill of materials — that is what makes a run
 * possible at all. Purchase when the item card is flagged for purchasing
 * (`OITM.PrchseItem`). Most items answer to one; some answer to both.
 */
export function planTargetsFor(item, hasBom) {
    const out = [];

    if (item?.flags?.purchase) {
        out.push('purchase');
    }

    if (hasBom) {
        out.push('production');
    }

    return out;
}

/**
 * Where a planned line stands.
 *
 * `planned` is a number typed into the report and nothing more. `requested` is
 * a line on a purchase request sent to a supplier, or a production
 * recommendation sitting with the lab — asked for, not agreed. `ordered` is a
 * purchase order the supplier confirmed, or a production order the lab opened;
 * only then does the quantity count as on its way.
 *
 * The note asks for the row to leave "נדרש/תכנון מלאי" and appear under
 * "הוזמן" once the email goes out, and separately insists the request is not an
 * order until the supplier approves. Those two cannot both be true, so the
 * middle state is kept and shown as its own column; see the open questions in
 * `dev/progress.js`.
 */
export const PLAN_LINE_STATES = [
    { id: 'planned', tone: 'gray' },
    { id: 'requested', tone: 'blue' },
    { id: 'ordered', tone: 'green' },
    { id: 'cancelled', tone: 'gray' },
];

export const PLAN_LINE_STATE_IDS = PLAN_LINE_STATES.map((state) => state.id);

export const PLAN_LINE_STATE = Object.fromEntries(
    PLAN_LINE_STATES.map((state) => [state.id, state]),
);

/** Purchase-request states, as `OPRQ.DocStatus` keeps them: open or closed. */
export const PURCHASE_REQUEST_STATES = [
    { id: 'draft', tone: 'gray' },
    { id: 'sent', tone: 'blue' },
    { id: 'ordered', tone: 'green' },
    { id: 'cancelled', tone: 'gray' },
];

export const PURCHASE_REQUEST_STATE_IDS = PURCHASE_REQUEST_STATES.map(
    (state) => state.id,
);

export const PURCHASE_REQUEST_STATE = Object.fromEntries(
    PURCHASE_REQUEST_STATES.map((state) => [state.id, state]),
);

/**
 * Purchase requests carry their own numbering, as SAP's do: the live database
 * numbers them 2600000 upward on the same series as the inventory documents.
 */
export const PURCHASE_REQUEST_SERIES = 2600000;

/** What the planning report may be narrowed by. */
export const PLANNING_FILTER_FIELDS = [
    {
        key: 'kcover',
        group: 'state',
        kind: 'set',
        prefix: 'planning.coverState',
        values: (row) => [row.coverState],
    },
    {
        key: 'kplan',
        group: 'state',
        kind: 'set',
        prefix: 'planning.lineState',
        values: (row) => [row.planState || 'none'],
    },
    {
        key: 'kgroup',
        group: 'what',
        kind: 'set',
        values: (row) => [row.group],
    },
    {
        key: 'ksup',
        group: 'who',
        kind: 'set',
        values: (row) => [row.supplierCode || 'none'],
    },
    {
        key: 'kmonths',
        group: 'size',
        kind: 'num',
        value: (row) => (row.cover === null ? 999 : row.cover),
    },
    {
        key: 'kmonthly',
        group: 'size',
        kind: 'num',
        value: (row) => row.monthly,
    },
    {
        key: 'konhand',
        group: 'size',
        kind: 'num',
        value: (row) => row.onHand,
    },
];

export const PLANNING_FILTER_GROUPS = ['state', 'what', 'who', 'size'];

/**
 * How a report row is grouped with its relations.
 *
 * The note asks for a "מכנה משותף" so a shelf product lands next to its labels,
 * its intermediate, its jar and its cap rather than scattered across a list of
 * two thousand. The bill of materials already says exactly that, and the
 * pharmacy's own workbook does it by hand — in the `מוצרי מדף` sheet only the
 * parent row carries a title and its children follow underneath it.
 *
 * `none` leaves the list flat and sortable, which is what a buyer working one
 * supplier at a time wants.
 */
export const PLANNING_GROUPING_IDS = ['none', 'tree'];
