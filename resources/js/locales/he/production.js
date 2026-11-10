// הוראות ייצור — the production-orders screen and the cards that read it.
export default {
    // דף העבודה שהוראת ייצור יוצאת איתו למעבדה.
    sheet: {
        title: 'דף עבודה · ייצור',
        printedOn: 'הודפס {date}',
        item: 'הפריט',
        recipe: 'מתכון',
        version: 'גרסה {v}',
        planned: 'כמות לייצור',
        opened: 'נפתחה',
        due: 'תאריך יעד',
        components: 'רכיבים',
        colSku: 'מק״ט',
        colName: 'רכיב',
        colQty: 'כמות',
        colTaken: 'נלקח',
        colBatch: 'אצווה',
        result: 'התוצאה',
        yieldQty: 'כמות שיצאה',
        wasteQty: 'פחת',
        batchNo: 'מספר אצווה',
        expiresOn: 'תוקף',
        signature: 'חתימות',
        madeBy: 'ביצע/ה',
        checkedBy: 'בדק/ה',
    },
    tab: {
        orders: 'הוראות ייצור',
        lead: 'זמנים לפי סוג הכנה',
    },
    title: 'הוראות ייצור',
    sub: '{open} פתוחות · {completed} הושלמו ב־30 הימים האחרונים',
    countLabel: 'מתוך {total} הוראות',

    // config/production.js PRODUCTION_STATE_IDS
    state: {
        issued: 'הוצאה לייצור',
        completed: 'הושלמה',
        cancelled: 'בוטלה',
    },
    // הוראה שחלק ממנה כבר נקלט למלאי והיתרה עוד במעבדה.
    partial: 'נקלטה חלקית',
    overdue: 'באיחור',

    filterGroup: {
        state: 'מצב',
        what: 'מה מייצרים',
        who: 'מי',
        size: 'כמות',
    },

    filter: {
        noun: 'הוראות ייצור',
        search: 'מספר הוראה · שם · מק״ט · אצווה',
        field: {
            rstate: 'מצב ההוראה',
            rprep: 'סוג הכנה',
            ritem: 'פריט',
            rby: 'נפתחה על ידי',
            rwaste: 'פחת',
            rqty: 'כמות לייצור',
        },
        wasteState: {
            yes: 'עם פחת',
            no: 'ללא פחת',
        },
    },

    kpi: {
        open: 'הוראות פתוחות',
        openSub: 'במעבדה, טרם נקלטו במלאי',
        produced: 'הושלמו ב־30 הימים האחרונים',
        producedSub: 'לחיצה מסננת',
        waste: 'פחת החודש',
        wasteSub: 'מתוך כל מה שיוצר',
    },

    col: {
        id: 'הוראה',
        parent: 'מה מייצרים',
        prepType: 'סוג הכנה',
        planned: 'כמות',
        state: 'מצב',
        when: 'תאריך',
        due: 'תאריך יעד',
        output: 'אצוות שנפתחו',
        by: 'נפתחה על ידי',
    },

    cell: {
        yielded: 'יצא {qty} {uom} · פחת {waste} {uom}',
        received: 'נקלטו {qty} {uom} עד עכשיו',
    },

    empty: {
        title: 'אין הוראות ייצור שמתאימות',
        sub: 'נקו את הסינון או פתחו הוראה חדשה',
    },

    action: {
        create: 'הוראת ייצור חדשה',
        receive: 'קליטה למלאי',
        cancel: 'ביטול ההוראה',
        cancelRest: 'ביטול היתרה',
        print: 'הדפסת דף עבודה',
        printLabel: 'מדבקת הוראה',
        printFailed: 'ההדפסה נחסמה על ידי הדפדפן',
    },

    // מצב המלאי של רכיב, כמו בהוראת הייצור של סאפ.
    stock: {
        onHand: 'במלאי',
        avail: 'זמין',
        onOrder: 'בהזמנה',
        // כמה יישאר על המדף אחרי שההוראה הזו תיקח את חלקה.
        leftAfter: 'נותר במלאי אחרי ההוצאה',
        // האם כבר יש הזמנה מספק בדרך, כמה, ובאיזו הזמנה.
        supplierOrder: 'הזמנת ספק בתהליך',
        supplierYes: 'כן',
        supplierNo: 'לא',
        supplierOn: 'בהזמנה {list}',
        supplierDraft: 'טיוטה {list} — טרם נשלחה לספק',
    },

    // הערות למעבדה: אחת להוראה הזו בלבד, והקבועות שעוברות מכרטיס הפריט.
    notes: {
        title: 'הערות למעבדה',
        standing: 'הערות קבועות מכרטיס הפריט',
        fromItem: 'הערות הפריט:',
        fromRecipe: 'הערת המתכון:',
        fromItemLong: 'הערות קבועות · כרטיס הפריט',
        fromRecipeLong: 'הערות קבועות · המתכון',
        standingNone: 'אין לפריט הערות קבועות.',
        standingHint:
            'נכתבות בכרטיס הפריט ועוברות לכל הוראת ייצור שלו. ההוראה שומרת אותן כפי שהן היום.',
        lab: 'הערה למעבדה — להוראה הזו בלבד',
        labShort: 'הערה להוראה הזו',
        labPlaceholder: 'לדוגמה: לסיים את כל הצמח 100002',
        labHint: 'לא עוברת להוראה הבאה של אותו פריט.',
        none: 'אין הערות להוראה הזו.',
        // הערות פנימיות — של בית המרקחת בלבד, לא מודפסות ולא עוברות למעבדה.
        internal: 'הערות פנימיות',
        internalPlaceholder:
            'לדוגמה: אם התפוקה טובה — להגדיל את הכמות בהוראה הבאה',
        internalHint:
            'לשימוש פנימי בלבד — לא מודפסות בדף העבודה ובמדבקות, ולא עוברות למעבדה.',
        internalNone: 'אין הערות פנימיות.',
        internalSaved: 'ההערה הפנימית נשמרה',
    },

    // יעד הוראת ייצור לפי סוג הכנה — בלשונית ״זמנים לפי סוג הכנה״.
    target: {
        col: 'יעד להוראת ייצור',
        days: 'ימים',
        none: '—',
        hint: 'יעד להוראת ייצור: כמה ימים אחרי שנפתחת הוראה, תצורה כזו אמורה לחזור מהמעבדה (טינקטורה — 21 ימי מיצוי). ההוראה מקבלת ממנו תאריך יעד, ואפשר להזיז אותו בכל הוראה לפי העומס. ריק — אין יעד קבוע.',
        saved: 'יעד הוראת הייצור עודכן',
    },

    drawer: {
        by: 'נפתחה ע״י {name}',
        railAria: 'שלבי ההוראה',
        details: 'פרטי ההוראה',
        planned: 'כמות לייצור',
        recipe: 'עץ מוצר',
        created: 'נפתחה',
        issuedOn: 'הוצאה לייצור',
        completedOn: 'הושלמה',
        cancelledOn: 'בוטלה',
        reason: 'סיבת הביטול',
        closedShort: 'נסגרה לפני הסוף',
        due: 'תאריך יעד',
        dueNone: 'אין תאריך יעד — אפשר לקבוע כאן.',
        dueByType: '{n} ימים לפי {type}. אפשר להזיז לפי העומס במעבדה.',
        dueManual: 'נקבע ידנית.',
        dueLate: 'עבר לפני יום אחד | עבר לפני {n} ימים',
        received: 'נקלט עד עכשיו',
        receivedOf: '{qty} מתוך {planned} {uom}',
        yield: 'תפוקה',
        waste: 'פחת',
        noWaste: 'ללא פחת',
        wasteKept: 'נרשם בלבד',
        expiry: 'תוקף האצווה',
        cost: 'עלות הרכיבים',
        costValue: '{total} · {unit} ל־{uom}',
        components: 'רכיבים ואצוות',
        compItem: 'רכיב',
        compPlanned: 'לפי המתכון',
        compPicks: 'נלקח מאצוות',
        compActual: 'בפועל',
        noBatch: 'ללא אצווה — נרשם על המלאי בלבד',
        short: '{qty} {uom} ללא כיסוי באצווה פתוחה',
        taken: 'ירדו {qty}',
        outputBatch: 'אצוות התפוקה',
        wasteBatch: 'אצוות הפחת',
        receipts: 'קליטות למלאי',
        rcptWhen: 'מתי',
        rcptQty: 'כמות',
        rcptLabels: 'מדבקות',
        rcptFinal: 'קליטה אחרונה',
        rcptPart: 'חלק {n}',
        rcptWaste: 'פחת {qty} {uom}',
        rcptAdded: 'נוסף לאצווה של החלק הקודם',
        reprint: 'הדפסת מדבקות האצווה שוב',
    },

    create: {
        title: 'הוראת ייצור חדשה',
        // בסאפ בוחרים מוצר וההוראה טוענת את עץ המוצר שלו; OITT מחזיק שורה
        // אחת לכל מק״ט, ולכן המתכון והמוצר הם אותה בחירה.
        product: 'מוצר',
        productChoose: 'בחירת מוצר…',
        productSearch: 'חיפוש לפי שם או מק״ט',
        productSearchAria: 'חיפוש מוצר לייצור',
        productFound: 'מוצר אחד מתוך {total} | {n} מוצרים מתוך {total}',
        productNone: 'אין מוצר שמתאים לחיפוש',
        recipeHint: 'המתכון מניב {qty} {uom} לריצה · המלאי מאפשר {runs} ריצות',
        qty: 'כמות לייצור',
        uom: 'יחידת מידה',
        uomHint: 'לפי כרטיס הפריט — לא ניתן לשינוי',
        due: 'תאריך יעד',
        dueHint:
            '{n} ימים לפי {type}. אפשר להזיז לפי העומס במעבדה וסדר העדיפויות.',
        dueNone:
            'ל{type} עדיין אין יעד קבוע — אפשר לקבוע תאריך כאן, או להגדיר יעד בלשונית ״זמנים לפי סוג הכנה״.',
        preview: 'מה ייצא מהמלאי',
        save: 'פתיחת ההוראה ושליחה למעבדה',

        pick: {
            manual: 'בחירת אצווה ידנית',
            auto: 'אוטומטי · FEFO',
            autoBack: 'חזרה לבחירה האוטומטית',
            title: 'אצוות פתוחות — {name}',
            needed: 'נדרש {qty} {uom}',
            allocated: 'הוקצה {qty} מתוך {needed} {uom}',
            none: 'אין אצווה פתוחה לרכיב הזה',
            batchCol: 'אצווה',
            expiryCol: 'תוקף',
            remainingCol: 'במלאי',
            qtyCol: 'כמות מאצווה זו',
        },
    },

    // קליטה למלאי — כולה, או חלק ממנה.
    receive: {
        title: 'קליטה למלאי · {id} · {name}',
        progress:
            'בהוראה {planned} {uom} · נקלטו עד עכשיו {received} · נותרו {left} {uom}',
        kind: {
            label: 'סוג הקליטה',
            final: 'קליטה אחרונה — ההוראה תיסגר',
            partial: 'קליטה חלקית — ההוראה נשארת פתוחה',
            hint: {
                final: 'כל מה שנשאר מהרכיבים יורד מהמלאי וההוראה מסתיימת.',
                partial:
                    'יורד רק החלק היחסי של הרכיבים. היתרה נשארת פתוחה ושמורה.',
            },
        },
        yield: 'כמות שנקלטת עכשיו',
        yieldHint: 'ב{uom}, כמו כמות ההוראה',
        batch: {
            label: 'אצווה',
            new: 'אצווה חדשה · {next}',
            add: 'הוספה לאצווה {batch}',
            hint: {
                new: 'המספר הבא בסדרה הרצה, מוקצה אוטומטית.',
                add: 'אותו מספר ואותם תאריכים — אותה אצווה שחזרה בשני חלקים.',
            },
        },
        coversAll:
            'הכמות הזו מכסה את כל מה שנותר מההוראה. אם זה החלק האחרון — בחרו ״קליטה אחרונה״.',
        closeOnly:
            'לא נקלט דבר נוסף: ההוראה תיסגר, ומה שנותר מהרכיבים יורד מהמלאי.',
        saveFinal: 'קליטה וסגירת ההוראה',
        savePartial: 'קליטה חלקית',
        saved: 'נקלטו {qty} {uom} לאצווה {batch}.',
        stillOpen: 'ההוראה נשארת פתוחה ליתרה.',
        labels: {
            count: 'כמה מדבקות אצווה להדפיס',
            noPack: 'לא הוגדר גודל מכל לפריט או למשפחה שלו — הקלידו את מספר המדבקות.',
            byItem: 'לפי {name} של {size}, מכרטיס הפריט.',
            byFamily: 'לפי מכל של {size} — ההגדרה של ״{family}״.',
            print: 'הדפסת מדבקה אחת | הדפסת {n} מדבקות',
            skip: 'בלי הדפסה',
        },
    },

    complete: {
        waste: 'פחת',
        wasteHint: 'לפי המתכון צפוי {pct}% פחת',
        wasteNone: 'המתכון אינו צופה פחת',
        expiry: 'תוקף האצווה החדשה',
        expiryHint: '{months} חודשים לפי סוג ההכנה — ניתן לשנות',
        actual: '{name} — כמות בפועל',
        actualHint: 'לפי המתכון {qty} {uom}',
        note: 'הערה',
    },

    cancel: {
        title: 'ביטול הוראת ייצור',
        body: '{id} · {name} תבוטל. הרשומה נשמרת ביומן.',
        releases: 'הרכיבים ששוריינו יחזרו להיות זמינים',
        keepsReceived: 'מה שכבר נקלט נשאר במלאי, באצוות שנפתחו',
        confirm: 'ביטול ההוראה',
        // הוראה שחלק ממנה כבר נקלט — נסגרת על מה שנקלט, לא מבוטלת.
        restTitle: 'ביטול היתרה וסגירת ההוראה',
        restBody:
            '{id} · {name} תיסגר על מה שכבר נקלט ({qty} {uom}). היתרה לא תיוצר.',
        restConfirm: 'ביטול היתרה',
    },

    toast: {
        created: 'הוראת הייצור נפתחה',
        createdBody: '{id} · {name}',
        received: 'חלק מההוראה נקלט למלאי',
        completed: 'הייצור הושלם',
        completedBody: 'אצווה {batch} · {qty} {uom}',
        cancelled: 'הוראת הייצור בוטלה',
        closedShort: 'ההוראה נסגרה על מה שנקלט',
    },

    log: {
        create: 'פתיחת הוראת ייצור',
        issue: 'הוצאת הוראת ייצור',
        complete: 'השלמת הוראת ייצור',
        cancel: 'ביטול הוראת ייצור',
    },
};
