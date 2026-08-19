<script setup>
// Debt by age. The buckets are AGING_BUCKETS from config/finance.js — this
// component invents no range and no threshold — and a click on a row filters the
// balances list to that bucket, which makes the table the screen's coarsest
// filter rather than a read-only summary.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ADataTable from '@/components/ui/ADataTable.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import { num } from '@/lib/money';

const props = defineProps({
    /** `[{ id, tone, n, amt, share }]` from the money store. */
    rows: { type: Array, default: () => [] },
    /** The bucket whose row reads as the one in force. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['pick']);

const { t } = useI18n();

const cols = computed(() => [
    { k: 'label', label: t('finance.aging.range') },
    {
        k: 'n',
        label: t('finance.aging.practitioners'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'amt',
        label: t('labels.amount'),
        nowrap: true,
        sortable: true,
    },
    { k: 'share', label: t('finance.aging.share') },
]);

const empty = computed(() => props.rows.every((row) => row.n === 0));
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="empty ? [] : rows"
        row-key="id"
        :selected="selected"
        @row="(row) => emit('pick', row.id)"
    >
        <template #empty>
            <slot name="empty" />
        </template>

        <template #cell-label="{ row }">
            <span class="t-strong">{{ t(`agingBucket.${row.id}`) }}</span>
        </template>

        <template #cell-n="{ row }">
            <ANum>{{ num(row.n) }}</ANum>
        </template>

        <template #cell-amt="{ row }">
            <AMoney v-if="row.amt" :value="row.amt" />
            <span v-else class="f-dash">—</span>
        </template>

        <template #cell-share="{ row }">
            <div class="f-share">
                <div class="f-share-track">
                    <div
                        class="f-share-fill"
                        :class="`is-${row.tone}`"
                        :style="{ width: `${row.share}%` }"
                    />
                </div>
                <span class="num f-share-n">{{ row.share }}%</span>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.f-share {
    display: flex;
    align-items: center;
    gap: 10px;
}

.f-share-track {
    flex: 1;
    max-width: 260px;
    height: 8px;
    border-radius: 4px;
    background: var(--a-line);
    overflow: hidden;
}

.f-share-fill {
    height: 100%;
    background: var(--a-line-2);
}

.f-share-fill.is-amber {
    background: var(--a-amber);
}

.f-share-fill.is-red {
    background: var(--a-red);
}

.f-share-n {
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.f-dash {
    color: var(--a-ink-4);
}
</style>
