// Turning what the console did into SQL.
//
// The stores call `persist('purchase-orders/PO-26031/receive', …)` — a resource
// path, the shape a REST backend would take. This is where that path becomes an
// INSERT, an UPDATE or a DELETE against the tables in `database/schema.sql`.
//
// One decision makes the whole thing reliable: **the record is written, not the
// patch**. A store mutates its own copy first and then calls `persist`, so by
// the time we are here the console already holds the record as it now is. We
// look that record up and write it whole. Which means a partial payload, a
// sub-resource path like `orders/TF-2851/status`, and a change that touched
// three fields at once all end the same way — the row matches the screen.
//
// A path we do not recognise is not dropped: it lands in `settings`, keyed by
// the path, where it can be seen. Silence is the one outcome worth ruling out.
import {
    columnNames,
    lineColumnNames,
    placeholders,
    toLineRow,
    toRow,
} from '@database/rows.mjs';
import { SETTINGS_KEY, TABLE_BY_NAME, TABLES } from '@database/spec.mjs';

/**
 * The first segment of a resource path → the table it writes to.
 *
 * Only the paths whose first segment is not already the dataset's own name need
 * an entry; the rest are resolved from the spec.
 */
const ALIASES = {
    'purchase-orders': 'purchase_orders',
    'purchase-requests': 'purchase_requests',
    'plan-lines': 'plan_lines',
    'production-orders': 'production_orders',
    'supplier-invoices': 'supplier_invoices',
    'supplier-payments': 'supplier_payments',
    'supplier-notes': 'supplier_notes',
    'pickup-points': 'pickup_points',
    'prep-types': 'prep_types',
    'price-groups': 'price_groups',
    'product-labels': 'products',
    stickerNotes: 'sticker_notes',
    stickerPrints: 'sticker_prints',
    stickerTemplates: 'sticker_templates',
    // Namespaced paths: the segment after the namespace is the resource.
    'content/articles': 'articles',
    'content/videos': 'videos',
    'finance/documents': 'documents',
    'finance/payments': 'transactions',
    'finance/collection-links': 'collection_links',
    'inventory/ingredients': 'stock',
    'inventory/receipts': 'receipts',
    'inventory/count': 'inventory_docs',
    'inventory/adjustments': 'inventory_docs',
    'messaging/messages': 'messages',
    'messaging/scheduled': 'scheduled_messages',
    'messaging/templates': 'message_templates',
    'messaging/triggers': 'message_triggers',
    'safety/herbs': 'herbs',
    'safety/interactions': 'interactions',
    'system/admins': 'admins',
    'system/services': 'services',
    'wallet/points': 'points_ledger',
};

/** Dataset name → table, for the resources that need no alias. */
const BY_SOURCE = Object.fromEntries(
    TABLES.map((table) => [table.source, table.name]),
);

/**
 * Which table a path writes to, and which row.
 *
 * `finance/documents/D-9/credit` → the documents table, row `D-9`.
 * `plan-lines` → the plan_lines table, row unknown (an insert).
 */
export function route(path) {
    const parts = String(path).split('/').filter(Boolean);

    for (const width of [2, 1]) {
        const head = parts.slice(0, width).join('/');
        const table = ALIASES[head] || BY_SOURCE[head];

        if (table) {
            return { table, id: parts[width] || null };
        }
    }

    return { table: null, id: null };
}

/**
 * Apply one change.
 *
 * @param {object} db      The open database.
 * @param {object} records The console's own records, by dataset name.
 * @param {string} path
 * @param {object} payload
 * @param {string} method
 */
export async function write(db, records, path, payload, method = 'POST') {
    const { table, id } = route(path);

    if (!table) {
        return note(db, path, payload, method);
    }

    const spec = TABLE_BY_NAME[table];
    const key = id ?? payload?.[spec.key] ?? payload?.id ?? null;

    if (method === 'DELETE' && key !== null) {
        await db.query(`DELETE FROM ${table} WHERE id = $1`, [String(key)]);

        return { ok: true, table, id: String(key), deleted: true };
    }

    // The record as the console now holds it. A store that mutated in place is
    // the authority, and writing the whole record is what makes a partial
    // payload and a sub-resource path land correctly.
    const live = (records?.[spec.source] || []).find(
        (record) => String(record?.[spec.key]) === String(key),
    );

    if (live) {
        await upsert(db, spec, live);

        return { ok: true, table, id: String(key) };
    }

    // No record to mirror. Either the console does not hold this collection, or
    // the caller is a patch against a row that is already in the table — in
    // which case merging the payload into it is exactly right, and the typed
    // columns are refreshed from the merged document afterwards.
    if (key !== null && (await merge(db, spec, String(key), payload))) {
        return { ok: true, table, id: String(key), merged: true };
    }

    // A payload that carries the key is a record in its own right.
    if (key !== null && payload && typeof payload === 'object') {
        await upsert(db, spec, { ...payload, [spec.key]: key });

        return { ok: true, table, id: String(key) };
    }

    return note(db, path, payload, method);
}

/**
 * Merge a patch into a row that already exists.
 *
 * Returns false when there is no such row, so the caller can decide whether the
 * payload is a new record or something with no table of its own.
 */
async function merge(db, spec, id, payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return false;
    }

    const existing = await db.query(
        `SELECT doc FROM ${spec.name} WHERE id = $1`,
        [id],
    );

    if (!existing.rows.length) {
        return false;
    }

    await upsert(db, spec, { ...existing.rows[0].doc, ...payload });

    return true;
}

/** Write one record: its row, then its lines. */
export async function upsert(db, spec, record) {
    const names = columnNames(spec);
    const row = toRow(spec, record);
    const updates = names
        .slice(1)
        .map((name, i) => `${name} = $${i + 2}`)
        .concat('updated_at = now()')
        .join(', ');

    await db.query(
        `INSERT INTO ${spec.name} (${names.join(', ')})
         VALUES ${placeholders(names.length)}
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        row,
    );

    if (!spec.lines) {
        return;
    }

    // Lines are replaced rather than reconciled: the console holds the whole
    // collection, so the shortest correct write is to make the table say the
    // same thing.
    const id = String(record[spec.key]);

    await db.query(`DELETE FROM ${spec.lines.name} WHERE parent_id = $1`, [id]);

    const lines = record[spec.lines.field] || [];

    if (!lines.length) {
        return;
    }

    const lineNames = lineColumnNames(spec);
    const width = lineNames.length;
    const rows = lines.map((line, index) => toLineRow(spec, id, line, index));

    await db.query(
        `INSERT INTO ${spec.lines.name} (${lineNames.join(', ')})
         VALUES ${rows.map((_, k) => placeholders(width, k * width)).join(', ')}`,
        rows.flat(),
    );
}

/** A change with no table of its own, kept where it can be found. */
async function note(db, path, payload, method) {
    await db.query(
        `INSERT INTO ${SETTINGS_KEY} (id, doc) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET doc = $2, updated_at = now()`,
        [`change:${path}`, { method, payload, at: new Date().toISOString() }],
    );

    return { ok: true, table: SETTINGS_KEY, unmapped: true };
}
