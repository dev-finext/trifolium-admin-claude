<script setup>
// The stock ledger: every quantity that moved, and the document it moved on.
//
// Goods in is positive, an allocation to compounding is negative, and an
// adjustment carries the sign of its variance. Each row names the batch it moved
// out of, which is what makes a quantity on a shelf answerable.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { STOCK_MOVE_IDS, WAREHOUSES } from '@/config';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** Which movement kinds point at an order rather than at a stock document. */
const ORDER_REF_KINDS = ['allocated_to_compounding', 'released_on_cancel'];

const emit = defineEmits(['open-batch', 'open-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const view = useUrlState({ mq: '', mkind: '', mwh: '' });

const kinds = computed(() =>
    STOCK_MOVE_IDS.map((id) => ({ value: id, label: t(`stockMove.${id}`) })),
);

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        value: warehouse.id,
        label: t(`warehouse.${warehouse.id}.name`),
    })),
);

const term = computed(() => view.mq.trim().toLowerCase());

const rows = computed(() =>
    inventory.movements.filter(
        (move) =>
            (!view.mkind || move.kind === view.mkind) &&
            (!view.mwh || move.wh === view.mwh) &&
            (!term.value ||
                searchHaystack(
                    move.batch,
                    move.name,
                    move.sku,
                    move.ref,
                ).includes(term.value)),
    ),
);

const dirty = computed(
    () => Boolean(view.mq) || Boolean(view.mkind) || Boolean(view.mwh),
);

const cols = computed(() => [
    {
        k: 'when',
        label: t('inventory.movements.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => `${row.when.iso} ${row.when.time}`,
    },
    {
        k: 'kind',
        label: t('inventory.movements.col.kind'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('inventory.movements.col.item'), sortable: true },
    {
        k: 'batch',
        label: t('inventory.movements.col.batch'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'qty',
        label: t('inventory.movements.col.qty'),
        nowrap: true,
        sortable: true,
    },
    { k: 'ref', label: t('inventory.movements.col.ref'), nowrap: true },
    { k: 'by', label: t('inventory.movements.col.by') },
]);

const isOrderRef = (move) => ORDER_REF_KINDS.includes(move.kind);

function clear() {
    view.mq = '';
    view.mkind = '';
    view.mwh = '';
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">
            {{ t('inventory.movements.note') }}
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('inventory.movements.count')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchBox
                v-model="view.mq"
                :placeholder="t('inventory.movements.search')"
                :width="320"
            />
            <select
                v-model="view.mkind"
                class="a-select"
                :aria-label="t('inventory.movements.aria.kind')"
            >
                <option value="">
                    {{ t('inventory.movements.filter.kind') }}
                </option>
                <option
                    v-for="kind in kinds"
                    :key="kind.value"
                    :value="kind.value"
                >
                    {{ kind.label }}
                </option>
            </select>
            <select
                v-model="view.mwh"
                class="a-select"
                :aria-label="t('inventory.movements.aria.wh')"
            >
                <option value="">
                    {{ t('inventory.movements.filter.wh') }}
                </option>
                <option
                    v-for="warehouse in warehouses"
                    :key="warehouse.value"
                    :value="warehouse.value"
                >
                    {{ warehouse.label }}
                </option>
            </select>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #empty>
                <AEmpty
                    icon="list"
                    :title="t('inventory.movements.empty.title')"
                    :sub="t('inventory.movements.empty.sub')"
                />
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>
            <template #cell-kind="{ row }">
                {{ t(`stockMove.${row.kind}`) }}
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">{{ row.sku }}</div>
            </template>
            <template #cell-batch="{ row }">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open-batch', row.batch)"
                >
                    <ANum>{{ row.batch }}</ANum>
                </button>
            </template>
            <template #cell-qty="{ row }">
                <span class="num a-move-q" :class="{ 'is-out': row.qty < 0 }">
                    {{ row.qty > 0 ? '+' : '' }}{{ num(row.qty) }}
                </span>
                {{ t(`inventory.unit.${row.unit}`) }}
            </template>
            <template #cell-ref="{ row }">
                <RouterLink
                    v-if="isOrderRef(row)"
                    class="a-linkbtn"
                    :to="{ name: 'order', params: { id: row.ref } }"
                >
                    <ANum>{{ row.ref }}</ANum>
                </RouterLink>
                <button
                    v-else-if="row.kind === 'goods_in'"
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open-receipt', row.ref)"
                >
                    <ANum>{{ row.ref }}</ANum>
                </button>
                <span v-else class="a-muted">—</span>
            </template>
            <template #cell-by="{ row }">
                <template v-if="row.by">{{ loc(row.by) }}</template>
                <span v-else class="a-muted">
                    {{ t('inventory.movements.system') }}
                </span>
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

.a-move-q {
    font-weight: 700;
    color: var(--a-accent);
}

.a-move-q.is-out {
    color: var(--a-red);
}
</style>
