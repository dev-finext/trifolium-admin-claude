// CRM: the activities log and the structured cancellation reason. Second-version
// material (dev/progress.js → `crm`). The taxonomies follow SAP's activity types
// and subjects (OCLT / OCLS) as the team actually uses them; labels live in the
// locale catalogs under `crm.*` and `orders.cancelCause.*`.

/** How the contact happened. */
export const ACTIVITY_TYPE_IDS = [
    'call',
    'whatsapp',
    'email',
    'meeting',
    'note',
];

/** What it was about — a closed list, so the log can be filtered and counted. */
export const ACTIVITY_SUBJECT_IDS = [
    'cancellation',
    'delivery',
    'no_answer',
    'complaint',
    'stock',
    'payment',
    'order_change',
    'general',
];

/** Who an activity is filed under. */
export const ACTIVITY_ENTITY_IDS = ['practitioner', 'customer', 'supplier'];

/** Why an order was cancelled — structured, on top of the written reason. */
export const CANCEL_REASON_IDS = [
    'practitioner_request',
    'patient_request',
    'out_of_stock',
    'payment_failed',
    'duplicate',
    'other',
];
