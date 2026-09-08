// מוצרי מדף — the shelf-product catalogue screen, its editor drawer and the
// label manager. Namespaced under `products` by locales/he/index.js.
export default {
    title: 'מוצרי מדף',
    sub: 'ניהול קטלוג מוצרי המדף המוצגים למטפלים באתר',

    actions: {
        newProduct: 'מוצר חדש',
        manageLabels: 'ניהול תוויות',
        export: 'ייצוא קטלוג',
    },

    countLabel: 'מוצרים מתוך {total}',

    filters: {
        // `{label} ({n})` — a filter option that carries a count.
        option: '{label} ({n})',
        searchPlaceholder: 'שם מוצר · מק״ט · תכולה',
        searchAria: 'חיפוש מוצרים',
        priceUpTo: 'עד {amount}',
        priceBetween: '{from}–{to}',
        priceOver: 'מעל {amount}',
    },

    // Filter drawer — stores/catalog.js PRODUCT_FILTER_FIELDS.
    filter: {
        noun: 'מוצרים',
        unitsUnit: 'יחידות',

        field: {
            pstatus: 'סטטוס פרסום',
            pstate: 'מצב מלאי',
            pstock: 'כמות במלאי',
            plabel: 'תווית',
            ptags: 'שיוך תוויות',
            pimg: 'תמונת מוצר',
            puom: 'יחידת משקל',
            pband: 'מחיר לפני מע״מ',
        },

        stockState: {
            ok: 'זמין למכירה',
            low: 'מתחת למינימום — חסום למכירה',
            zero: 'אזל מהמלאי',
        },

        tagState: {
            has: 'עם תוויות',
            none: 'ללא תוויות כלל',
        },

        imageState: {
            has: 'עם תמונה',
            none: 'ללא תמונה',
        },
    },

    noWeight: 'לא הוגדר',

    filterGroup: {
        state: 'מצב ומלאי',
        catalogue: 'קטלוג',
        price: 'מחיר',
    },

    status: {
        published: 'מפורסם',
        archived: 'בארכיון',
    },

    unit: {
        g: 'גרם',
        kg: 'ק״ג',
        ml: 'מ״ל',
        l: 'ליטר',
    },

    table: {
        image: 'תמונה',
        name: 'שם המוצר',
        sku: 'מק״ט',
        net: 'מחיר לפני מע״מ',
        gross: 'מחיר לצרכן',
        weight: 'משקל',
        stock: 'מלאי זמין',
        minStock: 'מינימום {n}',
        belowMin: 'מתחת למינימום ({n})',
        noImage: 'אין תמונה למוצר',
        moreLabels: 'עוד {n} תוויות: {names}',
        edit: 'עריכה',
        archive: 'ארכיון',
        restore: 'שחזור',
    },

    empty: {
        noneTitle: 'עדיין אין מוצרי מדף בקטלוג',
        noneSub: 'המוצר הראשון שתוסיף יופיע כאן ובקטלוג המטפלים לאחר פרסום',
        filteredTitle: 'אין מוצרים שתואמים את הסינון',
        filteredSub: 'נסה חיפוש אחר, תווית אחרת או סטטוס אחר',
    },

    editor: {
        newTitle: 'מוצר מדף חדש',
        editTitle: 'עריכת מוצר',
        skuMeta: 'מק״ט {sku}',
        localCatalog: 'הקטלוג מנוהל במערכת שלנו בלבד',
        unsaved: '● יש שינויים שלא נשמרו',
        missing: 'חסר: {list}',
        saveNew: 'שמור מוצר',
        save: 'שמור שינויים',
        full: 'מסך מלא',
        collapse: 'צמצם',
        close: 'סגירה',

        cards: {
            details: 'פרטי המוצר',
            price: 'מחיר',
            image: 'תמונת מוצר',
            stock: 'מלאי ומלאי מינימום',
        },

        // The short nouns the "missing:" line in the drawer header lists.
        need: {
            name: 'שם מוצר',
            content: 'תוכן',
            net: 'מחיר לפני מע״מ',
            sku: 'מק״ט תקין',
            skuUnique: 'מק״ט ייחודי',
            labels: 'עד {max} תוויות',
            weight: 'משקל ויחידת מידה',
            minStock: 'מלאי מינימום',
        },

        fields: {
            name: {
                label: 'שם המוצר',
                placeholder: 'שם המוצר כפי שיוצג למטפלים',
                hint: '{min}–{max} תווים',
                tooShort: 'נא להזין שם מוצר',
                tooLong: 'עד {max} תווים',
            },
            content: {
                label: 'תוכן',
                placeholder: 'למשל: 60 כמוסות · 100 מ״ל · 50 גרם',
                hint: 'מה מכילה האריזה · עד {max} תווים',
                required: 'נא להזין את תוכן האריזה',
                tooLong: 'עד {max} תווים',
            },
            sku: {
                label: 'מק״ט',
                placeholder: 'ABC-1234',
                hint: '{min}–{max} תווים · ספרות, אותיות לטיניות ומקף · מזהה ייחודי במערכת',
                required: 'נא להזין מק״ט',
                length: 'מק״ט באורך {min}–{max} תווים',
                chars: 'ספרות, אותיות לטיניות ומקף בלבד',
                taken: 'מק״ט זה כבר קיים במערכת',
            },
            net: {
                label: 'מחיר לפני מע״מ',
                hint: 'עד שתי ספרות אחרי הנקודה',
                required: 'נא להזין מחיר לפני מע״מ',
                invalid:
                    'מחיר חייב להיות מספר גדול מ-0, עד שתי ספרות אחרי הנקודה',
            },
            labels: {
                label: 'תוויות',
                hint: 'עד {max} תוויות למוצר ({n}/{max}) · התווית מוצגת על כרטיס המוצר וגם משמשת כמסנן בקטלוג המטפלים',
                tooMany: 'עד {max} תוויות למוצר',
            },
            uom: {
                label: 'יחידת מידה למשקל',
                choose: 'בחר יחידת מידה…',
                required: 'נא לבחור יחידת מידה',
            },
            weight: {
                label: 'משקל',
                placeholderWithUom: 'כמות ב{uom}',
                placeholderNoUom: 'בחר תחילה יחידת מידה',
                hintWithUom: 'הערך יוצג כ־{value} {uom}',
                hintNoUom: 'שדה הערך נפתח אחרי בחירת יחידת מידה',
                required: 'נא להזין משקל גדול מ-0',
            },
            minStock: {
                label: 'מלאי מינימום',
                hint: 'ברירת המחדל היא {n} יחידות',
                required: 'נא להזין מלאי מינימום',
                integer: 'מספר שלם בלבד',
                tooLarge: 'עד {max} יחידות',
            },
        },

        stock: {
            available: 'מלאי זמין',
            availableHint: 'מנוהל במסך מלאי ואצוות · לקריאה בלבד',
            // The rule an engineer would otherwise get wrong: the product stays
            // listed and is marked sold out; it is not removed from the catalog.
            note: 'מתחת למלאי הזה לא יימכרו יותר פריטים — לא באתר הצרכני ולא באתר הרוקחי. המוצר ממשיך להופיע בקטלוג ומסומן כאזל עד שהמלאי יחזור מעל המינימום.',
            blocked:
                'כרגע המלאי הזמין ({stock}) נמוך מהמינימום ({min}) — המוצר חסום למכירה בשני האתרים.',
        },
    },

    sim: {
        title: 'סימולציית מחיר',
        net: 'מחיר לפני מע״מ',
        vat: 'מע״מ ({rate})',
        gross: 'מחיר אחרי מע״מ',
        display: 'מחיר לתצוגה',
        roundUp: 'תוספת עיגול',
        note: 'שיעור המע״מ נקבע בהגדרות המערכת · המחיר לתצוגה מעוגל תמיד כלפי מעלה לשקל שלם וזהו המחיר שהמטפל רואה בקטלוג.',
    },

    image: {
        dropTitle: 'גרור לכאן תמונה או לחץ לבחירה',
        dropHint: '{types} · עד {size}MB · מומלץ ריבועי {px}×{px}',
        chooseAria: 'בחירת תמונת מוצר',
        previewAlt: 'תצוגה מקדימה של תמונת המוצר',
        remove: 'הסרת תמונה',
        // The drop zone previews the file in the browser and uploads nothing.
        localOnly:
            'התמונה מוצגת מהקובץ שבמחשב שלך בלבד ולא הועלתה לשרת. היא תוצג עד לרענון הדף.',
        typeError: 'סוג קובץ לא נתמך — נדרש {types}',
        sizeError: 'הקובץ גדול מ-{size}MB',
        loadFailed: 'התמונה לא נטענה',
    },

    picker: {
        searchPlaceholder: 'חיפוש תווית לבחירה',
        aria: 'בחירת תוויות',
        none: 'לא נמצאה תווית בשם ״{term}״',
        atMax: 'נבחרו {n} תוויות — המקסימום למוצר',
        createNew: 'צור תווית חדשה',
        remove: 'הסר את התווית {name}',
    },

    labels: {
        title: 'ניהול תוויות',
        note: 'התווית מוצגת על כרטיס המוצר באתר ומשמשת גם כמסנן שהמטפל מסנן לפיו את הקטלוג. שינוי שם מתעדכן מיידית בכל המוצרים המקושרים.',
        countLabel: 'תוויות מתוך {total}',
        searchPlaceholder: 'חיפוש תווית',
        searchAria: 'חיפוש תווית',
        useAria: 'שימוש במוצרים',
        useAll: 'שימוש — הכל',
        used: 'בשימוש',
        unused: 'לא בשימוש',
        newLabel: 'תווית חדשה',
        nameLabel: 'שם התווית',
        namePlaceholder: 'למשל: שינה · כאבי בטן · חיסון',
        nameHint: '{min}–{max} תווים · שם ייחודי',
        add: 'הוסף תווית',
        cancel: 'ביטול',
        renameAria: 'שם חדש לתווית',
        rename: 'שינוי שם',
        saveRename: 'שמור',
        delete: 'מחיקה',
        colName: 'שם התווית',
        colUse: 'שימוש',
        colCreated: 'נוצרה בתאריך',
        usedIn: 'משמשת ב-{n} מוצרים',
        notUsed: 'לא בשימוש',
        emptyTitle: 'עדיין אין תוויות במערכת',
        emptySub: 'התווית הראשונה תופיע גם ככרטיס וגם כמסנן בקטלוג המטפלים',
        createFirst: 'צור תווית ראשונה',
        noMatchTitle: 'לא נמצאה תווית תואמת',
        noMatchSub: 'נסה חיפוש אחר',
        clearSearch: 'נקה חיפוש',
        tooShort: 'שם תווית חייב להכיל לפחות {min} תווים',
        tooLong: 'עד {max} תווים',
        duplicate: 'תווית בשם הזה כבר קיימת',
    },

    confirm: {
        archive: {
            title: 'ארכיון מוצר · {name}',
            body: 'המוצר ״{name}״ (מק״ט {sku}) יועבר לארכיון.',
            confirm: 'העבר לארכיון',
            effect1: 'המוצר יוסר מקטלוג המטפלים ולא יהיה ניתן להזמנה',
            effect2: 'הזמנות קיימות שכוללות אותו לא ישתנו',
            effect3: 'ניתן לשחזר את המוצר בכל רגע — אין מחיקה סופית של מוצר',
            effect4: 'העברת המוצר לארכיון, הסיבה והמבצע יירשמו ביומן המערכת',
        },
        restore: {
            title: 'שחזור מוצר · {name}',
            body: 'המוצר ״{name}״ יוחזר מהארכיון לקטלוג.',
            confirm: 'שחזר מוצר',
            effect1: 'המוצר יוצג שוב בקטלוג המטפלים ויהיה ניתן להזמנה',
            effect2: 'המחיר המוצג יהיה {price} כולל מע״מ',
            effect3: 'השחזור יירשם ביומן המערכת',
        },
        leave: {
            title: 'יציאה ללא שמירה',
            body: 'בטופס יש שינויים שלא נשמרו.',
            confirm: 'צא בלי לשמור',
            effect1: 'השינויים שביצעת יאבדו',
            effect2: 'המוצר יישאר כפי שהיה לפני הפתיחה',
        },
        renameLabel: {
            title: 'שינוי שם תווית',
            body: 'התווית ״{from}״ תשונה ל״{to}״.',
            confirm: 'שנה שם',
            effect1: 'השם יתעדכן מיידית ב-{n} מוצרים המקושרים לתווית',
            effect2: 'שם המסנן בקטלוג המטפלים יתעדכן בהתאם',
            effect3: 'הפעולה תירשם ביומן המערכת',
        },
        deleteLabel: {
            title: 'מחיקת תווית · {name}',
            bodyUsed: 'התווית ״{name}״ מקושרת כרגע ל-{n} מוצרים: {names}.',
            bodyUsedMore:
                'התווית ״{name}״ מקושרת כרגע ל-{n} מוצרים: {names} ועוד {rest}.',
            bodyFree: 'התווית ״{name}״ אינה מקושרת לאף מוצר.',
            confirm: 'מחק תווית',
            effectUsed: 'התווית תוסר מ-{n} מוצרים',
            effectFree: 'לא מקושרים לתווית מוצרים כלשהם',
            effect2: 'המסנן ייעלם מקטלוג המטפלים באתר',
            effect3: 'המוצרים עצמם לא יימחקו ולא ישתנו בשום דרך אחרת',
            effect4: 'המחיקה, הסיבה והמבצע יירשמו ביומן המערכת',
        },
    },

    toast: {
        created: 'המוצר נוצר',
        updated: 'המוצר עודכן',
        savedBody: '{name} · מוצג בקטלוג המטפלים',
        archived: 'המוצר הועבר לארכיון',
        archivedBody: '{name} · הוסר מקטלוג המטפלים',
        restored: 'המוצר שוחזר',
        restoredBody: '{name} · חזר לקטלוג המטפלים',
        exported: 'הקטלוג יוצא לקובץ',
        exportedBody: '{n} שורות · {file}',
        labelCreated: 'התווית נוצרה',
        labelRenamed: 'שם התווית עודכן',
        labelRenamedBody: '{from} ← {to}',
        labelDeleted: 'התווית נמחקה',
        labelDeletedBody: '{name} · הוסרה מ-{n} מוצרים',
    },

    export: {
        colName: 'שם המוצר',
        colContent: 'תוכן',
        colSku: 'מק״ט',
        colNet: 'מחיר לפני מע״מ',
        colGross: 'מחיר לצרכן',
        colWeight: 'משקל',
        colUom: 'יחידת מידה',
        colStock: 'מלאי זמין',
        colMinStock: 'מלאי מינימום',
        colStatus: 'סטטוס',
        colLabels: 'תוויות',
        rows: '{n} שורות',
    },
};
