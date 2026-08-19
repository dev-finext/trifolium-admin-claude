// The order book: 52 orders across every status the console has a screen for,
// with their compounded items, their audit trail and their exception flags.
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
    COURIER_IDS,
    CREDIT,
    EXCEPTION_THRESHOLDS,
    HOLD_REASON_IDS,
    ITEM_STAGE_IDS,
    ORDER_TO_ITEM_STAGE,
    PAY_LINK,
    SETTINGS,
} from '@/config';
import {
    DOSE_TIMING_IDS,
    EVAPORATION_IDS,
    DEMO_HERB_BY_ID,
} from '@/demo/catalog';
import { at, chance, pickFrom, rareChance, spread } from '@/demo/fixture';
import {
    DEMO_ACTORS,
    ENTRY_LETTERS,
    PHARMACIST_ACTORS,
    SUPPORT_ACTORS,
} from '@/demo/people';
import { SHELF_ITEMS } from '@/demo/products';
import { L } from '@/lib/localized';

/** How many orders the fixture carries, and the id the series counts down from. */
const ORDER_COUNT = 52;
const FIRST_ORDER_NUMBER = 2860;

/**
 * Fees the demo pricing was authored against. Real deployments read these from
 * the fee settings; they are stated here so no screen has to know them.
 */
const COMPOUNDING_FEE = 35;
const SHIPPING_FEE = 39;
const FREE_SHIPPING_OVER = 400;
const SHELF_TRADE_DISCOUNT = 0.4;
const PATIENT_DISCOUNT = 0.1;
const POINTS_EARN_RATE = 0.1;

/**
 * The status spread the screens were designed against — eight orders awaiting
 * payment, seven in the lab, three cancelled, and so on. Read modulo the order
 * index, so the mix holds whatever the order count is.
 */
const STATUS_MIX = [
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'pending_payment',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'in_production',
    'in_production',
    'in_production',
    'in_production',
    'in_production',
    'in_production',
    'in_production',
    'ready_for_delivery',
    'ready_for_delivery',
    'ready_for_delivery',
    'ready_for_delivery',
    'ready_for_delivery',
    'shipped',
    'shipped',
    'shipped',
    'shipped',
    'shipped',
    'shipped',
    'delivered',
    'delivered',
    'delivered',
    'delivered',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'cancelled',
    'cancelled',
    'cancelled',
];

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

const INTERNAL_NOTES = [
    L(
        'לרקוח בבקבוק זכוכית כהה. לסנן פעמיים. תווית עם תאריך תפוגה 24 חודשים.',
        'Compound in an amber glass bottle. Filter twice. Label with a 24-month expiry.',
    ),
    L(
        'נידוף אלכוהול חלקי לפני הוספת הגליצרין. לערבב 3 דקות.',
        'Partial alcohol evaporation before the glycerin goes in. Stir for 3 minutes.',
    ),
    L(
        'לחלק לשתי מנות של 50 מ״ל. לסמן מנה ראשונה/שנייה.',
        'Split into two 50 ml portions. Mark them first and second.',
    ),
];

const EXTERNAL_NOTES = [
    L(
        'לנער לפני כל שימוש. לשמור במקום קריר וחשוך, מחוץ להישג ידם של ילדים.',
        'Shake before each use. Store somewhere cool and dark, out of reach of children.',
    ),
    L(
        'ליטול עם מעט מים. במקרה של אי נוחות בבטן — ליטול לאחר האוכל.',
        'Take with a little water. If it unsettles your stomach, take it after food.',
    ),
    L(
        'ניתן למהול בכוס תה חם. לא ליטול יחד עם קפה.',
        'May be diluted in a cup of hot tea. Do not take together with coffee.',
    ),
];

const DELIVERY_CITIES = [
    L('תל אביב', 'Tel Aviv'),
    L('רמת גן', 'Ramat Gan'),
    L('חיפה', 'Haifa'),
    L('ירושלים', 'Jerusalem'),
    L('נתניה', 'Netanya'),
    L('באר שבע', 'Beer Sheva'),
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

function shelfLine(slot, minQty, maxQty) {
    const item = pickFrom(slot, SHELF_ITEMS);

    return { ...item, qty: spread(`${slot}:qty`, minQty, maxQty) };
}

/** One compounded formula, as it sits on an order. */
function formulaBody(template, slot) {
    const herbs = template.herbs.map((id) => {
        const herb = DEMO_HERB_BY_ID[id];

        return {
            id,
            name: herb.name,
            lat: herb.lat,
            cn: herb.cn,
            qty: spread(`${slot}:${id}`, 6, 26),
        };
    });
    const total = herbs.reduce((sum, herb) => sum + herb.qty, 0);

    return {
        id: template.id,
        name: template.name,
        typeId: template.typeId,
        unit: template.unit,
        vol: template.vol,
        herbs: herbs.map((herb) => ({
            ...herb,
            pct: Math.round((herb.qty / total) * 1000) / 10,
        })),
        dose: {
            qty: template.unit === 'ml' ? spread(`${slot}:dose`, 2, 5) : 1,
            unit:
                template.unit === 'ml'
                    ? 'ml'
                    : template.unit === 'g'
                      ? 'tsp'
                      : 'capsule',
            times: spread(`${slot}:times`, 1, 3),
        },
        timing: pickFrom(`${slot}:timing`, DOSE_TIMING_IDS),
        evap:
            template.typeId === 'tincture'
                ? pickFrom(`${slot}:evap`, EVAPORATION_IDS)
                : null,
        packages: spread(`${slot}:packages`, 1, 2),
        internalNotes: pickFrom(`${slot}:internal`, INTERNAL_NOTES),
        externalNotes: pickFrom(`${slot}:external`, EXTERNAL_NOTES),
    };
}

/**
 * Order items. Every compounded formula carries its own stage; shelf lines are
 * not tracked separately, which is why they carry no stage at all.
 */
function buildItems(order) {
    const items = [];
    const baseStage = ITEM_STAGE_IDS.indexOf(ORDER_TO_ITEM_STAGE[order.status]);

    [order.formula, order.formula2].filter(Boolean).forEach((formula, k) => {
        const slot = `${order.id}:item:${k}`;
        const ahead = k === 0 ? 0 : spread(`${slot}:ahead`, 0, 2);

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
            dose: formula.dose,
            timing: formula.timing,
            evap: formula.evap,
            packages: formula.packages,
            internalNotes: formula.internalNotes,
            externalNotes: formula.externalNotes,
            stage:
                order.status === 'cancelled'
                    ? 'cancelled'
                    : ITEM_STAGE_IDS[
                          Math.min(ITEM_STAGE_IDS.length - 1, baseStage + ahead)
                      ],
            pharm:
                baseStage >= 2 && chance(`${slot}:pharm`, 0.75)
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

    const sequence = [
        'paid',
        'in_production',
        'ready_for_delivery',
        'shipped',
        'delivered',
        'completed',
    ];
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
            from: k === 0 ? 'pending_payment' : sequence[k - 1],
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

/** Build the order book. Practitioner cards are embedded by reference. */
export function buildOrders(practitioners, patients) {
    const orders = [];

    for (let i = 0; i < ORDER_COUNT; i += 1) {
        const slot = `order:${i}`;
        const id = `TF-${FIRST_ORDER_NUMBER - i}`;
        const status = STATUS_MIX[i % STATUS_MIX.length];
        const isShelf = chance(`${slot}:shelf`, 0.32);
        const practitioner = pickFrom(`${slot}:practitioner`, practitioners);
        const patient = pickFrom(`${slot}:patient`, patients);
        const payer = chance(`${slot}:payer`, 0.55)
            ? 'patient'
            : 'practitioner';
        const template = pickFrom(`${slot}:formula`, FORMULA_TEMPLATES);
        const second =
            !isShelf && chance(`${slot}:second`, 0.42)
                ? pickFrom(
                      `${slot}:second:pick`,
                      FORMULA_TEMPLATES.filter((t) => t.id !== template.id),
                  )
                : null;

        const shelfLines = isShelf
            ? [
                  shelfLine(`${slot}:line1`, 1, 3),
                  ...(chance(`${slot}:line2`, 0.4)
                      ? [shelfLine(`${slot}:line2`, 1, 1)]
                      : []),
              ]
            : chance(`${slot}:extra`, 0.34)
              ? [shelfLine(`${slot}:extra:line`, 1, 2)]
              : [];

        const shelfSum = shelfLines.reduce(
            (sum, line) => sum + line.price * line.qty,
            0,
        );
        const base = isShelf
            ? shelfSum
            : spread(`${slot}:base`, 150, 420) +
              (second ? spread(`${slot}:base2`, 120, 300) : 0) +
              shelfSum;
        const discPct = practitioner.disc || SETTINGS.defaultDiscountPct;
        const baseDisc = Math.round(base * (discPct / 100));
        const shelfDisc =
            isShelf && payer === 'practitioner'
                ? Math.round(base * SHELF_TRADE_DISCOUNT)
                : 0;
        const patientDisc =
            payer === 'patient'
                ? Math.round((base - baseDisc) * PATIENT_DISCOUNT)
                : 0;
        const pointsEarn =
            payer === 'practitioner'
                ? Math.round((base - baseDisc) * POINTS_EARN_RATE)
                : 0;
        const compFee = isShelf ? 0 : COMPOUNDING_FEE;
        const deliveryType = chance(`${slot}:delivery`, 0.72)
            ? 'courier'
            : 'pickup';
        const shipFee =
            deliveryType === 'courier'
                ? base > FREE_SHIPPING_OVER
                    ? 0
                    : SHIPPING_FEE
                : 0;
        const pointsUsed = chance(`${slot}:points`, 0.18)
            ? spread(`${slot}:points:n`, 20, 120)
            : 0;
        const total = Math.max(
            0,
            base -
                baseDisc -
                shelfDisc -
                patientDisc +
                compFee +
                shipFee -
                pointsUsed,
        );

        const daysAgo = Math.floor(i * 0.6);
        const placed = at(
            daysAgo,
            spread(`${slot}:hh`, 8, 19),
            spread(`${slot}:mm`, 0, 59),
        );

        const needsCourier =
            deliveryType === 'courier' &&
            (['shipped', 'delivered', 'completed'].includes(status) ||
                (status === 'ready_for_delivery' &&
                    chance(`${slot}:courier:maybe`, 0.5)));
        const courierId = needsCourier
            ? pickFrom(`${slot}:courier`, COURIER_IDS)
            : null;

        orders.push({
            id,
            ...placed,
            placed,
            practitioner,
            patient,
            payer,
            status,
            hold:
                status === 'pending_payment' && chance(`${slot}:hold`, 0.3)
                    ? pickFrom(`${slot}:hold:reason`, HOLD_REASON_IDS)
                    : null,
            type: isShelf ? 'shelf' : 'formula',
            formula: isShelf ? null : formulaBody(template, `${slot}:f1`),
            formula2: second ? formulaBody(second, `${slot}:f2`) : null,
            shelfLines,
            discPct,
            pricing: {
                base,
                baseDisc,
                shelfDisc,
                patientDisc,
                pointsUsed,
                pointsEarn,
                compFee,
                shipFee,
                total,
                promo: isShelf && shelfLines.some((line) => line.qty >= 3),
            },
            deliveryType,
            courier: courierId,
            tracking: courierId
                ? `${COURIER[courierId].code}${spread(`${slot}:tracking`, 100000, 999999)}IL`
                : null,
            poaSigned:
                deliveryType === 'courier'
                    ? !chance(`${slot}:poa`, 0.22)
                    : true,
            addressProvided:
                payer === 'patient' ? !chance(`${slot}:addr`, 0.25) : true,
            address: {
                city: pickFrom(`${slot}:city`, DELIVERY_CITIES),
                street: pickFrom(`${slot}:street`, DELIVERY_STREETS),
                num: String(spread(`${slot}:num`, 1, 120)),
                apt: String(spread(`${slot}:apt`, 1, 24)),
                floor: String(spread(`${slot}:floor`, 0, 8)),
                entry: pickFrom(`${slot}:entry`, ENTRY_LETTERS),
            },
            payMethod: pickFrom(`${slot}:pay`, PAY_METHODS),
            docNum: String(spread(`${slot}:doc`, 20250, 20999)),
            docType: 'invrec',
            docAlloc: String(spread(`${slot}:alloc`, 10000000, 99999999)),
            docStatus: rareChance(`${slot}:docfail`, 0.06)
                ? 'failed'
                : 'issued',
            docReq: null,
            credit: false,
            creditPaid: false,
            linkExpires: null,
            gcSession: `gc_sess_${spread(`${slot}:gcs`, 100000, 999999)}`,
            gcTxn:
                status === 'pending_payment'
                    ? null
                    : `gc_txn_${spread(`${slot}:gct`, 1000000, 9999999)}`,
            payToken: `pl_${spread(`${slot}:tok`, 100000, 999999).toString(36)}${spread(`${slot}:tok2`, 1000, 9999)}`,
            linkState:
                payer === 'patient'
                    ? status === 'pending_payment'
                        ? pickFrom(`${slot}:link`, LINK_STATES)
                        : 'paid'
                    : null,
            interactionFlag:
                patient.meds.length > 0 &&
                !isShelf &&
                chance(`${slot}:interaction`, 0.55),
            items: [],
            audit: [],
            documentation: [],
            docsExtra: [],
            flags: [],
        });
    }

    orders.forEach((order) => {
        order.credit =
            order.payer === 'practitioner' &&
            order.practitioner.credit &&
            !['pending_payment', 'cancelled'].includes(order.status);

        if (order.credit && order.status === 'paid') {
            order.status = 'credit';
        }

        order.creditPaid =
            order.credit && order.daysAgo >= 18 && order.daysAgo % 3 !== 0;

        const unpaidCredit = order.credit && !order.creditPaid;

        if (
            order.status === 'pending_payment' ||
            order.status === 'cancelled' ||
            unpaidCredit
        ) {
            order.docNum = null;
            order.docAlloc = null;
            order.docStatus = unpaidCredit ? 'awaiting_credit' : 'none';
        }

        order.linkExpires =
            order.payer === 'patient' && order.status === 'pending_payment'
                ? Math.max(0, PAY_LINK.days - order.daysAgo)
                : null;

        if (order.docStatus === 'failed') {
            order.docNum = null;
            order.docAlloc = null;
            order.docReq = `req_${spread(`${order.id}:req`, 100000, 999999).toString(36)}`;
        }

        order.items = buildItems(order);
        order.audit = buildAudit(order);
        order.documentation = buildDocumentation(order, order.audit);
    });

    // One packed-and-waiting order is deliberately left without a courier, so
    // the "ready to pack, no courier" exception is always reachable — the same
    // trick inventory.js uses to keep both batch expiry states on screen.
    const awaitingCourier = orders.filter(
        (order) =>
            order.status === 'ready_for_delivery' &&
            order.deliveryType === 'courier',
    );

    if (awaitingCourier.length > 1) {
        const last = awaitingCourier[awaitingCourier.length - 1];

        last.courier = null;
        last.tracking = null;
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
        !['cancelled', 'pending_payment'].includes(order.status)
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
        order.status === 'pending_payment' &&
        order.daysAgo >= EXCEPTION_THRESHOLDS.payStaleDays
    ) {
        flags.push('pay_stale');
    }

    if (
        order.interactionFlag &&
        !['cancelled', 'completed'].includes(order.status)
    ) {
        flags.push('interaction');
    }

    if (
        order.status === 'in_production' &&
        order.daysAgo >= EXCEPTION_THRESHOLDS.labStuckDays
    ) {
        flags.push('lab');
    }

    if (
        order.status === 'ready_for_delivery' &&
        order.deliveryType === 'courier' &&
        !order.courier
    ) {
        flags.push('courier');
    }

    return flags;
}
