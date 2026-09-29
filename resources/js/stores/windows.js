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
// A form is the other kind of window, and it needs more than an address.
// Editors here are modals, and `ItemsView` says why — "Editors and dialogs are
// actions, not addresses" — so reopening one cannot be a navigation. A parked
// form therefore carries three things: the address of the screen it was opened
// from, the typing itself, and the stamp the record carried when it was parked.
//
// The stamp is the part that keeps this honest. A draft put back over a record
// somebody has since changed would silently undo their work, so the stamp
// travels with the draft and the editor compares it on the way back in. It does
// not block — the typing is the reader's and they may still want it — it says
// so, above the form, before anything is saved.
//
// Drafts are marked apart from records everywhere they appear, because "a
// window I was reading" and "a window with unsaved work in it" are not the same
// thing to come back to.
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

    /**
     * A form on its way back in.
     *
     * The tray navigates to the screen the editor was opened from and leaves
     * the window here; the screen picks it up and opens the editor with the
     * draft. It is a handover and not an address, which is what keeps a pasted
     * link from opening somebody else's half-typed form.
     */
    const pending = ref(null);

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
     *
     * `form` is what makes it a draft rather than a record: `{ view, data,
     * stamp }` — which editor to reopen, the typing, and what the record's own
     * last-changed stamp was at the moment it was parked.
     */
    function minimize({
        id,
        path,
        title,
        subtitle = '',
        icon = 'file_text',
        form = null,
    }) {
        if (!id || !path) {
            return null;
        }

        const row = {
            id,
            path,
            title,
            subtitle,
            icon,
            form: form || null,
            at: Date.now(),
        };
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
        pending.value = null;
    }

    /**
     * Hand a parked form to the screen that can reopen it.
     *
     * The window comes off the tray here rather than when the editor opens: it
     * is no longer waiting, it is on its way, and a chip that outlived the
     * click would be a second copy of the same draft.
     */
    function resume(id) {
        const row = take(id);

        pending.value = row?.form ? row : null;

        return row;
    }

    /**
     * A screen takes the form that belongs to it, if one is waiting.
     *
     * Named rather than positional, so a screen with two editors on it — the
     * item card and the recipe — each take their own and leave the other.
     */
    function claim(view) {
        const row = pending.value;

        if (!row || row.form?.view !== view) {
            return null;
        }

        pending.value = null;

        return row.form;
    }

    return {
        list,
        count,
        chips,
        overflow,
        pending,
        has,
        minimize,
        take,
        drop,
        clear,
        resume,
        claim,
    };
});
