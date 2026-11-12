// Purchasing — the two tabs. The sheet's own column headers live in
// config/buying.js: they are what is written to the Excel file, not what is
// shown on screen.
export default {
    crumb: 'Purchasing & inventory',
    title: 'Purchasing',
    sub: 'Purchase requests and supplier orders',

    tab: {
        request: 'Purchase request',
        order: 'Purchase order',
    },

    action: {
        // The no-PO receipt — the only other door into stock besides
        // receiving against a specific order on its own sheet.
        receiveNoOrder: 'Purchase without an order',
    },

    request: {
        one: 'Purchase request',
        pick: 'Request',
        new: 'New request',
        file: 'purchase-request',
        ticked: '{done} of {total} done',
        moved: '{done} of {total} moved to an order',
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
        // An order part of whose goods came and the rest is still on its way.
        partial: 'Partly received',
        closedShort: 'Closed short',
        waiting: 'one line still waiting | {n} lines still waiting',
        closedShortLines: 'one line closed short | {n} lines closed short',
        awaitingNotes:
            'one delivery note awaits its invoice: {refs} | {n} delivery notes await their invoice: {refs}',
        gapLines: 'a gap on one line | gaps on {n} lines',
        emptyTitle: 'No purchase orders yet',
        emptySub:
            'A purchase order is one supplier, quantities, and a file to send them.',
    },

    supplier: 'Supplier',
    pickSupplier: 'Choose a supplier…',
    needSupplier: 'Choose a supplier before marking it sent',
    needQty: 'one line has no quantity | {n} lines have no quantity',

    // config/buying.js BUYING_STATES — three states for a request, five for an order
    state: {
        open: 'Open',
        done: 'Done',
        closed: 'Closed',
        draft: 'Draft',
        sent: 'Sent',
        awaiting_invoice: 'Awaiting tax invoice',
        received: 'Received',
        failed: 'Failed',
    },
    close: 'Finish the request',
    reopen: 'Reopen',
    sheetCount: 'no sheets | one sheet | {n} sheets',

    // A sheet's state comes from what happened to it, not from what somebody
    // ticked: an order is a draft until it is marked sent by hand, received is
    // set only by actually booking the goods in, and failed has no other way
    // to be reached.
    step: {
        requestOpen:
            'The request is open. Add item codes, tick off what is sourced, and export when you need to.',
        requestClosed: 'The request is finished. It can be reopened.',
        requestDone:
            'Every line of the request moved to a purchase order — the request is done. The lines stay here to read, each with the order it went to.',
        awaitingInvoice:
            'All the goods arrived (last on {when}), but on a delivery note — without prices. The order closes when a tax invoice is attached.',
        draft: 'A draft — not yet sent to the supplier. Export to Excel at any stage, and mark it Sent once it actually goes out.',
        sent: 'Sent to the supplier on {when}. When the goods arrive, book them in.',
        received: 'Received on {when}; stock was updated.',
        partial:
            'Part of the goods arrived (last on {when}). Book the rest in when it comes — or close it if it will not.',
        receivedShort:
            'Closed on {when} on what arrived; the rest is not coming.',
        failed: 'Marked as failed. Change the supplier or the lines if needed, and mark it Sent when it goes out again.',
    },

    move: {
        open: 'Reopen',
        closed: 'Finish the request',
        sent: 'Mark as sent',
        failed: 'Mark as failed',
    },

    convert: {
        action: 'Move to a purchase order',
        title: 'Move lines to a purchase order',
        body: 'Every line ticked "done" moves onto a new purchase order, one per supplier. Lines that were not ticked stay on the request.',
        confirm: 'Move',
        effect: {
            group: 'one line → {supplier} | {n} lines → {supplier}',
            into: 'one line → {supplier} · added to draft {number} | {n} lines → {supplier} · added to draft {number}',
            noSupplier: 'No supplier (chosen on the order)',
            remain: 'one line stays on the request | {n} lines stay on the request',
            remainNone: 'Every line moves — the request will be marked Done',
            kept: 'The lines that move stay on the request to read, each with its order number',
        },
        done: 'Opened purchase order {numbers} | Opened {n} purchase orders: {numbers}',
        doneJoined:
            'Lines added to draft {numbers} | Lines added to drafts {numbers}',
    },

    // An order part of whose goods came, and the rest is not coming.
    closeRest: {
        action: 'Close the rest',
        title: 'Close the rest that is not coming',
        body: 'One line is still waiting for goods. The order closes on what already arrived. | {n} lines are still waiting for goods. The order closes on what already arrived.',
        effectState:
            'The order moves to Received, with the shortfall left marked on its lines',
        effectStateWait:
            'The order moves to Awaiting tax invoice — a delivery note of it has no invoice yet — with the shortfall left marked on its lines',
        effectStock:
            'Stock does not change — only what actually arrived was booked in',
        confirm: 'Close the rest',
        done: 'The rest was closed',
    },

    // Only a sheet nothing happened to: a draft order, or an open request.
    remove: {
        action: {
            order: 'Delete the draft',
            request: 'Delete the request',
        },
        title: {
            order: 'Delete a draft order',
            request: 'Delete a purchase request',
        },
        body: 'Sheet {number} will be removed from the list. The record stays in the log.',
        done: 'Sheet {number} removed',
    },

    // What the row carries is what the decision is made from; the rest of the
    // item card opens by clicking the name.
    lineDetails: 'All the item details',
    lineSnapshot:
        'These are the values as they were when the line was added, not what the item card says now — a sheet written in March and read in May has to say what the shelf held in March.',
    lineDone: 'Done',
    lineNotDone: 'Not done yet',
    movedTo: 'On order {number}',
    quoteHint:
        'The supplier’s price for this order, per purchase unit, before VAT. Open until the line’s goods arrive; opens the invoice price.',
    attach: {
        open: 'Attach a tax invoice',
    },
    openItemCard: 'Open the item card',
    openItemCardHint: 'For what is current, as against what the line kept.',
    group: {
        working: 'What the line says',
        identity: 'Item identity',
        supply: 'Supplier and prices',
        shelf: 'Stock',
        replenish: 'Replenishment',
    },

    railAria: 'Sheet stages',
    totalQty: '{n} in total',
    noSupplierYet: 'No supplier chosen yet',
    backToList: 'Back to the list',
    notFound: 'Sheet not found',
    notFoundSub: 'It may have been deleted, or the link may be wrong.',
    blocked: {
        noLines: 'There are no lines on the sheet',
    },

    receive: {
        open: 'Receive goods',
        title: 'Goods receipt · order {number} · {supplier}',
        docNum: 'Document number',
        date: 'Receipt date',
        docType: 'The document the goods came with',
        docTypePick: 'Choose the document…',
        docNumNote: 'Delivery note number',
        docNumInvoice: 'Tax invoice number',
        noteNoPrices:
            'Delivery note — the goods are booked in without prices. The prices come in when a tax invoice is attached; until then it is in the supplier’s open delivery notes.',
        invoicePrices:
            'Tax invoice — a price is required on every line, per purchase unit, before VAT. The field opens at the line’s quote price.',
        priceInvoice: 'Price before VAT',
        priceQuote: 'Per {uom} · quote: {price}',
        priceNoQuote: 'Per {uom} · no quote on the line',
        notBatched:
            'Not batch-managed — booked in with no batch, production date or expiry.',
        needDocType: 'Choose the document the goods came with',
        needPrices: 'one line has no price | {n} lines have no price',
        needGeneral:
            'A general line is missing its description, quantity or price',
        file: 'Document scan',
        fileHint: 'Optional — it can be added later, on the supplier card.',
        general: {
            title: 'General lines',
            lead: 'A line on the document that is not a catalogue item — shipping, say. It does not enter stock, has no batch and no label, and counts in the document’s value.',
            add: 'Add a general line',
            line: 'General line {n}',
            name: 'Description',
            namePh: 'e.g. shipping',
            qty: 'Quantity',
            price: 'Price before VAT',
            remove: 'Remove the general line',
        },
        effectNote:
            'Delivery note: no prices — listed under open delivery notes until a tax invoice is attached',
        effectInvoice:
            'Tax invoice {num} for {net} before VAT is recorded on the supplier and enters the open balance',
        effectStateWait: 'The order moves to Awaiting tax invoice',
        effectGeneral:
            'one general line on the document, no stock | {n} general lines on the document, no stock',
        effectNoBatch:
            'one line of an item that is not batch-managed is booked in without a batch | {n} lines of items that are not batch-managed are booked in without a batch',
        ordered: 'Ordered',
        arrived: 'Arrived',
        batch: 'Supplier batch',
        batchHint: 'From the label',
        batchEmptyShort:
            'No code from the supplier? Empty — numbered WV and the receipt date',
        already: '{n} already received',
        needExpiry: 'one line has no expiry | {n} lines have no expiry',
        diffHint: 'Differs from what was still due ({due})',
        linesAria: 'Receipt lines',
        madeOn: 'Production date',
        madeOnHint:
            'From the supplier’s certificate, if given. Printed on the label.',
        expiry: 'Expiry date',
        labels: 'How many labels to print',
        labelsNoPack:
            'How many containers the quantity is divided into — one label each.',
        labelsByItem:
            'By a {size} package, from the item card. Can be changed.',
        labelsByFamily:
            'By a {size} container, from the batch settings. Can be changed.',
        needLabels: 'The label count must be a whole number',
        effectLabels:
            'One batch label is printed after confirming | {n} batch labels are printed after confirming',
        effectNoLabels: 'No labels will be printed',
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
            'A batch is opened per line of a batch-managed item, with the supplier number and expiry',
        effectState: 'The order moves to Received',
        effectOpen: 'The order stays open for the rest',
        effectDiffer:
            'One line differs from what was ordered | {n} lines differ from what was ordered',
        done: 'one line booked in | {n} lines booked in',
    },

    labels: {
        title: 'Batch labels · {id}',
        lead: 'One label is ready to print. | {n} labels are ready to print, each line by the number of packages recorded.',
        batch: 'Batch {batch}',
        each: 'no labels | one label | {n} labels',
        sample: 'The first label will look like this',
        skip: 'Not now',
    },

    note: 'Internal note',
    noteHint:
        'For the pharmacy only — not in the exported file, never sent to the supplier.',
    // On an order (12.11.2026): the internal note is in the internal export,
    // never in the supplier's file.
    noteHintOrder:
        'For the pharmacy only — in the internal export, never in the file sent to the supplier.',
    supplierNote: 'Note for the supplier',
    supplierNotePlaceholder:
        'e.g. Please attach a certificate of analysis for each batch',
    supplierNoteHint:
        'Written at the head of the supplier’s Excel file, and of the internal export. Locked once the order is marked sent.',
    // A note for the supplier on one order line (12.11.2026) — the item-notes
    // column of the supplier's file.
    lineSupplierNote: 'Note for the supplier on this item',
    lineSupplierNotePlaceholder: 'e.g. whole herb only — not powder',
    lineSupplierNoteHint:
        'Goes into the item-notes column of the supplier’s file. Locked once the order is marked sent.',
    lineSupplierNoteShort: 'For the supplier: {note}',
    notePlaceholder:
        'Being prepared · emailed on the 5th · waiting on a price…',
    openedBy: 'Opened by {who} · {when}',

    paste: 'Paste codes and quantities',
    pastePlaceholder: '100002 5\n110005 2.5\n200011',
    pasteHint:
        'A code, then its quantity if there is one — two columns out of Excel (code and quantity) work, and so do bare codes. The quantity is in the line’s purchase unit. A code already listed takes the pasted quantity in place of its own.',
    search: 'Search',
    addOne: 'Add a single item',
    addOnePlaceholder: 'Code, name or Chinese name…',

    foundAdded: 'one row added | {n} rows added',
    foundUpdated: 'Quantity updated: {list}',
    foundAlready: 'Already listed: {list}',
    foundMissing: 'Not found: {list}',

    // Narrowing the sheet list — search, opening-date range, state (as tabs)
    // and supplier.
    filterGroup: {
        who: 'Supplier',
    },
    filter: {
        noun: 'sheets',
        field: {
            bsup: 'Supplier',
        },
        noSupplier: 'No supplier',
    },
    listSearch: 'Number, supplier, note or who opened it…',
    listCount: 'sheets · of {total}',
    listEmpty: 'No sheets match the filter',

    noLinesTitle: 'The list is empty',
    noLinesSub: 'Paste item codes and press Search, or add a single item.',

    lineCount: 'no rows | one row | {n} rows',
    dropLine: 'Remove the row',
    export: 'Export to Excel',
    exported: 'one row exported | {n} rows exported',
    // A purchase order has two buttons (12.11.2026): internal — every field;
    // supplier — only what the supplier needs, in the sample file's shape.
    exportInternal: 'Export to Excel (internal)',
    exportSupplier: 'Export to Excel for the supplier',
    exportSupplierHint:
        'The file sent to the supplier: codes, names, purchase unit, quantity and notes — no prices and no internal note',
    exportedSupplier:
        'Supplier file exported — one row | Supplier file exported — {n} rows',
    supplierFileSuffix: 'supplier',

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
        gap: 'Gap',

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
        quotePrice: 'Quote price',
        lastPriceOn: 'Last bought',
        evalPrice: 'Valuation price',

        uom: 'Stock unit',
        uomShort: 'Unit',
        onHand: 'On hand',
        committed: 'Committed',
        available: 'Available',
        onOrder: 'On order',
        min: 'Minimum level',
        minShort: 'Minimum',
        max: 'Maximum level',
        reorder: 'Reorder quantity',

        minOrder: 'Minimum order',
        leadDays: 'Lead time',
        procurement: 'Procurement',

        qty: 'Quantity',
        done: 'Done',
    },
};
