// רכש — בקשת רכש והזמנת רכש.
//
// Two working documents that are almost the same document, which is why they
// are one record with a `kind`:
//
//   request  a shopping list. It does nothing on its own — it is what the buyer
//            wants, written down, before anybody has been asked for a price.
//            Quantities are optional, and each line is ticked off as it is
//            sourced. Ticked lines move to purchase orders, one per supplier;
//            a line that moved stays on the request, read-only, marked with
//            the order it went to, and when every line has moved the request
//            is "בוצע" on its own (12.11.2026).
//   order    one supplier, and quantities that are not optional. It is sent to
//            the supplier, its goods are booked in against it — each delivery
//            on its own document, a delivery note or a tax invoice — and it is
//            closed only once every line has a price (see `awaiting_invoice`).
//
// A request posts nothing. An order posts stock through its goods receipts
// (`receiveList` in stores/buying.js → `receiveGoods` in stores/inventory.js),
// and its tax invoices are recorded on the supplier (stores/purchasing.js).
//
// **For production:** the states and moves below are the whole lifecycle; the
// server must enforce the same transitions, never only the screen.

/**
 * What each kind goes through.
 *
 * A request:
 *   open    being worked: lines added, quantities written, lines ticked as
 *           they are sourced, ticked lines moved to orders.
 *   done    "בוצע" — every line moved to an order. Set automatically by the
 *           move that moves the last line (`convertToOrders`); never by hand,
 *           and nothing moves it on.
 *   closed  "סגורה" — finished by hand ("סיום הבקשה"), whatever is left on it
 *           not ordered. Reopened by hand.
 *
 * An order:
 *   draft             being written. Supplier, lines and quantities are open.
 *   sent              "נשלחה" — marked sent by hand. The lines are fixed (what
 *                     was asked of the supplier); goods are booked in against
 *                     it, in as many deliveries as it takes.
 *   awaiting_invoice  "ממתין לחשבונית מס" — every line has arrived (or the rest
 *                     was closed), but at least one delivery came on a delivery
 *                     note, which carries no prices, and no tax invoice has
 *                     been attached to it yet. Set automatically, by the
 *                     receipt that completes the order and by closing the rest.
 *   received          "התקבלה" — closed: every line arrived and every line has
 *                     its price. An order whose goods came on a tax invoice
 *                     goes here straight from `sent`; one waiting for an
 *                     invoice goes here when the invoice is attached
 *                     (`settleInvoiced`).
 *   failed            set by hand and by nothing else — the supplier declined,
 *                     could not supply, or the order was dropped.
 */
export const BUYING_STATES = {
    request: [
        { id: 'open', tone: 'blue' },
        { id: 'done', tone: 'green' },
        { id: 'closed', tone: 'slate' },
    ],
    order: [
        { id: 'draft', tone: 'slate' },
        { id: 'sent', tone: 'amber' },
        { id: 'awaiting_invoice', tone: 'purple' },
        { id: 'received', tone: 'green' },
        { id: 'failed', tone: 'red' },
    ],
};

export const BUYING_STATE_IDS = [
    ...new Set(
        Object.values(BUYING_STATES).flatMap((states) =>
            states.map((state) => state.id),
        ),
    ),
];

/** One state's chip tone, whichever kind it belongs to. */
export const buyingStateTone = (id) =>
    Object.values(BUYING_STATES)
        .flat()
        .find((state) => state.id === id)?.tone || 'gray';

/** Where a sheet of this kind starts. */
export const buyingFirstState = (kind) =>
    (BUYING_STATES[kind] || BUYING_STATES.request)[0].id;

/**
 * The rail a sheet travels, in order. An order's `failed` is off it — a dead
 * end, shown beside the rail rather than on it.
 *
 * A request ends one of two ways — every line moved to an order ("בוצע"), or
 * finished by hand ("סגורה") — and its rail shows the way it took, or the way
 * it is heading while it is open.
 *
 * An order's rail shows "ממתין לחשבונית מס" only when the order has a delivery
 * that came on a delivery note — an order received on a tax invoice never
 * waits for one, and a rail that shows the step would say it did.
 */
export function buyingRailOf(list, { hasNotes = false } = {}) {
    if (list?.kind !== 'order') {
        return list?.state === 'closed' ? ['open', 'closed'] : ['open', 'done'];
    }

    return hasNotes || list.state === 'awaiting_invoice'
        ? ['draft', 'sent', 'awaiting_invoice', 'received']
        : ['draft', 'sent', 'received'];
}

/**
 * The states a person may move this sheet to by hand.
 *
 * A draft is marked sent by hand, once it has a supplier and full quantities
 * — exporting a copy of the sheet is a separate, always-available action and
 * does not itself send anything (see `markExported`). From `sent` the only
 * hand-set outcome is `failed`; `received` is never one of them — the goods
 * are booked in through the real receiving flow (`receiveList`), the one
 * place stock actually rises, and nothing short of that may claim they
 * arrived. An order part of which arrived reaches `received` by closing the
 * rest (`closeRemainder`), which claims nothing more arrived. A `failed`
 * order can be marked sent again — the same send, retried, to the same
 * supplier or another one.
 */
export function buyingMoves(list) {
    if (!list) {
        return [];
    }

    if (list.kind !== 'order') {
        // A request that is "בוצע" is a record of what was ordered from it.
        return (
            { open: ['closed'], closed: ['open'], done: [] }[list.state] || []
        );
    }

    // "ממתין לחשבונית מס" ends only by an invoice being attached — never by hand.
    return (
        {
            draft: ['sent'],
            sent: ['failed'],
            awaiting_invoice: [],
            received: [],
            failed: ['sent'],
        }[list.state] || []
    );
}

/**
 * Has this request line moved to a purchase order? A moved line stays on the
 * request, read-only, with the order it went to (`movedTo: {id, number}`) —
 * an order this console wrote has an `id` to open; one SAP wrote before it
 * carries only its `number`.
 */
export const lineMoved = (line) => Boolean(line?.movedTo);

/** Every line of a request has moved to an order — the request is "בוצע". */
export const allLinesMoved = (list) =>
    (list?.lines || []).length > 0 && list.lines.every(lineMoved);

/**
 * May the quote price ("הצעת מחיר") on this order line still be written?
 *
 * The supplier's price for this order, written beside the last purchase price
 * so the buyer sees both. It is open while the order is a draft, after it is
 * sent (a supplier often confirms prices only once he has the order) and if it
 * failed — until goods arrive for that line: from then on the price that counts
 * is the one on the tax invoice. It opens the price field of an invoice
 * receipt and of an invoice attached later. It is in the internal Excel export
 * ("ייצוא לאקסל (פנימי)", `BUYING_ORDER_HEAD`) and **never** in the file that
 * goes to the supplier ("ייצוא לאקסל ספק", config/supplierSheet.js) — 12.11.2026.
 */
export const quoteEditable = (list, line) =>
    list?.kind === 'order' &&
    ['draft', 'sent', 'failed'].includes(list.state) &&
    !(Number(line?.received) > 0);

/**
 * Can goods be booked in against this sheet? Only one that was sent — and it
 * stays sent, and receivable, until everything on it has arrived or the rest
 * is closed (`isFullyReceived`, the store's `closeRemainder`).
 */
export const canReceive = (list) =>
    list?.kind === 'order' && list.state === 'sent';

/** What is still to come on one line, in the purchase unit. */
export const lineOutstanding = (line) =>
    Math.max(0, (Number(line?.qty) || 0) - (Number(line?.received) || 0));

/** Has every line of an order arrived in full? */
export const isFullyReceived = (list) =>
    (list?.lines || []).length > 0 &&
    list.lines.every((line) => lineOutstanding(line) <= 0);

/** Has anything at all arrived against this order yet? */
export const hasReceipts = (list) =>
    (list?.lines || []).some((line) => Number(line.received) > 0);

/**
 * What the sheet list may be narrowed by, beside its search, its opening-date
 * range and its state tabs (12.11.2026): the supplier. An order has one; a
 * request names one on each line, so a request is found by any supplier one of
 * its lines carries. A line or an order with none is `none`.
 */
export const BUYING_FILTER_FIELDS = [
    {
        key: 'bsup',
        group: 'who',
        kind: 'set',
        values: (list) =>
            list.kind === 'order'
                ? [list.supplierCode || 'none']
                : [
                      ...new Set(
                          (list.lines || []).map(
                              (line) => line.supplierCode || 'none',
                          ),
                      ),
                  ],
    },
];

export const BUYING_FILTER_GROUPS = ['who'];

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
    return parsePaste(text).map((entry) => entry.code);
}

/** A token that reads as a quantity rather than an item code. */
const QTY_TOKEN = /^\d{1,5}(\.\d+)?$/;

/**
 * Codes and quantities out of a pasted block.
 *
 * The buyer pastes two columns out of Excel — a code and a quantity — or a line
 * out of an email, `100002 5, 110005 2.5`. A number that comes straight after a
 * code is that code's quantity; anything else is another code, so a block of
 * bare codes reads exactly as it always did. A quantity is at most five digits
 * with an optional decimal part, and is never itself a code on the catalogue
 * (`isSku`) — item codes are six digits, so `100002 110005` stays two codes.
 * A decimal comma, `2,5`, is a decimal point; a comma anywhere else separates.
 *
 * A code pasted twice is one entry, its quantities added together, in the
 * position it first appeared.
 *
 * @param {string} text
 * @param {(code: string) => boolean} [isSku]
 * @returns {Array<{code: string, qty: number|null}>}
 */
export function parsePaste(text, isSku = () => false) {
    const out = [];
    const at = new Map();
    let last = null;

    const add = (code) => {
        if (at.has(code)) {
            last = at.get(code);

            return;
        }

        last = { code, qty: null };
        at.set(code, last);
        out.push(last);
    };

    for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.replace(
            /(^|[^\d])(\d{1,5}),(\d{1,3})(?!\d)/g,
            '$1$2.$3',
        );
        const parts = line.includes('\t')
            ? line.split('\t').flatMap((part) => part.split(/[\s,;|]+/))
            : line.split(/[\s,;|]+/);

        last = null;

        for (const token of parts.map((part) => part.trim()).filter(Boolean)) {
            if (last && QTY_TOKEN.test(token) && !isSku(token)) {
                last.qty =
                    Math.round(((last.qty || 0) + Number(token)) * 1000) / 1000;
                last = null;
                continue;
            }

            add(token);
        }
    }

    return out;
}

/**
 * What arrived against a line, set against what was ordered — negative when
 * the supplier sent less, positive when more, zero when it matched, `null`
 * while nothing has been booked in. An order's quantities are fixed once it is
 * sent (the store refuses edits after that), so the gap stays what it was for
 * the rest of the order's life, closed or not.
 */
export const lineGap = (line) =>
    line?.received === null || line?.received === undefined
        ? null
        : Math.round(
              ((Number(line.received) || 0) - (Number(line.qty) || 0)) * 1000,
          ) / 1000;

/** Is the sheet's list of lines still open to change? */
export const linesEditable = (list) =>
    Boolean(list) &&
    (list.kind === 'order'
        ? ['draft', 'failed'].includes(list.state)
        : list.state === 'open');

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
        // The card's preferred supplier — the one its name is shown for — and
        // SAP's code only when the card names none, so a line never shows one
        // supplier and goes to another's order.
        supplierCode: orNull(
            item.suppliers?.preferred || item.suppliers?.sapCode,
        ),
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
        // An order line: the supplier's price for this order ("הצעת מחיר"),
        // per purchase unit, before VAT — see `quoteEditable`.
        quotePrice: null,
        // An order line: a note for the supplier about this one line (12.11.2026)
        // — "רק כצמח - לא אבקה", "מכסה רחב". It is the "הערות לפריט" column of
        // the supplier's Excel file (config/supplierSheet.js), as SAP's free
        // text on a purchase order line was. Written while the order's lines
        // are (`linesEditable`): a draft, or a failed order going out again;
        // once sent it is part of what was sent. A request has none.
        supplierNote: null,
        // A request line: the order it moved to — see `lineMoved`.
        movedTo: null,
        // what actually turned up, once the goods are booked in
        received: null,
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
 * A request's sourced lines, split the way turning them into orders will
 * split them — one group per supplier, read off the line itself rather than
 * asked for again, because it was already captured when the line was added.
 * A line with no supplier captured on it goes in its own group, last, with
 * `supplierName: null` — it becomes an order with no supplier either, the
 * same as any other new order.
 *
 * Read both by the confirmation dialog, so what the buyer is shown is
 * exactly what happens, and by the split itself.
 *
 * @param {object} list
 * @param {(code: string) => unknown} nameOf  A supplier's code to its name.
 */
export function groupDoneLines(list, nameOf) {
    // A line that already moved stays ticked on the request as a record, and
    // never moves twice.
    const ready = (list?.lines || []).filter(
        (line) => line.done && !lineMoved(line),
    );
    const groups = new Map();

    for (const line of ready) {
        const code = line.supplierCode || '';

        if (!groups.has(code)) {
            groups.set(code, []);
        }

        groups.get(code).push(line);
    }

    return [...groups.entries()]
        .sort(([a], [b]) => {
            if (a === b) {
                return 0;
            }

            return a === '' ? 1 : b === '' ? -1 : 0;
        })
        .map(([supplierCode, lines]) => ({
            supplierCode,
            supplierName: supplierCode ? nameOf(supplierCode) : null,
            lines,
        }));
}

/**
 * The columns a sheet exports, in order. Hebrew headers: this file is read by
 * a person. For an order it is the pharmacy's own copy — "ייצוא לאקסל
 * (פנימי)"; the file that goes to the supplier is a different one, in the shape
 * the supplier gets (config/supplierSheet.js, 12.11.2026).
 *
 * The same columns for both kinds, because the same decision is made on both.
 * Only the checklist is the request's alone, and the order's own two columns
 * (`BUYING_ORDER_HEAD`) the order's.
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

/**
 * An order's own columns in the internal export, after the item card's
 * (12.11.2026).
 *
 * An order is exported two ways. "ייצוא לאקסל (פנימי)" is this file, and it
 * carries every field the order holds — in Avichai's words, "הפנימי מביא לנו את
 * כל השדות" — so an order adds what only an order has: the price quoted for
 * this order, and the note written for the supplier about the line. "ייצוא
 * לאקסל ספק" is the file that goes to the supplier, in the shape of the sample
 * Avichai sent, with only what the supplier needs (config/supplierSheet.js). A
 * request goes to nobody, and its file is as it was.
 */
export const BUYING_ORDER_HEAD = ['הצעת מחיר', 'הערות לפריט'];

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
    const order = list?.kind === 'order';
    // An order something arrived on carries what arrived and the gap, the
    // same two figures its screen shows, for as long as the order exists.
    const arrived = order && hasReceipts(list);
    const head = [
        ...BUYING_SHEET_HEAD,
        ...(order ? BUYING_ORDER_HEAD : []),
        ...(checklist ? ['בוצע'] : []),
        ...(arrived ? ['התקבל', 'פער'] : []),
    ];

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

        if (order) {
            // The note stays text even when it is all digits.
            const note = String(line.supplierNote || '').trim();

            row.push(cell(line.quotePrice), note || null);
        }

        if (checklist) {
            row.push(line.done ? 'בוצע' : null);
        }

        if (arrived) {
            row.push(cell(line.received), cell(lineGap(line)));
        }

        return row;
    });

    // An order's two notes head the file, above the table: the one written for
    // the supplier, then the pharmacy's own working note (12.11.2026 — the
    // internal file carries every field the order holds). The working note
    // goes no further than this file: the supplier's file carries only the
    // note written for it. A request's file carries neither, as before.
    const supplierNote = String(list?.supplierNote || '').trim();
    const internalNote = String(list?.note || '').trim();
    const notes = order
        ? [
              ...(supplierNote ? [['הערה לספק', supplierNote]] : []),
              ...(internalNote ? [['הערה פנימית', internalNote]] : []),
          ]
        : [];
    const top = notes.length ? [...notes, []] : [];

    return [...top, head, ...body];
}
