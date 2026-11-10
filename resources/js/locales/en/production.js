// Production orders — the screen and the cards that read it.
export default {
    sheet: {
        title: 'Work sheet · production',
        printedOn: 'Printed {date}',
        item: 'Item',
        recipe: 'Recipe',
        version: 'Version {v}',
        planned: 'Quantity to make',
        opened: 'Opened',
        due: 'Target date',
        components: 'Components',
        colSku: 'Code',
        colName: 'Component',
        colQty: 'Quantity',
        colTaken: 'Taken',
        colBatch: 'Batch',
        result: 'The result',
        yieldQty: 'Yield',
        wasteQty: 'Waste',
        batchNo: 'Batch number',
        expiresOn: 'Expires',
        signature: 'Signatures',
        madeBy: 'Made by',
        checkedBy: 'Checked by',
    },
    tab: {
        orders: 'Production orders',
        lead: 'Times by preparation type',
    },
    title: 'Production orders',
    sub: '{open} open · {completed} completed in the last 30 days',
    countLabel: 'of {total} orders',

    // config/production.js PRODUCTION_STATE_IDS
    state: {
        issued: 'Issued',
        completed: 'Completed',
        cancelled: 'Cancelled',
    },
    // An order part of which is already in stock while the rest is at the bench.
    partial: 'Partly received',
    overdue: 'Overdue',

    filterGroup: {
        state: 'State',
        what: 'What is made',
        who: 'Who',
        size: 'Quantity',
    },

    filter: {
        noun: 'production orders',
        search: 'Order number · name · SKU · batch',
        field: {
            rstate: 'Order state',
            rprep: 'Preparation type',
            ritem: 'Item',
            rby: 'Opened by',
            rwaste: 'Waste',
            rqty: 'Quantity to make',
        },
        wasteState: {
            yes: 'With waste',
            no: 'No waste',
        },
    },

    kpi: {
        open: 'Open orders',
        openSub: 'At the lab, not yet received',
        produced: 'Completed in the last 30 days',
        producedSub: 'Click filters',
        waste: 'Waste this month',
        wasteSub: 'Of everything produced',
    },

    col: {
        id: 'Order',
        parent: 'What is made',
        prepType: 'Preparation type',
        planned: 'Quantity',
        state: 'State',
        when: 'Date',
        due: 'Target date',
        output: 'Batches opened',
        by: 'Opened by',
    },

    cell: {
        yielded: 'Yield {qty} {uom} · waste {waste} {uom}',
        received: '{qty} {uom} received so far',
    },

    empty: {
        title: 'No production orders match',
        sub: 'Clear the filters or open a new order',
    },

    action: {
        create: 'New production order',
        receive: 'Receive into stock',
        cancel: 'Cancel the order',
        cancelRest: 'Cancel the rest',
        print: 'Print the work sheet',
        printLabel: 'Order label',
        printFailed: 'The browser blocked the print window',
    },

    // A component's stock, as SAP's production order shows it.
    stock: {
        onHand: 'On hand',
        avail: 'Available',
        onOrder: 'On order',
        leftAfter: 'Left in stock after the issue',
        supplierOrder: 'Supplier order in progress',
        supplierYes: 'Yes',
        supplierNo: 'No',
        supplierOn: 'On order {list}',
        supplierDraft: 'Draft {list} — not yet sent',
    },

    // Notes for the lab: one for this order only, and the standing ones that
    // come from the item card.
    notes: {
        title: 'Notes for the lab',
        standing: 'Standing notes from the item card',
        fromItem: 'Item remarks:',
        fromRecipe: 'Recipe note:',
        fromItemLong: 'Standing · item card',
        fromRecipeLong: 'Standing · recipe',
        standingNone: 'The item has no standing notes.',
        standingHint:
            'Written on the item card and carried to every production order of it. The order keeps them as they read today.',
        lab: 'Note for the lab — this order only',
        labShort: 'Note for this order',
        labPlaceholder: 'For example: finish all of herb 100002',
        labHint: 'Not carried to the next order of the same item.',
        none: 'No notes for this order.',
        internal: 'Internal notes',
        internalPlaceholder:
            'e.g. If the yield is good — raise the quantity next time',
        internalHint:
            'For the pharmacy only — never printed on the work sheet or the labels, never passed to the lab.',
        internalNone: 'No internal notes.',
        internalSaved: 'Internal note saved',
    },

    // The production order's target per preparation type — on the "Times by
    // preparation type" tab.
    target: {
        col: 'Production order target',
        days: 'days',
        none: '—',
        hint: 'Production order target: how many days after an order is opened a preparation of this type is due back from the lab (a tincture — 21 days of maceration). The order takes its target date from it, and the date can be moved on each order. Empty — no standing target.',
        saved: 'Production target updated',
    },

    drawer: {
        by: 'Opened by {name}',
        railAria: 'Order stages',
        details: 'Order details',
        planned: 'Quantity to make',
        recipe: 'Bill of materials',
        created: 'Opened',
        issuedOn: 'Issued',
        completedOn: 'Completed',
        cancelledOn: 'Cancelled',
        reason: 'Cancellation reason',
        closedShort: 'Closed short',
        due: 'Target date',
        dueNone: 'No target date — it can be set here.',
        dueByType: '{n} days for {type}. Move it to suit the lab’s load.',
        dueManual: 'Set by hand.',
        dueLate: 'One day past | {n} days past',
        received: 'Received so far',
        receivedOf: '{qty} of {planned} {uom}',
        yield: 'Yield',
        waste: 'Waste',
        noWaste: 'No waste',
        wasteKept: 'Recorded only',
        expiry: 'Batch expiry',
        cost: 'Component cost',
        costValue: '{total} · {unit} per {uom}',
        components: 'Components and batches',
        compItem: 'Component',
        compPlanned: 'Per recipe',
        compPicks: 'Drawn from batches',
        compActual: 'Actual',
        noBatch: 'No batch — recorded on stock only',
        short: '{qty} {uom} not covered by an open batch',
        taken: '{qty} drawn',
        outputBatch: 'Output batch',
        wasteBatch: 'Waste batch',
        receipts: 'Receipts into stock',
        rcptWhen: 'When',
        rcptQty: 'Quantity',
        rcptLabels: 'Labels',
        rcptFinal: 'Last receipt',
        rcptPart: 'Part {n}',
        rcptWaste: 'Waste {qty} {uom}',
        rcptAdded: 'Added to the previous part’s batch',
        reprint: 'Print the batch labels again',
    },

    create: {
        title: 'New production order',
        // SAP names a product and loads that item's bill of materials; OITT
        // holds one row per item code, so the recipe and the product are one
        // and the same choice.
        product: 'Product',
        productChoose: 'Choose a product…',
        productSearch: 'Search by name or SKU',
        productSearchAria: 'Search for a product to produce',
        productFound: 'One product of {total} | {n} products of {total}',
        productNone: 'No product matches the search',
        recipeHint:
            'The recipe yields {qty} {uom} per run · stock allows {runs} runs',
        qty: 'Quantity to make',
        uom: 'Unit of measure',
        uomHint: 'From the item card — cannot be changed',

        pick: {
            manual: 'Pick a batch by hand',
            auto: 'Automatic · FEFO',
            autoBack: 'Back to automatic picking',
            title: 'Open batches — {name}',
            needed: 'Needs {qty} {uom}',
            allocated: 'Allocated {qty} of {needed} {uom}',
            none: 'No open batch of this component',
            batchCol: 'Batch',
            expiryCol: 'Expires',
            remainingCol: 'In stock',
            qtyCol: 'Quantity from this batch',
        },

        due: 'Target date',
        dueHint:
            '{n} days for {type}. Move it to suit the lab’s load and priorities.',
        dueNone:
            '{type} has no standing target yet — set a date here, or set a target on the “Times by preparation type” tab.',
        preview: 'What leaves stock',
        save: 'Open the order and send it to the lab',
    },

    // Receiving into stock — all of it, or a part.
    receive: {
        title: 'Receive into stock · {id} · {name}',
        progress:
            'On the order {planned} {uom} · received so far {received} · {left} {uom} left',
        kind: {
            label: 'Kind of receipt',
            final: 'Last receipt — the order closes',
            partial: 'Partial receipt — the order stays open',
            hint: {
                final: 'Whatever is left of the components leaves stock and the order ends.',
                partial:
                    'Only this part’s share of the components leaves stock. The rest stays open and reserved.',
            },
        },
        yield: 'Quantity received now',
        yieldHint: 'In {uom}, as the order is',
        batch: {
            label: 'Batch',
            new: 'New batch · {next}',
            add: 'Add to batch {batch}',
            hint: {
                new: 'The next number in the running series, allocated automatically.',
                add: 'Same number, same dates — one batch that came back in two parts.',
            },
        },
        coversAll:
            'This quantity covers everything left of the order. If it is the last part, choose “Last receipt”.',
        closeOnly:
            'Nothing more is received: the order closes, and what is left of the components leaves stock.',
        saveFinal: 'Receive and close the order',
        savePartial: 'Receive this part',
        saved: '{qty} {uom} received into batch {batch}.',
        stillOpen: 'The order stays open for the rest.',
        labels: {
            count: 'How many batch labels to print',
            noPack: 'No container size is set for this item or its family — type the number of labels.',
            byItem: 'One per {name} of {size}, from the item card.',
            byFamily: 'One per container of {size} — the “{family}” setting.',
            print: 'Print one label | Print {n} labels',
            skip: 'Don’t print',
        },
    },

    complete: {
        waste: 'Waste',
        wasteHint: 'The recipe expects {pct}% waste',
        wasteNone: 'The recipe expects no waste',
        expiry: 'Expiry of the new batch',
        expiryHint: '{months} months per the preparation type — editable',
        actual: '{name} — actual quantity',
        actualHint: 'Per recipe {qty} {uom}',
        note: 'Note',
    },

    cancel: {
        title: 'Cancel production order',
        body: '{id} · {name} will be cancelled. The record stays in the log.',
        releases: 'Reserved components become available again',
        keepsReceived:
            'What was already received stays in stock, in its batches',
        confirm: 'Cancel the order',
        // An order part of which already came in closes on it, not cancelled.
        restTitle: 'Cancel the rest and close the order',
        restBody:
            '{id} · {name} closes on what has already been received ({qty} {uom}). The rest will not be made.',
        restConfirm: 'Cancel the rest',
    },

    toast: {
        created: 'Production order opened',
        createdBody: '{id} · {name}',
        received: 'Part of the order received into stock',
        completed: 'Run completed',
        completedBody: 'Batch {batch} · {qty} {uom}',
        cancelled: 'Production order cancelled',
        closedShort: 'The order closed on what was received',
    },

    log: {
        create: 'Production order opened',
        issue: 'Production order issued',
        complete: 'Production order completed',
        cancel: 'Production order cancelled',
    },
};
