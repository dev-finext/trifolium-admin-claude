// V3 — חלונות ממוזערים.
//
// The pharmacy comes from SAP, where a record opens as its own window: you
// minimise it, open another, and come back to it later with everything where
// you left it. On the web that is not a window at all — but it does not have to
// be, because this console already keeps every open record in the address bar.
// `?item=100002`, `?req=pr-2600001`, `?batch=…`, together with the tab, the
// filters and the page. So a minimised window is nothing more than a string:
// the full path the drawer was open at.
//
// That is what makes restoring exact rather than approximate. Reopening does
// not rebuild a guess at the screen — it navigates back to the address, and the
// screen rebuilds itself the way it does for a pasted link. The tab comes back,
// the filters come back, the row that was open comes back.
//
// It also survives the browser closing, which the desktop software it is
// modelled on does not: the list is in localStorage, so the windows left open
// on Thursday are still there on Sunday.
//
// What is *not* here: a half-typed form. Editors in this console are modals,
// and `ItemsView` says why — "Editors and dialogs are actions, not addresses".
// An address can be restored; a form in the middle of being typed cannot, not
// without saving the typing itself and risking putting a stale draft back over
// a record somebody else has since changed. Minimising is offered on records,
// and only on records.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const KEY = 'trifolium:windows';

/**
 * How many windows the tray holds.
 *
 * Not a technical limit — a tray with forty things parked in it is a place
 * records get lost, which is the opposite of what it is for. The oldest is
 * dropped when the limit is reached, and the screen says so.
 */
export const WINDOW_LIMIT = 12;

/** How many chips stand in the top bar before the rest go behind "+N". */
export const WINDOW_CHIPS = 3;

function read() {
    try {
        const raw = window.localStorage.getItem(KEY);
        const rows = raw ? JSON.parse(raw) : [];

        return Array.isArray(rows)
            ? rows.filter((row) => row && row.id && row.path)
            : [];
    } catch {
        // Private browsing, cleared storage, a blocked origin — the tray simply
        // starts empty. It is a convenience, never the system of record.
        return [];
    }
}

function save(rows) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(rows));
    } catch {
        // Nothing to do and nothing to tell the user: the windows are still on
        // screen for this session, they just will not outlive it.
    }
}

export const useWindowsStore = defineStore('windows', () => {
    const rows = ref(read());

    /** Newest first, because the thing you parked last is the thing you want. */
    const list = computed(() => rows.value);

    const count = computed(() => rows.value.length);

    const chips = computed(() => rows.value.slice(0, WINDOW_CHIPS));

    const overflow = computed(() =>
        Math.max(0, rows.value.length - WINDOW_CHIPS),
    );

    const has = (id) => rows.value.some((row) => row.id === id);

    function commit(next) {
        rows.value = next;
        save(next);
    }

    /**
     * Park a window.
     *
     * The same record parked twice is one window, moved back to the front —
     * two chips for one item would be two ways to reach the same place.
     */
    function minimize({ id, path, title, subtitle = '', icon = 'file_text' }) {
        if (!id || !path) {
            return null;
        }

        const row = { id, path, title, subtitle, icon, at: Date.now() };
        const rest = rows.value.filter((one) => one.id !== id);

        commit([row, ...rest].slice(0, WINDOW_LIMIT));

        return row;
    }

    /** Take a window off the tray and hand back the address it was holding. */
    function take(id) {
        const row = rows.value.find((one) => one.id === id) || null;

        if (row) {
            commit(rows.value.filter((one) => one.id !== id));
        }

        return row;
    }

    const drop = (id) => take(id);

    function clear() {
        commit([]);
    }

    return { list, count, chips, overflow, has, minimize, take, drop, clear };
});
