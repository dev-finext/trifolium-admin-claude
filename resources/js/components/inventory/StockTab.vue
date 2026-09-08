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
import FilterKpi from '@/components/ui/FilterKpi.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { BATCH_EXPIRY_WARN_DAYS, STOCK_KIND } from '@/config';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import {
    STOCK_FILTER_FIELDS,
    STOCK_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';

/** How many item names the low-stock banner lists before it counts the rest. */
const LOW_PREVIEW = 4;

const emit = defineEmits(['adjust', 'open-batches', 'open-expiring']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const SPEC = { fields: STOCK_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const kindTone = (id) => STOCK_KIND[id]?.tone;

const term = computed(() => view.q.trim().toLowerCase());

const searched = computed(() =>
    term.value
        ? inventory.stock.filter((row) =>
              searchHaystack(row.name, row.sku, row.lat).includes(term.value),
          )
        : inventory.stock,
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

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

/** The low-stock banner and its tile are one value of the state field. */
const lowOnly = computed(() => view.state.includes('low'));

const lowNames = computed(() => {
    const names = inventory.lowStock
        .slice(0, LOW_PREVIEW)
        .map((row) => loc(row.name));
    const rest = inventory.lowStock.length - names.length;

    if (rest > 0) {
        names.push(t('inventory.stock.lowMore', { n: rest }));
    }

    return names.join(' · ');
});

const cols = computed(() => [
    {
        k: 'sku',
        label: t('inventory.stock.col.sku'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('inventory.stock.col.name'), sortable: true },
    { k: 'kind', label: t('inventory.stock.col.kind'), nowrap: true },
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
</script>

<template>
    <div class="a-grid a-tabbody">
        <div
            v-if="inventory.lowStock.length"
            class="a-note a-note--warn a-note--btn"
            :class="{ 'is-on': lowOnly }"
            role="button"
            tabindex="0"
            :aria-pressed="lowOnly"
            @click="filters.toggle('state', 'low')"
            @keydown.enter.prevent="filters.toggle('state', 'low')"
            @keydown.space.prevent="filters.toggle('state', 'low')"
        >
            <strong>
                {{
                    t('inventory.stock.lowTitle', {
                        n: inventory.lowStock.length,
                    })
                }}
            </strong>
            {{ t('inventory.stock.lowNames', { names: lowNames }) }}
            <span class="a-note-a">
                {{
                    lowOnly
                        ? t('inventory.stock.lowOn')
                        : t('inventory.stock.lowOff')
                }}
            </span>
        </div>
        <div v-else class="a-note a-note--ok">
            {{ t('inventory.stock.allAbove') }}
        </div>

        <div class="a-kpis">
            <FilterKpi
                icon="grid"
                :active="!filters.dirty"
                :label="t('inventory.stock.kpi.all')"
                :value="inventory.stock.length"
                :sub="t('inventory.stock.kpi.allSub')"
                @click="filters.clear"
            />
            <FilterKpi
                icon="alert"
                :active="lowOnly"
                :label="t('inventory.stock.kpi.low')"
                :value="inventory.lowStock.length"
                :sub="t('inventory.stock.kpi.lowSub')"
                @click="filters.toggle('state', 'low')"
            />
            <FilterKpi
                icon="clock"
                :active="false"
                :label="t('inventory.stock.kpi.expiring')"
                :value="inventory.expiringBatches.length"
                :sub="
                    t('inventory.stock.kpi.expiringSub', {
                        days: BATCH_EXPIRY_WARN_DAYS,
                    })
                "
                @click="emit('open-expiring')"
            />
        </div>

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

        <ADataTable :cols="cols" :rows="paged" row-key="sku">
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
            <template #cell-kind="{ row }">
                <AChip :tone="kindTone(row.kind)" size="sm" :dot="false">
                    {{ t(`inventory.stockKind.${row.kind}`) }}
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
