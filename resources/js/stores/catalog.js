// The catalog domain: shelf products, their label taxonomy, and the tiered
// price lists that price formula ingredients by quantity.
//
// Rows arrive from the dataset store (never from @/demo) and are copied into
// this store, which is what the screens mutate. Every mutation is optimistic and
// calls persist(), a no-op against the fixture — the console is fully
// interactive without a backend and never pretends a request happened.
//
// The pricing resolution rules below (longest matching prefix wins, overlapping
// prefixes are forbidden) are business rules, not sample data. They are stated
// here rather than imported from @/demo so that pointing the console at an API
// does not drag the fixture into the bundle.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { DEFAULT_MIN_STOCK, PRODUCT_STATUS } from '@/config';
import { persist } from '@/data/source';
import i18n from '@/i18n';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { L, loc } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Field limits the product form enforces. These are product configuration and
 * belong in config/catalog.js; they live here until that file can be extended.
 */
export const PRODUCT_RULES = {
    name: { min: 2, max: 120 },
    content: { max: 60 },
    sku: { min: 3, max: 20, pattern: /^[0-9A-Za-z-]+$/ },
    label: { min: 2, max: 30 },
    /** How many labels one product may carry. */
    maxLabels: 10,
    minStock: { max: 9999 },
    image: {
        types: ['image/jpeg', 'image/png', 'image/webp'],
        maxMb: 5,
        /** Recommended square edge, in pixels. */
        recommendedPx: 1000,
    },
};

/** The price bands the catalogue filter offers, in shekels before VAT. */
export const PRODUCT_PRICE_BANDS = [
    { id: 'lt50', min: null, max: 50 },
    { id: '50to100', min: 50, max: 100 },
    { id: 'gt100', min: 100, max: null },
];

/** A free-text query is treated as a SKU lookup from this many digits on. */
export const PRICE_SKU_QUERY_MIN_DIGITS = 3;

/** Digits a SKU prefix may hold. */
export const PRICE_PREFIX_MAX_DIGITS = 6;

/** Upper case, no whitespace — the one canonical form of a SKU. */
export function normalizeSku(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/\s+/g, '');
}

/** `10–20` / `1000+` for band `index` of a group's own scale. */
export function bandText(breaks, index) {
    return breaks[index + 1] != null
        ? `${breaks[index]}–${breaks[index + 1]}`
        : `${breaks[index]}+`;
}

/**
 * The group that prices a SKU: the longest matching prefix wins, which is
 * exactly why two groups may never own overlapping prefixes.
 */
export function resolveGroup(sku, groups) {
    let best = null;

    groups.forEach((group) => {
        group.prefixes.forEach((prefix) => {
            if (
                String(sku).startsWith(prefix) &&
                (!best || prefix.length > best.prefix.length)
            ) {
                best = { group, prefix };
            }
        });
    });

    return best;
}

/** Prefixes that would collide with another group's — always forbidden. */
export function prefixConflicts(prefixes, groups, selfId) {
    const conflicts = [];

    groups.forEach((group) => {
        if (group.id === selfId) {
            return;
        }

        group.prefixes.forEach((theirs) => {
            prefixes.forEach((mine) => {
                if (mine.startsWith(theirs) || theirs.startsWith(mine)) {
                    conflicts.push({ mine, theirs, group });
                }
            });
        });
    });

    return conflicts;
}

/** A product is blocked for sale while its stock sits under its minimum. */
export function isBlockedForSale(product) {
    const stock = product.stock == null ? 0 : product.stock;
    const min = product.minStock == null ? DEFAULT_MIN_STOCK : product.minStock;

    return stock < min;
}

/** `{ he, en }` for one of this area's own catalog keys. */
function catalogText(key, named = {}) {
    return L(
        i18n.global.t(key, named, { locale: 'he' }),
        i18n.global.t(key, named, { locale: 'en' }),
    );
}

/** The next free `p3`, `lb7`, `g4` — deterministic, never a timestamp. */
function nextId(prefix, rows) {
    const highest = rows.reduce((top, row) => {
        const match = String(row.id).match(/(\d+)$/);

        return match ? Math.max(top, Number(match[1])) : top;
    }, 0);

    return `${prefix}${highest + 1}`;
}

/** One moment, in the three language-neutral forms a log row carries. */
function moment() {
    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(now()),
        stamp: stamp(0),
    };
}

export const useCatalogStore = defineStore('catalog', () => {
    const dataset = useDatasetStore();

    const products = ref([]);
    const labels = ref([]);
    const priceGroups = ref([]);

    /** The ingredient SKU catalogue the price lists resolve against. */
    const ingredientSkus = computed(() => dataset.data.ingredientSkus || []);

    /** The quantity scale a group inherits when it defines none of its own. */
    const defaultBreaks = computed(() => dataset.data.priceBreaks || []);

    /** Units a price list can be quoted per. */
    const priceUoms = computed(() => dataset.data.priceUoms || []);

    /**
     * The approval code the irreversible actions in this area sit behind. The
     * dialog validates it; `true` means "require a code" while the session has
     * not loaded, so the gate never silently disappears.
     */
    const approvalPin = computed(() => dataset.session?.pin || true);

    // Seeding, not syncing: the copies are re-taken only when the dataset
    // itself is (re)loaded, so a local edit is never quietly overwritten.
    watch(
        () => dataset.products,
        (rows) => {
            products.value = rows.map((row) => ({
                ...row,
                labels: [...(row.labels || [])],
            }));
        },
        { immediate: true },
    );

    watch(
        () => dataset.data.productLabels,
        (rows) => {
            labels.value = (rows || []).map((row) => ({ ...row }));
        },
        { immediate: true },
    );

    watch(
        () => dataset.priceGroups,
        (rows) => {
            priceGroups.value = rows.map((row) => ({
                ...row,
                prefixes: [...(row.prefixes || [])],
                prices: [...(row.prices || [])],
                breaks: [...(row.breaks || [])],
            }));
        },
        { immediate: true },
    );

    // ---- derivations ---------------------------------------------------------

    const publishedProducts = computed(() =>
        products.value.filter((product) => product.status === 'published'),
    );

    const archivedProducts = computed(() =>
        products.value.filter((product) => product.status === 'archived'),
    );

    const blockedProducts = computed(() =>
        products.value.filter(isBlockedForSale),
    );

    /** Weight units that actually occur in the catalogue, for the filter. */
    const weightUnitsInUse = computed(() => [
        ...new Set(products.value.map((product) => product.wUom)),
    ]);

    /** How many products carry one label. */
    const labelUsage = (labelId) =>
        products.value.filter((product) => product.labels.includes(labelId))
            .length;

    const labelById = (labelId) =>
        labels.value.find((label) => label.id === labelId) || null;

    /** The SKUs a group prices, after every other group's claim is honoured. */
    const skusOfGroup = (groupId) =>
        ingredientSkus.value.filter((item) => {
            const hit = resolveGroup(item.sku, priceGroups.value);

            return hit && hit.group.id === groupId;
        });

    /**
     * What a set of prefixes would price, as the editor is typed into: a SKU
     * counts only where the typed prefix is at least as long as any other
     * group's claim on it.
     */
    const skusForPrefixes = (prefixes, selfId) => {
        if (!prefixes.length) {
            return [];
        }

        const others = priceGroups.value.filter((group) => group.id !== selfId);

        return ingredientSkus.value.filter((item) => {
            let mine = 0;

            prefixes.forEach((prefix) => {
                if (item.sku.startsWith(prefix)) {
                    mine = Math.max(mine, prefix.length);
                }
            });

            if (!mine) {
                return false;
            }

            let theirs = 0;

            others.forEach((group) =>
                group.prefixes.forEach((prefix) => {
                    if (item.sku.startsWith(prefix)) {
                        theirs = Math.max(theirs, prefix.length);
                    }
                }),
            );

            return mine >= theirs;
        });
    };

    const resolveSku = (sku) => resolveGroup(sku, priceGroups.value);

    /**
     * True when a group carries its own quantity scale rather than the shared
     * one. Capsules are bought in thousands, so their bands are nothing like
     * the default 1–5–10 ladder.
     */
    const isCustomScale = (group) => {
        const bands = group.breaks || [];
        const shared = defaultBreaks.value;

        return (
            bands.length !== shared.length ||
            bands.some((band, i) => band !== shared[i])
        );
    };

    const conflictsFor = (prefixes, selfId) =>
        prefixConflicts(prefixes, priceGroups.value, selfId);

    // ---- the system log -----------------------------------------------------

    /**
     * One immutable row per state-changing action. `act` is always an id from
     * LOG_ACTION_IDS — the taxonomy is closed, which is what keeps the log
     * filterable and translatable.
     */
    function logAction({ act, entType, ent, from = null, to = null }) {
        const rows = dataset.data.log;

        if (!Array.isArray(rows)) {
            return;
        }

        rows.unshift({
            id: `lg-${act}-${rows.length}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || dataset.session?.actor || null,
            act,
            entType,
            ent,
            valueType: 'text',
            from,
            to,
            src: 'manual',
            ip: null,
        });
    }

    const statusText = (id) => catalogText(`products.status.${id}`);

    // ---- products -----------------------------------------------------------

    /**
     * Create or update one product. A new product is published on creation, so
     * it writes both a create row and a publish row.
     *
     * @returns {object} the stored product
     */
    function saveProduct(draft) {
        const isNew = !draft.id;
        const product = {
            ...draft,
            id: draft.id || nextId('p', products.value),
            created: draft.created || isoDaysAgo(0),
        };

        if (isNew) {
            products.value = [product, ...products.value];
        } else {
            products.value = products.value.map((row) =>
                row.id === product.id ? product : row,
            );
        }

        logAction({
            act: isNew ? 'product_create' : 'product_update',
            entType: 'product',
            ent: product.sku,
            to: product.name,
        });

        if (isNew) {
            logAction({
                act: 'product_publish',
                entType: 'product',
                ent: product.sku,
                to: statusText('published'),
            });
        }

        persist(`products/${product.id}`, product, isNew ? 'POST' : 'PUT');

        return product;
    }

    function setProductStatus(product, status, act, reason) {
        products.value = products.value.map((row) =>
            row.id === product.id ? { ...row, status } : row,
        );

        logAction({
            act,
            entType: 'product',
            ent: product.sku,
            from: statusText(product.status),
            to: statusText(status),
        });

        persist(`products/${product.id}/status`, { status, reason }, 'PUT');
    }

    /** Archive a product. Nothing is ever deleted: archiving is reversible. */
    function archiveProduct(product, reason) {
        setProductStatus(product, 'archived', 'product_archive', reason);
    }

    function restoreProduct(product) {
        setProductStatus(product, 'published', 'product_restore', null);
    }

    /** Only the two ids in PRODUCT_STATUS are valid, and both carry a tone. */
    const statusTone = (id) => PRODUCT_STATUS[id]?.tone || 'gray';

    // ---- labels -------------------------------------------------------------

    function createLabel(name) {
        const label = {
            id: nextId('lb', labels.value),
            name: L(name, name),
            created: isoDaysAgo(0),
        };

        labels.value = [...labels.value, label];

        logAction({
            act: 'tag_create',
            entType: 'product_label',
            ent: name,
            to: label.name,
        });

        persist('product-labels', label);

        return label;
    }

    /**
     * Rename a label in the locale the agent is reading, keeping the other
     * language as it was — a Hebrew rename must not erase the English name.
     */
    function renameLabel(label, name, locale) {
        const next = { ...label.name, [locale]: name };

        labels.value = labels.value.map((row) =>
            row.id === label.id ? { ...row, name: next } : row,
        );

        logAction({
            act: 'tag_rename',
            entType: 'product_label',
            ent: loc(next, 'he'),
            from: label.name,
            to: next,
        });

        persist(`product-labels/${label.id}`, { name: next }, 'PUT');
    }

    /** Delete a label and detach it from every product that carried it. */
    function deleteLabel(label, reason) {
        const used = labelUsage(label.id);

        products.value = products.value.map((product) =>
            product.labels.includes(label.id)
                ? {
                      ...product,
                      labels: product.labels.filter((id) => id !== label.id),
                  }
                : product,
        );
        labels.value = labels.value.filter((row) => row.id !== label.id);

        logAction({
            act: 'tag_delete',
            entType: 'product_label',
            ent: loc(label.name, 'he'),
            from: label.name,
        });

        persist(`product-labels/${label.id}`, { reason }, 'DELETE');

        return used;
    }

    // ---- price groups -------------------------------------------------------

    /**
     * Save a pricing group. `updated` / `updatedBy` are stamped here so the
     * overview always shows who last touched a price table.
     */
    function savePriceGroup(draft) {
        const isNew = !draft.id;
        const group = {
            ...draft,
            id: draft.id || nextId('g', priceGroups.value),
            updated: moment(),
            updatedBy: dataset.me?.name || dataset.session?.actor || null,
        };

        if (isNew) {
            priceGroups.value = [...priceGroups.value, group];
        } else {
            priceGroups.value = priceGroups.value.map((row) =>
                row.id === group.id ? group : row,
            );
        }

        persist(`price-groups/${group.id}`, group, isNew ? 'POST' : 'PUT');

        return group;
    }

    function deletePriceGroup(group) {
        priceGroups.value = priceGroups.value.filter(
            (row) => row.id !== group.id,
        );

        persist(`price-groups/${group.id}`, {}, 'DELETE');
    }

    /**
     * Record an export. `rowsKey` names the caller's own `{n} rows` message, so
     * the log row reads correctly in both languages.
     */
    function logExport(filename, rowsKey, rows) {
        logAction({
            act: 'export',
            entType: 'system',
            ent: filename,
            to: catalogText(rowsKey, { n: rows }),
        });
    }

    return {
        products,
        labels,
        priceGroups,
        ingredientSkus,
        defaultBreaks,
        priceUoms,
        approvalPin,

        publishedProducts,
        archivedProducts,
        blockedProducts,
        weightUnitsInUse,
        labelUsage,
        labelById,
        skusOfGroup,
        skusForPrefixes,
        resolveSku,
        conflictsFor,
        isCustomScale,
        statusTone,

        saveProduct,
        archiveProduct,
        restoreProduct,
        createLabel,
        renameLabel,
        deleteLabel,
        savePriceGroup,
        deletePriceGroup,
        logExport,
    };
});
