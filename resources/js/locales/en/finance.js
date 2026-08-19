// Finance — balances, collection, transactions and tax documents.
//
// Enum labels are not repeated here: a document state reads from `docState.*`,
// a document kind from `docType.*`, an aging bucket from `agingBucket.*`, a
// payment method from `paymentMethod.*` and a recipient from `payer.*`.
export default {
    title: 'Finance — balances, collection and documents',
    sub: "The system's book of account · {n} practitioners on credit terms · tax documents issued automatically by {provider}",

    tab: {
        overview: 'Overview & debt aging',
        balances: 'Balances & collection',
        payments: 'Transactions',
        docs: 'Tax documents',
    },

    action: {
        exportLedger: 'Export transactions',
        exportDocs: 'Export for the accountant',
        exportStatement: 'Export statement',
        createLink: 'Create payment link',
        recordPayment: 'Record payment',
        statement: 'Statement',
    },

    noun: {
        practitioners: 'practitioners',
        transactions: 'transactions',
        documents: 'documents',
        openCreditOrders: 'open credit orders',
    },

    kpi: {
        openDebt: 'Open debt',
        openDebtSub: '{n} practitioners · click to filter the list',
        creditTrack: 'Approved for credit terms',
        creditTrackSub: 'of {n} practitioners · click to filter',
        collected: 'Collected in {days} days',
        collectedSub: 'Click to filter the payment transactions',
        failedDocs: 'Failed documents',
        failedDocsFix: 'Click to re-issue',
        failedDocsNone: 'All documents were issued',
    },

    overview: {
        aging: 'Debt aging',
        agingHint: 'Clicking a range filters the balances list',
        how: 'How money moves through the system',
        noDebtTitle: 'No open debt',
        noDebtSub: 'Every balance has been collected — nothing to age',
    },

    aging: {
        range: 'Range',
        practitioners: 'Practitioners',
        share: 'Share of debt',
    },

    how: {
        immediate: 'Immediate payment',
        immediateValue:
            'The practitioner pays when ordering; an end customer receives a payment link valid for {days} days',
        expired: 'Expired link',
        expiredValue:
            'The order is cancelled automatically and its allocated stock is released',
        reminder: 'Payment reminder',
        reminderValue:
            'An automatic reminder reaches the customer on day {day} of the link',
        credit: 'Credit terms',
        creditValue:
            "Approved on the practitioner's card only — the order reaches the lab unpaid and the amount accrues as debt",
        collection: 'Collection',
        collectionValue:
            'One link for the whole open balance, copied by hand and sent outside the system · {mode}',
        partialAllowed: 'partial payment allowed',
        allOrNothing: 'all or nothing',
        docs: 'Tax documents',
        docsValue:
            '{provider} issues a tax invoice/receipt the moment money arrives and returns the document and allocation numbers · {retries} retries, {gap} minutes apart',
        vat: 'VAT',
        vatValue: '{rate} — set in system settings and applied to every price',
        ceiling: 'Debt ceiling',
        ceilingValue:
            'None. The system warns above {amount} or {days} days, and never blocks',
        rounding: 'Price rounding',
    },

    // How the gross price is rounded — SETTINGS.priceRounding ids.
    rounding: {
        ceil_shekel: 'Rounded up to a whole shekel',
        nearest_shekel: 'Rounded to the nearest shekel',
        none: 'No rounding',
    },

    filter: {
        searchPractitioner: 'Practitioner name · customer no. · phone',
        searchTxn: 'Order · document · description',
        searchDoc: 'Document no. · allocation · recipient · order',
        searchOrder: 'Order no. · customer · practitioner',
        trackAll: 'Track — all',
        bucketAll: 'Debt age — all',
        kindAll: 'Kind — all',
        practitionerAll: 'Practitioner — all',
        windowAll: 'Window — all',
        windowDays: 'Last {days} days',
        stateAll: 'State — all',
        recipientAll: 'Recipient — all',
        statusAll: 'Status — all',
    },

    track: {
        credit: 'Credit terms',
        creditLong: 'Approved for credit terms',
        immediate: 'Immediate payment',
        revoked: 'Credit revoked',
    },

    // Collection-link lifecycle — config/finance.js LINK_STATES ids.
    linkState: {
        none: 'Not created',
        sent: 'Sent',
        paid: 'Paid',
        expired: 'Expired',
    },

    balances: {
        kpiAll: 'All balances',
        kpiCredit: 'On credit terms',
        kpiCreditSub: 'Still ordering without payment',
        kpiOldest: 'Debt aged {range}',
        kpiRevoked: 'Credit revoked',
        kpiRevokedSub: 'Open debt with no credit track',
        title: 'Open balances',
        hint: 'The link always covers the whole balance — never a single order',
        track: 'Track',
        balance: 'Balance',
        openOrders: 'Open orders',
        debtAge: 'Debt age',
        lastLink: 'Last link',
        days: '{n} days',
        linkMeta: 'Created {when} · expires in {days} days',
        emptyTitle: 'No balances match the filter',
        emptySub: 'Clear the filter or try another range',
    },

    openCredit: {
        title: 'Credit orders not yet collected',
        age: 'Age',
        flags: 'Exceptions',
        emptyTitle: 'No open credit orders',
        emptySub: 'Every credit order has been collected',
    },

    payments: {
        kpiAll: 'All transactions',
        kpiAllSub: 'Charges and payments',
        kpiWindow: 'Last {days} days',
        kpiWindowSub: 'Click to limit the window',
        emptyTitle: 'No transactions match the filter',
        emptySub: 'Clear the filter',
    },

    txn: {
        kind: 'Kind',
        note: 'Description',
        document: 'Document',
        runningBalance: 'Running balance',
    },

    // Ledger movement kinds — the ids the transaction rows carry.
    txnKind: {
        charge: 'Charge',
        payment: 'Payment',
        credit: 'Credit',
    },

    statement: {
        title: 'Statement · {name}',
        balanceChip: 'Balance',
        customerNo: 'Customer no.',
        totalCharges: 'Total charges',
        totalPayments: 'Total payments',
        movements: 'Account movements',
        emptyTitle: 'No movements on this account',
        emptySub: 'Charges and payments will appear here',
    },

    credit: {
        title: 'Credit terms',
        track: 'Track',
        since: 'Approved since',
        by: 'Approved by',
        revoked: 'Revoked on',
        limit: 'Credit limit',
        limitValue: 'None — the system warns and never blocks',
        warn: 'Warning threshold',
        warnValue: 'Above {amount} or {days} days',
        scope: 'Scope',
        scopeValue: "On the practitioner's card only — never for end customers",
        warnNote:
            'The debt has been open {days} days and stands at {amount} — past the warning threshold. The system warns only and never blocks orders.',
        approveTitle: 'Approve credit terms',
        approveBody:
            '{name} will be able to order without payment; the amount accrues as debt on the card until collected.',
        approveConfirm: 'Approve credit terms',
        approveEffect1: 'New orders will reach the lab unpaid',
        approveEffect2: "The amount accrues as debt on the practitioner's card",
        approveEffect3:
            'The system will warn above {amount} or {days} days — and never block',
        revokeTitle: 'Revoke credit terms',
        revokeBody:
            "{name}'s credit terms will be revoked. An open balance of {amount} remains to collect.",
        revokeConfirm: 'Revoke credit terms',
        revokeEffect1: 'New orders will require immediate payment',
        revokeEffect2:
            'The open balance remains — collection is one link for all of it',
        revokeEffect3: 'The track can be approved again at any time',
        effectLogged: 'The action is written to the system log',
    },

    link: {
        title: 'Create payment link · {name}',
        amount: 'Link amount',
        amountSub: 'The whole open balance — all or nothing',
        orders: 'Orders in the link',
        ordersSub: 'Every order awaiting payment',
        ordersNone: 'Historical balance on the card — no open orders',
        validity: 'Link validity',
        validityDays: '{days} days',
        validitySub: 'After that a new link must be created',
        toCopy: 'The link to copy',
        fieldLabel: 'Payment link',
        noLink: 'No collection link exists yet for this balance.',
        manualNote:
            'The system never sends the link itself — copy it here and send it by hand (WhatsApp, email, phone). The link is valid for {days} days and covers every open order · {mode}.',
        noPartial: 'partial payment is not supported',
        covers: 'The orders the link covers',
        content: 'Contents',
        debtAge: 'Debt age',
        shelf: 'Shelf products',
        formula: 'Formula',
        legacyOnly:
            'No open orders — the balance stems from historical debt on the card.',
        ordersTotal: 'Orders total:',
        legacyTotal: 'Historical balance:',
        linkTotal: 'Link total:',
        docNote:
            'On payment one {doc} is issued for every order in the link, automatically via {provider}, and emailed to the customer.',
        copyAction: 'Copy link',
        copiedLong: 'Copied — ready to paste',
        copiedShort: 'Copied',
        copied: 'Link copied',
        copiedBody: '{name} · {amount} · send it by hand outside the system',
        copyFailed: 'Could not copy automatically',
        copyFailedBody:
            'The link is selected in the field — copy it with Ctrl+C and send by hand',
    },

    pay: {
        title: 'Record manual payment · {name}',
        allOrNothing:
            'Collection covers the whole open balance — all or nothing. Partial payment is not supported.',
        balance: 'Open balance',
        covers: 'Covers',
        coversValue: '{n} open orders',
        net: 'Before VAT',
        vat: 'VAT ({rate})',
        gross: 'Total to pay',
        method: 'Payment method',
        confirm: 'Record payment',
        effect1: 'One {doc} is issued for every order collected',
        effect2:
            'The document is issued automatically via {provider} and emailed to the recipient',
        effect3: '{n} orders are marked paid and the balance drops to zero',
        effect4: 'The action is written to the system log',
    },

    docs: {
        failedTitle:
            'One document was not issued | {n} documents were not issued',
        failedBody:
            'The payment cleared but {provider} returned an error. Re-issue from here only — the provider tried {retries} times, {gap} minutes apart, and the console never retries behind your back.',
        allIssued: 'All documents were issued successfully.',
        kpiAll: 'All documents',
        kpiAllSub: 'Tax invoice/receipts',
        kpiFailedSub: 'Re-issue required',
        toCustomer: 'To end customers',
        toCustomerSub: 'Paid via a payment link',
        toPractitioner: 'To practitioners',
        toPractitionerSub: 'Including consolidated documents',
        number: 'Document no.',
        type: 'Kind',
        alloc: 'Allocation no.',
        to: 'Recipient',
        issuedAt: 'Issued',
        state: 'State',
        noNumber: '— not issued',
        emptyTitle: 'No documents match the filter',
        emptySub: 'Clear the filter',
        reissueTitle: 'Re-issue document',
        reissueConfirm: 'Re-issue',
        reissueBody:
            'A new request will be sent to {provider} for order {order} over {amount}.',
        reissueEffect1: 'A new {type} is issued by the provider',
        reissueEffect2:
            'The document and allocation numbers are stored on the order once the provider answers',
        reissueEffect3: 'The document is emailed to the recipient',
        reissueEffect4:
            'If issuing fails again — the provider retries {retries} times, {gap} minutes apart, before raising a new exception',
    },

    toast: {
        exported: 'Export ready',
        exportedLedger: 'Downloaded a CSV with {n} transactions',
        exportedDocs: 'Downloaded a CSV with {n} documents',
        exportedStatement: 'Downloaded a CSV with {n} statement rows',
        paymentRecorded: 'Payment recorded',
        paymentRecordedBody: '{name} · {amount} · {n} orders settled',
        reissued: 'Re-issue request sent',
        reissuedBody: '{order} · {provider}',
        creditApproved: 'Credit terms approved',
        creditRevoked: 'Credit terms revoked',
    },
};
