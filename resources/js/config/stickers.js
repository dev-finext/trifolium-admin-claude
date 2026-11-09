// The stickers module — labels printed in the pharmacy. Second-version material
// (dev/progress.js → `labels`).
//
// Natalie's one requirement: "easy, accessible editing of the labels, so we can
// manage the module ourselves". So the template is data — elements the console
// edits — and this file only names what a template may contain. The physical
// print run to the TSC printer is out of scope; the browser's print dialog is
// the output.

/**
 * The label templates: a preparation, a stock item (the batch label), a
 * parcel, and a production order — the label that names material at the bench
 * until it has a batch. Noam, in the internal-production note: "זו לא מדבקה
 * זמנית אלא מדבקה של הוראת היצור, עם מספר המסמך של הוראת היצור ... תמיד חייבת
 * להיות מדבקה מזהה לכל חומר בכל שלב בית המרקחת".
 */
export const STICKER_TEMPLATE_IDS = ['prep', 'item', 'shipping', 'production'];

/** Default label sizes, millimetres. The template carries its own copy. */
export const STICKER_SIZES = {
    prep: { w: 120, h: 60 },
    // V3 — the batch label, at the size the pharmacy prints it. Natalie's note
    // shows the label and says "גודל 120-60 בדומה לשאר המדבקות שלנו כיום".
    item: { w: 120, h: 60 },
    // Spec §8: 100×100 or 100×150 mm, final size per the office's own label
    // stock (§20.2) — 100×100 until that's confirmed.
    shipping: { w: 100, h: 100 },
    // The pharmacy's own production-order label is the same 120×60 stock.
    production: { w: 120, h: 60 },
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
    { id: 'pharmacy', templates: ['prep', 'item', 'shipping', 'production'] },
    {
        id: 'pharmacyPhone',
        templates: ['prep', 'item', 'shipping', 'production'],
    },
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
    { id: 'madeOn', templates: ['prep', 'item'] },
    { id: 'expiry', templates: ['prep', 'item'] },
    { id: 'orderId', templates: ['prep', 'shipping'] },
    { id: 'split', templates: ['prep', 'item'] },
    { id: 'itemName', templates: ['item', 'production'] },
    // V3 — the label in Natalie's note carries the botanical name and the
    // Chinese name under the item's own, and the production date beside the
    // expiry. Both are on the item card already; neither was on the label.
    { id: 'foreignName', templates: ['item', 'production'] },
    { id: 'itemCode', templates: ['item', 'production'] },
    { id: 'batch', templates: ['item'] },
    { id: 'supplierBatch', templates: ['item'] },
    { id: 'supplier', templates: ['item'] },
    { id: 'receivedOn', templates: ['item'] },
    { id: 'qty', templates: ['item'] },
    { id: 'address', templates: ['shipping'] },
    { id: 'phone', templates: ['shipping'] },
    { id: 'courier', templates: ['shipping'] },
    { id: 'tracking', templates: ['shipping'] },
    // The production order's label: its number, the day it went to the lab,
    // and the target date Yaron asks to see beside it ("התוית תכלול את תאריך
    // הייצור בפועל ואת תאריך היעד שמוגדר").
    { id: 'productionOrder', templates: ['production'] },
    { id: 'productionDate', templates: ['production'] },
    { id: 'dueOn', templates: ['production'] },
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

/**
 * What the batch label's barcode carries. V3.
 *
 * Yaron: "ברקוד לסריקה צריך להכיל את המק״ט שצריך לייצר איתו ואת אצווה בהוראת
 * ייצור" — the item number the run is made with, and the batch. Two values in
 * one scan, so the separator has to be something a Code 39 reader passes
 * through unchanged.
 *
 * What he asks for after that — "לאפשר לעקוף רק על ידי הרשאת מנהל/אחמ״ש" —
 * says a scan may be overridden by a supervisor, but not what is being
 * overridden or where. That is an open question and nothing was built for it.
 */
export const BATCH_BARCODE_SEPARATOR = '-';

export const batchBarcode = (itemCode, batch) =>
    [itemCode, batch].filter(Boolean).join(BATCH_BARCODE_SEPARATOR);
