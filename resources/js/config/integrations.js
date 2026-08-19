// The outside services this platform calls, as connection settings rather than
// as health readings.
//
// One direction only: the console reads from these providers while an agent is
// working. Nothing exports data anywhere, and nothing is pulled on a schedule —
// there is no second database to reconcile against since the ERP was retired.
//
// Same shape and same rule as DOC_PROVIDER in config/finance.js, which is where
// the invoice provider's own settings already live: `apiKeyMask` is a display
// value only. A real deployment reads its keys from the server environment; a
// key is never shipped to the browser.
import { DOC_PROVIDER } from '@/config/finance';

/** Card processing and payment links. */
export const PAY_PROVIDER = {
    name: 'GoCredit',
    baseUrl: 'https://api.gocredit.co.il/v2',
    env: 'production',
    apiKeyMask: 'gc_live_••••8f30',
};

/**
 * WhatsApp, SMS and email. A new WhatsApp template is approved by the provider
 * before it can be used, which is why a copy change is not a same-day change.
 */
export const MSG_PROVIDER = {
    name: 'InForU',
    baseUrl: 'https://api.inforu.co.il/api/v2',
    env: 'production',
    templateApprovalDays: [2, 3],
};

/**
 * Backups. Since the ERP was retired this database is the single source of
 * truth, so a failed backup is a critical exception rather than a maintenance
 * note.
 *
 * `retentionDays` is keyed by the monitored endpoint the policy applies to, so
 * the connection card reads each window off the endpoint it belongs to instead
 * of carrying its own copy of the list. `restoreTestedMonths` is how often a
 * restore is actually rehearsed.
 */
export const BACKUP_POLICY = {
    retentionDays: { backup_db: 30, backup_files: 90 },
    restoreTestedMonths: 3,
};

/**
 * The connection cards, in the order the screen shows them. `service` names the
 * id prefix of the monitored endpoints that belong to the connection, so a card
 * and the health board agree on which system they are talking about without
 * either of them holding a second copy of the list.
 */
export const CONNECTIONS = [
    { id: 'doc', icon: 'file_text', provider: DOC_PROVIDER, services: ['gi'] },
    { id: 'pay', icon: 'card', provider: PAY_PROVIDER, services: ['gc'] },
    { id: 'msg', icon: 'whatsapp', provider: MSG_PROVIDER, services: ['inforu'] },
    { id: 'courier', icon: 'truck', provider: null, services: ['tapuz'] },
    { id: 'backup', icon: 'db', provider: null, services: ['backup'] },
];

export const CONNECTION_IDS = CONNECTIONS.map((connection) => connection.id);
