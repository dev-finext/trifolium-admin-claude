<script setup>
// The stock table: what is on hand, what is already promised to an order, and
// what is left. `available` is what matters — an item can hold plenty and still
// be short once its allocations are counted, which is what the minimum level is
// measured against.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    BATCH_EXPIRY_WARN_DAYS,
    STOCK_KIND,
    STOCK_KINDS,
    WAREHOUSES,
} from '@/config';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** How many item names the low-stock banner lists before it counts the rest. */
const LOW_PREVIEW = 4;

const emit = defineEmits(['adjust', 'open-batches', 'open-expiring']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const view = useUrlState({ q: '', kind: '', wh: '', low: false });

const kindTone = (id) => STOCK_KIND[id]?.tone;

const kinds = computed(() =>
    STOCK_KINDS.map((entry) => ({
        value: entry.id,
        label: t(`inventory.stockKind.${entry.id}`),
    })),
);

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        value: warehouse.id,
        label: t(`warehouse.${warehouse.id}.name`),
    })),
);

const term = computed(() => view.q.trim().toLowerCase());

const rows = computed(() =>
    inventory.stock.filter(
        (row) =>
            (!view.kind || row.kind === view.kind) &&
            (!view.wh || row.wh === view.wh) &&
            (!view.low || row.low) &&
            (!term.value ||
                searchHaystack(row.name, row.sku, row.lat).includes(
                    term.value,
                )),
    ),
);

const dirty = computed(
    () => Boolean(view.q) || Boolean(view.kind) || Boolean(view.wh) || view.low,
);

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

function clear() {
    view.q = '';
    view.kind = '';
    view.wh = '';
    view.low = false;
}

function showAll() {
    view.kind = '';
    view.wh = '';
    view.low = false;
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div
            v-if="inventory.lowStock.length"
            class="a-note a-note--warn a-note--btn"
            :class="{ 'is-on': view.low }"
            role="button"
            tabindex="0"
            :aria-pressed="view.low"
            @click="view.low = !view.low"
            @keydown.enter.prevent="view.low = !view.low"
            @keydown.space.prevent="view.low = !view.low"
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
                    view.low
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
                :active="!view.kind && !view.wh && !view.low"
                :label="t('inventory.stock.kpi.all')"
                :value="inventory.stock.length"
                :sub="t('inventory.stock.kpi.allSub')"
                @click="showAll"
            />
            <FilterKpi
                icon="alert"
                :active="view.low"
                :label="t('inventory.stock.kpi.low')"
                :value="inventory.lowStock.length"
                :sub="t('inventory.stock.kpi.lowSub')"
                @click="view.low = !view.low"
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
            <select
                v-model="view.kind"
                class="a-select"
                :aria-label="t('inventory.stock.aria.kind')"
            >
                <option value="">{{ t('inventory.stock.filter.kind') }}</option>
                <option
                    v-for="kind in kinds"
                    :key="kind.value"
                    :value="kind.value"
                >
                    {{ kind.label }}
                </option>
            </select>
            <select
                v-model="view.wh"
                class="a-select"
                :aria-label="t('inventory.stock.aria.wh')"
            >
                <option value="">{{ t('inventory.stock.filter.wh') }}</option>
                <option
                    v-for="warehouse in warehouses"
                    :key="warehouse.value"
                    :value="warehouse.value"
                >
                    {{ warehouse.label }}
                </option>
            </select>
            <select
                class="a-select"
                :value="view.low ? 'low' : ''"
                :aria-label="t('inventory.stock.aria.level')"
                @change="view.low = $event.target.value === 'low'"
            >
                <option value="">
                    {{ t('inventory.stock.filter.level') }}
                </option>
                <option value="low">
                    {{ t('inventory.stock.filter.low') }}
                </option>
            </select>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="sku">
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
