// Wallet & loyalty points — one point is one shekel, and the ledger is the only
// source of truth for a balance.
export default {
    title: 'Wallet & loyalty points',
    sub: '1 point = ₪1 · the points ledger in the database is the only source of truth',

    noun: {
        practitioners: 'practitioners',
        movements: 'movements · of {total}',
    },

    kpi: {
        total: 'Points outstanding',
        totalSub: 'A liability of {value} · click to show all',
        withBalance: 'Practitioners with a balance',
        withBalanceSub: 'of {n} · click to filter',
        withoutBalance: 'No points balance',
        withoutBalanceSub: 'Never earned, or redeemed everything',
        withDebt: 'Practitioners with open debt',
        withDebtSub: '{amount} · managed on the finance screen',
        earned: 'Total earned in the ledger',
        earnedSub: '{n} practitioners have earned · click to filter',
        redeemed: 'Total redeemed in the ledger',
        redeemedSub: '{n} practitioners have redeemed · worth {value}',
    },

    filter: {
        search: 'Practitioner name · customer no. · phone',
        balanceAll: 'Balance — all',
        withPoints: 'With a points balance',
        withoutPoints: 'Without a points balance',
        withDebt: 'With open debt',
        withEarned: 'With earning movements',
        withRedeemed: 'With redemption movements',
        kindAll: 'Kind — all',
        searchLedger: 'Order · date · reason',
    },

    list: {
        title: 'Balances by practitioner',
        points: 'Points',
        value: 'Value',
        debt: 'Open debt',
        emptyTitle: 'No practitioners found',
        emptySub: 'Clear the search or the filter',
    },

    // Points movement kinds — the ids the ledger rows carry.
    kind: {
        earn: 'Earned',
        spend: 'Redeemed',
    },

    ledger: {
        title: 'Points ledger · {name}',
        balance: 'Balance',
        kind: 'Kind',
        points: 'Points',
        running: 'Running balance',
        manual: 'Manual adjustment',
        readOnly: 'Read only',
        emptyFilterTitle: 'No movements match the filter',
        emptyFilterSub: 'Clear the filter',
        noMovesTitle: 'No movements in the ledger',
        noMovesSub: 'Earnings and redemptions will appear here',
    },

    adjust: {
        action: 'Manual adjustment',
        title: 'Manual points adjustment',
        note: '1 point = ₪1. The adjustment is written as a ledger row with a reason and an author — the ledger is the source of truth for the balance, and the card moves only together with it.',
        amountLabel: 'Points — positive to credit, negative to debit',
        amountPlaceholder: '+50 / -25',
        invalid:
            'Enter a non-zero whole number — positive to credit, negative to debit',
        after: 'Balance after the adjustment: {points} points ({value})',
        reasonLabel: 'Reason for the adjustment — required, written to the log',
        continue: 'Continue to confirmation',
        confirmTitle: 'Confirm points adjustment',
        confirmBody:
            '{verb} of {points} points for {name} ({code}). The balance moves from {from} to {to}.',
        credit: 'Credit',
        debit: 'Debit',
        confirmAction: 'Apply adjustment',
        effect1: 'A manual adjustment row is added to the points ledger',
        effect2: "The card's balance updates together with the ledger",
        effect3:
            'The action is written to the system log with the reason and the author',
    },

    check: {
        action: 'Ledger integrity check',
        title: 'Points ledger integrity check',
        body: 'Recomputes every balance from the earning and redemption movements in the ledger, and reports every gap.',
        confirm: 'Run check',
        effect1: '{n} balances are recomputed from the ledger',
        effect2:
            'A gap between a stated balance and its movements is flagged as an exception',
        effect3:
            'Nothing is corrected automatically — every fix requires a documented manual adjustment',
    },

    toast: {
        adjusted: 'Adjustment applied',
        adjustedBody: '{delta} points · new balance {balance}',
        gapsFound: 'Ledger gaps found',
        gapsBody: '{n} cards do not agree with the ledger: {names}',
        noGaps: 'Check passed',
        noGapsBody: 'All {n} balances agree with the ledger',
    },
};
