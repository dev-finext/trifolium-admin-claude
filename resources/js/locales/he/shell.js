// The application shell: global search, the exceptions bell, the external
// service health pill, the language switch, the signed-in agent and the page
// head.
//
// Navigation labels are NOT here — a nav item's label is `nav.item.<id>` and a
// group's heading is `nav.group.<id>`, both in locales/he/nav.js, keyed by the
// ids in config/nav.js.
export default {
    // The V2 review markers — demo only. `badge` is the literal on the red pill.
    v2: {
        badge: 'V2',
        tip: 'חדש בגרסה 2 — לחיצה פותחת את ההסבר בעמוד ״התקדמות אפיון״',
        tipPlain: 'חדש בגרסה 2',
        show: 'הצגת סימוני V2',
        hide: 'הסתרת סימוני V2',
        on: 'מוצג',
        off: 'מוסתר',
    },

    landmark: {
        nav: 'ניווט ראשי',
        main: 'תוכן המסך',
        top: 'סרגל עליון',
    },

    search: {
        label: 'חיפוש גלובלי',
        placeholder: 'חיפוש: מספר הזמנה · מטפל · לקוח · טלפון · מספר מעקב',
        orders: 'הזמנות',
        practitioners: 'מטפלים',
        empty: 'לא נמצאו תוצאות ל״{term}״',
        hint: 'חצים למעלה ולמטה לבחירה · Enter לפתיחה · Esc לסגירה',
    },

    notifications: {
        label: 'חריגים פתוחים: {n}',
        title: 'חריגים פתוחים',
        empty: 'אין חריגים פתוחים כרגע',
    },

    // One entry per row the bell can show. `{n}` is always the number of records
    // behind the row; the row's own list of names comes from the records.
    // Shown in place of the console when a render error tears the tree down.
    // Deliberately plain: whatever broke, this text still has to render.
    crash: {
        title: 'המסך נתקל בשגיאה',
        body: 'הפעולה האחרונה אולי לא נשמרה. רענן את העמוד ובדוק את הרשומה שעבדת עליה לפני שתמשיך.',
        reload: 'רענן את העמוד',
    },

    exception: {
        services_down: {
            title: '{n} שירותי חוץ מושבתים',
        },
        doc_failed: {
            title: '{n} חשבוניות לא הופקו',
            sub: 'התשלום נסלק — נדרשת הפקה חוזרת',
        },
        credit_overdue: {
            title: '{n} מטפלים עם חוב בהקפה מעל {days} יום',
        },
        link_expiring: {
            title: '{n} קישורי תשלום פגים בתוך {hours} שעות',
            sub: 'בתום התוקף ההזמנה תתבטל והמלאי ישוחרר',
        },
        low_stock: {
            title: '{n} פריטים מתחת למינימום',
        },
        expiring_batches: {
            title: '{n} אצוות בתוקף מתקרב',
            sub: 'פחות מ-{days} יום לתפוגה',
        },
        missing_address: {
            title: '{n} הזמנות ללא כתובת משלוח',
            sub: 'הלקוח טרם מילא את הכתובת',
        },
        msg_failed: {
            title: '{n} הודעות WhatsApp נכשלו',
            sub: 'לפתיחת יומן ההודעות',
        },
        pending_users: {
            title: '{n} הרשמות חדשות ממתינות לאישור',
            sub: 'הוותיקה מהן: {oldest}',
        },
        pay_stale: {
            title: '{n} הזמנות ממתינות לתשלום מעל {days} ימים',
            sub: 'נשלחה תזכורת אוטומטית',
        },
    },

    // Tooltip on a nav badge, keyed by the nav item the badge sits on.
    count: {
        orders: '{n} הזמנות עם חריג פתוח',
        users: '{n} הרשמות ממתינות לאישור',
        finance: '{overdue} חובות מעל {days} יום · {docs} מסמכים שנכשלו',
        deliveries: '{n} משלוחים שממתינים לטיפול',
        messaging: '{n} הודעות שנכשלו',
        inventory: '{n} פריטים מתחת למינימום',
        integrations: '{n} שירותי חוץ מושבתים',
    },

    me: {
        role: 'צוות בית המרקחת',
    },
};
