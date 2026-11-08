// עמדת המשלוחים — עמוד אחד, מ-"בהכנה" ועד "נשלח" / "נאסף"
// (SHIPPING_STATION_SPEC.md, DEMO_SHIPPING_STATION_PROMPT.md).
//
// תוויות אנומרציה אינן חוזרות כאן: סטטוס הזמנה נקרא מ-`status.*`, חריג
// מ-`exception.*`, וחברת שליחויות מ-`courier.*`.
export default {
    title: 'עמדת משלוחים',

    tab: {
        in_production: 'בהכנה',
        packing: 'באריזה',
        awaiting_courier: 'ממתין לשליח',
        pickup: 'איסוף עצמי',
        exceptions: 'חריגים',
        shipped: 'נשלחו',
        couriers: 'חברות משלוחים',
    },

    kpi: {
        inProduction: 'בהכנה',
        packing: 'באריזה',
        awaitingCourier: 'ממתין לשליח',
        readyForPickup: 'מוכן לאיסוף',
        exceptions: 'חריגים',
        shippedToday: 'נשלחו היום',
        collectedToday: 'נאספו היום',
    },

    scanLabel: 'סריקה',
    scanPlaceholder: 'סרקו ברקוד הזמנה או מכל',
    search: 'הזמנה · מקבל · עיר · מספר מעקב',

    scan: {
        orderNotFound: 'הזמנה לא נמצאה',
        orderNotInStation: 'ההזמנה במצב {status} — לא בעמדה',
        orderOpened: '✓ ההזמנה נפתחה',
        containerScanned: '✓ פריט {k} מתוך {n} · {name}, {city}',
        alreadyScanned: 'הפריט כבר נסרק',
        belongsToAnotherOrder: 'הפריט שייך להזמנה {id}, לא להזמנה הפתוחה',
        badBarcode: 'ברקוד לא תקין',
        allScannedShipping: '✓ כל הפריטים נסרקו — אפשר לשייך לשליח',
        allScannedPickup: '✓ כל הפריטים נסרקו — אפשר לסמן מוכן לאיסוף',
    },

    col: {
        order: 'הזמנה',
        sentToLab: 'נשלחה למעבדה ב-',
        practitioner: 'מטפל',
        recipient: 'מקבל',
        city: 'עיר',
        ship: 'אופן מסירה',
        containers: 'מכלים',
        gate: 'מצב השער',
        scanned: 'נסרקו',
        courier: 'חברה',
        packages: 'חבילות',
        trackingNumber: 'מספר מעקב',
        linkedAt: 'שויך ב-',
        status: 'סטטוס',
        problem: 'הבעיה',
        since: 'ממתי',
        payer: 'מטפל / משלם',
        phone: 'טלפון',
        readySince: 'מוכן מ-',
        handedAt: 'נמסר / נאסף ב-',
        by: 'על ידי',
    },

    gate: {
        ok: '✓',
        noAddress: 'חסרה כתובת',
        noPoa: 'חסר ייפוי כוח',
    },

    ship: {
        courier: 'שליח',
        pickup: 'איסוף עצמי',
    },

    action: {
        linkCourier: 'שייך לשליח',
        retry: 'נסה שוב',
        manualTracking: 'הזנת מספר מעקב ידנית',
        sendPoaRequest: 'שלח בקשה למטופל',
        editAddress: 'עריכת כתובת',
        open: 'פתח',
        markReady: 'מוכן לאיסוף',
        markCollected: 'נאסף',
        reprintLabel: 'הדפס מדבקות משלוח',
        printPickupList: 'הדפס רשימת איסוף',
    },

    manual: 'ידני',

    empty: {
        title: 'אין הזמנות בטאב הזה',
    },

    exceptions: {
        empty: 'אין חריגים כרגע',
    },

    toast: {
        readyForPickup: 'ההזמנה סומנה כמוכנה לאיסוף',
        poaRequested: 'בקשת ייפוי כוח נשלחה למטופל',
        linked: 'שויך לשליח',
        linkFailed: 'השיוך נכשל',
    },

    export: {
        none: 'אין טבלה לייצוא בטאב הזה',
        file: '{tab}-{date}.xlsx',
    },

    // StationOrderCard.vue — כרטיס ההזמנה בעמדה
    card: {
        urgent: 'דחוף',
        recipientTitle: 'מקבל וכתובת',
        recipient: 'מקבל',
        phone: 'טלפון',
        address: 'כתובת',
        city: 'עיר',
        street: 'רחוב ומספר',
        apt: 'דירה',
        floor: 'קומה',
        entry: 'כניסה',
        notes: 'הערות משלוח',
        editAddress: 'עריכת כתובת',
        addressSaved: 'הכתובת נשמרה',
        addressMissing: 'חסרה כתובת מלאה',
        poa: 'ייפוי כוח',
        poaSigned: 'חתום',
        poaMissing: 'חסר',
        poaRequested: 'בקשה נשלחה',
        poaRequestedAt: 'נשלחה ב-{stamp}',
        requestPoa: 'שלח בקשה למטופל',
        shipTo: {
            me: 'אליי (המטפל)',
            patient: 'אל המטופל/ת',
            pickup: 'איסוף עצמי',
        },

        packingTitle: 'רשימת בדיקה לאריזה',
        col: {
            item: 'פריט',
            containers: 'מכלים',
        },
        num: '{k} מתוך {n}',
        tick: 'סימון',
        manualTick: 'סימון ידני',
        manualTickBody: 'המכל יסומן כנסרק ידנית, ללא ברקוד.',

        shipmentTitle: 'משלוח',
        courier: 'חברת שליחויות',
        packages: 'מספר חבילות',
        link: 'שייך לשליח',
        linking: 'משייך לשליח…',
        linked: 'שויך לשליח',
        linkedBody: 'מספר מעקב {tracking} · {courier}',
        linkFailed: 'השיוך נכשל',
        tracking: 'מספר מעקב',
        trackingNumber: 'מספר מעקב',
        linkedAt: 'שויך ב-{stamp} על ידי {by}',
        manual: 'ידני',
        retry: 'נסה שוב',
        manualTracking: 'הזנת מספר מעקב ידנית',
        reprintLabel: 'הדפס מדבקות משלוח',

        contentTitle: 'תוכן ההזמנה',

        historyTitle: 'היסטוריה',
        visibleToCustomer: 'הלקוח רואה',

        stepBack: 'החזר צעד',
        stepBackDestroyLabel:
            'אם כבר הודפסה מדבקת משלוח, יש להשמיד אותה — מדבקה חדשה תודפס בשיוך הבא.',
        cancelOrder: 'ביטול הזמנה',
        markReady: 'מוכן לאיסוף',
        markCollected: 'נאסף',
        collectedByName: 'נאסף על ידי (רשות)',
        openInOrders: 'פתח במסך ההזמנות',
    },

    event: {
        packing_started: 'התחילה אריזה',
        container_scanned_manual: 'מכל סומן ידנית',
        shipment_linked: 'שויך לשליח, מספר מעקב {tracking}',
        shipment_link_failed: 'שיוך לשליח נכשל: {message}',
        shipment_manual: 'מספר מעקב הוזן ידנית',
        shipment_cancelled: 'המשלוח בוטל',
        label_printed: 'מדבקת משלוח הודפסה',
        pickup_list_printed: 'ההזמנה נכנסה לרשימת איסוף',
        handed_to_courier: 'נמסר לשליח',
        ready_for_pickup: 'סומן כמוכן לאיסוף',
        collected: 'נאסף',
        address_updated: 'הכתובת עודכנה',
        delivery_auth_requested: 'בקשת ייפוי כוח נשלחה',
        delivery_auth_signed: 'ייפוי הכוח נחתם',
        status_reverted: 'הוחזר צעד אחד אחורה',
        cancelled_by_station: 'ההזמנה בוטלה מהעמדה',
    },

    history: {
        statusChange: 'הסטטוס השתנה מ-{from} ל-{to}',
    },

    // CourierSettingsTab.vue
    courierTab: {
        title: 'חברות משלוחים',
        col: {
            name: 'חברה',
            connection: 'חיבור',
            active: 'פעילה',
            default: 'ברירת מחדל',
            phone: 'טלפון',
            contact: 'איש קשר',
            lastPickup: 'שעת איסוף אחרונה',
            notes: 'הערות',
            lastResult: 'הצלחה / שגיאה אחרונה',
        },
        connected: 'מחובר',
        notConnected: 'אין חיבור',
        noConnection: 'אי אפשר להפעיל חברה בלי חיבור',
        hasWaiting:
            'אי אפשר להשבית — {n} הזמנות ממתינות לשליח הזה | אי אפשר להשבית — הזמנה אחת ממתינה לשליח הזה',
        lastSuccess: 'הצלחה אחרונה: {stamp}',
    },

    // PickupListModal.vue
    pickupList: {
        title: 'רשימת איסוף לשליח',
        titleFor: 'רשימת איסוף · {courier}',
        col: {
            order: 'הזמנה',
            recipient: 'מקבל',
            city: 'עיר',
            packages: 'חבילות',
            tracking: 'מספר מעקב',
        },
        totals: '{orders} הזמנות · {packages} חבילות',
        driverName: 'שם השליח',
        signature: 'חתימה',
        time: 'שעה',
        untickHint: 'כל השורות מסומנות כנאספו — יש לבטל סימון למה שנשאר',
        print: 'הדפס רשימה',
        handOver: 'נמסר לשליח',
        handedTitle: 'נמסר לשליח',
        handedBody: 'הזמנה אחת נמסרה | {n} הזמנות נמסרו',
    },

    // ManualTrackingModal.vue
    manualTracking: {
        title: 'הזנת מספר מעקב ידנית',
        courier: 'חברת שליחויות',
        tracking: 'מספר מעקב',
        save: 'שמור',
    },

    // CollectModal.vue
    collect: {
        title: 'סימון כנאסף',
        byLabel: 'נאסף על ידי (רשות)',
        byHint: 'למי שאוסף עבור המטופל — לא נדרש כברירת מחדל',
        confirm: 'סמן כנאסף',
    },
};
