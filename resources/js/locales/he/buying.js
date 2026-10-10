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
        emptyTitle: 'אין עדיין בקשות רכש',
        emptySub: 'בקשת רכש היא רשימת קניות: מה שרוצים, לפני שמדברים עם ספקים.',
    },

    order: {
        one: 'הזמנת רכש',
        pick: 'הזמנה',
        new: 'הזמנה חדשה',
        file: 'הזמנת-רכש',
        emptyTitle: 'אין עדיין הזמנות רכש',
        emptySub: 'הזמנת רכש היא ספק אחד, כמויות, וקובץ לשלוח אליו.',
    },

    supplier: 'ספק',
    pickSupplier: 'בחירת ספק…',
    needSupplier: 'צריך לבחור ספק לפני הייצוא',
    needQty: 'חסרה כמות בשורה אחת | חסרה כמות ב-{n} שורות',

    state: {
        open: 'פתוחה',
        closed: 'סגורה',
    },
    close: 'סגירה',
    reopen: 'פתיחה מחדש',

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
