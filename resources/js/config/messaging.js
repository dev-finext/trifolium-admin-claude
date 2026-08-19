// Customer messaging: channels, the placeholder vocabulary a template may use,
// and delivery states.
//
// The template and trigger *records* themselves are editable data, not
// configuration — they are seeded in resources/js/demo/messaging.js and would
// come from the database in a real deployment.

/** Channels a message can go out on. */
export const CHANNELS = [
    { id: 'whatsapp', icon: 'whatsapp' },
    { id: 'email', icon: 'mail' },
    { id: 'sms', icon: 'phone' },
];

export const CHANNEL_IDS = CHANNELS.map((channel) => channel.id);

/**
 * Placeholders a template may contain. Each has a Hebrew and an English token so
 * a template written in one language still renders in the other; the token text
 * itself lives in the locale catalog under `messaging.var.<id>`.
 */
export const TEMPLATE_VARS = [
    'name',
    'order_no',
    'amount',
    'pay_link',
    'tracking_no',
    'debt_amount',
    'courier',
    'customer_no',
    'order_count',
    'reason',
];

/** Message delivery states and their chip tone. */
export const MESSAGE_STATES = {
    sent: { tone: 'blue' },
    delivered: { tone: 'green' },
    read: { tone: 'green' },
    failed: { tone: 'red' },
    queued: { tone: 'amber' },
};

export const MESSAGE_STATE_IDS = Object.keys(MESSAGE_STATES);

/** Template categories, used to group the template list. */
export const TEMPLATE_CATEGORY_IDS = [
    'pay_link',
    'pay_reminder',
    'debt_notice',
    'status_update',
    'registration',
    'address_request',
    'collection',
];

/** Default quiet hours — no automated message goes out inside this window. */
export const DEFAULT_QUIET_HOURS = { from: '21:00', to: '08:00' };
