// English mirror of he/crm.js — the activities log on a card (V2).
export default {
    title: 'Activities',
    sub: '{n} activities',
    add: 'New activity',
    empty: 'No activities recorded',
    emptyHint:
        'A call, a WhatsApp exchange, an email or a meeting — every contact is filed here, linked to an order when there is one',
    note: 'The activities log is what the team does all day — SAP recorded 7,400 activities in 2025. Types and subjects are managed lists, not free text, so the log can be filtered and counted.',
    auto: 'Recorded automatically',

    type: {
        call: 'Phone call',
        whatsapp: 'WhatsApp',
        email: 'Email',
        meeting: 'Meeting',
        note: 'Note',
    },

    subject: {
        cancellation: 'Cancellation',
        delivery: 'Delivery inquiry',
        no_answer: 'No answer',
        complaint: 'Complaint',
        stock: 'Stock inquiry',
        payment: 'Payment',
        order_change: 'Order change',
        general: 'General',
    },

    entity: {
        practitioner: 'Practitioner',
        customer: 'Customer',
        supplier: 'Supplier',
    },

    form: {
        type: 'Type',
        subject: 'Subject',
        order: 'Related order',
        noOrder: 'No order',
        text: 'Description',
        textPh: 'What was discussed, what was agreed, what comes next',
        save: 'Save activity',
        saved: 'Activity recorded',
    },
};
