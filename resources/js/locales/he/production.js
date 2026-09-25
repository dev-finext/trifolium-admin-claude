// הוראות ייצור — the production-orders screen and the cards that read it.
export default {
    title: 'הוראות ייצור',
    sub: '{open} פתוחות · {completed} הושלמו ב־30 הימים האחרונים',
    countLabel: 'מתוך {total} הוראות',

    // config/production.js PRODUCTION_STATE_IDS
    state: {
        planned: 'מתוכננת',
        issued: 'הוצאה לייצור',
        completed: 'הושלמה',
        cancelled: 'בוטלה',
    },

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
            rqty: 'כמות מתוכננת',
        },
        wasteState: {
            yes: 'עם פחת',
            no: 'ללא פחת',
        },
    },

    kpi: {
        open: 'הוראות פתוחות',
        openSub: 'מתוכננות והוצאו לייצור',
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
        output: 'אצוות שנפתחו',
        by: 'נפתחה על ידי',
    },

    cell: {
        yielded: 'יצא {qty} {uom} · פחת {waste} {uom}',
    },

    empty: {
        title: 'אין הוראות ייצור שמתאימות',
        sub: 'נקו את הסינון או פתחו הוראה חדשה',
    },

    action: {
        create: 'הוראת ייצור חדשה',
        issue: 'הוצאה לייצור',
        complete: 'השלמת ייצור',
        cancel: 'ביטול ההוראה',
        print: 'הדפסה',
    },

    drawer: {
        by: 'נפתחה ע״י {name}',
        railAria: 'שלבי ההוראה',
        details: 'פרטי ההוראה',
        planned: 'כמות מתוכננת',
        recipe: 'עץ מוצר',
        created: 'נפתחה',
        issuedOn: 'הוצאה לייצור',
        completedOn: 'הושלמה',
        cancelledOn: 'בוטלה',
        reason: 'סיבת הביטול',
        yield: 'תפוקה',
        waste: 'פחת',
        noWaste: 'ללא פחת',
        expiry: 'תוקף האצווה',
        cost: 'עלות הרכיבים',
        costValue: '{total} · {unit} ל־{uom}',
        components: 'רכיבים ואצוות',
        compItem: 'רכיב',
        compPlanned: 'לפי המתכון',
        compPicks: 'נלקח מאצוות',
        compActual: 'בפועל',
        noBatch: 'ללא אצווה — נרשם על המלאי בלבד',
        short: 'חסר {qty} {uom} באצוות הפתוחות',
        output: 'מה נפתח',
        outputBatch: 'אצוות התפוקה',
        wasteBatch: 'אצוות הפחת',
    },

    create: {
        title: 'הוראת ייצור חדשה',
        bom: 'עץ מוצר',
        bomChoose: 'בחירת עץ מוצר…',
        recipeHint: 'המתכון מניב {qty} {uom} לריצה · המלאי מאפשר {runs} ריצות',
        qty: 'כמות לייצור',
        qtyHint: 'ב{uom}, לפי יחידת התפוקה של המתכון',
        notes: 'הערות לייצור',
        preview: 'מה ייצא מהמלאי',
        shortage:
            '{n} רכיבים חסרים באצוות הפתוחות — אפשר לפתוח את ההוראה ולהשלים כשהסחורה תיקלט',
        save: 'פתיחת ההוראה',
    },

    complete: {
        title: 'השלמת {id} · {name}',
        yield: 'כמות שיצאה',
        yieldHint: 'תוכנן {qty} {uom}',
        waste: 'פחת',
        wasteHint: 'לפי המתכון צפוי {pct}% פחת',
        wasteNone: 'המתכון אינו צופה פחת',
        expiry: 'תוקף האצווה החדשה',
        expiryHint: '{months} חודשים לפי סוג ההכנה — ניתן לשנות',
        actual: '{name} — כמות בפועל',
        actualHint: 'לפי המתכון {qty} {uom}',
        note: 'הערה',
        save: 'סיום הייצור ופתיחת האצווה',
    },

    cancel: {
        title: 'ביטול הוראת ייצור',
        body: '{id} · {name} תבוטל. הרשומה נשמרת ביומן.',
        releases: 'הרכיבים ששוריינו יחזרו להיות זמינים',
        confirm: 'ביטול ההוראה',
    },

    toast: {
        created: 'הוראת הייצור נפתחה',
        createdBody: '{id} · {name}',
        issued: 'ההוראה הוצאה לייצור',
        completed: 'הייצור הושלם',
        completedBody: 'נפתחה אצווה {batch} · {qty} {uom}',
        cancelled: 'הוראת הייצור בוטלה',
    },

    log: {
        create: 'פתיחת הוראת ייצור',
        issue: 'הוצאת הוראת ייצור',
        complete: 'השלמת הוראת ייצור',
        cancel: 'ביטול הוראת ייצור',
    },
};
