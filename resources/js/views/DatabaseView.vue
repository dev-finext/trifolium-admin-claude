<script setup>
// The database, shown.
//
// The console keeps its records in PostgreSQL, compiled to WebAssembly and
// running in this page, with its data directory in IndexedDB. That is easy to
// say and worth being able to check, so this screen shows the tables and their
// row counts, runs SQL against them, and offers the one destructive button the
// demo needs: build it again from the extract.
//
// The SQL box is deliberately not restricted to SELECT. It is the reader's own
// database, on the reader's own machine, and a console that claims to hold a
// real one should let it be treated as one.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { isDatabase } from '@/data/source';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();

const counts = ref([]);
const filter = ref('');
const sql = ref('SELECT * FROM suppliers ORDER BY sku_count DESC LIMIT 20');
const result = ref(null);
const failure = ref('');
const running = ref(false);
const asking = ref(false);

const EXAMPLES = [
    {
        id: 'coverage',
        sql: `SELECT i.name, i.on_hand, i.stock_uom, s.name AS supplier
FROM items i
JOIN suppliers s ON s.id = i.supplier_code
WHERE i.inventory AND i.on_hand > 0
ORDER BY i.on_hand DESC
LIMIT 25`,
    },
    {
        id: 'expiring',
        sql: `SELECT number, name, expires_on, remaining
FROM batches
WHERE expires_on IS NOT NULL
ORDER BY expires_on
LIMIT 25`,
    },
    {
        id: 'shared',
        sql: `SELECT c.sku, count(*) AS products
FROM bom_components c
GROUP BY c.sku
HAVING count(*) > 1
ORDER BY products DESC
LIMIT 25`,
    },
    {
        id: 'spend',
        sql: `SELECT s.name, count(*) AS orders, sum(p.qty * p.price) AS value
FROM purchase_order_lines p
JOIN purchase_orders o ON o.id = p.parent_id
JOIN suppliers s ON s.id = o.supplier_code
GROUP BY s.name
ORDER BY value DESC NULLS LAST`,
    },
];

async function refresh() {
    if (!isDatabase) {
        return;
    }

    const { openDatabase, tableCounts } = await import('@/data/db');

    counts.value = await tableCounts(await openDatabase());
}

onMounted(refresh);

const rows = computed(() => {
    const term = filter.value.trim().toLowerCase();
    const list = term
        ? counts.value.filter((row) => row.table_name.includes(term))
        : counts.value;

    return [...list].sort((a, b) => b.rows - a.rows);
});

const totalRows = computed(() =>
    counts.value.reduce((sum, row) => sum + row.rows, 0),
);

const cols = computed(() => [
    { k: 'table_name', label: t('database.col.table'), sortable: true },
    { k: 'rows', label: t('database.col.rows'), nowrap: true, sortable: true },
]);

/** The columns of whatever the last statement returned. */
const resultCols = computed(() =>
    (result.value?.fields || []).map((field) => ({
        k: field.name,
        label: field.name,
    })),
);

const resultRows = computed(() =>
    (result.value?.rows || []).map((row, i) => ({ ...row, __i: i })),
);

async function run() {
    running.value = true;
    failure.value = '';
    result.value = null;

    try {
        const { openDatabase, runQuery } = await import('@/data/db');

        result.value = await runQuery(await openDatabase(), sql.value);
        await refresh();
    } catch (error) {
        failure.value = String(error?.message || error);
    } finally {
        running.value = false;
    }
}

async function rebuild() {
    asking.value = false;
    await dataset.reset();
    await refresh();
    push({ title: t('database.rebuilt') });
}

const cell = (value) => {
    if (value === null || value === undefined) {
        return '—';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};
</script>

<template>
    <div>
        <PageHead :title="t('nav.item.database')">
            <template #actions>
                <AButton icon="refresh" @click="refresh">
                    {{ t('database.refresh') }}
                </AButton>
                <AButton
                    v-if="isDatabase"
                    icon="trash"
                    danger
                    @click="asking = true"
                >
                    {{ t('database.rebuild') }}
                </AButton>
            </template>
        </PageHead>

        <div class="a-body db-body">
            <p class="db-lede">
                {{ t('database.lede') }}
                <V2Badge v="3" size="sm" />
            </p>

            <div v-if="!isDatabase" class="db-off">
                {{ t('database.off') }}
            </div>

            <template v-else>
                <div class="a-kpis db-kpis">
                    <div class="db-kpi">
                        <div class="db-kpi-v">
                            <ANum>{{ num(counts.length, 0) }}</ANum>
                        </div>
                        <div class="db-kpi-l">
                            {{ t('database.kpi.tables') }}
                        </div>
                    </div>
                    <div class="db-kpi">
                        <div class="db-kpi-v">
                            <ANum>{{ num(totalRows, 0) }}</ANum>
                        </div>
                        <div class="db-kpi-l">{{ t('database.kpi.rows') }}</div>
                    </div>
                    <div class="db-kpi">
                        <div class="db-kpi-v db-engine">PostgreSQL</div>
                        <div class="db-kpi-l">
                            {{ t('database.kpi.engine') }}
                        </div>
                    </div>
                </div>

                <section class="db-sect">
                    <div class="a-sect-t">{{ t('database.tables') }}</div>
                    <AInput
                        v-model="filter"
                        class="db-filter"
                        :placeholder="t('database.filter')"
                    />
                    <div class="a-tablewrap">
                        <ADataTable
                            :cols="cols"
                            :rows="rows"
                            row-key="table_name"
                        >
                            <template #cell-table_name="{ row }">
                                <span class="a-code">{{ row.table_name }}</span>
                            </template>
                            <template #cell-rows="{ row }">
                                <ANum>{{ num(row.rows, 0) }}</ANum>
                            </template>
                        </ADataTable>
                    </div>
                </section>

                <section class="db-sect">
                    <div class="a-sect-t">{{ t('database.query') }}</div>
                    <p class="a-hint">{{ t('database.queryHint') }}</p>
                    <div class="db-examples">
                        <button
                            v-for="one in EXAMPLES"
                            :key="one.id"
                            type="button"
                            class="grp"
                            @click="sql = one.sql"
                        >
                            {{ t(`database.example.${one.id}`) }}
                        </button>
                    </div>
                    <ATextarea
                        v-model="sql"
                        :rows="6"
                        class="a-w100 db-sql"
                        ltr
                    />
                    <div class="db-acts">
                        <AButton
                            kind="p"
                            icon="play"
                            :disabled="running"
                            @click="run"
                        >
                            {{ t('database.run') }}
                        </AButton>
                        <span v-if="result" class="a-hint">
                            {{
                                t('database.returned', {
                                    n: result.rows.length,
                                })
                            }}
                        </span>
                    </div>

                    <p v-if="failure" class="db-error">{{ failure }}</p>

                    <div
                        v-if="result && resultCols.length"
                        class="a-tablewrap db-result"
                    >
                        <ADataTable
                            :cols="resultCols"
                            :rows="resultRows"
                            row-key="__i"
                        >
                            <template
                                v-for="col in resultCols"
                                :key="col.k"
                                #[`cell-${col.k}`]="{ row }"
                            >
                                <span class="db-cell">{{
                                    cell(row[col.k])
                                }}</span>
                            </template>
                        </ADataTable>
                    </div>
                </section>
            </template>
        </div>

        <ConfirmDialog
            :open="asking"
            danger
            :title="t('database.rebuildTitle')"
            :body="t('database.rebuildBody')"
            :confirm-label="t('database.rebuild')"
            @confirm="rebuild"
            @close="asking = false"
        />
    </div>
</template>

<style scoped>
.db-body {
    display: grid;
    gap: 20px;
}

.db-lede {
    margin: 0;
    max-width: 92ch;
    font-size: 13.5px;
    color: var(--a-ink-3);
    line-height: 1.6;
}

.db-off {
    padding: 22px;
    background: var(--a-sunk);
    border: 1px solid var(--a-line);
    border-radius: 10px;
    color: var(--a-ink-3);
}

.db-kpis {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
}

.db-kpi {
    flex: 1 1 180px;
    padding: 14px 18px;
    background: var(--a-surface);
    border: 1px solid var(--a-line);
    border-radius: 10px;
}

.db-kpi-v {
    font-size: 26px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.db-engine {
    font-size: 20px;
}

.db-kpi-l {
    margin-top: 2px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.db-sect {
    display: grid;
    gap: 8px;
}

.db-filter {
    max-width: 320px;
}

.db-examples {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
}

.db-sql {
    font-family: ui-monospace, monospace;
    font-size: 13px;
}

.db-acts {
    display: flex;
    align-items: center;
    gap: 12px;
}

.db-error {
    margin: 0;
    padding: 10px 14px;
    background: var(--a-red-bg);
    border-radius: 8px;
    font-family: ui-monospace, monospace;
    font-size: 12.5px;
}

.db-result {
    max-height: 420px;
}

.db-cell {
    display: inline-block;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
}
</style>
