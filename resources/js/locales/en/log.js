// The system log. English mirror of he/log.js. Action names live in enums under
// logAction.<id>, not here.
export default {
    title: 'System log',
    sub: '{n} entries · every action by an agent, by the system and by an external interface',

    readOnly: {
        title: 'The log is read-only.',
        body: 'Entries cannot be edited or deleted — a correction is always recorded as a new entry.',
    },

    inRange: 'One entry in range | {n} entries in range',

    filter: {
        search: 'Free text: entity · value · IP · who acted',
        searchLabel: 'Search the log',
        actor: 'Who acted',
        actorAll: 'Who acted — all',
        actorType: 'Kind of actor',
        actorTypeAll: 'Kind of actor — all',
        action: 'Action',
        actionAll: 'Action — all',
        entity: 'Entity',
        entityAll: 'Entity — all',
        source: 'How it reached the system',
        sourceAll: 'Source — all',
        label: 'entries',
    },

    table: {
        when: 'Date & time',
        actor: 'Who acted',
        action: 'Action',
        entity: 'Entity',
        change: 'Before → after',
        source: 'Source',
        ip: 'IP address',
    },

    entity: {
        order: 'Order',
        document: 'Document',
        order_item: 'Order item',
        practitioner: 'Practitioner',
        message: 'Message',
        message_template: 'Message template',
        batch: 'Batch',
        admin_user: 'Admin user',
        system: 'System',
        catalog_item: 'Catalogue item',
        product: 'Product',
        product_label: 'Product label',
        purchase_order: 'Purchase order',
        customer: 'Customer',
        supplier: 'Supplier',
    },

    loadMore: 'Load {n} more entries',
    shownOf: 'Showing {shown} of {total}',

    export: {
        action: 'Export CSV',
        done: 'The file was downloaded',
        doneBody: 'One row · {file} | {n} rows · {file}',
        empty: 'Nothing to export',
        emptyBody: 'Widen the date range or clear the filter.',
    },

    empty: {
        title: 'No entry matches the filter',
        sub: 'Widen the date range or clear the filter',
    },
};
