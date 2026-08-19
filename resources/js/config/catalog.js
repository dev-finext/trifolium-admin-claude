// Catalog taxonomies: units, preparation forms, ingredient kinds, product state.
//
// The React prototype declared these inside its data files, mixed in with sample
// records. They are product configuration, not content — a new deployment with an
// empty database still has exactly these units and these preparation forms.
// Display text is in the locale catalogs under `enums.*`.

/** Units of measure stock and formulas are expressed in. */
export const UNITS = ['g', 'kg', 'ml', 'l'];

/**
 * Preparation forms a practitioner can compound into. `unit` is the unit the
 * finished preparation is measured in — capsules are counted, a tincture is
 * millilitres, a powder is grams.
 */
export const PREPARATION_FORMS = [
    { id: 'tincture', unit: 'ml' },
    { id: 'capsule', unit: 'capsule' },
    { id: 'powder', unit: 'g' },
    { id: 'tea', unit: 'g' },
    { id: 'decoction', unit: 'ml' },
    { id: 'gel', unit: 'g' },
    { id: 'cream', unit: 'g' },
    { id: 'essential_oil', unit: 'ml' },
    { id: 'infused_oil', unit: 'ml' },
];

export const PREPARATION_FORM = Object.fromEntries(
    PREPARATION_FORMS.map((form) => [form.id, form]),
);

export const PREPARATION_FORM_IDS = PREPARATION_FORMS.map((form) => form.id);

/** What kind of thing an ingredient is. */
export const INGREDIENT_KINDS = ['raw', 'base', 'pack'];

/**
 * Item-code prefix per ingredient kind. Raw herbs are numbered from 300…, bases
 * from 21…; packaging carries no prefix. This is how the catalog has always been
 * numbered and existing codes were never reissued.
 */
export const INGREDIENT_CODE_PREFIX = { raw: '300', base: '21', pack: '' };

/** Stock categories, for the inventory screens. */
export const STOCK_KINDS = [
    { id: 'raw', tone: 'teal' },
    { id: 'base', tone: 'blue' },
    { id: 'pack', tone: 'gray' },
    { id: 'shelf', tone: 'purple' },
];

export const STOCK_KIND = Object.fromEntries(
    STOCK_KINDS.map((kind) => [kind.id, kind]),
);

/** Shelf-product lifecycle. */
export const PRODUCT_STATUSES = [
    { id: 'published', tone: 'green' },
    { id: 'archived', tone: 'slate' },
];

export const PRODUCT_STATUS = Object.fromEntries(
    PRODUCT_STATUSES.map((status) => [status.id, status]),
);

export const PRODUCT_STATUS_IDS = PRODUCT_STATUSES.map((status) => status.id);

/**
 * Below this quantity a product stops being offered on both the consumer site and
 * the practitioner site. Every new product starts with this default.
 */
export const DEFAULT_MIN_STOCK = 5;
