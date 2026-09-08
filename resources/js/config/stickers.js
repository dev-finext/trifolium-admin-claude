// The stickers module — labels printed in the pharmacy. Second-version material
// (dev/progress.js → `labels`).
//
// Natalie's one requirement: "easy, accessible editing of the labels, so we can
// manage the module ourselves". So the template is data — elements the console
// edits — and this file only names what a template may contain. The physical
// print run to the TSC printer is out of scope; the browser's print dialog is
// the output.

/** The three label templates: a preparation, a stock item, a parcel. */
export const STICKER_TEMPLATE_IDS = ['prep', 'item', 'shipping'];

/** Default label sizes, millimetres. The template carries its own copy. */
export const STICKER_SIZES = {
    prep: { w: 120, h: 60 },
    item: { w: 70, h: 40 },
    shipping: { w: 100, h: 60 },
};

/** What an element on a label is. */
export const STICKER_KIND_IDS = ['field', 'text', 'logo', 'barcode'];

/** Horizontal alignment of an element's text. */
export const STICKER_ALIGN_IDS = ['start', 'center', 'end'];

/**
 * System fields a template may place, and which templates each belongs to.
 * Labels at `stickers.field.<id>`; the value comes from useStickerData.
 */
export const STICKER_FIELDS = [
    { id: 'pharmacy', templates: ['prep', 'item', 'shipping'] },
    { id: 'pharmacyPhone', templates: ['prep', 'item', 'shipping'] },
    { id: 'patient', templates: ['prep', 'shipping'] },
    { id: 'practitioner', templates: ['prep'] },
    { id: 'formula', templates: ['prep'] },
    { id: 'prepType', templates: ['prep'] },
    { id: 'content', templates: ['prep'] },
    { id: 'concentration', templates: ['prep'] },
    { id: 'instructions', templates: ['prep'] },
    { id: 'typeText', templates: ['prep'] },
    { id: 'notes', templates: ['prep'] },
    { id: 'regulatory', templates: ['prep'] },
    { id: 'madeOn', templates: ['prep'] },
    { id: 'expiry', templates: ['prep', 'item'] },
    { id: 'orderId', templates: ['prep', 'shipping'] },
    { id: 'split', templates: ['prep', 'item'] },
    { id: 'itemName', templates: ['item'] },
    { id: 'itemCode', templates: ['item'] },
    { id: 'batch', templates: ['item'] },
    { id: 'supplierBatch', templates: ['item'] },
    { id: 'supplier', templates: ['item'] },
    { id: 'receivedOn', templates: ['item'] },
    { id: 'qty', templates: ['item'] },
    { id: 'address', templates: ['shipping'] },
    { id: 'phone', templates: ['shipping'] },
    { id: 'courier', templates: ['shipping'] },
    { id: 'tracking', templates: ['shipping'] },
];

export const STICKER_FIELD_IDS = STICKER_FIELDS.map((field) => field.id);

/** Fields a given template may use. */
export const stickerFieldsFor = (templateId) =>
    STICKER_FIELDS.filter((field) => field.templates.includes(templateId));

/** Counting and typography rules. */
export const STICKER_RULES = {
    /** Capsule preparations get one spare label per order line. */
    capsuleSpare: 1,
    /** Font size bounds, points. */
    minFont: 5,
    maxFont: 24,
    /** How many months a preparation keeps when its type says nothing. */
    fallbackExpiryMonths: 12,
};

/** The one barcode symbology the module renders — plain, scanner-friendly. */
export const BARCODE_SYMBOLOGY = 'code39';
