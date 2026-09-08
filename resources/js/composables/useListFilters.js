// One list, one filter system.
//
// A screen declares a *spec* — which fields are filterable, how a row yields its
// values for each, and where the labels live — and this composable binds it to
// the screen's URL state. Every list in the console goes through here, so the
// filter behaves the same everywhere: multi-select within a field, AND across
// fields, counts that answer "what would I get", and a filter that survives a
// pasted link.
//
// The spec:
//
//   {
//     id: 'items',            // storage key for saved views
//     ns: 'items',            // locale namespace: <ns>.filter.field.<key>
//     noun: t('nav.item.items'),   // what the count line counts
//     fields: [...],          // see lib/facets.js for a field's shape
//     groups: ['what', 'stock'],   // drawer sections, <ns>.filterGroup.<id>
//     units: { price: '₪' },  // suffix for a numeric field's input
//   }
//
// A `set` field may carry `prefix: 'items.family'`, and the drawer reads its
// option text from `<prefix>.<value>`. A field whose values are record content
// rather than ids (a city, a person) carries `optionLabel` instead.
import { computed, reactive, watch } from 'vue';

import {
    activeKeys,
    applyFilters,
    emptyFilters,
    isActive,
    toggleValue,
} from '@/lib/facets';

/**
 * @param {object} spec      The screen's filter spec.
 * @param {object} view      The reactive `useUrlState` object holding the filters.
 * @param {import('vue').Ref<Array>} source  Rows before any field filter.
 */
export function useListFilters(spec, view, source) {
    const fields = spec.fields || [];

    /** Which fields are narrowing the list right now. */
    const active = computed(() => activeKeys(fields, view));

    /** True while anything is narrowing the list — what "clear" is offered for. */
    const dirty = computed(() => active.value.length > 0);

    /** The rows that survive every active field filter. */
    const rows = computed(() => applyFilters(source.value, fields, view));

    /** How many values are chosen in one field. */
    function chosen(key) {
        const field = fields.find((one) => one.key === key);

        if (!field || !isActive(field, view[key])) {
            return 0;
        }

        return field.kind === 'num' ? 1 : view[key].length;
    }

    /** The screen owns the state; the drawer and the chips send patches here. */
    function patch(next) {
        Object.assign(view, next);
    }

    function toggle(key, value) {
        patch({ [key]: toggleValue(view[key], value) });
    }

    function clearField(key) {
        const field = fields.find((one) => one.key === key);

        patch({ [key]: field?.kind === 'num' ? { op: 'gt', v: '' } : [] });
    }

    function clear() {
        patch(emptyFilters(fields));
    }

    // A reactive object rather than a bag of refs: the screen and its template
    // both read `filters.rows` and `filters.dirty` as plain values.
    return reactive({
        fields,
        active,
        dirty,
        rows,
        chosen,
        patch,
        toggle,
        clearField,
        clear,
    });
}

/** The defaults a screen hands `useUrlState` so every field round-trips. */
export function filterDefaults(spec) {
    return emptyFilters(spec.fields || []);
}

/**
 * One page of a filtered list, with the page and its size in the URL.
 *
 * The prototype's fixture fits on one page; the real list will not, and this is
 * the contract for that — the same two parameters a server pager takes.
 *
 * @param {import('vue').Ref<Array>} rows  The filtered rows.
 * @param {object} view  The URL state, holding `pg` and `ps`.
 */
export function usePaged(rows, view) {
    const total = computed(() => rows.value.length);
    const pages = computed(() =>
        Math.max(1, Math.ceil(total.value / (Number(view.ps) || 50))),
    );

    // A filter that shortens the list must not leave the reader on a page that
    // no longer exists.
    watch(pages, (n) => {
        if (Number(view.pg) > n) {
            view.pg = 1;
        }
    });

    const paged = computed(() => {
        const size = Number(view.ps) || 50;
        const page = Math.min(Math.max(1, Number(view.pg) || 1), pages.value);

        return rows.value.slice((page - 1) * size, page * size);
    });

    return { paged, total, pages };
}

/** The page keys a screen adds to its URL state alongside the filters. */
export const PAGE_DEFAULTS = { pg: 1, ps: 50 };
