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
        ticked: '{done} of {total} done',
        emptyTitle: 'No purchase requests yet',
        emptySub:
            'A purchase request is a shopping list: what is wanted, before anybody has been asked for a price.',
    },

    order: {
        one: 'Purchase order',
        pick: 'Order',
        new: 'New order',
        file: 'purchase-order',
        number: 'Order number',
        supplierCode: 'Supplier code',
        details: 'Order details',
        openedOn: 'Opened',
        openedBy: 'Opened by',
        sentOn: 'Sent',
        receivedOn: 'Received',
        receipts: 'Goods receipts',
        inSap: 'Booked in through SAP, before this console',
        moveTo: 'Move to:',
        arrived: '{done} of {total} arrived',
        emptyTitle: 'No purchase orders yet',
        emptySub:
            'A purchase order is one supplier, quantities, and a file to send them.',
    },

    supplier: 'Supplier',
    pickSupplier: 'Choose a supplier…',
    needSupplier: 'Choose a supplier before exporting',
    needQty: 'one line has no quantity | {n} lines have no quantity',

    // config/buying.js BUYING_STATES — two states for a request, four for an order
    state: {
        open: 'Open',
        closed: 'Closed',
        draft: 'Draft',
        sent: 'Sent',
        received: 'Received',
        failed: 'Failed',
    },
    close: 'Finish the request',
    reopen: 'Reopen',
    sheetCount: 'no sheets | one sheet | {n} sheets',

    // A sheet's state comes from what happened to it, not from what somebody
    // ticked: an order is a draft while the file has not gone out, exporting is
    // the sending, and from there by hand — received, or failed.
    step: {
        requestOpen:
            'The request is open. Add item codes, tick off what is sourced, and export when you need to.',
        requestClosed: 'The request is finished. It can be reopened.',
        draft: 'A draft — the file has not gone out. Exporting to Excel is what the supplier receives, and the order is marked Sent after it.',
        sent: 'Sent to the supplier on {when}. When the goods arrive, book them in.',
        received: 'Received on {when}; stock was updated.',
        failed: 'Marked as failed. If it was sent again, move it back to Sent.',
    },

    move: {
        open: 'Reopen',
        closed: 'Finish the request',
        sent: 'Mark as sent',
        received: 'Mark as received',
        failed: 'Mark as failed',
    },

    railAria: 'Sheet stages',
    exportAndSend: 'Export to Excel and send',
    totalQty: '{n} in total',
    noSupplierYet: 'No supplier chosen yet',
    backToList: 'Back to the list',
    notFound: 'Sheet not found',
    notFoundSub: 'It may have been deleted, or the link may be wrong.',
    blocked: {
        noLines: 'There are no lines to export',
    },

    receive: {
        open: 'Receive goods',
        title: 'Goods receipt · order {number} · {supplier}',
        docNum: 'Delivery note number',
        date: 'Receipt date',
        ordered: 'Ordered',
        arrived: 'Arrived',
        batch: 'Supplier batch',
        batchHint: 'From the label',
        expiry: 'Expiry',
        price: 'Unit price',
        note: 'Receipt note',
        takeAll: 'All arrived',
        none: 'Clear',
        counting:
            'one line of {total} will be booked in | {n} lines of {total} will be booked in',
        sign: 'Confirm and sign',
        confirmTitle: 'Book in these goods?',
        confirmBody:
            'One line will be booked into stock. | {n} lines will be booked into stock.',
        effectStock: 'Stock rises by the quantities recorded',
        effectBatches:
            'A batch is opened per line, with the supplier number and expiry',
        effectState: 'The order moves to Received',
        effectDiffer:
            'One line differs from what was ordered | {n} lines differ from what was ordered',
        done: 'one line booked in | {n} lines booked in',
    },

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
        number: 'Number',
        opened: 'Opened',
        by: 'Opened by',
        lines: 'Lines',
        sheetState: 'State',
        received: 'Received',

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
