// One postal address, assembled from the parts a person record stores.
//
// The order is the one an Israeli courier reads: street and number, then the
// pieces that get someone to the door, then the city. Every piece that is empty
// simply drops out — the address never carries a placeholder dash mid-sentence.

import { isLocalized } from '@/lib/localized';

/**
 * A stable value for a city filter. Cities travel with the record as a
 * `{ he, en }` pair and have no id of their own, so the Hebrew source text is
 * what identifies one — the same URL then opens the same filter in either
 * language.
 *
 * @param {*} city
 * @returns {string}
 */
export function cityKey(city) {
    if (isLocalized(city)) {
        return city.he;
    }

    return city === null || city === undefined ? '' : String(city);
}

/**
 * @param {object} record A record with street/num/apt/floor/entry/city fields.
 * @param {(key: string, params?: object) => string} t
 * @param {(value: *) => *} loc Resolves `{ he, en }` values.
 * @returns {string}
 */
export function formatAddress(record, t, loc) {
    if (!record) {
        return '';
    }

    const street = [loc(record.street), record.num]
        .filter(Boolean)
        .join(' ')
        .trim();

    const parts = [
        street,
        record.apt ? t('users.addr.apt', { n: record.apt }) : null,
        record.floor ? t('users.addr.floor', { n: record.floor }) : null,
        record.entry ? t('users.addr.entry', { n: loc(record.entry) }) : null,
        loc(record.city),
    ];

    return parts.filter(Boolean).join(', ');
}
