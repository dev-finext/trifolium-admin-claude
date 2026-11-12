// The order book: the 50 orders read out of SAP, with their compounded items,
// their audit trail and their exception flags.
//
// Every order here is a real `ORDR` document — its number, its date, its state,
// its money, its delivery and its lines. One order is one formula, and the
// formula's herbs are that document's `RDR1` lines, at the quantities the
// pharmacy actually weighed. The sample covers all eight states.
//
// Four things on an order are the console's own, because SAP does not hold
// them, and each says so where it is built: the tax document (the invoice
// provider in config/finance.js, a separate system), the lab's four hands, the
// urgency mark, and the street address behind the real city.
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
    DOC_PROVIDER,
    EXCEPTION_THRESHOLDS,
    flowFor,
    flowIdOf,
    PAY_LINK,
    PREPARATION_FORM,
    SETTINGS,
    SKIPPED_STATUS_IDS,
} from '@/config';
import { PAY_PROVIDER } from '@/config/integrations';
import { DOSE_TIMING_IDS, EVAPORATION_IDS } from '@/demo/catalog';
import { at, chance, pickFrom, rareChance, spread } from '@/demo/fixture';
import {
    DEMO_ACTORS,
    ENTRY_LETTERS,
    PHARMACIST_ACTORS,
    SUPPORT_ACTORS,
} from '@/demo/people';
import REAL_ORDERS from '@/demo/real/orders.json';
import STATION_WEB_ORDERS from '@/demo/real/stationWebOrders.json';
import { orderContainers, totalContainers } from '@/lib/containers';
import { daysSince } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * Statuses an order reaches only with every container marked — see
 * `buildStationState`. An order still "בהכנה" is being marked: some of its
 * containers, all of them (green, ready to move on) or none yet. There is no
 * "באריזה" stage (12.11.2026).
 */
const FULLY_MARKED = [
    'awaiting_courier',
    'shipped',
    'ready_for_pickup',
    'collected',
];

/** Statuses at which a courier has actually been linked. */
const COURIER_LINKED = ['awaiting_courier', 'shipped'];

/**
 * The shipping station's own history and fields (SHIPPING_STATION_SPEC.md
 * §4): who receives, how many packages, the power-of-attorney gate, and — as
 * far as the order's own status implies it happened — its pack checklist,
 * its courier shipment and its events. Built from the status the fixture
 * already landed the order on, so a "ממתין לשליח" order really does carry an
 * active shipment and a "באריזה" order really does have some containers
 * ticked and some not.
 */
function buildStationState(order, slot) {
    const containers = orderContainers(order);
    const total = totalContainers(order);
    const isPickup = order.shipTo === 'pickup';
    const marking = order.status === 'in_production';
    const pastPacking = FULLY_MARKED.includes(order.status) || marking;
    const courierLinked = COURIER_LINKED.includes(order.status);

    const recipientPhone =
        order.shipTo === 'patient'
            ? order.patient.phone
            : order.practitioner.phone;

    // Courier authorization ("אליי") or a signed power of attorney
    // ("אל המטופל/ת") — the gate a courier link needs (spec §11). A pickup
    // order has neither.
    const courierAuth = order.shipTo === 'me' ? order.poaSigned : null;
    const poaWillSign = order.shipTo === 'patient' && order.poaSigned;
    const poa =
        order.shipTo === 'patient'
            ? {
                  status: poaWillSign ? 'signed' : 'missing',
                  fullName: poaWillSign ? order.patient.name : null,
                  // The patient's own `tz` (demo/people.js) — already a safe,
                  // deliberately-invalid fixture id, and it is actually theirs.
                  idNumber: poaWillSign ? order.patient.tz : null,
                  signed: poaWillSign,
                  consentVersion: poaWillSign ? 'v1' : null,
                  signedAt: poaWillSign
                      ? at(Math.max(0, order.daysAgo - 1), 10, 5)
                      : null,
              }
            : null;

    // Packages are only a real count once something has actually been packed;
    // before that the order has not been through a scale yet.
    const packagesCount = pastPacking
        ? spread(`${slot}:pkgs`, 1, Math.min(3, Math.max(1, total)))
        : 1;

    const events = [];
    const packChecks = [];
    const shipments = [];
    let shippedAt = null;
    let collectedAt = null;
    let collectedBy = null;
    let collectedByName = null;

    if (pastPacking && total > 0) {
        // An order still "בהכנה" is somewhere in its marking: untouched, part
        // of the way, or done and green — the three things the list shows.
        const roll = marking ? spread(`${slot}:marked`, 0, 2) : 2;
        const scanned =
            roll === 0
                ? 0
                : roll === 1
                  ? Math.max(
                        1,
                        total - 1 - (chance(`${slot}:partial`, 0.4) ? 1 : 0),
                    )
                  : total;
        const manualFrom = chance(`${slot}:manual`, 0.35)
            ? Math.max(0, scanned - 1)
            : scanned;

        containers.forEach((row) => {
            row.barcodes.forEach((barcode, i) => {
                const index =
                    containers
                        .slice(0, containers.indexOf(row))
                        .reduce((sum, r) => sum + r.count, 0) + i;

                if (index >= scanned) {
                    return;
                }

                // The last container of some orders was marked by hand —
                // "סימון ידני", one click where a scan did not take.
                const manual = index >= manualFrom;

                packChecks.push({
                    orderItemId: row.item.id,
                    containerNo: i + 1,
                    barcode,
                    checkedAt: at(
                        Math.max(0, order.daysAgo - 1),
                        9,
                        10 + index,
                    ),
                    checkedBy: DEMO_ACTORS.ellaSupport,
                    isManual: manual,
                });

                if (manual) {
                    events.push({
                        type: 'container_scanned_manual',
                        at: at(Math.max(0, order.daysAgo - 1), 9, 10 + index),
                        user: DEMO_ACTORS.ellaSupport,
                        data: { orderItemId: row.item.id, containerNo: i + 1 },
                        visibleToCustomer: false,
                    });
                }
            });
        });
    }

    if (!isPickup && (courierLinked || order.status === 'cancelled')) {
        const manual = chance(`${slot}:ship:manual`, 0.15);

        shipments.push({
            id: `sh-${order.id}`,
            courierCode: order.courier || 'tapuz',
            status: order.status === 'shipped' ? 'handed' : 'active',
            trackingNumber: order.tracking,
            packagesCount,
            isManual: manual,
            manualReason: manual
                ? L('תפוז לא זמין טלפונית', 'Tapuz unreachable by phone')
                : null,
            linkedAt: at(Math.max(0, order.daysAgo - 1), 11, 5),
            linkedBy: DEMO_ACTORS.ellaSupport,
            handedAt:
                order.status === 'shipped'
                    ? at(Math.max(0, order.daysAgo - 1), 16, 0)
                    : null,
            handedBy: order.status === 'shipped' ? DEMO_ACTORS.amitLab : null,
        });

        events.push({
            type: manual ? 'shipment_manual' : 'shipment_linked',
            at: at(Math.max(0, order.daysAgo - 1), 11, 5),
            user: DEMO_ACTORS.ellaSupport,
            data: { courier: order.courier, tracking: order.tracking },
            visibleToCustomer: true,
        });

        if (order.status === 'shipped') {
            shippedAt = at(Math.max(0, order.daysAgo - 1), 16, 0);
            events.push({
                type: 'handed_to_courier',
                at: shippedAt,
                user: DEMO_ACTORS.amitLab,
                visibleToCustomer: true,
            });
        }
    }

    if (isPickup && ['ready_for_pickup', 'collected'].includes(order.status)) {
        events.push({
            type: 'ready_for_pickup',
            at: at(Math.max(0, order.daysAgo - 1), 15, 30),
            user: DEMO_ACTORS.ellaSupport,
            visibleToCustomer: true,
        });

        if (order.status === 'collected') {
            collectedAt = at(Math.max(0, order.daysAgo - 1), 17, 15);
            collectedBy = order.practitioner.name;
            collectedByName = chance(`${slot}:collectedByOther`, 0.2)
                ? L('מלווה של המטופל', "The patient's companion")
                : null;
            events.push({
                type: 'collected',
                at: collectedAt,
                user: DEMO_ACTORS.ellaSupport,
                visibleToCustomer: true,
            });
        }
    }

    return {
        recipientPhone,
        packagesCount,
        shippedAt,
        collectedAt,
        collectedBy,
        collectedByName,
        courierAuth,
        poa,
        events,
        packChecks,
        shipments,
    };
}

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

/** The storefront the payer orders on. */
const siteTerminal = (payer) =>
    payer === 'patient' ? 'consumer_site' : 'practitioner_site';

/** Which payment terminal an order was paid on — see PAY_TERMINALS. */
function paymentTerminal(source, payer, payMethod, slot) {
    if (source.paidOnline === 'Y') {
        return siteTerminal(payer);
    }

    if (payMethod === 'cash' || chance(`${slot}:terminal`, 0.12)) {
        return 'physical';
    }

    return siteTerminal(payer);
}

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
    L('בן גוריון', 'Ben Gurion'),
    L('אלנבי', 'Allenby'),
    L('הגלבוע', 'HaGilboa'),
    L('רוטשילד', 'Rothschild'),
    L('הכרמל', 'HaCarmel'),
];

/** A free-text instruction for the courier, as a patient actually leaves one
 * at checkout — present on some orders, absent on most, same as real life. */
const DELIVERY_NOTES = [
    L('נא להשאיר ליד הדלת', 'Please leave by the door'),
    L('להתקשר לפני ההגעה', 'Call before arrival'),
    L('הכניסה מהצד האחורי של הבניין', 'Entrance from the back of the building'),
    L('אין מעלית בבניין', 'No elevator in the building'),
    L(
        'להשאיר אצל השכנים מול, דירה סמוכה',
        'Leave with the neighbors across the hall',
    ),
    L(
        'המטופל/ת מוגבל/ת בניידות — נא להמתין בסבלנות בדלת',
        'The patient has limited mobility — please wait patiently at the door',
    ),
    L(
        'יש כלב בחצר, נא לא להיכנס דרך השער הראשי',
        "There's a dog in the yard — please don't enter through the main gate",
    ),
    L('ניתן להשאיר בתיבת הדואר', 'May be left in the mailbox'),
];

/** Card three times over: the mix a pharmacy of this size actually collects. */
const PAY_METHODS = ['card', 'card', 'card', 'cash', 'transfer'];

/** Where a customer payment link stands, when the payer is the patient. */
const LINK_STATES = ['sent', 'viewed', 'sent'];

/** A pinned note on an order, with an @mention of another agent. */
export function buildOrderNote() {
    return {
        when: at(1, 12, 18),
        actor: L('ניר ק׳', 'Nir K.'),
        text: L(
            'המטפל ביקש לעכב שליחה עד יום ראשון.',
            'The practitioner asked to hold the shipment until Sunday.',
        ),
        mention: L('@עמית', '@Amit'),
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
        // `price` and `lineTotal` are SAP's own figures for the line, kept so
        // the tax document can list every component at the price it was
        // actually charged — the document is built from these, never priced
        // again.
        herbs: herbLines.map((line) => ({
            id: line.code,
            name: L(line.name),
            lat: null,
            cn: line.foreignName || null,
            qty: line.quantity,
            unit: lineUnit(line),
            price: line.price ?? null,
            lineTotal: line.lineTotal ?? null,
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
            price: line.price ?? null,
            lineTotal: line.lineTotal ?? null,
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
    const inLab = [
        'in_production',
        'packing',
        'awaiting_courier',
        'shipped',
        'ready_for_pickup',
        'collected',
    ].includes(order.status);

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
            lineTotal: line.lineTotal,
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

    // `paid` is the flow's own label for the position; a credit order reached
    // the same position by `credit` instead, and the history must say which.
    // "באריזה" is no longer a step anybody passes through (12.11.2026).
    const sequence = flowFor(order).filter(
        (status) =>
            !SKIPPED_STATUS_IDS.includes(status) ||
            status === flowIdOf(order.status),
    );
    const stepId = (status) =>
        status === 'paid' && order.credit ? 'credit' : status;
    const reached = sequence.indexOf(flowIdOf(order.status));

    sequence.slice(0, reached + 1).forEach((status, k) => {
        rows.push({
            when: at(Math.max(0, order.daysAgo - k - 1), 10 + k, 15),
            actorKind: k === 0 ? 'provider' : 'agent',
            actor:
                k === 0
                    ? PAY_PROVIDER.name
                    : pickFrom(`${order.id}:audit:${k}`, SUPPORT_ACTORS),
            act: L('שינוי סטטוס להזמנה', 'Order status changed'),
            det: L(
                'הסטטוס עודכן במסד הנתונים · הודעות נשלחו לפי הטריגרים',
                'Status written to the database · messages sent by the triggers',
            ),
            valueType: 'status',
            from: k === 0 ? 'pending_payment' : stepId(sequence[k - 1]),
            to: stepId(status),
        });
    });

    if (order.docNum !== null) {
        rows.push({
            when: at(Math.max(0, order.daysAgo - 1), 10, 22),
            actorKind: 'system',
            actor: DEMO_ACTORS.system,
            act: L('הופקה חשבונית מס קבלה', 'Tax invoice/receipt issued'),
            det: L(
                `חשבונית מס קבלה ${order.docNum} · מספר הקצאה ${order.docAlloc} · ${DOC_PROVIDER.name}`,
                `Tax invoice/receipt ${order.docNum} · allocation number ${order.docAlloc} · ${DOC_PROVIDER.name}`,
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
                `${DOC_PROVIDER.name} 422 — נדרשת הפקה חוזרת ממסך כספים`,
                `${DOC_PROVIDER.name} 422 — needs to be reissued from the Finance screen`,
            ),
            bad: true,
        });
    }

    if (order.status === 'cancelled') {
        rows.push({
            when: at(Math.max(0, order.daysAgo - 1), 14, 2),
            actorKind: 'agent',
            actor: DEMO_ACTORS.oritSupport,
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
        actor: DEMO_ACTORS.nirSupport,
        text: DOC_NOTES[order.daysAgo % DOC_NOTES.length],
    });

    if (order.daysAgo % 4 === 0) {
        rows.push({
            id: 'mn0f',
            kind: 'manual',
            when: at(Math.max(0, order.daysAgo - 1), 15, 2),
            actor: DEMO_ACTORS.oritSupport,
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

    if (status === 'in_production') {
        return {
            ...none,
            picker: { by: DEMO_ACTORS.amitLab, when: when(9) },
            checker: chance(`${slot}:lab:checker`, 0.5)
                ? { by: DEMO_ACTORS.nirSupport, when: when(10) }
                : null,
        };
    }

    if (
        [
            'packing',
            'awaiting_courier',
            'shipped',
            'ready_for_pickup',
            'collected',
        ].includes(status)
    ) {
        return {
            picker: { by: DEMO_ACTORS.amitLab, when: when(9) },
            checker: { by: DEMO_ACTORS.nirSupport, when: when(10) },
            pharmacist: {
                by: pickFrom(`${slot}:lab:pharm`, PHARMACIST_ACTORS),
                when: when(11),
            },
            packer: { by: DEMO_ACTORS.ellaSupport, when: when(13) },
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
 * SAP's `U_OrderState` → the console's own status, per the fixture mapping in
 * `DEMO_SHIPPING_STATION_PROMPT.md` §3. Three of the eight SAP codes (1 הזמנה
 * חדשה, 2 בטיפול, 7 מושהה) have no status of their own in the new model — an
 * order at any of them is really just wherever its money stands — so the id
 * comes from `credit`/`paid` rather than the code.
 */
function statusFromState(code, { credit, creditPaid, paid, deliveryType }) {
    const byPayment = () => {
        if (credit && !creditPaid) {
            return 'credit';
        }

        return paid ? 'paid' : 'pending_payment';
    };

    switch (code) {
        case 1:
        case 2:
        case 7:
            return byPayment();
        case 3:
        // SAP's "ארוז" — everything in the box, not yet with a courier. There
        // is no "באריזה" stage any more: it is an order still "בהכנה".
        case 4:
            return 'in_production';
        case 5:
        case 6:
            return deliveryType === 'pickup' ? 'collected' : 'shipped';
        case 8:
            return 'cancelled';
        default:
            return 'pending_payment';
    }
}

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
    const stateCode = Number(source.state);
    const daysAgo = Math.max(0, daysSince(source.docDate));
    // SAP stores the document's date but not its hour; the clock time is the
    // fixture's, so the audit trail reads in a sensible order. An order from
    // today came in before now — the demo clock stands at 14:05.
    const placed = at(
        daysAgo,
        spread(`${slot}:hh`, 8, daysAgo === 0 ? 13 : 19),
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
        lineTotal: line.lineTotal ?? null,
    }));

    // The charges beneath the content, with their own code and name — SAP
    // bills delivery per band (`999019 'משלוח אל המטפל מעל 200 שח'`) and the
    // tax document lists that line as it was charged. Empty when the charge IS
    // the content (charge-only documents list it in `shelfLines`).
    const orderFeeLines = chargeOnly
        ? []
        : feeLines.map((line) => ({
              code: line.code,
              name: L(line.name),
              qty: line.quantity,
              price: line.price,
              lineTotal: line.lineTotal ?? null,
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
    // Who physically takes delivery: the practitioner, the patient, or the
    // pharmacy counter. Checkout does not exist in this console — the site
    // that captures it is out of this task's scope — so it is derived here
    // from who pays, the same split the order already carries.
    const shipTo =
        deliveryType === 'pickup'
            ? 'pickup'
            : payer === 'patient'
              ? 'patient'
              : 'me';
    const courierId = COURIER_BY_CODE[source.courier] || null;
    // Credit and paid read the raw SAP code, not the console's own status id —
    // for three of those codes (1, 2, 7) the id is itself picked FROM credit
    // and paid, by `statusFromState` below, and a status derived from itself
    // would be circular.
    const credit =
        payer === 'practitioner' &&
        practitioner.credit &&
        ![1, 8].includes(stateCode);
    const creditPaid = credit && daysAgo >= 18 && daysAgo % 3 !== 0;
    // U_PayedSite is "paid on the site": a practitioner billed at month end
    // never sets it, so an order past the counter counts as settled too.
    const paid =
        source.paidOnline === 'Y' ||
        (!credit && ![1, 7, 8].includes(stateCode));
    const status = statusFromState(stateCode, {
        credit,
        creditPaid,
        paid,
        deliveryType,
    });
    const payMethod =
        source.paidOnline === 'Y'
            ? 'card'
            : pickFrom(`${slot}:pay`, PAY_METHODS);

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
        feeLines: orderFeeLines,
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
        shipTo,
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
        deliveryNotes:
            deliveryType === 'courier' && chance(`${slot}:dlvnote`, 0.4)
                ? pickFrom(`${slot}:dlvnote:which`, DELIVERY_NOTES)
                : null,
        payMethod,
        // Where the payment was taken. A web payment is on the storefront of
        // whoever ordered; cash is the counter; the rest is the fixture's, with
        // a handful at the counter so the third terminal is on screen.
        terminal: paymentTerminal(source, payer, payMethod, slot),
        // The tax document lives with the invoice provider, not in SAP.
        docNum: String(spread(`${slot}:doc`, 20250, 20999)),
        docType: 'invrec',
        docAlloc: String(spread(`${slot}:alloc`, 10000000, 99999999)),
        docStatus: rareChance(`${slot}:docfail`, 0.06) ? 'failed' : 'issued',
        docReq: null,
        credit,
        creditPaid,
        paid,
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
            !['cancelled', 'shipped', 'collected'].includes(status) &&
            chance(`${slot}:urgent`, 0.12),
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

    if (
        status === 'pending_payment' ||
        status === 'cancelled' ||
        unpaidCredit
    ) {
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
        payer === 'patient' && status === 'pending_payment'
            ? Math.max(0, PAY_LINK.days - daysAgo)
            : null;

    return order;
}

/**
 * One website order as the new system holds it: its one or two formula
 * documents from SAP (joined on `U_DocEntryWeb`) as one order, and, for some,
 * a real document of shelf products in the same cart — which the new site's
 * cart allows and SAP's split documents never show together. The first
 * formula document gives the header (who, where, how it was paid); the totals
 * are all the documents' own, added up.
 */
function composedOrder(formulaSources, shelfSource, practitioners, patients) {
    const [first, second] = formulaSources;
    const order = realOrder(first, practitioners, patients);
    const sources = [...formulaSources, ...(shelfSource ? [shelfSource] : [])];

    if (second) {
        order.formula2 = realFormula(
            second,
            second.lines.filter(isIngredientLine),
            second.lines.filter(isMaterialLine),
            `order:${second.docEntry}`,
        );
    }

    if (shelfSource) {
        order.shelfLines = [
            ...order.shelfLines,
            ...shelfSource.lines
                .filter((line) => !isFeeLine(line))
                .map((line) => ({
                    sku: line.code,
                    name: L(line.name),
                    size: null,
                    unit: line.unit === 'gr' ? 'g' : line.unit || 'unit',
                    qty: line.quantity,
                    price: line.price,
                    lineTotal: line.lineTotal ?? null,
                })),
        ];
    }

    const content = sources.flatMap((one) =>
        one.lines.filter((line) => !isFeeLine(line)),
    );
    const fees = sources.flatMap((one) => one.lines.filter(isFeeLine));
    const total = round2(
        sources.reduce((sum, one) => sum + (Number(one.total) || 0), 0),
    );
    const vat = round2(total - total / (1 + VAT_RATE));
    const base = sumOf(content);
    const shipFee = sumOf(fees);
    const pointsUsed = sources.reduce(
        (sum, one) => sum + (Number(one.pointsUsed) || 0),
        0,
    );
    const baseDisc = Math.max(
        0,
        round2(base + shipFee - pointsUsed - round2(total - vat)),
    );

    order.type = 'formula';
    order.feeLines = fees.map((line) => ({
        code: line.code,
        name: L(line.name),
        qty: line.quantity,
        price: line.price,
        lineTotal: line.lineTotal ?? null,
    }));
    order.discPct = base > 0 ? Math.round((baseDisc / base) * 100) : 0;
    order.pricing = {
        ...order.pricing,
        base,
        baseDisc,
        pointsUsed,
        pointsEarn: sources.reduce(
            (sum, one) => sum + (Number(one.pointsEarned) || 0),
            0,
        ),
        shipFee,
        vat,
        total,
    };

    return order;
}

/**
 * Where each composed order stands at the station, in order, and how old the
 * order is there — about fifteen to a tab (12.11.2026). Pickup orders wait in
 * "ממתין לאיסוף עצמי"; the rest are being prepared, are with a courier
 * company, or went out this week.
 */
const STATION_PLAN = [
    ...Array.from({ length: 8 }, () => ({
        status: 'in_production',
        days: [0, 1],
    })),
    ...Array.from({ length: 13 }, () => ({
        status: 'awaiting_courier',
        days: [0, 2],
    })),
    ...Array.from({ length: 15 }, () => ({
        status: 'ready_for_pickup',
        shipTo: 'pickup',
        days: [0, 5],
    })),
    ...Array.from({ length: 11 }, () => ({ status: 'shipped', days: [1, 6] })),
    ...Array.from({ length: 5 }, () => ({
        status: 'collected',
        shipTo: 'pickup',
        days: [1, 6],
    })),
];

/** The companies an order waits on, most of them with Tapuz. */
const STATION_COURIERS = [
    'tapuz',
    'tapuz',
    'tapuz',
    'tapuz',
    'special_delivery',
    'tapuz',
    'focus',
    'special_delivery',
];

/** Build the order book. Practitioner cards are embedded by reference. */
export function buildOrders(practitioners, patients) {
    const orders = REAL_ORDERS.map((source) =>
        realOrder(source, practitioners, patients),
    );

    orders.forEach((order) => {
        order.items = buildItems(order);
        order.audit = buildAudit(order);
        order.documentation = buildDocumentation(order, order.audit);
        Object.assign(order, buildStationState(order, `${order.id}:station`));
    });

    // V3 — the lab queue is never empty.
    //
    // An order waiting to go down to the lab is a daily state of the pharmacy:
    // the money is settled and nobody has started compounding yet. The backup
    // this fixture is drawn from happened not to hold one, because `U_PayedSite`
    // is only set by the website and the practitioners on credit terms had all
    // been billed — so the queue came out empty and the step that works from it
    // had nothing to work on.
    //
    // These are settled here rather than left to chance: the first three new
    // orders that have something to compound, one paid outright and the rest on
    // the practitioner's credit terms, which are the two ways the pharmacy's own
    // rule (`canSendToLab`) counts an order as settled.
    orders
        .filter(
            (order) =>
                order.status === 'pending_payment' &&
                (order.items || []).some(
                    (item) => item.kind === 'formula' && !item.cancelled,
                ),
        )
        .slice(0, 3)
        .forEach((order, i) => {
            if (i === 0) {
                order.paid = true;
                order.linkState = 'paid';
                order.status = 'paid';
            } else {
                order.credit = true;
                order.creditPaid = false;
                order.status = 'credit';
            }

            // The audit trail and its log were built from the status this
            // order had a moment ago — rebuild both so they still agree.
            order.audit = buildAudit(order);
            order.documentation = buildDocumentation(order, order.audit);
        });

    // One order on the lab bench is always urgent, so the queue's ordering and
    // the urgency marks are on screen whatever the rest of the fixture does.
    const bench = orders.find((order) => order.status === 'in_production');

    if (bench) {
        bench.urgent = true;
    }

    // The shipping station's own screen must always be able to show every one
    // of its exceptions and every reachable scan state, whichever way the
    // random sample happened to land. A 50-order draw from SAP's own history
    // can easily hold zero orders at some of these — "ארוז" is 5 orders out
    // of 355,046 system-wide — so these are forced onto specific orders
    // rather than merely searched for, the same reasoning as the lab queue
    // above (DEMO_SHIPPING_STATION_PROMPT.md §12).

    /** Fully ticks every container of an order, as of `daysAgo - 1`. */
    function fillPackChecks(order) {
        order.packChecks = orderContainers(order).flatMap((row) =>
            row.barcodes.map((barcode, i) => ({
                orderItemId: row.item.id,
                containerNo: i + 1,
                barcode,
                checkedAt: at(Math.max(0, order.daysAgo - 1), 9, 10),
                checkedBy: DEMO_ACTORS.ellaSupport,
                isManual: false,
            })),
        );
    }

    /** Orders available to repurpose for a guaranteed scenario — never one
     * already claimed by an earlier guarantee, never cancelled. */
    const claimed = new Set();

    function claimOrder(filter) {
        const found = orders.find(
            (order) =>
                !claimed.has(order.id) &&
                order.status !== 'cancelled' &&
                filter(order),
        );

        if (found) {
            claimed.add(found.id);
        }

        return found;
    }

    // A partial scan — the checklist's own k/N-not-yet-N case.
    const partialScan = claimOrder(
        (order) => order.shipTo !== 'pickup' && totalContainers(order) > 1,
    );

    if (partialScan) {
        partialScan.status = 'in_production';
        fillPackChecks(partialScan);
        partialScan.packChecks = partialScan.packChecks.slice(0, -1);
    }

    /** Forces an order onto a station status, rebuilding everything that
     * status implies — the same transform the initial pass already ran
     * (`buildStationState`/`buildAudit`/`buildDocumentation`), replayed with a
     * different outcome. A courier and tracking number from a past (real)
     * life as a shipped order are cleared unless the new status is one where
     * a link already exists — otherwise the card would show a tracking
     * number before anyone at the station linked one. */
    function promoteToStation(order, status, shipTo) {
        order.status = status;

        if (shipTo !== undefined) {
            order.shipTo = shipTo;

            if (shipTo === 'pickup') {
                order.deliveryType = 'pickup';
            }
        }

        if (!COURIER_LINKED.includes(status) || shipTo === 'pickup') {
            order.courier = null;
            order.tracking = null;
        }

        Object.assign(
            order,
            buildStationState(order, `${order.id}:station:promoted`),
        );
        order.audit = buildAudit(order);
        order.documentation = buildDocumentation(order, order.audit);
    }

    // The station has to look like a pharmacy mid-shift, not a handful of
    // leftovers — and its orders have to look like the new site's: several
    // formulas in one order, shelf products beside them. Real 2026 website
    // orders from SAP, composed as `composedOrder` describes, fill every tab
    // to about fifteen (12.11.2026).
    const taken = new Set(orders.map((order) => order.id));
    let shelfAt = 0;

    STATION_WEB_ORDERS.formulaOrders.forEach((sources, i) => {
        const plan = STATION_PLAN[i];

        if (!plan) {
            return;
        }

        // Every third order is formulas alone; the rest carry shelf products.
        const shelf =
            i % 3 === 2
                ? null
                : STATION_WEB_ORDERS.shelfDocs[
                      shelfAt++ % STATION_WEB_ORDERS.shelfDocs.length
                  ];
        const order = composedOrder(sources, shelf, practitioners, patients);

        if (taken.has(order.id)) {
            return;
        }

        taken.add(order.id);

        const slot = `${order.id}:composed`;
        const placed = at(
            spread(`${slot}:d`, plan.days[0], plan.days[1]),
            spread(`${slot}:hh`, 8, 13),
            spread(`${slot}:mm`, 0, 59),
        );

        Object.assign(order, placed, { placed });

        // Anything at the station is settled: paid, or on the practitioner's
        // credit terms, with its tax document.
        if (!order.paid && !order.credit) {
            order.paid = true;
            order.linkState = order.payer === 'patient' ? 'paid' : null;
            order.linkExpires = null;
            order.docNum = String(spread(`${slot}:doc`, 21000, 21999));
            order.docAlloc = String(
                spread(`${slot}:alloc`, 10000000, 99999999),
            );
            order.docStatus = 'issued';
            order.gcTxn = `gc_txn_${spread(`${slot}:gct`, 1000000, 9999999)}`;
        }

        order.cancelCause = null;

        if (plan.shipTo !== 'pickup') {
            order.deliveryType = 'courier';
            order.shipTo = order.payer === 'patient' ? 'patient' : 'me';
            order.addressProvided = true;
            order.courier = pickFrom(`${slot}:courier`, STATION_COURIERS);
            order.tracking = `${COURIER[order.courier].code}${spread(`${slot}:tr`, 1000000, 9999999)}IL`;
        }

        order.items = buildItems(order);
        orders.push(order);
        claimed.add(order.id);
        promoteToStation(order, plan.status, plan.shipTo);
    });

    /** A shipment row, as `linkCourier`/`enterManualTracking` would build one. */
    function shipmentFor(order, { manual = false } = {}) {
        return {
            id: `sh-${order.id}`,
            courierCode: order.courier || 'tapuz',
            status: 'active',
            trackingNumber: order.tracking,
            packagesCount: order.packagesCount || 1,
            isManual: manual,
            manualReason: manual
                ? L('תפוז לא ענה בטלפון', 'Tapuz did not answer by phone')
                : null,
            linkedAt: at(Math.max(0, order.daysAgo - 1), 11, 5),
            linkedBy: DEMO_ACTORS.ellaSupport,
            cancelledAt: null,
            cancelledBy: null,
            cancelledReason: null,
            handedAt: null,
            handedBy: null,
            pickupListId: null,
        };
    }

    // "ממתין לשליח" must always have at least one order — one of them manual.
    const awaitingAuto = claimOrder((order) => order.shipTo !== 'pickup');

    if (awaitingAuto) {
        awaitingAuto.status = 'awaiting_courier';
        fillPackChecks(awaitingAuto);
        awaitingAuto.courier = awaitingAuto.courier || 'tapuz';
        awaitingAuto.tracking =
            awaitingAuto.tracking ||
            `T${spread(`${awaitingAuto.id}:fix:tr`, 1000000, 9999999)}IL`;
        awaitingAuto.shipments = [shipmentFor(awaitingAuto)];
    }

    const awaitingManual = claimOrder((order) => order.shipTo !== 'pickup');

    if (awaitingManual) {
        awaitingManual.status = 'awaiting_courier';
        fillPackChecks(awaitingManual);
        awaitingManual.courier = awaitingManual.courier || 'tapuz';
        awaitingManual.tracking =
            awaitingManual.tracking ||
            `T${spread(`${awaitingManual.id}:fix:tr`, 1000000, 9999999)}IL`;
        awaitingManual.shipments = [
            shipmentFor(awaitingManual, { manual: true }),
        ];
    }

    // "נשלחו היום" must never open empty.
    const shippedToday = orders.find(
        (order) => order.status === 'shipped' && order.shippedAt?.daysAgo === 0,
    );
    const anyShipped =
        shippedToday ||
        claimOrder((order) => order.status === 'shipped') ||
        orders.find((order) => order.status === 'shipped');

    if (!shippedToday && anyShipped) {
        anyShipped.shippedAt = at(0, 16, 0);
        (anyShipped.shipments || []).forEach((shipment) => {
            shipment.handedAt = anyShipped.shippedAt;
        });
    }

    // An order from before `ship_to` existed — the "נמען לא ידוע" exception.
    const unknownRecipient = claimOrder(
        (order) =>
            order.shipTo &&
            order.shipTo !== 'pickup' &&
            [
                'in_production',
                'packing',
                'awaiting_courier',
                'ready_for_pickup',
            ].includes(order.status),
    );

    if (unknownRecipient) {
        unknownRecipient.shipTo = null;
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
        order.shipTo === 'patient' &&
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

    if (order.interactionFlag && order.status !== 'cancelled') {
        flags.push('interaction');
    }

    // The shipping-station exceptions (missing POA, an unknown recipient, a
    // failed courier link, stuck too long) are computed live by the station
    // itself from the order's current fields — see stores/deliveries.js —
    // rather than seeded once here, because they depend on state (a shipment's
    // last error, today's date against the status's own age) that changes
    // after the fixture is built.

    return flags;
}
