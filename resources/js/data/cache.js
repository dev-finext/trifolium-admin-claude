// A read model, so the console opens on the first frame.
//
// The database is the system of record and stays that way. But PostgreSQL is a
// ten-megabyte WebAssembly module, and compiling it takes seconds on a laptop —
// seconds the reader spends looking at a loading screen on *every* visit, not
// just the first. That is the wrong trade for a console whose first screen is a
// list.
//
// So the last thing every read produced is kept beside the database, as one
// IndexedDB record. A visit reads that and renders; the engine starts in the
// background and is warm long before anyone clicks something that writes. The
// cache is never the authority: it is refreshed from the records after every
// write, rebuilt from SQL whenever the database is read, and thrown away when
// its version tag does not match the running code.
//
// If any of this fails — private mode, a browser that blocks storage, a quota —
// the console simply opens from the database, a little slower and just as
// correct.

const DB_NAME = 'trifolium-cache';
const STORE = 'snapshot';
const KEY = 'dataset';

/**
 * Bump when the shape of a record changes, so a reader carrying yesterday's
 * cache gets today's records instead of a screen built on the old ones.
 */
const VERSION = '2026-09-26.1';

function open() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE);
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function run(db, mode, work) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
    });
}

/** The last read, if there is one and it was written by this version. */
export async function readCache() {
    try {
        const db = await open();
        const hit = await run(db, 'readonly', (store) => store.get(KEY));

        db.close();

        if (!hit || hit.version !== VERSION) {
            return null;
        }

        return hit.data;
    } catch {
        return null;
    }
}

/** Keep the read model in step. Failure here is never the caller's problem. */
export async function writeCache(data) {
    try {
        const db = await open();

        // structuredClone refuses a reactive proxy's traps in some browsers, so
        // the snapshot is taken through JSON — which is also what the records
        // are: plain documents out of a jsonb column.
        await run(db, 'readwrite', (store) =>
            store.put(
                {
                    version: VERSION,
                    at: Date.now(),
                    data: JSON.parse(JSON.stringify(data)),
                },
                KEY,
            ),
        );

        db.close();

        return true;
    } catch {
        return false;
    }
}

export async function clearCache() {
    try {
        const db = await open();

        await run(db, 'readwrite', (store) => store.delete(KEY));
        db.close();

        return true;
    } catch {
        return false;
    }
}

/**
 * Refresh the cache soon, but not on every keystroke.
 *
 * A screen that writes three times in a second should cost one snapshot, and
 * the snapshot should happen while the reader is doing something else.
 */
let pending = null;

export function scheduleCacheRefresh(getData, delay = 1500) {
    clearTimeout(pending);

    pending = setTimeout(() => {
        const data = getData();

        if (data) {
            writeCache(data);
        }
    }, delay);
}
