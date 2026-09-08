// The order book: the 50 orders read out of SAP, with their compounded items,
// their audit trail and their exception flags.
//
// Every order here is a real `ORDR` document — its number, its date, its state,
// its money, its delivery and its lines. One order is one formula, and the
// formula's herbs are that document's `RDR1` lines, at the quantities the
// pharmacy actually weighed. The sample covers all eight states.
//
// Four things on an order are the console's own, because SAP does not hold
// them, and each says so where it is built: the tax document (Green Invoice,
// a separate system), the lab's four hands, the urgency mark, and the street
// address behind the real city.
//
// Two rules from the business drive most of what looks arbitrary here:
//
//   1. A credit order reaches the lab unpaid. No tax document and no allocation
//      number exist until its collection link is paid, and the amount sits in
//      the practitioner's open debt until then.
//   2. A failed issue attempt leaves no document and no allocation number —
//      only the provider's request id, so an agent can chase it.
import {
    COURIER,
    COURIER_BY_CODE,
    CREDIT,
    EXCEPTION_THRESHOLDS,
    ORDER_FLOW,
    ORDER_STATUS_BY_CODE,
    PAY_LINK,
    PREPARATION_FORM,
    SETTINGS,
} from '@/config';
import { DOSE_TIMING_IDS, EVAPORATION_IDS } from '@/demo/catalog';
import { PICKUP_POINT_IDS } from '@/demo/deliveries';
import { at, chance, pickFrom, rareChance, spread } from '@/demo/fixture';
import {
    DEMO_ACTORS,
    ENTRY_LETTERS,
    PHARMACIST_ACTORS,
    SUPPORT_ACTORS,
} from '@/demo/people';
import REAL_ORDERS from '@/demo/real/orders.json';
import { daysSince } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * Item codes that are a charge, not a thing: SAP bills delivery and the
 * compounding fee as ordinary order lines in the 999xxx block.
 */
const FEE_CODE_PREFIX = '999';

const isFeeLine = (line) => String(line.code || '').startsWith(FEE_CODE_PREFIX);

/**
 * What an order line is, read off SAP's item numbering — the warehouse is
 * physically arranged by it, so it is the most reliable thing on the line.
 *
 *   10–29  what goes into the preparation: herbs, 1:1s, extracts, tinctures
 *   30, 4x what it is made and packed with: capsules, glycerin, jars, pads
 *   5x     finished goods off the shelf
 *   999xxx a charge — delivery, or the compounding fee
 */
const INGREDIENT_CODE = /^[12]\d/;
const MATERIAL_CODE = /^(30|4\d)/;

const isIngredientLine = (line) =>
    INGREDIENT_CODE.test(String(line.code || ''));
const isMaterialLine = (line) => MATERIAL_CODE.test(String(line.code || ''));

/** SAP's line units, as the console names them. */
const LINE_UNIT = { gr: 'g', ml: 'ml', unit: 'unit', kg: 'kg' };

const lineUnit = (line) => LINE_UNIT[line.unit] || 'unit';

/** VAT, as SAP's own `DocTotal`/`VatSum` pair implies it. */
const VAT_RATE = SETTINGS.vatRate;

/** Formulas the demo orders are compounded from. */
export const FORMULA_TEMPLATES = [
    {
        id: 'ft1',
        name: L('פורמולה להרגעה ושינה', 'Calm & sleep formula'),
        typeId: 'tincture',
        unit: 'ml',
        vol: 100,
        herbs: [
            'valerian',
            'passionflower',
            'lemonbalm',
            'lavender',
            'chamomile',
        ],
    },
    {
        id: 'ft2',
        name: L('תמיכה בחיסון — חורף', 'Immune support — winter'),
        typeId: 'capsule',
        unit: 'capsule',
        vol: 60,
        herbs: ['echinacea', 'astragalus', 'ginger', 'elder'],
    },
    {
        id: 'ft3',
        name: L('איזון הורמונלי — גיל המעבר', 'Hormonal balance — menopause'),
        typeId: 'tincture',
        unit: 'ml',
        vol: 100,
        herbs: ['vitex', 'sage', 'ashwagandha', 'motherwort'],
    },
    {
        id: 'ft4',
        name: L('תמיכה בעיכול ובכבד', 'Digestive & liver support'),
        typeId: 'powder',
        unit: 'g',
        vol: 120,
        herbs: ['milkthistle', 'dandelion', 'ginger', 'fennel'],
    },
    {
        id: 'ft5',
        name: L('גווי ז׳י טאנג — מותאמת', 'Gui Zhi Tang — adapted'),
        typeId: 'decoction',
        unit: 'ml',
        vol: 200,
        herbs: ['cinnamon', 'licorice', 'ginger', 'baishao'],
    },
    {
        id: 'ft6',
        name: L('אנרגיה וחוסן — אדפטוגנים', 'Energy & resilience — adaptogens'),
        typeId: 'tincture',
        unit: 'ml',
        vol: 50,
        herbs: ['ashwagandha', 'rhodiola', 'ginseng', 'schisandra'],
    },
    {
        id: 'ft7',
        name: L('קרם הרגעה לעור אטופי', 'Soothing cream for atopic skin'),
        typeId: 'cream',
        unit: 'g',
        vol: 100,
        herbs: ['calendula', 'chamomile', 'plantain'],
    },
    {
        id: 'ft8',
        name: L('חליטת נשימה ושיעור', 'Breathing & cough infusion'),
        typeId: 'tea',
        unit: 'g',
        vol: 150,
        herbs: ['thyme', 'mullein', 'licorice', 'elder'],
    },
];

const DELIVERY_STREETS = [
    L('ארלוזורוב', 'Arlozorov'),
    L('הרצל', 'Herzl'),
    L('ביאליק', 'Bialik'),
    L('ז׳בוטינסקי', 'Jabotinsky'),
    L('סוקולוב', 'Sokolov'),
];

/** Card three times over: the mix a pharmacy of this size actually collects. */
const PAY_METHODS = ['card', 'card', 'card', 'cash', 'transfer'];

/** Where a customer payment link stands, when the payer is the patient. */
const LINK_STATES = ['sent', 'viewed', 'sent'];

/** A pinned note on an order, with an @mention of another agent. */
export function buildOrderNote() {
    return {
        when: at(1, 12, 18),
        actor: L('שי כ׳', 'Shay C.'),
        text: L(
            'המטפל ביקש לעכב שליחה עד יום ראשון.',
            'The practitioner asked to hold the shipment until Sunday.',
        ),
        mention: L('@אבי', '@Avi'),
    };
}

/**
 * Which preparation form an order was compounded into.
 *
 * SAP does not name the form on the order — it names the dosage unit
 * (`U_DosageUnit`) and, in most cases, spells the form out in the order's own
 * title. Both are read here, the title first because it is the more specific of
 * the two. Nothing in this mapping changes the console's list of forms.
 */
const FORM_BY_WORD = [
    ['tincture', 'tincture'],
    ['tang', 'decoction'],
    ['טינקטורה', 'tincture'],
    ['תמיסה', 'tincture'],
    ['קפסול', 'capsule'],
    ['אבקה', 'powder'],
    ['חליטה', 'tea'],
    ['משחה', 'cream'],
    ['קרם', 'cream'],
    ["ג'ל", 'gel'],
    ['ג׳ל', 'gel'],
    ['שמן', 'infused_oil'],
];

const FORM_BY_DOSAGE_UNIT = {
    קפסולות: 'capsule',
    'מ"ל': 'tincture',
    גרם: 'powder',
};

const FORM_BY_LINE_UNIT = { ml: 'tincture', gr: 'powder', unit: 'capsule' };

function formOf(source, herbLines) {
    const title = String(source.orderType || '').toLowerCase();
    const word = FORM_BY_WORD.find(([needle]) => title.includes(needle));

    return (
        (word && word[1]) ||
        FORM_BY_DOSAGE_UNIT[source.dosageUnit] ||
        FORM_BY_LINE_UNIT[herbLines[0]?.unit] ||
        'tincture'
    );
}

/** The dose's own unit — capsules are counted, a powder is spooned. */
const DOSE_UNIT_BY_FORM = {
    capsule: 'capsule',
    powder: 'tsp',
    tea: 'tsp',
};

/** `U_Instructions` reads onto the console's four timings; `בחר` is unanswered. */
const TIMING_BY_INSTRUCTION = {
    'לפני ארוחה': 'before_meal',
    'עם הארוחה': 'with_meal',
    'אחרי ארוחה': 'after_meal',
    'על בטן ריקה': 'empty_stomach',
    'על בטן ריק': 'empty_stomach',
};

/** A tincture's evaporation, where the order's own title spells it out. */
const EVAPORATION_BY_WORD = [
    ['גליצרין ודבש', 'glycerin_honey'],
    ['דבש', 'glycerin_honey'],
    ['גליצרין', 'glycerin'],
    ['חרוב', 'carob'],
    ['מולסה', 'molasses'],
];

/** A number SAP stored as text, or null. */
function num(value) {
    const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));

    return Number.isFinite(n) && String(value ?? '').trim() !== '' ? n : null;
}

/** SAP writes `אין` and `-.-` where a field was answered with nothing. */
const EMPTY_ANSWERS = ['', 'אין', '-.-', '-,-', "'-'", 'בחר'];

function text(value) {
    const clean = String(value ?? '').trim();

    return clean && !EMPTY_ANSWERS.includes(clean) ? clean : null;
}

/**
 * One compounded formula, as SAP holds it: the order's title is its name, the
 * order's lines are its herbs at the weights that were dispensed, and the
 * content / units / size trio on the header is what came out the other end.
 *
 * The form (`typeId`) is the one field read rather than stored — see
 * `formOf`. The preparation-type list itself is untouched.
 */
function realFormula(source, herbLines, materialLines, slot) {
    const form = formOf(source, herbLines);
    const title = String(source.orderType || '');
    const evaporation = EVAPORATION_BY_WORD.find(([word]) =>
        title.includes(word),
    );
    const weighed = herbLines.reduce(
        (sum, line) => sum + (line.quantity || 0),
        0,
    );

    return {
        id: `F-${source.docEntry}`,
        name: text(title)
            ? L(title)
            : L('פורמולה מותאמת', 'Compounded formula'),
        typeId: form,
        unit: PREPARATION_FORM[form].unit,
        vol: num(source.contentSizeEach) ?? num(source.contentTotal) ?? 0,
        herbs: herbLines.map((line) => ({
            id: line.code,
            name: L(line.name),
            lat: null,
            cn: line.foreignName || null,
            qty: line.quantity,
            unit: lineUnit(line),
            pct: weighed
                ? Math.round((line.quantity / weighed) * 1000) / 10
                : 0,
        })),
        // What the preparation is packed and made up with — real lines on the
        // same document, kept apart from the formula so a jar is never 70% of
        // a patient's medicine.
        materials: materialLines.map((line) => ({
            id: line.code,
            name: L(line.name),
            qty: line.quantity,
            unit: lineUnit(line),
        })),
        dose: {
            qty: source.dosageQuantity || 1,
            unit: DOSE_UNIT_BY_FORM[form] || 'ml',
            times: source.dosePerDay || 1,
        },
        // Where SAP was left on its `בחר` placeholder the timing is the
        // fixture's, so the dosage line on the card is never half-written.
        timing:
            TIMING_BY_INSTRUCTION[String(source.instructions || '').trim()] ||
            pickFrom(`${slot}:timing`, DOSE_TIMING_IDS),
        evap:
            form === 'tincture'
                ? evaporation
                    ? evaporation[1]
                    : pickFrom(`${slot}:evap`, EVAPORATION_IDS)
                : null,
        packages: num(source.unitCount) || 1,
        concentration: text(source.concentration),
        patientInstructions: text(source.patientInstructions),
        internalNotes: text(source.internalNotes)
            ? L(text(source.internalNotes))
            : null,
        externalNotes: text(source.comments) ? L(text(source.comments)) : null,
    };
}

/**
 * Order items. There is no status on an order line in SAP, so a line carries
 * only whether it was cancelled out of the order.
 */
function buildItems(order) {
    const items = [];
    const inLab = ['lab', 'packed', 'sent', 'closed'].includes(order.status);

    [order.formula, order.formula2].filter(Boolean).forEach((formula, k) => {
        const slot = `${order.id}:item:${k}`;

        items.push({
            id: `${order.id}-F${k + 1}`,
            kind: 'formula',
            name: formula.name,
            typeId: formula.typeId,
            use: ['cream', 'gel'].includes(formula.typeId)
                ? 'external'
                : 'internal',
            vol: formula.vol,
            unit: formula.unit,
            herbs: formula.herbs,
            materials: formula.materials,
            dose: formula.dose,
            timing: formula.timing,
            evap: formula.evap,
            packages: formula.packages,
            concentration: formula.concentration,
            patientInstructions: formula.patientInstructions,
            internalNotes: formula.internalNotes,
            externalNotes: formula.externalNotes,
            cancelled: order.status === 'cancelled',
            pharm:
                inLab && chance(`${slot}:pharm`, 0.75)
                    ? {
                          by: pickFrom(`${slot}:pharmacist`, PHARMACIST_ACTORS),
                          when: at(
                              Math.max(0, order.daysAgo - 1),
                              11,
                              spread(`${slot}:pharm:mm`, 5, 55),
                          ),
                      }
                    : null,
        });
    });

    order.shelfLines.forEach((line, k) => {
        items.push({
            id: `${order.id}-S${k + 1}`,
            kind: 'shelf',
            sku: line.sku,
            name: line.name,
            size: line.size,
            unit: line.unit,
            qty: line.qty,
            price: line.price,
        });
    });

    return items;
}

/**
 * The order's audit trail, newest first. `valueType: 'status'` marks a row
 * whose from/to are order-status ids rather than free text, so the log renders
 * them through the same chip the order header uses.
 */
function buildAudit(order) {
    const rows = [
        {
            when: order.placed,
            actorKind: 'practitioner',
            actor: order.practitioner.name,
            act: L(
                'ההזמנה נוצרה באפליקציית המטפלים',
                'Order created in the practitioner app',
            ),
            det: L(
                `${order.type === 'formula' ? 'פורמולה מותאמת' : 'מוצרי מדף'} · מי משלם: ${order.payer === 'patient' ? 'הלקוח' : 'המטפל'}`,
                `${order.type === 'formula' ? 'Compounded formula' : 'Shelf products'} · paid by: ${order.payer === 'patient' ? 'the customer' : 'the practitioner'}`,
            ),
        },
        {
            when: order.placed,
            actorKind: 'system',
            actor: DEMO_ACTORS.system,
            act: L(
                'ההזמנה נרשמה במסד הנתונים',
                'Order written to the database',
            ),
            det: L(
                `${order.id} · הוקצה מלאי לפריטי ההזמנה${order.credit ? ' · מסלול הקפה — ללא תשלום' : ''}`,
                `${order.id} · stock allocated to the order items${order.credit ? ' · credit terms — unpaid' : ''}`,
            ),
        },
    ];

    if (order.payer === 'patient') {
        rows.push({
            when: order.placed,
            actorKind: 'system',
            actor: DEMO_ACTORS.system,
            act: L(
                'נשלח קישור תשלום ב-WhatsApp',
                'Payment link sent on WhatsApp',
            ),
            det: L(
                `אל ${order.patient.name.he} · ${order.patient.phone}`,
                `To ${order.patient.name.en} · ${order.patient.phone}`,
            ),
        });
    }

    const sequence = ORDER_FLOW;
    const reached = sequence.indexOf(order.status);

    sequence.slice(0, reached + 1).forEach((status, k) => {
        rows.push({
            when: at(Math.max(0, order.daysAgo - k - 1), 10 + k, 15),
            actorKind: k === 0 ? 'provider' : 'agent',
            actor:
                k === 0
                    ? 'GoCredit'
                    : pickFrom(`${order.id}:audit:${k}`, SUPPORT_ACTORS),
            act: L('שינוי סטטוס להזמנה', 'Order status changed'),
            det: L(
                'הסטטוס עודכן במסד הנתונים · הודעות נשלחו לפי הטריגרים',
                'Status written to the database · messages sent by the triggers',
            ),
            valueType: 'status',
            from: k === 0 ? 'new' : sequence[k - 1],
            to: status,
        });
    });

    if (order.docNum !== null) {
        rows.push({
            when: at(Math.max(0, order.daysAgo - 1), 10, 22),
            actorKind: 'system',
            actor: DEMO_ACTORS.system,
            act: L('הופקה חשבונית מס קבלה', 'Tax invoice/receipt issued'),
            det: L(
                `חשבונית מס קבלה ${order.docNum} · מספר הקצאה ${order.docAlloc} · Green Invoice`,
                `Tax invoice/receipt ${order.docNum} · allocation number ${order.docAlloc} · Green Invoice`,
            ),
        });
    }

    if (order.docStatus === 'failed') {
        rows.push({
            when: at(Math.max(0, order.daysAgo - 1), 10, 24),
            actorKind: 'system',
            actor: DEMO_ACTORS.system,
            act: L('הפקת מסמך נכשלה', 'Document issue failed'),
            det: L(
                'Green Invoice 422 — נדרשת הפקה חוזרת ממסך כספים',
                'Green Invoice 422 — needs to be reissued from the Finance screen',
            ),
            bad: true,
        });
    }

    if (order.status === 'cancelled') {
        rows.push({
            when: at(Math.max(0, order.daysAgo - 1), 14, 2),
            actorKind: 'agent',
            actor: DEMO_ACTORS.ronitSupport,
            act: L('ההזמנה בוטלה', 'Order cancelled'),
            det: L(
                'סיבה: בקשת המטפל · המלאי שהוקצה שוחרר',
                'Reason: the practitioner asked · allocated stock released',
            ),
            bad: true,
        });
    }

    return rows.reverse();
}

const DOC_NOTES = [
    L(
        'המטפל ביקש לעכב את השליחה עד יום ראשון. עודכן טלפונית.',
        'The practitioner asked to hold the shipment until Sunday. Updated by phone.',
    ),
    L(
        'הלקוח ביקש טעם פחות מרוכז — הועבר למעבדה לבדיקה.',
        'The customer asked for a less concentrated taste — passed to the lab to check.',
    ),
    L(
        'שיחה עם המטפל: אושרה החלפת צמח חסר בפורמולה.',
        'Call with the practitioner: approved substituting a herb that was out of stock.',
    ),
];

/** The automatic action log and the agents' manual entries, in one thread. */
function buildDocumentation(order, audit) {
    const rows = audit
        .slice()
        .reverse()
        .map((row, i) => ({
            id: `a${i}`,
            kind:
                row.actorKind === 'system' || row.actorKind === 'provider'
                    ? 'system'
                    : 'agent',
            when: row.when,
            actor: row.actor,
            act: row.act,
            det: row.det,
            valueType: row.valueType,
            from: row.from,
            to: row.to,
            bad: row.bad,
        }));

    rows.push({
        id: 'mn0',
        kind: 'manual',
        when: at(Math.max(0, order.daysAgo - 1), 12, 18),
        actor: DEMO_ACTORS.shaySupport,
        text: DOC_NOTES[order.daysAgo % DOC_NOTES.length],
    });

    if (order.daysAgo % 4 === 0) {
        rows.push({
            id: 'mn0f',
            kind: 'manual',
            when: at(Math.max(0, order.daysAgo - 1), 15, 2),
            actor: DEMO_ACTORS.ronitSupport,
            text: L(
                'תיקון: הבקשה הייתה לדחות ליום שני, לא ליום ראשון.',
                'Correction: the request was to push it to Monday, not Sunday.',
            ),
            fixOf: 'mn0',
        });
    }

    return rows;
}

/**
 * V2: who filled each lab role, as far as an order's status implies it. Marked
 * by hand in phase A, so an order on the bench has a picker and perhaps a
 * checker; a finished one has all four.
 */
function labRoles(status, slot, daysAgo) {
    const when = (hh) =>
        at(Math.max(0, daysAgo - 1), hh, spread(`${slot}:lab:${hh}`, 0, 59));
    const none = {
        picker: null,
        checker: null,
        pharmacist: null,
        packer: null,
    };

    if (status === 'lab') {
        return {
            ...none,
            picker: { by: DEMO_ACTORS.aviLab, when: when(9) },
            checker: chance(`${slot}:lab:checker`, 0.5)
                ? { by: DEMO_ACTORS.shaySupport, when: when(10) }
                : null,
        };
    }

    if (['packed', 'sent', 'closed'].includes(status)) {
        return {
            picker: { by: DEMO_ACTORS.aviLab, when: when(9) },
            checker: { by: DEMO_ACTORS.shaySupport, when: when(10) },
            pharmacist: {
                by: pickFrom(`${slot}:lab:pharm`, PHARMACIST_ACTORS),
                when: when(11),
            },
            packer: { by: DEMO_ACTORS.noaSupport, when: when(13) },
        };
    }

    return none;
}

const round2 = (value) => Math.round(value * 100) / 100;

const sumOf = (lines) =>
    round2(lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0));

/** `U_WhoPays` / `U_WhoGets`, both of which name the person, not a code. */
const paidBy = (source) =>
    String(source.whoPays || '').includes('מטופל') ? 'patient' : 'practitioner';

const collectedInPerson = (source) =>
    String(source.whoReceives || '').includes('איסוף עצמי');

/**
 * One `ORDR` document as an order record.
 *
 * The money is reconciled rather than copied: SAP holds the gross total and the
 * VAT on the header and the price on every line, but only one discount figure
 * for the whole document — not the console's three-way split. So the list price
 * is the sum of the lines, the discount is whatever separates that from the
 * net, and the total is SAP's own. The three rows add up on screen because they
 * are derived from each other.
 */
function realOrder(source, practitioners, patients) {
    const slot = `order:${source.docEntry}`;
    const id = `TF-${source.docNum}`;
    const status = ORDER_STATUS_BY_CODE[Number(source.state)] || 'new';
    const daysAgo = Math.max(0, daysSince(source.docDate));
    // SAP stores the document's date but not its hour; the clock time is the
    // fixture's, so the audit trail reads in a sensible order.
    const placed = at(
        daysAgo,
        spread(`${slot}:hh`, 8, 19),
        spread(`${slot}:mm`, 0, 59),
    );

    const feeLines = source.lines.filter(isFeeLine);
    const herbLines = source.lines.filter(isIngredientLine);
    const materialLines = source.lines.filter(isMaterialLine);
    const shelfSource = source.lines.filter(
        (line) =>
            !isFeeLine(line) &&
            !isIngredientLine(line) &&
            !isMaterialLine(line),
    );
    // A document billing a delivery on its own still has to say what it is, so
    // there the charge is the order's one line rather than a fee beneath it.
    const chargeOnly =
        !herbLines.length && !materialLines.length && !shelfSource.length;
    const contentLines = chargeOnly ? feeLines : shelfSource;

    const shelfLines = contentLines.map((line) => ({
        sku: line.code,
        name: L(line.name),
        size: null,
        unit: line.unit === 'gr' ? 'g' : line.unit || 'unit',
        qty: line.quantity,
        price: line.price,
    }));

    const base = sumOf(
        chargeOnly
            ? feeLines
            : [...herbLines, ...materialLines, ...shelfSource],
    );
    const shipFee = chargeOnly ? 0 : sumOf(feeLines);
    const vat =
        source.vat ?? round2(source.total - source.total / (1 + VAT_RATE));
    const net = round2(source.total - vat);
    const pointsUsed = source.pointsUsed || 0;
    const baseDisc = Math.max(0, round2(base + shipFee - pointsUsed - net));

    const practitioner = pickFrom(`${slot}:practitioner`, practitioners);
    const theirs = patients.filter((one) => one.prCode === practitioner.code);
    const patient = pickFrom(
        `${slot}:patient`,
        theirs.length ? theirs : patients,
    );

    const payer = paidBy(source);
    const deliveryType = collectedInPerson(source) ? 'pickup' : 'courier';
    const courierId = COURIER_BY_CODE[source.courier] || null;
    const credit =
        payer === 'practitioner' &&
        practitioner.credit &&
        !['new', 'cancelled'].includes(status);

    const order = {
        id,
        ...placed,
        placed,
        practitioner,
        patient,
        payer,
        status,
        type: herbLines.length ? 'formula' : 'shelf',
        formula: herbLines.length
            ? realFormula(source, herbLines, materialLines, slot)
            : null,
        // One SAP order is one formula. The second slot stays open because the
        // console's screens read it, not because a document ever fills it.
        formula2: null,
        shelfLines,
        discPct: base > 0 ? Math.round((baseDisc / base) * 100) : 0,
        pricing: {
            base,
            baseDisc,
            // SAP carries one discount per document. The console's trade and
            // customer discounts have no field of their own to read.
            shelfDisc: 0,
            patientDisc: 0,
            pointsUsed,
            pointsEarn: source.pointsEarned || 0,
            // Billed as a line in the 999xxx block, never as a header field.
            compFee: 0,
            shipFee,
            vat,
            total: source.total,
            promo: false,
        },
        deliveryType,
        courier: courierId,
        // The courier's own tracking number is not in the extract.
        tracking: courierId
            ? `${COURIER[courierId].code}${spread(`${slot}:tracking`, 100000, 999999)}IL`
            : null,
        // `U_PoaSigned` is filled on one document in the sample and empty on
        // the rest — empty means unrecorded, not unsigned, so only the answer
        // SAP actually holds overrides the fixture's.
        poaSigned:
            source.poaSigned === 'כן'
                ? true
                : deliveryType === 'courier'
                  ? !chance(`${slot}:poa`, 0.22)
                  : true,
        addressProvided:
            payer === 'patient' ? !chance(`${slot}:addr`, 0.25) : true,
        // The city is the document's. The rest of the address is not in the
        // extract — it identifies a person.
        address: {
            city: source.city ? L(source.city) : patient.city,
            street: pickFrom(`${slot}:street`, DELIVERY_STREETS),
            num: String(spread(`${slot}:num`, 1, 120)),
            apt: String(spread(`${slot}:apt`, 1, 24)),
            floor: String(spread(`${slot}:floor`, 0, 8)),
            entry: pickFrom(`${slot}:entry`, ENTRY_LETTERS),
        },
        payMethod:
            source.paidOnline === 'Y'
                ? 'card'
                : pickFrom(`${slot}:pay`, PAY_METHODS),
        // The tax document lives in Green Invoice, not in SAP.
        docNum: String(spread(`${slot}:doc`, 20250, 20999)),
        docType: 'invrec',
        docAlloc: String(spread(`${slot}:alloc`, 10000000, 99999999)),
        docStatus: rareChance(`${slot}:docfail`, 0.06) ? 'failed' : 'issued',
        docReq: null,
        credit,
        creditPaid: credit && daysAgo >= 18 && daysAgo % 3 !== 0,
        // U_PayedSite is "paid on the site": a practitioner billed at month end
        // never sets it, so an order past the counter counts as settled too.
        paid:
            source.paidOnline === 'Y' ||
            (!credit && !['new', 'cancelled', 'on_hold'].includes(status)),
        linkExpires: null,
        gcSession: `gc_sess_${spread(`${slot}:gcs`, 100000, 999999)}`,
        gcTxn:
            status === 'new'
                ? null
                : `gc_txn_${spread(`${slot}:gct`, 1000000, 9999999)}`,
        payToken: `pl_${spread(`${slot}:tok`, 100000, 999999).toString(36)}${spread(`${slot}:tok2`, 1000, 9999)}`,
        linkState:
            payer === 'patient'
                ? status === 'new'
                    ? pickFrom(`${slot}:link`, LINK_STATES)
                    : 'paid'
                : null,
        interactionFlag:
            patient.meds.length > 0 &&
            herbLines.length > 0 &&
            chance(`${slot}:interaction`, 0.55),
        items: [],
        audit: [],
        documentation: [],
        docsExtra: [],
        flags: [],
        // The urgency mark and the four hands in the lab are the console's own
        // — SAP has neither field.
        urgent:
            !['cancelled', 'closed'].includes(status) &&
            chance(`${slot}:urgent`, 0.12),
        // `U_IsufName` held an unsubstituted template token in every sampled
        // row, so which point an order is collected from is the fixture's;
        // whether it is collected at all is SAP's.
        pickupPoint:
            deliveryType === 'pickup'
                ? pickFrom(`${slot}:point:id`, PICKUP_POINT_IDS)
                : null,
        lab: labRoles(status, slot, daysAgo),
        cancelCause:
            status === 'cancelled'
                ? pickFrom(`${slot}:cause`, [
                      'practitioner_request',
                      'patient_request',
                      'payment_failed',
                  ])
                : null,
    };

    const unpaidCredit = order.credit && !order.creditPaid;

    if (status === 'new' || status === 'cancelled' || unpaidCredit) {
        order.docNum = null;
        order.docAlloc = null;
        order.docStatus = unpaidCredit ? 'awaiting_credit' : 'none';
    }

    if (order.docStatus === 'failed') {
        order.docNum = null;
        order.docAlloc = null;
        order.docReq = `req_${spread(`${id}:req`, 100000, 999999).toString(36)}`;
    }

    order.linkExpires =
        payer === 'patient' && status === 'new'
            ? Math.max(0, PAY_LINK.days - daysAgo)
            : null;

    return order;
}

/** Build the order book. Practitioner cards are embedded by reference. */
export function buildOrders(practitioners, patients) {
    const orders = REAL_ORDERS.map((source) =>
        realOrder(source, practitioners, patients),
    );

    orders.forEach((order) => {
        order.items = buildItems(order);
        order.audit = buildAudit(order);
        order.documentation = buildDocumentation(order, order.audit);
    });

    // One packed-and-waiting order is deliberately left without a courier, so
    // the "ready to pack, no courier" exception is always reachable — the same
    // trick inventory.js uses to keep both batch expiry states on screen.
    const awaitingCourier = orders.filter(
        (order) =>
            order.status === 'packed' && order.deliveryType === 'courier',
    );

    if (awaitingCourier.length > 1) {
        const last = awaitingCourier[awaitingCourier.length - 1];

        last.courier = null;
        last.tracking = null;
    }

    // One order on the lab bench is always urgent, so the queue's ordering and
    // the urgency marks are on screen whatever the rest of the fixture does.
    const bench = orders.find((order) => order.status === 'lab');

    if (bench) {
        bench.urgent = true;
    }

    return orders;
}

/**
 * Which exceptions an order carries. Each one is a named, individually
 * resolvable condition — there is no generic "needs attention" state.
 */
export function orderExceptionFlags(order, messages) {
    const flags = [];

    if (order.credit && !order.creditPaid && order.daysAgo >= CREDIT.warnDays) {
        flags.push('credit_debt');
    }

    if (order.docStatus === 'failed') {
        flags.push('doc_failed');
    }

    if (order.linkExpires !== null && order.linkExpires <= 1) {
        flags.push('link_expiring');
    }

    if (
        order.payer === 'patient' &&
        !order.addressProvided &&
        !['cancelled', 'new'].includes(order.status)
    ) {
        flags.push('address');
    }

    if (
        messages.some(
            (message) =>
                message.order === order.id && message.status === 'failed',
        )
    ) {
        flags.push('msg');
    }

    if (
        order.status === 'new' &&
        order.daysAgo >= EXCEPTION_THRESHOLDS.payStaleDays
    ) {
        flags.push('pay_stale');
    }

    if (order.interactionFlag && order.status !== 'cancelled') {
        flags.push('interaction');
    }

    if (
        order.status === 'lab' &&
        order.daysAgo >= EXCEPTION_THRESHOLDS.labStuckDays
    ) {
        flags.push('lab');
    }

    if (
        order.status === 'packed' &&
        order.deliveryType === 'courier' &&
        !order.courier
    ) {
        flags.push('courier');
    }

    return flags;
}
