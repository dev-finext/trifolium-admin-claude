// Date-range filtering, shared by every screen that has a date filter.
//
// The preset ids are part of the URL contract (`?preset=30`), so they are short
// and stable; their labels live in the locale catalog under `ui.datePreset.*`.
// "Now" comes from @/lib/dates, which reads the pinned demo clock when a fixture
// is loaded — so a "last 7 days" window is the same window on every reload.
import { isoDaysAgo, now, pad } from '@/lib/dates';

/** Presets, in the order the segmented control shows them. */
export const DATE_PRESET_IDS = ['all', 'today', '7', '30', 'month', 'custom'];

/** A range that restricts nothing. */
export function emptyRange() {
    return { from: '', to: '' };
}

/** The state a date filter starts in: everything, no dates typed. */
export function defaultRange() {
    return { preset: 'all', ...emptyRange() };
}

/**
 * The ISO `from`/`to` a preset resolves to.
 *
 * `all` and `custom` carry no dates of their own: `all` means "do not filter",
 * `custom` means "the dates came from the two inputs".
 *
 * @param {string} id One of DATE_PRESET_IDS.
 * @returns {{ from: string, to: string }}
 */
export function presetRange(id) {
    if (id === 'all' || id === 'custom') {
        return emptyRange();
    }

    const today = isoDaysAgo(0);

    if (id === 'today') {
        return { from: today, to: today };
    }

    if (id === 'month') {
        const d = now();

        return {
            from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
            to: today,
        };
    }

    // A numeric preset is a window of that many days ending today, today
    // included — `7` is today plus the six days before it.
    const days = Number(id);

    if (!Number.isFinite(days) || days < 1) {
        return emptyRange();
    }

    return { from: isoDaysAgo(days - 1), to: today };
}

/** True while a range actually restricts something. */
export function hasRange(range) {
    return Boolean(range && (range.from || range.to));
}

/**
 * Is an ISO date inside the range? Both ends are inclusive and an open end does
 * not restrict that side. String comparison is enough because ISO dates sort
 * lexicographically.
 *
 * @param {string} iso `2026-08-12`
 * @param {{from?: string, to?: string}} range
 */
export function inRange(iso, range) {
    if (!hasRange(range)) {
        return true;
    }

    if (range.from && iso < range.from) {
        return false;
    }

    if (range.to && iso > range.to) {
        return false;
    }

    return true;
}
