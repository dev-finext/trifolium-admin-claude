// Ladder arithmetic for the tiered price lists.
//
// A price group does not carry prices: the item carries its own unit price
// (`item.price.sale`, per the group's unit) and the group says how much comes
// off it as the ordered quantity grows. Up to and including the group's
// `baseQty` nothing comes off; above it the percentage of the band the quantity
// falls into applies. Every function here is pure and imports nothing from Vue
// or the stores, so the editor, the item card and a Node probe all compute the
// same number.
//
// Group record, as stores/catalog.js saves it:
//   { baseQty, breaks: [1, 1000, 3000, …], percents: [0, 5, 14, …] }
//
// Every group states its own bands — there is no shared scale to inherit and no
// second way to express a ladder. `breaks` ascends strictly, `percents` has one
// entry per break, and a band at or below `baseQty` carries 0 %.
//
// Quantities and percentages are written to as many as nine decimals, because
// a gram ladder and a millionth-of-a-gram ladder are the same screen. That is
// why the rounding below is explicit at every step: binary floating point
// cannot be left to settle a ninth decimal on its own.

/** The most decimals a quantity or a percentage is held to. */
export const LADDER_DECIMALS = 9;

/**
 * Round to `places` decimals, through twelve significant digits first.
 *
 * `0.7 × 0.95` lands a hair under 0.665 in binary; trimming to twelve
 * significant digits before the rounding makes a half round up, as it does on
 * the price list.
 */
export function roundTo(value, places) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return 0;
    }

    const factor = 10 ** places;

    return Math.round(Number((n * factor).toPrecision(12))) / factor;
}

/**
 * Money, to the agora — or finer, when an agora would read as nothing.
 *
 * A ladder written per millionth of a gram has unit prices below ₪0.01, and
 * rounding those to agorot turns a whole table into zeros. An amount under an
 * agora keeps its precision instead; everything else settles where money does.
 */
export function roundMoney(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return 0;
    }

    return n !== 0 && Math.abs(n) < 0.01
        ? roundTo(n, LADDER_DECIMALS)
        : roundTo(n, 2);
}

/** A percentage, settled at the ladder's precision. */
export function roundPct(value) {
    return roundTo(value, LADDER_DECIMALS);
}

function isPositive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isPct(value) {
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    );
}

/** Index of the band `qty` falls in — `breaks[i] ≤ qty < breaks[i + 1]` — or −1 below the first break. */
export function bandIndex(group, qty) {
    const breaks = group?.breaks || [];
    let index = -1;

    for (let i = 0; i < breaks.length; i += 1) {
        if (qty >= breaks[i]) {
            index = i;
        }
    }

    return index;
}

/**
 * The percentage a group takes off the unit price at one quantity, 0–100.
 * `null` or an unknown group prices nothing off.
 */
export function discountAt(group, qty) {
    if (!group || !(qty > 0)) {
        return 0;
    }

    const index = bandIndex(group, qty);

    if (index < 0) {
        return 0;
    }

    const pct = Number((group.percents || [])[index]) || 0;

    return Math.min(100, Math.max(0, pct));
}

/** The unit price after the ladder. */
export function priceAt(unitPrice, group, qty) {
    const base = Number(unitPrice) || 0;

    return roundMoney(base * (1 - discountAt(group, qty) / 100));
}

/**
 * The top of the ladder — the band with the deepest discount — as
 * `{ from, pct }`. `null` for a group with no bands at all.
 */
export function ladderTop(group) {
    const breaks = group?.breaks || [];

    if (!breaks.length) {
        return null;
    }

    const from = breaks[breaks.length - 1];

    return { from, pct: roundPct(discountAt(group, from)) };
}

/**
 * The preview table — one row per band with the resulting unit price before and
 * including VAT and an example total at the band's start:
 * `{ from, to, pct, unit, unitInclVat, exampleTotal }`.
 *
 * @param {object|null} group
 * @param {number} unitPrice the item's own price, per the group's unit
 * @param {number} vatRate e.g. 0.18 — SETTINGS.vatRate
 */
export function ladderTable(group, unitPrice, vatRate) {
    if (!group) {
        return [];
    }

    const rate = Number(vatRate) || 0;
    const points = [...(group.breaks || [])];

    return points.map((from, i) => {
        const unit = priceAt(unitPrice, group, from);

        return {
            from,
            to: points[i + 1] ?? null,
            pct: roundPct(discountAt(group, from)),
            unit,
            unitInclVat: roundMoney(unit * (1 + rate)),
            exampleTotal: roundMoney(unit * from),
        };
    });
}

/**
 * Why a group's ladder cannot be saved — an array of LADDER_ERROR_IDS, empty
 * when it is sound: breaks strictly ascending, one percent per break, each
 * 0–100, never shrinking along the bands, and 0 for every band that starts at
 * or below the base quantity.
 */
export function validateLadder(group) {
    const errors = [];
    const baseQty = Number(group?.baseQty);

    if (!isPositive(baseQty)) {
        errors.push('base_qty');
    }

    const breaks = Array.isArray(group?.breaks) ? group.breaks : [];
    const percents = Array.isArray(group?.percents) ? group.percents : [];

    if (!breaks.length) {
        errors.push('breaks_empty');
    }

    if (
        breaks.some(
            (qty, i) => !isPositive(qty) || (i > 0 && qty <= breaks[i - 1]),
        )
    ) {
        errors.push('breaks_ascending');
    }

    if (percents.length !== breaks.length) {
        errors.push('percents_length');
    }

    if (percents.some((pct) => !isPct(pct))) {
        errors.push('percent_range');
    }

    if (percents.some((pct, i) => i > 0 && pct < percents[i - 1])) {
        errors.push('percent_decreasing');
    }

    if (
        isPositive(baseQty) &&
        breaks.some((qty, i) => qty <= baseQty && percents[i] !== 0)
    ) {
        errors.push('percent_below_base');
    }

    return errors;
}
