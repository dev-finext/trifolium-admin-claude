// רכש — the sheets already on the buyer's desk.
//
// A screen with nothing in it does not show what it is for, so the two sheet
// tabs open onto work already under way: requests being put together, orders
// already sent to a supplier, and one of each still being typed.
//
// The documents are the pharmacy's own, out of the SAP backup: the numbers, the
// dates, the supplier, the item codes and the quantities are what was really
// requested and really ordered, which is why the line counts are uneven and the
// contents are not a tidy sample — a one-line order for envelopes sits next to
// a sixty-seven-line quarterly herb order, because that is the shape of the
// work. Numbering continues the same SAP series, so a sheet written on the
// screen takes the next number rather than starting a second series beside it.
//
// Three things here are the fixture's and not SAP's.
//
// The working notes are rewritten: the real ones name the staff and the
// suppliers' contacts by first name, and this build is published. They are kept
// in the register the real ones use, because that register is the point —
// "emailed on the 5th", "waiting on a quote".
//
// Which lines carry a quantity and which are ticked off is set here, so that
// one request is visibly half-done rather than every sheet looking finished.
//
// And the state each order sits in. SAP holds two — open and closed — where the
// console holds four, and the two it does not hold are exactly the ones that
// matter on screen: an order still being drafted, and one that fell through. So
// each order is placed by hand, and the placement is in `ORDER_PLAN` where it
// can be read.
//
// An order that arrives here already received was received in SAP, not in this
// console: its lines carry what came in, and `receipts` is empty because no
// goods-receipt document was ever posted here. That is what a migrated document
// looks like, and the drawer says so.
import { ARCHIVE_FIELD, leadTimeOf, lineFromItem } from '@/config';
import { at } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_PURCHASE_ORDERS from '@/demo/real/purchaseOrders.json';
import REAL_PURCHASE_REQUESTS from '@/demo/real/purchaseRequests.json';
import { daysSince } from '@/lib/dates';

/**
 * Which documents are brought over, and what was written on them.
 *
 * `hold` is how many of the sheet's last lines are still blank — the buyer got
 * that far and stopped. `ticked` is how many of the first lines are ticked off
 * on a request's checklist.
 */
const REQUEST_PLAN = [
    {
        docNum: 2600007,
        by: DEMO_ACTORS.orit,
        hour: 9,
        note: 'בהכנה — צריך לבדוק כמויות בפועל',
        hold: 1,
        ticked: 1,
    },
    {
        docNum: 2600004,
        by: DEMO_ACTORS.ella,
        hour: 11,
        note: 'נשלח לאלה לבדיקת מחירים 21.01',
        ticked: 3,
    },
    {
        docNum: 2600003,
        by: DEMO_ACTORS.orit,
        hour: 14,
        note: 'הועבר לאורית — ממתינים להצעת מחיר',
        ticked: 6,
    },
    {
        docNum: 2600001,
        by: DEMO_ACTORS.ella,
        hour: 8,
        note: 'רשימת חידוש לרבעון — מוכן',
        ticked: 30,
    },
];

const ORDER_PLAN = [
    {
        docNum: 2600160,
        by: DEMO_ACTORS.ella,
        hour: 9,
        state: 'draft',
        note: 'ממתינים לאישור כמויות מהמחסן לפני השליחה',
    },
    {
        docNum: 2600163,
        by: DEMO_ACTORS.orit,
        hour: 10,
        state: 'sent',
        note: 'נשלח מייל לספק 5.8',
    },
    {
        docNum: 2600157,
        by: DEMO_ACTORS.ella,
        hour: 8,
        state: 'sent',
        note: 'הזמנת צמחים רבעונית — נשלח 30.7',
    },
    {
        docNum: 2600158,
        by: DEMO_ACTORS.orit,
        hour: 13,
        state: 'failed',
        note: 'הספק הודיע שאינו יכול לספק — מחפשים חלופה',
    },
    {
        docNum: 2600161,
        by: DEMO_ACTORS.orit,
        hour: 12,
        state: 'received',
        // Not everything the order asked for turned up, which is the case the
        // receipt screen exists for; the last line came in short.
        shortLast: 0.75,
        note: 'נשלח מייל 5.8 — הגיע, שורה אחת בכמות חלקית',
    },
    {
        docNum: 2600155,
        by: DEMO_ACTORS.orit,
        hour: 15,
        state: 'received',
        note: 'נשלח מייל 30.7 — סופק במלואו',
    },
];

/** A request has SAP's own two states; an order's is placed in the plan. */
const stateOf = (doc, plan, kind) =>
    kind === 'order' ? plan.state : doc.status === 'C' ? 'closed' : 'open';

/** Round to three places, the way every quantity in the console is held. */
const qty3 = (value) => Math.round(Number(value) * 1000) / 1000;

/**
 * Every sheet carries the item card of every line it names.
 *
 * The three figures the item record does not hold on its own are resolved the
 * same way the screen resolves them: the supplier's name behind its SAP code,
 * the group's name behind its number, and the lead time, which is the
 * preparation type's for something made here and the supplier's for something
 * bought.
 */
function snapshotOf(item, context) {
    const supplier = context.supplierByCode.get(item.suppliers?.sapCode);
    const stock = context.stockBySku.get(item.sku);
    const lead = leadTimeOf(item, {
        supplier,
        prepType: context.prepTypeById.get((item.prepTypes || [])[0]),
        madeHere: context.madeHere.has(item.sku),
    });

    return lineFromItem(item, {
        supplier: supplier?.name ?? null,
        groupName: context.groupByCode.get(item.group) ?? null,
        onHand: stock ? stock.onHand : item.onHand,
        committed: stock ? stock.alloc : item.committed,
        onOrder: item.onOrder,
        leadDays: lead?.days ?? null,
    });
}

/** One real document, as a sheet. */
function sheetOf(doc, plan, kind, context) {
    const lines = [];

    (doc.lines || []).forEach((line, index) => {
        const item = context.itemBySku.get(String(line.code));

        if (!item) {
            return;
        }

        const row = snapshotOf(item, context);
        const blank =
            plan.hold !== undefined && index >= doc.lines.length - plan.hold;

        row.qty = blank ? null : Number(line.qty) || null;
        row.done = kind === 'request' && index < (plan.ticked ?? 0);
        lines.push(row);
    });

    const when = at(daysSince(doc.docDate), plan.hour, 0);
    const state = stateOf(doc, plan, kind);

    // What came in. Everything the order asked for, unless the plan says one
    // line arrived short.
    if (state === 'received') {
        lines.forEach((row, index) => {
            const short = plan.shortLast && index === lines.length - 1;

            row.received = qty3((row.qty || 0) * (short ? plan.shortLast : 1));
        });
    }

    return {
        id: `${kind}-${doc.docNum}`,
        number: String(doc.docNum),
        kind,
        supplierCode: kind === 'order' ? doc.supplierCode || null : null,
        supplier:
            kind === 'order' && doc.supplier
                ? { he: doc.supplier, en: doc.supplier }
                : null,
        note: plan.note,
        lines,
        state,
        created: when,
        sent: ['sent', 'received'].includes(state) ? when : null,
        received: state === 'received' ? when : null,
        // Received in SAP, before this console existed: there is no
        // goods-receipt document of its own to point at.
        receipts: [],
        by: plan.by,
        [ARCHIVE_FIELD]: null,
    };
}

/**
 * The sheets the buyer already has.
 *
 * @param {object} parts items, suppliers, item groups, preparation types, the
 *   stock rows and the bills of materials: everything the item card is joined
 *   out of, so that a line says exactly what the card says.
 */
export function buildBuyingLists({
    items,
    suppliers,
    itemGroups,
    prepTypes,
    stock,
    boms,
}) {
    const context = {
        itemBySku: new Map(items.map((item) => [String(item.sku), item])),
        supplierByCode: new Map(suppliers.map((one) => [one.code, one])),
        groupByCode: new Map(itemGroups.map((one) => [one.code, one.name])),
        prepTypeById: new Map(prepTypes.map((one) => [one.id, one])),
        stockBySku: new Map(stock.map((row) => [row.sku, row])),
        madeHere: new Set(boms.map((bom) => bom.parentSku)),
    };

    const byNumber = (docs) => new Map(docs.map((doc) => [doc.docNum, doc]));

    const requests = byNumber(REAL_PURCHASE_REQUESTS);
    const orders = byNumber(REAL_PURCHASE_ORDERS);

    // Unordered on purpose: these go into the database and come back in its
    // order, so the screen is what sorts them — see `listsOf` in the store.
    return [
        ...REQUEST_PLAN.filter((plan) => requests.has(plan.docNum)).map(
            (plan) =>
                sheetOf(requests.get(plan.docNum), plan, 'request', context),
        ),
        ...ORDER_PLAN.filter((plan) => orders.has(plan.docNum)).map((plan) =>
            sheetOf(orders.get(plan.docNum), plan, 'order', context),
        ),
    ];
}
