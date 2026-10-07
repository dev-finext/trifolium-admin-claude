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

/** Where each kind's numbering starts, on SAP's own year-prefixed series. */
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

/**
 * A line, from the item it names.
 *
 * The values are copied onto the line rather than looked up when the sheet is
 * read. A list written in March and exported in May must say what the shelf
 * held in March, or the buyer is reading a different document from the one they
 * wrote. The item card is one click away for whatever is current.
 */
export function lineFromItem(row) {
    return {
        sku: row.sku,
        name: row.names?.he || row.sku,
        uom: row.uom?.stock || 'unit',
        available: row.avail ?? row.onHand ?? 0,
        onOrder: row.onOrder ?? 0,
        min: row.levels?.min ?? null,
        // The Hebrew side, flattened here rather than at export: the sheet is
        // a Hebrew file, and a `{ he, en }` object reaches a cell as [object
        // Object].
        supplier: row.preferred?.name?.he || row.preferred?.name || null,
        supplierCode: row.suppliers?.sapCode || null,
        catalogNum: row.suppliers?.catalogNum || null,
        lastPrice: row.price?.lastPurchase ?? null,
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

/** The columns a sheet exports, in order. Hebrew headers: this file is read. */
export const BUYING_SHEET_HEAD = {
    request: [
        'מק״ט',
        'שם הפריט',
        'יחידה',
        'זמין',
        'בהזמנה',
        'מינימום',
        'ספק',
        'מק״ט ספק',
        'מחיר אחרון',
        'כמות',
        'בוצע',
    ],
    order: [
        'מק״ט',
        'שם הפריט',
        'יחידה',
        'מק״ט ספק',
        'זמין',
        'בהזמנה',
        'מחיר אחרון',
        'כמות',
    ],
};

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
 * `unitLabel` translates the stored unit code — the file says ק״ג, not kg,
 * because it is read by a person and sent to a supplier.
 */
export function buyingSheet(list, unitLabel = (uom) => uom) {
    const head = BUYING_SHEET_HEAD[list.kind] || BUYING_SHEET_HEAD.request;
    const body = (list.lines || []).map((line) =>
        list.kind === 'order'
            ? [
                  cell(line.sku),
                  cell(line.name),
                  cell(unitLabel(line.uom)),
                  cell(line.catalogNum),
                  cell(line.available),
                  cell(line.onOrder),
                  cell(line.lastPrice),
                  cell(line.qty),
              ]
            : [
                  cell(line.sku),
                  cell(line.name),
                  cell(unitLabel(line.uom)),
                  cell(line.available),
                  cell(line.onOrder),
                  cell(line.min),
                  cell(line.supplier),
                  cell(line.catalogNum),
                  cell(line.lastPrice),
                  cell(line.qty),
                  line.done ? 'בוצע' : null,
              ],
    );

    return [head, ...body];
}
