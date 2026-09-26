// Turning records into rows and rows back into records.
//
// Shared by the seeder, which runs under Node, and by the browser client, so a
// record written by one is read identically by the other. Nothing here touches
// a database: it is only the translation.
import { SETTINGS_KEY, TABLES } from './spec.mjs';

/**
 * A record, as the columns and the `doc` of one row.
 *
 * The parent's `doc` deliberately drops the child collection: the lines are
 * rows of their own, and a copy inside the parent would be a second version of
 * the same fact, free to disagree with the first.
 */
export function toRow(spec, record) {
    const doc = { ...record };

    if (spec.lines) {
        delete doc[spec.lines.field];
    }

    const values = [String(record[spec.key])];

    (spec.columns || []).forEach((column) => {
        values.push(normalise(column.get(record), column.type));
    });

    values.push(doc);

    return values;
}

/** A child record, as the columns and `doc` of one line row. */
export function toLineRow(spec, parentId, line, index) {
    const values = [String(parentId), index];

    (spec.lines.columns || []).forEach((column) => {
        values.push(normalise(column.get(line), column.type));
    });

    values.push(line);

    return values;
}

/**
 * Postgres is stricter than JavaScript about what a date is.
 *
 * The fixture writes an empty string where there is no date and `''` is not a
 * date; a boolean column is handed `undefined` by a record that never set the
 * flag; a numeric column is occasionally handed a string. Each of those is a
 * null or a number, and saying so here keeps the INSERT from failing on one bad
 * record out of fourteen hundred.
 */
function normalise(value, type) {
    if (value === undefined || value === '') {
        return null;
    }

    if (value === null) {
        return null;
    }

    if (type === 'numeric' || type === 'integer') {
        const number = Number(value);

        return Number.isFinite(number) ? number : null;
    }

    if (type === 'boolean') {
        return Boolean(value);
    }

    if (type === 'date') {
        return /^\d{4}-\d{2}-\d{2}/.test(String(value))
            ? String(value).slice(0, 10)
            : null;
    }

    if (type === 'text' && typeof value === 'object') {
        return null;
    }

    return type === 'text' ? String(value) : value;
}

/** The column names of a table, in the order `toRow` produces them. */
export const columnNames = (spec) => [
    'id',
    ...(spec.columns || []).map((column) => column.name),
    'doc',
];

export const lineColumnNames = (spec) => [
    'parent_id',
    'line_no',
    ...(spec.lines.columns || []).map((column) => column.name),
    'doc',
];

/** `$1, $2, …` for one row, offset by how many rows came before it. */
export const placeholders = (count, offset = 0) =>
    `(${Array.from({ length: count }, (_, i) => `$${offset + i + 1}`).join(', ')})`;

/** Every table that holds records, plus the settings table. */
export const ALL_TABLES = [...TABLES.map((one) => one.name), SETTINGS_KEY];
