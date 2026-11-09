// רכש — שני הטאבים. הכותרות של עמודות הגיליון עצמו אינן כאן אלא ב-
// config/buying.js, כי הן מה שנכתב לקובץ האקסל ולא מה שמוצג על המסך.
export default {
    crumb: 'רכש ומלאי',
    title: 'רכש',
    sub: 'בקשות רכש והזמנות לספקים',

    tab: {
        request: 'בקשת רכש',
        order: 'הזמנת רכש',
    },

    action: {
        // The no-PO receipt — the only other door into stock besides
        // receiving against a specific order on its own sheet.
        receiveNoOrder: 'קנייה בלי הזמנה',
    },

    request: {
        one: 'בקשת רכש',
        pick: 'בקשה',
        new: 'בקשה חדשה',
        file: 'בקשת-רכש',
        ticked: 'בוצעו {done} מתוך {total}',
        emptyTitle: 'אין עדיין בקשות רכש',
        emptySub: 'בקשת רכש היא רשימת קניות: מה שרוצים, לפני שמדברים עם ספקים.',
    },

    order: {
        one: 'הזמנת רכש',
        pick: 'הזמנה',
        new: 'הזמנה חדשה',
        file: 'הזמנת-רכש',
        number: 'מספר הזמנה',
        supplierCode: 'קוד ספק',
        details: 'פרטי ההזמנה',
        openedOn: 'נפתחה',
        openedBy: 'נפתחה ע״י',
        sentOn: 'נשלחה',
        receivedOn: 'התקבלה',
        receipts: 'תעודות קבלה',
        inSap: 'נקלטה בסאפ, לפני הקונסולה הזו',
        moveTo: 'העברה ל:',
        arrived: 'הגיעו {done} מתוך {total}',
        emptyTitle: 'אין עדיין הזמנות רכש',
        emptySub: 'הזמנת רכש היא ספק אחד, כמויות, וקובץ לשלוח אליו.',
    },

    supplier: 'ספק',
    pickSupplier: 'בחירת ספק…',
    needSupplier: 'צריך לבחור ספק לפני שהיא תסומן כנשלחה',
    needQty: 'חסרה כמות בשורה אחת | חסרה כמות ב-{n} שורות',

    // config/buying.js BUYING_STATES — לבקשה שני מצבים, להזמנה ארבעה
    state: {
        open: 'פתוחה',
        closed: 'סגורה',
        draft: 'טיוטה',
        sent: 'נשלחה',
        received: 'התקבלה',
        failed: 'נכשלה',
    },
    close: 'סיום הבקשה',
    reopen: 'פתיחה מחדש',
    sheetCount: 'אין גיליונות | גיליון אחד | {n} גיליונות',

    // מצב הגיליון נקבע ממה שקרה לו, לא ממה שסימנו עליו: הזמנה היא טיוטה עד
    // שמסמנים אותה כנשלחה בעצמכם, הקבלה נפתחת רק דרך קליטת סחורה בפועל, ונכשלה
    // היא הסימון היחיד שאין לו שום דרך אחרת להיקבע.
    step: {
        requestOpen:
            'הבקשה פתוחה. הוסיפו מק״טים, סמנו מה שבוצע, וייצאו לאקסל כשצריך.',
        requestClosed: 'הבקשה הסתיימה. אפשר לפתוח אותה מחדש.',
        draft: 'טיוטה — טרם נשלחה לספק. אפשר לייצא לאקסל בכל שלב, ולסמן כ״נשלחה״ כשהיא יוצאת בפועל.',
        sent: 'נשלחה לספק ב־{when}. כשהסחורה תגיע — קבלת סחורה.',
        received: 'התקבלה ב־{when} והמלאי עודכן.',
        failed: 'סומנה כנכשלה. אם נשלחה שוב — סמנו אותה כנשלחה.',
    },

    move: {
        open: 'פתיחה מחדש',
        closed: 'סיום הבקשה',
        sent: 'סימון כנשלחה',
        failed: 'סימון כנכשלה',
    },

    convert: {
        action: 'העברה להזמנת רכש',
        title: 'העברת שורות להזמנת רכש',
        body: 'כל שורה שסומנה כ״בוצע״ עוברת להזמנת רכש חדשה, אחת לכל ספק. שורות שלא סומנו נשארות בבקשה.',
        confirm: 'העברה',
        effect: {
            group: 'שורה אחת ← {supplier} | {n} שורות ← {supplier}',
            noSupplier: 'ללא ספק (ייבחר בהזמנה)',
            remain: 'שורה אחת תישאר בבקשה | {n} שורות יישארו בבקשה',
            remainNone: 'כל השורות עוברות — הבקשה תישאר ריקה',
        },
        done: 'נפתחה הזמנת רכש {numbers} | נפתחו {n} הזמנות רכש: {numbers}',
    },

    // מה שעל השורה הוא מה שמחליטים לפיו; שאר כרטיס הפריט נפתח בלחיצה על השם.
    lineDetails: 'כל פרטי הפריט',
    lineSnapshot:
        'אלה הערכים כפי שהיו כשהשורה נוספה לגיליון, ולא מה שכרטיס הפריט אומר עכשיו — גיליון שנכתב במרץ ונקרא במאי חייב לומר מה היה על המדף במרץ.',
    lineDone: 'בוצע',
    lineNotDone: 'טרם בוצע',
    openItemCard: 'פתיחת כרטיס הפריט',
    openItemCardHint: 'לנתונים העדכניים, להבדיל ממה שנשמר על השורה.',
    group: {
        working: 'מה שנכתב בשורה',
        identity: 'זהות הפריט',
        supply: 'ספק ומחירים',
        shelf: 'מלאי',
        replenish: 'חידוש',
    },

    railAria: 'שלבי הגיליון',
    totalQty: 'סה״כ {n}',
    noSupplierYet: 'טרם נבחר ספק',
    backToList: 'חזרה לרשימה',
    notFound: 'הגיליון לא נמצא',
    notFoundSub: 'ייתכן שנמחק, או שהקישור שגוי.',
    blocked: {
        noLines: 'אין שורות בגיליון',
    },

    receive: {
        open: 'קבלת סחורה',
        title: 'קבלת סחורה · הזמנה {number} · {supplier}',
        docNum: 'מספר תעודת משלוח',
        date: 'תאריך הקבלה',
        ordered: 'הוזמן',
        arrived: 'הגיע',
        batch: 'אצוות ספק',
        batchHint: 'מהמדבקה',
        expiry: 'תוקף',
        price: 'מחיר ליחידה',
        note: 'הערה לקבלה',
        takeAll: 'הכל הגיע',
        none: 'איפוס',
        counting: 'שורה אחת תיקלט מתוך {total} | {n} שורות ייקלטו מתוך {total}',
        sign: 'אישור וחתימה',
        confirmTitle: 'לאשר את קבלת הסחורה?',
        confirmBody: 'שורה אחת תיקלט למלאי. | {n} שורות ייקלטו למלאי.',
        effectStock: 'המלאי יעודכן בכמויות שנרשמו',
        effectBatches: 'תיפתח אצווה לכל שורה, עם מספר הספק והתוקף',
        effectState: 'ההזמנה תעבור ל״התקבלה״',
        effectDiffer:
            'בשורה אחת הכמות שונה ממה שהוזמן | ב-{n} שורות הכמות שונה ממה שהוזמן',
        done: 'נקלטה שורה אחת | נקלטו {n} שורות',
    },

    note: 'הערת עבודה',
    notePlaceholder: 'בהכנה · נשלח מייל 5.8 · ממתינים למחיר…',
    openedBy: 'נפתחה על ידי {who} · {when}',

    paste: 'הדבקת מק״טים',
    pastePlaceholder: '100002 110005 200011',
    pasteHint:
        'מופרדים ברווח, בפסיק או בשורה — גם הדבקה של עמודה מאקסל עובדת. כל מק״ט הופך לשורה.',
    search: 'חפש',
    addOne: 'הוספת פריט בודד',
    addOnePlaceholder: 'מק״ט או שם…',

    foundAdded: 'נוספה שורה אחת | נוספו {n} שורות',
    foundAlready: 'כבר ברשימה: {list}',
    foundMissing: 'לא נמצאו: {list}',

    noLinesTitle: 'הרשימה ריקה',
    noLinesSub: 'הדביקו מק״טים ולחצו ״חפש״, או הוסיפו פריט בודד.',

    lineCount: 'אין שורות | שורה אחת | {n} שורות',
    dropLine: 'הסרת השורה',
    export: 'ייצוא לאקסל',
    exported: 'יוצאה שורה אחת | יוצאו {n} שורות',

    days: '{n} ימים',

    // מצב הפריט עצמו, לא מצב הרשימה
    itemState: {
        active: 'פעיל',
        frozen: 'מוקפא',
        inactive: 'לא פעיל',
    },

    // כל מה שיש על כרטיס הפריט ונוגע לרכש, בסדר שבו הכרטיס מציג אותו
    col: {
        number: 'מספר',
        opened: 'נפתחה',
        by: 'נפתחה ע״י',
        lines: 'שורות',
        sheetState: 'מצב',
        received: 'התקבל',

        sku: 'מק״ט',
        name: 'שם הפריט',
        foreignName: 'שם לועזי',
        group: 'קבוצת פריט',
        state: 'מצב',

        supplier: 'ספק מועדף',
        supplierCode: 'קוד ספק',
        catalogNum: 'מק״ט אצל הספק',
        purchaseUom: 'יחידת רכש',
        numInBuy: 'יח׳ מלאי ביח׳ רכש',
        packUom: 'יחידת אריזה',
        packQty: 'כמות באריזה',
        lastPrice: 'מחיר אחרון',
        lastPriceOn: 'נרכש לאחרונה',
        evalPrice: 'מחיר הערכה',

        uom: 'יחידת מלאי',
        uomShort: 'יחידה',
        onHand: 'במלאי',
        committed: 'מוקצה',
        available: 'זמין',
        onOrder: 'בהזמנה',
        min: 'מלאי מינימום',
        minShort: 'מינימום',
        max: 'מלאי מקסימום',
        reorder: 'כמות לחידוש',

        minOrder: 'הזמנה מינימלית',
        leadDays: 'זמן אספקה',
        procurement: 'שיטת רכש',

        qty: 'כמות',
        done: 'בוצע',
    },
};
