// The DDL, generated from `spec.mjs`.
//
// Generated rather than hand-written so the schema, the seed and the queries
// cannot disagree: there is one description of a table, and everything reads it.
// `npm run db:schema` writes the result to `database/schema.sql`, which is the
// readable artefact — the file to hand to a DBA, or to run against a real
// PostgreSQL server when the console stops carrying its own.
import { FOREIGN_KEYS, INDEXES, SETTINGS_KEY, TABLES } from './spec.mjs';

const HEAD = `-- Trifolium admin console — the schema.
--
-- GENERATED FROM database/spec.mjs. Do not edit by hand: run \`npm run db:schema\`.
--
-- Every table has a text primary key (the pharmacy's own identifier — an item
-- code, a batch id, a document number), typed columns for whatever a screen
-- filters, sorts or joins on, and a jsonb \`doc\` holding the record itself.
-- Child rows live in their own table and not inside the parent's \`doc\`, so a
-- line can be updated on its own.
--
-- This runs on PostgreSQL 17. In the browser it runs on PGlite, which is the
-- same PostgreSQL compiled to WebAssembly; against a server it runs unchanged.

`;

function table(spec) {
    const cols = [
        `    id           text PRIMARY KEY`,
        ...(spec.columns || []).map(
            (one) => `    ${one.name.padEnd(12)} ${one.type}`,
        ),
        `    doc          jsonb NOT NULL`,
        `    updated_at   timestamptz NOT NULL DEFAULT now()`,
    ];

    const out = [`CREATE TABLE ${spec.name} (\n${cols.join(',\n')}\n);`];

    if (spec.lines) {
        const lineCols = [
            `    id           bigserial PRIMARY KEY`,
            `    parent_id    text NOT NULL REFERENCES ${spec.name}(id) ON DELETE CASCADE`,
            `    line_no      integer NOT NULL`,
            ...(spec.lines.columns || []).map(
                (one) => `    ${one.name.padEnd(12)} ${one.type}`,
            ),
            `    doc          jsonb NOT NULL`,
        ];

        out.push(
            `CREATE TABLE ${spec.lines.name} (\n${lineCols.join(',\n')},\n` +
                `    UNIQUE (parent_id, line_no)\n);`,
            `CREATE INDEX ON ${spec.lines.name} (parent_id);`,
        );
    }

    return out.join('\n');
}

export function buildSchema() {
    const parts = [HEAD];

    parts.push(
        `-- The lists, thresholds and lookup maps that are not rows of records.\n` +
            `CREATE TABLE ${SETTINGS_KEY} (\n` +
            `    id           text PRIMARY KEY,\n` +
            `    doc          jsonb NOT NULL,\n` +
            `    updated_at   timestamptz NOT NULL DEFAULT now()\n);`,
    );

    TABLES.forEach((spec) => parts.push(table(spec)));

    parts.push(
        '-- Relationships the console actually follows on a screen.',
        ...FOREIGN_KEYS.map(
            ([from, column, to]) =>
                `ALTER TABLE ${from} ADD CONSTRAINT ${from}_${column}_fk\n` +
                `    FOREIGN KEY (${column}) REFERENCES ${to}(id)\n` +
                `    DEFERRABLE INITIALLY DEFERRED;`,
        ),
    );

    parts.push(
        '-- Indexes for the columns the screens filter and sort by.',
        ...INDEXES.map(
            ([name, columns]) =>
                `CREATE INDEX ${name}_${columns.join('_')}_idx ON ${name} (${columns.join(', ')});`,
        ),
        ...FOREIGN_KEYS.map(
            ([from, column]) =>
                `CREATE INDEX ${from}_${column}_idx ON ${from} (${column});`,
        ),
    );

    return `${parts.join('\n\n')}\n`;
}
