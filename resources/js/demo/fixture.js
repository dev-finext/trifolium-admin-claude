// Deterministic helpers shared by the demo builders.
//
// The React prototype varied its sample data with a seeded linear-congruential
// generator: every value depended on how many values had been drawn before it,
// so inserting one record reshuffled the whole fixture and the order in which
// script tags happened to load decided what the console showed.
//
// Here each value is derived from a hash of its own slot name instead —
// `order:7:payer` always answers the same thing, whatever is built before or
// after it. Nothing in this directory calls Math.random(): the fixture is a
// fixed table that happens to be written as code.
import { hm, isoDaysAgo, shift, stamp } from '@/lib/dates';

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const UINT32 = 4294967296;

/** FNV-1a over a slot name. Same name in, same number out, always. */
function hash(slot) {
    const text = String(slot);
    let value = FNV_OFFSET_BASIS;

    for (let i = 0; i < text.length; i += 1) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, FNV_PRIME);
    }

    return value >>> 0;
}

/** A stable fraction in [0, 1) for one named slot. */
export function fraction(slot) {
    return hash(slot) / UINT32;
}

/** A stable integer in [lo, hi] for one named slot. */
export function spread(slot, lo, hi) {
    return lo + (hash(slot) % (hi - lo + 1));
}

/** A stable member of `list` for one named slot. */
export function pickFrom(slot, list) {
    return list[hash(slot) % list.length];
}

/**
 * True for roughly `share` of all slots — the fixture's stand-in for the
 * prototype's `rnd() < 0.32`, without the randomness.
 */
export function chance(slot, share) {
    return fraction(slot) < share;
}

/** True for roughly the top `share` of all slots. */
export function rareChance(slot, share) {
    return fraction(slot) > 1 - share;
}

/**
 * One moment, in the three language-neutral forms the records need: the ISO
 * date it falls on, its wall-clock time, and a numeric `dd.mm.yyyy HH:MM`
 * stamp. Nothing here is a Hebrew or English phrase — "today" and "yesterday"
 * are rendered by the locale layer from `daysAgo`.
 *
 * @param {number} daysAgo Days before the pinned clock; negative looks ahead.
 * @param {number|null} [hh] Wall-clock hour; omit to keep the pinned time.
 * @param {number} [mm]
 */
export function at(daysAgo, hh = null, mm = 0) {
    return {
        daysAgo,
        iso: isoDaysAgo(daysAgo),
        time: hm(shift(daysAgo, hh, mm)),
        stamp: stamp(daysAgo, hh, mm),
    };
}

/** `at()` shifted by whole minutes — a delivery receipt after a send. */
export function atPlusMinutes(moment, minutes) {
    const base = shift(moment.daysAgo);
    const [hh, mm] = moment.time.split(':').map(Number);

    base.setHours(hh, mm + minutes, 0, 0);

    return at(moment.daysAgo, base.getHours(), base.getMinutes());
}
