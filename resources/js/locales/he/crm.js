// CRM — יומן הפעילויות על כרטיס (V2).
export default {
    title: 'פעילויות',
    sub: '{n} פעילויות',
    add: 'פעילות חדשה',
    empty: 'אין פעילויות מתועדות',
    emptyHint:
        'שיחה, WhatsApp, מייל או פגישה — כל מגע נרשם כאן, מקושר להזמנה כשיש',
    note: 'יומן הפעילויות הוא מה שהצוות עושה כל יום — ב-SAP נרשמו 7.4 אלף פעילויות ב-2025. הסוגים והנושאים מנוהלים, לא טקסט חופשי, כדי שאפשר יהיה לסנן ולספור.',
    auto: 'נרשם אוטומטית',

    type: {
        call: 'שיחת טלפון',
        whatsapp: 'WhatsApp',
        email: 'מייל',
        meeting: 'פגישה',
        note: 'הערה',
    },

    subject: {
        cancellation: 'ביטול',
        delivery: 'בירור משלוח',
        no_answer: 'אין מענה',
        complaint: 'תלונה',
        stock: 'בירור מלאי',
        payment: 'תשלום',
        order_change: 'שינוי בהזמנה',
        general: 'כללי',
    },

    entity: {
        practitioner: 'מטפל',
        customer: 'לקוח',
        supplier: 'ספק',
    },

    form: {
        type: 'סוג',
        subject: 'נושא',
        order: 'הזמנה קשורה',
        noOrder: 'ללא הזמנה',
        text: 'תיאור',
        textPh: 'מה נדון, מה הוסכם ומה נדרש בהמשך',
        save: 'שמור פעילות',
        saved: 'הפעילות נרשמה',
    },
};
