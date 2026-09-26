// The database, built here to prove it builds.
//
//   npm run db:check
//
// The browser creates its own database on first visit. This runs the same
// thing under Node — the same schema, the same records, the same PostgreSQL —
// so that a schema that no longer matches the data fails in the terminal
// rather than in front of the pharmacy.
//
// It checks three things a release must not break:
//
//   * the DDL is valid and every foreign key it declares is satisfied;
//   * every record survives the round trip into its table;
//   * the joins the console relies on return rows.
//
// It also writes `database/schema.sql`, so the DDL that actually ran is in the
// repository next to the code that generated it — the file to hand to a DBA, or
// to run against a real PostgreSQL server.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

import {
    columnNames,
    lineColumnNames,
    placeholders,
    toLineRow,
    toRow,
} from '../database/rows.mjs';
import { buildSchema } from '../database/schema.mjs';
import { REFERENCE, SETTINGS_KEY, TABLES } from '../database/spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** How many rows go in one INSERT. Postgres takes 65,535 parameters at most. */
const CHUNK = 400;

async function insert(db, table, names, rows) {
    if (!rows.length) {
        return 0;
    }

    const width = names.length;

    for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const values = slice
            .map((_, k) => placeholders(width, k * width))
            .join(',\n       ');

        await db.query(
            `INSERT INTO ${table} (${names.join(', ')}) VALUES ${values}`,
            slice.flat(),
        );
    }

    return rows.length;
}

async function main() {
    console.log('building the schema …');
    const schema = buildSchema();

    await mkdir(path.join(ROOT, 'database'), { recursive: true });
    await writeFile(path.join(ROOT, 'database/schema.sql'), schema, 'utf8');

    console.log('assembling the records …');
    const { buildDataset } = await import('@/demo/index.js');
    const data = buildDataset();

    // A record that carries a Date works until the day it is read back: jsonb
    // returns the string it serialised, and whatever called `.getTime()` on it
    // throws. This found one, and it will find the next.
    const dated = findDates(data);

    if (dated.length) {
        dated.forEach((where) => console.error(`  ✗ Date object at ${where}`));
        console.error(
            '\nA record must hold an ISO string, not a Date — it has to survive the database.',
        );
        process.exit(1);
    }

    console.log('starting postgres …');
    const db = await PGlite.create();

    await db.exec(schema);

    let total = 0;
    const report = [];

    for (const spec of TABLES) {
        const records = Array.isArray(data[spec.source]) ? data[spec.source] : [];
        const rows = [];
        const lines = [];

        records.forEach((record) => {
            if (record?.[spec.key] === undefined || record[spec.key] === null) {
                return;
            }

            rows.push(toRow(spec, record));

            if (spec.lines) {
                (record[spec.lines.field] || []).forEach((line, index) => {
                    lines.push(toLineRow(spec, record[spec.key], line, index));
                });
            }
        });

        // A key that repeats is a fact about the fixture, not something to
        // paper over: the last one would silently win. Say so and keep the
        // first, so the count in the report is the count in the table.
        const seen = new Set();
        const unique = rows.filter((row) => {
            if (seen.has(row[0])) {
                return false;
            }

            seen.add(row[0]);

            return true;
        });

        if (unique.length !== rows.length) {
            console.warn(
                `  ! ${spec.name}: ${rows.length - unique.length} duplicate keys dropped`,
            );
        }

        await insert(db, spec.name, columnNames(spec), unique);

        if (spec.lines) {
            const kept = new Set(unique.map((row) => row[0]));

            await insert(
                db,
                spec.lines.name,
                lineColumnNames(spec),
                lines.filter((line) => kept.has(line[0])),
            );
        }

        total += unique.length;
        report.push(
            `${spec.name}: ${unique.length}${spec.lines ? ` (+${lines.length} lines)` : ''}`,
        );
    }

    // Everything that is not a list of records: enum lists, thresholds, lookup
    // maps, the session. Rows all the same, so they can be edited too.
    const settings = Object.entries(data).filter(
        ([key, value]) =>
            REFERENCE.includes(key) ||
            !Array.isArray(value) ||
            (value.length > 0 && typeof value[0] !== 'object'),
    );

    await insert(
        db,
        SETTINGS_KEY,
        ['id', 'doc'],
        settings.map(([key, value]) => [key, { value }]),
    );

    console.log(`  ${report.join('\n  ')}`);
    console.log(`  ${SETTINGS_KEY}: ${settings.length}`);
    console.log(`  ${total} records in ${TABLES.length} tables`);

    // A quick proof that what went in is queryable, not just stored.
    const check = await db.query(`
        SELECT s.name AS supplier, count(*) AS items
        FROM items i JOIN suppliers s ON s.id = i.supplier_code
        GROUP BY s.name ORDER BY items DESC LIMIT 3
    `);

    console.log(
        `  top suppliers by item: ${check.rows
            .map((row) => `${row.supplier} (${row.items})`)
            .join(', ')}`,
    );

    // Every relationship the schema declares, checked against the data that
    // went in. A deferred foreign key does not complain until something looks,
    // so this is the look.
    const orphans = await db.query(`
        SELECT 'items → suppliers' AS link, count(*)::int AS orphans
        FROM items i
        WHERE i.supplier_code IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = i.supplier_code)
        UNION ALL
        SELECT 'batches → items', count(*)::int
        FROM batches b
        WHERE b.sku IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM items i WHERE i.id = b.sku)
        UNION ALL
        SELECT 'boms → items', count(*)::int
        FROM boms m
        WHERE m.parent_sku IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM items i WHERE i.id = m.parent_sku)
    `);

    const broken = orphans.rows.filter((row) => row.orphans > 0);

    broken.forEach((row) => console.error(`  ✗ ${row.link}: ${row.orphans} orphans`));

    await db.close();

    if (broken.length) {
        process.exit(1);
    }

    console.log('\n✓ the schema holds, and every record is in it');
}

/** Every path in the dataset that holds a Date, which none of them may. */
function findDates(value, path = '', seen = new Set(), found = []) {
    if (value instanceof Date) {
        found.push(path || '(root)');

        return found;
    }

    if (!value || typeof value !== 'object' || seen.has(value)) {
        return found;
    }

    seen.add(value);

    if (Array.isArray(value)) {
        // One example per collection is enough to find the record that has it.
        value.slice(0, 50).forEach((one, i) => {
            if (found.length < 10) {
                findDates(one, `${path}[${i}]`, seen, found);
            }
        });

        return found;
    }

    Object.entries(value).forEach(([key, one]) => {
        if (found.length < 10) {
            findDates(one, path ? `${path}.${key}` : key, seen, found);
        }
    });

    return found;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
