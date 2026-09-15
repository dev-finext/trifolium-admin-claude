// The arithmetic of one percent-mode ladder, in one place.
//
// The editor needs it to decide whether the group can be saved; the table
// needs it to render each row's state. Both call this over the same rows, so
// the two can never disagree. The store re-validates with lib/ladder on save.
import { computed } from 'vue';

/** A percent settles at one decimal — 12.5 % is a real ladder step. */
export function fixed1(value) {
    return String(Math.round(Number(value) * 10) / 10);
}

/**
 * @param {import('vue').Ref<Array<{lo: string, pct: string}>>} rows
 * @param {import('vue').Ref<boolean>} custom Whether the group owns its bands.
 * @param {import('vue').Ref<number>} baseQty Bands at or below it carry 0 %.
 */
export function useTierRows(rows, custom, baseQty) {
    /** Where each band starts. NaN while the cell is empty or half-typed. */
    const los = computed(() => rows.value.map((row) => parseFloat(row.lo)));

    /** True for a band that starts at or below the base quantity. */
    function isBase(index) {
        const lo = los.value[index];

        return !Number.isNaN(lo) && lo <= baseQty.value;
    }

    /** One percent per band; 0 for base bands, null where none is typed yet. */
    const pcts = computed(() =>
        rows.value.map((row, index) => {
            if (isBase(index)) {
                return 0;
            }

            const value = parseFloat(row.pct);

            return Number.isNaN(value) ? null : value;
        }),
    );

    const filled = computed(
        () => pcts.value.filter((value) => value != null).length,
    );

    /**
     * Why a band's starting quantity is not acceptable. Only a custom scale can
     * be wrong — the shared scale is fixed and always ascends.
     */
    function rangeError(index) {
        if (!custom.value) {
            return null;
        }

        if (Number.isNaN(los.value[index]) || los.value[index] <= 0) {
            return 'required';
        }

        const previous = los.value[index - 1];

        if (
            index > 0 &&
            !Number.isNaN(previous) &&
            los.value[index] <= previous
        ) {
            return 'ascending';
        }

        return null;
    }

    /** The nearest filled percent above this row. */
    function previousPct(index) {
        for (let i = index - 1; i >= 0; i -= 1) {
            if (pcts.value[i] != null) {
                return pcts.value[i];
            }
        }

        return null;
    }

    /**
     * Why a band's percent is not acceptable: missing, outside 0–100, or
     * smaller than the band before it — a ladder never shrinks as the quantity
     * grows.
     */
    function pctError(index) {
        if (isBase(index)) {
            return null;
        }

        const value = pcts.value[index];

        if (value == null) {
            return 'required';
        }

        if (value < 0 || value > 100) {
            return 'range';
        }

        const before = previousPct(index);

        if (before != null && value < before) {
            return 'decreasing';
        }

        return null;
    }

    const rangesOk = computed(
        () =>
            !custom.value ||
            (rows.value.length > 0 &&
                rows.value.every((_, index) => !rangeError(index))),
    );

    /** A group prices nothing until every band carries a sound percent. */
    const complete = computed(
        () =>
            rows.value.length > 0 &&
            rows.value.every((_, index) => !pctError(index)),
    );

    /** `10–20`, or `1000+` for the open-ended last band. */
    function rangeText(index) {
        if (Number.isNaN(los.value[index])) {
            return '—';
        }

        const next = los.value[index + 1];

        return next != null && !Number.isNaN(next)
            ? `${los.value[index]}–${next}`
            : `${los.value[index]}+`;
    }

    return {
        los,
        pcts,
        filled,
        isBase,
        rangeError,
        pctError,
        rangesOk,
        rangeText,
        complete,
    };
}
