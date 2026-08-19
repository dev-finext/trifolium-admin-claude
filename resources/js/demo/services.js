// The third-party services the platform depends on, as the health board shows
// them. There is no ERP behind this console any more; what is left is card
// payments, the invoice provider, messaging, couriers and the nightly backups.
//
// `state` is what the last probe returned — it is a stored reading, not a live
// one. Nothing on this board re-checks itself on a timer.
import { now } from '@/lib/dates';
import { L } from '@/lib/localized';

/** States a monitored endpoint can be in. */
export const SERVICE_STATES = {
    ok: { tone: 'green' },
    slow: { tone: 'amber' },
    down: { tone: 'red' },
};

export const SERVICE_STATE_IDS = Object.keys(SERVICE_STATES);

/** How long the allocation-number endpoint has been down, in minutes. */
const ALLOCATION_OUTAGE_MINUTES = 167;

export function buildServices() {
    const downSince = new Date(
        now().getTime() - ALLOCATION_OUTAGE_MINUTES * 60000,
    );

    return [
        {
            id: 'gc',
            sys: L('GoCredit'),
            sysIcon: 'card',
            label: L('סליקה', 'Card processing'),
            ep: '/v2/payments',
            state: 'ok',
            ms: 410,
            last: '14:05',
            uptime: 99.99,
            downAt: null,
            err: null,
        },
        {
            id: 'gc_link',
            sys: L('GoCredit'),
            sysIcon: 'card',
            label: L('קישורי תשלום', 'Payment links'),
            ep: '/v2/payment-links',
            state: 'ok',
            ms: 380,
            last: '14:05',
            uptime: 99.96,
            downAt: null,
            err: null,
        },
        {
            id: 'gi_doc',
            sys: L('Green Invoice'),
            sysIcon: 'file_text',
            label: L('הפקת מסמכים', 'Document issue'),
            ep: '/api/v1/documents',
            state: 'slow',
            ms: 5240,
            last: '14:00',
            uptime: 99.37,
            downAt: null,
            err: null,
        },
        {
            id: 'gi_alloc',
            sys: L('Green Invoice'),
            sysIcon: 'file_text',
            label: L('מספרי הקצאה', 'Allocation numbers'),
            ep: '/documents/allocation',
            state: 'down',
            ms: null,
            last: '13:38',
            uptime: 97.02,
            downAt: downSince,
            err: L(
                '422 allocation service unavailable — מסמכים ממתינים בתור ויופקו אוטומטית',
                '422 allocation service unavailable — documents are queued and will issue automatically',
            ),
        },
        {
            id: 'inforu_wa',
            sys: L('InForU'),
            sysIcon: 'whatsapp',
            label: L('ווטסאפ', 'WhatsApp'),
            ep: '/api/v2/whatsapp',
            state: 'ok',
            ms: 520,
            last: '14:05',
            uptime: 99.92,
            downAt: null,
            err: null,
        },
        {
            id: 'inforu_sms',
            sys: L('InForU'),
            sysIcon: 'mail',
            label: L('SMS'),
            ep: '/api/v2/sms',
            state: 'ok',
            ms: 610,
            last: '14:05',
            uptime: 99.84,
            downAt: null,
            err: null,
        },
        {
            id: 'inforu_mail',
            sys: L('InForU'),
            sysIcon: 'mail',
            label: L('אימייל', 'Email'),
            ep: '/api/v2/email',
            state: 'ok',
            ms: 740,
            last: '14:01',
            uptime: 99.6,
            downAt: null,
            err: null,
        },
        {
            id: 'tapuz',
            sys: L('תפוז', 'Tapuz'),
            sysIcon: 'truck',
            label: L('משלוחים', 'Shipments'),
            ep: '/api/shipments',
            state: 'slow',
            ms: 4980,
            last: '13:58',
            uptime: 96.41,
            downAt: null,
            err: null,
        },
        {
            id: 'backup_db',
            sys: L('גיבויים', 'Backups'),
            sysIcon: 'db',
            label: L('גיבוי מסד הנתונים', 'Database backup'),
            ep: 'nightly · 02:00',
            state: 'ok',
            ms: 1620,
            last: '02:04',
            uptime: 99.98,
            downAt: null,
            err: null,
        },
        {
            id: 'backup_files',
            sys: L('גיבויים', 'Backups'),
            sysIcon: 'layers',
            label: L('גיבוי מסמכים וקבצים', 'Documents & files backup'),
            ep: 'nightly · 02:30',
            state: 'ok',
            ms: 2140,
            last: '02:31',
            uptime: 99.91,
            downAt: null,
            err: null,
        },
    ];
}
