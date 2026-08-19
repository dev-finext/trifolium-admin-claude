// אינטראקציות תרופתיות — the safety desk: the herb ⇄ drug table, the test
// bench, per-herb contraindications and pharmacist approval.
//
// Record content (herb names, drug names, contraindication tags) travels with
// the records as `{ he, en }` pairs and is not repeated here.
export default {
    title: 'אינטראקציות תרופתיות',
    sub: 'כל שורה היא קשר דו-כיווני בין צמח לתרופה · {n} קשרים מתועדים שמזינים את ההתראות באשף הרקיחה',

    tab: {
        list: 'לפי צמח',
        drug: 'לפי תרופה',
        bench: 'שולחן בדיקות',
        warn: 'התוויות נגד לפי צמח',
        approvals: 'אישורי רוקח',
    },

    action: {
        new: 'אינטראקציה חדשה',
        import: 'ייבוא CSV',
        export: 'ייצוא CSV',
        review: 'בדיקה ואישור',
        approve: 'אישור רוקח',
    },

    herbSearch: 'חיפוש צמח — שם עברי או לטיני',
    herbSearchAria: 'חיפוש צמח',
    herbNotFound: 'לא נמצא צמח בשם ״{q}״',
    noHerbMatch: 'לא נמצא צמח שתואם את הסינון',

    list: {
        label: 'אינטראקציות',
        search: 'חיפוש: צמח · תרופה',
        searchAria: 'חיפוש אינטראקציות',
        herbAria: 'סינון לפי צמח',
        drugAria: 'סינון לפי תרופה',
        impactAria: 'סינון לפי הזמנות מושפעות',
        herbAll: 'צמח — הכל',
        drugAll: 'תרופה — הכל',
        impactAll: 'השפעה — הכל',
        impactYes: 'עם הזמנות מושפעות',
        impactNo: 'בלי הזמנות מושפעות',
        option: '{name} ({n})',
        col: {
            herb: 'צמח',
            drugs: 'תרופות (מופרדות בפסיק)',
            impact: 'הזמנות מושפעות',
        },
        orders: 'הזמנות',
        empty: {
            title: 'לא נמצאו אינטראקציות',
            sub: 'נקה את החיפוש או את סינון הצמח',
        },
    },

    drug: {
        note: 'אותם קשרים, במיון לפי התרופה — כך רואים במהירות אילו צמחים דורשים זהירות עבור לקוח שנוטל תרופה מסוימת.',
        label: 'תרופות',
        search: 'שם תרופה · צמח בקבוצה',
        searchAria: 'חיפוש לפי תרופה',
        sizeAria: 'מספר צמחים מתועדים',
        sizeAll: 'צמחים מתועדים — הכל',
        sizeMulti: 'יותר מצמח אחד',
        sizeOne: 'צמח אחד בלבד',
        herbs: 'צמחים מתועדים',
        empty: {
            title: 'לא נמצאו תרופות שתואמות את הסינון',
            sub: 'נקה את החיפוש',
        },
    },

    bench: {
        title: 'שולחן בדיקות',
        medsLabel: 'תרופות הלקוח (מופרדות בפסיק)',
        medsPlaceholder: 'Coumadin, Cipralex',
        herbsLabel: 'צמחים בפורמולה',
        picked: 'נבחרו {n}',
        herbSearchAria: 'חיפוש צמח בשולחן הבדיקות',
        result: 'מה המטפל יראה',
        clean: 'לא תוצג התראה — לא נמצאה אינטראקציה מתועדת בין הצמחים שנבחרו לתרופות שהוזנו.',
        clear: 'ניקוי הבדיקה',
        empty: {
            title: 'אין מה לבדוק עדיין',
            sub: 'הזן את תרופות הלקוח ובחר את צמחי הפורמולה — כאן יופיע בדיוק מה שהמטפל יראה באשף הרקיחה.',
        },
    },

    warn: {
        herbsCard: 'צמחים',
        title: 'התוויות נגד · {herb}',
        impactCard: 'השפעה על הקטלוג',
        stateAria: 'מצב התוויות',
        stateAll: 'מצב — הכל ({n})',
        stateHas: 'עם התוויות נגד ({n})',
        stateNone: 'בלי התוויות נגד ({n})',
        tagAria: 'סינון לפי התוויה',
        tagAll: 'התוויה — הכל',
        option: '{name} ({n})',
        count: 'מוצגים {n} מתוך {total} צמחים',
        dirty: 'יש שינוי שטרם נשמר',
        impact: {
            orders: 'הזמנות שמכילות את הצמח',
            rows: 'אינטראקציות מתועדות',
            tags: 'התוויות נגד מסומנות',
        },
        note: 'שינוי התראה ישפיע על כל מטפל שיבחר את הצמח באשף הרקיחה.',
    },

    approvals: {
        note: 'התראת אינטראקציה שלא אושרה היא חריג פתוח על ההזמנה. אישור רוקח/ת מסיר אותו מההזמנה, מהפעמון ומהמונה שבתפריט.',
        pendingKpi: 'ממתינות לאישור רוקח',
        approvedKpi: 'אושרו מתחילת ההפעלה',
        label: 'הזמנות',
        search: 'מספר הזמנה · מטפל · לקוח',
        searchAria: 'חיפוש הזמנות לאישור',
        col: {
            order: 'הזמנה',
            practitioner: 'מטפל',
            customer: 'לקוח',
            status: 'סטטוס',
            hits: 'אינטראקציות מתועדות',
            approved: 'אושר',
        },
        none: 'אין מתועדות',
        empty: {
            pendingTitle: 'אין התראות שממתינות לאישור',
            pendingSub: 'כל התראות האינטראקציה בהזמנות הפעילות אושרו.',
            approvedTitle: 'טרם אושרה התראה',
            approvedSub: 'אישורים שיבוצעו במסך הזה יופיעו כאן.',
        },
        review: {
            title: 'בדיקת אינטראקציות · הזמנה {order}',
            found: 'אינטראקציות מתועדות',
            declared: 'תרופות שהוצהרו',
            herbs: 'צמחים בפורמולות',
            practitioner: 'מטפל',
            customer: 'לקוח',
            placed: 'מועד ההזמנה',
            noMeds: 'הלקוח לא מדווח על נטילת תרופות — לא נדרשת בדיקת אינטראקציות.',
            clean: 'נבדקו {herbs} צמחים מול {meds} תרופות — לא נמצאה אינטראקציה מתועדת. גם במקרה הזה נדרש אישור רוקח/ת כדי לסגור את החריג.',
            approvedBy: 'אושר על ידי',
            approvedAt: 'מועד האישור',
            why: 'סיבת האישור',
        },
        confirm: {
            title: 'אישור התראת אינטראקציה',
            body: 'אישור ההתראה על הזמנה {order} — הבדיקה מול התרופות שהלקוח הצהיר עליהן בוצעה.',
            confirmLabel: 'אשר את ההתראה',
            effect: {
                flag: 'החריג יוסר מההזמנה, מהפעמון ומהמונה שבתפריט',
                order: 'ההזמנה תמשיך במסלול ההכנה',
                log: 'האישור, שם המבצע והסיבה יירשמו ביומן',
            },
        },
    },

    editor: {
        new: 'אינטראקציה חדשה',
        edit: 'עריכת אינטראקציה',
        herbLabel: 'צמח',
        selected: 'נבחר',
        drugsLabel: 'תרופות — מופרדות בפסיק',
        drugsPlaceholder: 'SSRI, Cipralex, Prozac',
        drugsHint: 'כל שם בפני עצמו נבדק מול התרופות שהלקוח הצהיר עליהן.',
        duplicate: 'קיימת כבר אינטראקציה זהה לצמח ולתרופות האלה.',
    },

    remove: {
        title: 'מחיקת קשר צמח–תרופה',
        body: 'הקשר בין {herb} לבין {drug} יימחק.',
        confirmLabel: 'מחק קשר',
        effect: {
            wizard: 'ההתראה תיעלם מאשף הרקיחה של כל המטפלים',
            orders: 'הזמנות קיימות לא ישתנו',
            log: 'המחיקה והסיבה יירשמו ביומן',
        },
    },

    toast: {
        added: 'האינטראקציה נוספה',
        updated: 'האינטראקציה עודכנה',
        deleted: 'הקשר נמחק',
        reason: 'סיבה: {why}',
        pair: '{herb} × {drug}',
        exported: 'הייצוא הוכן',
        exportedBody: '{n} קשרים · {file}',
        imported: 'הייבוא הושלם',
        importedBody: 'נוספו {added} קשרים · דולגו {skipped} שורות',
        importEmpty: 'לא נוסף אף קשר',
        importEmptyBody: 'לא נמצאו שורות תקינות. עמודות נדרשות: {cols}',
        warningsSaved: 'ההתוויות נשמרו',
        warningsSavedBody: '{herb} · {n} התוויות',
        approved: 'ההתראה אושרה',
        approvedBody: 'הזמנה {order} · {by}',
    },
};
