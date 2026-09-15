// Files attached to a record — the shared panel (V2).
export default {
    title: 'קבצים',
    sub: '{n} קבצים',
    add: 'הוספת קובץ',
    empty: 'אין קבצים מצורפים',
    emptyHint: 'PDF, תמונות, Word ו-Excel · עד {mb} MB',
    demoNote:
        'בדמו כל קובץ נפתח כמסמך דוגמה מאותו סוג; קובץ שמעלים כאן נשמר בדפדפן עד רענון. האחסון עצמו הוא עניין של ה-API.',
    open: 'פתיחת {name}',
    download: 'הורדה',
    remove: 'הסרה',
    removeTitle: 'הסרת קובץ',
    removeBody: '{name} יוסר מכרטיס {entity}. הרשומה ביומן נשמרת.',
    removeConfirm: 'הסר קובץ',

    col: {
        name: 'קובץ',
        size: 'גודל',
        by: 'הועלה על ידי',
        when: 'מתי',
        actions: 'פעולות',
    },

    entity: {
        item: 'הפריט',
        batch: 'האצווה',
        supplier: 'הספק',
        purchase_order: 'הזמנת הרכש',
        supplier_invoice: 'חשבונית הספק',
        supplier_payment: 'התשלום לספק',
        document: 'המסמך',
        practitioner: 'המטפל',
        customer: 'הלקוח',
    },

    size: {
        kb: '{n} KB',
        mb: '{n} MB',
    },

    viewer: {
        download: 'הורדת הקובץ',
        close: 'סגירה',
        noPreview: 'אין תצוגה מקדימה לקובץ {type}',
        noPreviewBody:
            'הדפדפן אינו מציג קבצי Word ו-Excel. הורידו את הקובץ ופתחו אותו בתוכנה המתאימה.',
        noFile: 'אין קובץ מאחורי הרשומה בדמו',
        noFileBody:
            'הרשומה מדגימה את פרטי הקובץ בלבד — במערכת האמיתית הקובץ עצמו יגיע מה-API.',
    },

    toast: {
        added: 'הקובץ צורף',
        addedBody: '{name} · {size}',
        removed: 'הקובץ הוסר',
        removedBody: '{name} · סיבה: {reason}',
        tooBig: 'הקובץ גדול מדי',
        tooBigBody: '{name} — המגבלה היא {mb} MB',
        badType: 'סוג קובץ לא נתמך',
        badTypeBody: '{name} — נתמכים: {types}',
    },
};
