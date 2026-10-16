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

    // config/catalog.js LADDER_ERROR_IDS — why the store refuses to save a group.
    ladderError: {
        group_conflict: 'קבוצת הפריט כבר שייכת למחירון אחר',
        base_qty: 'כמות הבסיס חייבת להיות גדולה מאפס',
        breaks_empty: 'המחירון חייב לכלול לפחות טווח כמות אחד',
        breaks_ascending: 'טווחי הכמות חייבים לעלות מקטן לגדול',
        percents_length: 'לכל טווח כמות חייב להיות אחוז הנחה',
        percent_range: 'אחוז ההנחה חייב להיות בין 0 ל־100',
        percent_decreasing: 'ההנחה אינה יכולה לקטון ככל שהכמות עולה',
        percent_below_base:
            'טווח שמתחיל בכמות הבסיס או מתחתיה חייב להיות ללא הנחה',
    },

    // config/catalog.js PRICE_IMPORT_ERROR_IDS — why an imported row failed.
    importError: {
        group_not_found: 'קבוצת התמחור לא נמצאה',
        range_not_in_group: 'טווח הכמות אינו קיים בקבוצה',
        invalid_value: 'ערך לא תקין — נדרש אחוז הנחה',
    },

    // The band table the editor, the item calculator and the drawer share.
    ladder: {
        range: 'טווח כמות',
        pct: 'הנחה',
        unit: 'מחיר ליחידה',
        unitInclVat: 'כולל מע״מ',
        example: 'סה״כ לדוגמה',
        base: 'בסיס',
        off: '−{pct}',
        vatNote: 'המחירים מוצגים לפני מע״מ וכולל מע״מ ({rate})',
        andUp: '{from}+',
        upTo: '{from}–{to}',
        chartAria: 'גרף מחיר ליחידה לפי כמות',
        chartX: 'כמות ({uom})',
        // A ladder steps by multiples, so the axis does too.
        chartScale: 'ציר הכמות לוגריתמי',
    },

    filters: {
        option: '{label} ({n})',
        searchPlaceholder: 'שם קבוצה · תחילית · מק״ט (למשל 200455)',
        searchAria: 'חיפוש קבוצות תמחור',
        uomAria: 'יחידת מידה',
        uomAll: 'יחידת מידה — הכל',
        scaleCustom: 'מותאם אישית',
        scaleDefault: 'ברירת מחדל',
        fillAria: 'שיוך מק״טים ומחירים',
        fillAll: 'שיוך ומחירים — הכל',
        fillNone: 'ללא מק״טים משויכים',
        fillHas: 'עם מק״טים משויכים',
    },

    lookup: {
        resolved: 'מק״ט {sku} מתומחר על ידי {group} (קבוצת הפריט {itemGroup})',
        resolvedNamed:
            'מק״ט {sku} · {name} מתומחר על ידי {group} (קבוצת הפריט {itemGroup})',
        open: 'פתיחת הקבוצה',
        unresolved: 'מק״ט {sku} אינו משויך לאף קבוצת תמחור.',
    },

    table: {
        group: 'קבוצת תמחור',
        uom: 'יחידת מידה',
        base: 'מחיר ליחידה',
        ladder: 'המחירון',
        matched: 'מק״טים משויכים',
        updated: 'עדכון אחרון',
        from: 'החל מ־{price} {per}',
        baseQty: 'כמות בסיס',
        baseQtyValue: 'עד {qty} {uom} — ללא הנחה',
        bands: '{n} טווחים · עד {pct}',
        items: 'פריטים מתומחרים',
        itemsNone: 'אף פריט אינו מתומחר ע״י קבוצה זו',
        itemsAria: 'הפריטים המתומחרים ע״י {name}',
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
            title: 'טבלת המחירים',
            sub: 'טווחי הכמות של הקבוצה, ואחוז ההנחה בכל טווח — מחיר ל{uom} אחת',
            subLocked: 'בחרו יחידת מידה בשלב 1 כדי לפתוח את הטבלה',
        },

        name: {
            label: 'שם הקבוצה',
            placeholder: 'למשל: שמנים אתריים',
        },

        // The groups' own names are data, never translated — see ItemGroupPicker.
        itemGroups: {
            label: 'קבוצות פריט',
            // The rule the whole screen is built around: one item, one scale.
            hint: 'בחרו קבוצת פריט אחת או יותר. כל קבוצת פריט שייכת למחירון אחד בלבד — קבוצה שכבר תפוסה מוצגת נעולה עם שם המחירון שמחזיק אותה.',
            search: 'חיפוש קבוצה',
            none: 'טרם נבחרה קבוצת פריט',
            chosen: 'נבחרה קבוצה אחת · {items} פריטים | {n} קבוצות · {items} פריטים',
            heldBy: 'הקבוצה כבר שייכת למחירון ״{group}״',
            noMatch: 'אין קבוצת פריט שמתאימה לחיפוש.',
        },

        uomField: {
            label: 'יחידת מידה',
            choose: '— בחירה —',
        },

        baseQty: {
            label: 'כמות בסיס',
            hint: 'עד כמות זו (כולל) המחיר ליחידה מלא — ההנחה מתחילה מעליה. הכמות נמדדת ביחידת המכירה של הפריט.',
            required: 'יש להזין כמות בסיס גדולה מאפס',
        },

        // Not a field of the group — the assumption the table is read under.
        previewPrice: {
            line: 'נניח לרגע שמחיר הפריט הוא {price} ל{uom} אחת:',
            note: 'מספר להמחשה בלבד. הוא אינו נשמר ואינו משפיע על דבר — המחיר האמיתי נקבע בכרטיס הפריט.',
            aria: 'מחיר להמחשה',
        },

        pctTable: {
            pct: 'אחוז הנחה',
            pctAria: 'אחוז הנחה בטווח {n}',
            pctRequired: 'יש להזין אחוז הנחה',
            pctRange: 'בין 0 ל־100',
            pctDecreasing: 'ההנחה קטנה מהטווח הקודם',
            pctBase: 'עד כמות הבסיס — ללא הנחה',
            unitAt: 'מחיר ליחידה לפי {price}',
        },

        preview: {
            label: 'מק״טים משויכים — תצוגה חיה',
            head: '{n} מק״טים מתוך {total} בקטלוג',
            headFound: '{n} מתוך {matched} המק״טים של הקבוצה',
            search: 'חיפוש מק״ט או שם',
            noSearchMatch: 'אין מק״ט מתאים לחיפוש בתוך הקבוצה',
            noPrefix: 'הוסיפו תחילית מק״ט כדי לראות אילו פריטים ייכללו בקבוצה',
            noMatch: 'אף מק״ט בקטלוג אינו מתחיל בתחיליות שהוזנו',
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
        effectItems:
            '{n} פריטים ששויכו לקבוצה ידנית יחזרו לברירת המחדל לפי קידומת',
    },

    // The price calculator on the item card — stores/catalog.js ladderFor().
    calculator: {
        more: 'ועוד {n} טווחים',
        title: 'מחשבון מחיר לפי כמות',
        sub: 'מחיר היחידה של הפריט לאחר מחירון ״{group}״',
        fixed: 'המחיר קבוע — לא נקבע לו מחירון מדורג',
        fixedSub: 'הפריט נמכר במחיר היחידה שלו בכל כמות',
        noPrice: 'לא הוזן מחיר ליחידה — המחשבון יופיע לאחר שיוזן',
        uomMismatch: 'יחידת המחירון שונה מיחידת המכירה של הפריט',
        uomMismatchSub:
            'המחירון נכתב ל{groupUom}, הפריט נמכר ב{itemUom} — הכמויות מחושבות ביחידת הפריט, ללא המרה',
        groupDefault: 'ברירת מחדל לפי קידומת: {name}',
        groupExplicit: 'שיוך ידני: {name}',
        groupNone: 'קבוע — ללא מחירון',
        groupInherit: 'ברירת מחדל לפי קידומת',
        groupInheritNone: 'ברירת מחדל לפי קידומת — אף קבוצה אינה תואמת',
        groupMissing: 'הקבוצה שהפריט שויך אליה אינה קיימת עוד',
        qtyLabel: 'כמות',
        qtyAria: 'כמות לחישוב',
        result: '{qty} {uom} ← {unit} ליחידה · {total} סה״כ',
        resultInclVat: 'כולל מע״מ: {unit} ליחידה · {total} סה״כ',
        atBase: 'מחיר בסיס',
        atTop: 'מחיר בטווח הגבוה ביותר ({from}+)',
    },

    // The drawer behind the "items priced" count — stores/catalog.js itemsOfGroup().
    itemsDrawer: {
        title: 'פריטים המתומחרים ע״י ״{name}״',
        // שם קצר לצ'יפ במגש החלונות, בלי שם הקבוצה שכבר מופיע לידו.
        window: 'קבוצת מחירון',
        sub: '{n} פריטים · לפי שיוך ידני או לפי קידומת מק״ט',
        close: 'סגירה',
        open: 'פתיחת כרטיס הפריט',
        col: {
            code: 'מק״ט',
            name: 'שם הפריט',
            uom: 'יח׳ מכירה',
            unitPrice: 'מחיר ליחידה',
            atBase: 'בבסיס ({qty}+)',
            atTop: 'בטווח הגבוה ({qty}+)',
            itemGroup: 'קבוצת הפריט',
        },
        noPrice: 'ללא מחיר',
        uomMismatch: 'יחידת המכירה שונה מיחידת המחירון',
        empty: 'אף פריט אינו מתומחר ע״י קבוצה זו',
        emptySub:
            'הוסיפו תחילית מק״ט שתואמת פריטים, או שייכו פריטים לקבוצה מכרטיס הפריט',
        export: 'ייצוא הרשימה',
    },

    // The spreadsheet import review — stores/catalog.js applyPriceImport().
    import: {
        title: 'ייבוא מחירון מקובץ',
        file: 'קובץ: {name}',
        sub: '{n} שורות · {ok} תקינות · {bad} שגויות',
        col: {
            group: 'קבוצת תמחור',
            range: 'טווח כמות',
            old: 'הנחה נוכחית',
            next: 'הנחה חדשה',
            state: 'מצב',
        },
        ok: 'תקין',
        raw: 'ערך בקובץ: ״{raw}״',
        apply: 'החלת {n} שורות תקינות',
        applied: 'המחירון עודכן',
        appliedBody: '{applied} שורות הוחלו · {skipped} נדחו',
        rejected: 'הקבוצה ״{group}״ לא עודכנה — המחירון המתקבל אינו תקין',
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
        colPct: 'אחוז הנחה',
        rows: '{n} שורות',
    },
};
