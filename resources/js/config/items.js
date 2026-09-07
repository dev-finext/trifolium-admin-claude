// Items: the unified item card — one record whether the thing is a herb, a
// tincture, a shelf product, a bottle or a box of gloves.
//
// Second-version material (see resources/js/dev/progress.js → `item-card`). The
// families and their code prefixes are SAP's own item-group numbering, adopted
// as-is because the warehouse is physically arranged by it. Display text lives in
// the locale catalogs under `items.*` and `attachments.*`.

/** Item families and the two-digit code prefix each is numbered under. */
export const ITEM_FAMILIES = [
    { id: 'herb', prefix: '10' },
    { id: 'herb_1to1', prefix: '11' },
    { id: 'extract', prefix: '12' },
    { id: 'hydrosol', prefix: '14' },
    { id: 'essential_oil', prefix: '15' },
    { id: 'supplement', prefix: '16' },
    { id: 'tincture', prefix: '20' },
    { id: 'infused_oil', prefix: '21' },
    { id: 'formula', prefix: '23' },
    { id: 'private_label', prefix: '27' },
    { id: 'consumable', prefix: '30' },
    { id: 'packaging', prefix: '40' },
    { id: 'admin', prefix: '48' },
    { id: 'shelf', prefix: '50' },
    { id: 'bought_shelf', prefix: '54' },
    { id: 'workshop', prefix: '60' },
    { id: 'labour', prefix: '99' },
];

export const ITEM_FAMILY = Object.fromEntries(
    ITEM_FAMILIES.map((family) => [family.id, family]),
);

export const ITEM_FAMILY_IDS = ITEM_FAMILIES.map((family) => family.id);

/** Digits after the family prefix: `10` + `0012` → `100012`, as in SAP. */
export const ITEM_CODE_DIGITS = 4;

/** What an item takes part in. An item may carry any combination. */
export const ITEM_FLAG_IDS = ['purchase', 'sales', 'inventory', 'batch'];

/** Units an item is bought, sold or held in. */
export const ITEM_UOM_IDS = ['g', 'kg', 'ml', 'l', 'unit', 'pack', 'capsule'];

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

/**
 * Fields the mandatory-field policy can require. Which ones a family requires is
 * ITEM_MANDATORY below; a creator may record a waiver on any of them, and the
 * waiver is shown on the card rather than the item silently passing.
 */
export const ITEM_MANDATORY_FIELD_IDS = [
    'lat',
    'purchaseUom',
    'prepTypes',
    'safety',
    'location',
    'siteName',
    'categories',
    'salePrice',
    'supplier',
];

/** Mandatory fields per family. A family missing here requires nothing. */
export const ITEM_MANDATORY = {
    herb: ['lat', 'purchaseUom', 'prepTypes', 'safety', 'location'],
    herb_1to1: ['lat', 'purchaseUom', 'prepTypes', 'safety', 'location'],
    extract: ['lat', 'prepTypes', 'safety'],
    hydrosol: ['prepTypes', 'safety'],
    essential_oil: ['lat', 'safety', 'location'],
    supplement: ['supplier', 'salePrice'],
    tincture: ['lat', 'prepTypes', 'safety', 'location'],
    infused_oil: ['lat', 'safety'],
    formula: ['salePrice', 'siteName'],
    private_label: ['salePrice', 'siteName', 'categories'],
    consumable: ['supplier', 'purchaseUom'],
    packaging: ['supplier', 'purchaseUom'],
    shelf: ['salePrice', 'siteName', 'categories'],
    bought_shelf: ['salePrice', 'siteName', 'categories', 'supplier'],
};

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

/** Records a file can be attached to. */
export const ATTACHMENT_ENTITY_IDS = [
    'item',
    'batch',
    'supplier',
    'purchase_order',
    'practitioner',
    'customer',
];

export const ATTACHMENT_RULES = {
    maxMb: 20,
    extensions: [
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'webp',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'csv',
    ],
};
