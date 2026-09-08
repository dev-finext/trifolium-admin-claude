// Localized *record* values.
//
// UI chrome (labels, buttons, headers, enum names) lives in resources/js/locales
// and is read with `t()`. Record content — a practitioner's name, a herb, a
// message body that was actually sent — belongs to the data, not to the
// interface, so it travels with the record as a `{ he, en }` pair.
//
// Demo records are authored with the `L` helper:
//
//     name: L('אורית דגן', 'Orit Dagan')
//
// and read in components with `loc()` (or the `$loc` global / `useLocalized`
// composable, which pick the active locale up automatically):
//
//     {{ loc(person.name) }}
//
// A plain string passes straight through, so fields that are genuinely
// language-neutral (an order id, a phone number, a batch code) need no wrapper.

/** Locale codes this console ships. `he` is the source language. */
export const LOCALES = ['he', 'en'];

/** The locale a record falls back to when a translation is missing. */
export const FALLBACK_LOCALE = 'he';

/**
 * Author a localized record value.
 *
 * @param {string} he Hebrew text — the source of truth.
 * @param {string} [en] English text. Omit only when the two are identical.
 * @returns {{ he: string, en: string }}
 */
export function L(he, en) {
    return { he, en: en ?? he };
}

/** True when `value` is a `{ he, en }` pair rather than a plain value. */
export function isLocalized(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof value.he === 'string'
    );
}

/**
 * Resolve a possibly-localized value for one locale.
 *
 * Plain strings, numbers, null and undefined pass through untouched, so call
 * sites do not need to know whether a given field was translated.
 *
 * @param {*} value
 * @param {string} locale
 * @returns {*}
 */
export function loc(value, locale = FALLBACK_LOCALE) {
    if (!isLocalized(value)) {
        return value;
    }

    const picked = value[locale];

    return picked === undefined || picked === ''
        ? value[FALLBACK_LOCALE]
        : picked;
}

/**
 * Resolve every localized value inside a record, one level deep into nested
 * objects and arrays. Used where a whole row is handed to a generic renderer
 * (CSV export, print view) rather than read field by field.
 *
 * @param {*} value
 * @param {string} locale
 * @returns {*}
 */
export function locDeep(value, locale = FALLBACK_LOCALE) {
    if (isLocalized(value)) {
        return loc(value, locale);
    }

    if (Array.isArray(value)) {
        return value.map((item) => locDeep(item, locale));
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                locDeep(item, locale),
            ]),
        );
    }

    return value;
}

/**
 * Build a haystack for free-text search that matches in either language, so a
 * Hebrew query still finds a record while the console is in English.
 *
 * @param {...*} values
 * @returns {string}
 */
export function searchHaystack(...values) {
    const parts = [];

    const walk = (value) => {
        if (value === null || value === undefined) {
            return;
        }

        if (isLocalized(value)) {
            parts.push(value.he, value.en);

            return;
        }

        if (Array.isArray(value)) {
            value.forEach(walk);

            return;
        }

        if (typeof value === 'object') {
            Object.values(value).forEach(walk);

            return;
        }

        parts.push(String(value));
    };

    values.forEach(walk);

    return parts.join(' ').toLowerCase();
}
