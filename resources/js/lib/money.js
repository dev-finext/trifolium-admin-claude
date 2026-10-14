// Money. Every price the console shows passes through here, so the VAT rate and
// the rounding rule are stated once (resources/js/config/settings.js) and a
// change there moves every screen.
import { SETTINGS } from '@/config/settings';

/**
 * Net → VAT → gross → the whole-shekel figure a practitioner actually sees.
 *
 * @param {number} net
 * @returns {{ net: number, rate: number, vat: number, gross: number, display: number, roundUp: number }}
 */
export function priceParts(net) {
    const base = Number(net) || 0;
    const rate = SETTINGS.vatRate;
    const vat = round2(base * rate);
    const gross = round2(base + vat);
    const display = applyRounding(gross);

    return {
        net: base,
        rate,
        vat,
        gross,
        display,
        roundUp: round2(display - gross),
    };
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function applyRounding(gross) {
    switch (SETTINGS.priceRounding) {
        case 'ceil_shekel':
            // 1e-9 guards against a float landing a hair above a whole shekel.
            return Math.ceil(gross - 1e-9);
        case 'nearest_shekel':
            return Math.round(gross);
        default:
            return gross;
    }
}

/**
 * Currency for display. Amounts stay LTR inside an RTL page, which is why the
 * symbol is prefixed here rather than left to `Intl` (whose RTL placement
 * differs per browser).
 *
 * @param {number} value
 * @param {number} [decimals]
 */
export function ils(value, decimals = 2) {
    const n = Number(value) || 0;

    return `₪${n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;
}

/** A bare grouped number, no currency symbol. */
export function num(value, decimals = 0) {
    const n = Number(value) || 0;

    return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** A percentage as written in the UI — `40%`, `18%`. */
export function pct(value, decimals = 0) {
    return `${num(value, decimals)}%`;
}

/** The most decimals any figure in this console is written to. */
export const MAX_DECIMALS = 9;

/**
 * How many decimals a value actually carries, up to `max`.
 *
 * A price ladder can be written in millilitres or in millionths of a gram, and
 * a fixed two decimals turns the second one into a column of zeros. Asking the
 * number how precise it is, rather than deciding in advance, is what lets one
 * table render both.
 */
export function decimalsOf(value, max = MAX_DECIMALS) {
    const n = Number(value);

    if (!Number.isFinite(n) || Number.isInteger(n)) {
        return 0;
    }

    const text = Math.abs(n).toFixed(max).replace(/0+$/, '');
    const dot = text.indexOf('.');

    return dot < 0 ? 0 : text.length - dot - 1;
}

/** A quantity written to exactly the precision it holds — `1,000`, `0.000001`. */
export function qtyText(value, max = MAX_DECIMALS) {
    return num(value, decimalsOf(value, max));
}

/** A percentage written to the precision it holds — `14%`, `0.0125%`. */
export function pctText(value, max = MAX_DECIMALS) {
    return pct(value, decimalsOf(value, max));
}

/**
 * Money, to the agora — or finer, when an agora would read as nothing.
 *
 * A ladder priced per millionth of a gram has unit prices below ₪0.01, and
 * `₪0.00` down a whole column says the price is zero, which it is not. So the
 * amount is written to the precision it actually carries, never fewer than the
 * two decimals money is read in. An amount that really does round away to
 * nothing within nine decimals is `₪0.00`, which is the truth about it.
 */
export function money(value, max = MAX_DECIMALS) {
    const n = Number(value) || 0;

    return ils(n, Math.min(max, Math.max(2, decimalsOf(n, max))));
}
