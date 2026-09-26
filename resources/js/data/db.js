// The database.
//
// PostgreSQL, compiled to WebAssembly (PGlite) and running inside the reader's
// browser, with its data directory persisted to IndexedDB. Not a mock and not a
// key-value store pretending to be one: the schema in `database/schema.sql` is
// real DDL, the foreign keys are enforced, and every read and write below is
// SQL that would run unchanged against a PostgreSQL server.
//
// Why here rather than behind an HTTP API: the console is a static bundle with
// nowhere to call. Putting the database in the page is what makes the demo
// genuinely functional — a purchase request raised on Sunday is still there on
// Monday, on the same machine, because it was INSERTed.
//
// The seam is unchanged. `data/source.js` still decides where the console's
// records come from, and pointing it at a server is still a change to that file
// alone: `readAll()` becomes one GET and `write()` becomes one request.
//
// First run applies the schema and loads the records; every run after that
// opens what is already there. The engine is imported lazily so a console
// pointed at a real API never downloads it.
import {
    columnNames,
    lineColumnNames,
    placeholders,
    toLineRow,
    toRow,
} from '@database/rows.mjs';
import { buildSchema } from '@database/schema.mjs';
import { REFERENCE, SETTINGS_KEY, TABLES } from '@database/spec.mjs';

/** Where the data directory lives in the browser. */
const STORE = 'idb://trifolium';

/** Postgres takes 65,535 parameters in one statement; this stays well under. */
const CHUNK = 250;

let handle = null;

/** Open the database, creating and seeding it the first time. */
export async function openDatabase(onProgress = () => {}) {
    if (handle) {
        return handle;
    }

    onProgress({ stage: 'engine' });

    const { PGlite } = await import('@electric-sql/pglite');
    const db = await PGlite.create(STORE);

    if (!(await isSeeded(db))) {
        // A tab closed halfway through the first build leaves the tables
        // standing and empty, so the question is whether there are records in
        // them — not whether the schema ran.
        await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
        await seed(db, onProgress);
    }

    handle = db;

    return db;
}

/** Whether the database holds the console, rather than just its tables. */
async function isSeeded(db) {
    try {
        const rows = await db.query('SELECT count(*)::int AS n FROM items');

        return (rows.rows[0]?.n || 0) > 0;
    } catch {
        return false;
    }
}

/** Throw the database away and build it again — the demo's reset. */
export async function resetDatabase(onProgress = () => {}) {
    const { clearCache } = await import('@/data/cache');

    await clearCache();

    if (handle) {
        await handle.close();
        handle = null;
    }

    const { PGlite } = await import('@electric-sql/pglite');
    const db = await PGlite.create(STORE);

    await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await seed(db, onProgress);

    handle = db;

    return db;
}

/**
 * Create the tables and load the records.
 *
 * The records come from the same place the console's demo mode reads them: the
 * SAP extract in `demo/real`, and everything the fixture assembles on top of
 * it. Seeding happens once, inside a transaction, so a tab closed halfway
 * through leaves an empty database rather than half a catalogue.
 */
async function seed(db, onProgress) {
    onProgress({ stage: 'schema' });

    await db.exec(buildSchema());

    onProgress({ stage: 'records' });

    const { buildDataset } = await import('@/demo');
    const data = buildDataset();

    await db.transaction(async (tx) => {
        for (const spec of TABLES) {
            const records = Array.isArray(data[spec.source])
                ? data[spec.source]
                : [];
            const seen = new Set();
            const rows = [];
            const lines = [];

            records.forEach((record) => {
                const key = record?.[spec.key];

                if (
                    key === undefined ||
                    key === null ||
                    seen.has(String(key))
                ) {
                    return;
                }

                seen.add(String(key));
                rows.push(toRow(spec, record));

                if (spec.lines) {
                    (record[spec.lines.field] || []).forEach((line, index) => {
                        lines.push(toLineRow(spec, key, line, index));
                    });
                }
            });

            await insert(tx, spec.name, columnNames(spec), rows);

            if (spec.lines) {
                await insert(tx, spec.lines.name, lineColumnNames(spec), lines);
            }

            onProgress({ stage: 'records', table: spec.name, n: rows.length });
        }

        // Everything that is not a list of records — the enum lists, the
        // thresholds, the lookup maps — so that a threshold the pharmacy
        // changes is an UPDATE rather than a new deployment.
        const settings = Object.entries(data).filter(
            ([key, value]) =>
                REFERENCE.includes(key) ||
                !Array.isArray(value) ||
                (value.length > 0 && typeof value[0] !== 'object'),
        );

        await insert(
            tx,
            SETTINGS_KEY,
            ['id', 'doc'],
            settings.map(([key, value]) => [key, { value }]),
        );
    });

    onProgress({ stage: 'done' });
}

async function insert(tx, table, names, rows) {
    if (!rows.length) {
        return;
    }

    const width = names.length;

    for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const values = slice
            .map((_, k) => placeholders(width, k * width))
            .join(', ');

        await tx.query(
            `INSERT INTO ${table} (${names.join(', ')}) VALUES ${values}`,
            slice.flat(),
        );
    }
}

/**
 * Read the whole console out of the database.
 *
 * One SELECT per table, plus one for each table that has lines, which are put
 * back on their parent. The shape that comes out is the shape the stores have
 * always read — so nothing above this file knows the records now come from SQL.
 */
export async function readAll(db) {
    const rows = await db.query(BOOT_QUERY);
    const data = {};

    rows.rows.forEach((row) => {
        data[row.source] = row.records || [];
    });

    const settings = await db.query(`SELECT id, doc FROM ${SETTINGS_KEY}`);

    settings.rows.forEach((row) => {
        data[row.id] = row.doc?.value;
    });

    return data;
}

/**
 * Everything the console holds, in one statement.
 *
 * One SELECT per table is the obvious way to write this and the slow way to run
 * it: sixty-four round trips across the WebAssembly boundary cost far more than
 * the rows do. So the whole read is a single UNION ALL, and the tables that
 * have lines put the children back on their parents with a join — which is
 * what a database is for, and seconds faster than doing it in JavaScript
 * afterwards.
 */
const BOOT_QUERY = TABLES.map((spec) => {
    if (!spec.lines) {
        return `SELECT '${spec.source}' AS source,
                       coalesce(jsonb_agg(doc ORDER BY id), '[]'::jsonb) AS records
                FROM ${spec.name}`;
    }

    return `SELECT '${spec.source}' AS source,
                   coalesce(
                       jsonb_agg(
                           p.doc || jsonb_build_object(
                               '${spec.lines.field}',
                               coalesce(l.lines, '[]'::jsonb)
                           )
                           ORDER BY p.id
                       ),
                       '[]'::jsonb
                   ) AS records
            FROM ${spec.name} p
            LEFT JOIN (
                SELECT parent_id, jsonb_agg(doc ORDER BY line_no) AS lines
                FROM ${spec.lines.name}
                GROUP BY parent_id
            ) l ON l.parent_id = p.id`;
}).join('\nUNION ALL\n');

/** What the database holds right now, for the screen that shows it. */
export async function tableCounts(db) {
    const names = TABLES.flatMap((spec) =>
        spec.lines ? [spec.name, spec.lines.name] : [spec.name],
    ).concat(SETTINGS_KEY);

    const counts = await db.query(
        names
            .map(
                (name) =>
                    `SELECT '${name}' AS table_name, count(*)::int AS rows FROM ${name}`,
            )
            .join(' UNION ALL '),
    );

    return counts.rows;
}

/** Run a read-only statement — what the SQL console on the data screen uses. */
export async function runQuery(db, sql) {
    return db.query(sql);
}
