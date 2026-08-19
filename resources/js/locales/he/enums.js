// Every id-keyed label set in the console.
//
// resources/js/config/ owns the ids, the tones and the business rules; this file
// owns the words. A screen renders an enum by looking up its id here, never by
// carrying the text itself — that is what makes one taxonomy render in two
// languages.
//
// Spread at the top level by locales/he/index.js, so keys read `status.paid`,
// `exception.lab.fix`, `logAction.doc_issue`.
export default {
    // ── orders ── config/statuses.js ORDER_STATUSES
    status: {
        pending_payment: 'ממתין לתשלום',
        credit: 'בהקפה',
        paid: 'שולם',
        in_production: 'בהכנה',
        ready_for_delivery: 'מוכן לאריזה',
        shipped: 'נשלח',
        delivered: 'נמסר',
        completed: 'הושלם',
        cancelled: 'בוטל',
    },

    // Short captions on the progress rail — ORDER_FLOW, not the status chips.
    flowLabel: {
        pending_payment: 'התקבלה',
        paid: 'תשלום',
        in_production: 'הכנה במעבדה',
        ready_for_delivery: 'מוכן לאריזה',
        shipped: 'נשלח',
        delivered: 'נמסר',
    },

    // config/statuses.js ITEM_STAGES + ITEM_CANCELLED
    itemStage: {
        pending_payment: 'ממתין לתשלום',
        awaiting_prep: 'ממתין להכנה',
        in_lab: 'בהכנה במעבדה',
        ready_pack: 'מוכן לאריזה',
        packed: 'נארז',
        shipped: 'נשלח',
        delivered: 'נמסר',
        cancelled: 'בוטל',
    },

    // Reasons an order sits on hold before it enters the lab.
    holdReason: {
        pending_payment: 'ממתין לתשלום',
        awaiting_customer: 'ממתין לאישור לקוח',
        draft: 'טיוטה',
    },

    // ── exceptions ── config/exceptions.js EXCEPTION_TYPES.
    // `label` is the full sentence, `short` the chip, `fix` the next action an
    // agent should take. Every exception has all three: there is no generic
    // "needs attention" state anywhere in this console.
    exception: {
        credit_debt: {
            label: '🚩 חוב בהקפה מעל 30 יום',
            short: 'חוב בהקפה',
            fix: 'הפקת לינק גבייה מעמוד כספים',
        },
        doc_failed: {
            label: 'הפקת חשבונית נכשלה',
            short: 'מסמך נכשל',
            fix: 'הפקה חוזרת מול ספק החשבוניות',
        },
        link_expiring: {
            label: 'קישור תשלום פג בתוך 24 שעות',
            short: 'קישור פג בקרוב',
            fix: 'תזכורת ללקוח — אחרת ההזמנה תתבטל אוטומטית',
        },
        address: {
            label: 'חסרה כתובת משלוח',
            short: 'חסרה כתובת',
            fix: 'בקשת כתובת מהלקוח ב-WhatsApp',
        },
        msg: {
            label: 'הודעה ללקוח נכשלה',
            short: 'הודעה נכשלה',
            fix: 'שליחה חוזרת מיומן ההודעות',
        },
        pay_stale: {
            label: 'ממתינה לתשלום 3+ ימים',
            short: 'תשלום מתעכב',
            fix: 'תזכורת תשלום / ביטול',
        },
        interaction: {
            label: 'התראת אינטראקציה לא אושרה',
            short: 'אינטראקציה לאישור',
            fix: 'אישור רוקח בלשונית בטיחות',
        },
        lab: {
            label: 'תקועה במעבדה 2+ ימים',
            short: 'תקועה במעבדה',
            fix: 'בדיקה מול המעבדה',
        },
        courier: {
            label: 'מוכנה לאריזה בלי שליח',
            short: 'בלי שליח',
            fix: 'הקצאת שליח',
        },
    },

    // ── money ── config/finance.js
    docType: {
        invrec: {
            name: 'חשבונית מס קבלה',
            when: 'תשלום בודד — לקוח קצה או מטפל',
        },
        invrec_multi: {
            name: 'חשבונית מס קבלה מרוכזת',
            when: 'תשלום לינק גבייה — מסמך אחד לכל ההזמנות שבלינק',
        },
        credit: {
            name: 'חשבונית זיכוי',
            when: 'ביטול לאחר תשלום או זיכוי פריט',
        },
    },
    docState: {
        issued: 'הופק',
        failed: 'הפקה נכשלה',
        queued: 'בתור להפקה',
        awaiting_credit: 'ממתין לגבייה',
        none: 'טרם הופק',
        credited: 'זוכה',
    },
    agingBucket: {
        b0: '0–30 יום',
        b1: '31–60 יום',
        b2: '61–90 יום',
        b3: '90+ יום',
    },
    paymentMethod: {
        card: 'אשראי',
        transfer: 'העברה בנקאית',
        cash: 'מזומן',
        credit_terms: 'הקפה',
        points: 'נקודות',
    },
    payer: {
        practitioner: 'המטפל',
        patient: 'הלקוח',
    },
    fulfilment: {
        courier: 'משלוח',
        pickup: 'איסוף עצמי',
    },

    // ── messaging ── config/messaging.js
    channel: {
        whatsapp: 'WhatsApp',
        email: 'אימייל',
        sms: 'SMS',
    },
    msgState: {
        sent: 'נשלחה',
        delivered: 'נמסרה',
        read: 'נקראה',
        failed: 'נכשלה',
        queued: 'בתור לשליחה',
    },
    templateCategory: {
        pay_link: 'קישור לתשלום',
        pay_reminder: 'תזכורת תשלום',
        debt_notice: 'התראת חוב',
        status_update: 'עדכון סטטוס',
        registration: 'אישור הרשמה / דחייה',
        address_request: 'בקשת כתובת/ייפוי כוח',
        collection: 'גבייה',
    },

    // The placeholder tokens a WhatsApp/email template may contain. These are
    // displayed and inserted verbatim, so each is wrapped in vue-i18n's literal
    // form `{'…'}` — a bare `{{…}}` fails to compile as a nested placeholder.
    //
    // NOTE: locales/*/index.js spreads `enums` *before* the `messaging` area
    // namespace, so an area catalog that also defines `messaging` replaces this
    // subtree. Keep `var` here and out of locales/*/messaging.js.
    messaging: {
        var: {
            name: "{'{{שם}}'}",
            order_no: "{'{{מספר הזמנה}}'}",
            amount: "{'{{סכום}}'}",
            pay_link: "{'{{קישור תשלום}}'}",
            tracking_no: "{'{{מספר מעקב}}'}",
            debt_amount: "{'{{סכום חוב}}'}",
            courier: "{'{{חברת שליחויות}}'}",
            customer_no: "{'{{מספר לקוח}}'}",
            order_count: "{'{{מספר הזמנות}}'}",
            reason: "{'{{סיבה}}'}",
        },
    },

    // ── inventory ── config/inventory.js
    warehouse: {
        raw: { name: 'חומרי גלם', short: 'חו״ג' },
        shelf: { name: 'מוצרי מדף', short: 'מדף' },
    },
    batchState: {
        active: 'פעילה',
        expiring: 'תוקף מתקרב',
        expired: 'פג תוקף',
        depleted: 'אזלה',
        rejected: 'נפסלה',
    },
    stockMove: {
        goods_in: 'קליטת סחורה',
        allocated_to_compounding: 'שיוך לרקיחה',
        released_on_cancel: 'ביטול הזמנה — שחרור מלאי',
        adjustment: 'התאמת מלאי',
    },
    // `hint` explains what the reason does to the quantity — a count *sets* it,
    // the other two *deduct* from a named batch.
    adjustReason: {
        count: {
            name: 'ספירת מלאי',
            hint: 'הזנת הכמות שנמצאה בפועל — המערכת רושמת את הפער',
        },
        damage: {
            name: 'שבר או שפיכה',
            hint: 'גריעה מאצווה מסוימת',
        },
        reject: {
            name: 'פסילה',
            hint: 'גריעה וסימון האצווה כנפסלה',
        },
    },

    // ── catalog ── config/catalog.js PREPARATION_FORMS. The nine forms a
    // compounded formula can be prepared in.
    preparationForm: {
        tincture: 'טינקטורה',
        capsule: 'קפסולות',
        powder: 'אבקה',
        tea: 'חליטה',
        decoction: 'בישול אישי',
        gel: 'ג׳ל',
        cream: 'קרם',
        essential_oil: 'שמן אתרי',
        infused_oil: 'שמן מושרה',
    },

    // ── org ── config/org.js
    therapy: {
        naturopathy: 'נטורופתיה',
        herbalism: 'הרבולוגיה',
        chinese_medicine: 'רפואה סינית',
        homeopathy: 'הומאופתיה',
        clinical_nutrition: 'תזונה קלינית',
        reflexology: 'רפלקסולוגיה',
        aromatherapy: 'ארומתרפיה',
        bach_flowers: 'פרחי באך',
    },
    courier: {
        tapuz: 'תפוז שליחויות',
        fedex_il: 'פדקס ישראל',
        yaad: 'יעד שליחויות',
        israel_post: 'דואר שליחים',
    },

    // ── system log ── config/log.js. The taxonomy is closed: a screen picks an
    // id rather than writing a sentence, which is what makes the log filterable.
    logAction: {
        order_status_change: 'שינוי סטטוס הזמנה',
        order_cancel: 'ביטול הזמנה',
        item_cancel_refund: 'ביטול פריט וזיכוי',
        prep_stage_advance: 'קידום שלב הכנה',
        pharmacist_approval: 'אישור רוקח להכנה',
        labels_print: 'הדפסת מדבקות',
        labels_reprint: 'הדפסה חוזרת של מדבקות',
        label_template_update: 'עדכון תבנית מדבקה',
        printer_map_update: 'עדכון מיפוי מדפסות',
        prep_type_update: 'עדכון סוג הכנה ותוקף',
        label_notes_update: 'עדכון הערות מדבקה',
        product_create: 'יצירת מוצר',
        product_update: 'עדכון מוצר',
        product_publish: 'פרסום מוצר',
        product_archive: 'ארכוב מוצר',
        product_restore: 'שחזור מוצר',
        tag_create: 'יצירת תווית',
        tag_rename: 'שינוי שם תווית',
        tag_delete: 'מחיקת תווית',
        ingredient_create: 'הקמת רכיב פורמולה',
        ingredient_update: 'עדכון רכיב פורמולה',
        ingredient_delete: 'מחיקת רכיב פורמולה',
        registration_approve: 'אישור הרשמה',
        registration_reject: 'דחיית הרשמה',
        practitioner_update: 'עדכון כרטיס מטפל',
        discount_update: 'עדכון אחוז הנחה',
        points_credit_manual: 'זיכוי נקודות ידני',
        password_reset: 'איפוס סיסמה למטפל',
        message_send: 'שליחת הודעה ללקוח',
        template_update: 'עדכון תבנית הודעה',
        tracking_update: 'עדכון מספר מעקב',
        doc_issue: 'הפקת חשבונית מס קבלה',
        doc_reissue: 'הפקה חוזרת של מסמך',
        credit_note_issue: 'הפקת חשבונית זיכוי',
        collection_link_issue: 'הפקת לינק גבייה מרוכז',
        payment_record_manual: 'רישום תשלום ידני',
        credit_terms_approve: 'אישור מסלול הקפה',
        credit_terms_revoke: 'ביטול מסלול הקפה',
        goods_in: 'קליטת סחורה למלאי',
        batch_allocate: 'שיוך אצווה לרקיחה',
        batch_reject: 'פסילת אצווה',
        stock_adjust: 'התאמת מלאי',
        login: 'התחברות למערכת',
        export: 'ייצוא נתונים',
    },
    logSource: {
        manual: 'ידני',
        automatic: 'אוטומטי',
        external: 'ממשק חיצוני',
    },
    logActor: {
        agent: 'נציג',
        system: 'תהליך מערכת',
        practitioner: 'מטפל',
        patient: 'לקוח',
    },

    // ── content ── article and lecture categories.
    articleCat: {
        preparation_methods: 'שיטות הכנה',
        health_metabolism: 'בריאות ומטבוליזם',
        formulas_products: 'פורמולות ומוצרים',
        updates: 'עדכונים',
        chinese_medicine: 'רפואה סינית',
        womens_health: 'בריאות האישה',
        herbal_medicine: 'רפואת הצמחים',
    },
};
