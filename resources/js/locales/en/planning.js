// V3 — inventory planning and purchasing. The report that replaces the external
// workbook. The column names are the ones the client's note of 14.09.26 lists.
export default {
    lede: 'The report that replaces the external workbook: pick a period and the item groups, and see for every item what is in stock, what is on order and from whom, what was really consumed, how many months that covers — and type in how much to bring in.',

    window: {
        from: 'From month',
        to: 'To month',
        groups: 'Item groups',
        groupsAll:
            'No group picked — the report shows every stock-managed item',
        groupsPicked: '{n} groups picked',
    },

    kpi: {
        critical: 'Critical',
        criticalSub: 'Under a third of the alert threshold',
        low: 'Below threshold',
        lowSub: 'Under {n} months of stock',
        planned: 'Planned',
        plannedSub: 'Items with a quantity typed in',
        noDemand: 'No demand',
        noDemandSub: 'Nothing consumed in the chosen period',
    },

    col: {
        sku: 'Item code',
        name: 'Item name',
        foreign: 'Foreign / Chinese name',
        group: 'Item group',
        onHand: 'In stock',
        committed: 'Committed',
        onOrder: 'On order / in production',
        total: 'Consumption in period',
        monthly: 'Average per month',
        cover: 'Months of stock',
        plan: 'Stock plan',
        feeds: 'Shared by',
        planPurchase: 'To purchase',
        planProduction: 'To production',
        plannedCover: 'Months of stock after the plan',
        direct: 'Direct sales only',
        supplier: 'Supplier',
        price: 'Purchase price',
        remarks: 'Item-card remarks',
    },

    afterPlan: 'After the plan: {cover}',
    noDemandShort: 'no demand',
    months: '{n} months',
    noSupplier: 'No supplier',
    search: 'Code · name · foreign name · supplier',
    export: 'Export to Excel',
    exported: '{n} rows exported to {file}',
    toRequest: 'Move to a purchase request',
    priceTip: 'Last purchase price: {price} · on {on}',
    foot: 'Computed over {months} months, from {from} to {to}. Consumption excludes stock counts, warehouse transfers and general goods issues — and includes production orders and sales, exactly as the pharmacy’s own SAP query defines it.',

    toProduction: 'Open production orders',

    request: {
        title: 'Move to purchase requests',
        lede: 'Everything planned for purchase, gathered under the supplier who would fill it \u2014 one request per supplier. A request is not an order: it goes out and waits for the supplier to agree, and only then becomes a purchase order.',
        none: 'Nothing has been planned for purchase yet.',
        noSupplier: 'Items with no regular supplier',
        pickSupplier: 'Choose a supplier\u2026',
        pickSupplierLabel: 'Which supplier to send to',
        pickSupplierHint:
            'These items name no supplier on their card. Choose one so the request has somewhere to go.',
        needSupplier: 'A ticked group still has no supplier',
        lineCount: 'one line | {n} lines',
        hasRemark: 'Has a remark',
        note: 'Note on the request',
        noteHint:
            'It goes into the body of the email. Standing remarks per supplier and per item are not defined yet \u2014 see question 3 in the open-questions document.',
        raise: 'Raise the requests',
        raisedToast:
            'One purchase request raised | {n} purchase requests raised',
        tabLede:
            'Purchase requests raised from the planning report. A request waits for the supplier to agree, and becomes a purchase order when they do.',
        emptyTitle: 'No purchase requests',
        emptySub:
            'Requests are raised from the planning report, after quantities are typed into the planning column.',
        one: 'Purchase request',
        lines: 'Request lines',
        raisedOn: 'Raised',
        sentOn: 'Sent to the supplier',
        by: 'Raised by',
        order: 'Purchase order',
        mailTitle: 'The letter to the supplier',
        mailHint:
            'Ready to copy or export. The console does not send it \u2014 you send it from your own mailbox and then mark it sent here.',
        copy: 'Copy the text',
        copied: 'Text copied',
        copyFailed: 'Copying failed \u2014 select and copy by hand',
        export: 'Export the lines',
        exported: 'One row exported | {n} rows exported',
        markSent: 'Mark as sent',
        markedSent: 'The request was marked sent',
        toOrder: 'The supplier agreed \u2014 raise the order',
        toOrderTitle: 'Turn the request into a purchase order',
        toOrderBody:
            '{n} lines move onto a new purchase order, and from that moment the quantity counts as stock on its way.',
        ordered: 'Purchase order {id} raised',
        cancel: 'Withdraw the request',
        cancelTitle: 'Withdraw the purchase request',
        cancelBody:
            'The lines go back to being a plan in the report, and can be sent again.',
        cancelled: 'The request was withdrawn',
        mail: {
            greeting: 'Hello {name},',
            greetingPlain: 'Hello,',
            intro: 'We would be glad to have a quote and a delivery confirmation for the following (purchase request no. {number}):',
            sign: 'Thank you,\nTrifolium Pharmacy',
        },
        col: {
            number: 'Request no.',
            supplier: 'Supplier',
            state: 'State',
            lines: 'Lines',
            value: 'Estimated value',
            raised: 'Raised',
            sku: 'Item code',
            item: 'Item',
            qty: 'Quantity',
            unit: 'Unit',
            price: 'Last price',
            remark: 'Item remark',
        },
    },

    produce: {
        title: 'Open production orders from the report',
        lede: 'Everything planned for production, as a recommendation to accept or leave. A line that cannot be made says so first, and names what is short.',
        none: 'Nothing has been planned for production yet.',
        noRecipe: 'No recipe',
        unitMismatch:
            "The recipe's unit cannot be reconciled with the stock unit",
        canMake: 'Can be made',
        short: '{n} components short',
        missing: 'short',
        open: 'Open the orders',
        openedToast:
            'One production order opened | {n} production orders opened',
    },

    denominator: {
        button: 'Shared components',
        lede: 'The column names, for each row, which of the listed products are made from it — straight off the recipes. A component two products share gets one row, and both products are written against it. Nothing here is stored: it is worked out on whatever is filtered right now.',
        pulled: 'Component of a listed product',
        perRun: '{qty} {unit} per {batch} {batchUnit}',
        more: 'and one more product | and {n} more products',
        need: 'per the plan',
        col: 'Shared by',
    },

    empty: {
        title: 'Nothing to show',
        sub: 'Change the period, the groups or the filter.',
    },

    drawer: {
        openItem: 'Open the item card',
        available: 'Available to plan',
        coverValue: '{n} months',
        byMonth: 'Consumption month by month',
        byMonthHint:
            'The dark bar is all consumption; the amber part inside it is what was sold directly as raw material rather than going into a production run.',
        coming: 'What is on its way',
        inHouse: 'Made in house',
        nothingComing:
            'No open purchase order and no open production order for this item.',
        canMake: 'Can it be made',
        noRecipe:
            'The item has no bill of materials, so no production order can be opened for it.',
        canMakeOk: '{qty} {unit} can be made — every component is in stock.',
        canMakeShort: 'Cannot be made: {n} components are short.',
        levels: 'Stock levels',
        overMin: 'Above the minimum',
        leadTime: 'Lead time',
        days: '{n} days',
        levelsHint:
            'The minimum, the maximum and the lead time come from the SAP item card. Note that the lead time is set to 30 days on almost every item, so it is not a figure to plan against.',
        col: {
            kind: 'Kind',
            doc: 'Document',
            party: 'From',
            qty: 'Quantity',
            due: 'Due',
            component: 'Component',
            need: 'Needed',
            have: 'Available',
            gap: 'Short',
        },
    },

    filterGroup: {
        state: 'Stock state',
        what: 'What',
        who: 'Supplier',
        size: 'Quantities',
    },

    filter: {
        noun: 'items',
        count: 'items · of {total}',
        field: {
            kcover: 'Months of stock',
            kplan: 'Plan state',
            kgroup: 'Item group',
            ksup: 'Supplier',
            kmonths: 'Months of stock',
            kmonthly: 'Consumption per month',
            konhand: 'In stock',
        },
    },

    coverState: {
        critical: 'Critical',
        low: 'Below threshold',
        ok: 'Fine',
        noDemand: 'No demand',
    },

    lineState: {
        none: 'Not planned',
        planned: 'Planned',
        requested: 'On a purchase request',
        ordered: 'Ordered',
        cancelled: 'Cancelled',
    },

    requestState: {
        draft: 'Draft',
        sent: 'Sent to the supplier',
        ordered: 'Became an order',
        cancelled: 'Cancelled',
    },

    target: {
        purchase: 'Purchase',
        production: 'Production',
    },
};
