// רכש — בקשת רכש והזמנת רכש.
//
// Two working documents that are almost the same document, which is why they
// are one record with a `kind`:
//
//   request  a shopping list. It does nothing on its own — it is what the buyer
//            wants, written down, before anybody has been asked for a price.
//            Quantities are optional, and each line is ticked off as it is
//            sourced.
//   order    one supplier, and quantities that are not optional, because the
//            result is a file that gets sent to that supplier.
//
// Neither posts stock, reserves anything or changes an item. They are lists
// that end in a spreadsheet. The pharmacy's real purchase documents live in
// SAP; these are the tools used to decide what goes into them.

/** The two kinds, and what each one requires. */
export const BUYING_KINDS = [
    { id: 'request', supplier: false, qtyRequired: false, checklist: true },
    { id: 'order', supplier: true, qtyRequired: true, checklist: false },
];

export const BUYING_KIND = Object.fromEntries(
    BUYING_KINDS.map((kind) => [kind.id, kind]),
);

export const BUYING_KIND_IDS = BUYING_KINDS.map((kind) => kind.id);

/**
 * Where each kind's numbering starts, on SAP's own year-prefixed series.
 *
 * The seeded sheets carry the real document numbers they were read from, so a
 * sheet written on the screen takes the next number in the same series the
 * pharmacy is already using rather than starting a second one beside it.
 */
export const BUYING_SERIES = { request: 2600000, order: 2600000 };

/**
 * The codes out of a pasted block.
 *
 * The brief says "separated by a space". In practice a buyer pastes a column
 * out of Excel, which arrives as newlines, or a line out of an email, which
 * arrives with commas — so every ordinary separator is accepted and the rule
 * stays "paste it, press search". Order is kept and repeats are dropped, so
 * pasting the same list twice does not double the sheet.
 */
export function parseSkus(text) {
    const seen = new Set();
    const out = [];

    for (const token of String(text || '').split(/[\s,;|]+/)) {
        const code = token.trim();

        if (code && !seen.has(code)) {
            seen.add(code);
            out.push(code);
        }
    }

    return out;
}

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const orNull = (value) =>
    value === undefined || value === '' ? null : (value ?? null);

/**
 * A line, from the item it names.
 *
 * The line carries the item card, not a pointer to it: the buyer decides from
 * this row and should not have to open eleven cards to do it. Everything SAP
 * holds about buying this item is here — who it comes from and under which
 * catalogue number, what a purchase unit contains, what it last cost, what is
 * on the shelf and committed out of it, the levels it is replenished against,
 * and how long it takes to arrive.
 *
 * The values are copied onto the line rather than looked up when the sheet is
 * read. A list written in March and exported in May must say what the shelf
 * held in March, or the buyer is reading a different document from the one they
 * wrote. The item card is one click away for whatever is current.
 *
 * `extra` is what the caller resolved and the item record does not hold on its
 * own — the supplier's name behind its code, the item group's name behind its
 * number, the live stock figures, and the lead time, which is the supplier's or
 * the preparation type's before it is the item's.
 */
export function lineFromItem(item, extra = {}) {
    const onHand = number(extra.onHand ?? item.onHand);
    const committed = number(extra.committed ?? item.committed);

    return {
        // identity — the card's general tab
        sku: item.sku || item.code,
        name: item.names?.he || item.sku || item.code,
        foreignName: orNull(item.names?.en),
        group: orNull(extra.groupName),
        state: item.frozen
            ? 'frozen'
            : item.active === false
              ? 'inactive'
              : 'active',

        // where it comes from — the card's purchasing tab
        // The Hebrew side, flattened here rather than at export: the sheet is
        // a Hebrew file, and a `{ he, en }` object reaches a cell as [object
        // Object].
        supplier: orNull(extra.supplier?.he ?? extra.supplier),
        supplierCode: orNull(item.suppliers?.sapCode),
        catalogNum: orNull(item.suppliers?.catalogNum),
        purchaseUom: orNull(item.uom?.purchase),
        numInBuy: item.uom?.numInBuy ?? 1,
        packUom: orNull(item.uom?.packUom),
        packQty: item.uom?.packQty ?? null,
        lastPrice: item.price?.lastPurchase ?? null,
        lastPriceOn: orNull(item.price?.lastPurchaseOn),
        evalPrice: item.price?.evalPrice ?? null,

        // what is on the shelf — the card's inventory tab
        uom: item.uom?.stock || 'unit',
        onHand,
        committed,
        available: onHand - committed,
        onOrder: number(extra.onOrder ?? item.onOrder),
        min: item.levels?.min ?? null,
        max: item.levels?.max ?? null,
        reorder: item.levels?.reorder ?? null,

        // how it is replenished — the card's planning tab
        minOrder: item.levels?.minOrder ?? null,
        leadDays: extra.leadDays ?? item.levels?.leadTime ?? null,
        procurement: item.planning?.procurement || 'B',

        // what the buyer writes on the sheet
        qty: null,
        done: false,
    };
}

/** Is this sheet ready to leave — everything a supplier needs, filled in? */
export function missingQty(list) {
    if (!BUYING_KIND[list?.kind]?.qtyRequired) {
        return [];
    }

    return (list.lines || []).filter((line) => !(Number(line.qty) > 0));
}

/**
 * The columns a sheet exports, in order. Hebrew headers: this file is read by
 * a person and, for an order, sent to a supplier.
 *
 * The same columns for both kinds, because the same decision is made on both.
 * Only the checklist is the request's alone.
 */
export const BUYING_SHEET_HEAD = [
    'מק״ט',
    'שם הפריט',
    'שם לועזי',
    'קבוצת פריט',
    'מצב הפריט',
    'ספק מועדף',
    'קוד ספק',
    'מק״ט אצל הספק',
    'יחידת רכש',
    'יחידות מלאי ביחידת רכש',
    'יחידת אריזה',
    'כמות באריזה',
    'מחיר אחרון',
    'נרכש לאחרונה',
    'מחיר הערכה',
    'יחידת מלאי',
    'במלאי',
    'מוקצה',
    'זמין',
    'בהזמנה',
    'מלאי מינימום',
    'מלאי מקסימום',
    'כמות לחידוש',
    'הזמנה מינימלית',
    'זמן אספקה (ימים)',
    'שיטת רכש',
    'כמות',
];

/** Text that is a clean number becomes one, so Excel can sum the column. */
const cell = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value);

    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
};

/**
 * The sheet: the header row, then one row per line.
 *
 * `fmt` translates the codes the line stores — the unit is written ק״ג and not
 * `kg`, the procurement method קנייה and not `B`, the date 29.07.2026 and not
 * `2026-07-29` — because the file is read by a person, and reads the same way
 * the screen it was exported from did. The codes stay in the record so the
 * locale can still be switched.
 */
export function buyingSheet(list, fmt = {}) {
    const unit = fmt.unit || ((uom) => uom);
    const state = fmt.state || ((id) => id);
    const procurement = fmt.procurement || ((id) => id);
    const date = fmt.date || ((iso) => iso);
    const checklist = Boolean(BUYING_KIND[list?.kind]?.checklist);
    const head = checklist
        ? [...BUYING_SHEET_HEAD, 'בוצע']
        : [...BUYING_SHEET_HEAD];

    const body = (list.lines || []).map((line) => {
        const row = [
            cell(line.sku),
            cell(line.name),
            cell(line.foreignName),
            cell(line.group),
            cell(state(line.state)),
            cell(line.supplier),
            cell(line.supplierCode),
            cell(line.catalogNum),
            cell(unit(line.purchaseUom || line.uom)),
            cell(line.numInBuy),
            cell(line.packUom),
            cell(line.packQty),
            cell(line.lastPrice),
            cell(line.lastPriceOn ? date(line.lastPriceOn) : null),
            cell(line.evalPrice),
            cell(unit(line.uom)),
            cell(line.onHand),
            cell(line.committed),
            cell(line.available),
            cell(line.onOrder),
            cell(line.min),
            cell(line.max),
            cell(line.reorder),
            cell(line.minOrder),
            cell(line.leadDays),
            cell(procurement(line.procurement)),
            cell(line.qty),
        ];

        if (checklist) {
            row.push(line.done ? 'בוצע' : null);
        }

        return row;
    });

    return [head, ...body];
}
