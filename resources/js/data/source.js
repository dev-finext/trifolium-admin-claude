// The seam between the console and its data.
//
// Every store loads its records through `loadDataset()` and nothing else. Today
// that resolves to the demo fixture in resources/js/demo/; pointing it at a real
// backend is a change to this file only — no screen, store or component knows
// where its rows came from.
//
// Three sources, one seam:
//
//   db     PostgreSQL in the browser (PGlite), persisted to IndexedDB. The
//          console's own database: real tables, real foreign keys, and writes
//          that are still there tomorrow. This is the default.
//   demo   The fixture, assembled in memory. Nothing is kept — a reload starts
//          over. Useful for a clean slate and for the build checks.
//   api    A real backend over HTTP.
//
// Set VITE_DATA_SOURCE to pick; `api` also needs VITE_API_BASE.
import { setClock } from '@/lib/clock';

// Read straight off import.meta.env rather than through a local alias. Vite
// replaces `import.meta.env` with a literal, so the `MODE === 'api'` test below
// folds at build time and the whole demo fixture — its invented people, orders
// and the SAP catalogue extract behind them — is dropped from a production
// bundle. Routed through a `const ENV` it does not fold, and the fixture ships.
//
// Optional chaining because the check scripts import this graph under plain Node,
// where there is no Vite and no import.meta.env at all.
const MODE = import.meta.env?.VITE_DATA_SOURCE || 'db';
const API_BASE = import.meta.env?.VITE_API_BASE || '/api/admin';

/** Which source is active — surfaced in the UI so the mode is never a mystery. */
export const dataSourceMode = MODE;

/** True while the console is showing fabricated records. */
export const isDemoData = MODE !== 'api';

/** True while the console is reading and writing its own database. */
export const isDatabase = MODE === 'db';

/**
 * How far the database has got while it is being built for the first time.
 * The boot screen reads it; nothing else does.
 */
let progress = null;
const progressWatchers = new Set();

export const onDatabaseProgress = (fn) => {
    progressWatchers.add(fn);

    if (progress) {
        fn(progress);
    }

    return () => progressWatchers.delete(fn);
};

function reportProgress(next) {
    progress = next;
    progressWatchers.forEach((fn) => fn(next));
}

/**
 * The console's own records, so a write can mirror the record rather than the
 * patch. The dataset store hands them over once it has them.
 */
let records = null;

export function registerRecords(source) {
    records = source;
}

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

    if (MODE === 'db') {
        return loadFromDatabase();
    }

    return loadDemo();
}

/**
 * Open the database and read the console out of it.
 *
 * First run creates the schema and loads the records; every run after that is a
 * query against what is already on the machine — including whatever has been
 * done to it since.
 */
async function loadFromDatabase() {
    const { DEMO_CLOCK } = await import('@/demo/clock');

    // The records were extracted from a backup taken on a particular day, and
    // every relative date in them is relative to it.
    setClock(DEMO_CLOCK);

    const { readCache, writeCache } = await import('@/data/cache');
    const cached = await readCache();

    if (cached) {
        // Render from the read model, and start the engine once the console is
        // on screen. Compiling ten megabytes of WebAssembly occupies the main
        // thread, so starting it now would cost exactly what the read model
        // just saved — it waits for the browser to be idle instead, and is warm
        // long before anyone clicks something that writes.
        warmEngineWhenIdle();

        return cached;
    }

    const { openDatabase, readAll } = await import('@/data/db');
    const db = await openDatabase(reportProgress);
    const data = await readAll(db);

    writeCache(data);

    return data;
}

/**
 * Start PostgreSQL in the background, once the browser has nothing better to do.
 *
 * Every write waits for the same promise, so a click that lands before the
 * engine is up queues behind it rather than starting a second one.
 */
let warming = null;

function warmEngineWhenIdle() {
    if (warming) {
        return warming;
    }

    warming = new Promise((resolve) => {
        const start = () =>
            import('@/data/db')
                .then(({ openDatabase }) => openDatabase())
                .catch(() => null)
                .then(resolve);

        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(start, { timeout: 4000 });
        } else {
            setTimeout(start, 1200);
        }
    });

    return warming;
}

/** Throw the database away and build it again. */
export async function resetData() {
    if (MODE !== 'db') {
        return false;
    }

    const { resetDatabase, readAll } = await import('@/data/db');
    const { writeCache } = await import('@/data/cache');
    const db = await resetDatabase(reportProgress);
    const data = await readAll(db);

    await writeCache(data);

    return data;
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
    if (MODE === 'db') {
        if (refuseWrites) {
            await new Promise((resolve) => setTimeout(resolve, 350));

            throw new Error('demo: write refused');
        }

        try {
            const { openDatabase } = await import('@/data/db');
            const { write } = await import('@/data/write');

            const result = await write(
                await openDatabase(),
                records?.() || {},
                path,
                payload,
                method,
            );

            // The read model follows the records, which are what the screen is
            // already showing — so the next visit opens on what this one did.
            const { scheduleCacheRefresh } = await import('@/data/cache');

            scheduleCacheRefresh(() => records?.());

            return result;
        } catch (error) {
            // A write that cannot reach the database is a real failure and the
            // console has a state for it — but it must not take the screen down
            // with it, because the change is already on screen.
            console.error(`[trifolium-db] ${method} ${path}`, error);

            return { ok: false, error: String(error) };
        }
    }

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
