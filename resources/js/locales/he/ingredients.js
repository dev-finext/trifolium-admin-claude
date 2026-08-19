// רכיבי פורמולה — the formula-ingredient catalogue.
export default {
    title: 'רכיבי פורמולה',
    crumb: 'רכיבי פורמולה',
    sub: '{total} רכיבים בקטלוג · {west} מערביים · {chinese} סיניים · כאן מוקם כל פריט חדש למלאי',

    kind: {
        raw: 'חומר גלם',
        base: 'בסיס',
        pack: 'אריזה',
    },
    system: {
        west: 'מערבי',
        chinese: 'סיני',
    },
    unit: {
        g: 'גרם',
        ml: 'מ״ל',
        unit: 'יחידות',
    },

    kpi: {
        all: 'כל הרכיבים',
        allSub: 'לחיצה מציגה הכל',
        filters: 'לחיצה מסננת',
        low: 'מתחת למינימום',
        lowSub: 'דורש קליטת סחורה',
        chinese: 'רכיבים סיניים',
    },

    filter: {
        count: 'רכיבים · מתוך {total}',
        search: 'שם · שם לטיני · סיני · מק״ט · קוד תמחור',
        kind: 'סוג — הכל',
        unit: 'יחידה — הכל',
        warehouse: 'מחסן — הכל',
        stock: 'מלאי — הכל',
        stockLow: 'מתחת למינימום',
        stockZero: 'אזל לגמרי',
        stockOk: 'מעל המינימום',
        system: 'שיטה — הכל',
        priceGroup: 'תמחור — הכל',
        noGroup: 'ללא קבוצת תמחור',
    },

    col: {
        sku: 'מק״ט',
        priceCode: 'תמחור: {code}',
        name: 'רכיב',
        kind: 'סוג',
        unit: 'יחידה',
        warehouse: 'מחסן',
        stock: 'מלאי',
        min: 'מינימום',
        priceGroup: 'קבוצת תמחור',
        actions: 'פעולות',
    },

    stock: {
        onHand: '{qty} {unit}',
        available: 'זמין {qty}',
        low: 'מתחת למינימום',
        empty: 'אזל',
        noGroup: '— ללא —',
    },

    action: {
        add: 'רכיב חדש',
        edit: 'עריכה',
        remove: 'מחיקה',
        export: 'ייצוא Excel',
    },

    editor: {
        newTitle: 'רכיב חדש',
        editTitle: 'עריכת רכיב · {name}',
        createConfirm: 'הקם רכיב',
        saveConfirm: 'שמור שינויים',
        missing: 'חסר: {fields}',
        identity: 'זהות הרכיב',
        codes: 'קודים ומחסן',
        availability: 'זמינות ומלאי',
        name: 'שם הרכיב',
        nameHint: 'השם שהמטפל רואה באשף הרקיחה ועל המדבקה',
        kind: 'סוג הרכיב',
        lat: 'שם לטיני',
        latHint: 'לא חובה — מוצג לרוקח',
        cn: 'שם סיני / פין-יין',
        system: 'שיטה',
        sku: 'מק״ט מלאי',
        skuHint: 'ספרות, אותיות לטיניות ומקף · 3–20 תווים',
        priceSku: 'קוד תמחור',
        priceHint: '3–8 ספרות — לפיו נקבעת קבוצת המחיר',
        priceGroupResolved: 'משויך לקבוצה: {group}',
        priceGroupNone: 'לא נמצאה קבוצת תמחור תואמת',
        unit: 'יחידת מידה',
        warehouse: 'מחסן ברירת מחדל',
        min: 'מלאי מינימום',
        minHint: 'מתחת לרמה זו הרכיב אינו זמין באשף הרקיחה',
        required: 'שדה חובה',
    },

    field: {
        name: 'שם',
        sku: 'מק״ט',
        priceSku: 'קוד תמחור',
        min: 'מלאי מינימום',
    },

    validate: {
        nameShort: 'נא להזין שם רכיב',
        nameLong: 'עד 80 תווים',
        skuMissing: 'נא להזין מק״ט',
        skuLength: 'מק״ט באורך 3–20 תווים',
        skuChars: 'ספרות, אותיות לטיניות ומקף בלבד',
        skuTaken: 'מק״ט זה כבר קיים במערכת',
        priceFormat: 'קוד תמחור הוא 3–8 ספרות',
        priceTaken: 'קוד התמחור הזה משויך לרכיב אחר',
        minMissing: 'נא להזין מלאי מינימום',
        minInteger: 'מספר שלם בלבד',
        minHigh: 'ערך גבוה מדי',
    },

    remove: {
        title: 'מחיקת רכיב',
        confirm: 'מחק רכיב',
        body: '{name} ({sku}) יימחק מקטלוג הרכיבים.',
        effectWizard: 'הרכיב לא יופיע יותר באשף הרקיחה ובקליטת סחורה',
        effectHistory:
            'אין לו מלאי, אצוות או פורמולות — ולכן אין השפעה על נתוני עבר',
        effectLog: 'המחיקה, הסיבה והמבצע יירשמו ביומן',
        blockedTitle: 'לא ניתן למחוק את הרכיב',
        blockedBody: '{name} ({sku}) קשור לנתונים קיימים: {deps}.',
        depStock: 'מלאי {qty} {unit}',
        depBatches: '{n} אצוות',
        depFormulas: '{n} פורמולות',
    },

    toast: {
        created: 'הרכיב הוקם',
        createdBody: '{name} · {sku} · מלאי 0 — נכנס בקליטת סחורה',
        updated: 'הרכיב עודכן',
        updatedBody: '{name} · {sku}',
        removed: 'הרכיב נמחק',
        removedBody: '{name} · סיבה: {reason}',
        exported: 'הייצוא הוכן',
        exportedBody: '{n} שורות · {file}',
    },

    empty: {
        title: 'אין רכיבים תואמים',
        hint: 'נסה לשנות את הסינון או החיפוש.',
    },
};
