<script setup>
// The consumption report the buyer plans from: what went to production and what
// was sold in a period, per item — never adjustments, waste or rejections, which
// say nothing about demand. Monthly average and stock cover follow.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ANum from '@/components/ui/ANum.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = usePurchasingStore();

const view = useUrlState({ preset: 'all', from: '', to: '' });

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

const report = computed(() =>
    store.consumption({ from: view.from, to: view.to }),
);

const rows = computed(() =>
    [...report.value.rows].sort((a, b) => b.total - a.total),
);

const totals = computed(() => ({
    production: rows.value.reduce((sum, row) => sum + row.production, 0),
    sales: rows.value.reduce((sum, row) => sum + row.sales, 0),
}));

const cols = computed(() => [
    {
        k: 'name',
        label: t('purchasing.consumption.col.item'),
        sortable: true,
        sortValue: (row) => loc(row.name),
    },
    {
        k: 'family',
        label: t('purchasing.consumption.col.family'),
        nowrap: true,
    },
    {
        k: 'production',
        label: t('purchasing.consumption.col.production'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'sales',
        label: t('purchasing.consumption.col.sales'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'total',
        label: t('purchasing.consumption.col.total'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'monthly',
        label: t('purchasing.consumption.col.monthly'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'avail',
        label: t('purchasing.consumption.col.avail'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.avail ?? -1,
    },
    {
        k: 'cover',
        label: t('purchasing.consumption.col.cover'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.cover ?? 999,
    },
]);

const unit = (id) => t(`inventory.unit.${id}`);

function coverTone(cover) {
    if (cover === null) {
        return 'gray';
    }

    return cover < 1 ? 'red' : cover < 3 ? 'amber' : 'green';
}

function exportRows() {
    const file = `consumption-${isoDaysAgo(0)}.csv`;
    const n = downloadCsv(
        file,
        [
            t('purchasing.consumption.col.item'),
            t('purchasing.consumption.col.family'),
            t('purchasing.consumption.col.production'),
            t('purchasing.consumption.col.sales'),
            t('purchasing.consumption.col.total'),
            t('purchasing.consumption.col.monthly'),
            t('purchasing.consumption.col.avail'),
            t('purchasing.consumption.col.cover'),
        ],
        rows.value.map((row) => [
            loc(row.name),
            row.family ? t(`items.family.${row.family}`) : '',
            row.production,
            row.sales,
            row.total,
            Math.round(row.monthly * 10) / 10,
            row.avail ?? '',
            row.cover === null ? '' : Math.round(row.cover * 10) / 10,
        ]),
    );

    push({
        title: t('purchasing.consumption.exported'),
        body: t('purchasing.consumption.exportedBody', { n, file }),
    });
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">
            {{ t('purchasing.consumption.note') }}
        </div>

        <DateRangeBar
            v-model="range"
            :note="t('purchasing.consumption.inRange', { n: rows.length })"
        />

        <div class="a-kpis">
            <AKpi
                icon="beaker"
                :label="t('purchasing.consumption.kpi.production')"
                :value="num(totals.production)"
                :sub="t('purchasing.consumption.kpi.productionSub')"
            />
            <AKpi
                icon="package"
                :label="t('purchasing.consumption.kpi.sales')"
                :value="num(totals.sales)"
                :sub="t('purchasing.consumption.kpi.salesSub')"
            />
            <AKpi
                icon="clock"
                :label="t('purchasing.consumption.kpi.months')"
                :value="num(report.months, 1)"
                :sub="t('purchasing.consumption.kpi.monthsSub')"
            />
        </div>

        <div class="bar">
            <AButton
                sm
                icon="download"
                :disabled="!rows.length"
                @click="exportRows"
            >
                {{ t('purchasing.consumption.export') }}
            </AButton>
        </div>

        <ADataTable :cols="cols" :rows="rows" row-key="sku">
            <template #empty>
                <AEmpty
                    icon="chart"
                    :title="t('purchasing.consumption.empty')"
                    :sub="t('purchasing.consumption.emptyHint')"
                />
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub ltr">{{ row.sku }}</div>
            </template>
            <template #cell-family="{ row }">
                <AChip v-if="row.family" size="sm" :dot="false">{{
                    t(`items.family.${row.family}`)
                }}</AChip>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-production="{ row }"
                ><ANum>{{ num(row.production) }}</ANum>
                {{ unit(row.unit) }}</template
            >
            <template #cell-sales="{ row }"
                ><ANum>{{ num(row.sales) }}</ANum>
                {{ unit(row.unit) }}</template
            >
            <template #cell-total="{ row }"
                ><span class="num t-strong">{{ num(row.total) }}</span>
                {{ unit(row.unit) }}</template
            >
            <template #cell-monthly="{ row }"
                ><ANum>{{ num(row.monthly, 1) }}</ANum></template
            >
            <template #cell-avail="{ row }">
                <ANum v-if="row.avail !== null">{{ num(row.avail) }}</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-cover="{ row }">
                <AChip :tone="coverTone(row.cover)" size="sm">
                    {{
                        row.cover === null
                            ? t('purchasing.consumption.coverNone')
                            : row.cover < 1
                              ? t('purchasing.consumption.coverLow')
                              : t('purchasing.consumption.months', {
                                    n: num(row.cover, 1),
                                })
                    }}
                </AChip>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.bar {
    display: flex;
    justify-content: flex-end;
}
</style>
