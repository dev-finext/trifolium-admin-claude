// The content area: the article library, the what's-new feed, the tutorial video
// slots, and the formula libraries the compounding wizard loads.
//
// Articles and videos are edited from this console, so they are held here as
// rows seeded from the dataset; a save replaces the row and calls `persist()`,
// which is a no-op against the fixture. Events, formula libraries and free-pour
// bases are read-only on these screens — they are maintained in the system
// database and the wizard loads them as they are.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { persist } from '@/data/source';
import { FALLBACK_LOCALE, isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

// ---- filter bands ---------------------------------------------------------
//
// Each band is a filter affordance over a figure the record already holds — it
// never changes what a record is, only which rows a reader is looking at. The
// ids are part of the URL contract (`?sysSize=5to6`), so they are short and
// stable; their labels live in the area catalogs.

/** How many herbs a formula carries — the one figure that says how heavy it is. */
export const INGREDIENT_BANDS = [
    { id: 'lt5', matches: (n) => n <= 4 },
    { id: '5to6', matches: (n) => n >= 5 && n <= 6 },
    { id: 'gt6', matches: (n) => n >= 7 },
];

/** Price bands for the free-pour bases, in shekels. */
export const SHELF_PRICE_BANDS = [
    { id: 'lt80', matches: (price) => price <= 80 },
    { id: '80to120', matches: (price) => price > 80 && price <= 120 },
    { id: 'gt120', matches: (price) => price > 120 },
];

/** An article's declared reading time, in minutes. */
export const READ_TIME_BANDS = [
    { id: 'lt6', matches: (min) => min <= 5 },
    { id: '6to10', matches: (min) => min >= 6 && min <= 10 },
    { id: 'gt10', matches: (min) => min > 10 },
];

/**
 * A tutorial video's running time, in whole minutes. `none` is a real state: a
 * slot whose record carries no duration at all.
 */
export const VIDEO_LENGTH_BANDS = [
    { id: 'lt3', matches: (min) => min !== null && min < 3 },
    { id: '3to7', matches: (min) => min !== null && min >= 3 && min <= 7 },
    { id: 'gt7', matches: (min) => min !== null && min > 7 },
    { id: 'none', matches: (min) => min === null },
];

/** Whether a video slot has interest points written for it. */
export const VIDEO_POINT_BANDS = [
    { id: 'has', matches: (count) => count > 0 },
    { id: 'none', matches: (count) => count === 0 },
];

/**
 * Does `value` fall in the band `id` names? An empty id means "no band chosen",
 * which matches everything.
 *
 * @param {Array<{id: string, matches: Function}>} bands
 * @param {string} id
 * @param {*} value
 * @returns {boolean}
 */
export function inBand(bands, id, value) {
    if (!id) {
        return true;
    }

    const band = bands.find((entry) => entry.id === id);

    return band ? band.matches(value) : true;
}

/** Whole minutes from a `m:ss` running time, or null when none is recorded. */
export function videoMinutes(video) {
    const match = /^(\d+):/.exec(video?.duration || '');

    return match ? Number(match[1]) : null;
}

/**
 * Write one locale's text back into a `{ he, en }` record field without losing
 * the other language. Hebrew is the fallback locale, so a field first authored
 * in English seeds Hebrew with the same text rather than leaving it blank —
 * otherwise the record would render empty for a Hebrew reader.
 *
 * @param {*} current The field as the record holds it today.
 * @param {string} locale The locale being edited.
 * @param {string} text
 * @returns {{ he: string, en: string }}
 */
export function withLocale(current, locale, text) {
    const base = isLocalized(current)
        ? { ...current }
        : { he: current || '', en: current || '' };

    base[locale] = text;

    if (!base[FALLBACK_LOCALE]) {
        base[FALLBACK_LOCALE] = text;
    }

    return base;
}

/** The next id in a fixture series: `a9` after `a1`…`a8`. */
function nextId(prefix, rows) {
    const highest = rows.reduce((top, row) => {
        const id = String(row.id || '');
        const n = id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN;

        return Number.isFinite(n) && n > top ? n : top;
    }, 0);

    return `${prefix}${highest + 1}`;
}

/** Replace `row` in `rows` by id, or prepend it when it is new. */
function upsert(rows, row) {
    const at = rows.findIndex((existing) => existing.id === row.id);

    if (at === -1) {
        return [row, ...rows];
    }

    const next = [...rows];

    next[at] = row;

    return next;
}

export const useContentStore = defineStore('content', () => {
    const dataset = useDatasetStore();

    /** Editable rows, re-seeded whenever the dataset is (re)loaded. */
    const articles = ref([]);
    const videos = ref([]);

    watch(
        () => dataset.data.articles,
        (rows) => {
            articles.value = (rows || []).map((row) => ({ ...row }));
        },
        { immediate: true },
    );

    watch(
        () => dataset.data.videos,
        (rows) => {
            videos.value = (rows || []).map((row) => ({ ...row }));
        },
        { immediate: true },
    );

    // Read-only collections. Straight derivations of the loaded dataset.
    const events = computed(() => dataset.data.events || []);
    const eventKinds = computed(() => dataset.data.eventKinds || []);
    const articleCategories = computed(
        () => dataset.data.articleCategories || [],
    );
    const shelfItems = computed(() => dataset.data.shelfItems || []);

    const houseFormulas = computed(
        () => dataset.data.formulaLibrary?.sys || [],
    );
    const classicFormulas = computed(
        () => dataset.data.formulaLibrary?.preset || [],
    );

    /**
     * The classical sources the preset library cites, in first-seen order. Built
     * from the records rather than declared, so a new prescription brings its
     * source with it.
     */
    const classicSources = computed(() => [
        ...new Set(
            classicFormulas.value
                .map((formula) => formula.source)
                .filter(Boolean),
        ),
    ]);

    /**
     * Everyone who has written for the library, keyed by their Hebrew name so a
     * select can carry the choice in a query string. The editor offers exactly
     * this list: an article is filed under a contributor the library already
     * knows, not under a free-text name.
     */
    const articleAuthors = computed(() => {
        const seen = new Map();

        articles.value.forEach((article) => {
            const author = article.author;

            if (!author) {
                return;
            }

            const key = isLocalized(author) ? author.he : String(author);

            if (!seen.has(key)) {
                seen.set(key, { key, name: author });
            }
        });

        return [...seen.values()];
    });

    /** The author record one of `articleAuthors` keys points at. */
    function authorByKey(key) {
        return articleAuthors.value.find((entry) => entry.key === key)?.name;
    }

    /**
     * Save an article. A row without an id is new and is prepended; an existing
     * row is replaced where it stands so the reader's sort does not jump.
     *
     * @param {object} article
     * @returns {object} the saved row, with its id
     */
    function saveArticle(article) {
        const row = article.id
            ? { ...article }
            : { ...article, id: nextId('a', articles.value) };

        articles.value = upsert(articles.value, row);
        persist(`content/articles/${row.id}`, row);

        return row;
    }

    /**
     * Save a tutorial video slot.
     *
     * @param {object} video
     * @returns {object} the saved row, with its id
     */
    function saveVideo(video) {
        const row = video.id
            ? { ...video }
            : { ...video, id: nextId('v', videos.value) };

        videos.value = upsert(videos.value, row);
        persist(`content/videos/${row.id}`, row);

        return row;
    }

    return {
        articles,
        videos,
        events,
        eventKinds,
        articleCategories,
        articleAuthors,
        shelfItems,
        houseFormulas,
        classicFormulas,
        classicSources,
        authorByKey,
        saveArticle,
        saveVideo,
    };
});
