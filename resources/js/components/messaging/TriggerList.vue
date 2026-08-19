<script setup>
// The automatic triggers: which event fires which template, on which channel,
// how many retries a failed send gets, and the quiet window that holds a send
// back until morning.
//
// Toggling a row takes effect immediately and is recorded on the trigger, which
// is why the table has a "last change" column rather than a save button.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ChannelFilter from '@/components/messaging/ChannelFilter.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { DEFAULT_QUIET_HOURS } from '@/config';
import { num } from '@/lib/money';
import { useMessagingStore } from '@/stores/messaging';

const emit = defineEmits(['edit']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const messaging = useMessagingStore();

const view = useUrlState({ gq: '', gch: '', gon: '', gtpl: '' });

const triggers = computed(() => messaging.triggers);

const cols = computed(() => [
    { k: 'on', label: t('messaging.triggers.col.on'), w: '84px' },
    { k: 'event', label: t('messaging.triggers.col.event'), sortable: true },
    { k: 'tpl', label: t('messaging.triggers.col.template') },
    { k: 'ch', label: t('messaging.triggers.col.channel') },
    {
        k: 'retries',
        label: t('messaging.triggers.col.retries'),
        nowrap: true,
        sortable: true,
    },
    { k: 'quiet', label: t('messaging.triggers.col.quiet'), nowrap: true },
    { k: 'changed', label: t('messaging.triggers.col.changed'), nowrap: true },
    { k: 'act', label: '' },
]);

const channelCounts = computed(() => {
    const counts = {};

    for (const trigger of triggers.value) {
        for (const channel of trigger.channels) {
            counts[channel] = (counts[channel] || 0) + 1;
        }
    }

    return counts;
});

/** Templates that a trigger actually points at, each with its count. */
const templateCounts = computed(() => {
    const counts = {};

    for (const trigger of triggers.value) {
        counts[trigger.template] = (counts[trigger.template] || 0) + 1;
    }

    return counts;
});

const onCount = computed(() => messaging.activeTriggerCount);
const offCount = computed(() => triggers.value.length - onCount.value);

function templateName(id) {
    const template = messaging.templateById[id];

    return template ? loc(template.name) : id;
}

function quietLabel(trigger) {
    return trigger.quiet
        ? t('messaging.triggers.quietWindow', trigger.quiet)
        : t('messaging.triggers.noQuiet');
}

const rows = computed(() => {
    const query = view.gq.trim().toLowerCase();

    return triggers.value.filter((trigger) => {
        if (view.gch && !trigger.channels.includes(view.gch)) {
            return false;
        }

        if (view.gtpl && trigger.template !== view.gtpl) {
            return false;
        }

        if (view.gon === 'on' && !trigger.on) {
            return false;
        }

        if (view.gon === 'off' && trigger.on) {
            return false;
        }

        if (
            query &&
            !searchHaystack(
                trigger.event,
                templateName(trigger.template),
                quietLabel(trigger),
            ).includes(query)
        ) {
            return false;
        }

        return true;
    });
});

const dirty = computed(() =>
    Boolean(view.gq || view.gch || view.gon || view.gtpl),
);

function clear() {
    view.gq = '';
    view.gch = '';
    view.gon = '';
    view.gtpl = '';
}

function toggle(trigger) {
    const state = messaging.toggleTrigger(trigger.id);

    if (state === null) {
        return;
    }

    push({
        title: state
            ? t('messaging.triggers.turnedOn')
            : t('messaging.triggers.turnedOff'),
        body: loc(trigger.event),
    });
}

function editTemplate(trigger) {
    if (messaging.templateById[trigger.template]) {
        emit('edit', trigger.template);

        return;
    }

    push({ title: t('messaging.triggers.missingTemplate'), bad: true });
}
</script>

<template>
    <div class="a-grid">
        <div class="a-note a-note--info">
            {{ t('messaging.triggers.note') }}
            {{ t('messaging.triggers.quietDefault', DEFAULT_QUIET_HOURS) }}
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('messaging.of.triggers', { total: triggers.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="view.gq"
                class="m-search"
                type="search"
                :placeholder="t('messaging.filter.searchTriggers')"
                :aria-label="t('messaging.filter.searchTriggers')"
            />
            <ASelect
                v-model="view.gon"
                :aria-label="t('messaging.filter.triggerState')"
            >
                <option value="">
                    {{ t('messaging.filter.triggerStateAll') }}
                </option>
                <option value="on">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.on'),
                            n: onCount,
                        })
                    }}
                </option>
                <option value="off">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.off'),
                            n: offCount,
                        })
                    }}
                </option>
            </ASelect>
            <ChannelFilter v-model="view.gch" :counts="channelCounts" />
            <ASelect
                v-model="view.gtpl"
                :aria-label="t('messaging.filter.template')"
            >
                <option value="">
                    {{ t('messaging.filter.templateAll') }}
                </option>
                <option v-for="(n, id) in templateCounts" :key="id" :value="id">
                    {{
                        t('messaging.filter.withCount', {
                            label: templateName(id),
                            n,
                        })
                    }}
                </option>
            </ASelect>
        </FilterBar>

        <ACard :pad="false">
            <ADataTable :cols="cols" :rows="rows" row-key="id">
                <template #empty>
                    <AEmpty
                        icon="refresh"
                        :title="t('messaging.triggers.empty.title')"
                        :sub="t('messaging.triggers.empty.sub')"
                    />
                </template>

                <template #cell-on="{ row }">
                    <ASwitch
                        :model-value="row.on"
                        :label="loc(row.event)"
                        @update:model-value="toggle(row)"
                    />
                </template>

                <template #cell-event="{ row }">
                    <span class="t-strong">{{ loc(row.event) }}</span>
                </template>

                <template #cell-tpl="{ row }">
                    {{ templateName(row.template) }}
                </template>

                <template #cell-ch="{ row }">
                    <span class="m-chans">
                        <AChip
                            v-for="channel in row.channels"
                            :key="channel"
                            tone="gray"
                            size="sm"
                            :dot="false"
                        >
                            {{ t(`channel.${channel}`) }}
                        </AChip>
                    </span>
                </template>

                <template #cell-retries="{ row }">
                    <ANum>{{ num(row.retries) }}</ANum>
                </template>

                <template #cell-quiet="{ row }">
                    <ANum v-if="row.quiet">{{ quietLabel(row) }}</ANum>
                    <span v-else class="t-sub">{{ quietLabel(row) }}</span>
                </template>

                <template #cell-changed="{ row }">
                    <span v-if="row.changed" class="t-sub">
                        {{
                            t('messaging.triggers.changedBy', {
                                actor: loc(row.changed.by) || t('labels.none'),
                                time: row.changed.at.time,
                            })
                        }}
                    </span>
                    <span v-else class="t-sub">—</span>
                </template>

                <template #cell-act="{ row }">
                    <div class="a-rowbtns">
                        <AButton sm icon="edit" @click="editTemplate(row)">
                            {{ t('messaging.triggers.editTemplate') }}
                        </AButton>
                    </div>
                </template>
            </ADataTable>
        </ACard>
    </div>
</template>

<style scoped>
.m-search {
    width: 340px;
    max-width: 100%;
}

.m-chans {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
}
</style>
