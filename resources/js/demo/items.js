// The unified item catalogue, the managed preparation types, the bills of
// materials and the attached files — second-version fixture content.
//
// Items here do not replace the stock rows or the products: each item record
// EXTENDS one of them (matched by sku) with what the first version never held —
// three-language names, purchase vs sales units, flags, last purchase price,
// suppliers, preparation suitability, safety restrictions, the two kinds of note,
// the consumer-site fields and a shelf location. A few items stand alone with no
// stock row at all: consumables that are received and never deducted.
import { familyOfCode, ITEM_FAMILY } from '@/config/items';
import { at, chance, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_CATEGORIES from '@/demo/real/categories.json';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

// ---------------------------------------------------------------- site tree

/** SAP's four top-level categories, in the order `@CATEGORIES` numbers them. */
const CATEGORY_BRANCH = {
    1: 'condition',
    2: 'system',
    3: 'chinese_series',
    4: 'mushroom',
};

/**
 * The consumer site's category tree, as `@CATEGORIES` holds it: four branches
 * and the 67 categories under them, keyed by the dotted code the product cards
 * themselves carry. The branch is the group — a code's own first segment says
 * which one it belongs to.
 */
export const SITE_CATEGORIES = REAL_CATEGORIES.filter((category) =>
    category.code.includes('.'),
).map((category) => ({
    id: category.code,
    group: CATEGORY_BRANCH[category.code.split('.')[0]],
    name: L(category.name),
}));

// ------------------------------------------------------------- prep types

/**
 * The preparation types, as `OITG` holds them.
 *
 * SAP carries seventeen item properties, and fourteen of them are preparation
 * types; 15, 19 and 20 (`מוצרי מדף`, `רשאי להנחת מוצר למטפלים`,
 * `מבצע החודש`) are flags on an item, not ways of making one, so they are not
 * here. `sap` is the property number each type answers to.
 *
 * Evaporation is one type, not four. SAP has a single `טינקטורה בנידוף`, and
 * what it is carried in — glycerin, honey, carob, molasses — is the order's own
 * answer on the formula's `evap` field. The four separate types this console
 * used to carry said the same thing twice.
 *
 * The nine the first version knew keep their ids, so every existing order still
 * resolves; `legacy` marks them. Everything a label needs per type — the fixed
 * text, the default shelf life, what it contains — is data here, edited in the
 * console, never a constant in code. `recipe` is the mechanics for the lab's
 * method (step, minutes); its content comes from the lab and is empty until it
 * does.
 */
export const PREP_TYPES = [
    {
        id: 'tincture',
        sap: 1,
        legacy: true,
        name: L('טינקטורה', 'Tincture'),
        unit: 'ml',
        expiryMonths: 24,
        labelText: L('לנער לפני שימוש', 'Shake before use'),
        contains: ['alcohol', 'water'],
        recipe: [],
    },
    {
        id: 'evap_tincture',
        sap: 2,
        legacy: false,
        name: L('טינקטורה בנידוף', 'Evaporated tincture'),
        unit: 'ml',
        expiryMonths: 12,
        labelText: L(
            'לנער לפני שימוש · לשמור בקירור לאחר פתיחה',
            'Shake before use · refrigerate after opening',
        ),
        // What the evaporation is carried in belongs to the order, not to the
        // type — the formula's `evap` field names it.
        contains: ['water'],
        recipe: [],
    },
    {
        id: 'capsule',
        sap: 5,
        legacy: true,
        name: L('קפסולות', 'Capsules'),
        unit: 'capsule',
        expiryMonths: 24,
        labelText: null,
        contains: [],
        recipe: [],
    },
    {
        id: 'powder',
        sap: 6,
        legacy: true,
        name: L('אבקה', 'Powder'),
        unit: 'g',
        expiryMonths: 24,
        labelText: null,
        contains: [],
        recipe: [],
    },
    {
        id: 'tea',
        sap: 7,
        legacy: true,
        name: L('חליטה Raw', 'Raw infusion'),
        unit: 'g',
        expiryMonths: 12,
        labelText: L('לשמור בקירור לאחר פתיחה', 'Refrigerate after opening'),
        contains: [],
        recipe: [],
    },
    {
        id: 'decoction',
        sap: 4,
        legacy: true,
        name: L('TANG — בישול אישי', 'TANG — personal decoction'),
        unit: 'ml',
        expiryMonths: 6,
        labelText: L(
            'לנער לפני שימוש · לשמור בקירור לאחר פתיחה',
            'Shake before use · refrigerate after opening',
        ),
        contains: ['water'],
        recipe: [],
    },
    {
        id: 'classic_tincture',
        sap: 8,
        legacy: false,
        name: L(
            'הרכב סיני קלאסי — טינקטורה',
            'Classic Chinese formula — tincture',
        ),
        unit: 'ml',
        expiryMonths: 24,
        labelText: L('לנער לפני שימוש', 'Shake before use'),
        contains: ['alcohol', 'water'],
        recipe: [],
    },
    {
        id: 'classic_powder',
        sap: 9,
        legacy: false,
        name: L('הרכב סיני קלאסי — אבקה', 'Classic Chinese formula — powder'),
        unit: 'g',
        expiryMonths: 24,
        labelText: null,
        contains: [],
        recipe: [],
    },
    {
        id: 'cream',
        sap: 11,
        legacy: true,
        name: L('קרם', 'Cream'),
        unit: 'g',
        expiryMonths: 12,
        labelText: L('לשימוש חיצוני בלבד', 'External use only'),
        contains: ['oil', 'water'],
        recipe: [],
    },
    {
        id: 'gel',
        sap: 12,
        legacy: true,
        name: L('ג׳ל', 'Gel'),
        unit: 'g',
        expiryMonths: 12,
        labelText: L('לשימוש חיצוני בלבד', 'External use only'),
        contains: ['water'],
        recipe: [],
    },
    {
        id: 'infused_oil',
        sap: 3,
        legacy: true,
        name: L('שמן מושרה', 'Infused oil'),
        unit: 'ml',
        expiryMonths: 12,
        labelText: L('לשימוש חיצוני בלבד', 'External use only'),
        contains: ['oil'],
        recipe: [],
    },
    {
        id: 'essential_oil',
        sap: 13,
        legacy: true,
        name: L('שמן אתרי', 'Essential oil'),
        unit: 'ml',
        expiryMonths: 36,
        labelText: L(
            'לא לשימוש פנימי · להרחיק מעיניים',
            'Not for internal use · keep away from eyes',
        ),
        contains: ['oil'],
        recipe: [],
    },
    {
        id: 'hydrosol',
        sap: 14,
        legacy: false,
        name: L('הידרוסול', 'Hydrosol'),
        unit: 'ml',
        expiryMonths: 12,
        labelText: L('לשמור בקירור', 'Keep refrigerated'),
        contains: ['water'],
        recipe: [],
    },
    {
        id: 'suppository',
        sap: 17,
        legacy: false,
        name: L('נרות', 'Suppositories'),
        unit: 'unit',
        expiryMonths: 6,
        labelText: L('לשמור בקירור', 'Keep refrigerated'),
        contains: ['oil'],
        recipe: [],
    },
];

/** Which preparation types a herb of each tradition is offered for. */
const WESTERN_PREP = [
    'tincture',
    'powder',
    'capsule',
    'tea',
    'evap_tincture',
    'infused_oil',
];
const CHINESE_PREP = [
    'classic_tincture',
    'classic_powder',
    'decoction',
    'powder',
];

// ------------------------------------------------------------------ items

/** Stock kind → item family. Shelf stock rows are the pharmacy's own formulas. */
const FAMILY_OF_KIND = {
    raw: 'herb',
    base: 'consumable',
    pack: 'packaging',
    shelf: 'formula',
};

/** Which supplier category each family buys from. */
const SUPPLIER_KIND_OF_FAMILY = {
    herb: 'raw_materials',
    consumable: 'bases_alcohol',
    packaging: 'packaging',
    bought_shelf: 'raw_materials',
    admin: 'services',
};

const INTERNAL_NOTES = [
    null,
    null,
    L(
        'פחת של כ-20% בטחינה — להזמין בהתאם',
        'About 20% loss in grinding — order accordingly',
    ),
    L(
        'הספק מחליף מקור לפי עונה — לבדוק COA בכל קבלה',
        'The supplier changes origin by season — check the COA on every receipt',
    ),
    null,
    L('נמכר גם למטפלים בתפזורת', 'Also sold loose to practitioners'),
];

const PRODUCTION_NOTES = [
    null,
    L('לטחון לפני שימוש', 'Grind before use'),
    L('לסנן פעמיים', 'Filter twice'),
    null,
    L('לא לחמם מעל 40°', 'Do not heat above 40°'),
];

const MARKETING = [
    L(
        'פורמולה מסורתית בהכנה ידנית, בבקבוק זכוכית כהה.',
        'A traditional formula, prepared by hand, in an amber glass bottle.',
    ),
    L(
        'ללא חומרים משמרים · טבעוני · מיוצר בישראל.',
        'No preservatives · vegan · made in Israel.',
    ),
    L(
        'מומלץ על ידי מטפלים. מתאים לשימוש יומיומי.',
        'Recommended by practitioners. Suitable for daily use.',
    ),
];

/** `10` + `0012` → `100012`. */
function itemCode(family, n) {
    return `${ITEM_FAMILY[family].prefix}${String(n).padStart(4, '0')}`;
}

/** Deterministic pick of one supplier of a kind, or the first supplier at all. */
function supplierOf(slot, suppliers, kind) {
    const pool = suppliers.filter((supplier) => supplier.kind === kind);

    return pickFrom(slot, pool.length ? pool : suppliers).code;
}

function safetyOf(sku) {
    const level = (ctx) =>
        pickFrom(`${sku}:safety:${ctx}`, [
            'none',
            'none',
            'none',
            'none',
            'caution',
            'none',
            'forbidden',
            'caution',
        ]);

    return {
        pregnancy: level('pregnancy'),
        lactation: level('lactation'),
        under2: level('under2'),
    };
}

function prepTypesOf(row) {
    const pool = row.system === 'chinese' ? CHINESE_PREP : WESTERN_PREP;
    const picked = pool.filter((id) => chance(`${row.sku}:prep:${id}`, 0.55));

    return picked.length ? picked : [pool[0]];
}

/**
 * Build the item catalogue over the stock rows and the consumer products, plus
 * the few consumables that exist in no other list.
 */
export function buildItems(stock, products, suppliers) {
    const perFamily = {};
    const nextCode = (family) => {
        perFamily[family] = (perFamily[family] || 0) + 1;

        return itemCode(family, perFamily[family]);
    };

    const fromStock = stock.map((row, i) => {
        // The code says what the item is. `kind` only says where it is counted,
        // and it has four values where the catalogue has twenty-three.
        const family =
            familyOfCode(row.sku) || FAMILY_OF_KIND[row.kind] || 'consumable';
        const isHerb = family === 'herb';
        const isFormula = family === 'formula';
        const purchaseUom = isHerb
            ? 'kg'
            : family === 'consumable'
              ? 'l'
              : family === 'packaging'
                ? 'pack'
                : 'unit';
        const factor =
            isHerb || family === 'consumable'
                ? 1000
                : family === 'packaging'
                  ? spread(`${row.sku}:factor`, 1, 5) * 100
                  : 1;
        const imported = isHerb && chance(`${row.sku}:imported`, 0.3);
        const supplierKind = SUPPLIER_KIND_OF_FAMILY[family] || 'raw_materials';
        const preferred = supplierOf(
            `${row.sku}:supplier`,
            suppliers,
            supplierKind,
        );
        const last = chance(`${row.sku}:lastsup`, 0.72)
            ? preferred
            : supplierOf(`${row.sku}:supplier:2`, suppliers, supplierKind);
        const missingLat = isHerb && i % 11 === 5;
        const missingLocation = isHerb && i % 7 === 3;

        return {
            sku: row.sku,
            code: nextCode(family),
            family,
            source: 'stock',
            names: {
                he: row.name.he,
                en: row.name.en,
                lat: missingLat ? null : row.lat,
                cn: row.cn || null,
                site: isFormula
                    ? `${row.name.he} · ${row.size} ${row.sizeUnit}`
                    : null,
            },
            uom: { purchase: purchaseUom, sales: row.unit, factor },
            flags: {
                purchase: !isFormula,
                sales: isHerb || isFormula,
                inventory: true,
                batch: isHerb || family === 'consumable' || isFormula,
                consumable: false,
            },
            price: {
                sale: isFormula ? row.price : null,
                lastPurchase: isFormula
                    ? null
                    : isHerb
                      ? imported
                          ? spread(`${row.sku}:price`, 30, 110)
                          : spread(`${row.sku}:price`, 120, 480)
                      : family === 'consumable'
                        ? spread(`${row.sku}:price`, 20, 60)
                        : spread(`${row.sku}:price`, 12, 45) / 10,
                currency: imported ? 'EUR' : 'ILS',
                lastPurchaseOn: isFormula
                    ? null
                    : isoDaysAgo(spread(`${row.sku}:bought`, 8, 220)),
            },
            suppliers: isFormula
                ? { preferred: null, last: null }
                : { preferred, last },
            prepTypes: isHerb ? prepTypesOf(row) : [],
            safety: isHerb
                ? safetyOf(row.sku)
                : { pregnancy: null, lactation: null, under2: null },
            notes: {
                internal: isHerb
                    ? pickFrom(`${row.sku}:note:int`, INTERNAL_NOTES)
                    : null,
                production: isHerb
                    ? pickFrom(`${row.sku}:note:prod`, PRODUCTION_NOTES)
                    : null,
            },
            site: {
                sync: isFormula && chance(`${row.sku}:sync`, 0.6),
                categories: isFormula
                    ? [pickFrom(`${row.sku}:cat`, SITE_CATEGORIES).id]
                    : [],
                promo: isFormula && chance(`${row.sku}:promo`, 0.2),
                marketing: isFormula
                    ? pickFrom(`${row.sku}:mkt`, MARKETING)
                    : null,
                qty: isFormula ? row.size : null,
                unit: isFormula ? row.sizeUnit : null,
            },
            location: missingLocation
                ? null
                : isHerb
                  ? {
                        cabinet: spread(`${row.sku}:cab`, 1, 6),
                        shelf: spread(`${row.sku}:shelf`, 1, 5),
                    }
                  : family === 'consumable'
                    ? { cabinet: 7, shelf: spread(`${row.sku}:shelf`, 1, 2) }
                    : isFormula
                      ? { cabinet: 8, shelf: spread(`${row.sku}:shelf`, 1, 3) }
                      : null,
            waived: missingLat ? ['lat'] : [],
            created: row.created,
        };
    });

    const fromProducts = products.map((product) => {
        // Family 50 is what the pharmacy makes; 55 and 16 are bought in.
        const family =
            product.family || familyOfCode(product.sku) || 'bought_shelf';
        const house = family === 'shelf';
        const preferred = house
            ? null
            : supplierOf(`${product.sku}:supplier`, suppliers, 'raw_materials');
        // A product's labels are its site categories: SAP files both under
        // the same `@CATEGORIES` code.
        const categories = product.labels.slice(0, 4);

        return {
            sku: product.sku,
            code: nextCode(family),
            family,
            source: 'product',
            names: {
                he: product.name.he,
                en: product.name.en,
                lat: null,
                cn: null,
                site: product.content
                    ? `${product.name.he} · ${product.content.he}`
                    : product.name.he,
            },
            uom: { purchase: 'unit', sales: 'unit', factor: 1 },
            flags: {
                purchase: !house,
                sales: true,
                inventory: true,
                batch: house,
                consumable: false,
            },
            price: {
                sale: product.net,
                lastPurchase: house
                    ? null
                    : spread(`${product.sku}:price`, 18, 60),
                currency: 'ILS',
                lastPurchaseOn: house
                    ? null
                    : isoDaysAgo(spread(`${product.sku}:bought`, 5, 160)),
            },
            suppliers: { preferred, last: preferred },
            prepTypes: [],
            safety: { pregnancy: null, lactation: null, under2: null },
            notes: { internal: null, production: null },
            site: {
                sync: product.status === 'published',
                categories,
                promo: chance(`${product.sku}:promo`, 0.15),
                marketing: pickFrom(`${product.sku}:mkt`, MARKETING),
                qty: product.wVal,
                unit: product.wUom,
            },
            location: null,
            waived: [],
            created: product.created,
        };
    });

    // Received and never deducted: the "consumable" kind the spec asked for.
    const standalone = [
        {
            sku: 'CS-9001',
            family: 'consumable',
            names: {
                he: 'כפפות ניטריל M',
                en: 'Nitrile gloves M',
                lat: null,
                cn: null,
                site: null,
            },
            uom: { purchase: 'pack', sales: 'unit', factor: 100 },
            supplierKind: 'packaging',
            lastPurchase: 42,
        },
        {
            sku: 'CS-9002',
            family: 'packaging',
            names: {
                he: 'מדבקות מדפסת 60×40 (גליל)',
                en: 'Printer labels 60×40 (roll)',
                lat: null,
                cn: null,
                site: null,
            },
            uom: { purchase: 'pack', sales: 'unit', factor: 1000 },
            supplierKind: 'packaging',
            lastPurchase: 68,
        },
        {
            sku: 'AD-9101',
            family: 'admin',
            names: {
                he: 'נייר A4 (חבילה)',
                en: 'A4 paper (pack)',
                lat: null,
                cn: null,
                site: null,
            },
            uom: { purchase: 'pack', sales: 'unit', factor: 500 },
            supplierKind: 'services',
            lastPurchase: 24,
        },
    ].map(({ supplierKind, lastPurchase, ...item }) => {
        const preferred = supplierOf(
            `${item.sku}:supplier`,
            suppliers,
            supplierKind,
        );

        return {
            ...item,
            code: nextCode(item.family),
            source: 'item',
            flags: {
                purchase: true,
                sales: false,
                inventory: false,
                batch: false,
                consumable: true,
            },
            price: {
                sale: null,
                lastPurchase,
                currency: 'ILS',
                lastPurchaseOn: isoDaysAgo(spread(`${item.sku}:bought`, 3, 90)),
            },
            suppliers: { preferred, last: preferred },
            prepTypes: [],
            safety: { pregnancy: null, lactation: null, under2: null },
            notes: { internal: null, production: null },
            site: {
                sync: false,
                categories: [],
                promo: false,
                marketing: null,
                qty: null,
                unit: null,
            },
            location: null,
            waived: [],
            created: isoDaysAgo(spread(`${item.sku}:created`, 100, 600)),
        };
    });

    return [...fromStock, ...fromProducts, ...standalone];
}

// ------------------------------------------------------------------- BOMs

const BOM_EDITORS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.amit,
    DEMO_ACTORS.hadarMizrahi,
];

/**
 * Bills of materials, on the SAP model: a parent item and its components with a
 * quantity per one unit of parent, plus the tincture-maker's attributes —
 * alcohol %, oil %, extraction ratio — and a Chinese description where one exists.
 * One tree per house-made shelf item, so "find the parent by its child" has
 * something to find.
 */
export function buildBoms(stock, products) {
    const herbs = stock.filter((row) => row.kind === 'raw');
    const alcohol = stock.find((row) => row.sku === 'BS-2001');
    const glycerin = stock.find((row) => row.sku === 'BS-2002');
    const bottle100 = stock.find((row) => row.sku === 'PK-3001');
    const bottle50 = stock.find((row) => row.sku === 'PK-3002');

    const parents = [
        ...stock
            .filter((row) => row.kind === 'shelf')
            .map((row) => ({
                sku: row.sku,
                name: row.name,
                liquid: row.sizeUnit === 'ml',
                size: row.size,
                oil: /שמן/.test(row.name.he),
                cn: row.sku === 'TRF-119-208' ? '逍遙散 · Xiāo Yáo Sǎn' : null,
            })),
        ...products
            .filter((product) => product.family === 'shelf')
            .map((product) => ({
                sku: product.sku,
                name: product.name,
                liquid: product.wUom === 'ml',
                size: product.wVal,
                oil: /שמן/.test(product.name.he),
                cn: null,
            })),
    ];

    if (!herbs.length) {
        return [];
    }

    return parents.map((parent, i) => {
        const slot = `bom:${parent.sku}`;
        const count = spread(`${slot}:n`, 2, 4);
        const picked = [];

        for (let k = 0; picked.length < count && k < herbs.length * 2; k += 1) {
            const herb = pickFrom(`${slot}:herb:${k}`, herbs);

            if (!picked.includes(herb)) {
                picked.push(herb);
            }
        }

        const components = picked.map((herb, k) => ({
            sku: herb.sku,
            qty: spread(`${slot}:qty:${k}`, 8, 40),
            uom: 'g',
            issue: 'backflush',
        }));

        if (parent.liquid && !parent.oil && alcohol) {
            components.push({
                sku: alcohol.sku,
                qty: Math.round(parent.size * 0.8),
                uom: 'ml',
                issue: 'backflush',
            });
        }

        if (
            parent.liquid &&
            !parent.oil &&
            glycerin &&
            chance(`${slot}:glyc`, 0.4)
        ) {
            components.push({
                sku: glycerin.sku,
                qty: Math.round(parent.size * 0.2),
                uom: 'ml',
                issue: 'backflush',
            });
        }

        const bottle = parent.size > 50 ? bottle100 : bottle50;

        if (parent.liquid && bottle) {
            components.push({
                sku: bottle.sku,
                qty: 1,
                uom: 'unit',
                issue: 'manual',
            });
        }

        return {
            id: `bom-${i + 1}`,
            parentSku: parent.sku,
            name: parent.name,
            cn: parent.cn,
            components,
            alcoholPct:
                parent.liquid && !parent.oil
                    ? pickFrom(`${slot}:alc`, [25, 40, 40, 50, 60])
                    : null,
            oilPct: parent.oil ? pickFrom(`${slot}:oil`, [95, 100]) : null,
            ratio: parent.liquid
                ? pickFrom(`${slot}:ratio`, ['1:3', '1:3', '1:5', '1:4'])
                : null,
            yield: { qty: 1, uom: 'unit' },
            notes: chance(`${slot}:note`, 0.3)
                ? L(
                      'לתת למצה לעמוד 14 יום לפני סינון',
                      'Let the macerate stand 14 days before filtering',
                  )
                : null,
            updated: at(
                spread(`${slot}:upd`, 5, 400),
                spread(`${slot}:hh`, 9, 17),
                spread(`${slot}:mm`, 0, 59),
            ),
            updatedBy: pickFrom(`${slot}:by`, BOM_EDITORS),
        };
    });
}

// ------------------------------------------------------------ attachments

const UPLOADERS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.amit,
    DEMO_ACTORS.hadarMizrahi,
];

/**
 * Files on record. In the fixture a file is its metadata — name, type, size, who
 * and when; storage belongs to the API. Spread over the entity types the spec
 * asks for so every "files" panel has something to show.
 */
export function buildAttachments(stock, batches) {
    const herbs = stock.filter((row) => row.kind === 'raw');
    const rows = [];
    const add = (entity, ref, name, type, sizeKb, daysAgo, note = null) => {
        rows.push({
            id: `att-${rows.length + 1}`,
            entity,
            ref,
            name,
            type,
            sizeKb,
            by: pickFrom(`att:${rows.length}:by`, UPLOADERS),
            when: at(
                daysAgo,
                spread(`att:${rows.length}:hh`, 9, 17),
                spread(`att:${rows.length}:mm`, 0, 59),
            ),
            note,
        });
    };

    if (herbs[0]) {
        add(
            'item',
            herbs[0].sku,
            `דף הוראות — ${herbs[0].name.he}.pdf`,
            'pdf',
            412,
            64,
            L('גרסת המעבדה, מאי 2026', 'Lab version, May 2026'),
        );
        add('item', herbs[0].sku, 'monograph-EMA-2019.pdf', 'pdf', 1840, 210);
    }

    if (herbs[2]) {
        add('item', herbs[2].sku, 'COA-2026-04.pdf', 'pdf', 268, 31);
    }

    if (batches[0]) {
        add(
            'batch',
            batches[0].id,
            `COA-${batches[0].supplierBatch}.pdf`,
            'pdf',
            296,
            batches[0].received.daysAgo,
        );
    }

    if (batches[4]) {
        add(
            'batch',
            batches[4].id,
            `COA-${batches[4].supplierBatch}.pdf`,
            'pdf',
            301,
            batches[4].received.daysAgo,
        );
    }

    add('supplier', 'S-104', 'הסכם סודיות — עלה ירוק.pdf', 'pdf', 188, 380);
    add('supplier', 'S-104', 'חוזה מסגרת 2026.pdf', 'pdf', 742, 92);
    add('supplier', 'S-131', 'רישיון אלכוהול רפואי 2026.pdf', 'pdf', 156, 120);
    add('supplier', 'S-118', 'מחירון ספק 2026.xlsx', 'xlsx', 88, 45);

    return rows;
}
