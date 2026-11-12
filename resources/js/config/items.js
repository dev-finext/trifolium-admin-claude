// Items: the unified item card — one record whether the thing is a herb, a
// tincture, a shelf product, a bottle or a box of gloves.
//
// Second-version material (see resources/js/dev/progress.js → `item-card`). The
// families and their code prefixes are SAP's own item-group numbering, adopted
// as-is because the warehouse is physically arranged by it. Display text lives in
// the locale catalogs under `items.*` and `attachments.*`.
import { liveOnly } from '@/config/archive';

/**
 * Item families and the code prefixes each is numbered under, counted against
 * all 4,100 items in the catalogue.
 *
 * Two rules, both learned the hard way from the live data:
 *
 *   1. A family is read from the item's own code, never from the item group it
 *      sits in. SAP's group codes (`OITB.ItmsGrpCod`, 100–156) are unrelated to
 *      the numbering, and the number written into a group's *name* does not
 *      match what is filed there either — the group named "25 פורמולה צמחים
 *      1:1" holds 52 items numbered 11xxxx, and the group named "13 הרכבים
 *      קלאסיים DE" is empty while its 109 items sit under "12 אקסטרקטים".
 *   2. A family can own more than one prefix. `prefix` is the one a new code is
 *      minted under; `also` lists the others that resolve to the same family.
 *
 * Prefix 54 is deliberately absent: it holds 39 items and not one of them is
 * active. The medicines that are still sold are 55.
 */
export const ITEM_FAMILIES = [
    { id: 'herb', prefix: '10' },
    { id: 'herb_1to1', prefix: '11' },
    // 13 is the classical Chinese DE preparations, which SAP files with the
    // extracts and prices the same way.
    { id: 'extract', prefix: '12', also: ['13'] },
    { id: 'hydrosol', prefix: '14' },
    { id: 'essential_oil', prefix: '15' },
    { id: 'supplement', prefix: '16' },
    { id: 'tincture', prefix: '20' },
    { id: 'infused_oil', prefix: '21' },
    { id: 'homeopathy', prefix: '22' },
    // 23 tincture, 24 oil, 26 herb — three ways to compound a house formula.
    { id: 'formula', prefix: '23', also: ['24', '26'] },
    { id: 'private_label', prefix: '27' },
    { id: 'consumable', prefix: '30' },
    // Packaging is six families, not one: someone looking for a 28 mm cap is
    // not looking through the labels.
    { id: 'glass', prefix: '40' },
    { id: 'plastic', prefix: '41' },
    { id: 'cap', prefix: '42' },
    { id: 'box', prefix: '43' },
    { id: 'jar', prefix: '46' },
    { id: 'packaging', prefix: '47' },
    { id: 'admin', prefix: '48' },
    // 49 is five shelf products numbered outside the block.
    { id: 'shelf', prefix: '50', also: ['49'] },
    { id: 'bought_shelf', prefix: '55' },
    { id: 'workshop', prefix: '60' },
    { id: 'labour', prefix: '99' },
];

/** Every prefix that resolves to a family, longest first so 233 beats 23. */
const FAMILY_BY_PREFIX = ITEM_FAMILIES.flatMap((family) =>
    [family.prefix, ...(family.also || [])].map((prefix) => [
        prefix,
        family.id,
    ]),
).sort((a, b) => b[0].length - a[0].length);

/**
 * Which family an item code belongs to, or null for the handful of codes that
 * are not numbered at all (`הנחה`, `קופון`, `כללי` — three pseudo-items).
 */
export function familyOfCode(code) {
    const text = String(code || '');
    const hit = FAMILY_BY_PREFIX.find(([prefix]) => text.startsWith(prefix));

    return hit ? hit[1] : null;
}

export const ITEM_FAMILY = Object.fromEntries(
    ITEM_FAMILIES.map((family) => [family.id, family]),
);

export const ITEM_FAMILY_IDS = ITEM_FAMILIES.map((family) => family.id);

/** Digits after the family prefix: `10` + `0012` → `100012`, as in SAP. */
export const ITEM_CODE_DIGITS = 4;

/**
 * What an item takes part in. An item may carry any combination, with two
 * implications the store enforces on save: `internal` — produced in-house from a
 * bill of materials — forces `batch`, and `batch` forces `inventory`.
 */
export const ITEM_FLAG_IDS = ['inventory', 'sales', 'purchase', 'batch'];

/** SAP's item type (`OITM.ItemType`): a thing, or labour that is never stocked. */
export const ITEM_TYPE_IDS = ['I', 'L'];

/**
 * SAP's tree type (`OITM.TreeType`). The catalogue uses two of the four: `N`
 * for an item with no bill of materials and `P` for one made from a production
 * tree — 2,123 of the 4,081 items are `P`.
 */
export const TREE_TYPE_IDS = ['N', 'P'];

/** How a component leaves stock when its parent is made (`OITM.IssueMthd`). */
export const ISSUE_METHOD_IDS = ['B', 'M'];

/** SAP's planning method (`OITM.PlaningSys`): MRP, or none. */
export const PLANNING_METHOD_IDS = ['M', 'N'];

/** Where the item comes from (`OITM.PrcrmntMtd`): bought, or made. */
export const PROCUREMENT_METHOD_IDS = ['B', 'M'];

/** Which warehouse a tree's components are drawn from (`OITM.CompoWH`). */
export const COMPONENT_WAREHOUSE_IDS = ['B', 'P'];

/** How the item's G/L accounts are set (`OITM.GLMethod`). */
export const VALUATION_METHOD_IDS = ['W', 'C', 'L'];

/**
 * The units of measure, as `OUOM` holds them. `sap` is the `UomEntry` the item
 * master stores — it is also what `PriceUnit` points at, so a price is always
 * "per one of these".
 */
export const ITEM_UOMS = [
    { id: 'manual', sap: -1 },
    { id: 'kg', sap: 1 },
    { id: 'g', sap: 2 },
    { id: 'l', sap: 3 },
    { id: 'ml', sap: 4 },
    { id: 'unit', sap: 5 },
    { id: 'drop', sap: 6 },
    { id: 'minute', sap: 7 },
    { id: 'mg', sap: 8 },
    { id: 'mcg', sap: 9 },
    { id: 'jar', sap: 10 },
];

export const ITEM_UOM_IDS = ITEM_UOMS.map((uom) => uom.id);

/** `UomEntry` → the console's unit id, for reading `PriceUnit`. */
export const UOM_BY_SAP = Object.fromEntries(
    ITEM_UOMS.map((uom) => [uom.sap, uom.id]),
);

/** The unit a SAP unit *name* stands for — the item master stores names. */
export const UOM_BY_NAME = {
    'ק"ג': 'kg',
    'ק״ג': 'kg',
    גרם: 'g',
    ליטר: 'l',
    LITER: 'l',
    'מ"ל': 'ml',
    'מ״ל': 'ml',
    "מ''ל": 'ml',
    "יח'": 'unit',
    יח: 'unit',
    "י''ח": 'unit',
    'י״ח': 'unit',
    טיפה: 'drop',
    דקה: 'minute',
    'מ"ג': 'mg',
    מיקרוגרם: 'mcg',
    צנצנת: 'jar',
    ידני: 'manual',
};

/**
 * The unit-of-measure groups (`OUGP`), by the `UgpEntry` the item stores. The
 * group fixes the base unit an item is counted in.
 */
export const UOM_GROUPS = [
    { id: -1, base: 'manual' },
    { id: 2, base: 'g' },
    { id: 3, base: 'kg' },
    { id: 4, base: 'ml' },
    { id: 5, base: 'l' },
    { id: 6, base: 'drop' },
    { id: 7, base: 'unit' },
    { id: 8, base: 'mg' },
    { id: 9, base: 'mcg' },
    { id: 10, base: 'jar' },
    { id: 11, base: 'l' },
];

export const UOM_GROUP_IDS = UOM_GROUPS.map((group) => group.id);

/** Currencies a purchase price is recorded in. */
export const CURRENCY_IDS = ['ILS', 'EUR', 'USD'];

export const CURRENCY_SYMBOL = { ILS: '₪', EUR: '€', USD: '$' };

/** The three situations a safety restriction is stated for. */
export const SAFETY_CONTEXT_IDS = ['pregnancy', 'lactation', 'under2'];

/** The three levels a restriction can take, and the chip tone of each. */
export const SAFETY_LEVELS = [
    { id: 'none', tone: 'green' },
    { id: 'caution', tone: 'amber' },
    { id: 'forbidden', tone: 'red' },
];

export const SAFETY_LEVEL = Object.fromEntries(
    SAFETY_LEVELS.map((level) => [level.id, level]),
);

export const SAFETY_LEVEL_IDS = SAFETY_LEVELS.map((level) => level.id);

/** The four branches of the consumer site's category tree. */
export const SITE_CATEGORY_GROUP_IDS = [
    'condition',
    'system',
    'chinese_series',
    'mushroom',
];

/** How many categories one item is filed under on the site. */
export const SITE_CATEGORY_SLOTS = 4;

/** What a preparation type declares it contains — printed on the label. */
export const PREP_CONTAINS_IDS = [
    'alcohol',
    'glycerin',
    'honey',
    'carob',
    'molasses',
    'water',
    'oil',
];

/** Units a finished preparation is measured in. */
export const PREP_UNIT_IDS = ['ml', 'g', 'capsule', 'unit'];

/** How a bill-of-materials component leaves stock when the parent is made. */
export const BOM_ISSUE_IDS = ['backflush', 'manual'];

/** Extraction ratios a tincture tree is described by — herb : solvent. */
export const EXTRACTION_RATIOS = [
    '1:1',
    '1:2',
    '1:3',
    '1:4',
    '1:5',
    '1:10',
    '1:20',
];

export const BOM_RULES = { maxComponents: 40 };

/**
 * The item's catalogue number at one supplier — what that supplier calls it.
 *
 * 12.11.2026, for the supplier's Excel file, whose "מק״ט ספק" column is this
 * number for the order's supplier (config/supplierSheet.js). Two places hold
 * one, and they are asked in this order:
 *
 *   1. the item's per-supplier list, `supplierCatalog` — SAP's `OSCN`, one
 *      number per supplier, edited on the item card under "מק״ט אצל ספקים".
 *      This is where SAP itself takes the number it writes onto a purchase
 *      order line (`POR1.SubCatNum`): all 428 order lines of the last two
 *      years that carried one;
 *   2. the card's single "מק״ט אצל הספק" (`suppliers.catalogNum`,
 *      `OITM.SuppCatNum`) — but only when the supplier asked about is the
 *      item's preferred one, the supplier that field stands beside on the card.
 *      A number one supplier gave must never reach another.
 *
 * Null when neither holds — the column is then left empty, as the sample file
 * left it.
 */
export function supplierCatalogNum(item, supplierCode) {
    if (!item || !supplierCode) {
        return null;
    }

    const own = (item.supplierCatalog || []).find(
        (row) => row.supplierCode === supplierCode,
    );

    if (own?.catalogNum) {
        return own.catalogNum;
    }

    const preferred =
        item.suppliers?.preferred || item.suppliers?.sapCode || null;

    return preferred === supplierCode
        ? item.suppliers?.catalogNum || null
        : null;
}

/**
 * What one purchase-order line still has to deliver, in the item's stock unit.
 *
 * The sheet counts in the purchase unit and SAP's `OnOrder` counts in the stock
 * unit; `numInBuy`, carried on the line off the item card, is what sits
 * between — the same conversion the goods receipt makes when the goods arrive.
 */
export function openOrderQty(line) {
    const open = (Number(line?.qty) || 0) - (Number(line?.received) || 0);

    if (!(open > 0)) {
        return 0;
    }

    return Math.round(open * (Number(line?.numInBuy) || 1) * 1000) / 1000;
}

/**
 * The purchase orders that have left for a supplier and not arrived yet.
 *
 * A draft has not been placed and a failed order will not come; a received one
 * has come. Only `sent` is stock somebody is waiting for.
 */
export const sentOrders = (lists) =>
    liveOnly(lists).filter(
        (list) => list.kind === 'order' && list.state === 'sent',
    );

/** What the sent orders still have to deliver, per sku, in stock units. */
export function sentOrderQtyBySku(lists) {
    const out = new Map();

    sentOrders(lists).forEach((order) =>
        (order.lines || []).forEach((line) => {
            const open = openOrderQty(line);

            if (open > 0) {
                out.set(line.sku, (out.get(line.sku) || 0) + open);
            }
        }),
    );

    return out;
}

/** Records a file can be attached to. */
export const ATTACHMENT_ENTITY_IDS = [
    'item',
    'batch',
    'supplier',
    'purchase_order',
    'practitioner',
    'customer',
    'supplier_invoice',
    'supplier_payment',
    'document',
    // A goods receipt — the delivery note or tax invoice the goods came on.
    'receipt',
];

export const ATTACHMENT_RULES = {
    maxMb: 20,
    extensions: [
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'webp',
        'svg',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'csv',
    ],
};
