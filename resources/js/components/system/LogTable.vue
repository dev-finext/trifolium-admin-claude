<script setup>
// The system log, rendered. Every row is immutable by design — this table has
// no edit or delete affordance and never will — so it only reads: who acted,
// what they did, to which entity, and the before/after pair.
//
// How the before/after pair reads depends on the row's `valueType`: a status or
// a message state renders through the same chips the rest of the console uses, a
// `text` value is a translated phrase, and a `plain` value is the same in any
// language (a phone number, a percentage, a batch code).
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { MESSAGE_STATES } from '@/config';
import { fmtISO } from '@/lib/dates';
import { useLocaleStore } from '@/stores/locale';

/** How a source reached the system, mapped to the chip tone that reads it. */
const SOURCE_TONES = { manual: 'teal', automatic: 'gray', external: 'purple' };

defineProps({
    rows: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { loc } = useLocalized();
const localeStore = useLocaleStore();

const cols = [
    { k: 'when', label: t('log.table.when'), nowrap: true },
    { k: 'actor', label: t('log.table.actor'), nowrap: true },
    { k: 'action', label: t('log.table.action') },
    { k: 'entity', label: t('log.table.entity') },
    { k: 'change', label: t('log.table.change') },
    { k: 'source', label: t('log.table.source'), nowrap: true },
    { k: 'ip', label: t('log.table.ip'), nowrap: true },
];

// The pair reads inward: the arrow points the way the page reads, so "before"
// always sits at the start and "after" at the end whichever direction is on.
const arrow = computed(() =>
    localeStore.isRtl ? 'chevron_left' : 'chevron_right',
);

const msgTone = (id) => MESSAGE_STATES[id]?.tone || 'gray';
const sourceTone = (id) => SOURCE_TONES[id] || 'gray';
</script>

<template>
    <ADataTable :cols="cols" :rows="rows" row-key="id">
        <template #empty>
            <AEmpty
                icon="list"
                :title="t('log.empty.title')"
                :sub="t('log.empty.sub')"
            />
        </template>

        <template #cell-when="{ row }">
            <div>
                <ANum>{{ fmtISO(row.when.iso) }}</ANum>
            </div>
            <div class="t-sub">
                <ANum>{{ row.when.time }}</ANum>
            </div>
        </template>

        <template #cell-actor="{ row }">
            <div class="t-strong">{{ loc(row.actor) }}</div>
            <div class="t-sub">{{ t(`logActor.${row.actorType}`) }}</div>
        </template>

        <template #cell-action="{ row }">
            <span class="t-strong">{{ t(`logAction.${row.act}`) }}</span>
        </template>

        <template #cell-entity="{ row }">
            <div>
                <ANum>{{ row.ent }}</ANum>
            </div>
            <div class="t-sub">{{ t(`log.entity.${row.entType}`) }}</div>
        </template>

        <template #cell-change="{ row }">
            <div class="a-logval">
                <span class="a-logval-a">
                    <StatusChip
                        v-if="row.valueType === 'status' && row.from"
                        :status="row.from"
                        size="sm"
                    />
                    <AChip
                        v-else-if="
                            row.valueType === 'message_state' && row.from
                        "
                        :tone="msgTone(row.from)"
                        size="sm"
                    >
                        {{ t(`msgState.${row.from}`) }}
                    </AChip>
                    <template v-else-if="loc(row.from)">{{
                        loc(row.from)
                    }}</template>
                    <template v-else>—</template>
                </span>

                <AIcon :name="arrow" :size="14" />

                <span class="a-logval-b">
                    <StatusChip
                        v-if="row.valueType === 'status' && row.to"
                        :status="row.to"
                        size="sm"
                    />
                    <AChip
                        v-else-if="row.valueType === 'message_state' && row.to"
                        :tone="msgTone(row.to)"
                        size="sm"
                    >
                        {{ t(`msgState.${row.to}`) }}
                    </AChip>
                    <template v-else-if="loc(row.to)">{{
                        loc(row.to)
                    }}</template>
                    <template v-else>—</template>
                </span>
            </div>
        </template>

        <template #cell-source="{ row }">
            <AChip :tone="sourceTone(row.src)" size="sm" :dot="false">
                {{ t(`logSource.${row.src}`) }}
            </AChip>
        </template>

        <template #cell-ip="{ row }">
            <span class="ltr num lt-ip">{{ row.ip }}</span>
        </template>
    </ADataTable>
</template>

<style scoped>
.lt-ip {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
