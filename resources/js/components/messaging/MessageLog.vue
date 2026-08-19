<script setup>
// The message log: everything that went out, filtered by date range, channel,
// delivery state, category, recipient type and who sent it.
//
// Every filter here is in the URL, so a colleague opening "?tab=log&status=failed"
// lands on exactly the rows the exception bell was pointing at.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ChannelFilter from '@/components/messaging/ChannelFilter.vue';
import MessageDetail from '@/components/messaging/MessageDetail.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { MESSAGE_STATES, MESSAGE_STATE_IDS } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { inRange } from '@/lib/dateRange';
import { isoDaysAgo } from '@/lib/dates';
import { locDeep } from '@/lib/localized';
import { num } from '@/lib/money';
import { useMessagingStore } from '@/stores/messaging';

const { t, locale } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const messaging = useMessagingStore();

const view = useUrlState({
    q: '',
    status: '',
    state: '',
    ch: '',
    cat: '',
    toType: '',
    src: '',
    preset: 'all',
    from: '',
    to: '',
    msg: '',
});

/** The message a resend confirmation is open for, or null. */
const ask = ref(null);

const messages = computed(() => messaging.messages);

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

/** Rows inside the date range — every count below is scoped to it. */
const inWindow = computed(() =>
    messages.value.filter((row) => inRange(row.when.iso, range.value)),
);

const cols = computed(() => [
    {
        k: 'when',
        label: t('messaging.log.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.when.stamp,
    },
    { k: 'to', label: t('messaging.log.col.recipient'), sortable: true },
    { k: 'tpl', label: t('messaging.log.col.template') },
    { k: 'order', label: t('messaging.log.col.order'), nowrap: true },
    { k: 'ch', label: t('messaging.log.col.channel'), nowrap: true },
    { k: 'src', label: t('messaging.log.col.source'), nowrap: true },
    {
        k: 'state',
        label: t('messaging.log.col.state'),
        nowrap: true,
        sortable: true,
    },
    { k: 'act', label: '' },
]);

const counts = computed(() => {
    const tally = {
        status: { sent: 0, failed: 0 },
        state: {},
        channel: {},
        category: {},
        recipient: {},
        source: { auto: 0, manual: 0 },
    };

    for (const row of inWindow.value) {
        tally.status[row.status] = (tally.status[row.status] || 0) + 1;
        tally.state[row.state] = (tally.state[row.state] || 0) + 1;
        tally.channel[row.ch] = (tally.channel[row.ch] || 0) + 1;
        tally.category[row.cat] = (tally.category[row.cat] || 0) + 1;
        tally.recipient[row.toType] = (tally.recipient[row.toType] || 0) + 1;
        tally.source[row.manual ? 'manual' : 'auto'] += 1;
    }

    return tally;
});

function templateName(id) {
    const template = messaging.templateById[id];

    return template ? loc(template.name) : id;
}

function sourceLabel(row) {
    if (!row.manual) {
        return t('messaging.log.automatic');
    }

    return row.actor
        ? t('messaging.log.manualBy', { actor: loc(row.actor) })
        : t('messaging.log.manual');
}

const rows = computed(() => {
    const query = view.q.trim().toLowerCase();

    return inWindow.value.filter((row) => {
        if (view.status && row.status !== view.status) {
            return false;
        }

        if (view.state && row.state !== view.state) {
            return false;
        }

        if (view.ch && row.ch !== view.ch) {
            return false;
        }

        if (view.cat && row.cat !== view.cat) {
            return false;
        }

        if (view.toType && row.toType !== view.toType) {
            return false;
        }

        if (view.src === 'manual' && !row.manual) {
            return false;
        }

        if (view.src === 'auto' && row.manual) {
            return false;
        }

        if (
            query &&
            !searchHaystack(
                row.to,
                row.order,
                row.phone,
                row.actor,
                templateName(row.tpl),
                t(`templateCategory.${row.cat}`),
            ).includes(query)
        ) {
            return false;
        }

        return true;
    });
});

const dirty = computed(() =>
    Boolean(
        view.q ||
        view.status ||
        view.state ||
        view.ch ||
        view.cat ||
        view.toType ||
        view.src,
    ),
);

function clear() {
    view.q = '';
    view.status = '';
    view.state = '';
    view.ch = '';
    view.cat = '';
    view.toType = '';
    view.src = '';
}

// Looked up over every message rather than the filtered rows, so a row opened
// from a link stays open while the reader changes the filter behind it.
const open = computed(
    () => messages.value.find((row) => row.id === view.msg) || null,
);

function stateTone(state) {
    return MESSAGE_STATES[state]?.tone || 'gray';
}

/** Ask before a resend, closing the detail modal the request may have come from. */
function askResend(id) {
    ask.value = messages.value.find((row) => row.id === id) || null;
    view.msg = '';
}

function confirmResend() {
    const message = ask.value;

    ask.value = null;

    if (!message) {
        return;
    }

    const resent = messaging.resendMessage(message.id);

    if (!resent) {
        return;
    }

    push({
        title: t('messaging.log.resent'),
        body: templateName(resent.tpl),
    });
}

/**
 * Export what is on screen. The file is built from the filtered rows in the
 * language the console is being read in, so the CSV matches the table above it.
 */
function exportCsv() {
    const headers = [
        t('messaging.log.col.when'),
        t('messaging.log.col.recipient'),
        t('messaging.detail.phone'),
        t('messaging.log.col.template'),
        t('messaging.detail.category'),
        t('messaging.log.col.order'),
        t('messaging.log.col.channel'),
        t('messaging.log.col.source'),
        t('messaging.log.col.state'),
    ];
    const body = rows.value.map((row) => [
        row.when.stamp,
        locDeep(row.to, locale.value),
        row.phone,
        templateName(row.tpl),
        t(`templateCategory.${row.cat}`),
        row.order,
        t(`channel.${row.ch}`),
        sourceLabel(row),
        t(`msgState.${row.state}`),
    ]);
    const file = `messages-${isoDaysAgo(0)}.csv`;
    downloadCsv(file, headers, body);

    push({
        title: t('messaging.log.exported'),
        body: t('messaging.log.exportedBody', {
            n: num(rows.value.length),
            file,
        }),
    });
}
</script>

<template>
    <div>
        <DateRangeBar
            v-model="range"
            :note="t('messaging.log.inRange', { n: num(inWindow.length) })"
        />

        <FilterBar
            :count="rows.length"
            :label="t('messaging.of.messages', { total: inWindow.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="view.q"
                class="m-search"
                type="search"
                :placeholder="t('messaging.filter.searchLog')"
                :aria-label="t('messaging.filter.searchLog')"
            />
            <ASelect
                v-model="view.status"
                :aria-label="t('messaging.filter.status')"
            >
                <option value="">{{ t('messaging.filter.statusAll') }}</option>
                <option value="sent">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.statusSent'),
                            n: counts.status.sent,
                        })
                    }}
                </option>
                <option value="failed">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.statusFailed'),
                            n: counts.status.failed,
                        })
                    }}
                </option>
            </ASelect>
            <ASelect
                v-model="view.state"
                :aria-label="t('messaging.filter.state')"
            >
                <option value="">{{ t('messaging.filter.stateAll') }}</option>
                <option
                    v-for="id in MESSAGE_STATE_IDS"
                    :key="id"
                    :value="id"
                    :disabled="!counts.state[id]"
                >
                    {{
                        t('messaging.filter.withCount', {
                            label: t(`msgState.${id}`),
                            n: counts.state[id] || 0,
                        })
                    }}
                </option>
            </ASelect>
            <ChannelFilter v-model="view.ch" :counts="counts.channel" />
            <ASelect
                v-model="view.cat"
                :aria-label="t('messaging.filter.category')"
            >
                <option value="">
                    {{ t('messaging.filter.categoryAll') }}
                </option>
                <option
                    v-for="(n, cat) in counts.category"
                    :key="cat"
                    :value="cat"
                >
                    {{
                        t('messaging.filter.withCount', {
                            label: t(`templateCategory.${cat}`),
                            n,
                        })
                    }}
                </option>
            </ASelect>
            <ASelect
                v-model="view.toType"
                :aria-label="t('messaging.filter.recipient')"
            >
                <option value="">
                    {{ t('messaging.filter.recipientAll') }}
                </option>
                <option
                    v-for="(n, type) in counts.recipient"
                    :key="type"
                    :value="type"
                >
                    {{
                        t('messaging.filter.withCount', {
                            label: t(`logActor.${type}`),
                            n,
                        })
                    }}
                </option>
            </ASelect>
            <ASelect
                v-model="view.src"
                :aria-label="t('messaging.filter.source')"
            >
                <option value="">{{ t('messaging.filter.sourceAll') }}</option>
                <option value="auto">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.sourceAuto'),
                            n: counts.source.auto,
                        })
                    }}
                </option>
                <option value="manual">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.sourceManual'),
                            n: counts.source.manual,
                        })
                    }}
                </option>
            </ASelect>
            <AButton icon="download" @click="exportCsv">
                {{ t('messaging.log.export') }}
            </AButton>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="view.msg || null"
            @row="view.msg = $event.id"
        >
            <template #empty>
                <AEmpty
                    icon="whatsapp"
                    :title="t('messaging.log.empty.title')"
                    :sub="t('messaging.log.empty.sub')"
                />
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>

            <template #cell-to="{ row }">
                <div class="t-strong">{{ loc(row.to) }}</div>
                <div class="t-sub">
                    {{ t(`logActor.${row.toType}`) }}
                    <template v-if="row.phone">
                        · <span class="num">{{ row.phone }}</span>
                    </template>
                </div>
            </template>

            <template #cell-tpl="{ row }">
                <div>{{ templateName(row.tpl) }}</div>
                <div class="t-sub">{{ t(`templateCategory.${row.cat}`) }}</div>
            </template>

            <template #cell-order="{ row }">
                <RouterLink
                    v-if="row.order"
                    class="a-linkbtn num"
                    :to="{ name: 'order', params: { id: row.order } }"
                    @click.stop
                    >{{ row.order }}</RouterLink
                >
                <span v-else class="t-sub">—</span>
            </template>

            <template #cell-ch="{ row }">
                <AChip tone="gray" size="sm" :dot="false">
                    {{ t(`channel.${row.ch}`) }}
                </AChip>
            </template>

            <template #cell-src="{ row }">
                <span class="t-sub">{{ sourceLabel(row) }}</span>
            </template>

            <template #cell-state="{ row }">
                <AChip :tone="stateTone(row.state)">
                    {{ t(`msgState.${row.state}`) }}
                </AChip>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton
                        v-if="row.status === 'failed'"
                        sm
                        icon="refresh"
                        @click="ask = row"
                    >
                        {{ t('messaging.log.resend') }}
                    </AButton>
                    <AButton sm icon="eye" @click="view.msg = row.id">
                        {{ t('messaging.log.detail') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <MessageDetail
            :message="open"
            @close="view.msg = ''"
            @resend="askResend"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="t('messaging.log.resendTitle')"
            :body="
                ask
                    ? t('messaging.log.resendBody', {
                          template: templateName(ask.tpl),
                          name: loc(ask.to),
                          phone: ask.phone,
                      })
                    : ''
            "
            :effects="
                ask
                    ? [
                          t('messaging.log.resendEffectAttempt', {
                              channel: t(`channel.${ask.ch}`),
                          }),
                          t('messaging.log.resendEffectLog'),
                      ]
                    : []
            "
            :confirm-label="t('messaging.log.resend')"
            @confirm="confirmResend"
            @close="ask = null"
        />
    </div>
</template>

<style scoped>
.m-search {
    width: 320px;
    max-width: 100%;
}
</style>
