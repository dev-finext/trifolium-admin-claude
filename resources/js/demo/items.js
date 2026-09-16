// The unified item catalogue, the preparation types, the bills of materials
// and the attached files — second-version fixture content.
//
// An item record here is SAP's item master row (OITM) for that item number,
// read straight off demo/real: names, units, flags, levels, prices, supplier
// fields, the safety limits and the consumer-site fields. The few stock rows
// the extract missed and the consumables that exist in no other list are
// filled in with the same shape.
import { familyOfCode, UOM_BY_NAME, UOM_BY_SAP } from '@/config/items';
import { at, chance, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_CATEGORIES from '@/demo/real/categories.json';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_PRODUCTS from '@/demo/real/products.json';
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

/**
 * The items the pharmacy makes itself out of a bill of materials: three
 * tinctures, one ground herb, one infused oil. Chosen deterministically from
 * the stock rows so the BOM builder and the production runs agree.
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

// ------------------------------------------------------------------ items

/**
 * The item master, exactly as `OITM` holds it.
 *
 * Every value on the card is SAP's own: the extract in `demo/real` is a
 * verbatim read of the 4,081-row item table — names, group, units and their
 * conversions, the four Y/N flags, levels, planning, the last purchase, the
 * lab percentages, the safety limits, the consumer-site fields, the remarks,
 * the properties that are ticked, the price in each of the ten price lists and
 * the stock in each of the seven warehouses. Nothing here invents a value.
 *
 * Two fields are the console's own, and the card says so where they show:
 * `family` — the two-digit block the item is numbered in, which numbers its
 * batches and sets a default shelf life — and `priceGroup`, the quantity ladder
 * the pricing screen assigns. SAP has neither as a column: the family is
 * readable off the item number, and the ladder lives in `SPP2`.
 */

/** Every item SAP holds in this extract, ingredients and finished goods alike. */
const REAL_ITEMS = [...REAL_INGREDIENTS, ...REAL_PRODUCTS];

/** SAP's three restriction values → the card's levels. */
const SAP_LIMIT = {
    None: 'none',
    NotRecomended: 'caution',
    NotRecomende: 'caution',
    NotAllowed: 'forbidden',
};

/** SAP property numbers → preparation-type ids. */
const PREP_BY_SAP = new Map(PREP_TYPES.map((type) => [type.sap, type.id]));

/**
 * The item properties that are a flag on the item rather than a way of making
 * it: SAP files all of them in the same sixty-four checkboxes.
 */
const PROPERTY = {
    shelf: 15,
    therapistDiscount: 19,
    promo: 20,
    siteSync: 40,
};

/** How much of the base unit one unit holds, for converting a price. */
const UNIT_IN_BASE = {
    kg: 1000,
    g: 1,
    mg: 0.001,
    mcg: 0.000001,
    l: 1000,
    ml: 1,
    unit: 1,
    jar: 1,
    drop: 1,
    minute: 1,
    manual: 1,
};

/** Units that measure the same thing, so a price may be restated between them. */
const UNIT_DIMENSION = {
    kg: 'mass',
    g: 'mass',
    mg: 'mass',
    mcg: 'mass',
    l: 'volume',
    ml: 'volume',
};

const yes = (value) => value === 'Y';

const uomOf = (name) =>
    name ? UOM_BY_NAME[String(name).trim()] || null : null;

const limitOf = (value) => SAP_LIMIT[value] || null;

const textOf = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    // SAP's ntext remarks carry bare carriage returns where the user pressed
    // Enter; they are line breaks, not stray characters.
    const clean = text.replace(/\r\n?/g, '\n').trim();

    return clean || null;
};

const numberOf = (value) =>
    value === null || value === undefined || value === ''
        ? null
        : Number(value);

/** A price quoted per one unit, restated per another. */
function pricePer(price, from, to) {
    if (price === null || !from || !to || from === to) {
        return price;
    }

    if (
        !UNIT_DIMENSION[from] ||
        UNIT_DIMENSION[from] !== UNIT_DIMENSION[to] ||
        !UNIT_IN_BASE[from]
    ) {
        return price;
    }

    return price * (UNIT_IN_BASE[to] / UNIT_IN_BASE[from]);
}

/**
 * The demo supplier an item's `CardCode` stands for.
 *
 * SAP names twenty real vendors across the sample; the console carries seven
 * supplier cards of its own. Each real code maps to one of them and always to
 * the same one, so an item's buyer does not move between builds. The item keeps
 * SAP's own code beside it, which is what a migration would carry.
 */
function supplierMap(suppliers) {
    const codes = [
        ...new Set(REAL_ITEMS.map((item) => item.supplierCode).filter(Boolean)),
    ].sort();

    return new Map(
        codes.map((code, i) => [code, suppliers[i % suppliers.length].code]),
    );
}

/** One item, read off its SAP row. */
function itemOf(real, supplierByCode) {
    const properties = real.properties || [];
    const stockUom = uomOf(real.stockUom) || 'unit';
    const salesUom = uomOf(real.salesUom) || stockUom;
    const purchaseUom = uomOf(real.buyUom) || stockUom;
    const priceUom = UOM_BY_SAP[real.priceUnit] || stockUom;
    // SAP counts in stock units: `NumInSale` is how many of them one sales unit
    // holds (a gram is 0.001 of a kilo). The console's factor is the other way
    // round — how many sales units go into one purchase unit.
    const numInBuy = numberOf(real.numInBuy) ?? 1;
    const numInSale = numberOf(real.numInSale) ?? 1;
    const factor = numInSale ? numInBuy / numInSale : 1;
    const listPrice = (list) =>
        (real.prices || []).find((row) => row.list === list) || null;
    // Price list 8 is the consumer price before VAT — the one the console has
    // always shown as the item's own unit price, restated per sales unit.
    const consumer = listPrice(8);
    const sale =
        consumer && consumer.price
            ? pricePer(consumer.price, priceUom, salesUom)
            : null;

    return {
        // SAP's item number is the key, and the console joins on it as `sku`.
        code: real.code,
        sku: real.code,
        names: {
            he: real.nameHe || real.code,
            en: real.nameForeign || null,
            site: real.siteName || null,
        },
        group: real.groupCode ?? null,
        // The console's own: the numbering block, for batch series and shelf life.
        family: real.family || familyOfCode(real.code) || null,
        itemType: real.itemType || 'I',
        treeType: real.treeType || 'N',
        issueMethod: real.issueMethod || 'M',
        active: yes(real.active),
        frozen: yes(real.frozen),
        frozenFrom: real.frozenFrom || null,
        frozenTo: real.frozenTo || null,
        activeComment: textOf(real.activeComment),
        frozenComment: textOf(real.frozenComment),
        flags: {
            inventory: yes(real.stockTracked),
            sales: yes(real.sell),
            purchase: yes(real.purchase),
            batch: yes(real.batchManaged),
        },
        barcode: real.barcode || null,
        additionalId: real.additionalId || null,
        picture: real.picture || null,
        suppliers: {
            preferred: real.supplierCode
                ? supplierByCode.get(real.supplierCode) || null
                : null,
            sapCode: real.supplierCode || null,
            catalogNum: real.supplierCatalogNum || null,
        },
        uom: {
            stock: stockUom,
            purchase: purchaseUom,
            sales: salesUom,
            count: uomOf(real.countUom) || stockUom,
            price: priceUom,
            numInBuy,
            numInSale,
            factor,
            group: real.uomGroup ?? -1,
            priceUnit: real.priceUnit ?? -1,
            packUom: real.packUom || null,
            packQty: numberOf(real.packQty),
        },
        levels: {
            min: numberOf(real.minLevel),
            max: numberOf(real.maxLevel),
            reorder: numberOf(real.reorderQty),
            minOrder: numberOf(real.minOrderQty),
            leadTime: numberOf(real.leadTime),
        },
        planning: {
            method: real.planningMethod || 'N',
            procurement: real.procurementMethod || 'B',
            productSource: real.productSource || null,
            componentWarehouse: real.componentWarehouse || 'B',
        },
        price: {
            sale,
            saleUom: salesUom,
            lastPurchase: numberOf(real.lastPurchasePrice),
            currency: real.lastPurchaseCurrency === '₪' ? 'ILS' : 'ILS',
            lastPurchaseOn: real.lastPurchaseOn || null,
            evalPrice: numberOf(real.lastEvalPrice),
            evalOn: real.lastEvalOn || null,
            avgPrice: numberOf(real.avgPrice),
        },
        accounting: {
            valuation: real.valuationMethod || 'C',
            byWarehouse: yes(real.byWarehouse),
            noDiscount: yes(real.noDiscount),
            inCostRoll: yes(real.inCostRoll),
        },
        lab: {
            alcoholPct: numberOf(real.alcoholPct),
            oilPct: numberOf(real.oilPct),
            extractionRatio: real.extractionRatio || null,
            packageSize: numberOf(real.packageSize),
        },
        safety: {
            pregnancy: limitOf(real.pregnancyLimit),
            lactation: limitOf(real.breastfeedingLimit),
            under2: limitOf(real.under2Limit),
        },
        site: {
            name: real.siteName || null,
            uom: uomOf(real.siteUom),
            quantity: numberOf(real.siteQuantity),
            comments: textOf(real.siteComments),
            categories: [
                real.category1,
                real.category2,
                real.category3,
                real.category4,
            ].filter(Boolean),
            sync: properties.includes(PROPERTY.siteSync),
            promo: properties.includes(PROPERTY.promo),
            therapistDiscount: properties.includes(PROPERTY.therapistDiscount),
        },
        properties,
        prepTypes: properties
            .map((number) => PREP_BY_SAP.get(number))
            .filter(Boolean),
        prices: (real.prices || []).map((row) => ({
            list: row.list,
            price: numberOf(row.price),
            currency: 'ILS',
        })),
        warehouses: (real.warehouses || []).map((row) => ({
            warehouse: row.warehouse,
            onHand: numberOf(row.onHand) ?? 0,
            committed: numberOf(row.committed) ?? 0,
            onOrder: numberOf(row.onOrder) ?? 0,
            min: numberOf(row.minLevel) ?? 0,
            max: numberOf(row.maxLevel) ?? 0,
        })),
        onHand: numberOf(real.onHand) ?? 0,
        committed: numberOf(real.committed) ?? 0,
        onOrder: numberOf(real.onOrder) ?? 0,
        // SAP's label is "product for therapist no.", and the pharmacy types
        // notes into it as often as a therapist code. It carries verbatim.
        forTherapist: textOf(real.forTherapist),
        remarks: textOf(real.remarks),
        saleText: textOf(real.saleText),
        created: real.createdOn || null,
        updated: real.updatedOn || null,
        // The console's own: which quantity ladder prices it. `null` inherits by
        // numbering block, `'none'` is a fixed price, an id names a group.
        priceGroup: null,
    };
}

/**
 * Build the item catalogue. One record per item number, read off `OITM`.
 *
 * `suppliers` is the console's own supplier list, only so an item's `CardCode`
 * resolves to a card the buyer can open.
 */
export function buildItems(suppliers) {
    const supplierByCode = supplierMap(suppliers);
    const items = REAL_ITEMS.map((real) => itemOf(real, supplierByCode));
    const seen = new Set();

    items.forEach((item) => {
        if (seen.has(item.code)) {
            throw new Error(`buildItems: duplicate item number ${item.code}`);
        }

        seen.add(item.code);
    });

    // Only what is sold by quantity carries a ladder, and a third of those are
    // priced flat. The ladder is the pricing screen's, not SAP's.
    items.forEach((item) => {
        if (!item.flags.sales || !item.price.sale) {
            return;
        }

        item.priceGroup = chance(`${item.code}:pgnone`, 0.33) ? 'none' : null;
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
