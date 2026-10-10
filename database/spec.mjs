// The shape of the database, in one place.
//
// This file is the single description of what the console stores: which tables
// exist, what their keys are, which fields are real typed columns, and which
// child rows hang off a parent. `schema.mjs` turns it into DDL, `scripts/
// build-db.mjs` seeds from it, and `resources/js/data/db.js` reads and writes
// through it — so the schema, the seed and the queries can never drift apart.
//
// Two rules decide whether a field gets a column of its own:
//
//   * it is queried, filtered, sorted or joined on — then it is a column, with
//     a type and, where there is a real relationship, a foreign key;
//   * otherwise it stays inside `doc`, the jsonb copy of the whole record.
//
// `doc` is not a shortcut around the schema: it is the record, and the columns
// are projections of it, kept in step on every write. A record always round
// trips exactly, while `WHERE supplier_code = $1` and `ORDER BY expires_on`
// still run in the database rather than in the browser.
//
// Child rows (an order's lines, a recipe's components) are the exception: they
// live in their own table and *not* in the parent's `doc`, because a line is a
// record in its own right and has to be updatable on its own.

/** `a.b.c` out of an object, undefined-safe. */
const at = (path) => (row) => {
    let value = row;

    for (const step of path.split('.')) {
        value = value?.[step];

        if (value === undefined || value === null) {
            return null;
        }
    }

    return value;
};

/** A `{ he, en }` record's Hebrew side, which is what the console sorts on. */
const he = (path) => (row) => {
    const value = at(path)(row);

    return value && typeof value === 'object' ? (value.he ?? null) : value;
};

const col = (name, type, path, opts = {}) => ({
    name,
    type,
    get: typeof path === 'function' ? path : at(path),
    ...opts,
});

const locCol = (name, path, opts = {}) => ({
    name,
    type: 'text',
    get: he(path),
    ...opts,
});

/**
 * The tables.
 *
 * `source` is the key `buildDataset()` returns the rows under, `key` the field
 * that identifies a row, `columns` the typed projections and `lines` the child
 * tables. `refs` states a foreign key: [column, table, column].
 */
export const TABLES = [
    // ---------------------------------------------------------------- people
    {
        name: 'practitioners',
        source: 'practitioners',
        key: 'code',
        columns: [
            col('first_name', 'text', 'first'),
            col('last_name', 'text', 'last'),
            col('therapy', 'text', 'therapy'),
            col('city', 'text', 'city'),
            col('status', 'text', 'status'),
            col('points', 'numeric', 'points'),
            col('discount_pct', 'numeric', 'disc'),
        ],
    },
    {
        name: 'patients',
        source: 'patients',
        key: 'tz',
        columns: [
            col('first_name', 'text', 'first'),
            col('last_name', 'text', 'last'),
            col('age', 'integer', 'age'),
            col('sex', 'text', 'sex'),
            col('pregnant', 'boolean', 'preg'),
        ],
    },
    {
        name: 'customers',
        source: 'customers',
        key: 'code',
        columns: [
            col('name', 'text', 'name'),
            col('phone', 'text', 'phone'),
            col('email', 'text', 'email'),
        ],
    },
    { name: 'pending_users', source: 'pendingUsers', key: 'id' },
    {
        name: 'admins',
        source: 'admins',
        key: 'id',
        columns: [locCol('name', 'name'), col('email', 'text', 'email')],
    },
    { name: 'points_ledger', source: 'pointsLedger', key: 'code' },
    { name: 'vendor_contacts', source: 'vendorContacts', key: 'id' },

    // ------------------------------------------------------------- suppliers
    {
        name: 'suppliers',
        source: 'suppliers',
        key: 'code',
        columns: [
            locCol('name', 'name'),
            col('kind', 'text', 'kind'),
            col('sap_group', 'integer', 'sapGroup'),
            col('status', 'text', 'status'),
            col('terms', 'text', 'terms'),
            locCol('city', 'city'),
            col('currency', 'text', 'cur'),
            col('sku_count', 'integer', 'skus'),
            col('lead_days', 'integer', 'lead'),
            col('balance', 'numeric', 'sapBalance'),
        ],
    },

    // --------------------------------------------------------------- catalog
    {
        name: 'items',
        source: 'items',
        key: 'code',
        columns: [
            col('sku', 'text', 'sku'),
            locCol('name', 'names'),
            col('foreign_name', 'text', 'names.en'),
            col('item_group', 'integer', 'group'),
            col('family', 'text', 'family'),
            col('item_type', 'text', 'itemType'),
            col('active', 'boolean', 'active'),
            col('stock_uom', 'text', 'uom.stock'),
            col('purchase_uom', 'text', 'uom.purchase'),
            col('supplier_code', 'text', 'suppliers.sapCode'),
            col('on_hand', 'numeric', 'onHand'),
            col('committed', 'numeric', 'committed'),
            col('on_order', 'numeric', 'onOrder'),
            col('last_purchase', 'numeric', 'price.lastPurchase'),
            col('inventory', 'boolean', 'flags.inventory'),
            col('purchasable', 'boolean', 'flags.purchase'),
            col('sellable', 'boolean', 'flags.sales'),
        ],
    },
    {
        name: 'products',
        source: 'products',
        key: 'id',
        columns: [
            col('sku', 'text', 'sku'),
            locCol('name', 'name'),
            col('status', 'text', 'status'),
            col('family', 'text', 'family'),
            col('stock', 'numeric', 'stock'),
        ],
    },
    { name: 'shelf_items', source: 'shelfItems', key: 'sku' },
    {
        name: 'boms',
        source: 'boms',
        key: 'id',
        columns: [
            col('parent_sku', 'text', 'parentSku'),
            locCol('name', 'name'),
            col('prep_type', 'text', 'prepType'),
            col('version', 'integer', 'version'),
            col('yield_qty', 'numeric', 'yield.qty'),
            col('yield_uom', 'text', 'yield.uom'),
        ],
        lines: {
            field: 'components',
            name: 'bom_components',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('uom', 'text', 'uom'),
                col('issue', 'text', 'issue'),
            ],
        },
    },
    { name: 'prep_types', source: 'prepTypes', key: 'id' },
    { name: 'herbs', source: 'herbs', key: 'id' },
    { name: 'interactions', source: 'interactions', key: 'id' },
    { name: 'formula_templates', source: 'formulaTemplates', key: 'id' },
    { name: 'preparation_forms', source: 'preparationForms', key: 'id' },
    { name: 'site_categories', source: 'siteCategories', key: 'id' },
    { name: 'item_groups', source: 'itemGroups', key: 'code' },
    { name: 'item_properties', source: 'itemProperties', key: 'code' },
    { name: 'price_lists', source: 'priceLists', key: 'code' },
    { name: 'price_groups', source: 'priceGroups', key: 'id' },
    { name: 'attachments', source: 'attachments', key: 'id' },

    // ----------------------------------------------------------------- sales
    {
        name: 'orders',
        source: 'orders',
        key: 'id',
        columns: [
            col('placed_on', 'date', 'iso'),
            col('status', 'text', 'status'),
            col('kind', 'text', 'type'),
            col('practitioner_code', 'text', 'practitioner.code'),
            col('total', 'numeric', 'total'),
            col('payer', 'text', 'payer'),
        ],
    },
    { name: 'transactions', source: 'transactions', key: 'id' },
    { name: 'collection_links', source: 'collectionLinks', key: 'id' },
    {
        name: 'documents',
        source: 'documents',
        key: 'id',
        columns: [
            col('doc_num', 'text', 'num'),
            col('doc_type', 'text', 'type'),
            col('status', 'text', 'status'),
            col('order_id', 'text', 'order'),
        ],
    },

    // ------------------------------------------------------------- inventory
    {
        name: 'stock',
        source: 'stock',
        key: 'sku',
        columns: [
            locCol('name', 'name'),
            col('kind', 'text', 'kind'),
            col('warehouse', 'text', 'wh'),
            col('unit', 'text', 'unit'),
            col('on_hand', 'numeric', 'onHand'),
            col('allocated', 'numeric', 'alloc'),
            col('min_stock', 'numeric', 'min'),
        ],
    },
    {
        name: 'batches',
        source: 'batches',
        key: 'id',
        columns: [
            col('number', 'text', 'number'),
            col('sku', 'text', 'sku'),
            locCol('name', 'name'),
            col('warehouse', 'text', 'wh'),
            col('source', 'text', 'source'),
            col('expires_on', 'date', 'expiry'),
            col('made_on', 'date', 'madeOn'),
            col('remaining', 'numeric', 'remaining'),
            col('received_qty', 'numeric', 'qty'),
            col('waste', 'boolean', 'waste'),
        ],
    },
    { name: 'batch_use', source: 'batchUse', key: 'id' },
    {
        name: 'movements',
        source: 'movements',
        key: 'id',
        columns: [
            col('kind', 'text', 'kind'),
            col('sku', 'text', 'sku'),
            col('batch_id', 'text', 'batch'),
            col('warehouse', 'text', 'wh'),
            col('qty', 'numeric', 'qty'),
            col('doc_ref', 'text', 'ref'),
            col('moved_on', 'date', 'when.iso'),
        ],
    },
    {
        name: 'inventory_docs',
        source: 'inventoryDocs',
        key: 'id',
        columns: [
            col('doc_type', 'text', 'type'),
            col('warehouse', 'text', 'warehouse'),
            col('supplier_code', 'text', 'supplierCode'),
            col('doc_date', 'date', 'when.iso'),
        ],
        lines: {
            field: 'lines',
            name: 'inventory_doc_lines',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('batch_id', 'text', 'batch'),
            ],
        },
    },
    {
        name: 'receipts',
        source: 'receipts',
        key: 'id',
        columns: [
            col('supplier_code', 'text', 'supplierCode'),
            col('po_id', 'text', 'po'),
            col('doc_num', 'text', 'docNum'),
            col('received_on', 'date', 'when.iso'),
        ],
        lines: {
            field: 'lines',
            name: 'receipt_lines',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('batch_id', 'text', 'batch'),
            ],
        },
    },
    { name: 'sap_warehouses', source: 'sapWarehouses', key: 'code' },
    { name: 'open_orders', source: 'openOrders', key: 'id' },

    // -------------------------------------------------------------- purchase
    {
        name: 'purchase_orders',
        source: 'purchaseOrders',
        key: 'id',
        columns: [
            col('supplier_code', 'text', 'supplierCode'),
            locCol('supplier', 'supplier'),
            col('state', 'text', 'state'),
            col('currency', 'text', 'currency'),
            col('eta', 'date', 'eta'),
            col('raised_on', 'date', 'created.iso'),
        ],
        lines: {
            field: 'lines',
            name: 'purchase_order_lines',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('uom', 'text', 'uom'),
                col('price', 'numeric', 'price'),
                col('received', 'numeric', 'received'),
            ],
        },
    },
    {
        name: 'purchase_requests',
        source: 'purchaseRequests',
        key: 'id',
        columns: [
            col('number', 'text', 'number'),
            col('supplier_code', 'text', 'supplierCode'),
            locCol('supplier', 'supplier'),
            col('state', 'text', 'state'),
            col('order_id', 'text', 'order'),
            col('raised_on', 'date', 'raised.iso'),
        ],
        lines: {
            field: 'lines',
            name: 'purchase_request_lines',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('unit', 'text', 'unit'),
                col('price', 'numeric', 'price'),
            ],
        },
    },
    {
        // V3 — the buyer's own sheets: a request is a shopping list, an order is
        // one with a supplier on it. One table, because they differ in three
        // fields and in nothing else.
        name: 'buying_lists',
        source: 'buyingLists',
        key: 'id',
        columns: [
            col('number', 'text', 'number'),
            col('kind', 'text', 'kind'),
            col('supplier_code', 'text', 'supplierCode'),
            locCol('supplier', 'supplier'),
            col('state', 'text', 'state'),
            col('created_on', 'date', 'created.iso'),
        ],
        lines: {
            field: 'lines',
            name: 'buying_list_lines',
            columns: [
                col('sku', 'text', 'sku'),
                col('qty', 'numeric', 'qty'),
                col('uom', 'text', 'uom'),
                col('done', 'boolean', 'done'),
                col('received', 'numeric', 'received'),
            ],
        },
    },
    {
        name: 'plan_lines',
        source: 'planLines',
        key: 'id',
        columns: [
            col('sku', 'text', 'sku'),
            col('target', 'text', 'target'),
            col('qty', 'numeric', 'qty'),
            col('state', 'text', 'state'),
            col('request_id', 'text', 'request'),
            col('order_id', 'text', 'order'),
        ],
    },
    {
        name: 'supplier_notes',
        source: 'supplierNotes',
        key: 'id',
        columns: [
            col('po_id', 'text', 'po'),
            col('supplier_code', 'text', 'supplierCode'),
            col('doc_num', 'text', 'docNum'),
            col('state', 'text', 'state'),
            col('invoice_id', 'text', 'invoice'),
        ],
        lines: {
            field: 'lines',
            name: 'supplier_note_lines',
            columns: [col('sku', 'text', 'sku'), col('qty', 'numeric', 'qty')],
        },
    },
    {
        name: 'supplier_invoices',
        source: 'supplierInvoices',
        key: 'id',
        columns: [
            col('supplier_code', 'text', 'supplierCode'),
            col('doc_num', 'text', 'num'),
            col('invoice_date', 'date', 'date'),
            col('due_on', 'date', 'dueOn'),
            col('net', 'numeric', 'net'),
            col('vat', 'numeric', 'vat'),
            col('total', 'numeric', 'total'),
            col('currency', 'text', 'currency'),
        ],
    },
    {
        name: 'supplier_payments',
        source: 'supplierPayments',
        key: 'id',
        columns: [
            col('supplier_code', 'text', 'supplierCode'),
            col('paid_on', 'date', 'date'),
            col('amount', 'numeric', 'amount'),
            col('method', 'text', 'method'),
        ],
    },

    // ------------------------------------------------------------ production
    {
        name: 'production_orders',
        source: 'productionOrders',
        key: 'id',
        columns: [
            col('bom_id', 'text', 'bomId'),
            col('parent_sku', 'text', 'parentSku'),
            col('state', 'text', 'state'),
            col('planned_qty', 'numeric', 'plannedQty'),
            col('uom', 'text', 'uom'),
            col('yield_qty', 'numeric', 'yieldQty'),
            col('waste_qty', 'numeric', 'wasteQty'),
            col('output_batch', 'text', 'outputBatch'),
            col('opened_on', 'date', 'createdOn.iso'),
        ],
        lines: {
            field: 'components',
            name: 'production_components',
            columns: [
                col('sku', 'text', 'sku'),
                col('planned_qty', 'numeric', 'plannedQty'),
                col('actual_qty', 'numeric', 'actualQty'),
                col('uom', 'text', 'uom'),
            ],
        },
    },

    // ------------------------------------------------------- everything else
    { name: 'activities', source: 'activities', key: 'id' },
    { name: 'messages', source: 'messages', key: 'id' },
    { name: 'message_templates', source: 'messageTemplates', key: 'id' },
    { name: 'message_triggers', source: 'messageTriggers', key: 'id' },
    { name: 'scheduled_messages', source: 'scheduledMessages', key: 'id' },
    { name: 'articles', source: 'articles', key: 'id' },
    { name: 'events', source: 'events', key: 'id' },
    { name: 'videos', source: 'videos', key: 'id' },
    { name: 'services', source: 'services', key: 'id' },
    { name: 'sticker_templates', source: 'stickerTemplates', key: 'id' },
    { name: 'sticker_notes', source: 'stickerNotes', key: 'id' },
    { name: 'sticker_prints', source: 'stickerPrints', key: 'id' },
    { name: 'pickup_points', source: 'pickupPoints', key: 'id' },
    {
        name: 'audit_log',
        source: 'log',
        key: 'id',
        columns: [
            col('act', 'text', 'act'),
            col('entity_type', 'text', 'entType'),
            col('entity', 'text', 'ent'),
            locCol('actor', 'actor'),
        ],
    },
];

/**
 * Foreign keys, stated separately because several of them point at tables that
 * are declared further down the list. Every one of these is a relationship the
 * console actually follows on a screen, and every one of them is satisfied by
 * the data — the seeder fails loudly rather than shipping a constraint that
 * does not hold.
 *
 * `[table, column, target]`; the target is always that table's primary key,
 * because a row is identified by the pharmacy's own identifier and nothing else.
 */
export const FOREIGN_KEYS = [
    ['items', 'supplier_code', 'suppliers'],
    ['purchase_orders', 'supplier_code', 'suppliers'],
    ['purchase_requests', 'supplier_code', 'suppliers'],
    ['supplier_invoices', 'supplier_code', 'suppliers'],
    ['supplier_payments', 'supplier_code', 'suppliers'],
    ['supplier_notes', 'supplier_code', 'suppliers'],
    ['batches', 'sku', 'items'],
    ['boms', 'parent_sku', 'items'],
    ['production_orders', 'bom_id', 'boms'],
    ['plan_lines', 'sku', 'items'],
    // A stock row is keyed by the item it is the stock of, so its own primary
    // key is the reference.
    ['stock', 'id', 'items'],
    ['orders', 'practitioner_code', 'practitioners'],
];

/** Indexes worth having, beyond the primary keys and the foreign keys. */
export const INDEXES = [
    ['items', ['item_group']],
    ['items', ['family']],
    ['items', ['sku']],
    ['batches', ['expires_on']],
    ['batches', ['number']],
    ['movements', ['sku']],
    ['movements', ['batch_id']],
    ['movements', ['moved_on']],
    ['orders', ['placed_on']],
    ['orders', ['status']],
    ['stock', ['warehouse']],
    ['audit_log', ['entity_type', 'entity']],
];

/**
 * What is not a list of records: the enum lists, the settings objects, the
 * lookup maps. They are rows in `settings`, keyed by the name the dataset uses,
 * so they are as editable as anything else — a threshold the pharmacy changes
 * is an UPDATE, not a redeploy.
 */
export const SETTINGS_KEY = 'settings';

/** The rows the console reads straight out of SAP, kept as reference tables. */
export const REFERENCE = [
    'consumption',
    'coverThresholds',
    'inventorySettings',
    'stockKinds',
    'herbsById',
    'herbWarnings',
    'formulaLibrary',
    'printTexts',
    'priceImport',
    'orderNote',
    'session',
    'serviceStates',
    'collectLinkStates',
    'legacyDebt',
    'defaultMinStock',
    'ingredientPricePrefix',
];

/** Dataset key → table, for the persist router. */
export const TABLE_BY_SOURCE = Object.fromEntries(
    TABLES.map((table) => [table.source, table]),
);

export const TABLE_BY_NAME = Object.fromEntries(
    TABLES.map((table) => [table.name, table]),
);
