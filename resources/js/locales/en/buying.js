// Purchasing — the two tabs. The sheet's own column headers live in
// config/buying.js: they are what is written to the Excel file, not what is
// shown on screen.
export default {
    crumb: 'Daily operations',
    title: 'Purchasing',
    sub: 'Purchase requests and supplier orders',

    tab: {
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

    state: {
        open: 'Open',
        closed: 'Closed',
    },
    close: 'Close',
    reopen: 'Reopen',

    note: 'Working note',
    notePlaceholder:
        'Being prepared · emailed on the 5th · waiting on a price…',
    openedBy: 'Opened by {who} · {when}',

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

    days: '{n} days',

    // The item's own state, not the sheet's
    itemState: {
        active: 'Active',
        frozen: 'Frozen',
        inactive: 'Inactive',
    },

    // Everything the item card holds about buying this item, in the card's order
    col: {
        sku: 'Code',
        name: 'Item',
        foreignName: 'Foreign name',
        group: 'Item group',
        state: 'State',

        supplier: 'Preferred supplier',
        supplierCode: 'Supplier code',
        catalogNum: 'Supplier catalogue no.',
        purchaseUom: 'Purchase unit',
        numInBuy: 'Stock units per purchase unit',
        packUom: 'Packaging unit',
        packQty: 'Quantity per package',
        lastPrice: 'Last price',
        lastPriceOn: 'Last bought',
        evalPrice: 'Valuation price',

        uom: 'Stock unit',
        onHand: 'On hand',
        committed: 'Committed',
        available: 'Available',
        onOrder: 'On order',
        min: 'Minimum level',
        max: 'Maximum level',
        reorder: 'Reorder quantity',

        minOrder: 'Minimum order',
        leadDays: 'Lead time',
        procurement: 'Procurement',

        qty: 'Quantity',
        done: 'Done',
    },
};
