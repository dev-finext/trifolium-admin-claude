// The seam between the console and its data.
//
// Every store loads its records through `loadDataset()` and nothing else. Today
// that resolves to the demo fixture in resources/js/demo/; pointing it at a real
// backend is a change to this file only — no screen, store or component knows
// where its rows came from.
//
// Set VITE_DATA_SOURCE=api (and VITE_API_BASE) to switch.
import { setClock } from '@/lib/clock';

// Read straight off import.meta.env rather than through a local alias. Vite
// replaces `import.meta.env` with a literal, so the `MODE === 'api'` test below
// folds at build time and the whole demo fixture — plausible-looking phone numbers
// and national IDs included — is dropped from a production bundle. Routed through
// a `const ENV` it does not fold, and the fixture ships.
//
// Optional chaining because the check scripts import this graph under plain Node,
// where there is no Vite and no import.meta.env at all.
const MODE = import.meta.env?.VITE_DATA_SOURCE || 'demo';
const API_BASE = import.meta.env?.VITE_API_BASE || '/api/admin';

/** Which source is active — surfaced in the UI so the mode is never a mystery. */
export const dataSourceMode = MODE;

/** True while the console is showing fabricated records. */
export const isDemoData = MODE === 'demo';

/** Demo only: make every write fail, to exercise the console's failure state. */
let refuseWrites = false;

export const writesRefused = () => refuseWrites;

export function setWritesRefused(on) {
    refuseWrites = isDemoData && Boolean(on);
}

/**
 * Load the whole dataset the console needs at boot.
 *
 * @returns {Promise<object>} keyed by domain: orders, practitioners, products, …
 */
export async function loadDataset() {
    if (MODE === 'api') {
        return loadFromApi();
    }

    return loadDemo();
}

async function loadDemo() {
    // Dynamic import keeps the entire fixture out of the production bundle when
    // the console is pointed at a real API.
    const { buildDataset, DEMO_CLOCK } = await import('@/demo');

    // Pin the clock so relative dates in the fixture are stable across loads.
    setClock(DEMO_CLOCK);

    return buildDataset();
}

async function loadFromApi() {
    const response = await fetch(`${API_BASE}/bootstrap`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(
            `Bootstrap failed: ${response.status} ${response.statusText}`,
        );
    }

    // The real clock applies against real data.
    setClock(null);

    return response.json();
}

/**
 * Persist a change. Against the demo fixture this resolves immediately and the
 * caller keeps its optimistic local update — the console is fully interactive
 * without a backend, but it never pretends a request happened.
 *
 * @param {string} path Resource path, e.g. `orders/10482/status`.
 * @param {object} payload
 * @param {string} [method]
 */
export async function persist(path, payload, method = 'POST') {
    if (MODE !== 'api') {
        if (refuseWrites) {
            // Demo only. Without a backend there is nothing that can fail, and
            // a console whose every action always succeeds never shows what it
            // does when one does not. This switch is how that state is seen.
            await new Promise((resolve) => setTimeout(resolve, 350));

            throw new Error('demo: write refused');
        }

        return { ok: true, local: true };
    }

    const response = await fetch(`${API_BASE}/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`${method} ${path} failed: ${response.status}`);
    }

    return response.json();
}
