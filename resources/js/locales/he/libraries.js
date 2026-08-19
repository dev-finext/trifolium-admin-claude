// ספריות פורמולות — הספריות שאשף הרקיחה טוען: פורמולות הבית, המרשמים
// הסיניים הקלאסיים, ובסיסי המזיגה החופשית.
export default {
    title: 'ספריות פורמולות',
    sub: 'ספריות שאשף הרקיחה טוען — מנוהלות במסד הנתונים של המערכת',
    readOnly:
        'הספריות מוצגות כאן לקריאה בלבד, כפי שהאשף טוען אותן. הוספה ועריכה נעשות במסד הנתונים.',

    // The formula editor is its own wizard — a separate screen this console
    // links to rather than contains.
    newFormula: {
        label: 'פורמולה חדשה',
        title: 'פורמולה חדשה',
        body: 'נפתח עורך הפורמולות',
    },

    tab: {
        system: 'פורמולות מערכת',
        preset: 'פורמולות סיניות מוכנות',
        free: 'מזיגה חופשית',
    },

    count: {
        system: 'מתוך {n} פורמולות מערכת',
        preset: 'מתוך {n} פורמולות מוכנות',
        free: 'מתוך {n} בסיסים',
    },

    search: {
        system: 'שם פורמולה · צמחים בתקציר',
        preset: 'שם באנגלית · סינית · פינין · התוויה',
        free: 'מק״ט · שם בסיס · נפח',
    },

    filter: {
        optionCount: '{label} ({n})',
        form: 'צורת הכנה',
        formAll: 'צורת הכנה — הכל',
        size: 'מספר צמחים',
        sizeAll: 'מספר צמחים — הכל',
        composition: 'הרכב',
        compositionAll: 'הרכב — הכל',
        source: 'מקור קלאסי',
        sourceAll: 'מקור קלאסי — הכל',
        shelfForm: 'צורת מדף',
        shelfFormAll: 'צורת מדף — הכל',
        price: 'טווח מחיר',
        priceAll: 'מחיר — הכל',
    },

    band: {
        size: {
            lt5: 'עד 4 צמחים',
            '5to6': '5–6 צמחים',
            gt6: '7 ומעלה',
        },
        price: {
            lt80: 'עד ₪80',
            '80to120': '₪80–120',
            gt120: 'מעל ₪120',
        },
    },

    shelfUnit: {
        ml: 'נוזל (ml)',
        capsule: 'כמוסות',
        g: 'משחה/אבקה (g)',
    },

    // הנפח כפי שהוא מודפס על המדף.
    size: {
        ml: '{n} ml',
        capsule: '{n} כמוסות',
        g: '{n} g',
    },

    col: {
        name: 'שם הפורמולה',
        presetName: 'שם',
        form: 'צורת הכנה',
        herbs: 'צמחים',
        composition: 'הרכב',
        source: 'מקור קלאסי',
        indication: 'התוויה',
        sku: 'מק״ט',
        base: 'בסיס',
        shelfSize: 'נפח מדף',
        price: 'מחיר',
        actions: '',
    },

    herbCount: '{n} צמחים',
    compositionCell: '{n} צמחים · יחסי בסיס נעולים',
    lockedRatios: 'יחסי בסיס נעולים',
    freePourBase: 'בסיס למזיגה חופשית — הרכב בסיס נעול',

    empty: {
        system: {
            title: 'אין פורמולות שתואמות את הסינון',
            sub: 'נקה את הסינון או בחר צורת הכנה אחרת',
        },
        preset: {
            title: 'אין פורמולות שתואמות את הסינון',
            sub: 'נקה את החיפוש או בחר מקור קלאסי אחר',
        },
        free: {
            title: 'אין בסיסים שתואמים את הסינון',
            sub: 'נקה את הסינון',
        },
    },

    preview: {
        open: 'תצוגה',
        title: 'תצוגה מקדימה — כפי שהמטפל רואה באשף',
        summary: 'תקציר',
        nameZh: 'שם בסינית',
        namePinyin: 'פינין',
        wizardNote:
            'האשף מציג את הפורמולה כנקודת פתיחה. המטפל יכול לשנות מינונים, אך הרכב הבסיס נעול.',
    },
};
