<script setup>
// The stock table: what is on hand, what is already promised to an order, and
// what is left. `available` is what matters — an item can hold plenty and still
// be short once its allocations are counted, which is what the minimum level is
// measured against.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
    useSorted,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import {
    STOCK_FILTER_FIELDS,
    STOCK_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

defineProps({
    /** The sku whose drawer is open, so its row reads as selected. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['adjust', 'open', 'open-batches']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const items = useItemsStore();

const SPEC = { fields: STOCK_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const term = computed(() => view.q.trim().toLowerCase());

// Archived rows are out of the table; their history still names them.
const searched = computed(() =>
    term.value
        ? inventory.liveStock.filter((row) =>
              searchHaystack(row.name, row.sku, row.lat).includes(term.value),
          )
        : inventory.liveStock,
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const spec = computed(() => ({
    id: 'stock',
    ns: 'inventory',
    noun: t('inventory.filter.stockNoun'),
    groups: STOCK_FILTER_GROUPS,
    fields: STOCK_FILTER_FIELDS.map((field) =>
        field.key === 'wh'
            ? {
                  ...field,
                  optionLabel: (id) => t(`warehouse.${id}.name`),
              }
            : field,
    ),
}));

function clear() {
    view.q = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { q: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const dirty = computed(() => filters.dirty || Boolean(view.q));

const cols = computed(() => [
    {
        k: 'sku',
        label: t('inventory.stock.col.sku'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('inventory.stock.col.name'), sortable: true },
    { k: 'group', label: t('inventory.stock.col.group'), nowrap: true },
    { k: 'wh', label: t('inventory.stock.col.wh'), nowrap: true },
    {
        k: 'onHand',
        label: t('inventory.stock.col.onHand'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'alloc',
        label: t('inventory.stock.col.alloc'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'avail',
        label: t('inventory.stock.col.avail'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'min',
        label: t('inventory.stock.col.min'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'batches',
        label: t('inventory.stock.col.batches'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => inventory.liveBatchCount(row.sku),
    },
    { k: 'act', label: '', nowrap: true },
]);

const { sort, sorted } = useSorted(rows, view, () => cols.value);
const { paged, total } = usePaged(sorted, view);
</script>

<template>
    <div class="a-grid a-tabbody">
        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('inventory.stock.count')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchBox
                v-model="view.q"
                :placeholder="t('inventory.stock.search')"
                :width="320"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="view"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable
            :cols="cols"
            :rows="paged"
            v-model:sort="sort"
            row-key="sku"
            :selected="selected"
            @row="emit('open', $event.sku)"
        >
            <template #empty>
                <AEmpty
                    icon="grid"
                    :title="t('inventory.stock.empty.title')"
                    :sub="t('inventory.stock.empty.sub')"
                />
            </template>

            <template #cell-sku="{ row }">
                <span class="a-code a-tag">{{ row.sku }}</span>
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div v-if="row.lat" class="t-sub ltr">{{ row.lat }}</div>
            </template>
            <template #cell-group="{ row }">
                <AChip size="sm" :dot="false">
                    {{ items.rowBySku(row.sku)?.groupName || '—' }}
                </AChip>
            </template>
            <template #cell-wh="{ row }">
                {{ t(`warehouse.${row.wh}.short`) }}
            </template>
            <template #cell-onHand="{ row }">
                <ANum>{{ num(row.onHand) }}</ANum>
                {{ t(`inventory.unit.${row.unit}`) }}
            </template>
            <template #cell-alloc="{ row }">
                <template v-if="row.alloc">
                    <ANum>{{ num(row.alloc) }}</ANum>
                    {{ t(`inventory.unit.${row.unit}`) }}
                </template>
                <span v-else class="a-muted">—</span>
            </template>
            <template #cell-avail="{ row }">
                <span class="num a-avail" :class="{ 'is-low': row.low }">
                    {{ num(row.avail) }}
                </span>
            </template>
            <template #cell-min="{ row }">
                <ANum>{{ num(row.min) }}</ANum>
            </template>
            <template #cell-batches="{ row }">
                <button
                    v-if="inventory.liveBatchCount(row.sku)"
                    type="button"
                    class="a-linkbtn"
                    :title="t('inventory.action.openBatches')"
                    @click.stop="emit('open-batches', row.sku)"
                >
                    <ANum>{{ inventory.liveBatchCount(row.sku) }}</ANum>
                </button>
                <span v-else class="a-muted">—</span>
            </template>
            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <AButton sm icon="edit" @click.stop="emit('adjust', row)">
                        {{ t('inventory.action.adjust') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <APagination
            v-model:page="view.pg"
            v-model:size="view.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="view"
            :rows="searched"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.a-muted {
    color: var(--a-ink-4);
}

.a-avail {
    font-weight: 700;
}

.a-avail.is-low {
    color: var(--a-red);
}
</style>
