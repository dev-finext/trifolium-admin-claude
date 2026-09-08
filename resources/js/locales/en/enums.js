// English enum labels — mirrors he/enums.js key for key.
//
// A real translation of the compounding-pharmacy domain, not a transliteration:
// בהקפה is "on credit terms", רקיחה is "compounding", אצווה is "batch",
// חשבונית מס קבלה is a "tax invoice/receipt", מטפל is a "practitioner".
export default {
    // ── orders ── config/statuses.js ORDER_STATUSES
    // config/statuses.js — the eight values ORDR.U_OrderState holds
    status: {
        new: 'New order',
        in_process: 'In process',
        lab: 'In the lab',
        packed: 'Packed',
        sent: 'Sent',
        closed: 'Closed',
        on_hold: 'On hold',
        cancelled: 'Cancelled',
    },

    // config/statuses.js PAYMENT_STATE_IDS — a field of its own, not a step
    payment: {
        unpaid: 'Unpaid',
        paid: 'Paid',
        credit: 'On credit terms',
    },

    // Short captions on the progress rail — ORDER_FLOW, not the status chips.
    flowLabel: {
        pending: 'Received',
        confirmed: 'Confirmed',
        in_production: 'Lab compounding',
        ready: 'Ready',
        shipped: 'Shipped',
        delivered: 'Delivered',
    },

    // Reasons an order sits on hold before it enters the lab.
    holdReason: {
        unpaid: 'Not yet paid',
        awaiting_customer: 'Awaiting customer approval',
        draft: 'Draft',
    },

    // ── exceptions ── config/exceptions.js EXCEPTION_TYPES.
    // `label` is the full sentence, `short` the chip, `fix` the next action an
    // agent should take. Every exception has all three: there is no generic
    // "needs attention" state anywhere in this console.
    exception: {
        credit_debt: {
            label: '🚩 Credit-terms debt over 30 days',
            short: 'Credit debt',
            fix: 'Issue a collection link from the Finance screen',
        },
        doc_failed: {
            label: 'Tax invoice/receipt could not be issued',
            short: 'Document failed',
            fix: 'Re-issue through the invoice provider',
        },
        link_expiring: {
            label: 'Payment link expires within 24 hours',
            short: 'Link expiring',
            fix: 'Remind the customer — otherwise the order is cancelled automatically',
        },
        address: {
            label: 'Delivery address is missing',
            short: 'No address',
            fix: 'Request the address from the customer on WhatsApp',
        },
        msg: {
            label: 'Message to the customer failed',
            short: 'Message failed',
            fix: 'Resend from the message log',
        },
        pay_stale: {
            label: 'Awaiting payment for 3+ days',
            short: 'Payment stalling',
            fix: 'Payment reminder / cancellation',
        },
        interaction: {
            label: 'Interaction warning not approved',
            short: 'Interaction to approve',
            fix: 'Pharmacist approval on the Safety tab',
        },
        lab: {
            label: 'Stuck in the lab for 2+ days',
            short: 'Stuck in lab',
            fix: 'Check with the lab',
        },
        courier: {
            label: 'Ready to pack with no courier assigned',
            short: 'No courier',
            fix: 'Assign a courier',
        },
    },

    // ── money ── config/finance.js
    docType: {
        invrec: {
            name: 'Tax invoice/receipt',
            when: 'A single payment — end customer or practitioner',
        },
        invrec_multi: {
            name: 'Consolidated tax invoice/receipt',
            when: 'A collection-link payment — one document for every order in the link',
        },
        credit: {
            name: 'Credit note',
            when: 'Cancellation after payment, or an item refund',
        },
    },
    docState: {
        issued: 'Issued',
        failed: 'Issuing failed',
        queued: 'Queued for issuing',
        awaiting_credit: 'Awaiting collection',
        none: 'Not issued yet',
        credited: 'Credited',
    },
    agingBucket: {
        b0: '0–30 days',
        b1: '31–60 days',
        b2: '61–90 days',
        b3: '90+ days',
    },
    paymentMethod: {
        card: 'Credit card',
        transfer: 'Bank transfer',
        cash: 'Cash',
        credit_terms: 'Credit terms',
        points: 'Points',
    },
    payer: {
        practitioner: 'Practitioner',
        patient: 'Customer',
    },
    fulfilment: {
        courier: 'Courier delivery',
        pickup: 'Self pickup',
    },

    // ── messaging ── config/messaging.js
    channel: {
        whatsapp: 'WhatsApp',
        email: 'Email',
        sms: 'SMS',
    },
    msgState: {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed',
        queued: 'Queued',
    },
    templateCategory: {
        pay_link: 'Payment link',
        pay_reminder: 'Payment reminder',
        debt_notice: 'Debt notice',
        status_update: 'Status update',
        registration: 'Registration approval / rejection',
        address_request: 'Address / power-of-attorney request',
        collection: 'Collection',
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
            name: "{'{{name}}'}",
            order_no: "{'{{order_no}}'}",
            amount: "{'{{amount}}'}",
            pay_link: "{'{{pay_link}}'}",
            tracking_no: "{'{{tracking_no}}'}",
            debt_amount: "{'{{debt_amount}}'}",
            courier: "{'{{courier}}'}",
            customer_no: "{'{{customer_no}}'}",
            order_count: "{'{{order_count}}'}",
            reason: "{'{{reason}}'}",
        },
    },

    // ── inventory ── config/inventory.js
    warehouse: {
        raw: { name: 'Raw materials', short: 'Raw' },
        shelf: { name: 'Shelf products', short: 'Shelf' },
    },
    batchState: {
        active: 'Active',
        expiring: 'Expiring soon',
        expired: 'Expired',
        depleted: 'Depleted',
        rejected: 'Rejected',
    },
    stockMove: {
        goods_in: 'Goods in',
        allocated_to_compounding: 'Allocated to compounding',
        released_on_cancel: 'Order cancelled — stock released',
        adjustment: 'Stock adjustment',
    },
    // `hint` explains what the reason does to the quantity — a count *sets* it,
    // the other two *deduct* from a named batch.
    adjustReason: {
        count: {
            name: 'Stock count',
            hint: 'Enter the quantity actually found — the system records the variance',
        },
        damage: {
            name: 'Breakage or spillage',
            hint: 'Deducts from a named batch',
        },
        reject: {
            name: 'Rejection',
            hint: 'Deducts and marks the batch as rejected',
        },
    },

    // ── catalog ── config/catalog.js PREPARATION_FORMS. The nine forms a
    // compounded formula can be prepared in.
    preparationForm: {
        tincture: 'Tincture',
        capsule: 'Capsules',
        powder: 'Powder',
        tea: 'Herbal tea',
        decoction: 'Decoction',
        gel: 'Gel',
        cream: 'Cream',
        essential_oil: 'Essential oil',
        infused_oil: 'Infused oil',
    },

    // ── org ── config/org.js
    therapy: {
        naturopathy: 'Naturopathy',
        herbalism: 'Herbalism',
        chinese_medicine: 'Chinese medicine',
        homeopathy: 'Homeopathy',
        clinical_nutrition: 'Clinical nutrition',
        reflexology: 'Reflexology',
        aromatherapy: 'Aromatherapy',
        bach_flowers: 'Bach flowers',
    },
    courier: {
        tapuz: 'Tapuz Couriers',
        special_delivery: 'Special Delivery',
        focus: 'Focus Couriers',
        yarden: 'Yarden Couriers',
        deliver: 'Deliver',
        sosna: 'Sosna (historical)',
    },
    // V2 — config/org.js WEEKDAY_IDS / PICKUP_POINT_KIND_IDS
    weekday: {
        sun: 'Sunday',
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
    },
    pickupKind: {
        shop: 'Partner shop',
        practitioner: 'Practitioner',
    },

    // ── system log ── config/log.js. The taxonomy is closed: a screen picks an
    // id rather than writing a sentence, which is what makes the log filterable.
    logAction: {
        order_status_change: 'Order status changed',
        order_cancel: 'Order cancelled',
        item_cancel_refund: 'Item cancelled and refunded',
        prep_stage_advance: 'Compounding stage advanced',
        pharmacist_approval: 'Pharmacist approval to compound',
        labels_print: 'Labels printed',
        labels_reprint: 'Labels reprinted',
        label_template_update: 'Label template updated',
        printer_map_update: 'Printer mapping updated',
        prep_type_update: 'Preparation type and shelf life updated',
        label_notes_update: 'Label notes updated',
        product_create: 'Product created',
        product_update: 'Product updated',
        product_publish: 'Product published',
        product_archive: 'Product archived',
        product_restore: 'Product restored',
        tag_create: 'Tag created',
        tag_rename: 'Tag renamed',
        tag_delete: 'Tag deleted',
        ingredient_create: 'Ingredient created',
        ingredient_update: 'Ingredient updated',
        ingredient_delete: 'Ingredient deleted',
        item_create: 'Item created',
        item_update: 'Item card updated',
        prep_type_create: 'Preparation type created',
        bom_create: 'Bill of materials created',
        bom_update: 'Bill of materials updated',
        bom_delete: 'Bill of materials deleted',
        attachment_add: 'File attached',
        attachment_remove: 'File removed',
        po_create: 'Purchase order created',
        po_update: 'Purchase order updated',
        po_cancel: 'Purchase order cancelled',
        po_receive: 'Goods received against a purchase order',
        supplier_note_close: 'Supplier delivery note closed by invoice',
        inventory_settings_update: 'Batch settings updated',
        order_urgent_set: 'Order urgency set',
        lab_role_set: 'Lab role marked',
        order_item_fields_update: 'Preparation fields updated on an item',
        pickup_point_create: 'Pickup point created',
        pickup_point_update: 'Pickup point updated',
        lab_settings_update: 'Lab managed texts updated',
        prep_sheet_print: 'Prep sheet printed',
        activity_add: 'CRM activity recorded',
        gate_unlock: 'Protected action unlocked',
        sticker_template_update: 'Sticker template updated',
        sticker_note_update: 'Sticker note updated',
        sticker_print: 'Stickers printed',
        registration_approve: 'Registration approved',
        registration_reject: 'Registration rejected',
        practitioner_update: 'Practitioner card updated',
        discount_update: 'Discount percentage updated',
        points_credit_manual: 'Manual points credit',
        password_reset: 'Practitioner password reset',
        message_send: 'Message sent to customer',
        template_update: 'Message template updated',
        tracking_update: 'Tracking number updated',
        doc_issue: 'Tax invoice/receipt issued',
        doc_reissue: 'Document re-issued',
        credit_note_issue: 'Credit note issued',
        collection_link_issue: 'Consolidated collection link issued',
        payment_record_manual: 'Payment recorded manually',
        credit_terms_approve: 'Credit terms approved',
        credit_terms_revoke: 'Credit terms revoked',
        goods_in: 'Goods received into stock',
        batch_allocate: 'Batch allocated to compounding',
        batch_reject: 'Batch rejected',
        stock_adjust: 'Stock adjusted',
        login: 'Signed in',
        export: 'Data exported',
    },
    logSource: {
        manual: 'Manual',
        automatic: 'Automatic',
        external: 'External interface',
    },
    logActor: {
        agent: 'Agent',
        system: 'System process',
        practitioner: 'Practitioner',
        patient: 'Customer',
    },

    // ── content ── article and lecture categories.
    articleCat: {
        preparation_methods: 'Preparation methods',
        health_metabolism: 'Health & metabolism',
        formulas_products: 'Formulas & products',
        updates: 'Updates',
        chinese_medicine: 'Chinese medicine',
        womens_health: "Women's health",
        herbal_medicine: 'Herbal medicine',
    },
};
