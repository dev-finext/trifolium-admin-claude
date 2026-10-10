// רכש — שני הטאבים. הכותרות של עמודות הגיליון עצמו אינן כאן אלא ב-
// config/buying.js, כי הן מה שנכתב לקובץ האקסל ולא מה שמוצג על המסך.
export default {
    crumb: 'ניהול שוטף',
    title: 'רכש',
    sub: 'בקשות רכש והזמנות לספקים',

    tab: {
        request: 'בקשת רכש',
        order: 'הזמנת רכש',
    },

    request: {
        one: 'בקשת רכש',
        pick: 'בקשה',
        new: 'בקשה חדשה',
        file: 'בקשת-רכש',
        ticked: 'בוצעו {done} מתוך {total}',
        emptyTitle: 'אין עדיין בקשות רכש',
        emptySub: 'בקשת רכש היא רשימת קניות: מה שרוצים, לפני שמדברים עם ספקים.',
    },

    order: {
        one: 'הזמנת רכש',
        pick: 'הזמנה',
        new: 'הזמנה חדשה',
        file: 'הזמנת-רכש',
        number: 'מספר הזמנה',
        supplierCode: 'קוד ספק',
        details: 'פרטי ההזמנה',
        openedOn: 'נפתחה',
        openedBy: 'נפתחה ע״י',
        sentOn: 'נשלחה',
        receivedOn: 'התקבלה',
        receipts: 'תעודות קבלה',
        inSap: 'נקלטה בסאפ, לפני הקונסולה הזו',
        moveTo: 'העברה ל:',
        arrived: 'הגיעו {done} מתוך {total}',
        emptyTitle: 'אין עדיין הזמנות רכש',
        emptySub: 'הזמנת רכש היא ספק אחד, כמויות, וקובץ לשלוח אליו.',
    },

    supplier: 'ספק',
    pickSupplier: 'בחירת ספק…',
    needSupplier: 'צריך לבחור ספק לפני הייצוא',
    needQty: 'חסרה כמות בשורה אחת | חסרה כמות ב-{n} שורות',

    // config/buying.js BUYING_STATES — לבקשה שני מצבים, להזמנה ארבעה
    state: {
        open: 'פתוחה',
        closed: 'סגורה',
        draft: 'טיוטה',
        sent: 'נשלחה',
        received: 'התקבלה',
        failed: 'נכשלה',
    },
    close: 'סיום הבקשה',
    reopen: 'פתיחה מחדש',
    sheetCount: 'אין גיליונות | גיליון אחד | {n} גיליונות',

    receive: {
        open: 'קבלת סחורה',
        title: 'קבלת סחורה · הזמנה {number} · {supplier}',
        docNum: 'מספר תעודת משלוח',
        date: 'תאריך הקבלה',
        ordered: 'הוזמן',
        arrived: 'הגיע',
        batch: 'אצוות ספק',
        batchHint: 'מהמדבקה',
        expiry: 'תוקף',
        price: 'מחיר ליחידה',
        note: 'הערה לקבלה',
        takeAll: 'הכל הגיע',
        none: 'איפוס',
        counting: 'שורה אחת תיקלט מתוך {total} | {n} שורות ייקלטו מתוך {total}',
        sign: 'אישור וחתימה',
        confirmTitle: 'לאשר את קבלת הסחורה?',
        confirmBody: 'שורה אחת תיקלט למלאי. | {n} שורות ייקלטו למלאי.',
        effectStock: 'המלאי יעודכן בכמויות שנרשמו',
        effectBatches: 'תיפתח אצווה לכל שורה, עם מספר הספק והתוקף',
        effectState: 'ההזמנה תעבור ל״התקבלה״',
        effectDiffer:
            'בשורה אחת הכמות שונה ממה שהוזמן | ב-{n} שורות הכמות שונה ממה שהוזמן',
        done: 'נקלטה שורה אחת | נקלטו {n} שורות',
    },

    note: 'הערת עבודה',
    notePlaceholder: 'בהכנה · נשלח מייל 5.8 · ממתינים למחיר…',
    openedBy: 'נפתחה על ידי {who} · {when}',

    paste: 'הדבקת מק״טים',
    pastePlaceholder: '100002 110005 200011',
    pasteHint:
        'מופרדים ברווח, בפסיק או בשורה — גם הדבקה של עמודה מאקסל עובדת. כל מק״ט הופך לשורה.',
    search: 'חפש',
    addOne: 'הוספת פריט בודד',
    addOnePlaceholder: 'מק״ט או שם…',

    foundAdded: 'נוספה שורה אחת | נוספו {n} שורות',
    foundAlready: 'כבר ברשימה: {list}',
    foundMissing: 'לא נמצאו: {list}',

    noLinesTitle: 'הרשימה ריקה',
    noLinesSub: 'הדביקו מק״טים ולחצו ״חפש״, או הוסיפו פריט בודד.',

    lineCount: 'אין שורות | שורה אחת | {n} שורות',
    dropLine: 'הסרת השורה',
    export: 'ייצוא לאקסל',
    exported: 'יוצאה שורה אחת | יוצאו {n} שורות',

    days: '{n} ימים',

    // מצב הפריט עצמו, לא מצב הרשימה
    itemState: {
        active: 'פעיל',
        frozen: 'מוקפא',
        inactive: 'לא פעיל',
    },

    // כל מה שיש על כרטיס הפריט ונוגע לרכש, בסדר שבו הכרטיס מציג אותו
    col: {
        number: 'מספר',
        opened: 'נפתחה',
        by: 'נפתחה ע״י',
        lines: 'שורות',
        sheetState: 'מצב',
        received: 'התקבל',

        sku: 'מק״ט',
        name: 'שם הפריט',
        foreignName: 'שם לועזי',
        group: 'קבוצת פריט',
        state: 'מצב',

        supplier: 'ספק מועדף',
        supplierCode: 'קוד ספק',
        catalogNum: 'מק״ט אצל הספק',
        purchaseUom: 'יחידת רכש',
        numInBuy: 'יח׳ מלאי ביח׳ רכש',
        packUom: 'יחידת אריזה',
        packQty: 'כמות באריזה',
        lastPrice: 'מחיר אחרון',
        lastPriceOn: 'נרכש לאחרונה',
        evalPrice: 'מחיר הערכה',

        uom: 'יחידת מלאי',
        onHand: 'במלאי',
        committed: 'מוקצה',
        available: 'זמין',
        onOrder: 'בהזמנה',
        min: 'מלאי מינימום',
        max: 'מלאי מקסימום',
        reorder: 'כמות לחידוש',

        minOrder: 'הזמנה מינימלית',
        leadDays: 'זמן אספקה',
        procurement: 'שיטת רכש',

        qty: 'כמות',
        done: 'בוצע',
    },
};
