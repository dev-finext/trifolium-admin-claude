// The supplier's Excel file — "ייצוא לאקסל ספק" (12.11.2026).
//
// A purchase order leaves the console two ways, by two buttons on the order:
//
//   "ייצוא לאקסל (פנימי)" — the pharmacy's own copy, every field the order
//   holds (config/buying.js `buyingSheet`, `BUYING_ORDER_HEAD`).
//
//   "ייצוא לאקסל ספק" — this file: what goes to the supplier, with only what
//   the supplier needs, in one exact shape. The shape is the sample Avichai sent
//   on 12.11.2026 ("הזמנת רכש לדוגמא לספק.xlsx", made from order 2600160 to
//   שיפון) with the words "זה חייב להיראות ככה". Every measurement below is that
//   file's own:
//
//     row 1    "הערה לספק" in A and the order's note for the supplier in B,
//              merged B1:J1 — Arial 14 bold, centred vertically, 29pt high.
//              Left out when the order has no note for the supplier, as the
//              internal file leaves it out.
//     row 2    the header — Arial 10, right-aligned, centred vertically, 21pt.
//     row 3…   one row per order line — Arial 11, right-aligned, centred
//              vertically, wrapped. The item code, the supplier's code when it
//              is a plain number, and the quantity are numbers in format "0".
//     columns  A–J at the sample's widths; H–J stay empty and the note spans
//              them, as there.
//     sheet    left to right, as the sample opens — Avichai confirmed it over
//              right to left on 12.11.2026.
//     default  the workbook's own font is Carlito 11 (Calibri's metric twin),
//              as in the sample, so its columns measure out the same wherever
//              it opens. Every cell with something in it names Arial.
//     names    the tab is "הזמנת רכש" and the order's number — the sample's
//              tab, "הזמנת שמנים", named that one order's contents — and the
//              file is הזמנת-רכש-<number>-לספק.xlsx (views/BuyingSheetView.vue).
//              The order's number is in both and nowhere in the cells, as in
//              the sample.
//
// The seven columns, and where each value comes from:
//
//   מק״ט          the item code — `line.sku`.
//   מק״ט ספק      what the order's supplier calls the item: its own catalogue
//                 number from the item card's "מק״ט אצל ספקים" (SAP's OSCN),
//                 else the card's single "מק״ט אצל הספק" when this supplier is
//                 the item's preferred one, else empty
//                 (config/items.js `supplierCatalogNum`). Read off the item card
//                 when the file is made — it is the supplier's reference for
//                 the item, not a figure of the moment the line was written.
//   שם הפריט      `line.name` — SAP's ItemName.
//   שם לועזי      `line.foreignName` — SAP's FrgnName.
//   יחידת רכש     the line's purchase unit, in Hebrew whatever the screen's
//                 language (the stock unit when the card names no purchase unit).
//   כמות          `line.qty`, in purchase units. A fraction keeps its decimals:
//                 format "0" would show 2.5 as 3, and 278 order lines of the
//                 last two years were fractional.
//   הערות לפריט   `line.supplierNote` — the note written for the supplier on the
//                 order line.
//
// Nothing else reaches the supplier: no price — the quote price is in the
// internal file only — no internal note, no stock figures, no other supplier's
// codes.
//
// Row heights. The sample sized each line row to its text by hand: 71pt for a
// row of three lines, 55pt for two — 23pt and 16pt a line. A line row here is
// sized the same way, with the number of lines worked out from the text, Arial's
// own glyph widths and the width of its column, so a long name opens fully shown
// and with the sample's room around it. The measure was checked against Excel's
// own drawing of the sample and of order 2600160 (12.11.2026); the 23pt over the
// lines leaves room for a line more than estimated, so a near miss costs space
// and never hides part of a name.
//
// One departure, where the sample had nothing to show: "מק״ט ספק" shrinks to fit
// its column rather than wrapping. The sample's column is empty and narrow, and
// a real code wrapped in it breaks mid-word (22046/500M, then L on a line of its
// own) — a code the supplier would misread. Shrinking keeps the column, the
// line and the code whole; a code that fits is drawn at full size.

/** The file's fonts. The first is the workbook's default, as in the sample. */
export const SUPPLIER_SHEET_FONTS = [
    { name: 'Carlito', size: 11 },
    { name: 'Arial', size: 14, bold: true },
    { name: 'Arial', size: 10 },
    { name: 'Arial', size: 11 },
];

/** The cell formats, by name — each the sample's own but the last two. */
const STYLE = {
    note: 1,
    head: 2,
    text: 3,
    number: 4,
    remark: 5,
    code: 6,
    codeNumber: 7,
};

/**
 * The cell formats, in `STYLE` order; the first is the default cell. The note
 * row wraps where the sample's does not: a note that fits one line looks the
 * same either way, and a longer one is shown rather than cut at the merge.
 */
export const SUPPLIER_SHEET_STYLES = [
    { font: 0 },
    { font: 1, vertical: 'center', wrap: true },
    { font: 2, horizontal: 'right', vertical: 'center' },
    { font: 3, horizontal: 'right', vertical: 'center', wrap: true },
    {
        font: 3,
        horizontal: 'right',
        vertical: 'center',
        wrap: true,
        numFmt: '0',
    },
    { font: 3, vertical: 'center', wrap: true },
    // "מק״ט ספק": shrunk to fit rather than wrapped — see the header.
    { font: 3, horizontal: 'right', vertical: 'center', shrink: true },
    {
        font: 3,
        horizontal: 'right',
        vertical: 'center',
        shrink: true,
        numFmt: '0',
    },
];

/** The header row, as the sample words it. */
export const SUPPLIER_SHEET_HEAD = [
    'מק״ט',
    'מק״ט ספק',
    'שם הפריט',
    'שם לועזי',
    'יחידת רכש',
    'כמות',
    'הערות לפריט',
];

/** The label beside the note for the supplier, in A1. */
export const SUPPLIER_SHEET_NOTE = 'הערה לספק';

/** Column widths A–J, in Excel's character units — the sample's own. */
export const SUPPLIER_SHEET_WIDTHS = [
    14.38, 11.25, 14.25, 13, 8.13, 8.5, 12.75, 8.38, 8.38, 8.38,
];

/** The page margins, in inches — the sample's own. */
const MARGINS = {
    left: 0.7,
    right: 0.7,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
};

/** Row heights, in points: the note row, the header, a line row's two parts. */
const HEIGHT = {
    note: 29,
    noteLine: 18,
    head: 21,
    lineBase: 23,
    linePerLine: 16,
};

// ---- how many lines a cell's text takes -------------------------------------

/**
 * Arial's advance widths, in thousandths of an em — the Latin it meets and the
 * Hebrew alphabet, measured off Windows' own arial.ttf.
 */
const ARIAL = {
    א: 563,
    ב: 542,
    ג: 399,
    ד: 508,
    ה: 602,
    ו: 247,
    ז: 382,
    ח: 599,
    ט: 590,
    י: 247,
    ך: 509,
    כ: 461,
    ל: 463,
    ם: 599,
    מ: 601,
    ן: 247,
    נ: 353,
    ס: 574,
    ע: 529,
    ף: 566,
    פ: 546,
    ץ: 461,
    צ: 479,
    ק: 550,
    ר: 509,
    ש: 694,
    ת: 643,
    '״': 417,
    '׳': 236,
    '—': 1000,
    '–': 556,
    ' ': 278,
    '!': 278,
    '"': 355,
    '#': 556,
    $: 556,
    '%': 889,
    '&': 667,
    "'": 191,
    '(': 333,
    ')': 333,
    '*': 389,
    '+': 584,
    ',': 278,
    '-': 333,
    '.': 278,
    '/': 278,
    ':': 278,
    ';': 278,
    '?': 556,
    '@': 1015,
    '[': 278,
    ']': 278,
    _: 556,
    A: 667,
    B: 667,
    C: 722,
    D: 722,
    E: 667,
    F: 611,
    G: 778,
    H: 722,
    I: 278,
    J: 500,
    K: 667,
    L: 556,
    M: 833,
    N: 722,
    O: 778,
    P: 667,
    Q: 778,
    R: 722,
    S: 667,
    T: 611,
    U: 722,
    V: 667,
    W: 944,
    X: 667,
    Y: 667,
    Z: 611,
    a: 556,
    b: 556,
    c: 500,
    d: 556,
    e: 556,
    f: 278,
    g: 556,
    h: 556,
    i: 222,
    j: 222,
    k: 500,
    l: 222,
    m: 833,
    n: 556,
    o: 556,
    p: 556,
    q: 556,
    r: 333,
    s: 500,
    t: 278,
    u: 556,
    v: 500,
    w: 722,
    x: 500,
    y: 500,
    z: 500,
};

/** One character's width, in ems — generous where it is not known exactly. */
function charEm(ch) {
    if (ch in ARIAL) {
        return ARIAL[ch] / 1000;
    }

    if (/\d/.test(ch)) {
        return 0.556;
    }

    return 0.64;
}

const textEm = (text) => [...text].reduce((sum, ch) => sum + charEm(ch), 0);

/** Pixels an em takes at a font size in points, on a 96-dpi screen. */
const emPx = (points) => (points * 96) / 72;

/**
 * The width a cell's text may take, in pixels: the column's width in the
 * default font's digit (Calibri's — 7px), less the cell's own margin.
 */
const usablePx = (chars) => chars * 7 + 0.5 - 2;

/**
 * How many lines a text takes in a cell of this width. Words break at spaces
 * and a line break is kept; a word wider than the cell runs onto the next line,
 * as Excel breaks it.
 */
export function wrappedLines(text, widthChars, points = 11) {
    const room = usablePx(widthChars) / emPx(points);
    let lines = 0;

    for (const paragraph of String(text ?? '').split('\n')) {
        let used = 0;

        lines += 1;

        for (const word of paragraph.split(' ').filter(Boolean)) {
            const width = textEm(word);
            const space = used > 0 ? textEm(' ') : 0;

            if (used > 0 && used + space + width <= room) {
                used += space + width;
                continue;
            }

            if (used > 0) {
                lines += 1;
            }

            // A word wider than the cell spills over whole lines of its own.
            const spill = Math.max(0, Math.ceil(width / room) - 1);

            lines += spill;
            used = width - spill * room;
        }
    }

    return Math.max(1, lines);
}

// ---- the values -------------------------------------------------------------

/**
 * A code as the sample writes it: a plain number when it is one — no leading
 * zero, nothing but digits, short enough to stay exact — so Excel shows it as
 * the sample shows 150043, without a "number stored as text" mark; otherwise
 * the text itself (22046/500ML, 053410202800).
 */
function codeCell(value) {
    const text = String(value ?? '').trim();

    if (!text) {
        return { v: null, s: STYLE.text };
    }

    return /^[1-9]\d{0,14}$/.test(text)
        ? { v: Number(text), s: STYLE.number }
        : { v: text, s: STYLE.text };
}

/** The supplier's code, the same way, shrunk to fit rather than wrapped. */
function supplierCodeCell(value) {
    const cell = codeCell(value);

    return {
        ...cell,
        s: cell.s === STYLE.number ? STYLE.codeNumber : STYLE.code,
    };
}

/** The quantity: a whole number in format "0", a fraction with its decimals. */
function qtyCell(value) {
    const qty = Number(value);

    if (value === null || value === undefined || value === '') {
        return { v: null, s: STYLE.number };
    }

    if (!Number.isFinite(qty)) {
        return { v: null, s: STYLE.number };
    }

    return Number.isInteger(qty)
        ? { v: qty, s: STYLE.number }
        : { v: qty, s: STYLE.text };
}

const textOf = (value) => {
    const text = String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .trim();

    return text || null;
};

/**
 * The supplier's file for one purchase order, as a sheet for
 * lib/xlsx.js `buildStyledXlsx`.
 *
 * @param {object} order  the order (stores/buying.js), kind 'order'
 * @param {object} fmt
 * @param {(uom: string) => string} fmt.unit  a unit code → its Hebrew label
 * @param {(line: object) => string|null} fmt.catalogNum  the order supplier's
 *   catalogue number for the line's item (config/items.js `supplierCatalogNum`)
 * @returns {object}
 */
export function supplierSheet(order, fmt = {}) {
    const unit = fmt.unit || ((uom) => uom || '');
    const catalogNum = fmt.catalogNum || (() => null);
    const width = (index) => SUPPLIER_SHEET_WIDTHS[index];
    const rows = [];
    const merges = [];

    const note = textOf(order?.supplierNote);

    if (note) {
        // The note spans B to J and wraps when it is longer than that. Bold
        // Arial runs about five per cent wider than the regular widths above.
        const span = SUPPLIER_SHEET_WIDTHS.slice(1).reduce((a, b) => a + b, 0);
        const lines = wrappedLines(note, span, 14 * 1.05);

        rows.push({
            height: HEIGHT.note + (lines - 1) * HEIGHT.noteLine,
            cells: [
                { v: SUPPLIER_SHEET_NOTE, s: STYLE.note },
                { v: note, s: STYLE.note },
                ...SUPPLIER_SHEET_WIDTHS.slice(2).map(() => ({
                    v: null,
                    s: STYLE.note,
                })),
            ],
        });
        merges.push(`B${rows.length}:J${rows.length}`);
    }

    rows.push({
        height: HEIGHT.head,
        cells: SUPPLIER_SHEET_HEAD.map((label) => ({
            v: label,
            s: STYLE.head,
        })),
    });

    for (const line of order?.lines || []) {
        const cells = [
            codeCell(line.sku),
            supplierCodeCell(catalogNum(line)),
            { v: textOf(line.name), s: STYLE.text },
            { v: textOf(line.foreignName), s: STYLE.text },
            { v: textOf(unit(line.purchaseUom || line.uom)), s: STYLE.text },
            qtyCell(line.qty),
            { v: textOf(line.supplierNote), s: STYLE.remark },
        ];
        // The supplier's code never wraps — it shrinks — so it is one line.
        const lines = Math.max(
            ...cells.map((cell, index) =>
                cell.v === null || index === 1
                    ? 1
                    : wrappedLines(String(cell.v), width(index)),
            ),
        );

        rows.push({
            height: HEIGHT.lineBase + HEIGHT.linePerLine * lines,
            cells,
        });
    }

    return {
        name: `הזמנת רכש ${order?.number || ''}`.trim(),
        rightToLeft: false,
        fonts: SUPPLIER_SHEET_FONTS,
        styles: SUPPLIER_SHEET_STYLES,
        cols: SUPPLIER_SHEET_WIDTHS,
        rows,
        merges,
        margins: MARGINS,
    };
}
