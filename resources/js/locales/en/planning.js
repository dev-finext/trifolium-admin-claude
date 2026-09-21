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
    noSupplier: 'No supplier',
    search: 'Code · name · foreign name · supplier',
    export: 'Export to Excel',
    exported: '{n} rows exported to {file}',
    toRequest: 'Move to a purchase request',
    priceTip: 'Last purchase price: {price} · on {on}',
    foot: 'Computed over {months} months, from {from} to {to}. Consumption excludes stock counts, warehouse transfers and general goods issues — and includes production orders and sales, exactly as the pharmacy’s own SAP query defines it.',

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
        lastYear:
            'The same period last year consumed {then} against {now} today — a change of {pct}%.',
        coming: 'What is on its way',
        inHouse: 'Made in house',
        nothingComing:
            'No open purchase order and no open production order for this item.',
        suppliers: 'Suppliers who actually supplied',
        suppliersHint:
            'From the supplier delivery notes — including suppliers other than the preferred one on the item card.',
        preferred: 'Preferred supplier',
        noSuppliers: 'This item has never been received from any supplier.',
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
            supplier: 'Supplier',
            taken: 'Total received',
            times: 'Times',
            priceRange: 'Price range',
            lastOn: 'Last received',
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
