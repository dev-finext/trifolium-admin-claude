// The vocabulary every screen shares: the verbs on buttons, the words on field
// labels, the four data states, and the sentences the shell itself needs.
//
// Spread at the top level by locales/he/index.js, so keys read `actions.save`,
// `labels.status`, `states.empty.title`. An area catalog owns its own wording;
// it should reach for these instead of restating them.
export default {
    app: {
        title: 'Trifolium · מערכת ניהול',
        // The browser-tab title: "ניהול | הזמנות". The screen is named, not the
        // product — a back-office is lived in across many tabs at once.
        titlePrefix: 'ניהול',
        subtitle:
            'קונסולת ניהול לבית המרקחת — הזמנות, מעבדה, משלוחים, לקוחות, כספים ומלאי',
    },

    actions: {
        save: 'שמירה',
        cancel: 'ביטול',
        edit: 'עריכה',
        delete: 'מחיקה',
        add: 'הוספה',
        export: 'ייצוא',
        print: 'הדפסה',
        send: 'שליחה',
        refresh: 'רענון',
        search: 'חיפוש',
        filter: 'סינון',
        close: 'סגירה',
        back: 'חזרה',
        next: 'הבא',
        approve: 'אישור',
        reject: 'דחייה',
        confirm: 'אישור',
        copy: 'העתקה',
        download: 'הורדה',
        view: 'צפייה',
        archive: 'ארכוב',
        restore: 'שחזור',
        retry: 'נסה שוב',
        clear: 'ניקוי',
    },

    labels: {
        status: 'סטטוס',
        date: 'תאריך',
        dates: 'תאריכים',
        customer: 'לקוח',
        practitioner: 'מטפל',
        order: 'הזמנה',
        orders: 'הזמנות',
        amount: 'סכום',
        total: 'סה״כ',
        quantity: 'כמות',
        notes: 'הערות',
        reason: 'סיבה',
        phone: 'טלפון',
        email: 'אימייל',
        address: 'כתובת',
        createdAt: 'נוצר בתאריך',
        updatedAt: 'עודכן בתאריך',
        updatedBy: 'עודכן על ידי',
        actor: 'מבצע',
        none: 'ללא',
        all: 'הכל',
        yes: 'כן',
        no: 'לא',
        required: 'חובה',
        optional: 'רשות',
        inDevelopment: 'בפיתוח',
    },

    // Renders the parts that lib/dates.js durationParts() returns: `unit` picks
    // the key, `a` and `b` fill it. Never build a duration string by hand.
    duration: {
        sub_minute: 'פחות מדקה',
        minutes: '{a} דקות',
        hours: '{a} שעות',
        hours_minutes: '{a} שעות ו-{b} דקות',
        days: '{a} ימים',
        days_hours: '{a} ימים ו-{b} שעות',
    },

    relative: {
        today: 'היום',
        yesterday: 'אתמול',
        daysAgo: 'לפני {n} ימים',
        inDays: 'בעוד {n} ימים',
    },

    // The four states any data-backed area can be in. `hint` always tells the
    // agent what to do next; no invented error detail, no fake latency figures.
    states: {
        loading: {
            title: 'טוען נתונים…',
            hint: 'הרשומות נטענות מהמערכת.',
        },
        empty: {
            title: 'אין נתונים להצגה',
            hint: 'נסה להרחיב את טווח התאריכים או לנקות את הסינון.',
        },
        error: {
            title: 'לא הצלחנו לטעון את הנתונים',
            hint: 'נסה שוב. אם התקלה חוזרת — פנה לתמיכה.',
        },
        denied: {
            title: 'אין לך הרשאה לצפות במסך הזה',
            hint: 'פנה למנהל המערכת כדי לקבל הרשאה.',
        },
    },

    notFound: {
        crumb: 'שגיאה',
        title: 'הכתובת הזו לא קיימת',
        hint: 'הקישור אולי השתנה או שהמסך הוסר. אפשר לחזור לרשימת ההזמנות ולהמשיך מכאן.',
        home: 'חזרה להזמנות',
    },

    locale: {
        switchTo: 'החלפה ל{lang}',
        hebrew: 'עברית',
        english: 'English',
    },

    demo: {
        banner: 'הדגמה',
        note: 'הנתונים במסך הם נתוני הדגמה. הפעולות משנות את המצב בדפדפן בלבד — לא נשלחת בקשה לשרת.',
        pinnedClock: 'השעון מקובע ל-{date}, כדי שהנתונים ייראו זהים בכל טעינה.',
    },

    dataSource: {
        demo: 'נתוני הדגמה',
        api: 'ממשק API',
    },
};
