// The unified item catalogue, the preparation types, the bills of materials
// and the attached files — second-version fixture content.
//
// An item record here is SAP's item master row (OITM) for that item number,
// read straight off demo/real: names, units, flags, levels, prices, supplier
// fields, the safety limits and the consumer-site fields. The few stock rows
// the extract missed and the consumables that exist in no other list are
// filled in with the same shape.
import { familyOfCode } from '@/config/items';
import { at, chance, pickFrom, spread } from '@/demo/fixture';
import { CONSUMABLE_USAGE } from '@/demo/inventory';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_CATEGORIES from '@/demo/real/categories.json';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_TIERS from '@/demo/real/priceTiers.json';
import REAL_PRODUCTS from '@/demo/real/products.json';
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
        expiryMonths: 36,
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: true,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: true,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: true,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: true,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: true,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
        // Whether the waste of a grinding run may be folded into this type.
        acceptsWaste: false,
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
/**
 * The unit an item is bought in, given the unit it is kept in. A herb counted
 * in grams is bought by the kilo; one SAP already counts by the kilo is bought
 * by the kilo, and there is nothing to convert.
 */
const PURCHASE_UOM = { g: 'kg', ml: 'l' };

/** How many of the stock unit go into one purchase unit. */
const UOM_FACTOR = { 'kg:g': 1000, 'l:ml': 1000 };

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
 * Families whose items are sold by quantity to practitioners and therefore
 * carry a unit price and may be priced by a ladder.
 */
const SOLD_FAMILIES = [
    'herb',
    'herb_1to1',
    'extract',
    'tincture',
    'hydrosol',
    'essential_oil',
    'infused_oil',
    'homeopathy',
    'formula',
];

/** A price settles on the nearest 5 agorot. */
const round05 = (value) => Math.max(0.05, Math.round(value * 20) / 20);

/** Rough shekels per foreign unit, for a price the supplier quotes abroad. */
const TO_ILS_RATE = { ILS: 1, EUR: 4, USD: 3.7 };

/**
 * The items the pharmacy makes itself out of a bill of materials: three
 * tinctures, one ground herb, one infused oil. Chosen deterministically from
 * the stock rows so the BOM builder and the item builder agree.
 */
export function pickInternalParents(stock) {
    const byPrefix = (prefix, unit) =>
        stock
            .filter(
                (row) =>
                    String(row.sku).startsWith(prefix) &&
                    (!unit || row.unit === unit),
            )
            .sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
    const tinctures = byPrefix('20', 'l')
        .filter((row) => !/גליצרין|אלכוהול/.test(row.name.he))
        .slice(0, 3);
    const [powder] = byPrefix('11', 'kg');
    const [oil] = byPrefix('21', 'l');

    return {
        tinctures,
        powder: powder || null,
        oil: oil || null,
        all: [...tinctures, powder, oil].filter(Boolean),
    };
}

/** SAP's item master, by item number. */
const REAL_BY_CODE = new Map(
    [...REAL_INGREDIENTS, ...REAL_PRODUCTS].map((row) => [row.code, row]),
);

/** SAP's unit names → the console's unit ids. */
const SAP_UOM = {
    'ק"ג': 'kg',
    ליטר: 'l',
    'מ"ל': 'ml',
    גרם: 'g',
    "יח'": 'unit',
    יח: 'unit',
    "י''ח": 'unit',
};

/** SAP's three restriction values → the card's levels. */
const SAP_LIMIT = {
    None: 'none',
    NotRecomended: 'caution',
    NotAllowed: 'forbidden',
};

/** SAP property numbers → preparation-type ids (15, 19, 20 are flags). */
const PREP_BY_SAP = new Map(PREP_TYPES.map((type) => [type.sap, type.id]));

const yes = (value) => value === 'Y';
const sapUom = (name, fallback) =>
    SAP_UOM[String(name || '').trim()] || fallback;
const sapLimit = (value) => SAP_LIMIT[value] || null;

/** The fields an item takes straight off its SAP row. */
function fromSap(real) {
    return {
        active: yes(real.active),
        itemType: real.itemType || 'I',
        treeType: real.treeType || 'N',
        levels: { min: real.minLevel ?? null, max: real.maxLevel ?? null },
        barcode: real.barcode || null,
        catalogNum: real.supplierCatalogNum || null,
        packageSize: real.packageSize || null,
        lab: {
            alcoholPct: real.alcoholPct || null,
            extractionRatio: real.extractionRatio || null,
        },
        safety: {
            pregnancy: sapLimit(real.pregnancyLimit),
            lactation: sapLimit(real.breastfeedingLimit),
            under2: sapLimit(real.under2Limit),
        },
        prepTypes: (real.prepTypes || [])
            .map((n) => PREP_BY_SAP.get(n))
            .filter(Boolean),
        site: {
            sync: yes(real.siteSync),
            categories: [
                real.category1,
                real.category2,
                real.category3,
                real.category4,
            ].filter(Boolean),
            promo: yes(real.monthlyPromo),
            comments: real.siteComments || null,
            qty:
                real.siteQuantity != null
                    ? Number(real.siteQuantity) || null
                    : null,
            unit: sapUom(real.siteUom, null),
        },
        updated: real.updatedOn || null,
    };
}

/** The same fields for a row the extract missed: what a new SAP item starts with. */
function blankSap(row, isHerb) {
    return {
        active: true,
        itemType: 'I',
        treeType: 'N',
        levels: { min: row.min ?? null, max: null },
        barcode: null,
        catalogNum: null,
        packageSize: null,
        lab: { alcoholPct: null, extractionRatio: null },
        safety: isHerb
            ? safetyOf(row.sku)
            : { pregnancy: null, lactation: null, under2: null },
        prepTypes: isHerb ? prepTypesOf(row) : [],
        site: {
            sync: false,
            categories: [],
            promo: false,
            comments: null,
            qty: null,
            unit: null,
        },
        updated: null,
    };
}

/**
 * Build the item catalogue over the stock rows and the consumer products, plus
 * the few consumables that exist in no other list.
 *
 * One item per SKU: a shelf product that is also a stock row becomes one
 * record (`source: 'both'`). The item's code IS its SKU — SAP's item number.
 */
export function buildItems(stock, products, suppliers) {
    // SAP's consumer-site price per gram — the one real evidence of what an
    // ingredient sells for (demo/real/priceTiers.json, band 1).
    const tierPrice = new Map(
        REAL_TIERS.filter((row) => row.fromQty === 1).map((row) => [
            row.code,
            row.price,
        ]),
    );
    const usageBySku = new Map(CONSUMABLE_USAGE.map((use) => [use.sku, use]));
    const internalSkus = new Set(
        pickInternalParents(stock).all.map((row) => row.sku),
    );

    const fromStock = stock.map((row) => {
        const real = REAL_BY_CODE.get(row.sku) || null;
        // The code says what the item is. `kind` only says where it is counted,
        // and it has four values where the catalogue has twenty-three.
        const family =
            familyOfCode(row.sku) || FAMILY_OF_KIND[row.kind] || 'consumable';
        const isHerb = family === 'herb';
        const isFormula = family === 'formula';
        const stockUom = row.unit || 'unit';
        const purchaseUom = real
            ? sapUom(real.buyUom, stockUom)
            : PURCHASE_UOM[stockUom] || stockUom;
        const salesUom = real ? sapUom(real.salesUom, stockUom) : stockUom;
        const factor = UOM_FACTOR[`${purchaseUom}:${stockUom}`] || 1;
        const imported =
            !real?.lastPurchasePrice &&
            isHerb &&
            chance(`${row.sku}:imported`, 0.3);
        const supplierKind = SUPPLIER_KIND_OF_FAMILY[family] || 'raw_materials';
        const preferred = supplierOf(
            `${row.sku}:supplier`,
            suppliers,
            supplierKind,
        );
        const last = chance(`${row.sku}:lastsup`, 0.72)
            ? preferred
            : supplierOf(`${row.sku}:supplier:2`, suppliers, supplierKind);
        const usage = usageBySku.get(row.sku) || null;
        const isInternal = internalSkus.has(row.sku);
        const sells = SOLD_FAMILIES.includes(family);
        // SAP's own last purchase price where the row has one; a plausible
        // figure per purchase unit where the extract left it empty.
        const lastPurchase = isFormula
            ? null
            : real?.lastPurchasePrice
              ? real.lastPurchasePrice
              : isHerb
                ? imported
                    ? spread(`${row.sku}:price`, 30, 110)
                    : spread(`${row.sku}:price`, 120, 480)
                : family === 'consumable'
                  ? spread(`${row.sku}:price`, 20, 60)
                  : spread(`${row.sku}:price`, 12, 45) / 10;
        const currency = imported ? 'EUR' : 'ILS';
        // The unit price: SAP's own where the catalogue has one, otherwise a
        // plausible markup on what the pharmacy last paid, per sales unit.
        const sale = isFormula
            ? row.price
            : tierPrice.has(row.sku)
              ? tierPrice.get(row.sku)
              : sells && lastPurchase
                ? round05(
                      ((lastPurchase * TO_ILS_RATE[currency]) /
                          (UOM_FACTOR[`${purchaseUom}:${salesUom}`] || 1)) *
                          2.2,
                  )
                : null;

        return {
            sku: row.sku,
            code: row.sku,
            family,
            source: 'stock',
            names: {
                he: real?.nameHe || row.name.he,
                en: real ? real.nameForeign || null : row.name.en || null,
                site: real?.siteName || null,
            },
            uom: {
                purchase: purchaseUom,
                sales: salesUom,
                stock: stockUom,
                factor,
            },
            flags: {
                purchase: real
                    ? yes(real.purchase) && !isInternal
                    : !isFormula && !isInternal,
                sales: real ? yes(real.sell) : sells,
                inventory: real ? yes(real.stockTracked) : true,
                // Everything compounded is batch-managed; the supplies nobody
                // counts per order (toilet paper, gloves) are not.
                batch: real
                    ? (yes(real.batchManaged) && !usage) || isInternal
                    : !usage &&
                      (isHerb ||
                          sells ||
                          family === 'consumable' ||
                          isInternal),
                internal: isInternal,
                therapistDiscount: real ? yes(real.therapistDiscount) : false,
            },
            price: {
                sale,
                lastPurchase,
                currency,
                lastPurchaseOn: isFormula
                    ? null
                    : isoDaysAgo(spread(`${row.sku}:bought`, 8, 220)),
            },
            // The ladder that prices it: most inherit their group from the
            // code prefix; a third are fixed-price; a few name a group outright.
            priceGroup: !sells
                ? null
                : chance(`${row.sku}:pgnone`, 0.33)
                  ? 'none'
                  : family === 'tincture' && chance(`${row.sku}:pgx`, 0.15)
                    ? 'g3'
                    : null,
            // Supplies consumed by the calendar, not by orders.
            consumption: usage
                ? {
                      mode: 'time',
                      qty: usage.qty,
                      periodDays: usage.periodDays,
                      countedOn: isoDaysAgo(usage.countedDaysAgo),
                      countedQty: usage.countedQty,
                  }
                : null,
            suppliers: isFormula
                ? { preferred: null, last: null }
                : { preferred, last },
            ...(real ? fromSap(real) : blankSap(row, isHerb)),
            created: row.created,
        };
    });

    const fromProducts = products.map((product) => {
        const real = REAL_BY_CODE.get(product.sku) || null;
        // Family 50 is what the pharmacy makes; 55 and 16 are bought in.
        const family =
            product.family || familyOfCode(product.sku) || 'bought_shelf';
        const house = family === 'shelf';
        const preferred = house
            ? null
            : supplierOf(`${product.sku}:supplier`, suppliers, 'raw_materials');
        const stockUom = real ? sapUom(real.stockUom, 'unit') : 'unit';

        return {
            sku: product.sku,
            code: product.sku,
            family,
            source: 'product',
            names: {
                he: real?.nameHe || product.name.he,
                en: real ? real.nameForeign || null : product.name.en || null,
                site: real?.siteName || product.name.he,
            },
            uom: {
                purchase: real ? sapUom(real.buyUom, stockUom) : 'unit',
                sales: real ? sapUom(real.salesUom, stockUom) : 'unit',
                stock: stockUom,
                factor: 1,
            },
            flags: {
                purchase: real ? yes(real.purchase) : !house,
                sales: real ? yes(real.sell) : true,
                inventory: real ? yes(real.stockTracked) : true,
                batch: real ? yes(real.batchManaged) : house,
                // A shelf product is made ahead of time from its recipe, but it
                // is a product, not a component of anything else.
                internal: false,
                therapistDiscount: real
                    ? yes(real.therapistDiscount)
                    : chance(`${product.sku}:tdisc`, 0.35),
            },
            price: {
                sale: product.net,
                lastPurchase: house
                    ? null
                    : (real?.lastPurchasePrice ??
                      spread(`${product.sku}:price`, 18, 60)),
                currency: 'ILS',
                lastPurchaseOn: house
                    ? null
                    : isoDaysAgo(spread(`${product.sku}:bought`, 5, 160)),
            },
            // A shelf product is sold at one price whatever the quantity.
            priceGroup: 'none',
            consumption: null,
            suppliers: { preferred, last: preferred },
            ...(real
                ? fromSap(real)
                : blankSap(
                      { sku: product.sku, min: product.minStock ?? null },
                      false,
                  )),
            created: product.created,
        };
    });

    // Received and never deducted: the supplies that have no SAP stock row.
    const standalone = [
        {
            sku: '300951',
            family: 'consumable',
            names: { he: 'כפפות ניטריל M', en: 'Nitrile gloves M', site: null },
            uom: {
                purchase: 'pack',
                sales: 'unit',
                stock: 'unit',
                factor: 100,
            },
            supplierKind: 'packaging',
            lastPurchase: 42,
        },
        {
            sku: '470951',
            family: 'packaging',
            names: {
                he: 'מדבקות מדפסת 60×40 (גליל)',
                en: 'Printer labels 60×40 (roll)',
                site: null,
            },
            uom: {
                purchase: 'pack',
                sales: 'unit',
                stock: 'unit',
                factor: 1000,
            },
            supplierKind: 'packaging',
            lastPurchase: 68,
        },
        {
            sku: '480951',
            family: 'admin',
            names: { he: 'נייר A4 (חבילה)', en: 'A4 paper (pack)', site: null },
            uom: {
                purchase: 'pack',
                sales: 'unit',
                stock: 'unit',
                factor: 500,
            },
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
            code: item.sku,
            source: 'item',
            flags: {
                purchase: true,
                sales: false,
                inventory: false,
                batch: false,
                internal: false,
                therapistDiscount: false,
            },
            priceGroup: null,
            consumption: null,
            price: {
                sale: null,
                lastPurchase,
                currency: 'ILS',
                lastPurchaseOn: isoDaysAgo(spread(`${item.sku}:bought`, 3, 90)),
            },
            suppliers: { preferred, last: preferred },
            ...blankSap({ sku: item.sku, min: null }, false),
            created: isoDaysAgo(spread(`${item.sku}:created`, 100, 600)),
        };
    });

    // One record per SKU: a product that is also a stock row folds its site
    // side into the stock row's item.
    const bySku = new Map(fromStock.map((item) => [item.sku, item]));
    const productOnly = [];

    fromProducts.forEach((product) => {
        const twin = bySku.get(product.sku);

        if (!twin) {
            productOnly.push(product);

            return;
        }

        Object.assign(twin, {
            source: 'both',
            names: { ...twin.names, site: product.names.site },
            flags: {
                ...twin.flags,
                sales: true,
                batch: twin.flags.batch || product.flags.batch,
                therapistDiscount: product.flags.therapistDiscount,
            },
            price: { ...twin.price, sale: product.price.sale },
            site: product.site,
            priceGroup: 'none',
        });
    });

    const items = [...fromStock, ...productOnly, ...standalone];
    const seen = new Set();

    items.forEach((item) => {
        if (seen.has(item.sku)) {
            throw new Error(`buildItems: duplicate sku ${item.sku}`);
        }

        seen.add(item.sku);
    });

    return items;
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
    const alcohol = stock.find((row) => row.sku === '300901');
    const glycerin = stock.find((row) => row.sku === '300902');
    const carrier = stock.find((row) => row.sku === '300903');
    const bottle100 = stock.find((row) => row.sku === '400101');
    const bottle50 = stock.find((row) => row.sku === '400102');

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

    const trees = parents.map((parent, i) => {
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
            // What the recipe produces — it decides the shelf life of a batch
            // made from it.
            prepType: parent.liquid
                ? parent.oil
                    ? 'infused_oil'
                    : 'tincture'
                : 'capsule',
            expectedWastePct: null,
            version: 1,
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

    // The recipes of what the pharmacy makes for its own shelves: a tincture
    // is herb macerated in alcohol and glycerin, a 1:1 is the herb ground, an
    // infused oil is herb steeped in a carrier. Yields are one production run.
    const internal = pickInternalParents(stock);
    const dried = herbs.filter((row) => String(row.sku).startsWith('10'));
    const herbFor = (row, k) => dried[(k * 7) % dried.length] || herbs[0];
    const internalTrees = [];
    const tree = (parent, prepType, components, extra) => {
        internalTrees.push({
            id: `bom-${trees.length + internalTrees.length + 1}`,
            parentSku: parent.sku,
            name: parent.name,
            cn: parent.cn || null,
            prepType,
            components,
            alcoholPct: null,
            oilPct: null,
            ratio: null,
            notes: null,
            version: 1,
            updated: at(spread(`bom:${parent.sku}:upd`, 10, 200), 10, 30),
            updatedBy: pickFrom(`bom:${parent.sku}:by`, BOM_EDITORS),
            ...extra,
        });
    };

    internal.tinctures.forEach((parent, k) => {
        const herb = herbFor(parent, k);

        tree(
            parent,
            'tincture',
            [
                { sku: herb.sku, qty: 200, uom: 'g', issue: 'backflush' },
                ...(alcohol
                    ? [
                          {
                              sku: alcohol.sku,
                              qty: 700,
                              uom: 'ml',
                              issue: 'backflush',
                          },
                      ]
                    : []),
                ...(glycerin
                    ? [
                          {
                              sku: glycerin.sku,
                              qty: 100,
                              uom: 'ml',
                              issue: 'backflush',
                          },
                      ]
                    : []),
            ],
            {
                alcoholPct: 40,
                ratio: '1:5',
                yield: { qty: 1000, uom: 'ml' },
                expectedWastePct: 5,
                notes: L(
                    'להשרות 14 יום, לסנן פעמיים',
                    'Macerate 14 days, filter twice',
                ),
            },
        );
    });

    if (internal.powder) {
        tree(
            internal.powder,
            'powder',
            [
                {
                    sku: herbFor(internal.powder, 1).sku,
                    qty: 1100,
                    uom: 'g',
                    issue: 'backflush',
                },
            ],
            { yield: { qty: 1000, uom: 'g' }, expectedWastePct: 12 },
        );
    }

    if (internal.oil && carrier) {
        tree(
            internal.oil,
            'infused_oil',
            [
                {
                    sku: herbFor(internal.oil, 3).sku,
                    qty: 150,
                    uom: 'g',
                    issue: 'backflush',
                },
                { sku: carrier.sku, qty: 900, uom: 'ml', issue: 'backflush' },
            ],
            {
                oilPct: 100,
                yield: { qty: 1000, uom: 'ml' },
                expectedWastePct: 8,
            },
        );
    }

    return [...trees, ...internalTrees];
}

// ------------------------------------------------------------ attachments

const UPLOADERS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.amit,
    DEMO_ACTORS.hadarMizrahi,
];

/**
 * The sample documents under public/demo/files, relative to the deploy base —
 * the store prefixes BASE_URL when it resolves a record's url. One stands in
 * for every file of its kind: a certificate of analysis, an instruction sheet,
 * a supplier's receipt, a photo. Word and Excel have no sample: those records
 * carry no url and the viewer says so.
 */
const SAMPLE = {
    coa: 'demo/files/coa-sample.pdf',
    instructions: 'demo/files/instruction-sheet.pdf',
    receipt: 'demo/files/supplier-receipt.pdf',
    photo: 'demo/files/photo-sample.svg',
};

/**
 * Files on record. In the fixture a file is its metadata — name, type, size, who
 * and when — plus the sample document that opens for it; storage belongs to the
 * API. Spread over the entity types the spec asks for so every "files" panel has
 * something to show.
 */
export function buildAttachments(stock, batches) {
    const herbs = stock.filter((row) => row.kind === 'raw');
    const rows = [];
    const add = (
        entity,
        ref,
        name,
        type,
        sizeKb,
        daysAgo,
        url = null,
        note = null,
    ) => {
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
            url,
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
            SAMPLE.instructions,
            L('גרסת המעבדה, מאי 2026', 'Lab version, May 2026'),
        );
        add(
            'item',
            herbs[0].sku,
            'monograph-EMA-2019.pdf',
            'pdf',
            1840,
            210,
            SAMPLE.instructions,
        );
    }

    if (herbs[2]) {
        add(
            'item',
            herbs[2].sku,
            'COA-2026-04.pdf',
            'pdf',
            268,
            31,
            SAMPLE.coa,
        );
    }

    if (batches[0]) {
        add(
            'batch',
            batches[0].id,
            `COA-${batches[0].supplierBatch}.pdf`,
            'pdf',
            296,
            batches[0].received.daysAgo,
            SAMPLE.coa,
        );
        add(
            'batch',
            batches[0].id,
            'תמונת אריזה בקבלה.svg',
            'svg',
            64,
            batches[0].received.daysAgo,
            SAMPLE.photo,
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
            SAMPLE.coa,
        );
    }

    add(
        'supplier',
        'S-104',
        'הסכם סודיות — עלה ירוק.pdf',
        'pdf',
        188,
        380,
        SAMPLE.receipt,
    );
    add(
        'supplier',
        'S-104',
        'חוזה מסגרת 2026.pdf',
        'pdf',
        742,
        92,
        SAMPLE.receipt,
    );
    add(
        'supplier',
        'S-131',
        'רישיון אלכוהול רפואי 2026.pdf',
        'pdf',
        156,
        120,
        SAMPLE.receipt,
    );
    add('supplier', 'S-118', 'מחירון ספק 2026.xlsx', 'xlsx', 88, 45);

    return rows;
}
