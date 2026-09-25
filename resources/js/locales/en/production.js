// Production orders — the screen and the cards that read it.
export default {
    title: 'Production orders',
    sub: '{open} open · {completed} completed in the last 30 days',
    countLabel: 'of {total} orders',

    // config/production.js PRODUCTION_STATE_IDS
    state: {
        planned: 'Planned',
        issued: 'Issued',
        completed: 'Completed',
        cancelled: 'Cancelled',
    },

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
            rqty: 'Planned quantity',
        },
        wasteState: {
            yes: 'With waste',
            no: 'No waste',
        },
    },

    kpi: {
        open: 'Open orders',
        openSub: 'Planned and issued',
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
        output: 'Batches opened',
        by: 'Opened by',
    },

    cell: {
        yielded: 'Yield {qty} {uom} · waste {waste} {uom}',
    },

    empty: {
        title: 'No production orders match',
        sub: 'Clear the filters or open a new order',
    },

    action: {
        create: 'New production order',
        issue: 'Issue to production',
        complete: 'Complete the run',
        cancel: 'Cancel the order',
        print: 'Print',
    },

    drawer: {
        by: 'Opened by {name}',
        railAria: 'Order stages',
        details: 'Order details',
        planned: 'Planned quantity',
        recipe: 'Bill of materials',
        created: 'Opened',
        issuedOn: 'Issued',
        completedOn: 'Completed',
        cancelledOn: 'Cancelled',
        reason: 'Cancellation reason',
        yield: 'Yield',
        waste: 'Waste',
        noWaste: 'No waste',
        expiry: 'Batch expiry',
        cost: 'Component cost',
        costValue: '{total} · {unit} per {uom}',
        components: 'Components and batches',
        compItem: 'Component',
        compPlanned: 'Per recipe',
        compPicks: 'Drawn from batches',
        compActual: 'Actual',
        noBatch: 'No batch — recorded on stock only',
        short: '{qty} {uom} short in open batches',
        output: 'What was opened',
        outputBatch: 'Output batch',
        wasteBatch: 'Waste batch',
    },

    create: {
        title: 'New production order',
        bom: 'Bill of materials',
        bomChoose: 'Choose a recipe…',
        recipeHint:
            'The recipe yields {qty} {uom} per run · stock allows {runs} runs',
        qty: 'Quantity to make',
        qtyHint: 'In {uom}, the recipe’s yield unit',
        notes: 'Production notes',
        preview: 'What leaves stock',
        shortage:
            '{n} components are short in open batches — the order can be opened and completed once goods arrive',
        save: 'Open the order',
    },

    complete: {
        title: 'Complete {id} · {name}',
        yield: 'Quantity produced',
        yieldHint: 'Planned {qty} {uom}',
        waste: 'Waste',
        wasteHint: 'The recipe expects {pct}% waste',
        wasteNone: 'The recipe expects no waste',
        expiry: 'Expiry of the new batch',
        expiryHint: '{months} months per the preparation type — editable',
        actual: '{name} — actual quantity',
        actualHint: 'Per recipe {qty} {uom}',
        note: 'Note',
        save: 'Finish the run and open the batch',
    },

    cancel: {
        title: 'Cancel production order',
        body: '{id} · {name} will be cancelled. The record stays in the log.',
        releases: 'Reserved components become available again',
        confirm: 'Cancel the order',
    },

    toast: {
        created: 'Production order opened',
        createdBody: '{id} · {name}',
        issued: 'Order issued to production',
        completed: 'Run completed',
        completedBody: 'Batch {batch} opened · {qty} {uom}',
        cancelled: 'Production order cancelled',
    },

    log: {
        create: 'Production order opened',
        issue: 'Production order issued',
        complete: 'Production order completed',
        cancel: 'Production order cancelled',
    },
};
