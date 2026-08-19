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
