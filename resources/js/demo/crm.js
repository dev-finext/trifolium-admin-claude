// CRM activities — second-version fixture content.
//
// What the support team does all day and SAP recorded 7,400 times in 2025: a
// call, a WhatsApp exchange, an email, a meeting, filed under a customer card
// with a managed type and subject, and linked to an order when there is one.
import { ACTIVITY_TYPE_IDS } from '@/config/crm';
import { at, chance, pickFrom, spread } from '@/demo/fixture';
import { SUPPORT_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** Sample texts per subject. Plain, the way a support agent actually writes them. */
const TEXTS = {
    cancellation: [
        L(
            'המטפל ביקש לבטל — המטופל שינה את דעתו לפני התשלום',
            'The practitioner asked to cancel — the patient changed their mind before paying',
        ),
        L(
            'ביטול לבקשת המטופל · הפורמולה תוזמן מחדש בשבוע הבא',
            'Cancelled at the patient’s request · the formula will be re-ordered next week',
        ),
    ],
    delivery: [
        L(
            'בירור משלוח: החבילה טרם הגיעה · נמסר מספר המעקב',
            'Delivery inquiry: the parcel has not arrived · tracking number given',
        ),
        L(
            'המטופל מבקש להעביר לאיסוף בקליניקה במקום משלוח',
            'The patient asks to switch to pickup at the clinic instead of delivery',
        ),
    ],
    no_answer: [
        L(
            'אין מענה — הושארה הודעה ב-WhatsApp',
            'No answer — a WhatsApp message was left',
        ),
    ],
    complaint: [
        L(
            'תלונה על טעם מרוכז מדי · הועבר למעבדה לבדיקה',
            'Complaint about too concentrated a taste · passed to the lab to check',
        ),
        L(
            'תלונה על זמן מענה — הוסבר תהליך התורים',
            'Complaint about response time — the queue process was explained',
        ),
    ],
    stock: [
        L(
            'בירור מלאי: צמח חסר · הוצע תחליף ואושר על ידי המטפל',
            'Stock inquiry: a herb is out · a substitute was offered and approved by the practitioner',
        ),
    ],
    payment: [
        L(
            'תזכורת לתשלום · יסדיר עד סוף השבוע',
            'Payment reminder · will settle by the end of the week',
        ),
        L(
            'בקשה לפריסת תשלום — הועבר להנהלה',
            'Request to split the payment — passed to management',
        ),
    ],
    order_change: [
        L(
            'בקשה להוסיף פורמולה להזמנה שכבר במעבדה',
            'Request to add a formula to an order already in the lab',
        ),
    ],
    general: [
        L(
            'שיחה כללית: עדכון פרטי הקליניקה ושעות איסוף',
            'General call: clinic details and pickup hours updated',
        ),
        L(
            'הדרכה על אשף הרקיחה החדש — נקבעה שיחה',
            'Training on the new compounding wizard — a call was scheduled',
        ),
    ],
};

/** Subjects weighted the way the 2025 log actually leans. */
const SUBJECT_MIX = [
    'delivery',
    'delivery',
    'general',
    'general',
    'no_answer',
    'payment',
    'stock',
    'complaint',
    'order_change',
    'cancellation',
];

const SUPPLIER_SUBJECTS = ['stock', 'payment', 'general'];
const SUPPLIER_CODES = ['S-104', 'S-118', 'S-131'];

function activity(id, entity, ref, slot, subject, order = null) {
    return {
        id,
        entity,
        ref,
        type: pickFrom(`${slot}:type`, ACTIVITY_TYPE_IDS),
        subject,
        text: pickFrom(`${slot}:text`, TEXTS[subject]),
        by: pickFrom(`${slot}:by`, SUPPORT_ACTORS),
        when: at(
            spread(`${slot}:day`, 1, 60),
            spread(`${slot}:hh`, 8, 18),
            spread(`${slot}:mm`, 0, 59),
        ),
        order,
        auto: false,
    };
}

/**
 * Activities on practitioners (two to five each), on every third customer and
 * on three suppliers, newest first.
 */
export function buildActivities(practitioners, customers, orders) {
    const rows = [];
    let n = 0;

    practitioners.forEach((practitioner) => {
        const mine = orders.filter(
            (order) => order.practitioner.code === practitioner.code,
        );
        const count = spread(`crm:${practitioner.code}:n`, 2, 5);

        for (let i = 0; i < count; i += 1) {
            const slot = `crm:${practitioner.code}:${i}`;
            const subject = pickFrom(`${slot}:subject`, SUBJECT_MIX);
            const order =
                mine.length && chance(`${slot}:order`, 0.6)
                    ? pickFrom(`${slot}:pick`, mine).id
                    : null;

            n += 1;
            rows.push(
                activity(
                    `act-${n}`,
                    'practitioner',
                    practitioner.code,
                    slot,
                    subject,
                    order,
                ),
            );
        }
    });

    customers.forEach((customer, i) => {
        if (i % 3 !== 0) {
            return;
        }

        const slot = `crm:${customer.code}`;
        const mine = orders.filter((order) => order.patient.tz === customer.tz);

        n += 1;
        rows.push(
            activity(
                `act-${n}`,
                'customer',
                customer.code,
                slot,
                pickFrom(`${slot}:subject`, [
                    'delivery',
                    'general',
                    'no_answer',
                ]),
                mine.length ? mine[0].id : null,
            ),
        );
    });

    SUPPLIER_CODES.forEach((code) => {
        const count = spread(`crm:${code}:n`, 1, 2);

        for (let i = 0; i < count; i += 1) {
            const slot = `crm:${code}:${i}`;

            n += 1;
            rows.push(
                activity(
                    `act-${n}`,
                    'supplier',
                    code,
                    slot,
                    pickFrom(`${slot}:subject`, SUPPLIER_SUBJECTS),
                ),
            );
        }
    });

    return rows.sort((a, b) => a.when.daysAgo - b.when.daysAgo);
}
