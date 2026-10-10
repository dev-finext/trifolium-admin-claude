<script setup>
// The console's one table. A screen supplies columns and rows; the table owns
// the chrome, the empty state, the keyboard affordance and the sorting.
//
// Columns: `[{ k, label, w, nowrap, cls, sortable, sortValue }]`
//   k          field key, and the name of the cell slot: `#cell-<k>="{ row }"`
//   w          column width, any CSS length
//   nowrap     keep the cell on one line
//   sortable   this header sorts; a header without it is not styled as a control
//   cls        a class on this column's cells, header included — for a column
//              that has to stand apart from the rest of the table
//   sortValue  `(row) => comparable` when the raw field is not what sorts
//
// Sorting is real: without `v-model:sort` the table sorts the rows it was given,
// and it emits `sort` either way so a screen that fetches sorted pages can take
// over. A header that cannot sort is plain text — no cursor, no arrow.
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    useAttrs,
    watch,
} from 'vue';
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
    /** `(row) => 'class'` — one more class per row, for meaning, not decoration. */
    rowClass: { type: Function, default: null },
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

// ---- the scroll bar above the table ----------------------------------------
//
// A table wider than the pane scrolls sideways, and the bar that does it sits
// at the far bottom of whatever is scrolling — which on a long table is a
// screen and a half below the columns it moves. So the table carries its own
// bar, directly above the header row, mirroring the real scroller: dragging it
// scrolls that element, and scrolling that element moves it back.
//
// Mirrored rather than moved, because the alternative is to make the table's
// own box the scroller, and that is what takes the sticky header away — the
// header would then stick to the top of a box that is itself scrolling past.
// See the note at the foot of admin.css.

const wrapEl = ref(null);
const tableEl = ref(null);
const stripEl = ref(null);

/** The width the bar scrolls through; 0 means the table fits and there is no bar. */
const scrollSpan = ref(0);

let scroller = null;
let observer = null;

/** The element that actually scrolls this table: its own box, or the page. */
function findScroller() {
    let node = wrapEl.value;

    while (node && node !== document.body) {
        const style = getComputedStyle(node);

        if (/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
            return node;
        }

        node = node.parentElement;
    }

    return null;
}

function measure() {
    const table = tableEl.value;

    if (!table || !scroller) {
        scrollSpan.value = 0;

        return;
    }

    // The table's own width decides whether this table needs a bar; the
    // scroller's decides how far the bar travels, so the two stay in step.
    scrollSpan.value =
        table.scrollWidth > scroller.clientWidth + 1 ? scroller.scrollWidth : 0;
}

/**
 * Copy one scroll position to the other.
 *
 * Each assignment makes the other element fire its own scroll event, so the
 * two would bounce forever — except that by then they already agree, and a
 * mirror that is already in place does nothing. The echo stops itself.
 *
 * A flag would be the obvious alternative and is the wrong one: it has to be
 * cleared on a later tick, and a tab that stops being painted stops running
 * those, which leaves the flag raised and the bar dead for the rest of the
 * session.
 */
function mirror(from, to) {
    if (!from || !to || Math.abs(to.scrollLeft - from.scrollLeft) < 1) {
        return;
    }

    to.scrollLeft = from.scrollLeft;
}

const onStrip = () => mirror(stripEl.value, scroller);
const onScroller = () => mirror(scroller, stripEl.value);

onMounted(() => {
    scroller = findScroller();

    if (!scroller) {
        return;
    }

    scroller.addEventListener('scroll', onScroller, { passive: true });

    if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(measure);
        observer.observe(scroller);

        if (tableEl.value) {
            observer.observe(tableEl.value);
        }
    }

    measure();
});

onBeforeUnmount(() => {
    scroller?.removeEventListener('scroll', onScroller);
    observer?.disconnect();
    observer = null;
    scroller = null;
});

// Columns come and go, and rows change the widest cell; both change the span.
watch(
    () => [props.cols.length, props.rows.length],
    async () => {
        await nextTick();

        if (observer && tableEl.value) {
            observer.observe(tableEl.value);
        }

        measure();
    },
);

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
    <div v-if="!rows.length" v-bind="passthrough" class="a-tbl">
        <div class="a-tablewrap">
            <slot name="empty">
                <AEmpty
                    :title="t('ui.noResults')"
                    :sub="t('ui.noResultsHint')"
                />
            </slot>
        </div>
    </div>
    <div v-else v-bind="passthrough" class="a-tbl">
        <div
            v-show="scrollSpan"
            ref="stripEl"
            class="a-tscroll"
            aria-hidden="true"
            @scroll="onStrip"
        >
            <div :style="{ width: `${scrollSpan}px` }" />
        </div>
        <div
            ref="wrapEl"
            class="a-tablewrap"
            :class="{ 'is-capped': Boolean(maxHeight) }"
            :style="wrapStyle"
        >
            <table ref="tableEl" class="a-table">
                <thead>
                    <tr>
                        <th
                            v-for="col in cols"
                            :key="col.k"
                            scope="col"
                            :class="col.cls"
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
                        :class="[
                            {
                                'is-sel':
                                    selected !== null &&
                                    selected === keyOf(row, i),
                            },
                            rowClass ? rowClass(row) : null,
                        ]"
                        :tabindex="rowHandler ? 0 : undefined"
                        @click="activate(row)"
                        @keydown.enter.prevent="activate(row)"
                    >
                        <td
                            v-for="col in cols"
                            :key="col.k"
                            :class="[{ nowrap: col.nowrap }, col.cls]"
                        >
                            <slot :name="`cell-${col.k}`" :row="row" :index="i">
                                {{ cellText(col, row) }}
                            </slot>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
/* The bar that scrolls the table, above the header row rather than at the foot
   of whatever is scrolling. It is a scrollport holding nothing but a strip as
   wide as the scroll takes; `v-show` keeps it away when the table fits.
 *
 * It sticks, for the same reason the header row does: on a thousand-row table a
 * control that exists only at the top of the table is a control you have to
 * scroll back up to reach, which is the complaint it was built to answer. The
 * header comes to rest `--a-strip-h` lower so the two sit one above the other
 * instead of on top of each other — `--a-thead-top` in admin.css is the hook
 * that was already there for exactly this.
 *
 * One root, not two: a component with a fragment root does not carry its
 * caller's style scope, and three screens style this table through `:deep()`.
 */
.a-tbl {
    --a-strip-h: 12px;
    --a-thead-top: var(--a-strip-h);
}

.a-tscroll {
    position: sticky;
    top: calc(0px - var(--a-pane-pad, 0px));
    z-index: 4;
    overflow-x: auto;
    overflow-y: hidden;
    height: var(--a-strip-h);
    background: var(--a-bg);
    scrollbar-width: thin;
    scrollbar-color: var(--a-line) transparent;
}

.a-tscroll > div {
    height: 1px;
}

/* Drawn rather than left to the platform: an overlay scrollbar that only
   appears while something is scrolling is not a control anybody will find. */
.a-tscroll::-webkit-scrollbar {
    height: 10px;
}

.a-tscroll::-webkit-scrollbar-track {
    background: var(--a-bg);
    border-radius: 999px;
}

.a-tscroll::-webkit-scrollbar-thumb {
    background: var(--a-line);
    border-radius: 999px;
}

.a-tscroll::-webkit-scrollbar-thumb:hover {
    background: var(--a-ink-4);
}

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
