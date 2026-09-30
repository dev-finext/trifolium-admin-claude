<script setup>
// V3 — דוח ירון: ניתוח מלאי.
//
// The one screen in this console whose shape is not its own. ירון runs this
// report in SAP, exports it, and analyses it in a workbook he built; the
// workbook is his way of buying and nobody is going near it. What has to
// survive the move off SAP is the report — the same columns, in the same order,
// with the same names and the same value types, so the workbook lands on the
// columns it expects.
//
// `config/stockAnalysis.js` holds the rules and where each one comes from. This
// file is the screen: two dates, the table, and the export.
//
// The dates are the whole input, and they are required, exactly as in SAP —
// there is no report without a period to read. They live in the query string,
// so a range can be sent to a colleague and opens the same.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    monthsInRange,
    STOCK_ANALYSIS_SHEET,
    stockAnalysisRows,
    stockAnalysisSheet,
} from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { downloadXlsx } from '@/lib/xlsx';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

/** How many skeleton rows stand in while the dataset loads. */
const SKELETON_ROWS = 10;

/** The longest period the screen will draw — a column per month adds up. */
const MAX_MONTHS = 36;

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const items = useItemsStore();

const busy = ref(false);

/** The consumption history, as the extract wrote it. */
const history = computed(() => dataset.data.consumption || { months: [] });

/**
 * The period the screen opens on.
 *
 * The last twelve months that actually hold movement, rather than the twelve
 * before today: the demo's history ends where the database backup ends, and a
 * report that opens on two empty columns looks broken when it is merely honest.
 * A real installation has movement up to this morning and the two are the same.
 */
const defaults = computed(() => {
    const all = history.value.months || [];
    const last = all[all.length - 1] || isoDaysAgo(0).slice(0, 7);
    const first = all[Math.max(0, all.length - 12)] || last;

    return { from: `${first}-01`, to: `${last}-28` };
});

const view = useUrlState({ from: '', to: '' });

const from = computed({
    get: () => view.from || defaults.value.from,
    set: (value) => {
        view.from = value;
    },
});

const to = computed({
    get: () => view.to || defaults.value.to,
    set: (value) => {
        view.to = value;
    },
});

const months = computed(() => monthsInRange(from.value, to.value));

const tooWide = computed(() => months.value.length > MAX_MONTHS);

const badRange = computed(
    () => Boolean(from.value) && Boolean(to.value) && !months.value.length,
);

/**
 * The history by item code, built once rather than scanned per item.
 *
 * The extract writes the key as `code` and the dataset hands it on as `sku`;
 * both are read so the report does not depend on which side of that rename it
 * happens to be looking at.
 */
const byCode = computed(() => {
    const map = new Map();

    for (const row of dataset.data.consumption?.rows || []) {
        map.set(row.sku ?? row.code, row.months);
    }

    return map;
});

const rows = computed(() => {
    if (!months.value.length || tooWide.value) {
        return [];
    }

    return stockAnalysisRows(
        items.rows,
        (sku) => byCode.value.get(sku),
        months.value,
    );
});

const cols = computed(() => [
    { k: 'code', label: 'ItemCode', nowrap: true },
    { k: 'name', label: 'ItemName' },
    { k: 'foreign', label: 'FrgnName' },
    { k: 'group', label: 'GroupName', nowrap: true },
    { k: 'onHand', label: 'OnHand', align: 'end', nowrap: true },
    { k: 'onOrder', label: 'OnOrder', align: 'end', nowrap: true },
    { k: 'committed', label: 'IsCommited', align: 'end', nowrap: true },
    ...months.value.map((ym) => ({
        k: ym,
        label: ym,
        align: 'end',
        nowrap: true,
    })),
    { k: 'total', label: 'TotalOutQty', align: 'end', nowrap: true },
]);

function exportSheet() {
    busy.value = true;

    try {
        const file = `stock-analysis-${from.value}-${to.value}.xlsx`;
        const n = downloadXlsx(file, {
            name: STOCK_ANALYSIS_SHEET,
            rows: stockAnalysisSheet(rows.value, months.value),
        });

        push({
            title: t('stockAnalysis.exported', { n: n - 1 }, n - 1),
            body: file,
        });
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <PageHead
        :crumbs="[t('stockAnalysis.crumb'), t('stockAnalysis.title')]"
        :title="t('stockAnalysis.title')"
        :sub="t('stockAnalysis.sub')"
    />

    <div class="a-pane sa-lede">
        <p class="a-hint">{{ t('stockAnalysis.lede') }}</p>
        <V2Badge v="3" size="sm" />
    </div>

    <div class="a-pane sa-controls">
        <div class="a-fields sa-dates">
            <label class="a-field">
                <span>{{ t('stockAnalysis.from') }}</span>
                <AInput v-model="from" type="date" ltr />
            </label>
            <label class="a-field">
                <span>{{ t('stockAnalysis.to') }}</span>
                <AInput v-model="to" type="date" ltr />
            </label>
        </div>

        <div class="a-push sa-actions">
            <span class="sa-count">
                {{
                    t(
                        'stockAnalysis.count',
                        { n: num(rows.length, 0), m: months.length },
                        rows.length,
                    )
                }}
            </span>
            <AButton
                kind="p"
                icon="download"
                :disabled="!rows.length || busy"
                @click="exportSheet"
            >
                {{ t('stockAnalysis.export') }}
            </AButton>
        </div>
    </div>

    <ASkeleton v-if="dataset.isBusy && !rows.length" :rows="SKELETON_ROWS" />

    <AEmpty
        v-else-if="badRange"
        icon="calendar"
        :title="t('stockAnalysis.badRangeTitle')"
        :sub="t('stockAnalysis.badRangeSub')"
    />

    <AEmpty
        v-else-if="tooWide"
        icon="calendar"
        :title="t('stockAnalysis.tooWideTitle')"
        :sub="t('stockAnalysis.tooWideSub', { n: MAX_MONTHS })"
    />

    <AEmpty
        v-else-if="!rows.length"
        icon="chart"
        :title="t('stockAnalysis.emptyTitle')"
        :sub="t('stockAnalysis.emptySub')"
    />

    <div v-else class="a-tablewrap sa-table">
        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #cell-code="{ row }">
                <ANum class="a-code">{{ row.code }}</ANum>
            </template>
            <template #cell-onHand="{ row }">
                <ANum>{{ num(row.onHand, 3) }}</ANum>
            </template>
            <template #cell-onOrder="{ row }">
                <ANum>{{ num(row.onOrder, 3) }}</ANum>
            </template>
            <template #cell-committed="{ row }">
                <ANum>{{ num(row.committed, 3) }}</ANum>
            </template>
            <template v-for="ym in months" #[`cell-${ym}`]="{ row }" :key="ym">
                <ANum :class="{ 'sa-zero': !row.months[ym] }">
                    {{ num(row.months[ym] ?? 0, 3) }}
                </ANum>
            </template>
            <template #cell-total="{ row }">
                <ANum class="t-strong">{{ num(row.total, 3) }}</ANum>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.sa-lede {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 0;
}

.sa-lede .a-hint {
    margin: 0;
    max-width: 96ch;
}

.sa-controls {
    display: flex;
    align-items: end;
    gap: 16px;
    flex-wrap: wrap;
}

.sa-dates {
    --a-field-w: 170px;
    flex: 0 0 auto;
    width: 356px;
}

.sa-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sa-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

/* The month columns run wide; the table takes the scroll rather than the page. */
.sa-table {
    overflow-x: auto;
}

/* The console sets table headings in capitals. Here the headings are SAP's own
   field names and the screen is a preview of the file, so they are shown with
   the casing the file will carry — ItemCode, not ITEMCODE. */
.sa-table :deep(.a-table thead th) {
    text-transform: none;
    letter-spacing: 0;
}

/* A month the item did not move in is a zero that should not shout. */
.sa-zero {
    color: var(--a-ink-4);
}
</style>
