<script setup>
// The send queue: what is waiting to go out, whether a trigger or a person put
// it there, and the two things an agent can do about it — release it now, or
// cancel it with a reason.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ChannelFilter from '@/components/messaging/ChannelFilter.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { useMessagingStore } from '@/stores/messaging';

const emit = defineEmits(['compose']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const messaging = useMessagingStore();

const view = useUrlState({ sq: '', sch: '', ssrc: '' });

/** `{ kind: 'send'|'cancel', row }` while a confirmation is open. */
const ask = ref(null);

const scheduled = computed(() => messaging.scheduled);

const cols = computed(() => [
    {
        k: 'when',
        label: t('messaging.scheduled.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.when.stamp,
    },
    { k: 'tpl', label: t('messaging.scheduled.col.template') },
    { k: 'to', label: t('messaging.scheduled.col.recipients') },
    { k: 'ch', label: t('messaging.scheduled.col.channel'), nowrap: true },
    { k: 'src', label: t('messaging.scheduled.col.source') },
    { k: 'act', label: '' },
]);

const channelCounts = computed(() => {
    const counts = {};

    for (const row of scheduled.value) {
        counts[row.ch] = (counts[row.ch] || 0) + 1;
    }

    return counts;
});

const sourceCounts = computed(() => ({
    trigger: scheduled.value.filter((row) => row.source.kind === 'trigger')
        .length,
    manual: scheduled.value.filter((row) => row.source.kind === 'manual')
        .length,
}));

function templateName(id) {
    const template = messaging.templateById[id];

    return template ? loc(template.name) : id;
}

/** Who or what queued a row: the trigger's own event, or the agent's name. */
function sourceLabel(row) {
    if (row.source.kind === 'trigger') {
        const trigger = messaging.triggerById[row.source.trigger];

        return t('messaging.scheduled.sourceTrigger', {
            event: trigger ? loc(trigger.event) : row.source.trigger,
        });
    }

    return row.source.actor
        ? t('messaging.scheduled.sourceManual', {
              actor: loc(row.source.actor),
          })
        : t('messaging.scheduled.sourceManualUnknown');
}

/** Named recipients where the batch names them, a count where it does not. */
function recipientsLabel(row) {
    const names = row.recipients?.names;

    if (names?.length) {
        return names.map((name) => loc(name)).join(' · ');
    }

    return t('messaging.scheduled.recipients', {
        n: num(row.recipients?.count || 0),
    });
}

const rows = computed(() => {
    const query = view.sq.trim().toLowerCase();

    return scheduled.value.filter((row) => {
        if (view.sch && row.ch !== view.sch) {
            return false;
        }

        if (view.ssrc && row.source.kind !== view.ssrc) {
            return false;
        }

        if (
            query &&
            !searchHaystack(
                templateName(row.template),
                recipientsLabel(row),
                sourceLabel(row),
                row.when.stamp,
            ).includes(query)
        ) {
            return false;
        }

        return true;
    });
});

const dirty = computed(() => Boolean(view.sq || view.sch || view.ssrc));

function clear() {
    view.sq = '';
    view.sch = '';
    view.ssrc = '';
}

const dialog = computed(() => {
    if (!ask.value) {
        return null;
    }

    const { kind, row } = ask.value;
    const template = templateName(row.template);

    if (kind === 'send') {
        return {
            title: t('messaging.scheduled.sendNowTitle'),
            confirmLabel: t('messaging.scheduled.sendNow'),
            danger: false,
            reason: false,
            body: t('messaging.scheduled.sendNowBody', {
                template,
                recipients: recipientsLabel(row),
                when: row.when.time,
            }),
            effects: [
                t('messaging.scheduled.sendNowEffectQueue'),
                t('messaging.scheduled.sendNowEffectQuiet'),
                t('messaging.scheduled.sendNowEffectLog'),
            ],
        };
    }

    return {
        title: t('messaging.scheduled.cancelTitle'),
        confirmLabel: t('messaging.scheduled.cancelConfirm'),
        danger: true,
        reason: true,
        body: t('messaging.scheduled.cancelBody', {
            template,
            when: row.when.stamp,
        }),
        effects: [
            t('messaging.scheduled.cancelEffectNoSend'),
            t('messaging.scheduled.cancelEffectReason'),
        ],
    };
});

function confirm(reason) {
    const pending = ask.value;

    ask.value = null;

    if (!pending) {
        return;
    }

    if (pending.kind === 'cancel') {
        messaging.cancelScheduled(pending.row.id, reason);
        push({
            title: t('messaging.scheduled.cancelled'),
            body: t('messaging.scheduled.cancelledBody', { reason }),
            bad: true,
        });

        return;
    }

    const result = messaging.sendScheduledNow(pending.row.id);

    push({
        title: t('messaging.scheduled.sentNow'),
        body: result?.written
            ? t('messaging.scheduled.sentNowBody', { n: num(result.written) })
            : t('messaging.scheduled.sentNowNoRows'),
    });
}
</script>

<template>
    <ACard :title="t('messaging.scheduled.title')" icon="calendar" :pad="false">
        <template #right>
            <AButton sm kind="p" icon="plus" @click="emit('compose')">
                {{ t('messaging.scheduled.compose') }}
            </AButton>
        </template>

        <div class="m-filters">
            <FilterBar
                :count="rows.length"
                :label="
                    t('messaging.of.scheduled', { total: scheduled.length })
                "
                :dirty="dirty"
                @clear="clear"
            >
                <AInput
                    v-model="view.sq"
                    class="m-search"
                    type="search"
                    :placeholder="t('messaging.filter.searchScheduled')"
                    :aria-label="t('messaging.filter.searchScheduled')"
                />
                <ASelect
                    v-model="view.ssrc"
                    :aria-label="t('messaging.filter.source')"
                >
                    <option value="">
                        {{ t('messaging.filter.sourceAll') }}
                    </option>
                    <option value="trigger">
                        {{
                            t('messaging.filter.withCount', {
                                label: t('messaging.filter.sourceAuto'),
                                n: sourceCounts.trigger,
                            })
                        }}
                    </option>
                    <option value="manual">
                        {{
                            t('messaging.filter.withCount', {
                                label: t('messaging.filter.sourceManual'),
                                n: sourceCounts.manual,
                            })
                        }}
                    </option>
                </ASelect>
                <ChannelFilter v-model="view.sch" :counts="channelCounts" />
            </FilterBar>
        </div>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #empty>
                <AEmpty
                    icon="calendar"
                    :title="t('messaging.scheduled.empty.title')"
                    :sub="t('messaging.scheduled.empty.sub')"
                />
            </template>

            <template #cell-when="{ row }">
                <span class="t-strong num">{{ row.when.stamp }}</span>
            </template>

            <template #cell-tpl="{ row }">
                {{ templateName(row.template) }}
            </template>

            <template #cell-to="{ row }">
                {{ recipientsLabel(row) }}
            </template>

            <template #cell-ch="{ row }">
                <AChip tone="gray" size="sm" :dot="false">
                    {{ t(`channel.${row.ch}`) }}
                </AChip>
            </template>

            <template #cell-src="{ row }">
                <span class="t-sub">{{ sourceLabel(row) }}</span>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <AButton
                        sm
                        icon="send"
                        @click="ask = { kind: 'send', row }"
                    >
                        {{ t('messaging.scheduled.sendNow') }}
                    </AButton>
                    <AButton sm icon="x" @click="ask = { kind: 'cancel', row }">
                        {{ t('messaging.scheduled.cancel') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <ConfirmDialog
            :open="Boolean(dialog)"
            :title="dialog?.title || ''"
            :body="dialog?.body || ''"
            :effects="dialog?.effects || []"
            :confirm-label="dialog?.confirmLabel || ''"
            :danger="dialog?.danger || false"
            :reason="dialog?.reason || false"
            @confirm="confirm"
            @close="ask = null"
        />
    </ACard>
</template>

<style scoped>
.m-filters {
    padding: 0 18px;
}

.m-search {
    width: 340px;
    max-width: 100%;
}
</style>
