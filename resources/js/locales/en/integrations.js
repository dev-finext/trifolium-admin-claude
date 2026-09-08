// Integrations & external systems — the service health board and the
// connections behind it. English mirror of he/integrations.js, key for key.
export default {
    title: 'Integrations & external systems',
    sub: '{systems} external systems · {endpoints} monitored endpoints',

    tab: {
        services: 'Service health',
        connections: 'Connections & settings',
    },

    state: {
        ok: 'Healthy',
        slow: 'Slow',
        down: 'Down',
    },

    banner: {
        down: 'One service is down | {n} services are down',
        downBody:
            'Anything that depends on the service will fail until the provider answers again. The platform itself keeps working.',
        slow: 'One service is slow | {n} services are slow',
        slowBody:
            'Nothing is down, but the response times recorded on the last check are outside the normal range.',
        ok: 'All {n} endpoints answered on the last recorded check.',
    },

    checkAll: {
        label: 'Check all',
        title: 'Check every system',
        confirm: 'Check all',
        body: '{n} endpoints will be checked now, without waiting for the automatic cycle.',
        effectEach: 'Each service is checked on its own and gets its own state',
        effectFigures:
            'Response time and check time update on every row once the server answers',
        effectDown:
            'A disabled service stays disabled until the provider answers again',
        done: 'Request sent',
        doneBody: '{n} endpoints · the readings update once the server answers',
        failed: 'The request was not sent',
        failedBody: 'Try again; if it repeats, check the server connection.',
    },

    serverSide:
        'Checks run server-side. This screen shows the last reading that was stored and does not refresh itself — "Check all" asks the server to check now, and the rows update once it has an answer.',

    summary: {
        systems: 'External systems',
        systemsSub: '{n} monitored endpoints',
        ok: 'Answered',
        slow: 'Slow',
        down: 'Down',
        ofTotal: 'of {n}',
        filterHint: 'Clicking a counter filters the board',
    },

    filter: {
        search: 'Service · system · endpoint',
        searchLabel: 'Search endpoints',
        system: 'System',
        systemAll: 'System — all',
        state: 'State',
        stateAll: 'State — all',
        label: 'endpoints',
    },

    table: {
        service: 'Service',
        state: 'State',
        latency: 'Recorded response time',
        lastCheck: 'Last check',
        uptime: 'Uptime',
    },

    row: {
        noResponse: 'No response',
        downFor: 'Down for {duration}',
        endpoints: 'One service | {n} services',
        noReading: 'No check recorded',
    },

    empty: {
        title: 'No endpoint matches the filter',
        sub: 'Clear the filter or widen the search',
    },

    impact: {
        title: 'What happens when a provider is unavailable',
        pay: 'Card processing down',
        payBody:
            'No new payment links can be sent. Orders on credit terms are unaffected — they do not depend on card processing.',
        doc: 'Invoice provider down',
        docBody:
            'The payment still clears, the document is queued and issues automatically once the provider answers. A persistent failure is flagged as an exception on the finance screen.',
        msg: 'WhatsApp down',
        msgBody:
            'Messages stay queued and are re-sent. A link can also be copied and sent by hand.',
        courier: 'Couriers',
        courierBody:
            'No integration — tracking numbers are entered by hand, so nothing depends on the provider being up.',
        backup: 'A failed backup',
        backupBody:
            'A critical exception: this database has been the single source of truth since the ERP was retired.',
    },

    connections: {
        note: 'There is no two-way sync with an external system: the platform exports data nowhere and pulls no stock, customer cards or statuses. Every connection here is a one-way service the platform calls while someone is working.',
        connected: 'Connected',
        monitored: 'One monitored endpoint | {n} monitored endpoints',

        name: {
            courier: 'Courier companies',
            backup: 'Backups',
        },

        what: {
            doc: 'Issues tax invoices/receipts and allocation numbers',
            pay: 'Card processing and payment links',
            msg: 'WhatsApp · SMS · email',
            courier: 'Delivery and tracking numbers',
            backup: 'Protects the one database',
        },

        field: {
            baseUrl: 'Base URL',
            env: 'Environment',
            apiKey: 'API key',
            issueMode: 'Issue mode',
            retries: 'Retries',
            docTypes: 'Document types',
            linkLife: 'Payment link validity',
            onExpiry: 'On expiry',
            collectionLink: 'Consolidated collection link',
            channels: 'Channels',
            templates: 'Templates',
            templateApproval: 'Approving a new template',
            quietHours: 'Quiet hours',
            couriers: 'Configured couriers',
            courierApi: 'API integration',
            courierCodes: 'Courier codes',
            restore: 'Restore rehearsal',
            sourceOfTruth: 'Note',
        },

        env: {
            production: 'Production',
            staging: 'Staging',
        },

        value: {
            autoIssue: 'Automatic the moment payment lands — no admin touch',
            retries: '{n} attempts · {gap} minutes apart',
            linkLife: '{days} days · reminder on day {reminder}',
            onExpiry:
                'The order is cancelled automatically and the stock allocated to it is released',
            allOrNothing: 'Closed amount · all or nothing',
            partialAllowed: 'Part of the balance may be paid',
            templates: '{n} approved templates',
            approvalDays: '{from}–{to} business days with the provider',
            quietHours: 'No automated message goes out between {from} and {to}',
            noCourierApi: 'None — tracking numbers are entered by hand',
            courierCodes: '{codes} — configured here in the platform',
            retention: '{schedule} · kept {days} days',
            restoreTested: 'Rehearsed every {months} months',
            singleSource:
                'This is the single source of truth — a failed backup is a critical incident',
        },
    },
};
