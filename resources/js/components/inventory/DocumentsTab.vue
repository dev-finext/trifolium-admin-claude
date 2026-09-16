<script setup>
// מסמכי מלאי — every document stock moved on, the way SAP files them.
//
// Four types and no others: a goods receipt brings stock in, a goods issue
// takes it out, a count corrects it and a transfer moves it between
// warehouses. Most receipts and issues are raised by a production order and
// say which one; the rest were entered by hand.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { INVENTORY_DOC } from '@/config';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const emit = defineEmits(['open', 'receive']);

/** What the list may be narrowed by. Warehouse and type are the two that matter. */
const FIELDS = [
    {
        key: 'type',
        group: 'what',
        kind: 'set',
        prefix: 'inventory.docType',
        values: (row) => [row.type],
    },
    {
        key: 'base',
        group: 'what',
        kind: 'set',
        prefix: 'inventory.docBase',
        values: (row) => [row.base],
    },
    {
        key: 'wh',
        group: 'where',
        kind: 'set',
        prefix: 'warehouse',
        suffix: 'name',
        values: (row) => [row.warehouse],
    },
];

const SPEC = { fields: FIELDS };

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const inventory = useInventoryStore();
const drawerOpen = ref(false);

const state = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const all = computed(() => inventory.inventoryDocs);

const tally = (predicate) => all.value.filter(predicate).length;

const searched = computed(() => {
    const term = state.q.trim().toLowerCase();

    if (!term) {
        return all.value;
    }

    return all.value.filter((doc) =>
        searchHaystack(
            doc.id,
            doc.baseRef,
            doc.supplier,
            doc.remarks,
            ...doc.lines.map((line) => line.name),
            ...doc.lines.map((line) => line.sku),
        )
            .toLowerCase()
            .includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

const spec = computed(() => ({
    id: 'inventory-docs',
    ns: 'inventory.docs',
    noun: t('inventory.docs.noun'),
    groups: ['what', 'where'],
    fields: FIELDS,
}));

const rows = computed(() => filters.rows);
const { paged, total } = usePaged(rows, state);
const dirty = computed(() => filters.dirty || state.q.trim() !== '');

const cols = computed(() => [
    { k: 'id', label: t('inventory.docs.col.number'), nowrap: true },
    { k: 'type', label: t('inventory.docs.col.type'), nowrap: true },
    { k: 'when', label: t('inventory.docs.col.when'), nowrap: true },
    { k: 'base', label: t('inventory.docs.col.base') },
    { k: 'lines', label: t('inventory.docs.col.lines'), nowrap: true },
    { k: 'wh', label: t('inventory.docs.col.wh'), nowrap: true },
    { k: 'remarks', label: t('inventory.docs.col.remarks') },
]);

function clear() {
    state.q = '';
    filters.clear();
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

/** How much the document moved, in the unit of its first line. */
function moved(doc) {
    const total = doc.lines.reduce((sum, line) => sum + Math.abs(line.qty), 0);

    return `${num(total, 3)} ${doc.lines[0]?.unit ? t(`items.uom.${doc.lines[0].unit}`) : ''}`.trim();
}
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <FilterKpi
                v-for="type in [
                    'goods_receipt',
                    'goods_issue',
                    'count',
                    'transfer',
                ]"
                :key="type"
                :icon="
                    type === 'goods_receipt'
                        ? 'inbox'
                        : type === 'goods_issue'
                          ? 'package'
                          : type === 'count'
                            ? 'check'
                            : 'external'
                "
                :label="t(`inventory.docType.${type}`)"
                :value="tally((doc) => doc.type === type)"
                :sub="t(`inventory.docs.sub.${type}`)"
                :active="state.type.includes(type)"
                @click="filters.toggle('type', type)"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('inventory.docs.count', { total: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.q"
                class="search"
                :placeholder="t('inventory.docs.search')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
            <AButton kind="p" icon="plus" @click="emit('receive')">
                {{ t('inventory.receipt.open') }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="state"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable
            v-if="paged.length"
            :cols="cols"
            :rows="paged"
            row-key="id"
            @row="emit('open', $event.id)"
        >
            <template #cell-id="{ row }">
                <span class="a-code a-tag">{{ row.id }}</span>
            </template>

            <template #cell-type="{ row }">
                <AChip
                    :tone="INVENTORY_DOC[row.type]?.tone"
                    size="sm"
                    :dot="false"
                >
                    {{ t(`inventory.docType.${row.type}`) }}
                </AChip>
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>

            <template #cell-base="{ row }">
                <span v-if="row.baseRef" class="a-code a-tag">{{
                    row.baseRef
                }}</span>
                <span v-else-if="row.supplier">{{ loc(row.supplier) }}</span>
                <span v-else class="t-sub">{{
                    t('inventory.docBase.manual')
                }}</span>
            </template>

            <template #cell-lines="{ row }">
                <span class="num">{{
                    t('inventory.docs.linesN', { n: row.lines.length })
                }}</span>
                <div class="t-sub">{{ moved(row) }}</div>
            </template>

            <template #cell-wh="{ row }">
                {{ t(`warehouse.${row.warehouse}.short`) }}
                <template v-if="row.toWarehouse">
                    → {{ t(`warehouse.${row.toWarehouse}.short`) }}
                </template>
            </template>

            <template #cell-remarks="{ row }">
                <span v-if="row.remarks" class="t-sub">{{
                    loc(row.remarks)
                }}</span>
            </template>
        </ADataTable>

        <AEmpty v-else :title="t('inventory.docs.empty')" />

        <APagination v-model:page="state.pg" :size="state.ps" :total="total" />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
            :rows="searched"
            @close="drawerOpen = false"
        />
    </div>
</template>

<style scoped>
.kpi-row {
    margin-top: 18px;
}

.search {
    width: 320px;
    max-width: 100%;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
