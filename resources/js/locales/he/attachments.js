// Files attached to a record — the shared panel (V2).
export default {
    title: 'קבצים',
    sub: '{n} קבצים',
    add: 'הוספת קובץ',
    empty: 'אין קבצים מצורפים',
    emptyHint: 'PDF, תמונות, Word ו-Excel · עד {mb} MB',
    demoNote:
        'בדמו נשמרים פרטי הקובץ בלבד — שם, סוג, גודל, מי ומתי. האחסון עצמו הוא עניין של ה-API.',
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
        practitioner: 'המטפל',
        customer: 'הלקוח',
    },

    size: {
        kb: '{n} KB',
        mb: '{n} MB',
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
