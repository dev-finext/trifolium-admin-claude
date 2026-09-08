<script setup>
// דוחות — the reports screen, second version.
//
// One screen, a list of reports on the side, a date range where the report
// takes one, KPI tiles and tables in the middle, CSV per table and a printout
// of the whole report. Only reports whose data is already in the console are
// here; the rest of the specification's seventeen wait for their modules.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useReports } from '@/composables/useReports';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { REPORT_GROUP_IDS, REPORTS, reportById } from '@/config';
import { hasRange } from '@/lib/dateRange';
import { fmtISO } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';

const GROUP_ICON = {
    orders: 'clipboard_list',
    people: 'users',
    money: 'card',
    stock: 'layers',
};

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const { build, format, exportTable, printReport } = useReports();

const view = useUrlState({
    rep: 'orders_status',
    preset: 'all',
    from: '',
    to: '',
});

const report = computed(() => reportById(view.rep) || REPORTS[0]);

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

/** The range the report actually uses — none for the reports that are a snapshot. */
const effectiveRange = computed(() =>
    report.value.ranged ? range.value : { from: '', to: '' },
);

const result = computed(() =>
    dataset.isBusy
        ? { kpis: [], tables: [] }
        : build(report.value.id, effectiveRange.value),
);

const rowCount = computed(() =>
    result.value.tables.reduce((sum, table) => sum + table.rows.length, 0),
);

const paramsText = computed(() => {
    if (!report.value.ranged) {
        return t('reports.noRange');
    }

    if (!hasRange(range.value)) {
        return t('reports.allDates');
    }

    return t('reports.rangeText', {
        from: range.value.from ? fmtISO(range.value.from) : '…',
        to: range.value.to ? fmtISO(range.value.to) : '…',
    });
});

const groups = computed(() =>
    REPORT_GROUP_IDS.map((id) => ({
        id,
        label: t(`reports.group.${id}`),
        reports: REPORTS.filter((row) => row.group === id),
    })),
);

const tableCols = (table) =>
    table.cols.map((column) => ({ k: column.k, label: column.label }));

function onExport(table) {
    const n = exportTable(report.value.id, table);

    push({
        title: t('reports.exported'),
        body: t('reports.exportedBody', {
            n,
            name: t(`reports.report.${report.value.id}.title`),
        }),
    });
}

function onPrint() {
    const ok = printReport(report.value.id, result.value, paramsText.value);

    push(
        ok
            ? { title: t('reports.printed') }
            : { title: t('reports.blocked'), bad: true },
    );
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.reports')]"
        :title="t('reports.title')"
        :sub="t('reports.sub', { n: REPORTS.length })"
    >
        <template #badge>
            <V2Badge id="reports" />
        </template>
        <template #actions>
            <AButton icon="printer" :disabled="!rowCount" @click="onPrint">
                {{ t('reports.print') }}
            </AButton>
        </template>
    </PageHead>

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <div v-else class="rp">
        <aside class="rp-side">
            <div v-for="group in groups" :key="group.id" class="rp-group">
                <div class="rp-group-t">
                    <AIcon :name="GROUP_ICON[group.id]" :size="15" />
                    {{ group.label }}
                </div>
                <button
                    v-for="row in group.reports"
                    :key="row.id"
                    type="button"
                    class="rp-pick"
                    :class="{ 'is-on': row.id === report.id }"
                    @click="view.rep = row.id"
                >
                    <span class="rp-pick-t">{{
                        t(`reports.report.${row.id}.title`)
                    }}</span>
                    <span class="rp-pick-d">{{
                        t(`reports.report.${row.id}.desc`)
                    }}</span>
                </button>
            </div>
            <p class="a-hint rp-note">{{ t('reports.note') }}</p>
        </aside>

        <section class="rp-main">
            <div class="rp-head">
                <h2 class="rp-h">
                    {{ t(`reports.report.${report.id}.title`) }}
                </h2>
                <p class="rp-d">{{ t(`reports.report.${report.id}.desc`) }}</p>
            </div>

            <DateRangeBar
                v-if="report.ranged"
                v-model="range"
                :note="t('reports.rows', { n: rowCount })"
            />
            <div v-else class="a-note a-note--info">
                {{ t('reports.noRange') }}
            </div>

            <div v-if="result.kpis.length" class="a-kpis rp-kpis">
                <AKpi
                    v-for="tile in result.kpis"
                    :key="tile.id"
                    :label="tile.label"
                    :value="tile.value"
                    small
                />
            </div>

            <ACard
                v-for="table in result.tables"
                :key="table.id"
                :title="table.title || t(`reports.report.${report.id}.title`)"
                icon="chart"
                :pad="false"
            >
                <template #right>
                    <span class="rp-count">{{
                        t('reports.rows', { n: table.rows.length })
                    }}</span>
                    <AButton
                        sm
                        icon="download"
                        :disabled="!table.rows.length"
                        @click="onExport(table)"
                    >
                        {{ t('reports.export') }}
                    </AButton>
                </template>
                <ADataTable
                    v-if="table.rows.length"
                    :cols="tableCols(table)"
                    :rows="table.rows"
                    :row-key="(row, i) => `${table.id}-${i}`"
                >
                    <template
                        v-for="column in table.cols"
                        :key="column.k"
                        #[`cell-${column.k}`]="{ row }"
                    >
                        <span
                            :class="{
                                'a-num': column.fmt !== 'text',
                                'is-low': row.low && column.k === 'coverage',
                            }"
                        >
                            {{ format(column, row[column.k]) }}
                        </span>
                    </template>
                </ADataTable>
                <AEmpty v-else icon="chart" :title="t('reports.empty')" />
            </ACard>
        </section>
    </div>
</template>

<style scoped>
.rp {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
}

@media (max-width: 1000px) {
    .rp {
        grid-template-columns: 1fr;
    }
}

.rp-side {
    display: grid;
    gap: 14px;
    position: sticky;
    top: 12px;
}

.rp-group {
    display: grid;
    gap: 4px;
}

.rp-group-t {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 4px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--a-ink-4);
}

.rp-pick {
    display: grid;
    gap: 2px;
    padding: 9px 12px;
    border: 1px solid transparent;
    border-radius: var(--a-r);
    background: transparent;
    text-align: start;
    font: inherit;
    color: inherit;
    cursor: pointer;
}

.rp-pick:hover {
    background: var(--a-sunk);
}

.rp-pick.is-on {
    border-color: var(--a-line-2);
    background: var(--a-surface);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}

.rp-pick-t {
    font-weight: 600;
    font-size: 14px;
}

.rp-pick-d {
    font-size: 12.5px;
    color: var(--a-ink-4);
    line-height: 1.4;
}

.rp-note {
    margin: 4px 4px 0;
}

.rp-main {
    display: grid;
    gap: 14px;
}

.rp-h {
    margin: 0;
    font-size: 22px;
}

.rp-d {
    margin: 4px 0 0;
    color: var(--a-ink-3);
}

.rp-kpis {
    margin: 0;
}

.rp-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-num {
    font-variant-numeric: tabular-nums;
    direction: ltr;
    unicode-bidi: isolate;
}

.is-low {
    color: var(--a-red);
    font-weight: 600;
}
</style>
