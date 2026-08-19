// System settings the pharmacy controls from הגדרות מערכת / System settings.
//
// Never inline these numbers in a screen — read them from here so one change
// moves every price, every warning threshold and every expiry countdown.
export const SETTINGS = {
    /** Israeli VAT, as a fraction. */
    vatRate: 0.18,
    /** `ceil_shekel` | `nearest_shekel` | `none` — see lib/money.js. */
    priceRounding: 'ceil_shekel',
    /** Default practitioner discount off list price, in percent. */
    defaultDiscountPct: 40,
    /** Rows per page in the dense data tables. */
    pageSize: 25,
    /** Free-text search waits this long after the last keystroke, in ms. */
    searchDebounceMs: 200,
};

/** Colour tones the status/chip system uses. No screen invents its own. */
export const TONES = [
    'gray',
    'amber',
    'blue',
    'teal',
    'green',
    'red',
    'purple',
];
