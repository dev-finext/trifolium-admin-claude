// Two kinds of outside party, deliberately kept apart.
//
// SUPPLIERS are businesses we buy from. Their tab is password-gated because the
// card exposes bank details, trade terms and purchase prices — data that is not
// part of the team's daily work. A missing or expired bookkeeping certificate
// blocks PAYMENT, not purchasing.
//
// VENDOR CONTACTS are the named humans behind the third-party systems the
// platform depends on: who to call when an invoice will not issue.
//
// `spend12` and `open` on a supplier card are NOT authored here: they are
// derived from the supplier invoices and payments by applySupplierBalances()
// in demo/purchasing.js, the same way a practitioner's debt is derived from
// the orders. The zeros below are placeholders the build overwrites.
import { DOC_PROVIDER } from '@/config';
import { SUPPLIER_KIND_IDS } from '@/config/suppliers';
import { L } from '@/lib/localized';

export { SUPPLIER_KIND_IDS };

// The supplier cards moved to demo/suppliers.js when they stopped being
// invented: they are SAP's own ledger now, under SAP's own codes, which is what
// makes an item card's supplier and a purchase order's supplier the same party.
export { DEMO_SUPPLIERS, SUPPLIER_BY_CODE } from '@/demo/suppliers';

/** Payment terms a supplier agreement can be on. */
export const PAY_TERM_IDS = ['immediate', 'net30', 'net60', 'net90'];

/** How the supplier is actually paid. */
export const SUPPLIER_PAY_METHOD_IDS = ['transfer', 'cheque'];

/** Legal form of the business. */
export const BUSINESS_TYPE_IDS = ['ltd', 'sole_trader'];

/**
 * Named contacts at the third-party systems the platform depends on. Who to
 * call, and what they will ask for when you do.
 */
export const DEMO_VENDOR_CONTACTS = [
    {
        id: 'v1',
        system: L(
            `${DOC_PROVIDER.name} — מסמכי מס`,
            `${DOC_PROVIDER.name} — tax documents`,
        ),
        icon: 'file_text',
        contact: L('עומר צדוק', 'Omer Tzadok'),
        role: L('מנהל לקוחות עסקיים', 'Business account manager'),
        phone: '03-000-2081',
        notes: L(
            'הפקת חשבוניות, קבלות ומספרי הקצאה. בכשל הפקה — פנייה עם מספר הבקשה מלוג המסמכים. ייצוא לרו״ח: קובץ פריוריטי (movein.dat). SLA-4H.',
            'Issues invoices, receipts and allocation numbers. On a failure, call with the request id from the document log. Accountant export: Priority file (movein.dat). 4-hour SLA.',
        ),
    },
    {
        id: 'v2',
        system: L('InforU — WhatsApp ו-SMS', 'InforU — WhatsApp & SMS'),
        icon: 'whatsapp',
        contact: L('ליאת נחמיאס', 'Liat Nahmias'),
        role: L('מנהלת לקוח', 'Account manager'),
        phone: '073-000-1120',
        notes: L(
            'אישור תבניות WhatsApp מולה מראש — 2–3 ימי עסקים. תקלות שליחה: מוקד 24/7.',
            'WhatsApp templates are approved through her in advance — 2–3 business days. Send failures: 24/7 desk.',
        ),
    },
    {
        id: 'v3',
        system: L('תפוז שליחויות', 'Tapuz Couriers'),
        icon: 'truck',
        contact: L('אלון יהלום', 'Alon Yahalom'),
        role: L('מנהל תפעול', 'Operations manager'),
        phone: '08-000-3374',
        notes: L(
            'קוד ספק T. חסימת איסופים אחרי 15:00. אין עדיין אינטגרציית API — עדכון מעקב ידני.',
            'Courier code T. No pickups booked after 15:00. No API integration yet — tracking numbers are entered by hand.',
        ),
    },
    {
        id: 'v4',
        system: L('סליקת אשראי', 'Card processing'),
        icon: 'card',
        contact: L('דנה הלוי', 'Dana Halevi'),
        role: L('תמיכה טכנית', 'Technical support'),
        phone: '03-000-9915',
        notes: L(
            'החזרים מעל ₪1,000 דורשים אישור בכתב. דוח התאמה יומי מגיע ב-02:00.',
            'Refunds over ₪1,000 need written approval. The daily reconciliation report arrives at 02:00.',
        ),
    },
    {
        id: 'v5',
        system: L('אחסון ותשתית', 'Hosting & infrastructure'),
        icon: 'layers',
        contact: L('יונתן לביא', 'Yonatan Lavi'),
        role: L('DevOps חיצוני', 'External DevOps'),
        phone: '052-000-4417',
        notes: L(
            'איש הקשר לשחזור גיבוי ולתעודות SSL. זמין גם מחוץ לשעות למקרי השבתה.',
            'The contact for backup restores and SSL certificates. Reachable out of hours for an outage.',
        ),
    },
];

/**
 * Why the supplier tab is gated, and how long an unlock lasts. Copy for the
 * dialog lives in the locale catalog; these are the facts it states.
 */
export const SUPPLIER_GATE = { unlockUntil: 'page_exit_or_manual_lock' };
