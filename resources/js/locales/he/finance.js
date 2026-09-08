// כספים — יתרות, גבייה, תנועות ומסמכי מס.
//
// Enum labels are not repeated here: a document state reads from `docState.*`,
// a document kind from `docType.*`, an aging bucket from `agingBucket.*`, a
// payment method from `paymentMethod.*` and a recipient from `payer.*`.
export default {
    title: 'כספים — יתרות, גבייה ומסמכים',
    sub: 'ספר החשבונות של המערכת · {n} מטפלים במסלול הקפה · מסמכי מס מופקים אוטומטית ב-{provider}',

    tab: {
        overview: 'סקירה וגיול חוב',
        balances: 'יתרות וגבייה',
        payments: 'תנועות',
        docs: 'מסמכי מס',
    },

    action: {
        exportLedger: 'ייצוא תנועות',
        exportDocs: 'ייצוא לרו״ח',
        exportStatement: 'ייצוא דף חשבון',
        createLink: 'יצירת לינק לתשלום',
        recordPayment: 'רישום תשלום',
        statement: 'דף חשבון',
    },

    noun: {
        practitioners: 'מטפלים',
        transactions: 'תנועות',
        documents: 'מסמכים',
        openCreditOrders: 'הזמנות פתוחות בהקפה',
    },

    kpi: {
        openDebt: 'חוב פתוח',
        openDebtSub: '{n} מטפלים · לחיצה מסננת לרשימה',
        creditTrack: 'מאושרים להקפה',
        creditTrackSub: 'מתוך {n} מטפלים · לחיצה מסננת',
        collected: 'נגבה ב-{days} יום',
        collectedSub: 'לחיצה מסננת לתנועות התשלום',
        failedDocs: 'מסמכים שנכשלו',
        failedDocsFix: 'לחיצה להפקה חוזרת',
        failedDocsNone: 'כל המסמכים הופקו',
    },

    overview: {
        aging: 'גיול חוב',
        agingHint: 'לחיצה על טווח מסננת את רשימת היתרות',
        how: 'איך כספים עובדים במערכת',
        noDebtTitle: 'אין חוב פתוח',
        noDebtSub: 'כל היתרות נגבו — אין מה לגייל',
    },

    aging: {
        range: 'טווח',
        practitioners: 'מטפלים',
        share: 'חלק מהחוב',
    },

    how: {
        immediate: 'תשלום מיידי',
        immediateValue:
            'מטפל משלם בעת ההזמנה; לקוח קצה מקבל קישור תשלום ל-{days} ימים',
        expired: 'קישור שפג תוקף',
        expiredValue: 'ההזמנה מתבטלת אוטומטית והמלאי שהוקצה לה משוחרר',
        reminder: 'תזכורת תשלום',
        reminderValue: 'תזכורת אוטומטית נשלחת ללקוח ביום {day} של הקישור',
        credit: 'מסלול הקפה',
        creditValue:
            'מאושר בכרטיס המטפל בלבד — ההזמנה יורדת למעבדה ללא תשלום והסכום נצבר כחוב',
        collection: 'גבייה',
        collectionValue:
            'לינק אחד על כל היתרה הפתוחה, מועתק ידנית ונשלח מחוץ למערכת · {mode}',
        partialAllowed: 'תשלום חלקי אפשרי',
        allOrNothing: 'הכל או כלום',
        docs: 'מסמכי מס',
        docsValue:
            '{provider} מפיק חשבונית מס קבלה עם קבלת התשלום ומחזיר מספר מסמך ומספר הקצאה · {retries} ניסיונות במרווח {gap} דקות',
        vat: 'מע״מ',
        vatValue: '{rate} — נקבע בהגדרות המערכת ומחושב בכל מחיר',
        ceiling: 'תקרת חוב',
        ceilingValue:
            'אין. המערכת מתריעה מעל {amount} או {days} יום, ואינה חוסמת',
        rounding: 'עיגול מחירים',
    },

    // How the gross price is rounded — SETTINGS.priceRounding ids.
    rounding: {
        ceil_shekel: 'עיגול כלפי מעלה לשקל שלם',
        nearest_shekel: 'עיגול לשקל הקרוב',
        none: 'ללא עיגול',
    },

    filter: {
        searchPractitioner: 'שם מטפל · מספר לקוח · טלפון',
        searchTxn: 'הזמנה · מסמך · תיאור',
        searchDoc: 'מספר מסמך · הקצאה · נמען · הזמנה',
        searchOrder: 'מספר הזמנה · לקוח · מטפל',
        trackAll: 'מסלול — הכל',
        bucketAll: 'גיל חוב — הכל',
        kindAll: 'סוג — הכל',
        practitionerAll: 'מטפל — הכל',
        windowAll: 'טווח — הכל',
        windowDays: '{days} ימים אחרונים',
        stateAll: 'מצב — הכל',
        recipientAll: 'נמען — הכל',
        statusAll: 'סטטוס — הכל',

        daysUnit: 'ימים',

        // Field names in the filter drawers — stores/money.js.
        field: {
            bucket: 'גיל החוב',
            track: 'מסלול תשלום',
            bdebt: 'גובה החוב',
            bage: 'ותק החוב',
            dstate: 'מצב ההפקה',
            dtype: 'סוג המסמך',
            dto: 'הנמען',
            dpr: 'מטפל',
            damt: 'סכום המסמך',
            dage: 'לפני כמה ימים הופק',
            tkind: 'סוג התנועה',
            tmethod: 'אמצעי תשלום',
            tcode: 'מטפל',
            tamt: 'סכום התנועה',
            tage: 'לפני כמה ימים',
        },
    },

    // Filter-drawer groups — stores/money.js.
    filterGroup: {
        debt: 'החוב',
        terms: 'תנאי תשלום',
        state: 'מצב',
        who: 'מי',
        size: 'סכום וזמן',
        what: 'מה',
    },

    track: {
        credit: 'הקפה',
        creditLong: 'מאושר להקפה',
        immediate: 'תשלום מיידי',
        revoked: 'הקפה בוטלה',
    },

    // Collection-link lifecycle — config/finance.js LINK_STATES ids.
    linkState: {
        none: 'לא נוצר',
        sent: 'נשלח',
        paid: 'שולם',
        expired: 'פג תוקף',
    },

    balances: {
        kpiAll: 'כל היתרות',
        kpiCredit: 'במסלול הקפה',
        kpiCreditSub: 'ממשיכים להזמין ללא תשלום',
        kpiOldest: 'חוב {range}',
        kpiRevoked: 'הקפה שבוטלה',
        kpiRevokedSub: 'חוב פתוח בלי מסלול',
        title: 'יתרות פתוחות',
        hint: 'הלינק תמיד על כל היתרה — לא על הזמנה בודדת',
        track: 'מסלול',
        balance: 'יתרה',
        openOrders: 'הזמנות פתוחות',
        debtAge: 'גיל החוב',
        lastLink: 'לינק אחרון',
        days: '{n} ימים',
        linkMeta: 'נוצר {when} · פג בעוד {days} ימים',
        emptyTitle: 'אין יתרות שתואמות את הסינון',
        emptySub: 'נקה את הסינון או בדוק טווח אחר',
    },

    openCredit: {
        title: 'הזמנות בהקפה שטרם נגבו',
        age: 'גיל',
        flags: 'חריגים',
        emptyTitle: 'אין הזמנות פתוחות בהקפה',
        emptySub: 'כל ההזמנות בהקפה נגבו',
    },

    payments: {
        kpiAll: 'כל התנועות',
        kpiAllSub: 'חיובים ותשלומים',
        kpiWindow: '{days} הימים האחרונים',
        kpiWindowSub: 'לחיצה מגבילה את הטווח',
        emptyTitle: 'אין תנועות שתואמות את הסינון',
        emptySub: 'נקה את הסינון',
    },

    txn: {
        kind: 'סוג',
        note: 'תיאור',
        document: 'מסמך',
        runningBalance: 'יתרה מצטברת',
    },

    // Ledger movement kinds — the ids the transaction rows carry.
    txnKind: {
        charge: 'חיוב',
        payment: 'תשלום',
        credit: 'זיכוי',
    },

    statement: {
        title: 'דף חשבון · {name}',
        balanceChip: 'יתרה',
        customerNo: 'מספר לקוח',
        totalCharges: 'סך חיובים',
        totalPayments: 'סך תשלומים',
        movements: 'תנועות בכרטיס',
        emptyTitle: 'אין תנועות בכרטיס',
        emptySub: 'חיובים ותשלומים יופיעו כאן',
    },

    credit: {
        title: 'מסלול הקפה',
        track: 'מסלול',
        since: 'מאושר מתאריך',
        by: 'אושר על ידי',
        revoked: 'בוטל בתאריך',
        limit: 'תקרת אשראי',
        limitValue: 'אין — המערכת מתריעה ולא חוסמת',
        warn: 'סף התראה',
        warnValue: 'מעל {amount} או {days} יום',
        scope: 'תחולה',
        scopeValue: 'בכרטיס המטפל בלבד — לא ללקוחות קצה',
        warnNote:
            'החוב פתוח {days} ימים ועומד על {amount} — מעבר לסף ההתראה. המערכת מתריעה בלבד ואינה חוסמת הזמנות.',
        approveTitle: 'אישור מסלול הקפה',
        approveBody:
            '{name} יוכל להזמין ללא תשלום, והסכום ייצבר כחוב בכרטיס עד לגבייה.',
        approveConfirm: 'אשר הקפה',
        approveEffect1: 'הזמנות חדשות יירדו למעבדה ללא תשלום',
        approveEffect2: 'הסכום ייצבר כחוב בכרטיס המטפל',
        approveEffect3: 'המערכת תתריע מעל {amount} או {days} יום — ולא תחסום',
        revokeTitle: 'ביטול מסלול הקפה',
        revokeBody:
            'מסלול ההקפה של {name} יבוטל. יתרה פתוחה של {amount} תישאר לגבייה.',
        revokeConfirm: 'בטל הקפה',
        revokeEffect1: 'הזמנות חדשות יחייבו תשלום מיידי',
        revokeEffect2: 'היתרה הפתוחה נשארת — הגבייה בלינק אחד על כולה',
        revokeEffect3: 'אפשר לאשר את המסלול מחדש בכל עת',
        effectLogged: 'הפעולה תירשם ביומן המערכת',
    },

    link: {
        title: 'יצירת לינק לתשלום · {name}',
        amount: 'סכום הלינק',
        amountSub: 'כל היתרה הפתוחה — הכל או כלום',
        orders: 'הזמנות בלינק',
        ordersSub: 'כל ההזמנות שממתינות לתשלום',
        ordersNone: 'יתרה היסטורית בכרטיס — ללא הזמנות פתוחות',
        validity: 'תוקף הלינק',
        validityDays: '{days} ימים',
        validitySub: 'לאחר מכן יש ליצור לינק חדש',
        toCopy: 'הלינק להעתקה',
        fieldLabel: 'לינק לתשלום',
        noLink: 'עדיין לא נוצר לינק גבייה ליתרה הזו.',
        manualNote:
            'המערכת אינה שולחת את הלינק בעצמה — מעתיקים אותו מכאן ושולחים ידנית (WhatsApp, מייל, טלפון). הלינק תקף ל-{days} ימים ומכסה את כל ההזמנות הפתוחות · {mode}.',
        noPartial: 'תשלום חלקי אינו נתמך',
        covers: 'ההזמנות שהלינק מכסה',
        content: 'תוכן',
        debtAge: 'גיל החוב',
        shelf: 'מוצרי מדף',
        formula: 'פורמולה',
        legacyOnly: 'אין הזמנות פתוחות — היתרה נובעת מחוב היסטורי בכרטיס.',
        ordersTotal: 'סך ההזמנות:',
        legacyTotal: 'יתרה היסטורית:',
        linkTotal: 'סה״כ בלינק:',
        docNote:
            'בתשלום תופק {doc} על כל ההזמנות שבלינק, אוטומטית מול {provider}, ותישלח ללקוח באימייל.',
        copyAction: 'העתק לינק',
        copiedLong: 'הועתק — ניתן להדביק',
        copiedShort: 'הועתק',
        copied: 'הלינק הועתק',
        copiedBody: '{name} · {amount} · ניתן לשלוח ידנית מחוץ למערכת',
        copyFailed: 'לא ניתן להעתיק אוטומטית',
        copyFailedBody: 'הלינק מסומן בשדה — יש להעתיק עם Ctrl+C ולשלוח ידנית',
    },

    pay: {
        title: 'רישום תשלום ידני · {name}',
        allOrNothing:
            'הגבייה היא על כל היתרה הפתוחה — הכל או כלום. תשלום חלקי אינו נתמך.',
        balance: 'היתרה הפתוחה',
        covers: 'מכסה',
        coversValue: '{n} הזמנות פתוחות',
        net: 'לפני מע״מ',
        vat: 'מע״מ ({rate})',
        gross: 'סה״כ לתשלום',
        method: 'אמצעי תשלום',
        confirm: 'רשום תשלום',
        effect1: 'תופק {doc} אחת על כל ההזמנות שבגבייה',
        effect2: 'המסמך יופק אוטומטית מול {provider} ויישלח לנמען באימייל',
        effect3: '{n} הזמנות יסומנו כשולמו והיתרה תתאפס',
        effect4: 'הפעולה תירשם ביומן המערכת',
    },

    docs: {
        failedTitle: 'מסמך אחד לא הופק | {n} מסמכים לא הופקו',
        failedBody:
            'התשלום נסלק אך {provider} החזיר שגיאה. הפקה חוזרת מכאן בלבד — הספק ניסה {retries} פעמים במרווח {gap} דקות, והמערכת אינה מנסה שוב מאחורי הקלעים.',
        allIssued: 'כל המסמכים הופקו בהצלחה.',
        kpiAll: 'כל המסמכים',
        kpiAllSub: 'חשבוניות מס קבלה',
        kpiFailedSub: 'נדרשת הפקה חוזרת',
        toCustomer: 'ללקוח קצה',
        toCustomerSub: 'שילם בקישור תשלום',
        toPractitioner: 'למטפל',
        toPractitionerSub: 'כולל מסמכים מרוכזים',
        number: 'מספר מסמך',
        type: 'סוג',
        alloc: 'מספר הקצאה',
        to: 'למי',
        issuedAt: 'הופק',
        state: 'מצב',
        noNumber: '— לא הופק',
        emptyTitle: 'אין מסמכים שתואמים את הסינון',
        emptySub: 'נקה את הסינון',
        reissueTitle: 'הפקה חוזרת של מסמך',
        reissueConfirm: 'הפק מחדש',
        reissueBody:
            'בקשה חדשה תישלח ל-{provider} עבור הזמנה {order} על {amount}.',
        reissueEffect1: 'תופק {type} חדשה מול הספק',
        reissueEffect2: 'מספר המסמך ומספר ההקצאה יישמרו בהזמנה כשהספק יענה',
        reissueEffect3: 'המסמך יישלח לנמען באימייל',
        reissueEffect4:
            'אם ההפקה תיכשל שוב — הספק ינסה {retries} פעמים במרווח {gap} דקות לפני חריגה חדשה',
    },

    toast: {
        exported: 'הייצוא הוכן',
        exportedLedger: 'ירד קובץ CSV עם {n} תנועות',
        exportedDocs: 'ירד קובץ CSV עם {n} מסמכים',
        exportedStatement: 'ירד קובץ CSV עם {n} תנועות מדף החשבון',
        paymentRecorded: 'התשלום נרשם',
        paymentRecordedBody: '{name} · {amount} · {n} הזמנות נסגרו',
        reissued: 'בקשת ההפקה נשלחה',
        reissuedBody: '{order} · {provider}',
        creditApproved: 'מסלול הקפה אושר',
        creditRevoked: 'מסלול ההקפה בוטל',
    },
};
