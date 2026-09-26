<script setup>
// V3 — the purchase requests raised from the planning report.
//
// A request is an ask, not an order: "שים לב לא הזמנה אלה בקשה כי עדיין לא אושר
// על ידי הספק". It waits here until the supplier answers, and only then becomes
// a purchase order — which is why the two lists are separate tabs and why a
// request carries its own number, on the same series SAP numbers `OPRQ` by.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { PURCHASE_REQUEST_STATE } from '@/config';
import { ils } from '@/lib/money';
import { usePlanningStore } from '@/stores/planning';

defineProps({
    /** The request whose drawer is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = usePlanningStore();

const rows = computed(() =>
    store.purchaseRequests.map((request) => ({
        ...request,
        value: request.lines.reduce(
            (sum, line) => sum + (Number(line.price) || 0) * Number(line.qty),
            0,
        ),
    })),
);

const cols = computed(() => [
    { k: 'number', label: t('planning.request.col.number'), nowrap: true },
    { k: 'supplier', label: t('planning.request.col.supplier') },
    { k: 'state', label: t('planning.request.col.state'), nowrap: true },
    { k: 'lines', label: t('planning.request.col.lines') },
    { k: 'value', label: t('planning.request.col.value'), nowrap: true },
    { k: 'raised', label: t('planning.request.col.raised'), nowrap: true },
]);
</script>

<template>
    <div class="pr-wrap">
        <p class="pr-lede">
            {{ t('planning.request.tabLede') }}
            <V2Badge v="3" size="sm" />
        </p>

        <ADataTable
            v-if="rows.length"
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="selected"
            @row="emit('open', $event.id)"
        >
            <template #cell-number="{ row }">
                <span class="a-code a-tag">{{ row.number }}</span>
            </template>
            <template #cell-supplier="{ row }">
                <div class="t-strong">{{ loc(row.supplier) }}</div>
                <div class="t-sub ltr">{{ row.supplierCode }}</div>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="PURCHASE_REQUEST_STATE[row.state]?.tone">
                    {{ t(`planning.requestState.${row.state}`) }}
                </AChip>
                <div v-if="row.order" class="t-sub">
                    <ANum>{{ row.order }}</ANum>
                </div>
            </template>
            <template #cell-lines="{ row }">
                <div class="t-sub">
                    {{
                        t('planning.request.lineCount', { n: row.lines.length })
                    }}
                </div>
                <div class="pr-names">
                    {{ row.lines.map((line) => loc(line.name)).join(' · ') }}
                </div>
            </template>
            <template #cell-value="{ row }">
                <ANum v-if="row.value">{{ ils(row.value, 0) }}</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-raised="{ row }">
                <ANum>{{ row.raised?.stamp }}</ANum>
            </template>
        </ADataTable>

        <AEmpty
            v-else
            icon="inbox"
            :title="t('planning.request.emptyTitle')"
            :sub="t('planning.request.emptySub')"
        />
    </div>
</template>

<style scoped>
.pr-wrap {
    margin-top: 18px;
    display: grid;
    gap: 14px;
}

.pr-lede {
    margin: 0;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.pr-names {
    font-size: 12.5px;
    color: var(--a-ink-4);
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.num {
    font-variant-numeric: tabular-nums;
}
</style>
