-- Trifolium admin console — the schema.
--
-- GENERATED FROM database/spec.mjs. Do not edit by hand: run `npm run db:schema`.
--
-- Every table has a text primary key (the pharmacy's own identifier — an item
-- code, a batch id, a document number), typed columns for whatever a screen
-- filters, sorts or joins on, and a jsonb `doc` holding the record itself.
-- Child rows live in their own table and not inside the parent's `doc`, so a
-- line can be updated on its own.
--
-- This runs on PostgreSQL 17. In the browser it runs on PGlite, which is the
-- same PostgreSQL compiled to WebAssembly; against a server it runs unchanged.



-- The lists, thresholds and lookup maps that are not rows of records.
CREATE TABLE settings (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE practitioners (
    id           text PRIMARY KEY,
    first_name   text,
    last_name    text,
    therapy      text,
    city         text,
    status       text,
    points       numeric,
    discount_pct numeric,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patients (
    id           text PRIMARY KEY,
    first_name   text,
    last_name    text,
    age          integer,
    sex          text,
    pregnant     boolean,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id           text PRIMARY KEY,
    name         text,
    phone        text,
    email        text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pending_users (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admins (
    id           text PRIMARY KEY,
    name         text,
    email        text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE points_ledger (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vendor_contacts (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
    id           text PRIMARY KEY,
    name         text,
    kind         text,
    sap_group    integer,
    status       text,
    terms        text,
    city         text,
    currency     text,
    sku_count    integer,
    lead_days    integer,
    balance      numeric,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
    id           text PRIMARY KEY,
    sku          text,
    name         text,
    foreign_name text,
    item_group   integer,
    family       text,
    item_type    text,
    active       boolean,
    stock_uom    text,
    purchase_uom text,
    supplier_code text,
    on_hand      numeric,
    committed    numeric,
    on_order     numeric,
    last_purchase numeric,
    inventory    boolean,
    purchasable  boolean,
    sellable     boolean,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id           text PRIMARY KEY,
    sku          text,
    name         text,
    status       text,
    family       text,
    stock        numeric,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shelf_items (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE boms (
    id           text PRIMARY KEY,
    parent_sku   text,
    name         text,
    prep_type    text,
    version      integer,
    yield_qty    numeric,
    yield_uom    text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bom_components (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    uom          text,
    issue        text,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON bom_components (parent_id);

CREATE TABLE prep_types (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE herbs (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE interactions (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE formula_templates (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE preparation_forms (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_categories (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item_groups (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item_properties (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE price_lists (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE price_groups (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id           text PRIMARY KEY,
    placed_on    date,
    status       text,
    kind         text,
    practitioner_code text,
    total        numeric,
    payer        text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE collection_links (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
    id           text PRIMARY KEY,
    doc_num      text,
    doc_type     text,
    status       text,
    order_id     text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock (
    id           text PRIMARY KEY,
    name         text,
    kind         text,
    warehouse    text,
    unit         text,
    on_hand      numeric,
    allocated    numeric,
    min_stock    numeric,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE batches (
    id           text PRIMARY KEY,
    number       text,
    sku          text,
    name         text,
    warehouse    text,
    source       text,
    expires_on   date,
    made_on      date,
    remaining    numeric,
    received_qty numeric,
    waste        boolean,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE batch_use (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movements (
    id           text PRIMARY KEY,
    kind         text,
    sku          text,
    batch_id     text,
    warehouse    text,
    qty          numeric,
    doc_ref      text,
    moved_on     date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_docs (
    id           text PRIMARY KEY,
    doc_type     text,
    warehouse    text,
    supplier_code text,
    doc_date     date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inventory_doc_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES inventory_docs(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    batch_id     text,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON inventory_doc_lines (parent_id);

CREATE TABLE receipts (
    id           text PRIMARY KEY,
    supplier_code text,
    po_id        text,
    doc_num      text,
    received_on  date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE receipt_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    batch_id     text,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON receipt_lines (parent_id);

CREATE TABLE sap_warehouses (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE open_orders (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
    id           text PRIMARY KEY,
    supplier_code text,
    supplier     text,
    state        text,
    currency     text,
    eta          date,
    raised_on    date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE purchase_order_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    uom          text,
    price        numeric,
    received     numeric,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON purchase_order_lines (parent_id);

CREATE TABLE purchase_requests (
    id           text PRIMARY KEY,
    number       text,
    supplier_code text,
    supplier     text,
    state        text,
    order_id     text,
    raised_on    date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE purchase_request_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    unit         text,
    price        numeric,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON purchase_request_lines (parent_id);

CREATE TABLE buying_lists (
    id           text PRIMARY KEY,
    number       text,
    kind         text,
    supplier_code text,
    supplier     text,
    state        text,
    created_on   date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE buying_list_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES buying_lists(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    uom          text,
    done         boolean,
    received     numeric,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON buying_list_lines (parent_id);

CREATE TABLE plan_lines (
    id           text PRIMARY KEY,
    sku          text,
    target       text,
    qty          numeric,
    state        text,
    request_id   text,
    order_id     text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_notes (
    id           text PRIMARY KEY,
    po_id        text,
    supplier_code text,
    doc_num      text,
    state        text,
    invoice_id   text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE supplier_note_lines (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES supplier_notes(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    qty          numeric,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON supplier_note_lines (parent_id);

CREATE TABLE supplier_invoices (
    id           text PRIMARY KEY,
    supplier_code text,
    doc_num      text,
    invoice_date date,
    due_on       date,
    net          numeric,
    vat          numeric,
    total        numeric,
    currency     text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_payments (
    id           text PRIMARY KEY,
    supplier_code text,
    paid_on      date,
    amount       numeric,
    method       text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE production_orders (
    id           text PRIMARY KEY,
    bom_id       text,
    parent_sku   text,
    state        text,
    planned_qty  numeric,
    uom          text,
    yield_qty    numeric,
    waste_qty    numeric,
    output_batch text,
    opened_on    date,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE production_components (
    id           bigserial PRIMARY KEY,
    parent_id    text NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    line_no      integer NOT NULL,
    sku          text,
    planned_qty  numeric,
    actual_qty   numeric,
    uom          text,
    doc          jsonb NOT NULL,
    UNIQUE (parent_id, line_no)
);
CREATE INDEX ON production_components (parent_id);

CREATE TABLE activities (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE message_templates (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE message_triggers (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_messages (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE articles (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE videos (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE services (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sticker_templates (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sticker_notes (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sticker_prints (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pickup_points (
    id           text PRIMARY KEY,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id           text PRIMARY KEY,
    act          text,
    entity_type  text,
    entity       text,
    actor        text,
    doc          jsonb NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Relationships the console actually follows on a screen.

ALTER TABLE items ADD CONSTRAINT items_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE supplier_invoices ADD CONSTRAINT supplier_invoices_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE supplier_notes ADD CONSTRAINT supplier_notes_supplier_code_fk
    FOREIGN KEY (supplier_code) REFERENCES suppliers(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE batches ADD CONSTRAINT batches_sku_fk
    FOREIGN KEY (sku) REFERENCES items(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE boms ADD CONSTRAINT boms_parent_sku_fk
    FOREIGN KEY (parent_sku) REFERENCES items(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE production_orders ADD CONSTRAINT production_orders_bom_id_fk
    FOREIGN KEY (bom_id) REFERENCES boms(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE plan_lines ADD CONSTRAINT plan_lines_sku_fk
    FOREIGN KEY (sku) REFERENCES items(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE stock ADD CONSTRAINT stock_id_fk
    FOREIGN KEY (id) REFERENCES items(id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE orders ADD CONSTRAINT orders_practitioner_code_fk
    FOREIGN KEY (practitioner_code) REFERENCES practitioners(id)
    DEFERRABLE INITIALLY DEFERRED;

-- Indexes for the columns the screens filter and sort by.

CREATE INDEX items_item_group_idx ON items (item_group);

CREATE INDEX items_family_idx ON items (family);

CREATE INDEX items_sku_idx ON items (sku);

CREATE INDEX batches_expires_on_idx ON batches (expires_on);

CREATE INDEX batches_number_idx ON batches (number);

CREATE INDEX movements_sku_idx ON movements (sku);

CREATE INDEX movements_batch_id_idx ON movements (batch_id);

CREATE INDEX movements_moved_on_idx ON movements (moved_on);

CREATE INDEX orders_placed_on_idx ON orders (placed_on);

CREATE INDEX orders_status_idx ON orders (status);

CREATE INDEX stock_warehouse_idx ON stock (warehouse);

CREATE INDEX audit_log_entity_type_entity_idx ON audit_log (entity_type, entity);

CREATE INDEX items_supplier_code_idx ON items (supplier_code);

CREATE INDEX purchase_orders_supplier_code_idx ON purchase_orders (supplier_code);

CREATE INDEX purchase_requests_supplier_code_idx ON purchase_requests (supplier_code);

CREATE INDEX supplier_invoices_supplier_code_idx ON supplier_invoices (supplier_code);

CREATE INDEX supplier_payments_supplier_code_idx ON supplier_payments (supplier_code);

CREATE INDEX supplier_notes_supplier_code_idx ON supplier_notes (supplier_code);

CREATE INDEX batches_sku_idx ON batches (sku);

CREATE INDEX boms_parent_sku_idx ON boms (parent_sku);

CREATE INDEX production_orders_bom_id_idx ON production_orders (bom_id);

CREATE INDEX plan_lines_sku_idx ON plan_lines (sku);

CREATE INDEX stock_id_idx ON stock (id);

CREATE INDEX orders_practitioner_code_idx ON orders (practitioner_code);
