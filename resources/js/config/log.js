// The global system log.
//
// Every state-changing action writes one immutable row. The action taxonomy is
// closed: a screen picks an id from here rather than inventing a sentence, which
// is what makes the log filterable and translatable.
export const LOG_ACTION_IDS = [
    // orders
    'order_status_change',
    'order_cancel',
    'item_cancel_refund',
    'prep_stage_advance',
    'pharmacist_approval',
    // labels & printing
    'labels_print',
    'labels_reprint',
    'label_template_update',
    'printer_map_update',
    'prep_type_update',
    'label_notes_update',
    // catalog
    'product_create',
    'product_update',
    'product_publish',
    'product_archive',
    'product_restore',
    'tag_create',
    'tag_rename',
    'tag_delete',
    'ingredient_create',
    'ingredient_update',
    'ingredient_delete',
    'item_create',
    'item_update',
    'prep_type_create',
    'bom_create',
    'bom_update',
    'bom_delete',
    // files
    'attachment_add',
    'attachment_remove',
    // purchasing
    'po_create',
    'po_update',
    'po_cancel',
    'po_receive',
    'supplier_note_close',
    'inventory_settings_update',
    // orders & deliveries (V2)
    'order_urgent_set',
    'lab_role_set',
    'order_item_fields_update',
    'pickup_point_create',
    'pickup_point_update',
    // people
    'registration_approve',
    'registration_reject',
    'practitioner_update',
    'discount_update',
    'points_credit_manual',
    'password_reset',
    // messaging
    'message_send',
    'template_update',
    'tracking_update',
    // money
    'doc_issue',
    'doc_reissue',
    'credit_note_issue',
    'collection_link_issue',
    'payment_record_manual',
    'credit_terms_approve',
    'credit_terms_revoke',
    // inventory
    'goods_in',
    'batch_allocate',
    'batch_reject',
    'stock_adjust',
    // session
    'login',
    'export',
];

/** How an action reached the system. */
export const LOG_SOURCE_IDS = ['manual', 'automatic', 'external'];

/** Who performed it. */
export const LOG_ACTOR_TYPES = ['agent', 'system', 'practitioner', 'patient'];

/** Actions that change money and are always retained, whatever the filter. */
export const LOG_FINANCIAL_ACTION_IDS = [
    'doc_issue',
    'doc_reissue',
    'credit_note_issue',
    'collection_link_issue',
    'payment_record_manual',
    'item_cancel_refund',
];
