// Production orders — the screen and the cards that read it.
export default {
    title: 'Production orders',
    sub: '{open} open · {completed} completed this month',
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

    action: {
        create: 'New production order',
        issue: 'Issue to production',
        complete: 'Complete the run',
        cancel: 'Cancel the order',
        print: 'Print',
    },

    log: {
        create: 'Production order opened',
        issue: 'Production order issued',
        complete: 'Production order completed',
        cancel: 'Production order cancelled',
    },
};
