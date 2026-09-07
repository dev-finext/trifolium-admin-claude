// Deliveries desk — the courier queue, the power-of-attorney panel and the
// courier code mapping.
//
// Enum labels are not repeated here: an order status reads from `status.*`, the
// way an order leaves the pharmacy from `fulfilment.*`, a courier company from
// `courier.*`, and an exception from `exception.*`.
export default {
    title: 'משלוחים',
    sub: '{courier} משלוחי שליח · {pickup} איסופים עצמיים',

    view: {
        queue: 'משלוחים',
        poa: 'ייפויי כוח',
        codes: 'קודי חברות',
        points: 'נקודות איסוף',
    },

    export: {
        action: 'ייצוא',
        done: 'הייצוא ירד',
        body: '{n} שורות · {file}',
        file: 'deliveries-{date}.csv',
    },

    range: {
        note: '{n} משלוחים בטווח ({from} עד {to}) · שלבי הטיפול נספרים בתוך הטווח',
        hint: 'בחר טווח תאריכים כדי לקבל ספירה לפי שלב טיפול',
        open: 'ללא הגבלה',
    },

    // The handling stages in stores/deliveries.js DELIVERY_STAGES.
    stage: {
        all: 'הכל',
        assign: 'ממתין להקצאת שליח',
        handed: 'נמסר לשליח',
        transit: 'בדרך',
        pickup: 'מוכן לאיסוף',
        done: 'נמסר',
    },

    filter: {
        search: 'חיפוש משלוח',
        searchPlaceholder: 'הזמנה · מקבל · עיר · מספר מעקב',
        stage: 'שלב טיפול',
        stageAll: 'שלב טיפול — הכל',
        status: 'סטטוס הזמנה',
        statusAll: 'סטטוס — הכל',
        type: 'אופן מסירה',
        typeAll: 'אופן מסירה — הכל',
        courier: 'חברת שליחויות',
        courierAll: 'חברת שליחויות — הכל',
        tracking: 'מספר מעקב',
        trackingAll: 'מספר מעקב — הכל',
        trackingYes: 'עם מספר מעקב',
        trackingNo: 'בלי מספר מעקב',
        city: 'עיר יעד',
        cityAll: 'עיר יעד — הכל',
        option: '{label} ({n})',
    },

    count: 'משלוחים · מתוך {n} בטווח',

    col: {
        order: 'הזמנה',
        recipient: 'מקבל',
        type: 'אופן מסירה',
        address: 'כתובת',
        courier: 'חברת שליחויות',
        tracking: 'מספר מעקב',
        status: 'סטטוס',
        date: 'תאריך',
        actions: 'פעולות',
    },

    row: {
        street: '{street} {num}, {city}',
        addressDetail: 'דירה {apt} · קומה {floor} · כניסה {entry}',
        addressPending: 'כתובת תמולא ע״י הלקוח',
        noCourier: 'לא הוקצה',
        supplierCode: 'קוד ספק {code}',
        sentOn: 'נשלח ב-{date}',
        notified: 'הודענו ב-{stamp}',
        none: '—',
        point: 'נקודת איסוף: {name}',
        urgent: 'דחוף',
    },

    action: {
        assign: 'הקצה שליח',
        updateTracking: 'עדכון מעקב',
        ship: 'סמן כנשלח',
        shipBlocked: 'אי אפשר לסמן כנשלח לפני שיש ייפוי כוח חתום',
        notifyPickup: 'הודע שמוכן',
        open: 'פתח',
    },

    empty: {
        title: 'אין משלוחים בשלב הזה',
        sub: 'בחר שלב אחר, הרחב את טווח התאריכים או נקה את הסינון',
    },

    assign: {
        title: 'הקצאת שליח · {id}',
        courier: 'חברת שליחויות',
        courierPick: 'בחר חברת שליחויות',
        courierOption: '{code} — {name}',
        courierPhone: 'טלפון החברה: {phone}',
        sentOn: 'תאריך שליחה',
        save: 'שמור והקצה',
        addressMissing:
            'הכתובת עדיין לא התקבלה מהלקוח. אפשר להקצות שליח, אבל אין לאן למסור עד שהכתובת תגיע.',
        poaMissing:
            'למקבל אין ייפוי כוח חתום. אפשר להקצות שליח, אבל המסירה חסומה עד לחתימה — את הבקשה שולחים מלשונית ייפויי כוח.',
        done: {
            title: 'השליח הוקצה',
            body: '{courier} · מספר מעקב {tracking}',
            bodyNoTracking: '{courier} · מספר המעקב יוזן בהמשך',
        },
    },

    tracking: {
        label: 'מספר מעקב',
        format: 'אות הספק, שש ספרות, ואחריהן IL — כפי שמודפס על תווית המשלוח',
        invalid: 'המספר לא בפורמט הצפוי: אות ספק, שש ספרות, ואחריהן IL',
        mismatch:
            'המספר מתחיל באות {found}, ולא באות {expected} של החברה שנבחרה',
        manual: 'לאף אחת מחברות השליחויות אין ממשק API. מספר המעקב מוקלד מתווית המשלוח ונשמר על ההזמנה בלבד — אין בדיקה מול החברה ואין עדכון מצב אוטומטי.',
    },

    ship: {
        title: 'סימון ההזמנה כנשלחה',
        body: 'ההזמנה {id} תסומן כנשלחה עם {courier}.',
        confirm: 'סמן כנשלח',
        effect: {
            status: 'סטטוס ההזמנה יעודכן ל״נשלח״, וכל הפורמולות שבה יסומנו כנשלחו',
            date: 'תאריך השליחה יישמר על ההזמנה',
            message:
                'תישלח ללקוח הודעת WhatsApp עם שם חברת השליחויות ומספר המעקב',
        },
        done: {
            title: 'ההזמנה סומנה כנשלחה',
            body: '{id} · {courier}',
        },
    },

    notify: {
        title: 'הודעה שההזמנה מוכנה לאיסוף',
        body: 'תישלח הודעה ל{name} ({phone}) על ההזמנה {id}.',
        confirm: 'שלח הודעה',
        effect: {
            template: 'הודעת WhatsApp בתבנית ״מוכן לאיסוף״',
            details: 'ההודעה כוללת את כתובת בית המרקחת ואת שעות הפעילות',
        },
        done: {
            title: 'ההודעה נשלחה',
            body: '{name} · מוכן לאיסוף',
        },
    },

    poa: {
        title: 'ייפוי כוח לשליח',
        note: 'מסירה בשליח מחייבת ייפוי כוח חתום מהמקבל: השליח מוסר את החבילה למי שפותח את הדלת או משאיר אותה בכתובת, ובלי חתימה אין למי לייחס את המסירה. הזמנות באיסוף עצמי אינן נדרשות לייפוי כוח — המקבל מזדהה בבית המרקחת.',
        kpi: {
            missing: 'ממתין לחתימה',
            requested: 'נשלחה בקשה',
            signed: 'חתום',
        },
        state: {
            missing: 'חסר ייפוי כוח',
            requested: 'בקשה נשלחה',
            signed: 'חתום',
        },
        col: {
            state: 'ייפוי כוח',
            city: 'עיר יעד',
        },
        request: 'בקש ב-WhatsApp',
        requestAgain: 'בקש שוב',
        requestAll: 'בקשה מכל {n} המקבלים',
        requestedAt: 'נשלחה ב-{stamp}',
        confirm: {
            title: 'בקשת ייפוי כוח מהמקבל',
            body: 'תישלח בקשה ל{name} ({phone}) לחתום על ייפוי כוח לשליח עבור ההזמנה {id}.',
            label: 'שלח בקשה',
        },
        confirmAll: {
            title: 'בקשת ייפוי כוח מכל המקבלים',
            body: 'תישלח בקשה ל-{n} מקבלים שאין להם ייפוי כוח חתום.',
            label: 'שלח את כל הבקשות',
        },
        effect: {
            template: 'הודעת WhatsApp בתבנית ״בקשת כתובת וייפוי כוח״',
            link: 'ההודעה כוללת קישור לחתימה דיגיטלית',
            blocked: 'ההזמנה תישאר חסומה למסירה עד שהחתימה תתקבל',
        },
        done: {
            title: 'הבקשה נשלחה',
            body: '{name} · ייפוי כוח לשליח',
            bodyAll: '{n} בקשות ייפוי כוח נשלחו',
        },
        empty: {
            missing: {
                title: 'לכל המשלוחים יש ייפוי כוח',
                sub: 'אין הזמנה בשליח שממתינה לחתימה',
            },
            requested: {
                title: 'אין בקשות פתוחות',
                sub: 'בקשה שנשלחה תופיע כאן עד שהחתימה תתקבל',
            },
            signed: {
                title: 'אין עדיין ייפויי כוח חתומים',
                sub: 'הזמנה בשליח עם חתימה תופיע כאן',
            },
        },
    },

    // V2 — pickup points and the daily dispatch alert
    alert: {
        title: '{points} נקודות איסוף יוצאות היום · {orders} הזמנות ממתינות ({ready} מוכנות)',
        none: 'אין נקודות איסוף שיוצאות היום',
        open: 'לנקודות האיסוף',
    },

    points: {
        note: 'נקודת איסוף היא חנות שותפה או מטפל שאוסף עבור מטופליו: ימי יציאה, שליח קבוע והערות ריכוז. ההזמנה בוחרת נקודה; ההתראה היומית אומרת מה יוצא היום.',
        add: 'נקודת איסוף חדשה',
        pickupList: 'רשימת איסוף לשליח',
        today: 'יוצאת היום',
        inactive: 'לא פעילה',
        waiting: '{n} ממתינות · {ready} מוכנות',
        col: {
            name: 'נקודת איסוף',
            kind: 'סוג',
            address: 'כתובת',
            days: 'ימי יציאה',
            courier: 'שליח',
            notes: 'הערות ריכוז',
            waiting: 'הזמנות ממתינות',
        },
        editor: {
            newTitle: 'נקודת איסוף חדשה',
            editTitle: 'עריכת נקודת איסוף · {name}',
            kind: 'סוג הנקודה',
            practitioner: 'מטפל',
            pickPractitioner: 'בחירת מטפל…',
            nameHe: 'שם (עברית)',
            nameEn: 'שם (אנגלית)',
            city: 'עיר',
            address: 'כתובת',
            days: 'ימי יציאה',
            courier: 'שליח קבוע',
            noCourier: 'ללא שליח קבוע',
            notes: 'הערות ריכוז',
            notesPh: 'לדוגמה: כל 4 הזמנות להוציא משלוח אחד',
            active: 'פעילה',
            activeOn: 'מוצעת בהזמנות חדשות',
            activeOff: 'לא מוצעת בהזמנות חדשות',
            createConfirm: 'הקם נקודה',
            saveConfirm: 'שמור שינויים',
            validate: {
                name: 'נא להזין שם',
                practitioner: 'נא לבחור מטפל',
                days: 'לפחות יום יציאה אחד',
            },
        },
        toast: {
            created: 'נקודת האיסוף הוקמה',
            updated: 'נקודת האיסוף עודכנה',
        },
    },

    pickupList: {
        title: 'רשימת איסוף לשליח',
        note: 'החבילות שנמסרו לשליח וטרם נשלחו — מוכנות לאריזה עם שליח מוקצה. היום זו שאילתת ״רשימת הזמנות לתפוז״.',
        courier: 'שליח',
        col: {
            order: 'הזמנה',
            recipient: 'מקבל',
            address: 'כתובת',
            phone: 'טלפון',
            tracking: 'מספר מעקב',
            items: 'פריטים',
        },
        empty: 'אין חבילות ממתינות לשליח זה',
        print: 'הדפסת הרשימה',
        printed: 'הרשימה נפתחה להדפסה',
        blocked: 'הדפדפן חסם את חלון ההדפסה',
        header: 'רשימת איסוף · {courier} · {date}',
        total: 'סה״כ {n} חבילות',
        signPharmacy: 'חתימת בית המרקחת',
        signCourier: 'חתימת השליח',
    },

    codes: {
        title: 'מיפוי קודי חברות שליחויות',
        note: 'כל חברת שליחויות מזוהה בקוד אות בודדת, שמודפס על תווית המשלוח ופותח את מספר המעקב. הקוד עצמו קבוע; שם החברה והטלפון שלה מוגדרים כאן ומשמשים בכל הזמנה חדשה.',
        col: {
            code: 'קוד ספק',
            name: 'שם חברת השליחויות',
            phone: 'טלפון',
            api: 'אינטגרציית API',
            orders: 'משלוחים על השולחן',
        },
        nameLabel: 'שם החברה לקוד {code}',
        phoneLabel: 'טלפון החברה לקוד {code}',
        api: {
            on: 'מחובר',
            off: 'בהכנה',
        },
        save: 'שמור מיפוי',
        historical: 'היסטורי — לא להקצאה חדשה',
        tp: 'מספר TP + מספר משלוח',
        confirm: {
            title: 'שמירת מיפוי חברות שליחויות',
            body: 'שמות חברות השליחויות והטלפונים שלהן יעודכנו במערכת.',
            label: 'שמור מיפוי',
        },
        effect: {
            newOrders: 'כל הזמנה חדשה תשתמש בשמות המעודכנים',
            oldOrders: 'הזמנות קיימות ימשיכו להציג את קוד הספק שנשמר בהן',
            log: 'השינוי יירשם ביומן המערכת',
        },
        done: {
            title: 'המיפוי נשמר',
            body: 'הקודים ישמשו בכל הזמנה חדשה',
        },
    },
};
