// Ladder arithmetic for the tiered price lists.
//
// A price group does not carry prices: the item carries its own unit price
// (`item.price.sale`, per its sales unit) and the group says how much comes off
// it as the ordered quantity grows. Up to and including the group's `baseQty`
// nothing comes off; above it either an explicit percentage per band applies
// (`percent` mode) or a small formula does (`formula` mode). Every function here
// is pure and imports nothing from Vue or the stores, so the editor, the item
// calculator and a Node probe all compute the same number.
//
// Group record, as stores/catalog.js saves it:
//   { mode: 'percent', baseQty, breaks: [1, 5, 10, …], percents: [0, 0, 5, …] }
//   { mode: 'formula', baseQty, formula: { kind: 'step', stepQty, stepPct, floorPct } }
//   { mode: 'formula', baseQty, formula: { kind: 'curve', k, floorPct } }
import {
    LADDER_FORMULA_KIND_IDS,
    PRICE_LADDER_MODE_IDS,
} from '@/config/catalog';

/** Rows a formula preview may never exceed, whatever the parameters say. */
const PREVIEW_ROW_CAP = 40;

/**
 * The 1-2-5 series a curve is previewed on when the caller has no quantity
 * scale of its own: baseQty × 1, 2, 5, 10, 20, 50 …
 */
const CURVE_PREVIEW_MULTIPLIERS = [1, 2, 5];

/**
 * To the agora. `0.7 × 0.95` lands a hair under 0.665 in binary, so the value
 * is trimmed to twelve significant digits before rounding — a half always
 * rounds up, as it does on the price list.
 */
function round2(value) {
    return Math.round(Number((value * 100).toPrecision(12))) / 100;
}

function round1(value) {
    return Math.round(Number((value * 10).toPrecision(12))) / 10;
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

    const baseQty = Number(group.baseQty) || 0;

    if (group.mode === 'formula') {
        if (qty <= baseQty) {
            return 0;
        }

        const formula = group.formula || {};
        const floor = Math.min(100, Math.max(0, Number(formula.floorPct) || 0));

        if (formula.kind === 'step') {
            if (!isPositive(formula.stepQty)) {
                return 0;
            }

            const steps = Math.floor((qty - baseQty) / formula.stepQty);

            return Math.min(floor, Math.max(0, steps * (formula.stepPct || 0)));
        }

        if (formula.kind === 'curve') {
            if (!isPositive(baseQty) || !isPositive(formula.k)) {
                return 0;
            }

            return Math.min(
                floor,
                Math.max(0, (1 - (baseQty / qty) ** formula.k) * 100),
            );
        }

        return 0;
    }

    const index = bandIndex(group, qty);

    if (index < 0) {
        return 0;
    }

    const pct = Number((group.percents || [])[index]) || 0;

    return Math.min(100, Math.max(0, pct));
}

/** The unit price after the ladder, to the agora. */
export function priceAt(unitPrice, group, qty) {
    const base = Number(unitPrice) || 0;

    return round2(base * (1 - discountAt(group, qty) / 100));
}

/**
 * The quantity at which a formula ladder first reaches its floor — where the
 * preview stops. `null` when the parameters never get there.
 */
export function floorQty(group) {
    if (group?.mode !== 'formula') {
        return null;
    }

    const formula = group.formula || {};
    const baseQty = Number(group.baseQty) || 0;
    const floor = Number(formula.floorPct) || 0;

    if (floor <= 0) {
        return baseQty;
    }

    if (formula.kind === 'step') {
        if (!isPositive(formula.stepQty) || !isPositive(formula.stepPct)) {
            return null;
        }

        return baseQty + Math.ceil(floor / formula.stepPct) * formula.stepQty;
    }

    if (formula.kind === 'curve') {
        if (!isPositive(baseQty) || !isPositive(formula.k) || floor >= 100) {
            return null;
        }

        return baseQty / (1 - floor / 100) ** (1 / formula.k);
    }

    return null;
}

/**
 * The top of the ladder — the band with the deepest discount — as
 * `{ from, pct }`. Percent mode: the last band; formula mode: where the floor
 * is reached. `null` for a group with no ladder at all.
 */
export function ladderTop(group) {
    if (!group) {
        return null;
    }

    if (group.mode === 'formula') {
        const from = floorQty(group);

        return from === null
            ? null
            : { from: round2(from), pct: round1(discountAt(group, from)) };
    }

    const breaks = group.breaks || [];

    if (!breaks.length) {
        return null;
    }

    const from = breaks[breaks.length - 1];

    return { from, pct: round1(discountAt(group, from)) };
}

/** The quantities a formula ladder is previewed at, ascending, floor row included. */
function formulaPoints(group, scale) {
    const formula = group.formula || {};
    const baseQty = Number(group.baseQty) || 0;
    const floor = Number(formula.floorPct) || 0;
    const points = [baseQty];
    const reachedFloor = (qty) => discountAt(group, qty) >= floor;

    if (formula.kind === 'step') {
        if (!isPositive(formula.stepQty) || !isPositive(formula.stepPct)) {
            return points;
        }

        let qty = baseQty;

        while (points.length < PREVIEW_ROW_CAP) {
            qty += formula.stepQty;
            points.push(qty);

            if (reachedFloor(qty)) {
                break;
            }
        }

        return points;
    }

    if (formula.kind !== 'curve' || !isPositive(formula.k)) {
        return points;
    }

    const candidates = (scale || []).filter((qty) => qty > baseQty);

    if (!candidates.length) {
        // No scale to lean on: a 1-2-5 series from the base quantity.
        for (let power = 1; candidates.length < PREVIEW_ROW_CAP; power *= 10) {
            CURVE_PREVIEW_MULTIPLIERS.forEach((multiplier) => {
                const qty = baseQty * multiplier * power;

                if (qty > baseQty) {
                    candidates.push(qty);
                }
            });

            if (reachedFloor(baseQty * 5 * power)) {
                break;
            }
        }
    }

    for (const qty of candidates) {
        if (points.length >= PREVIEW_ROW_CAP) {
            break;
        }

        points.push(qty);

        if (reachedFloor(qty)) {
            break;
        }
    }

    return points;
}

/**
 * The preview table — one row per band with the resulting unit price before and
 * including VAT and an example total at the band's start:
 * `{ from, to, pct, unit, unitInclVat, exampleTotal }`.
 *
 * Percent mode lists every band. Formula mode lists the base quantity and then
 * every `stepQty` step (step) or every point of `scale` above the base (curve;
 * a 1-2-5 series when no scale is given) until the floor is reached.
 *
 * @param {object|null} group
 * @param {number} unitPrice the item's own price, per its sales unit
 * @param {number} vatRate e.g. 0.18 — SETTINGS.vatRate
 * @param {number[]|null} [scale] the quantity scale a curve is sampled on
 */
export function ladderTable(group, unitPrice, vatRate, scale = null) {
    if (!group) {
        return [];
    }

    const rate = Number(vatRate) || 0;
    const points =
        group.mode === 'formula'
            ? formulaPoints(group, scale)
            : [...(group.breaks || [])];

    return points.map((from, i) => {
        const unit = priceAt(unitPrice, group, from);

        return {
            from,
            to: points[i + 1] ?? null,
            pct: round1(discountAt(group, from)),
            unit,
            unitInclVat: round2(unit * (1 + rate)),
            exampleTotal: round2(unit * from),
        };
    });
}

/**
 * Why a group's ladder cannot be saved — an array of LADDER_ERROR_IDS, empty
 * when it is sound. Percent mode: breaks strictly ascending, one percent per
 * break, each 0–100, never shrinking along the bands, and 0 for every band that
 * starts at or below the base quantity. Formula mode: positive parameters and a
 * floor of at most 100 %.
 */
export function validateLadder(group) {
    const errors = [];
    const baseQty = Number(group?.baseQty);

    if (!PRICE_LADDER_MODE_IDS.includes(group?.mode)) {
        errors.push('mode');
    }

    if (!isPositive(baseQty)) {
        errors.push('base_qty');
    }

    if (group?.mode === 'formula') {
        const formula = group.formula || {};

        if (!LADDER_FORMULA_KIND_IDS.includes(formula.kind)) {
            errors.push('formula_kind');
        } else if (
            formula.kind === 'step'
                ? !isPositive(formula.stepQty) || !isPositive(formula.stepPct)
                : !isPositive(formula.k)
        ) {
            errors.push('formula_params');
        }

        if (!isPct(formula.floorPct)) {
            errors.push('floor_range');
        }

        return errors;
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
