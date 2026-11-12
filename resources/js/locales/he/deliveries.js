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
        pickup: 'ממתין לאיסוף עצמי',
        shipped: 'נשלחו',
        couriers: 'ניהול חברות משלוחים',
    },

    scanLabel: 'סריקה',
    scanPlaceholder: 'סרקו ברקוד הזמנה או מכל',
    search: 'הזמנה · מקבל · עיר · מספר מעקב',

    // תקן הרשימות של הדמו: סינון, שבבי סינון ותצוגות שמורות — אותו מנוע
    // שמסכי הדמו האחרים משתמשים בו (useListFilters.js).
    filter: {
        noun: 'הזמנות',
        field: {
            gate: 'מצב השער',
            problem: 'חריג',
            shipTo: 'נמען',
            city: 'עיר',
            courier: 'חברת שליחויות',
        },
        gate: {
            ok: 'תקין',
            blocked: 'חסום',
        },
    },

    filterGroup: {
        state: 'מצב',
        where: 'יעד',
    },

    scan: {
        orderNotFound: 'הזמנה לא נמצאה',
        orderNotInStation: 'ההזמנה במצב {status} — לא בעמדה',
        orderOpened: '✓ ההזמנה נפתחה',
        containerScanned: '✓ פריט {k} מתוך {n} · {name}, {city}',
        alreadyScanned: 'הפריט כבר נסרק',
        belongsToAnotherOrder: 'הפריט שייך להזמנה {id}, לא להזמנה הפתוחה',
        badBarcode: 'ברקוד לא תקין',
        allScannedShipping: '✓ כל הפריטים סומנו — אפשר להעביר לחברת משלוחים',
        allScannedPickup: '✓ כל הפריטים סומנו — אפשר להעביר לאיסוף עצמי',
    },

    col: {
        actions: 'פעולות',
        order: 'הזמנה',
        sentToLab: 'נשלחה למעבדה ב-',
        practitioner: 'מטפל',
        recipient: 'מקבל',
        city: 'עיר',
        ship: 'משלוח / איסוף',
        marked: 'סומנו',
        courier: 'חברה',
        packages: 'חבילות',
        trackingNumber: 'מספר מעקב',
        linkedAt: 'הועבר ב-',
        payer: 'מטפל / משלם',
        phone: 'טלפון',
        readySince: 'מוכן מ-',
        handedAt: 'נמסר / נאסף ב-',
        by: 'על ידי',
    },

    ship: {
        delivery: 'משלוח',
        pickup: 'איסוף עצמי',
    },

    action: {
        linkCourier: 'העבר לחברת משלוחים',
        markReady: 'העבר לאיסוף עצמי',
        markCollected: 'נאסף',
        printPickupList: 'הדפס רשימת איסוף',
    },

    manual: 'ידני',

    empty: {
        title: 'אין הזמנות בטאב הזה',
    },

    toast: {
        readyForPickup: 'ההזמנה ממתינה לאיסוף עצמי',
    },

    // StationOrderCard.vue — כרטיס ההזמנה בעמדה
    card: {
        recipientTitle: 'מקבל וכתובת',
        recipient: 'מקבל',
        phone: 'טלפון',
        address: 'כתובת',
        city: 'עיר',
        street: 'רחוב',
        houseNum: 'מספר בית',
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
        shipTo: {
            me: 'אליי (המטפל)',
            patient: 'אל המטופל/ת',
            pickup: 'איסוף עצמי',
            none: 'לא ידוע',
        },

        packingTitle: 'סימון פריטים · {k} מתוך {n}',
        allMarked: 'כל הפריטים סומנו',
        shelfQty: 'יחידה אחת | {n} יחידות',
        col: {
            item: 'פריט',
            containers: 'מכלים',
        },
        num: '{k} מתוך {n}',
        manualTick: 'סימון ידני',

        shipmentTitle: 'משלוח',
        courier: 'חברת שליחויות',
        packages: 'מספר חבילות',
        editPackages: 'שינוי מספר חבילות',
        linkBlocked: {
            wrongStatus:
                'ההזמנה כבר לא בהכנה — אי אפשר להעביר אותה לחברת משלוחים.',
            notFullyPacked: 'לא כל הפריטים סומנו — יש לסמן את כולם קודם.',
            isPickupOrder: 'זו הזמנה לאיסוף עצמי — היא לא עוברת לחברת משלוחים.',
            gateBlocked:
                'ההזמנה חסומה: חסרה כתובת מלאה או שלא ידוע מי מקבל אותה.',
            noCourier: 'אין חברת משלוחים פעילה.',
        },
        link: 'העבר לחברת משלוחים',
        linking: 'מעביר לחברת המשלוחים…',
        linked: 'הועבר לחברת המשלוחים',
        linkedBody: 'מספר מעקב {tracking} · {courier}',
        linkFailed: 'ההעברה לחברת המשלוחים נכשלה',
        tracking: 'מספר מעקב',
        trackingNumber: 'מספר מעקב',
        manual: 'ידני',
        retry: 'נסה שוב',
        manualTracking: 'הזנת מספר מעקב ידנית',
        trackingRequired: 'יש להזין מספר מעקב',

        contentTitle: 'תוכן ההזמנה',

        historyTitle: 'היסטוריה',
        visibleToCustomer: 'הלקוח רואה',

        // לתפוז אין ביטול דרך ה-API — הסוכן באמת מתקשר (אפיון §3.3, §7.4),
        // ובלי הסימון הזה אי אפשר להמשיך.
        phoneConfirm: 'ביטלתי מול חברת המשלוחים בטלפון',

        stepBack: 'החזר צעד',
        stepBackDestroyLabel:
            'אם חברת המשלוחים כבר הנפיקה מדבקה, יש להשמיד אותה — מדבקה חדשה תונפק בהעברה הבאה.',
        cancelOrder: 'ביטול הזמנה',
        markReady: 'העבר לאיסוף עצמי',
        markCollected: 'נאסף',
        collectedByName: 'נאסף על ידי (רשות)',
        openInOrders: 'פתח במסך ההזמנות',
    },

    event: {
        container_scanned_manual: 'מכל סומן ידנית',
        shipment_linked: 'הועבר לחברת המשלוחים, מספר מעקב {tracking}',
        shipment_link_failed: 'ההעברה לחברת המשלוחים נכשלה: {message}',
        shipment_manual: 'מספר מעקב הוזן ידנית',
        shipment_cancelled: 'המשלוח בוטל',
        pickup_list_printed: 'ההזמנה נכנסה לרשימת איסוף',
        handed_to_courier: 'נמסר לשליח',
        ready_for_pickup: 'הועבר לאיסוף עצמי',
        collected: 'נאסף',
        address_updated: 'הכתובת עודכנה',
        delivery_auth_signed: 'ייפוי הכוח נחתם',
        status_reverted: 'הוחזר צעד אחד אחורה',
        cancelled_by_station: 'ההזמנה בוטלה מהעמדה',
        packages_count_changed: 'מספר החבילות עודכן',
    },

    history: {
        statusChange: 'הסטטוס השתנה מ-{from} ל-{to}',
    },

    // CourierSettingsTab.vue
    courierTab: {
        title: 'ניהול חברות משלוחים',
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

    // CollectModal.vue
    collect: {
        title: 'סימון כנאסף',
        byLabel: 'נאסף על ידי (רשות)',
        byHint: 'למי שאוסף עבור המטופל — לא נדרש כברירת מחדל',
        confirm: 'סמן כנאסף',
    },
};
