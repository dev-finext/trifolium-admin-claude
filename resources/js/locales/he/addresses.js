// ניהול כתובות — ערים והרחובות שבכל עיר.
export default {
    title: 'ניהול כתובות',
    sub: '{cities} ערים · {streets} רחובות',
    intro: 'הרשימה שממנה נבחרת כתובת. הלקוח בוחר עיר, ואז נפתחים לו רק הרחובות של אותה עיר.',

    cities: {
        heading: 'ערים',
        add: 'עיר חדשה',
        search: 'חיפוש עיר',
        searchLabel: 'חיפוש ברשימת הערים',
        col: {
            name: 'עיר',
            alt: 'באנגלית',
            streets: 'רחובות',
        },
        none: 'אין עדיין ערים ברשימה.',
        noneHint: 'התחילו מ״עיר חדשה״.',
        noMatch: 'אין עיר שמתאימה לחיפוש.',
        pick: 'בחרו עיר כדי לראות את הרחובות שלה.',
    },

    streets: {
        headingEmpty: 'רחובות',
        heading: 'רחובות ב{city}',
        add: 'רחוב חדש',
        search: 'חיפוש רחוב',
        searchLabel: 'חיפוש ברחובות העיר',
        col: {
            name: 'רחוב',
            alt: 'באנגלית',
        },
        none: 'לעיר הזאת אין עדיין רחובות.',
        noneHint: 'הוסיפו רחוב ראשון ב״רחוב חדש״.',
        noMatch: 'אין רחוב שמתאים לחיפוש.',
    },

    editor: {
        cityNew: 'עיר חדשה',
        cityEdit: 'עריכת עיר',
        streetNew: 'רחוב חדש ב{city}',
        streetEdit: 'עריכת רחוב ב{city}',
        he: 'שם בעברית',
        en: 'שם באנגלית',
        enHint: 'לא חובה. אם יישאר ריק, יוצג השם בעברית גם באנגלית.',
        cityHePlaceholder: 'תל אביב',
        cityEnPlaceholder: 'Tel Aviv',
        streetHePlaceholder: 'רוטשילד',
        streetEnPlaceholder: 'Rothschild',
        save: 'שמירה',
        taken: 'השם הזה כבר קיים ברשימה.',
    },

    remove: {
        cityTitle: 'מחיקת עיר',
        cityBody: 'למחוק את {city} מרשימת הכתובות?',
        cityConfirm: 'מחיקת העיר',
        cityEffect1: '{n} רחובות של העיר יימחקו יחד איתה.',
        cityEffect2: 'כתובות שכבר נשמרו בהזמנות קיימות לא משתנות.',
        streetTitle: 'מחיקת רחוב',
        streetBody: 'למחוק את {street} מ{city}?',
        streetConfirm: 'מחיקת הרחוב',
        streetEffect1: 'הרחוב לא יוצע יותר בבחירת כתובת בעיר הזאת.',
        streetEffect2: 'כתובות שכבר נשמרו בהזמנות קיימות לא משתנות.',
    },

    toast: {
        cityAdded: 'העיר נוספה',
        cityUpdated: 'שם העיר עודכן',
        cityRemoved: 'העיר נמחקה',
        streetAdded: 'הרחוב נוסף',
        streetUpdated: 'שם הרחוב עודכן',
        streetRemoved: 'הרחוב נמחק',
        failed: 'השמירה נכשלה',
        failedBody: 'השינוי לא נשמר. נסו שוב.',
    },
};
