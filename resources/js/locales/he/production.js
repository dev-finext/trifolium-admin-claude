// הוראות ייצור — the production-orders screen and the cards that read it.
export default {
    title: 'הוראות ייצור',
    sub: '{open} פתוחות · {completed} הושלמו החודש',
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

    action: {
        create: 'הוראת ייצור חדשה',
        issue: 'הוצאה לייצור',
        complete: 'השלמת ייצור',
        cancel: 'ביטול ההוראה',
        print: 'הדפסה',
    },

    log: {
        create: 'פתיחת הוראת ייצור',
        issue: 'הוצאת הוראת ייצור',
        complete: 'השלמת הוראת ייצור',
        cancel: 'ביטול הוראת ייצור',
    },
};
