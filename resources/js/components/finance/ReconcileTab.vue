<script setup>
// Reconciliation — the three questions only this console can answer, because
// only it sees both the card processor and the document provider: which paid
// orders have no tax document, which documents no order stands behind, and
// which documents do not add up to the orders they cover.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ANum from '@/components/ui/ANum.vue';
import OrderLink from '@/components/ui/OrderLink.vue';
import { useLocalized } from '@/composables/useLocalized';
import { DOC_STATES } from '@/config';
import { ils } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

const emit = defineEmits(['preview']);

const { t } = useI18n();
const { loc } = useLocalized();
const money = useMoneyStore();

const paidCols = computed(() => [
    { k: 'order', label: t('labels.order'), nowrap: true },
    { k: 'who', label: t('finance.reconcile.col.who') },
    { k: 'when', label: t('finance.reconcile.col.when'), nowrap: true },
    { k: 'total', label: t('finance.reconcile.col.total'), nowrap: true },
    { k: 'state', label: t('finance.reconcile.col.docState'), nowrap: true },
]);

const orphanCols = computed(() => [
    { k: 'num', label: t('finance.docs.number'), nowrap: true },
    { k: 'type', label: t('finance.docs.type'), nowrap: true },
    { k: 'to', label: t('finance.reconcile.col.who') },
    { k: 'when', label: t('finance.reconcile.col.when'), nowrap: true },
    { k: 'amt', label: t('finance.reconcile.col.total'), nowrap: true },
]);

const mismatchCols = computed(() => [
    { k: 'num', label: t('finance.docs.number'), nowrap: true },
    { k: 'orders', label: t('finance.reconcile.col.orders') },
    { k: 'expected', label: t('finance.reconcile.col.expected'), nowrap: true },
    { k: 'amt', label: t('finance.reconcile.col.documented'), nowrap: true },
    { k: 'diff', label: t('finance.reconcile.col.diff'), nowrap: true },
]);

const mismatchRows = computed(() =>
    money.amountMismatches.map((row) => ({ ...row, id: row.document.id })),
);
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <AKpi
                icon="alert"
                :label="t('finance.reconcile.kpi.paid')"
                :value="money.paidWithoutDocument.length"
                :sub="t('finance.reconcile.kpi.paidSub')"
            />
            <AKpi
                icon="file_text"
                :label="t('finance.reconcile.kpi.orphans')"
                :value="money.documentsWithoutOrder.length"
                :sub="t('finance.reconcile.kpi.orphansSub')"
            />
            <AKpi
                icon="coin"
                :label="t('finance.reconcile.kpi.mismatch')"
                :value="money.amountMismatches.length"
                :sub="t('finance.reconcile.kpi.mismatchSub')"
            />
        </div>

        <p class="a-hint intro">{{ t('finance.reconcile.intro') }}</p>

        <div class="a-sect-t">{{ t('finance.reconcile.paidTitle') }}</div>
        <ADataTable
            :cols="paidCols"
            :rows="money.paidWithoutDocument"
            row-key="id"
        >
            <template #cell-order="{ row }"
                ><OrderLink :id="row.id"
            /></template>
            <template #cell-who="{ row }">
                {{
                    loc(
                        row.payer === 'patient'
                            ? row.patient?.name
                            : row.practitioner?.name,
                    )
                }}
            </template>
            <template #cell-when="{ row }"
                ><ANum>{{ row.placed?.stamp }}</ANum></template
            >
            <template #cell-total="{ row }"
                ><ANum>{{ ils(row.pricing.total, 2) }}</ANum></template
            >
            <template #cell-state="{ row }">
                <AChip
                    :tone="DOC_STATES[row.docStatus]?.tone || 'gray'"
                    size="sm"
                >
                    {{ t(`docState.${row.docStatus}`) }}
                </AChip>
            </template>
            <template #empty>
                <AEmpty
                    icon="check"
                    :title="t('finance.reconcile.paidEmpty')"
                />
            </template>
        </ADataTable>

        <div class="a-sect-t top">
            {{ t('finance.reconcile.orphansTitle') }}
        </div>
        <ADataTable
            :cols="orphanCols"
            :rows="money.documentsWithoutOrder"
            row-key="id"
            @row="emit('preview', $event.id)"
        >
            <template #cell-num="{ row }"
                ><ANum>{{ row.num || '—' }}</ANum></template
            >
            <template #cell-type="{ row }">{{
                t(`docType.${row.type}.name`)
            }}</template>
            <template #cell-to="{ row }">{{ loc(row.to) }}</template>
            <template #cell-when="{ row }"
                ><ANum>{{ row.when?.stamp }}</ANum></template
            >
            <template #cell-amt="{ row }"
                ><ANum>{{ ils(row.amt, 2) }}</ANum></template
            >
            <template #empty>
                <AEmpty
                    icon="check"
                    :title="t('finance.reconcile.orphansEmpty')"
                />
            </template>
        </ADataTable>

        <div class="a-sect-t top">
            {{ t('finance.reconcile.mismatchTitle') }}
        </div>
        <ADataTable
            :cols="mismatchCols"
            :rows="mismatchRows"
            row-key="id"
            @row="emit('preview', $event.document.id)"
        >
            <template #cell-num="{ row }"
                ><ANum>{{ row.document.num || '—' }}</ANum></template
            >
            <template #cell-orders="{ row }">
                <span v-for="order in row.orders" :key="order.id" class="gap">
                    <OrderLink :id="order.id" />
                </span>
            </template>
            <template #cell-expected="{ row }"
                ><ANum>{{ ils(row.expected, 2) }}</ANum></template
            >
            <template #cell-amt="{ row }"
                ><ANum>{{ ils(row.document.amt, 2) }}</ANum></template
            >
            <template #cell-diff="{ row }">
                <ANum class="diff">{{ ils(row.diff, 2) }}</ANum>
            </template>
            <template #empty>
                <AEmpty
                    icon="check"
                    :title="t('finance.reconcile.mismatchEmpty')"
                />
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.kpi-row {
    margin: 14px 0;
}

.intro {
    margin: 0 0 14px;
}

.top {
    margin-top: 22px;
}

.gap {
    margin-inline-end: 10px;
}

.diff {
    color: var(--a-red);
    font-weight: 600;
}
</style>
