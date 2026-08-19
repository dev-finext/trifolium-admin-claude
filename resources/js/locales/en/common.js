// English shared vocabulary — mirrors he/common.js key for key.
export default {
    app: {
        title: 'Trifolium · Admin console',
        // The browser-tab title: "Admin | Orders" — the screen is named, not
        // the product.
        titlePrefix: 'Admin',
        subtitle:
            'Back-office console for the pharmacy — orders, lab, deliveries, customers, finance and stock',
    },

    actions: {
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add',
        export: 'Export',
        print: 'Print',
        send: 'Send',
        refresh: 'Refresh',
        search: 'Search',
        filter: 'Filter',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        approve: 'Approve',
        reject: 'Reject',
        confirm: 'Confirm',
        copy: 'Copy',
        download: 'Download',
        view: 'View',
        archive: 'Archive',
        restore: 'Restore',
        retry: 'Try again',
        clear: 'Clear',
    },

    labels: {
        status: 'Status',
        date: 'Date',
        dates: 'Dates',
        customer: 'Customer',
        practitioner: 'Practitioner',
        order: 'Order',
        orders: 'Orders',
        amount: 'Amount',
        total: 'Total',
        quantity: 'Quantity',
        notes: 'Notes',
        reason: 'Reason',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        createdAt: 'Created',
        updatedAt: 'Updated',
        updatedBy: 'Updated by',
        actor: 'Performed by',
        none: 'None',
        all: 'All',
        yes: 'Yes',
        no: 'No',
        required: 'Required',
        optional: 'Optional',
        inDevelopment: 'In development',
    },

    // Renders the parts that lib/dates.js durationParts() returns: `unit` picks
    // the key, `a` and `b` fill it. Never build a duration string by hand.
    duration: {
        sub_minute: 'less than a minute',
        minutes: '{a} minutes',
        hours: '{a} hours',
        hours_minutes: '{a} hours and {b} minutes',
        days: '{a} days',
        days_hours: '{a} days and {b} hours',
    },

    relative: {
        today: 'Today',
        yesterday: 'Yesterday',
        daysAgo: '{n} days ago',
        inDays: 'in {n} days',
    },

    // The four states any data-backed area can be in. `hint` always tells the
    // agent what to do next; no invented error detail, no fake latency figures.
    states: {
        loading: {
            title: 'Loading data…',
            hint: 'Fetching the records from the system.',
        },
        empty: {
            title: 'Nothing to show',
            hint: 'Try widening the date range or clearing the filters.',
        },
        error: {
            title: 'We could not load the data',
            hint: 'Try again. If it keeps failing, contact support.',
        },
        denied: {
            title: 'You do not have permission to view this screen',
            hint: 'Ask a system administrator to grant you access.',
        },
    },

    notFound: {
        crumb: 'Error',
        title: 'That address does not exist',
        hint: 'The link may have changed, or the screen was removed. You can go back to the order list and carry on from there.',
        home: 'Back to orders',
    },

    locale: {
        switchTo: 'Switch to {lang}',
        hebrew: 'עברית',
        english: 'English',
    },

    demo: {
        banner: 'Demo',
        note: 'The records on screen are demo data. Actions change state in the browser only — no request is sent to a server.',
        pinnedClock:
            'The clock is pinned to {date}, so the data looks identical on every load.',
    },

    dataSource: {
        demo: 'Demo data',
        api: 'API',
    },
};
