<script setup>
// One connection: what the platform calls, how it is configured, and which
// monitored endpoints belong to it.
//
// Nothing on this card is written here. Every value is read from configuration
// (config/finance.js, config/integrations.js, config/messaging.js, config/org.js)
// or from the endpoint records themselves, so a change to a retry policy or a
// courier code moves this card without anyone editing it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CREDIT, DOC_TYPES, PAY_LINK } from '@/config/finance';
import { BACKUP_POLICY } from '@/config/integrations';
import { CHANNELS, DEFAULT_QUIET_HOURS } from '@/config/messaging';
import { COURIERS } from '@/config/org';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { worstState } from '@/stores/system';

const props = defineProps({
    /** One entry from CONNECTIONS in config/integrations.js. */
    connection: { type: Object, required: true },
    /** The monitored endpoints this connection covers. */
    services: { type: Array, default: () => [] },
    states: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();

const field = (id) => t(`integrations.connections.field.${id}`);
const value = (id, params) =>
    t(`integrations.connections.value.${id}`, params || {});

const provider = computed(() => props.connection.provider);

/** A branded provider names itself; the generic connections are named in copy. */
const title = computed(
    () =>
        provider.value?.name ||
        t(`integrations.connections.name.${props.connection.id}`),
);

const state = computed(() =>
    props.services.length ? worstState(props.services) : '',
);

const stateTone = computed(() => props.states[state.value]?.tone || 'gray');

const stateLabel = computed(() =>
    state.value === 'ok'
        ? t('integrations.connections.connected')
        : t(`integrations.state.${state.value}`),
);

/** The provider's own three lines, shared by every branded connection. */
function providerRows() {
    const rows = [
        {
            key: 'baseUrl',
            label: field('baseUrl'),
            value: provider.value.baseUrl,
            ltr: true,
        },
        {
            key: 'env',
            label: field('env'),
            value: t(`integrations.connections.env.${provider.value.env}`),
        },
    ];

    if (provider.value.apiKeyMask) {
        rows.push({
            key: 'apiKey',
            label: field('apiKey'),
            value: provider.value.apiKeyMask,
            ltr: true,
        });
    }

    return rows;
}

function docRows() {
    return [
        ...providerRows(),
        {
            key: 'issueMode',
            label: field('issueMode'),
            value: value('autoIssue'),
        },
        {
            key: 'retries',
            label: field('retries'),
            value: value('retries', {
                n: provider.value.retries,
                gap: provider.value.retryGapMinutes,
            }),
        },
        {
            key: 'docTypes',
            label: field('docTypes'),
            value: DOC_TYPES.map((doc) => t(`docType.${doc.id}.name`)).join(
                ' · ',
            ),
        },
    ];
}

function payRows() {
    return [
        ...providerRows(),
        {
            key: 'linkLife',
            label: field('linkLife'),
            value: value('linkLife', {
                days: PAY_LINK.days,
                reminder: PAY_LINK.reminderDay,
            }),
        },
        { key: 'onExpiry', label: field('onExpiry'), value: value('onExpiry') },
        {
            key: 'collectionLink',
            label: field('collectionLink'),
            value: CREDIT.allowPartial
                ? value('partialAllowed')
                : value('allOrNothing'),
        },
    ];
}

function msgRows() {
    const [from, to] = provider.value.templateApprovalDays;

    return [
        ...providerRows(),
        {
            key: 'channels',
            label: field('channels'),
            value: CHANNELS.map((channel) => t(`channel.${channel.id}`)).join(
                ' · ',
            ),
        },
        {
            key: 'templates',
            label: field('templates'),
            value: value('templates', {
                n: num((dataset.data.messageTemplates || []).length),
            }),
        },
        {
            key: 'templateApproval',
            label: field('templateApproval'),
            value: value('approvalDays', { from, to }),
        },
        {
            key: 'quietHours',
            label: field('quietHours'),
            value: value('quietHours', DEFAULT_QUIET_HOURS),
        },
    ];
}

function courierRows() {
    const withApi = COURIERS.filter((courier) => courier.hasApi);

    return [
        {
            key: 'couriers',
            label: field('couriers'),
            value: COURIERS.map((courier) => t(`courier.${courier.id}`)).join(
                ' · ',
            ),
        },
        {
            key: 'courierApi',
            label: field('courierApi'),
            value: withApi.length
                ? withApi
                      .map((courier) => t(`courier.${courier.id}`))
                      .join(' · ')
                : value('noCourierApi'),
        },
        {
            key: 'courierCodes',
            label: field('courierCodes'),
            value: value('courierCodes', {
                codes: COURIERS.map((courier) => courier.code).join(' · '),
            }),
        },
    ];
}

/** One row per backup endpoint, each with the retention window its policy sets. */
function backupRows() {
    return [
        ...props.services.map((service) => ({
            key: service.id,
            label: loc(service.label),
            value: value('retention', {
                schedule: service.ep,
                days: BACKUP_POLICY.retentionDays[service.id],
            }),
        })),
        {
            key: 'restore',
            label: field('restore'),
            value: value('restoreTested', {
                months: BACKUP_POLICY.restoreTestedMonths,
            }),
        },
        {
            key: 'sourceOfTruth',
            label: field('sourceOfTruth'),
            value: value('singleSource'),
        },
    ];
}

const BUILDERS = {
    doc: docRows,
    pay: payRows,
    msg: msgRows,
    courier: courierRows,
    backup: backupRows,
};

const rows = computed(() => {
    const build = BUILDERS[props.connection.id];

    return build ? build() : [];
});
</script>

<template>
    <ACard :title="title" :icon="connection.icon">
        <template #right>
            <AChip v-if="state" :tone="stateTone" size="sm">
                {{ stateLabel }}
            </AChip>
        </template>

        <div class="conn-what">
            {{ t(`integrations.connections.what.${connection.id}`) }}
        </div>

        <AKeyValue>
            <template v-for="row in rows" :key="row.key">
                <dt>{{ row.label }}</dt>
                <dd :class="{ ltr: row.ltr }">{{ row.value }}</dd>
            </template>
        </AKeyValue>

        <div v-if="services.length" class="conn-mon">
            {{ t('integrations.connections.monitored', services.length) }}
        </div>
    </ACard>
</template>

<style scoped>
.conn-what {
    margin-bottom: 12px;
    color: var(--a-ink-3);
    font-size: 14.5px;
}

.conn-mon {
    margin-top: 12px;
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
