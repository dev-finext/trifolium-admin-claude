# The database

The console keeps its records in PostgreSQL.

Not a mock, not a key-value store with SQL-shaped method names: PostgreSQL 17,
compiled to WebAssembly by [PGlite](https://pglite.dev), running inside the
page, with its data directory persisted to the browser's IndexedDB. The DDL in
`schema.sql` is what runs. The foreign keys are enforced. `SELECT … JOIN …
GROUP BY` is a query, executed by Postgres, not a loop over an array.

## Why it is in the browser

The console is a static bundle served from GitHub Pages. There is no server to
call and nothing to sign in to, and there will not be one until the pharmacy's
own backend exists. Putting the database in the page is what makes the demo
genuinely functional rather than a picture of one: a purchase request raised on Sunday
is still there on Monday, on the same machine, because it was `INSERT`ed.

When the real backend arrives, `resources/js/data/source.js` is the only file
that changes — `readAll()` becomes one GET and `write()` becomes one request.
The schema goes to the server unchanged.

## What is in it

| | |
|---|---|
| Tables | 64 (56 record tables, 7 line tables, 1 settings table) |
| Records | ~6,200 |
| Source | `TR_backup_2026_08_05_180002_6205496.bak` — the pharmacy's SAP Business One |

Everything the console shows is in there: the item cards (1,374), the shelf and
its batches, the recipes and their components, the purchase requests, orders,
goods receipts and supplier invoices, the production orders, the customer
orders, the practitioners, the patients, the suppliers (120 real cards), the
consumption history, the audit log. The people are pseudonymised — see
`scripts/extract-sap/people.py` — and nothing that identifies a patient or
carries a card number is read from the backup at all.

## The files

| File | What it is |
|---|---|
| `spec.mjs` | The one description of every table: its key, its typed columns, its child rows, its foreign keys. Everything else reads this. |
| `schema.mjs` | Turns the spec into DDL. |
| `schema.sql` | The generated DDL — the readable artefact. **Do not edit**: run `npm run db:schema`. |
| `rows.mjs` | A record ↔ a row. Shared by the browser and the seeder so both agree. |

And in the console:

| File | What it is |
|---|---|
| `resources/js/data/db.js` | Opens the database, seeds it the first time, reads the console out of it. |
| `resources/js/data/write.js` | Turns a resource path (`purchase-orders/PO-26031/receive`) into SQL. |
| `resources/js/data/source.js` | The seam: which source is live, and where every read and write goes. |

## How a row is shaped

Every table has a text primary key — the pharmacy's own identifier, an item
code or a document number — typed columns for whatever a screen filters, sorts
or joins on, and a `jsonb doc` holding the record itself.

```sql
CREATE TABLE batches (
    id           text PRIMARY KEY,
    number       text,
    sku          text,
    expires_on   date,
    remaining    numeric,
    ...
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
```

`doc` is not a way around the schema: it is the record, and the columns are
projections of it kept in step on every write. A record round trips exactly,
and `WHERE expires_on < now() + interval '90 days'` still runs in the database.

Child rows are the exception. An order's lines live in `purchase_order_lines`
and **not** inside the parent's `doc`, because a line is a record in its own
right and has to be updatable on its own.

## Writing

The stores have always called `persist('purchase-orders/PO-26031/receive', …)`.
That path now becomes SQL. One decision makes it reliable: **the record is
written, not the patch**. A store mutates its own copy first, so by the time the
write happens the console already holds the record as it now is, and we write it
whole. A partial payload, a sub-resource path and a change that touched three
fields at once therefore all end the same way — the row matches the screen.

A path with no table of its own is not dropped: it lands in `settings`, keyed by
the path, where it can be found.

## Working with it

```bash
npm run check:db     # build the whole thing under Node and prove it holds
npm run db:schema    # regenerate database/schema.sql
```

`check:db` is part of `npm run verify`, so a schema that no longer matches the
data fails in the terminal rather than in front of the pharmacy.

In the console itself, **מסד הנתונים** (`/database`) lists the tables and their
row counts, runs SQL, and rebuilds the database from the extract.

## Switching sources

`VITE_DATA_SOURCE` picks:

| Value | What the console reads |
|---|---|
| `db` | Its own PostgreSQL. **The default**, and what the demo deploys with. |
| `demo` | The fixture, assembled in memory. Keeps nothing; a reload starts over. |
| `api` | A real backend over HTTP, at `VITE_API_BASE`. |
