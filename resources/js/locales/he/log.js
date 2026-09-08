// יומן מערכת: כל פעולה של נציג, של המערכת עצמה ושל ממשק חיצוני, בזרם אחד
// בלתי משתנה.
//
// שמות הפעולות אינם כאן — הם ב-enums תחת logAction.<id>, כדי שאותה טקסונומיה
// סגורה תיקרא בשתי השפות. כאן נמצא רק מה שהמסך עצמו אומר.
export default {
    title: 'יומן מערכת',
    sub: '{n} רשומות · כל פעולה של נציג, של המערכת ושל ממשק חיצוני',

    readOnly: {
        title: 'היומן לקריאה בלבד.',
        body: 'אין עריכה ואין מחיקה של רשומות — תיקון מתועד תמיד כרשומה חדשה.',
    },

    inRange: 'רשומה אחת בטווח | {n} רשומות בטווח',

    filter: {
        search: 'חיפוש חופשי: ישות · ערך · IP · מבצע',
        searchLabel: 'חיפוש חופשי ביומן',
        actor: 'מבצע',
        actorAll: 'מבצע — הכל',
        actorType: 'סוג מבצע',
        actorTypeAll: 'סוג מבצע — הכל',
        action: 'סוג פעולה',
        actionAll: 'סוג פעולה — הכל',
        entity: 'ישות',
        entityAll: 'ישות — הכל',
        source: 'מקור הפעולה',
        sourceAll: 'מקור — הכל',
        label: 'רשומות',
    },

    table: {
        when: 'תאריך ושעה',
        actor: 'מבצע',
        action: 'סוג פעולה',
        entity: 'ישות',
        change: 'לפני ← אחרי',
        source: 'מקור',
        ip: 'כתובת IP',
    },

    // סוגי הישויות שרשומה ביומן יכולה לעסוק בהן.
    entity: {
        order: 'הזמנה',
        document: 'מסמך',
        order_item: 'פריט בהזמנה',
        practitioner: 'מטפל',
        message: 'הודעה',
        message_template: 'תבנית הודעה',
        batch: 'אצווה',
        admin_user: 'משתמש אדמין',
        system: 'מערכת',
        catalog_item: 'פריט קטלוג',
        product: 'מוצר',
        product_label: 'תווית מוצר',
        purchase_order: 'הזמנת רכש',
        customer: 'לקוח',
        supplier: 'ספק',
        sticker_template: 'תבנית מדבקה',
        sticker_note: 'הערת מדבקה',
    },

    loadMore: 'טען עוד {n} רשומות',
    shownOf: 'מוצגות {shown} מתוך {total}',

    export: {
        action: 'ייצוא CSV',
        done: 'הקובץ ירד',
        doneBody: 'שורה אחת · {file} | {n} שורות · {file}',
        empty: 'אין רשומות לייצוא',
        emptyBody: 'הרחב את טווח התאריכים או נקה את הסינון.',
    },

    empty: {
        title: 'אין רשומות שתואמות את הסינון',
        sub: 'הרחב את טווח התאריכים או נקה את הסינון',
    },
};
