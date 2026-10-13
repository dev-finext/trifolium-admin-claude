// The address book: the towns the pharmacy delivers to, and the streets in each.
//
// One rule shapes everything here: a street belongs to exactly one town. That
// is why the list exists — a customer picks a town and is then offered that
// town's streets and no others — and it is why a street is a line of its city
// rather than a record of its own. Removing a town takes its streets with it,
// in the store and in the database alike (`ON DELETE CASCADE`).
//
// Writes follow the console's usual shape: the record is updated in place and
// then reported through `persist()`, which against the fixture is a no-op and
// against the database is one upsert of the whole city — its row and its street
// lines together. A street edit therefore persists as a write to its city, and
// that is right: the city is the record.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { FALLBACK_LOCALE, loc } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/** Both names off one typed form. English is optional and falls back to Hebrew. */
function nameOf(form) {
    const he = String(form?.he || '').trim();
    const en = String(form?.en || '').trim();

    return he ? { he, en: en || he } : null;
}

/** The name a comparison uses: the Hebrew side, folded for a forgiving match. */
function key(value) {
    return loc(value, FALLBACK_LOCALE).trim().toLowerCase();
}

/**
 * How a name reads in the system log. Both halves, because both are editable —
 * a row that renamed only the English side would otherwise log the Hebrew name
 * twice and read as a change that did not happen.
 */
function label(name) {
    return name.en && name.en !== name.he ? `${name.he} · ${name.en}` : name.he;
}

/** Alphabetical by the name as it is read, so a list never shuffles. */
function byName(rows) {
    return [...rows].sort((a, b) =>
        loc(a.name, FALLBACK_LOCALE).localeCompare(
            loc(b.name, FALLBACK_LOCALE),
            FALLBACK_LOCALE,
        ),
    );
}

/** `ct7` → 7. The next free number in a series of ids sharing one prefix. */
function nextId(rows, prefix) {
    const highest = rows.reduce((top, row) => {
        const digits = String(row.id).slice(prefix.length);
        const n = Number(digits);

        return Number.isFinite(n) && n > top ? n : top;
    }, 0);

    return `${prefix}${highest + 1}`;
}

export const useAddressesStore = defineStore('addresses', () => {
    const dataset = useDatasetStore();

    function bag() {
        if (!Array.isArray(dataset.data.cities)) {
            dataset.data.cities = [];
        }

        return dataset.data.cities;
    }

    /** Every town, alphabetical. */
    const cities = computed(() => byName(bag()));

    /** How many streets the book holds in total. */
    const streetCount = computed(() =>
        cities.value.reduce(
            (sum, city) => sum + (city.streets?.length || 0),
            0,
        ),
    );

    const cityById = (id) => bag().find((city) => city.id === id) || null;

    /** One town's streets, alphabetical. A town with none returns an empty list. */
    const streetsOf = (id) => byName(cityById(id)?.streets || []);

    /** True while another town already carries this name. */
    function cityTaken(name, exceptId = null) {
        return bag().some(
            (city) => city.id !== exceptId && key(city.name) === key(name),
        );
    }

    /** True while this town already has a street by this name. */
    function streetTaken(cityId, name, exceptId = null) {
        return (cityById(cityId)?.streets || []).some(
            (street) =>
                street.id !== exceptId && key(street.name) === key(name),
        );
    }

    function writeLog(row) {
        if (!Array.isArray(dataset.data.log)) {
            dataset.data.log = [];
        }

        const log = dataset.data.log;

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: {
                daysAgo: 0,
                iso: isoDaysAgo(0),
                time: hm(now()),
                stamp: stamp(0),
            },
            actorType: 'agent',
            actor: dataset.me?.name || null,
            entType: 'system',
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    /**
     * Create or rename a town.
     *
     * @param {{he: string, en: string}} form
     * @param {string|null} existingId
     * @returns {Promise<{ok: boolean, city: object|null}>}
     */
    async function saveCity(form, existingId = null) {
        const name = nameOf(form);

        if (!name || cityTaken(name, existingId)) {
            return { ok: false, city: null };
        }

        const rows = bag();

        if (!existingId) {
            const city = { id: nextId(rows, 'ct'), name, streets: [] };

            rows.push(city);
            writeLog({ act: 'city_create', ent: city.id, to: label(name) });
            await persist('cities', city);

            return { ok: true, city };
        }

        const city = cityById(existingId);

        if (!city) {
            return { ok: false, city: null };
        }

        const before = label(city.name);

        city.name = name;
        writeLog({
            act: 'city_update',
            ent: city.id,
            from: before,
            to: label(name),
        });
        await persist(`cities/${city.id}`, city, 'PUT');

        return { ok: true, city };
    }

    /** Remove a town and, with it, every street in it. */
    async function removeCity(id) {
        const rows = bag();
        const index = rows.findIndex((city) => city.id === id);

        if (index < 0) {
            return false;
        }

        const [city] = rows.splice(index, 1);

        writeLog({ act: 'city_remove', ent: city.id, from: label(city.name) });
        await persist(`cities/${city.id}`, {}, 'DELETE');

        return true;
    }

    /**
     * Add a street to a town, or rename one of its streets.
     *
     * @returns {Promise<{ok: boolean, street: object|null}>}
     */
    async function saveStreet(cityId, form, existingId = null) {
        const city = cityById(cityId);
        const name = nameOf(form);

        if (!city || !name || streetTaken(cityId, name, existingId)) {
            return { ok: false, street: null };
        }

        if (!Array.isArray(city.streets)) {
            city.streets = [];
        }

        if (!existingId) {
            const street = {
                id: nextId(city.streets, `${city.id}-s`),
                name,
            };

            city.streets.push(street);
            writeLog({
                act: 'street_create',
                ent: street.id,
                to: `${label(name)} — ${city.name.he}`,
            });
            await persist(`cities/${city.id}`, city, 'PUT');

            return { ok: true, street };
        }

        const street = city.streets.find((row) => row.id === existingId);

        if (!street) {
            return { ok: false, street: null };
        }

        const before = label(street.name);

        street.name = name;
        writeLog({
            act: 'street_update',
            ent: street.id,
            from: before,
            to: label(name),
        });
        await persist(`cities/${city.id}`, city, 'PUT');

        return { ok: true, street };
    }

    /** Remove one street from its town. */
    async function removeStreet(cityId, streetId) {
        const city = cityById(cityId);
        const index = (city?.streets || []).findIndex(
            (street) => street.id === streetId,
        );

        if (!city || index < 0) {
            return false;
        }

        const [street] = city.streets.splice(index, 1);

        writeLog({
            act: 'street_remove',
            ent: street.id,
            from: `${label(street.name)} — ${city.name.he}`,
        });
        await persist(`cities/${city.id}`, city, 'PUT');

        return true;
    }

    return {
        cities,
        streetCount,
        cityById,
        streetsOf,
        cityTaken,
        streetTaken,
        saveCity,
        removeCity,
        saveStreet,
        removeStreet,
    };
});
