<script setup>
// The console's one table. A screen supplies columns and rows; the table owns
// the chrome, the empty state, the keyboard affordance and the sorting.
//
// Columns: `[{ k, label, w, nowrap, sortable, sortValue }]`
//   k          field key, and the name of the cell slot: `#cell-<k>="{ row }"`
//   w          column width, any CSS length
//   nowrap     keep the cell on one line
//   sortable   this header sorts; a header without it is not styled as a control
//   sortValue  `(row) => comparable` when the raw field is not what sorts
//
// Sorting is real: without `v-model:sort` the table sorts the rows it was given,
// and it emits `sort` either way so a screen that fetches sorted pages can take
// over. A header that cannot sort is plain text — no cursor, no arrow.
import { computed, ref, useAttrs } from 'vue';
import { useI18n } from 'vue-i18n';

import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { loc } from '@/lib/localized';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    cols: { type: Array, required: true },
    rows: { type: Array, default: () => [] },
    /** `(row, index) => key`, a field name, or nothing for `row.id`. */
    rowKey: { type: [Function, String], default: null },
    /** The key of the row that is currently open. */
    selected: { type: [String, Number], default: null },
    maxHeight: { type: [Number, String], default: null },
    /** `{ key, dir }` — bind with `v-model:sort` to own it, or leave it here. */
    sort: { type: Object, default: null },
});

const emit = defineEmits(['sort', 'update:sort']);

const { t, locale } = useI18n();
const attrs = useAttrs();

// `row` is deliberately not a declared emit: whether a listener exists is what
// decides if rows are presented as clickable at all, and Vue strips declared
// emits out of `$attrs`.
const rowHandler = computed(() =>
    typeof attrs.onRow === 'function' ? attrs.onRow : null,
);

const passthrough = computed(() => {
    const { onRow, ...rest } = attrs;

    return rest;
});

const internalSort = ref(null);
const activeSort = computed(() => props.sort || internalSort.value);

const wrapStyle = computed(() => {
    if (!props.maxHeight) {
        return null;
    }

    return {
        maxHeight:
            typeof props.maxHeight === 'number'
                ? `${props.maxHeight}px`
                : props.maxHeight,
    };
});

function keyOf(row, index) {
    if (typeof props.rowKey === 'function') {
        return props.rowKey(row, index);
    }

    if (typeof props.rowKey === 'string') {
        return row[props.rowKey];
    }

    return row.id ?? index;
}

function isSorted(col) {
    return Boolean(activeSort.value && activeSort.value.key === col.k);
}

function sortDir(col) {
    return isSorted(col) ? activeSort.value.dir : null;
}

/** `aria-sort` belongs only on a header that actually sorts. */
function ariaSort(col) {
    if (!col.sortable) {
        return undefined;
    }

    const dir = sortDir(col);

    if (!dir) {
        return 'none';
    }

    return dir === 'asc' ? 'ascending' : 'descending';
}

/** The title says what the next click will do, not what the state is. */
function sortTitle(col) {
    return sortDir(col) === 'asc' ? t('ui.sortDesc') : t('ui.sortAsc');
}

function toggleSort(col) {
    if (!col.sortable) {
        return;
    }

    const next = {
        key: col.k,
        dir: sortDir(col) === 'asc' ? 'desc' : 'asc',
    };

    internalSort.value = next;
    emit('update:sort', next);
    emit('sort', next);
}

/** What a column sorts by: its accessor if it has one, else the raw field. */
function sortValue(col, row) {
    const raw =
        typeof col.sortValue === 'function' ? col.sortValue(row) : row[col.k];

    if (raw === null || raw === undefined) {
        return '';
    }

    if (typeof raw === 'object') {
        // A `{ he, en }` record value sorts by its Hebrew source text, so the
        // order does not shuffle when the reader switches language.
        return String(raw.he ?? raw.en ?? '');
    }

    return raw;
}

function compare(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }

    return String(a).localeCompare(String(b), locale.value, { numeric: true });
}

const sortedRows = computed(() => {
    const current = activeSort.value;
    const col = current && props.cols.find((c) => c.k === current.key);

    if (!col || !col.sortable) {
        return props.rows;
    }

    const factor = current.dir === 'desc' ? -1 : 1;

    return [...props.rows].sort(
        (a, b) => factor * compare(sortValue(col, a), sortValue(col, b)),
    );
});

/**
 * What a cell shows when the screen gave no `#cell-<k>` slot: the raw field,
 * resolved through `loc()` so a `{ he, en }` record value reads as text instead
 * of as an object.
 */
function cellText(col, row) {
    return loc(row[col.k], locale.value);
}

function activate(row) {
    if (rowHandler.value) {
        rowHandler.value(row);
    }
}
</script>

<template>
    <div v-if="!rows.length" v-bind="passthrough" class="a-tablewrap">
        <slot name="empty">
            <AEmpty :title="t('ui.noResults')" :sub="t('ui.noResultsHint')" />
        </slot>
    </div>
    <div v-else v-bind="passthrough" class="a-tablewrap" :style="wrapStyle">
        <table class="a-table">
            <thead>
                <tr>
                    <th
                        v-for="col in cols"
                        :key="col.k"
                        scope="col"
                        :style="col.w ? { width: col.w } : null"
                        :aria-sort="ariaSort(col)"
                    >
                        <button
                            v-if="col.sortable"
                            type="button"
                            class="a-th-sort"
                            :class="{
                                'is-on': isSorted(col),
                                'is-asc': sortDir(col) === 'asc',
                            }"
                            :title="sortTitle(col)"
                            @click="toggleSort(col)"
                        >
                            {{ col.label }}
                            <AIcon name="chevron_down" :size="14" />
                        </button>
                        <!-- `head-<k>` lets a column put a control in its own
                             header cell — a select-all checkbox, say — while
                             `col.label` stays the accessible name. -->
                        <slot v-else :name="`head-${col.k}`" :col="col">
                            {{ col.label }}
                        </slot>
                    </th>
                </tr>
            </thead>
            <tbody :class="{ 'is-click': rowHandler }">
                <tr
                    v-for="(row, i) in sortedRows"
                    :key="keyOf(row, i)"
                    :class="{
                        'is-sel':
                            selected !== null && selected === keyOf(row, i),
                    }"
                    :tabindex="rowHandler ? 0 : undefined"
                    @click="activate(row)"
                    @keydown.enter.prevent="activate(row)"
                >
                    <td
                        v-for="col in cols"
                        :key="col.k"
                        :class="{ nowrap: col.nowrap }"
                    >
                        <slot :name="`cell-${col.k}`" :row="row" :index="i">
                            {{ cellText(col, row) }}
                        </slot>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
/* The header button inherits the header's typography so a sortable column and a
   plain one read as the same header, not as a button dropped into a table. */
.a-th-sort {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
}

.a-th-sort:hover {
    color: var(--a-ink);
}

.a-th-sort .a-ico {
    opacity: 0.3;
    transition:
        opacity 0.12s,
        transform 0.12s;
}

.a-th-sort.is-on .a-ico {
    opacity: 1;
}

.a-th-sort.is-asc .a-ico {
    transform: rotate(180deg);
}
</style>
