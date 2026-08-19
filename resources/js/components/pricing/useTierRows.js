// The arithmetic of one price table, in one place.
//
// The editor needs it to decide whether the group can be saved; the table needs
// it to render each row's discount, warning and example total. Both call this
// over the same rows, so the two can never disagree.
import { computed } from 'vue';

/** Prices are quoted to the agora, so every price cell settles at 2 decimals. */
export function fixed2(value) {
    return Number(value).toFixed(2);
}

/**
 * @param {import('vue').Ref<Array<{lo: string, price: string}>>} rows
 * @param {import('vue').Ref<boolean>} custom Whether the group owns its bands.
 */
export function useTierRows(rows, custom) {
    /** Where each band starts. NaN while the cell is empty or half-typed. */
    const los = computed(() => rows.value.map((row) => parseFloat(row.lo)));

    /** One price per band, null where the band has none yet. */
    const prices = computed(() =>
        rows.value.map((row) => {
            const value = parseFloat(row.price);

            return Number.isNaN(value) ? null : value;
        }),
    );

    const filled = computed(
        () => prices.value.filter((price) => price != null).length,
    );

    /** The first band's price: every discount is measured against it. */
    const base = computed(() => prices.value[0]);

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

    const rangesOk = computed(
        () =>
            !custom.value ||
            (rows.value.length > 0 &&
                rows.value.every((_, index) => !rangeError(index))),
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

    /**
     * The nearest price above this row. A price that is higher than the one
     * before it is not an error — a supplier may genuinely price that way — but
     * it is worth flagging, so the comparison skips empty bands.
     */
    function previousPrice(index) {
        for (let i = index - 1; i >= 0; i -= 1) {
            if (prices.value[i] != null) {
                return prices.value[i];
            }
        }

        return null;
    }

    /** Percent off the base price, or null where it cannot be worked out. */
    function discount(index) {
        const price = prices.value[index];

        if (price == null || base.value == null || index === 0) {
            return null;
        }

        return Math.round((1 - price / base.value) * 100);
    }

    /** A group prices nothing until every band carries a price. */
    const complete = computed(
        () => rows.value.length > 0 && filled.value === rows.value.length,
    );

    return {
        los,
        prices,
        filled,
        base,
        rangeError,
        rangesOk,
        rangeText,
        previousPrice,
        discount,
        complete,
    };
}
