// English mirror of he/shell.js — same keys, real translations.
export default {
    // The V2 review markers — demo only. `badge` is the literal on the red pill.
    // The demo switch that refuses every write, to show the failure state
    v2: {
        badge: 'V2',
        tip: 'New in version 2 — click for the explanation in “Spec progress”',
        tipPlain: 'New in version 2',
        show: 'Show V2 markers',
        hide: 'Hide V2 markers',
        on: 'shown',
        off: 'hidden',
    },

    landmark: {
        nav: 'Main navigation',
        main: 'Screen content',
        top: 'Top bar',
    },

    search: {
        label: 'Global search',
        placeholder:
            'Search: order number · practitioner · customer · phone · tracking number',
        orders: 'Orders',
        practitioners: 'Practitioners',
        empty: 'No results for “{term}”',
        hint: 'Up and down arrows to choose · Enter to open · Esc to close',
    },

    notifications: {
        label: 'Open exceptions: {n}',
        title: 'Open exceptions',
        empty: 'No open exceptions right now',
    },

    // Shown in place of the console when a render error tears the tree down.
    // Deliberately plain: whatever broke, this text still has to render.
    crash: {
        title: 'This screen hit an error',
        body: 'Your last action may not have been saved. Reload the page and check the record you were working on before carrying on.',
        reload: 'Reload the page',
    },

    exception: {
        services_down: {
            title: '{n} external services are down',
        },
        doc_failed: {
            title: '{n} invoices were not issued',
            sub: 'The payment cleared — a re-issue is required',
        },
        credit_overdue: {
            title: '{n} practitioners owe on credit terms for over {days} days',
        },
        link_expiring: {
            title: '{n} payment links expire within {hours} hours',
            sub: 'On expiry the order is cancelled and its stock is released',
        },
        low_stock: {
            title: '{n} items are below their minimum',
        },
        expiring_batches: {
            title: '{n} batches are approaching expiry',
            sub: 'Less than {days} days to expiry',
        },
        missing_address: {
            title: '{n} orders have no delivery address',
            sub: 'The customer has not filled the address in yet',
        },
        msg_failed: {
            title: '{n} WhatsApp messages failed',
            sub: 'Open the message log',
        },
        pending_users: {
            title: '{n} new registrations await approval',
            sub: 'Oldest of them: {oldest}',
        },
        pay_stale: {
            title: '{n} orders have awaited payment for over {days} days',
            sub: 'An automatic reminder was sent',
        },
    },

    count: {
        orders: '{n} orders with an open exception',
        users: '{n} registrations awaiting approval',
        finance: '{overdue} debts over {days} days · {docs} failed documents',
        deliveries: '{n} deliveries awaiting handling',
        messaging: '{n} failed messages',
        inventory: '{n} items below their minimum',
        integrations: '{n} external services are down',
    },

    me: {
        role: 'Pharmacy team',
    },
};
