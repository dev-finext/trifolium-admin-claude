// Customer messaging: the templates the pharmacy sends, the triggers that fire
// them, the log of what actually went out, and what is queued to go next.
//
// Templates and triggers are records, not configuration — an admin edits them
// in the console. A body is authored in both languages because the recipient's
// language decides which one is sent; the `{{…}}` tokens differ accordingly.
import { CHANNELS, TEMPLATE_CATEGORY_IDS } from '@/config';
import {
    at,
    atPlusMinutes,
    chance,
    fraction,
    pickFrom,
    spread,
} from '@/demo/fixture';
import { DEMO_ACTORS, SUPPORT_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** How many rows the message log carries, and how many share one day. */
const MESSAGE_COUNT = 44;
const MESSAGES_PER_DAY = 6;
const FIRST_MESSAGE_NUMBER = 1000;

/** Message templates, as an admin sees them in the template editor. */
export const DEMO_TEMPLATES = [
    {
        id: 't1',
        name: L('קישור לתשלום ללקוח', 'Payment link to the customer'),
        cat: 'pay_link',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, הפורמולה שהוכנה עבורך אצל {{שם המטפל}} מוכנה לתשלום.\nמספר הזמנה: {{מספר הזמנה}}\nסכום: ₪{{סכום}}\nלתשלום ולמסירת כתובת: {{קישור תשלום}}\nהקישור תקף ל-8 ימים.',
            'Hello {{name}}, the formula compounded for you by {{practitioner_name}} is ready for payment.\nOrder number: {{order_no}}\nAmount: ₪{{amount}}\nTo pay and give a delivery address: {{pay_link}}\nThe link is valid for 8 days.',
        ),
        uses: 1284,
        on: true,
    },
    {
        id: 't2',
        name: L('תזכורת תשלום', 'Payment reminder'),
        cat: 'pay_reminder',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, ההזמנה {{מספר הזמנה}} עדיין ממתינה לתשלום בסך ₪{{סכום}}.\nלהשלמת התשלום: {{קישור תשלום}}',
            'Hello {{name}}, order {{order_no}} is still awaiting payment of ₪{{amount}}.\nTo complete the payment: {{pay_link}}',
        ),
        uses: 412,
        on: true,
    },
    {
        id: 't3',
        name: L('התראת חוב למטפל', 'Practitioner debt notice'),
        cat: 'debt_notice',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, נותרה יתרת חוב פתוחה בסך ₪{{סכום חוב}} בכרטיס הלקוח שלך.\nלהסדרה ניתן להשיב להודעה זו.',
            'Hello {{name}}, an open balance of ₪{{debt_amount}} remains on your account.\nReply to this message to settle it.',
        ),
        uses: 47,
        on: true,
    },
    {
        id: 't4',
        name: L('ההזמנה בהכנה', 'Order in preparation'),
        cat: 'status_update',
        ch: 'whatsapp',
        body: L(
            'ההזמנה {{מספר הזמנה}} נכנסה להכנה במעבדה. נעדכן כשתהיה מוכנה.',
            'Order {{order_no}} has gone into preparation in the lab. We will let you know when it is ready.',
        ),
        uses: 986,
        on: true,
    },
    {
        id: 't5',
        name: L('נשלח + מספר מעקב', 'Shipped + tracking number'),
        cat: 'status_update',
        ch: 'whatsapp',
        body: L(
            'ההזמנה {{מספר הזמנה}} נשלחה עם {{חברת שליחויות}}.\nמספר מעקב: {{מספר מעקב}}',
            'Order {{order_no}} has been shipped with {{courier}}.\nTracking number: {{tracking_no}}',
        ),
        uses: 731,
        on: true,
    },
    {
        id: 't6',
        name: L('מוכן לאיסוף', 'Ready for pickup'),
        cat: 'status_update',
        ch: 'whatsapp',
        body: L(
            'ההזמנה {{מספר הזמנה}} מוכנה לאיסוף בבית המרקחת — יגאל אלון 94, קומה 3, תל אביב. שעות: 09:00–17:00.',
            'Order {{order_no}} is ready for pickup at the pharmacy — 94 Yigal Alon St, floor 3, Tel Aviv. Hours: 09:00–17:00.',
        ),
        uses: 208,
        on: true,
    },
    {
        id: 't7',
        name: L('אישור הרשמה', 'Registration approved'),
        cat: 'registration',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, ההרשמה שלך אושרה. מספר הלקוח שלך: {{מספר לקוח}}. הסיסמה הראשונית נשלחה במייל.',
            'Hello {{name}}, your registration has been approved. Your customer number is {{customer_no}}. The initial password was sent by email.',
        ),
        uses: 96,
        on: true,
    },
    {
        id: 't8',
        name: L('דחיית הרשמה', 'Registration rejected'),
        cat: 'registration',
        ch: 'email',
        body: L(
            'שלום {{שם}}, לא ניתן היה לאשר את ההרשמה. סיבה: {{סיבה}}. ניתן להשיב למייל זה עם מסמכים מעודכנים.',
            'Hello {{name}}, we could not approve your registration. Reason: {{reason}}. Reply to this email with up-to-date documents.',
        ),
        uses: 11,
        on: true,
    },
    {
        id: 't9',
        name: L('בקשת כתובת וייפוי כוח', 'Address & power of attorney request'),
        cat: 'address_request',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, כדי לשלוח את ההזמנה {{מספר הזמנה}} נדרשת כתובת למשלוח וחתימה על ייפוי כוח לשליח: {{קישור תשלום}}',
            'Hello {{name}}, to ship order {{order_no}} we need a delivery address and a signed power of attorney for the courier: {{pay_link}}',
        ),
        uses: 302,
        on: true,
    },
    {
        id: 't10',
        name: L(
            'לינק גבייה מרוכז למטפל',
            'Consolidated collection link for a practitioner',
        ),
        cat: 'collection',
        ch: 'whatsapp',
        body: L(
            'שלום {{שם}}, מרוכזות עבורך {{מספר הזמנות}} הזמנות בסך ₪{{סכום חוב}}.\nלתשלום מרוכז: {{קישור תשלום}}\nהקישור תקף ל-7 ימים.',
            'Hello {{name}}, {{order_count}} orders totalling ₪{{debt_amount}} are consolidated for you.\nTo pay them together: {{pay_link}}\nThe link is valid for 7 days.',
        ),
        uses: 38,
        on: true,
    },
];

/**
 * Triggers. `quiet` is the window inside which nothing automated goes out; a
 * trigger with no quiet window (a registration approval) carries null.
 */
export const DEMO_TRIGGERS = [
    {
        id: 'g1',
        event: L(
            'הזמנה ב״ממתין לתשלום״ מעל 48 שעות',
            'Order awaiting payment for over 48 hours',
        ),
        template: 't2',
        channels: ['whatsapp'],
        on: true,
        retries: 2,
        quiet: { from: '21:00', to: '08:00' },
    },
    {
        id: 'g2',
        event: L('סטטוס שונה ל״נשלח״', 'Status changed to shipped'),
        template: 't5',
        channels: ['whatsapp'],
        on: true,
        retries: 3,
        quiet: { from: '22:00', to: '07:00' },
    },
    {
        id: 'g3',
        event: L('סטטוס שונה ל״בהכנה״', 'Status changed to in preparation'),
        template: 't4',
        channels: ['whatsapp'],
        on: true,
        retries: 1,
        quiet: { from: '22:00', to: '07:00' },
    },
    {
        id: 'g4',
        event: L(
            'סטטוס שונה ל״מוכן לאיסוף״',
            'Status changed to ready for pickup',
        ),
        template: 't6',
        channels: ['whatsapp'],
        on: true,
        retries: 2,
        quiet: { from: '21:00', to: '08:00' },
    },
    {
        id: 'g5',
        event: L(
            'יתרת חוב מעל ₪1,000 · אחת לשבוע',
            'Open balance over ₪1,000 · once a week',
        ),
        template: 't3',
        channels: ['whatsapp'],
        on: false,
        retries: 1,
        quiet: { from: '20:00', to: '09:00' },
    },
    {
        id: 'g6',
        event: L('הרשמה אושרה', 'Registration approved'),
        template: 't7',
        channels: ['whatsapp', 'email'],
        on: true,
        retries: 2,
        quiet: null,
    },
    {
        id: 'g7',
        event: L(
            'הזמנה עם משלוח ללא ייפוי כוח חתום',
            'Order for delivery without a signed power of attorney',
        ),
        template: 't9',
        channels: ['whatsapp'],
        on: true,
        retries: 3,
        quiet: { from: '21:00', to: '08:00' },
    },
    {
        id: 'g8',
        event: L(
            'חוב בהקפה מעל 30 יום · אחת לשבוע',
            'Credit debt over 30 days · once a week',
        ),
        template: 't10',
        channels: ['whatsapp'],
        on: true,
        retries: 2,
        quiet: { from: '20:00', to: '09:00' },
    },
    {
        id: 'g9',
        event: L(
            'קישור תשלום ללקוח — יום 5 מתוך 7',
            'Customer payment link — day 5 of 7',
        ),
        template: 't2',
        channels: ['whatsapp'],
        on: true,
        retries: 2,
        quiet: { from: '21:00', to: '08:00' },
    },
];

/** Provider errors, verbatim as the gateway returns them. */
const SEND_ERRORS = [
    'WhatsApp: recipient not on WhatsApp (1013)',
    'WhatsApp: template paused by provider (132015)',
    'InforU: invalid destination number',
];

const HE_TOKENS = {
    name: '{{שם}}',
    order_no: '{{מספר הזמנה}}',
    amount: '{{סכום}}',
    pay_link: '{{קישור תשלום}}',
};

const EN_TOKENS = {
    name: '{{name}}',
    order_no: '{{order_no}}',
    amount: '{{amount}}',
    pay_link: '{{pay_link}}',
};

function render(body, tokens, values) {
    return Object.entries(tokens).reduce(
        (text, [id, token]) => text.split(token).join(values[id]),
        body,
    );
}

/** The message log: what was sent, to whom, and how far it got. */
export function buildMessages(orders) {
    const messages = [];

    for (let i = 0; i < MESSAGE_COUNT; i += 1) {
        const slot = `message:${i}`;
        const order = orders[spread(`${slot}:order`, 0, orders.length - 1)];
        const template = pickFrom(`${slot}:template`, DEMO_TEMPLATES);
        const failed = chance(`${slot}:failed`, 0.14);
        const day = Math.floor(i / MESSAGES_PER_DAY);
        const sentAt = at(
            day,
            spread(`${slot}:hh`, 8, 20),
            spread(`${slot}:mm`, 0, 59),
        );
        const deliveredAt = atPlusMinutes(
            sentAt,
            spread(`${slot}:delivery`, 1, 4),
        );
        const readAt = atPlusMinutes(
            deliveredAt,
            spread(`${slot}:read`, 3, 90),
        );
        const readSupport = template.ch === 'whatsapp';
        const manual = chance(`${slot}:manual`, 0.32);
        const roll = fraction(`${slot}:state`);
        const state = failed
            ? 'failed'
            : readSupport && roll < 0.62
              ? 'read'
              : roll < 0.9
                ? 'delivered'
                : 'sent';
        const toPatient =
            template.cat === 'pay_link' ||
            template.cat === 'address_request' ||
            chance(`${slot}:to`, 0.5);
        const values = {
            name: toPatient ? order.patient.first : order.practitioner.first,
            order_no: order.id,
            amount: order.pricing.total,
            pay_link: `https://pay.trifolium.co.il/p/${order.payToken}`,
        };

        messages.push({
            id: `m${FIRST_MESSAGE_NUMBER + i}`,
            order: order.id,
            tpl: template.id,
            cat: template.cat,
            ch: template.ch,
            to: toPatient ? order.patient.name : order.practitioner.name,
            toType: toPatient ? 'patient' : 'practitioner',
            phone: toPatient ? order.patient.phone : order.practitioner.phone,
            when: sentAt,
            days: day,
            status: failed ? 'failed' : 'sent',
            state,
            readSupport,
            manual,
            actor: manual ? pickFrom(`${slot}:actor`, SUPPORT_ACTORS) : null,
            triggerCat: manual ? null : template.cat,
            sentAt: sentAt.time,
            delAt: state === 'sent' || failed ? null : deliveredAt.time,
            readAt: state === 'read' ? readAt.time : null,
            err: failed ? pickFrom(`${slot}:err`, SEND_ERRORS) : null,
            body: L(
                render(template.body.he, HE_TOKENS, {
                    ...values,
                    name: values.name.he,
                }),
                render(template.body.en, EN_TOKENS, {
                    ...values,
                    name: values.name.en,
                }),
            ),
        });
    }

    return messages;
}

/** Sends that are queued but have not gone out yet. */
export function buildScheduledMessages() {
    return [
        {
            id: 's1',
            when: at(0, 18, 0),
            template: 't2',
            recipients: { count: 6, names: null },
            ch: 'whatsapp',
            source: { kind: 'trigger', trigger: 'g1', actor: null },
        },
        {
            id: 's2',
            when: at(-1, 9, 30),
            template: 't3',
            recipients: {
                count: 2,
                names: [
                    L('יואב שטרן', 'Yoav Stern'),
                    L('רחל סער', 'Rachel Saar'),
                ],
            },
            ch: 'whatsapp',
            source: {
                kind: 'manual',
                trigger: null,
                actor: DEMO_ACTORS.ronitSupport,
            },
        },
        {
            id: 's3',
            when: at(-1, 12, 0),
            template: 't9',
            recipients: { count: 4, names: null },
            ch: 'whatsapp',
            source: { kind: 'trigger', trigger: 'g7', actor: null },
        },
        {
            id: 's4',
            when: at(-2, 8, 0),
            template: 't2',
            recipients: { count: 3, names: null },
            ch: 'whatsapp',
            source: { kind: 'trigger', trigger: 'g1', actor: null },
        },
    ];
}

/** Channel ids in the order the messaging screen groups them. */
export const MESSAGE_CHANNEL_IDS = CHANNELS.map((channel) => channel.id);

/** Template categories, re-exported so a screen can group without two imports. */
export { TEMPLATE_CATEGORY_IDS };
