// Messaging — the templates the pharmacy sends, the triggers that fire them,
// what is queued to go out, and the log of what actually went.
//
// The store owns the messaging slice of the loaded dataset and mutates it in
// place rather than keeping a private copy, so a resend that clears a failure
// also clears the failure count on the nav badge. Every mutation calls
// persist(), which is a no-op against the fixture.
//
// Template bodies and names are bilingual *record* fields. Nothing here decides
// which language a body is authored in: the editor writes the language it is
// being read in and this store carries the other one through untouched.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { DEFAULT_QUIET_HOURS, TEMPLATE_VARS } from '@/config';
import { persist } from '@/data/source';
import i18n from '@/i18n';
import { hm, isoDaysAgo, shift, stamp } from '@/lib/dates';
import { L, LOCALES, loc } from '@/lib/localized';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Which row on the service health board answers for each channel. The readings
 * themselves are records and come from the dataset; this is only the mapping.
 */
const CHANNEL_SERVICE = {
    whatsapp: 'inforu_wa',
    sms: 'inforu_sms',
    email: 'inforu_mail',
};

/**
 * Channels that report back when a message was read. The others stop at
 * "delivered", so a row on those channels must never be shown as unread —
 * there is simply no receipt either way.
 */
const READ_RECEIPT_CHANNELS = ['whatsapp'];

/**
 * Usage bands the template list filters by. A band is a rule about how heavily
 * a template is used, not a sample figure.
 */
export const TEMPLATE_USE_BANDS = [
    { id: 'none', min: 0, max: 0 },
    { id: 'low', min: 1, max: 100 },
    { id: 'high', min: 101, max: Infinity },
];

/** One catalog label as a bilingual record value, for content built at runtime. */
function bilingual(key, params = {}) {
    return L(
        i18n.global.t(key, params, { locale: 'he' }),
        i18n.global.t(key, params, { locale: 'en' }),
    );
}

/** One placeholder token, in one language. */
function tokenText(id, code) {
    return i18n.global.t(`messaging.var.${id}`, {}, { locale: code });
}

/** `{ [varId]: { he, en } }` — the placeholder vocabulary, from the catalogs. */
const TOKENS = Object.fromEntries(
    TEMPLATE_VARS.map((id) => [
        id,
        Object.fromEntries(LOCALES.map((code) => [code, tokenText(id, code)])),
    ]),
);

/**
 * Token text → var id, in every language at once, so a body authored in Hebrew
 * still resolves while the console is being read in English.
 */
const VAR_BY_TOKEN = Object.fromEntries(
    Object.entries(TOKENS).flatMap(([id, byLocale]) =>
        Object.values(byLocale).map((text) => [text, id]),
    ),
);

const TOKEN_PATTERN = /\{\{[^{}]*\}\}/g;

/**
 * Split a template body into plain text and `{{…}}` placeholders.
 *
 * `id` is null for a placeholder the vocabulary does not know — those are shown
 * as unresolved rather than silently swallowed, because a token that no longer
 * has a value is exactly what an author needs to see.
 *
 * @param {string} body
 * @returns {Array<{kind: 'text'|'token', text: string, id?: string|null}>}
 */
export function bodySegments(body) {
    const text = String(body ?? '');
    const segments = [];
    let cursor = 0;

    for (const match of text.matchAll(TOKEN_PATTERN)) {
        if (match.index > cursor) {
            segments.push({
                kind: 'text',
                text: text.slice(cursor, match.index),
            });
        }

        segments.push({
            kind: 'token',
            text: match[0],
            id: VAR_BY_TOKEN[match[0]] ?? null,
        });
        cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
        segments.push({ kind: 'text', text: text.slice(cursor) });
    }

    return segments;
}

/**
 * Substitute values into both language versions of a body: each language's own
 * tokens take that language's value, so the Hebrew body and the English body
 * both come out whole and the recipient's language decides which one is sent.
 *
 * @param {{he: string, en: string}|string} body
 * @param {Record<string, *>} values
 * @returns {{he: string, en: string}}
 */
export function renderBody(body, values) {
    const rendered = {};

    for (const code of LOCALES) {
        let text = String(loc(body, code) ?? '');

        for (const id of TEMPLATE_VARS) {
            const value = values?.[id];

            if (value === null || value === undefined) {
                continue;
            }

            text = text.split(TOKENS[id][code]).join(String(loc(value, code)));
        }

        rendered[code] = text;
    }

    return L(rendered.he, rendered.en);
}

function toMinutes(time) {
    const [hours, minutes] = String(time).split(':').map(Number);

    return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Is `HH:MM` inside a quiet window?
 *
 * A quiet window normally crosses midnight (21:00–08:00), which is why this is
 * not a plain range test: outside that case the window is read as written.
 *
 * @param {string} time `HH:MM`
 * @param {{from: string, to: string}|null} [quiet]
 */
export function inQuietHours(time, quiet = DEFAULT_QUIET_HOURS) {
    if (!quiet || !time) {
        return false;
    }

    const minutes = toMinutes(time);
    const from = toMinutes(quiet.from);
    const to = toMinutes(quiet.to);

    if (from <= to) {
        return minutes >= from && minutes < to;
    }

    return minutes >= from || minutes < to;
}

/** The next id in an existing series (`m1043` → `m1044`). */
function nextNumberedId(rows, prefix) {
    const highest = rows.reduce((top, row) => {
        const n = Number(String(row.id).replace(/\D/g, ''));

        return Number.isFinite(n) && n > top ? n : top;
    }, 0);

    return `${prefix}${highest + 1}`;
}

/** "Now", in the same shape the fixture's own timestamps carry. */
function moment(hh = null, mm = 0) {
    const at = shift(0, hh, mm);

    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(at),
        stamp: stamp(0, hh, mm),
    };
}

export const useMessagingStore = defineStore('messaging', () => {
    const dataset = useDatasetStore();

    const locale = computed(() => i18n.global.locale.value);

    const collection = (name) =>
        Array.isArray(dataset.data[name]) ? dataset.data[name] : [];

    const templates = computed(() => collection('messageTemplates'));
    const triggers = computed(() => collection('messageTriggers'));
    const scheduled = computed(() => collection('scheduledMessages'));
    const messages = computed(() => dataset.messages);
    const failedMessages = computed(() => dataset.failedMessages);

    const templateById = computed(() =>
        Object.fromEntries(templates.value.map((row) => [row.id, row])),
    );

    const triggerById = computed(() =>
        Object.fromEntries(triggers.value.map((row) => [row.id, row])),
    );

    const activeTriggerCount = computed(
        () => triggers.value.filter((row) => row.on).length,
    );

    /** How many days the log actually covers — the header states the window. */
    const logDays = computed(() =>
        messages.value.reduce((top, row) => Math.max(top, row.days + 1), 0),
    );

    /** The state of the service behind each channel, or null when unmonitored. */
    const channelHealth = computed(() =>
        Object.fromEntries(
            Object.entries(CHANNEL_SERVICE).map(([channel, serviceId]) => {
                const service = dataset.services.find(
                    (row) => row.id === serviceId,
                );

                return [channel, service ? service.state : null];
            }),
        ),
    );

    /** The chip tone a health reading renders in, as the board defines it. */
    function healthTone(state) {
        const states = dataset.data.serviceStates || {};

        return states[state]?.tone || 'gray';
    }

    /** True while the channel reports read receipts at all. */
    function hasReadReceipts(channel) {
        return READ_RECEIPT_CHANNELS.includes(channel);
    }

    /**
     * The values a preview substitutes.
     *
     * They come from real records — the first shipped order and the first open
     * collection link — so no sample figure is authored in a component. A var
     * with no record behind it stays unresolved and is filled at send time.
     */
    const previewValues = computed(() => {
        const order =
            dataset.orders.find((row) => row.tracking) || dataset.orders[0];
        const link = dataset.collectionLinks[0];

        if (!order) {
            return {};
        }

        return {
            name: order.patient.first,
            order_no: order.id,
            amount: num(order.pricing.total),
            pay_link: link ? link.url : null,
            tracking_no: order.tracking,
            courier: order.courier
                ? bilingual(`courier.${order.courier}`)
                : null,
            debt_amount: link ? num(link.amt) : null,
            customer_no: link ? link.code : null,
            order_count: link ? num(link.n) : null,
            reason: null,
        };
    });

    /** The values a send to one practitioner substitutes, from their own card. */
    function practitionerValues(practitioner) {
        const link = dataset.collectionLinks.find(
            (row) => row.code === practitioner.code,
        );

        return {
            name: practitioner.first,
            customer_no: practitioner.code,
            debt_amount: practitioner.debt ? num(practitioner.debt) : null,
            order_count: link ? num(link.n) : null,
            pay_link: link ? link.url : null,
        };
    }

    /**
     * A body split for display: known placeholders become their value, unknown
     * ones stay visible as tokens. Whichever language's tokens the body holds is
     * the language that resolves, because the vocabulary carries both.
     *
     * Accepts one language's text or a whole `{ he, en }` record field — the
     * record resolves to the language the console is being read in.
     */
    function previewSegments(body, values = previewValues.value) {
        return bodySegments(loc(body, locale.value)).map((segment) => {
            if (segment.kind !== 'token' || !segment.id) {
                return segment;
            }

            const value = values?.[segment.id];

            if (value === null || value === undefined) {
                return segment;
            }

            return {
                kind: 'value',
                text: String(loc(value, locale.value)),
                id: segment.id,
            };
        });
    }

    /** The token to insert for one var, in the language being edited. */
    function tokenFor(id, code = locale.value) {
        return TOKENS[id]?.[code] || '';
    }

    /** The template a category is served by, or null when none is defined. */
    function templateForCategory(cat) {
        return templates.value.find((row) => row.cat === cat) || null;
    }

    const actor = computed(() => dataset.me?.name || null);

    // ---- mutations -----------------------------------------------------------

    /**
     * Save one template. `patch` carries whole `{ he, en }` pairs: the editor
     * rewrites the language it is showing and hands the other one back as it
     * found it, so editing in English never touches the Hebrew a customer gets.
     */
    function saveTemplate(id, patch) {
        const template = templateById.value[id];

        if (!template) {
            return false;
        }

        Object.assign(template, patch);
        persist(`messaging/templates/${id}`, patch, 'PATCH');

        return true;
    }

    /** Turn a trigger on or off. Returns its new state, or null if it is gone. */
    function toggleTrigger(id) {
        const trigger = triggerById.value[id];

        if (!trigger) {
            return null;
        }

        trigger.on = !trigger.on;
        trigger.changed = { at: moment(), by: actor.value };
        persist(`messaging/triggers/${id}`, { on: trigger.on }, 'PATCH');

        return trigger.on;
    }

    /**
     * Write one row into the message log.
     *
     * A new row starts at `sent` and carries no delivered or read time: those
     * come from the gateway, and inventing them here would be inventing a
     * receipt nobody returned.
     */
    function appendMessage({
        template,
        channel,
        to,
        toType,
        phone,
        order,
        values,
        trigger,
    }) {
        const rows = dataset.data.messages;

        if (!Array.isArray(rows) || !template) {
            return null;
        }

        const when = moment();
        const row = {
            id: nextNumberedId(rows, 'm'),
            order: order || null,
            tpl: template.id,
            cat: template.cat,
            ch: channel,
            to,
            toType,
            phone: phone || null,
            when,
            days: 0,
            status: 'sent',
            state: 'sent',
            readSupport: hasReadReceipts(channel),
            manual: !trigger,
            actor: trigger ? null : actor.value,
            triggerCat: trigger ? template.cat : null,
            sentAt: when.time,
            delAt: null,
            readAt: null,
            err: null,
            retried: null,
            body: renderBody(template.body, values),
        };

        rows.unshift(row);
        persist('messaging/messages', {
            template: template.id,
            channel,
            to: toType,
        });

        return row;
    }

    /**
     * Send one template now, to one recipient. The test send, the debt notice
     * and the compose modal all come through here, so every send reaches the log
     * by the same route and reads the same way in it.
     *
     * @param {{templateId: string, channel?: string, recipient: object, values: object, order?: string}} send
     */
    function sendNow({ templateId, channel, recipient, values, order }) {
        const template = templateById.value[templateId];

        if (!template) {
            return null;
        }

        return appendMessage({
            template,
            channel: channel || template.ch,
            to: recipient.name,
            toType: recipient.type,
            phone: recipient.phone,
            order,
            values,
        });
    }

    /** Queue one template for a time later today. */
    function scheduleMessage({ templateId, channel, recipient, time }) {
        const rows = dataset.data.scheduledMessages;
        const template = templateById.value[templateId];

        if (!Array.isArray(rows) || !template) {
            return null;
        }

        const [hh, mm] = String(time).split(':').map(Number);
        const row = {
            id: nextNumberedId(rows, 's'),
            when: moment(hh, mm),
            template: templateId,
            recipients: { count: 1, names: [recipient.name] },
            ch: channel || template.ch,
            source: { kind: 'manual', trigger: null, actor: actor.value },
        };

        rows.unshift(row);
        persist('messaging/scheduled', { template: templateId, time });

        return row;
    }

    /**
     * Retry a failed message in place.
     *
     * The log keeps one row per message and records that the send was repeated —
     * which is also what takes the failure out of the exception count, because
     * the message is no longer failed.
     */
    function resendMessage(id) {
        const row = messages.value.find((message) => message.id === id);

        if (!row || row.status !== 'failed') {
            return null;
        }

        const when = moment();

        row.status = 'sent';
        row.state = 'sent';
        row.err = null;
        row.sentAt = when.time;
        row.retried = { at: when, by: actor.value };
        persist(`messaging/messages/${id}/resend`, {}, 'PATCH');

        return row;
    }

    /** Take one row out of the queue and hand it back. */
    function dequeue(id) {
        const rows = dataset.data.scheduledMessages;

        if (!Array.isArray(rows)) {
            return null;
        }

        const index = rows.findIndex((row) => row.id === id);

        if (index < 0) {
            return null;
        }

        return rows.splice(index, 1)[0];
    }

    /** Cancel a queued batch. The reason travels with the change. */
    function cancelScheduled(id, reason) {
        const row = dequeue(id);

        if (!row) {
            return null;
        }

        persist(`messaging/scheduled/${id}`, { reason }, 'DELETE');

        return row;
    }

    /**
     * Release a queued batch now.
     *
     * A log row is written for every recipient the batch actually names. A
     * trigger batch names a count rather than people — those rows appear once
     * the gateway answers, so none is invented here; the return value says how
     * many were written so the caller can say so too.
     */
    function sendScheduledNow(id) {
        const row = dequeue(id);

        if (!row) {
            return null;
        }

        const template = templateById.value[row.template];
        const names = row.recipients?.names || [];
        let written = 0;

        for (const name of names) {
            const practitioner = dataset.practitioners.find(
                (person) => loc(person.name, 'he') === loc(name, 'he'),
            );
            const sent = appendMessage({
                template,
                channel: row.ch,
                to: name,
                toType: 'practitioner',
                phone: practitioner ? practitioner.phone : null,
                values: practitioner
                    ? practitionerValues(practitioner)
                    : { name },
            });

            if (sent) {
                written += 1;
            }
        }

        persist(`messaging/scheduled/${id}/send`, {});

        return { row, written };
    }

    return {
        templates,
        triggers,
        scheduled,
        messages,
        failedMessages,
        templateById,
        triggerById,
        activeTriggerCount,
        logDays,
        channelHealth,
        previewValues,
        actor,

        healthTone,
        hasReadReceipts,
        practitionerValues,
        previewSegments,
        tokenFor,
        templateForCategory,

        saveTemplate,
        toggleTrigger,
        sendNow,
        scheduleMessage,
        resendMessage,
        cancelScheduled,
        sendScheduledNow,
    };
});
