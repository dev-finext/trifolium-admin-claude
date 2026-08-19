// מחירונים מדורגים — the tiered price-list overview and its group editor.
export default {
    title: 'מחירונים מדורגים',
    sub: 'תמחור רכיבי פורמולה לפי כמות — המחיר ליחידה יורד ככל שהכמות בהזמנה עולה',

    actions: {
        export: 'ייצוא כל הקבוצות',
        newGroup: 'קבוצת תמחור חדשה',
        createFirst: 'צור קבוצת תמחור ראשונה',
    },

    countLabel: 'קבוצות מתוך {total}',

    uom: {
        ml: 'מ״ל',
        g: 'גרם',
        unit: 'יחידה',
        capsule: 'קפסולה',
    },

    per: {
        ml: 'למ״ל',
        g: 'לגרם',
        unit: 'ליחידה',
        capsule: 'לקפסולה',
    },

    filters: {
        option: '{label} ({n})',
        searchPlaceholder: 'שם קבוצה · תחילית · מק״ט (למשל 200455)',
        searchAria: 'חיפוש קבוצות תמחור',
        uomAria: 'יחידת מידה',
        uomAll: 'יחידת מידה — הכל',
        scaleAria: 'סרגל כמויות',
        scaleAll: 'סרגל כמויות — הכל',
        scaleCustom: 'מותאם אישית',
        scaleDefault: 'ברירת מחדל',
        fillAria: 'שיוך מק״טים ומחירים',
        fillAll: 'שיוך ומחירים — הכל',
        fillNone: 'ללא מק״טים משויכים',
        fillHas: 'עם מק״טים משויכים',
        fillNoPrice: 'ללא מחיר בשורה הראשונה',
    },

    lookup: {
        resolved: 'מק״ט {sku} מתומחר על ידי {group} (תחילית {prefix})',
        resolvedNamed:
            'מק״ט {sku} · {name} מתומחר על ידי {group} (תחילית {prefix})',
        open: 'פתיחת הקבוצה',
        unresolved: 'מק״ט {sku} אינו משויך לאף קבוצת תמחור.',
    },

    table: {
        group: 'קבוצת תמחור',
        uom: 'יחידת מידה',
        scale: 'סרגל כמויות',
        base: 'מחיר ליחידה',
        matched: 'מק״טים משויכים',
        updated: 'עדכון אחרון',
        custom: 'מותאם אישית · {n} טווחים',
        default: 'ברירת מחדל · {n} טווחים',
        from: 'החל מ־{price} {per}',
        by: 'ע״י {name}',
        edit: 'עריכה',
        exportAria: 'ייצוא הקבוצה {name}',
        deleteAria: 'מחיקת הקבוצה {name}',
    },

    empty: {
        noneTitle: 'עוד אין קבוצות תמחור',
        noneSub:
            'קבוצת תמחור מגדירה תחיליות מק״ט, יחידת מידה וטבלת מחירים לפי כמות — כך כל רכיב מקבל מחיר אוטומטית.',
        filteredTitle: 'לא נמצאו קבוצות תמחור',
        filteredSub: 'נסו שם אחר, תחילית או מק״ט מלא',
    },

    editor: {
        newTitle: 'קבוצת תמחור חדשה',
        editTitle: 'עריכת קבוצת תמחור · {name}',
        close: 'סגירה',
        export: 'ייצוא הקבוצה',

        meta: {
            uom: 'יחידת מידה: {uom}',
            noUom: 'טרם נבחרה יחידת מידה',
            matched: '{n} מק״טים משויכים',
            filled: '{filled}/{total} שורות מחיר מולאו',
            lastUpdate: 'עדכון אחרון: {stamp} · ע״י {name}',
        },

        step1: {
            title: 'פרטי הקבוצה',
            sub: 'שם, תחיליות המק״ט שהקבוצה מתמחרת ויחידת המידה',
        },
        step2: {
            title: 'סרגל טווחי הכמות',
            sub: 'לפי אילו מדרגות כמות ייקבע המחיר ליחידה',
        },
        step3: {
            title: 'טבלת המחירים',
            sub: 'מחיר ל{uom} אחת בכל טווח כמות — המערכת מציגה את ההנחה מהמחיר הבסיסי',
            subLocked: 'בחרו יחידת מידה בשלב 1 כדי לפתוח את הטבלה',
        },

        name: {
            label: 'שם הקבוצה',
            placeholder: 'למשל: שמנים אתריים',
        },

        prefixes: {
            label: 'תחיליות מק״ט',
            // The rule the whole screen is built around: one SKU, one group.
            hint: 'כל מק״ט משויך לקבוצה אחת בלבד — תחילית שחופפת לקבוצה אחרת תיחסם.',
            placeholderFirst: 'למשל: 200 — ואז Enter',
            placeholderMore: 'תחילית נוספת…',
            aria: 'הוספת תחילית מק״ט',
            removeAria: 'הסרת תחילית {prefix}',
            conflict:
                'לא ניתן להוסיף את התחילית {prefix} — היא חופפת לתחילית {other} של הקבוצה ״{group}״. המערכת אינה מאפשרת חפיפת תחיליות בין קבוצות.',
        },

        uomField: {
            label: 'יחידת מידה',
            choose: '— בחירה —',
        },

        preview: {
            label: 'מק״טים משויכים — תצוגה חיה',
            head: '{n} מק״טים מתוך {total} בקטלוג',
            noPrefix: 'הוסיפו תחילית מק״ט כדי לראות אילו פריטים ייכללו בקבוצה',
            noMatch: 'אף מק״ט בקטלוג אינו מתחיל בתחיליות שהוזנו',
        },

        mode: {
            aria: 'בחירת סרגל כמויות',
            defaultTitle: 'הסרגל הקבוע של המערכת',
            defaultSub: '{n} טווחים מוכנים מראש: {sample}',
            customTitle: 'סרגל מותאם אישית',
            customSub:
                'אתם מגדירים את הטווחים בעצמכם — שורה אחר שורה בטבלת המחירים',
            customNote:
                'בסרגל מותאם אישית הסרגל הקבוע אינו חל על קבוצה זו: הוסיפו טווחים בטבלה למטה, וקבעו לכל טווח את הכמות שממנה הוא מתחיל. הטווחים חייבים לעלות מקטן לגדול.',
        },

        table: {
            range: 'טווח כמות',
            unitPrice: 'מחיר ליחידה',
            discount: 'הנחה מהבסיס',
            example: 'סה״כ לדוגמה',
            exampleValue: '{qty} {uom} ← {total}',
            filled: '{filled}/{total} שורות מולאו',
            base: 'בסיס',
            discountDown: '−{pct}',
            discountUp: '+{pct}',
            priceAria: 'מחיר ליחידה',
            priceRequired: 'חובה למלא מחיר',
            priceRose: 'המחיר ליחידה עלה ביחס לטווח הקודם',
            rangeAria: 'תחילת טווח {n}',
            rangeFrom: 'מ־',
            rangeUpTo: 'עד {n}',
            rangeAndUp: 'ומעלה',
            rangeRequired: 'יש להזין כמות',
            rangeAscending: 'חייב להיות גדול מהטווח הקודם',
            removeRange: 'הסרת טווח {n}',
            addRange: 'הוספת טווח',
            addRangeHint:
                'כל טווח נמשך עד תחילת הטווח הבא; הטווח האחרון פתוח כלפי מעלה.',
            locked: 'בחרו יחידת מידה כדי לפתוח את טבלת המחירים',
        },

        save: {
            label: 'שמירה',
            cancel: 'ביטול',
            unsaved: '● יש שינויים שלא נשמרו',
            blockedName: 'לשמירה נדרשים שם קבוצה ולפחות תחילית אחת',
            blockedUom: 'לשמירה יש לבחור יחידת מידה',
            blockedRanges:
                'יש לתקן את טווחי הכמות — הטווחים חייבים לעלות מקטן לגדול',
            blockedTable: 'הטבלה חייבת להיות שלמה — יש למלא מחיר בכל השורות',
        },

        confirmSave: {
            titleNew: 'אישור יצירת הקבוצה',
            titleEdit: 'אישור שמירת השינויים',
            bodyNew:
                'הקבוצה ״{name}״ תיווצר ותתמחר מיידית את המק״טים המשויכים לה.',
            bodyEdit:
                'הקבוצה ״{name}״ תעודכן ותתמחר מיידית את המק״טים המשויכים לה.',
            confirmNew: 'צור קבוצה',
            confirmEdit: 'שמור שינויים',
            effect1: '{matched} מק״טים משויכים · {ranges} טווחי כמות',
            effect2: 'חתימת העדכון האחרון של הקבוצה תעבור לשמך ({name})',
        },

        confirmUom: {
            title: 'שינוי יחידת מידה',
            body: 'טבלת המחירים תישמר, אך משמעות המחירים תשתנה: כל מחיר יפורש מעתה כמחיר ל{next} אחת במקום ל{current} אחת.',
            bodyFirst: 'טבלת המחירים תיפתח לתמחור לפי {next}.',
            confirm: 'שינוי יחידת המידה',
            effect1: '{n} שורות המחיר שמולאו יישארו כפי שהן',
            effect2: 'טווחי הכמות יימדדו מעתה ב{next}',
        },

        confirmMode: {
            titleCustom: 'מעבר לסרגל מותאם אישית',
            titleDefault: 'חזרה לסרגל הקבוע',
            bodyCustom:
                'הסרגל הקבוע לא יחול עוד על קבוצה זו — אתם תגדירו את טווחי הכמות בעצמכם, טווח אחר טווח.',
            bodyDefault:
                'הטווחים המותאמים אישית יימחקו והקבוצה תחזור לסרגל הקבוע של המערכת ({n} טווחים).',
            confirmCustom: 'מעבר לסרגל מותאם',
            confirmDefault: 'חזרה לסרגל הקבוע',
            effect1: 'טבלת המחירים הנוכחית תימחק ותוזן מחדש',
            effect2: 'השינוי ייכנס לתוקף רק לאחר שמירה',
        },

        confirmLeave: {
            title: 'יציאה ללא שמירה',
            body: 'יש בקבוצה זו שינויים שלא נשמרו. לצאת בכל זאת?',
            confirm: 'יציאה ללא שמירה',
            effect1: 'השינויים שביצעתם יימחקו',
        },
    },

    confirmDelete: {
        title: 'מחיקת קבוצת תמחור',
        body: 'הקבוצה ״{name}״ תימחק לצמיתות ותפסיק לתמחר מק״טים.',
        confirm: 'מחק קבוצה',
        effect1: '{n} מק״טים משויכים יישארו ללא קבוצת תמחור',
        effect2: 'טבלת המחירים תימחק ולא ניתן לשחזר אותה',
        effect3: 'מק״ט ללא קבוצת תמחור לא יקבל מחיר אוטומטי בפורמולה',
    },

    toast: {
        saved: 'קבוצת התמחור נשמרה',
        savedBody: '{name} · כל שורות המחיר מלאות',
        deleted: 'הקבוצה נמחקה',
        exported: 'המחירון יוצא לקובץ',
        exportedBody: '{n} שורות · {file}',
    },

    export: {
        colGroup: 'קבוצת תמחור',
        colPrefixes: 'תחיליות מק״ט',
        colUom: 'יחידת מידה',
        colRange: 'טווח כמות',
        colPrice: 'מחיר ליחידה',
        rows: '{n} שורות',
    },
};
