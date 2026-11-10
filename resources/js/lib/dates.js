// Date and duration formatting.
//
// The console reads "now" through `now()` rather than calling `new Date()`
// directly. The demo dataset pins that clock (see resources/js/demo/clock.js) so
// a sample order that is "3 days late" stays 3 days late on every load instead
// of drifting; against a real API the pin is absent and the real clock is used.
import { now, setClock } from '@/lib/clock';

export { now, setClock };

const pad = (n) => String(n).padStart(2, '0');

/**
 * `12.08.2026` from an ISO `2026-08-12`. Nothing for no date — a batch SAP
 * holds without an expiry prints blank, not "undefined.undefined.null".
 */
export function fmtISO(iso) {
    if (!iso) {
        return '';
    }

    const [y, m, d] = String(iso).slice(0, 10).split('-');

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

/**
 * `iso` advanced by whole calendar months — real ones, not 30-day blocks.
 *
 * A shelf life is stated in months ("טינקטורה — 3 שנים" is 36 of them), and the
 * pharmacy expects the result to land on the same day of the month: a batch made
 * 05.08.2026 with a 36-month life expires 05.08.2029, not sixteen days earlier.
 * `isoDaysAgo(-(months) * 30)` was the earlier shortcut here and that is exactly
 * the gap it leaves — 36 real months are ~1,096 days, not 1,080. `setMonth`
 * carries a day that would overflow the shorter target month to the month
 * after (31 Jan + 1 month), so the result is pulled back to that month's last
 * day instead, which is the one case a calendar month cannot honor "same day".
 *
 * @param {string|null} fromIso Omit (or pass null) to count from today.
 * @param {number} months
 */
export function addMonths(fromIso, months) {
    const base = fromIso ? new Date(`${fromIso}T00:00:00`) : now();
    const day = base.getDate();
    const d = new Date(base);

    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, daysInMonth(d)));

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The ISO date `days` after another one, or after today. */
export function addDays(fromIso, days) {
    const d = fromIso ? new Date(`${fromIso}T00:00:00`) : now();

    d.setDate(d.getDate() + (Number(days) || 0));

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** How many days the month a Date falls in actually has. */
function daysInMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
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
