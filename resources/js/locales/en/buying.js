// Purchasing — the three tabs. The sheet's own column headers live in
// config/buying.js: they are what is written to the Excel file, not what is
// shown on screen.
export default {
    crumb: 'Daily operations',
    title: 'Purchasing',
    sub: 'Internal production, purchase requests and supplier orders',

    tab: {
        production: 'Internal production',
        request: 'Purchase request',
        order: 'Purchase order',
    },

    request: {
        one: 'Purchase request',
        pick: 'Request',
        new: 'New request',
        file: 'purchase-request',
        emptyTitle: 'No purchase requests yet',
        emptySub:
            'A purchase request is a shopping list: what is wanted, before anybody has been asked for a price.',
    },

    order: {
        one: 'Purchase order',
        pick: 'Order',
        new: 'New order',
        file: 'purchase-order',
        emptyTitle: 'No purchase orders yet',
        emptySub:
            'A purchase order is one supplier, quantities, and a file to send them.',
    },

    supplier: 'Supplier',
    pickSupplier: 'Choose a supplier…',
    needSupplier: 'Choose a supplier before exporting',
    needQty: 'one line has no quantity | {n} lines have no quantity',

    paste: 'Paste item codes',
    pastePlaceholder: '100002 110005 200011',
    pasteHint:
        'Separated by spaces, commas or lines — a column pasted out of Excel works too. Each code becomes a row.',
    search: 'Search',
    addOne: 'Add a single item',
    addOnePlaceholder: 'Code or name…',

    foundAdded: 'one row added | {n} rows added',
    foundAlready: 'Already listed: {list}',
    foundMissing: 'Not found: {list}',

    noLinesTitle: 'The list is empty',
    noLinesSub: 'Paste item codes and press Search, or add a single item.',

    lineCount: 'no rows | one row | {n} rows',
    dropLine: 'Remove the row',
    export: 'Export to Excel',
    exported: 'one row exported | {n} rows exported',

    col: {
        sku: 'Code',
        name: 'Item',
        uom: 'Unit',
        available: 'Available',
        onOrder: 'On order',
        min: 'Minimum',
        supplier: 'Supplier',
        catalogNum: 'Supplier code',
        lastPrice: 'Last price',
        qty: 'Quantity',
        done: 'Done',
    },
};
