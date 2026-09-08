// The global system log: agents, system processes and external interfaces, in
// one immutable stream.
//
// `act` is always an id from LOG_ACTION_IDS — the taxonomy is closed, which is
// what makes the log filterable and translatable. `valueType` says how to read
// the row's from/to pair: `status` and `message_state` carry config ids that
// render through the same chips the rest of the console uses, `text` carries a
// translated phrase, and `plain` carries a value that is the same in any
// language (a phone number, a percentage, a batch code).
import { at, pickFrom, spread } from '@/demo/fixture';
import { DEMO_TEMPLATES } from '@/demo/messaging';
import { DEMO_ACTORS } from '@/demo/people';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/** How many rows the log carries, and how many share one day. */
const LOG_ROWS = 240;
const ROWS_PER_DAY = 9;

/** The system's own address, used when no agent is behind the row. */
const SYSTEM_IP = '10.0.1.12';

/** Entities a log row can be about. */
export const LOG_ENTITY_TYPE_IDS = [
    'order',
    'document',
    'order_item',
    'practitioner',
    'message',
    'message_template',
    'batch',
    'admin_user',
    'system',
];

/** Agents who sign in, and the address they sign in from. */
export const DEMO_LOG_AGENTS = [
    { name: DEMO_ACTORS.orit, ip: '10.0.4.21' },
    { name: DEMO_ACTORS.nir, ip: '10.0.4.34' },
    { name: DEMO_ACTORS.amit, ip: '82.166.19.104' },
    { name: DEMO_ACTORS.ella, ip: '10.0.4.18' },
];

/** The first compounded item on an order, or the first one anywhere. */
function formulaRef(order, orders) {
    const own = order.items.find((item) => item.kind === 'formula');

    if (own) {
        return own.id;
    }

    const other = orders.find((candidate) =>
        candidate.items.some((item) => item.kind === 'formula'),
    );

    return other
        ? other.items.find((item) => item.kind === 'formula').id
        : order.id;
}

const TEXT = {
    pendingApproval: L('ממתין לאישור', 'Pending approval'),
    active: L('פעיל', 'Active'),
    rejectedCert: L('נדחה — תעודה לא תקפה', 'Rejected — certificate not valid'),
    previousPhone: L('טלפון קודם', 'Previous phone'),
    activeItem: L('פריט פעיל', 'Active item'),
    queued: L('בתור שליחה', 'Queued to send'),
    draft: L('טיוטה', 'Draft'),
    sent: L('נשלח', 'Sent'),
    previousVersion: L('גרסה קודמת', 'Previous version'),
    approvedVersion: L('גרסה מעודכנת · אושרה', 'Updated version · approved'),
    noBatch: L('ללא אצווה', 'No batch'),
    immediatePayment: L('תשלום מיידי', 'Immediate payment'),
    creditApproved: L('מאושר להקפה', 'Approved for credit terms'),
    signedIn: L('התחברות מוצלחת', 'Successful sign-in'),
};

/**
 * What each kind of log row looks like. `ref` names the entity the row is
 * about; `values` returns the before/after pair and how to read it.
 *
 * `needs` is what keeps a row truthful. A "tax document issued" line has to be
 * about an order that actually has a document — half the orders have none, and
 * without this the row read "Tax invoice/receipt null" on screen and in the CSV.
 * A def that reads a field only some orders carry declares it here, and the
 * builder picks from the orders that qualify.
 */
const LOG_DEFS = [
    {
        act: 'order_status_change',
        ent: 'order',
        by: 'agent',
        src: 'manual',
        ref: ({ order }) => order.id,
        values: ({ order }) => ({
            valueType: 'status',
            from: 'paid',
            to: order.status,
        }),
    },
    {
        act: 'doc_issue',
        ent: 'document',
        by: 'system',
        src: 'external',
        needs: (order) => Boolean(order.docNum),
        ref: ({ order }) => order.docNum,
        values: ({ order }) => ({
            valueType: 'text',
            from: null,
            to: L(
                `חשבונית מס קבלה ${order.docNum}`,
                `Tax invoice/receipt ${order.docNum}`,
            ),
        }),
    },
    {
        act: 'item_cancel_refund',
        ent: 'order_item',
        by: 'agent',
        src: 'manual',
        ref: ({ order, orders }) => formulaRef(order, orders),
        values: ({ slot }) => {
            const amount = spread(`${slot}:refund`, 90, 380);

            return {
                valueType: 'text',
                from: TEXT.activeItem,
                to: L(
                    `בוטל · זיכוי ₪${amount}`,
                    `Cancelled · ₪${amount} refunded`,
                ),
            };
        },
    },
    {
        act: 'order_cancel',
        ent: 'order',
        by: 'agent',
        src: 'manual',
        ref: ({ order }) => order.id,
        values: () => ({
            valueType: 'status',
            from: 'paid',
            to: 'cancelled',
        }),
    },
    {
        act: 'registration_approve',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: () => ({
            valueType: 'text',
            from: TEXT.pendingApproval,
            to: TEXT.active,
        }),
    },
    {
        act: 'registration_reject',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: () => ({
            valueType: 'text',
            from: TEXT.pendingApproval,
            to: TEXT.rejectedCert,
        }),
    },
    {
        act: 'practitioner_update',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: ({ practitioner }) => ({
            valueType: 'plain',
            from: TEXT.previousPhone,
            to: practitioner.phone,
        }),
    },
    {
        act: 'discount_update',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: ({ slot }) => ({
            valueType: 'plain',
            from: '40%',
            to: pickFrom(`${slot}:disc`, ['45%', '50%']),
        }),
    },
    {
        act: 'points_credit_manual',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: ({ practitioner, slot }) => ({
            valueType: 'plain',
            from: String(practitioner.points),
            to: String(practitioner.points + spread(`${slot}:points`, 20, 120)),
        }),
    },
    {
        act: 'message_send',
        ent: 'message',
        by: 'system',
        src: 'automatic',
        ref: ({ slot }) => `m${spread(`${slot}:msg`, 1000, 1043)}`,
        values: ({ slot }) => ({
            valueType: 'message_state',
            from: 'queued',
            to: pickFrom(`${slot}:state`, ['delivered', 'read', 'sent']),
        }),
    },
    {
        act: 'message_send',
        ent: 'message',
        by: 'agent',
        src: 'manual',
        ref: ({ slot }) => `m${spread(`${slot}:msg`, 1000, 1043)}`,
        values: () => ({
            valueType: 'text',
            from: TEXT.draft,
            to: TEXT.sent,
        }),
    },
    {
        act: 'template_update',
        ent: 'message_template',
        by: 'agent',
        src: 'manual',
        ref: ({ slot }) => pickFrom(`${slot}:tpl`, DEMO_TEMPLATES).id,
        values: () => ({
            valueType: 'text',
            from: TEXT.previousVersion,
            to: TEXT.approvedVersion,
        }),
    },
    {
        act: 'goods_in',
        ent: 'batch',
        by: 'agent',
        src: 'manual',
        ref: ({ slot }) => `B-26${spread(`${slot}:batch`, 10, 99)}`,
        values: ({ slot }) => {
            const kg = spread(`${slot}:kg`, 4, 40);

            return {
                valueType: 'text',
                from: null,
                to: L(`${kg} ק״ג נקלטו`, `${kg} kg received`),
            };
        },
    },
    {
        act: 'batch_allocate',
        ent: 'order_item',
        by: 'agent',
        src: 'manual',
        ref: ({ order, orders }) => formulaRef(order, orders),
        values: ({ slot }) => ({
            valueType: 'plain',
            from: TEXT.noBatch,
            to: `B-26${spread(`${slot}:batch`, 10, 99)}`,
        }),
    },
    {
        act: 'collection_link_issue',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: ({ practitioner, slot }) => {
            const amount =
                practitioner.debt || spread(`${slot}:amount`, 800, 6000);

            return {
                valueType: 'text',
                from: null,
                to: L(`לינק על ₪${amount}`, `Link for ₪${amount}`),
            };
        },
    },
    {
        act: 'credit_terms_approve',
        ent: 'practitioner',
        by: 'agent',
        src: 'manual',
        ref: ({ practitioner }) => practitioner.code,
        values: () => ({
            valueType: 'text',
            from: TEXT.immediatePayment,
            to: TEXT.creditApproved,
        }),
    },
    {
        act: 'tracking_update',
        ent: 'order',
        by: 'agent',
        src: 'manual',
        needs: (order) => Boolean(order.tracking),
        ref: ({ order }) => order.id,
        values: ({ order }) => ({
            valueType: 'plain',
            from: null,
            to: order.tracking,
        }),
    },
    {
        act: 'login',
        ent: 'admin_user',
        by: 'agent',
        src: 'manual',
        ref: ({ agent }) => agent.name,
        values: () => ({
            valueType: 'text',
            from: null,
            to: TEXT.signedIn,
        }),
    },
    {
        act: 'export',
        ent: 'system',
        by: 'agent',
        src: 'manual',
        ref: () => `orders-${isoDaysAgo(0)}.xlsx`,
        values: ({ slot }) => {
            const lines = spread(`${slot}:lines`, 20, 52);

            return {
                valueType: 'text',
                from: null,
                to: L(`${lines} שורות`, `${lines} rows`),
            };
        },
    },
];

/** The whole log, newest first. */
export function buildSystemLog(orders, practitioners) {
    const rows = [];

    for (let i = 0; i < LOG_ROWS; i += 1) {
        const slot = `log:${i}`;
        const def = LOG_DEFS[i % LOG_DEFS.length];
        // Only the orders this kind of row can truthfully be about. The fallback
        // keeps the builder total: a fixture with no qualifying order still
        // produces a log rather than throwing.
        const qualified = def.needs ? orders.filter(def.needs) : orders;
        const pool = qualified.length ? qualified : orders;
        const order = pool[spread(`${slot}:order`, 0, pool.length - 1)];
        const practitioner = pickFrom(`${slot}:practitioner`, practitioners);
        const agent = pickFrom(`${slot}:agent`, DEMO_LOG_AGENTS);
        const daysAgo = Math.floor(i / ROWS_PER_DAY);
        const context = { order, orders, practitioner, agent, slot };
        const { valueType, from, to } = def.values(context);

        rows.push({
            id: `lg${i}`,
            when: at(
                daysAgo,
                spread(`${slot}:hh`, 7, 21),
                spread(`${slot}:mm`, 0, 59),
            ),
            actorType: def.by,
            actor: def.by === 'agent' ? agent.name : DEMO_ACTORS.system,
            act: def.act,
            entType: def.ent,
            ent: def.ref(context),
            valueType,
            from,
            to,
            src: def.src,
            ip: def.by === 'agent' ? agent.ip : SYSTEM_IP,
        });
    }

    return rows.sort((a, b) =>
        `${b.when.iso}${b.when.stamp}`.localeCompare(
            `${a.when.iso}${a.when.stamp}`,
        ),
    );
}
