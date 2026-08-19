// Multi-select filtering with facet counts.
//
// A screen declares its filterable fields once; this file answers the two
// questions a filter UI has to ask:
//
//   1. which rows survive the whole filter set?
//   2. for one field, how many rows does each of its values still hold —
//      counted against every OTHER active filter, not against the raw table?
//
// The second is what makes multi-select a working tool instead of a guess: the
// count beside a checkbox is what the reader will get if they tick it, so an
// option that would return nothing can be shown as such before it is clicked.
//
// A field is declared as:
//
//   { key: 'status', kind: 'set', values: (row) => ['paid'] }        // membership
//   { key: 'total',  kind: 'num', value:  (row) => row.pricing.total } // operator
//
// `set` selections are arrays and read as OR within the field, AND across
// fields — the behaviour people expect from a filter panel. `num` selections are
// `{ op: 'gt' | 'lt' | 'eq', v: '400' }`.

/** Operators a numeric field accepts, in the order a picker should show them. */
export const NUM_OPS = ['gt', 'lt', 'eq'];

/** Is this field's filter actually narrowing anything? */
export function isActive(field, selection) {
    if (!selection) {
        return false;
    }

    if (field.kind === 'num') {
        return (
            selection.v !== '' &&
            selection.v !== null &&
            selection.v !== undefined
        );
    }

    return Array.isArray(selection) && selection.length > 0;
}

/** The keys of every field currently narrowing the list. */
export function activeKeys(fields, filters) {
    return fields
        .filter((field) => isActive(field, filters[field.key]))
        .map((field) => field.key);
}

/** Does one row satisfy one field's selection? */
function rowMatches(row, field, selection) {
    if (field.kind === 'num') {
        const target = Number(selection.v);

        if (!Number.isFinite(target)) {
            return true;
        }

        const value = Number(field.value(row));

        if (selection.op === 'lt') {
            return value < target;
        }

        if (selection.op === 'eq') {
            return value === target;
        }

        return value > target;
    }

    // OR within a field: a row matching any selected value stays.
    return field.values(row).some((value) => selection.includes(value));
}

/**
 * Rows passing every active filter, optionally ignoring one field.
 *
 * `skipKey` is what makes facet counts correct: a field's own selection must not
 * constrain its own option counts, or ticking a second value in the same field
 * would always show zero.
 */
export function applyFilters(rows, fields, filters, skipKey = null) {
    const live = fields.filter(
        (field) => field.key !== skipKey && isActive(field, filters[field.key]),
    );

    if (!live.length) {
        return rows;
    }

    return rows.filter((row) =>
        live.every((field) => rowMatches(row, field, filters[field.key])),
    );
}

/**
 * Every value one field takes across the table, with the count it would return
 * given the other active filters. Selected values are always included even at
 * zero, so a reader can always see and untick what they chose.
 *
 * @returns {Array<{ value: *, n: number, selected: boolean }>}
 */
export function facetsOf(rows, fields, filters, key) {
    const field = fields.find((one) => one.key === key);

    if (!field || field.kind === 'num') {
        return [];
    }

    const selection = Array.isArray(filters[key]) ? filters[key] : [];
    const counts = new Map();

    // Every value the field can take, so an option never vanishes mid-filter.
    rows.forEach((row) => {
        field.values(row).forEach((value) => {
            if (!counts.has(value)) {
                counts.set(value, 0);
            }
        });
    });

    applyFilters(rows, fields, filters, key).forEach((row) => {
        field.values(row).forEach((value) => {
            counts.set(value, (counts.get(value) || 0) + 1);
        });
    });

    return [...counts]
        .map(([value, n]) => ({
            value,
            n,
            selected: selection.includes(value),
        }))
        .sort((a, b) => {
            // Selected first so the current choice is never scrolled away, then
            // by how much each option would return.
            if (a.selected !== b.selected) {
                return a.selected ? -1 : 1;
            }

            return b.n - a.n;
        });
}

/** Toggle one value inside a set field, returning the next selection. */
export function toggleValue(selection, value) {
    const list = Array.isArray(selection) ? selection : [];

    return list.includes(value)
        ? list.filter((one) => one !== value)
        : [...list, value];
}

/** An empty selection for each field — what "clear all" resets to. */
export function emptyFilters(fields) {
    return Object.fromEntries(
        fields.map((field) => [
            field.key,
            field.kind === 'num' ? { op: 'gt', v: '' } : [],
        ]),
    );
}
