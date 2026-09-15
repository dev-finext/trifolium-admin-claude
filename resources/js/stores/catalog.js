// The catalog domain: shelf products, their label taxonomy, and the tiered
// price lists — discount ladders that price formula ingredients by quantity off
// each item's own unit price (the arithmetic is lib/ladder.js).
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

import {
    DEFAULT_MIN_STOCK,
    PRICE_UOM_IDS,
    PRODUCT_STATUS,
    SETTINGS,
} from '@/config';
import { persist } from '@/data/source';
import i18n from '@/i18n';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { ladderTable, ladderTop, priceAt, validateLadder } from '@/lib/ladder';
import { L, loc } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

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

/** Does a product's price fall in one band? Bands are open at the bottom. */
export function inPriceBand(product, band) {
    if (band.min !== null && product.net <= band.min) {
        return false;
    }

    return !(band.max !== null && product.net > band.max);
}

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

/**
 * What the shelf catalogue can be filtered by, declared once beside the store
 * that holds it.
 *
 * Two fields answer questions the raw values cannot: `ptags` asks whether a
 * product has been filed under anything at all, which a list of categories can
 * never say, and `pstate` folds stock and minimum into the three states the
 * shelf is actually managed by — sellable, under its minimum, gone.
 *
 * There is no display text here: `group` and every value are ids, and the
 * drawer resolves them through the locale catalogs.
 */
export const PRODUCT_FILTER_FIELDS = [
    {
        key: 'pstatus',
        group: 'state',
        kind: 'set',
        prefix: 'products.status',
        values: (product) => [product.status],
    },
    {
        key: 'pstate',
        group: 'state',
        kind: 'set',
        prefix: 'products.filter.stockState',
        values: (product) => [
            !(product.stock > 0)
                ? 'zero'
                : isBlockedForSale(product)
                  ? 'low'
                  : 'ok',
        ],
    },
    {
        key: 'pstock',
        group: 'state',
        kind: 'num',
        value: (product) => product.stock || 0,
    },
    {
        key: 'plabel',
        group: 'catalogue',
        kind: 'set',
        values: (product) => product.labels || [],
    },
    {
        key: 'ptags',
        group: 'catalogue',
        kind: 'set',
        prefix: 'products.filter.tagState',
        values: (product) => [product.labels?.length ? 'has' : 'none'],
    },
    {
        key: 'pimg',
        group: 'catalogue',
        kind: 'set',
        prefix: 'products.filter.imageState',
        values: (product) => [product.img ? 'has' : 'none'],
    },
    {
        key: 'puom',
        group: 'catalogue',
        kind: 'set',
        prefix: 'products.unit',
        values: (product) => (product.wUom ? [product.wUom] : []),
    },
    {
        key: 'pband',
        group: 'price',
        kind: 'set',
        values: (product) => {
            const band = PRODUCT_PRICE_BANDS.find((one) =>
                inPriceBand(product, one),
            );

            return band ? [band.id] : [];
        },
    },
];

export const PRODUCT_FILTER_GROUPS = ['state', 'catalogue', 'price'];

export const useCatalogStore = defineStore('catalog', () => {
    const dataset = useDatasetStore();

    const products = ref([]);
    const labels = ref([]);
    const itemsStore = useItemsStore();

    /**
     * The price groups, read from and written to the dataset in place — the
     * item card and the Pricing screen must see the same ladder.
     */
    const priceGroups = computed(() => dataset.priceGroups);

    /** The live price-group collection, created on first write. */
    function groupBag() {
        if (!Array.isArray(dataset.data.priceGroups)) {
            dataset.data.priceGroups = [];
        }

        return dataset.data.priceGroups;
    }

    /** The quantity scale a percent-mode group inherits when it defines none of its own. */
    const defaultBreaks = computed(() => dataset.data.priceBreaks || []);

    /** Units a ladder can be written for. */
    const priceUoms = PRICE_UOM_IDS;

    /** The spreadsheet parse the import review screen shows, when one is pending. */
    const priceImport = computed(() => dataset.data.priceImport || null);

    /**
     * Every item as `{ sku, name }` — the catalogue the SKU lookup and the
     * editor's preview total read. The items collection is the one source;
     * there is no separate SKU list for pricing.
     */
    const ingredientSkus = computed(() =>
        itemsStore.items.map((item) => ({ sku: item.sku, name: item.names })),
    );

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

    const resolveSku = (sku) => resolveGroup(sku, priceGroups.value);

    const groupById = (groupId) =>
        priceGroups.value.find((group) => group.id === groupId) || null;

    /**
     * The group that prices an item: `'none'` is a fixed price, an id is an
     * explicit assignment, `null` inherits the longest-prefix rule on the SKU.
     */
    const groupForItem = (item) =>
        item?.priceGroup === 'none'
            ? null
            : item?.priceGroup
              ? groupById(item.priceGroup)
              : (resolveSku(item?.sku)?.group ?? null);

    /** The item's own unit price, before VAT, per its sales unit. */
    const unitPriceOf = (item) => item?.price?.sale ?? null;

    /** The items a group prices — explicitly assigned or inherited by prefix. */
    const itemsOfGroup = (groupId) =>
        itemsStore.items.filter((item) => groupForItem(item)?.id === groupId);

    /** `itemsOfGroup` in the `{ sku, name }` shape the preview list and the lookup read. */
    const skusOfGroup = (groupId) =>
        itemsOfGroup(groupId).map((item) => ({
            sku: item.sku,
            name: item.names,
        }));

    /**
     * What a set of prefixes would price, as the editor is typed into: an item
     * counts where the typed prefix is at least as long as any other group's
     * claim on its SKU, unless the item names its group itself — an explicit
     * assignment follows its group, `'none'` follows nobody.
     */
    const skusForPrefixes = (prefixes, selfId) => {
        if (!prefixes.length) {
            return [];
        }

        const others = priceGroups.value.filter((group) => group.id !== selfId);

        return itemsStore.items
            .filter((item) => {
                if (item.priceGroup) {
                    return item.priceGroup === selfId;
                }

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
            })
            .map((item) => ({ sku: item.sku, name: item.names }));
    };

    /**
     * The calculator rows for an item — its own unit price run through its
     * group's ladder, before and including VAT. Empty for a fixed price or
     * while the item has no unit price yet.
     */
    const ladderFor = (item) => {
        const group = groupForItem(item);
        const unitPrice = unitPriceOf(item);

        return group && unitPrice !== null
            ? ladderTable(
                  group,
                  unitPrice,
                  SETTINGS.vatRate,
                  defaultBreaks.value,
              )
            : [];
    };

    /** The item's unit price at one quantity, after its ladder. */
    const priceForItem = (item, qty) =>
        priceAt(unitPriceOf(item), groupForItem(item), qty);

    /**
     * Ladder quantities are in the item's sales unit, whatever the group was
     * written for; the calculator warns when the two differ.
     */
    const uomMismatch = (item) => {
        const group = groupForItem(item);

        return Boolean(
            group && item?.uom?.sales && group.uom !== item.uom.sales,
        );
    };

    /** The deepest band of a group — `{ from, pct }` — for the overview and the items drawer. */
    const topOfGroup = (group) => ladderTop(group);

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

    /** `null` for an empty form field, else the number it holds. */
    const numberOrNull = (value) =>
        value === '' || value === null || value === undefined
            ? null
            : Number(value);

    /**
     * A group as the form typed it, in the shape the ladder arithmetic reads:
     * numbers coerced, the mode's other half emptied, and every percent-mode
     * band that starts at or below the base quantity forced to 0.
     */
    function normalizeGroup(draft) {
        const mode = draft.mode || 'percent';
        const baseQty = numberOrNull(draft.baseQty);
        const breaks =
            mode === 'percent' ? (draft.breaks || []).map(numberOrNull) : [];
        const percents =
            mode === 'percent'
                ? breaks.map((qty, i) =>
                      baseQty !== null && qty !== null && qty <= baseQty
                          ? 0
                          : numberOrNull((draft.percents || [])[i]),
                  )
                : [];
        const source = draft.formula || {};
        const formula =
            mode === 'formula'
                ? source.kind === 'curve'
                    ? {
                          kind: 'curve',
                          k: numberOrNull(source.k),
                          floorPct: numberOrNull(source.floorPct),
                      }
                    : {
                          kind: source.kind || 'step',
                          stepQty: numberOrNull(source.stepQty),
                          stepPct: numberOrNull(source.stepPct),
                          floorPct: numberOrNull(source.floorPct),
                      }
                : null;

        return {
            ...draft,
            prefixes: (draft.prefixes || []).map((prefix) =>
                String(prefix).trim(),
            ),
            mode,
            baseQty,
            breaks,
            percents,
            formula,
        };
    }

    /** Why a draft cannot be saved: LADDER_ERROR_IDS, plus `prefix_conflict` when a prefix overlaps another group's. */
    function groupErrors(draft) {
        const group = normalizeGroup(draft);
        const errors = validateLadder(group);

        if (conflictsFor(group.prefixes, group.id || null).length) {
            errors.push('prefix_conflict');
        }

        return errors;
    }

    /**
     * Save a pricing group. The ladder is validated first — a shrinking ladder
     * or an overlapping prefix is refused, never saved with a warning — and
     * `updated` / `updatedBy` are stamped here so the overview always shows who
     * last touched it.
     */
    function savePriceGroup(draft) {
        const errors = groupErrors(draft);

        if (errors.length) {
            throw new Error(
                `Price group cannot be saved: ${errors.join(', ')}`,
            );
        }

        const rows = groupBag();
        const isNew = !draft.id;
        const group = {
            ...normalizeGroup(draft),
            id: draft.id || nextId('g', rows),
            updated: moment(),
            updatedBy: dataset.me?.name || dataset.session?.actor || null,
        };
        const index = rows.findIndex((row) => row.id === group.id);

        if (index < 0) {
            rows.push(group);
        } else {
            rows.splice(index, 1, group);
        }

        logAction({
            act: isNew ? 'price_group_create' : 'price_group_update',
            entType: 'price_group',
            ent: group.id,
            to: group.name,
        });

        persist(`price-groups/${group.id}`, group, isNew ? 'POST' : 'PUT');

        return group;
    }

    /**
     * Delete a group. Items that named it explicitly fall back to the prefix
     * rule (`priceGroup: null`) so no card points at a ladder that is gone; the
     * server cascades the same way.
     *
     * @returns {number} how many items were priced by the group
     */
    function deletePriceGroup(group) {
        const affected = itemsOfGroup(group.id).length;
        const rows = groupBag();
        const index = rows.findIndex((row) => row.id === group.id);

        if (index >= 0) {
            rows.splice(index, 1);
        }

        itemsStore.items
            .filter((item) => item.priceGroup === group.id)
            .forEach((item) => {
                item.priceGroup = null;
            });

        logAction({
            act: 'price_group_delete',
            entType: 'price_group',
            ent: group.id,
            from: group.name,
        });

        persist(`price-groups/${group.id}`, {}, 'DELETE');

        return affected;
    }

    /**
     * Apply the reviewed rows of a spreadsheet import: each valid row sets one
     * band's percentage on a percent-mode group, and every touched group is
     * saved through the normal path. A group whose imported ladder would not
     * validate is left untouched and reported.
     *
     * @returns {{ applied: number, skipped: number, rejected: [{ group: string, errors: string[] }] }}
     */
    function applyPriceImport(rows) {
        const drafts = new Map();
        let skipped = 0;

        rows.forEach((row) => {
            const group = row.err ? null : groupById(row.group);

            if (
                !group ||
                group.mode !== 'percent' ||
                row.index === null ||
                row.index >= group.breaks.length
            ) {
                skipped += 1;

                return;
            }

            if (!drafts.has(group.id)) {
                drafts.set(group.id, {
                    ...group,
                    percents: [...group.percents],
                    rows: 0,
                });
            }

            const draft = drafts.get(group.id);

            draft.percents[row.index] = Number(row.next);
            draft.rows += 1;
        });

        const rejected = [];
        let applied = 0;

        drafts.forEach(({ rows: count, ...draft }) => {
            const errors = groupErrors(draft);

            if (errors.length) {
                rejected.push({ group: draft.id, errors });
                skipped += count;

                return;
            }

            savePriceGroup(draft);
            applied += count;
        });

        return { applied, skipped, rejected };
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
        priceImport,
        approvalPin,

        publishedProducts,
        archivedProducts,
        blockedProducts,
        weightUnitsInUse,
        labelUsage,
        labelById,
        groupById,
        groupForItem,
        unitPriceOf,
        itemsOfGroup,
        skusOfGroup,
        skusForPrefixes,
        ladderFor,
        priceForItem,
        uomMismatch,
        topOfGroup,
        resolveSku,
        conflictsFor,
        isCustomScale,
        groupErrors,
        statusTone,

        saveProduct,
        archiveProduct,
        restoreProduct,
        createLabel,
        renameLabel,
        deleteLabel,
        savePriceGroup,
        deletePriceGroup,
        applyPriceImport,
        logExport,
    };
});
