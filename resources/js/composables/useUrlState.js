// URL is the state.
//
// `useUrlState(defaults)` returns a reactive object whose every key is mirrored
// in the query string, so a filtered view can be pasted into a message and
// opened identically by whoever receives it:
//
//     const view = useUrlState({ tab: 'open', status: [], q: '', page: 1 });
//     view.status = ['paid', 'shipped'];   // → ?tab=open&status=paid,shipped
//
// The rules, so every screen behaves the same way:
//
// - A key that still equals its default is absent from the URL. Links stay
//   short and "the default view" has one canonical address.
// - The default's type decides how a value parses back: an array default comes
//   back an array (comma-joined in the URL), a number default a number, a
//   boolean default a boolean, and an operator default — `{ op, v }`, used by
//   numeric filters — comes back as `gt:400`.
// - Query keys the caller did not declare are left alone, so two composables —
//   or a composable and a router link — can own different parts of one URL.
// - Writes go through `router.replace`, never `push`: typing in a filter must
//   not fill the back button with keystrokes.
import { reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** vue-router hands back an array when a key repeats; the last one wins. */
function single(value) {
    return Array.isArray(value) ? value[value.length - 1] : value;
}

/** Is this default an operator pair, as a numeric filter uses? */
function isOperator(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'op' in value &&
        'v' in value
    );
}

/** Read one query value back into the shape its default declares. */
function decode(raw, fallback) {
    const value = single(raw);

    if (isOperator(fallback)) {
        if (value === undefined || value === null || value === '') {
            return { ...fallback };
        }

        const [op, ...rest] = String(value).split(':');

        return { op: op || fallback.op, v: rest.join(':') };
    }

    if (Array.isArray(fallback)) {
        return value === undefined || value === null || value === ''
            ? [...fallback]
            : String(value).split(',').filter(Boolean);
    }

    if (value === undefined || value === null) {
        return fallback;
    }

    if (typeof fallback === 'number') {
        const n = Number(value);

        return Number.isFinite(n) ? n : fallback;
    }

    if (typeof fallback === 'boolean') {
        return value === '1' || value === 'true';
    }

    return String(value);
}

/** Write one value into its query-string form. */
function encode(value) {
    if (isOperator(value)) {
        return `${value.op}:${value.v}`;
    }

    if (Array.isArray(value)) {
        return value.join(',');
    }

    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }

    return String(value);
}

function same(a, b) {
    if (isOperator(a) || isOperator(b)) {
        // An operator whose value is empty is off, whatever operator it names —
        // so it must compare equal to its default and stay out of the URL.
        const left = isOperator(a) ? a : { op: '', v: '' };
        const right = isOperator(b) ? b : { op: '', v: '' };
        const leftOff =
            left.v === '' || left.v === null || left.v === undefined;
        const rightOff =
            right.v === '' || right.v === null || right.v === undefined;

        return leftOff && rightOff
            ? true
            : left.op === right.op && left.v === right.v;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        const left = Array.isArray(a) ? a : [];
        const right = Array.isArray(b) ? b : [];

        return (
            left.length === right.length &&
            left.every((item, i) => item === right[i])
        );
    }

    return a === b;
}

/** A stable string for a query object, so no-op replaces can be skipped. */
function serialize(query) {
    return Object.keys(query)
        .sort()
        .map((key) => `${key}=${single(query[key])}`)
        .join('&');
}

/**
 * @param {Record<string, string|number|boolean|Array>} defaults
 * @returns {Record<string, any>} reactive, two-way bound to the query string
 */
export function useUrlState(defaults) {
    const route = useRoute();
    const router = useRouter();
    const keys = Object.keys(defaults);

    const read = (query) =>
        Object.fromEntries(
            keys.map((key) => [key, decode(query[key], defaults[key])]),
        );

    const state = reactive(read(route.query));

    /** The query this state wants, merged over whatever else the URL carries. */
    function wanted() {
        const query = { ...route.query };

        for (const key of keys) {
            if (same(state[key], defaults[key])) {
                delete query[key];
            } else {
                query[key] = encode(state[key]);
            }
        }

        return query;
    }

    // state → URL
    watch(
        state,
        () => {
            const next = wanted();

            if (serialize(next) === serialize(route.query)) {
                return;
            }

            router.replace({ query: next }).catch(() => {
                // A navigation guard may refuse; the state stays as the reader
                // set it and the next write tries again.
            });
        },
        { deep: true, flush: 'post' },
    );

    // URL → state, for the back button, a pasted link, or a nav elsewhere.
    watch(
        () => route.query,
        (query) => {
            const next = read(query);

            for (const key of keys) {
                if (!same(state[key], next[key])) {
                    state[key] = next[key];
                }
            }
        },
    );

    return state;
}
