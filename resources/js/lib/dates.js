// Date and duration formatting.
//
// The console reads "now" through `now()` rather than calling `new Date()`
// directly. The demo dataset pins that clock (see resources/js/demo/clock.js) so
// a sample order that is "3 days late" stays 3 days late on every load instead
// of drifting; against a real API the pin is absent and the real clock is used.
import { now, setClock } from '@/lib/clock';

export { now, setClock };

const pad = (n) => String(n).padStart(2, '0');

/** `12.08.2026` from an ISO `2026-08-12`. */
export function fmtISO(iso) {
    const [y, m, d] = String(iso).split('-');

    return `${d}.${m}.${y}`;
}

/** `2026-08-12` for a date `daysAgo` days before now. */
export function isoDaysAgo(daysAgo = 0) {
    const d = shift(daysAgo);

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A Date `daysAgo` days back, optionally pinned to a wall-clock time. */
export function shift(daysAgo = 0, hh = null, mm = 0) {
    const d = now();

    d.setDate(d.getDate() - daysAgo);

    if (hh !== null) {
        d.setHours(hh, mm, 0, 0);
    }

    return d;
}

/** `HH:MM`. */
export function hm(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `12.08.2026 14:05`. */
export function stamp(daysAgo = 0, hh = null, mm = 0) {
    const d = shift(daysAgo, hh, mm);

    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${hm(d)}`;
}

/** Whole days between an ISO date and today; negative while the date is ahead. */
export function daysSince(iso) {
    const today = now();

    today.setHours(0, 0, 0, 0);

    const then = new Date(`${iso}T00:00:00`);

    return Math.round((today.getTime() - then.getTime()) / 86400000);
}

/**
 * Break a millisecond span into the parts a duration label needs. The words
 * themselves come from the locale catalog (`duration.*`) so the same span reads
 * correctly in Hebrew and English.
 *
 * @returns {{ unit: 'sub_minute'|'minutes'|'hours'|'hours_minutes'|'days'|'days_hours', a: number, b: number }}
 */
export function durationParts(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));

    if (minutes < 1) {
        return { unit: 'sub_minute', a: 0, b: 0 };
    }

    if (minutes < 60) {
        return { unit: 'minutes', a: minutes, b: 0 };
    }

    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;

    if (hours < 24) {
        return restMinutes
            ? { unit: 'hours_minutes', a: hours, b: restMinutes }
            : { unit: 'hours', a: hours, b: 0 };
    }

    const days = Math.floor(hours / 24);
    const restHours = hours % 24;

    return restHours
        ? { unit: 'days_hours', a: days, b: restHours }
        : { unit: 'days', a: days, b: 0 };
}

/** Half-hour cadence: the next automatic run after a `HH:MM` timestamp. */
export function nextRunAfter(last) {
    const [h, m] = String(last).split(':').map(Number);
    const t = now();

    t.setHours(h, (m || 0) + 30, 0, 0);

    return hm(t);
}

export { pad };
