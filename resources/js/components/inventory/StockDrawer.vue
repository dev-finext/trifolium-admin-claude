<script setup>
// One stock row, opened: everything the inventory screen knows about an item
// in one place, rather than an adjust button and nothing else.
//
// The figures first, then the same item's row in every warehouse as `OITW`
// holds it, the batches still carrying quantity, and the movements that got it
// here. The item's own card is a click away for the master data — group,
// units, prices, suppliers — which belongs there and not here.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { BATCH_STATES, STOCK_MOVE } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The stock row, or null while the drawer is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits([
    'close',
    'adjust',
    'open-batch',
    'open-doc',
    'open-item',
]);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const items = useItemsStore();

/** The item card behind the row — its levels, its group, its warehouse rows. */
const item = computed(() => (props.row ? items.rowBySku(props.row.sku) : null));

const unit = computed(() =>
    props.row?.unit ? t(`inventory.unit.${props.row.unit}`) : '',
);

const qty = (value) =>
    value === null || value === undefined
        ? '—'
        : `${num(value, 3)} ${unit.value}`.trim();

/** Every warehouse the item is counted in, named, with the row's own figures. */
const warehouses = computed(() =>
    (props.row ? items.warehouseRowsOf(props.row.sku) : []).map((one) => ({
        id: one.warehouse,
        name:
            items.sapWarehouses.find(
                (warehouse) => warehouse.code === one.warehouse,
            )?.name || one.warehouse,
        ...one,
    })),
);

const warehouseCols = computed(() => [
    { k: 'name', label: t('items.card.warehouse') },
    { k: 'onHand', label: t('items.card.onHand'), nowrap: true },
    { k: 'committed', label: t('items.card.committed'), nowrap: true },
    { k: 'onOrder', label: t('items.card.onOrder'), nowrap: true },
    { k: 'min', label: t('items.card.minLevel'), nowrap: true },
    { k: 'max', label: t('items.card.maxLevel'), nowrap: true },
]);

/** The batches still holding something, nearest expiry first. */
const batches = computed(() =>
    props.row
        ? inventory.openBatchesOf(props.row.sku, { allowWaste: true })
        : [],
);

const batchCols = computed(() => [
    { k: 'id', label: t('inventory.batches.col.id'), nowrap: true },
    { k: 'qty', label: t('inventory.batches.col.qty'), nowrap: true },
    { k: 'expiry', label: t('inventory.batches.col.expiry'), nowrap: true },
    { k: 'state', label: t('inventory.batches.col.state'), nowrap: true },
    { k: 'supplier', label: t('inventory.batches.col.supplier') },
]);

/** What moved this item, newest first. */
const movements = computed(() =>
    props.row
        ? inventory.movements
              .filter((move) => move.sku === props.row.sku)
              .slice(0, 12)
        : [],
);

const movementCols = computed(() => [
    { k: 'when', label: t('inventory.movements.col.when'), nowrap: true },
    { k: 'kind', label: t('inventory.movements.col.kind'), nowrap: true },
    { k: 'qty', label: t('inventory.movements.col.qty'), nowrap: true },
    { k: 'batch', label: t('inventory.movements.col.batch'), nowrap: true },
    { k: 'ref', label: t('inventory.movements.col.ref'), nowrap: true },
]);
</script>

<template>
    <ADrawer :open="Boolean(row)" @close="emit('close')">
        <template v-if="row">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">{{ loc(row.name) }}</h2>
                            <span class="a-code a-tag">{{ row.sku }}</span>
                            <AChip v-if="item?.groupName" :dot="false">{{
                                item.groupName
                            }}</AChip>
                            <AChip v-if="row.low" tone="red" size="sm">
                                {{ t('inventory.stock.lowChip') }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span>{{ t(`warehouse.${row.wh}.name`) }}</span>
                            <span v-if="item?.names?.en" class="ltr">{{
                                item.names.en
                            }}</span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            kind="p"
                            sm
                            icon="edit"
                            @click="emit('adjust', row)"
                        >
                            {{ t('inventory.stock.adjust') }}
                        </AButton>
                        <AButton
                            sm
                            icon="tag"
                            @click="emit('open-item', row.sku)"
                        >
                            {{ t('inventory.stock.openItem') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div class="body">
                <div class="a-kpis">
                    <AKpi :label="t('items.card.onHand')" small>
                        <template #value>{{ qty(row.onHand) }}</template>
                    </AKpi>
                    <AKpi :label="t('items.card.committed')" small>
                        <template #value>{{ qty(row.alloc) }}</template>
                    </AKpi>
                    <AKpi :label="t('items.card.avail')" small>
                        <template #value>{{ qty(row.avail) }}</template>
                    </AKpi>
                    <AKpi :label="t('items.card.minLevel')" small>
                        <template #value>{{ qty(row.min) }}</template>
                    </AKpi>
                    <AKpi :label="t('items.card.maxLevel')" small>
                        <template #value>{{ qty(item?.levels?.max) }}</template>
                    </AKpi>
                    <AKpi :label="t('inventory.stock.col.batches')" small>
                        <template #value>{{ batches.length }}</template>
                    </AKpi>
                </div>

                <section>
                    <div class="a-sect-t">{{ t('items.card.warehouse') }}</div>
                    <ADataTable
                        v-if="warehouses.length"
                        :cols="warehouseCols"
                        :rows="warehouses"
                        row-key="id"
                    >
                        <template #cell-onHand="{ row: one }">
                            <ANum>{{ num(one.onHand, 3) }}</ANum>
                        </template>
                        <template #cell-committed="{ row: one }">
                            <ANum>{{ num(one.committed, 3) }}</ANum>
                        </template>
                        <template #cell-onOrder="{ row: one }">
                            <ANum>{{ num(one.onOrder, 3) }}</ANum>
                        </template>
                        <template #cell-min="{ row: one }">
                            <ANum>{{ num(one.min, 3) }}</ANum>
                        </template>
                        <template #cell-max="{ row: one }">
                            <ANum>{{ num(one.max, 3) }}</ANum>
                        </template>
                    </ADataTable>
                    <p v-else class="t-sub">
                        {{ t('items.card.noWarehouses') }}
                    </p>
                </section>

                <section>
                    <div class="a-sect-t">{{ t('items.card.batches') }}</div>
                    <ADataTable
                        v-if="batches.length"
                        :cols="batchCols"
                        :rows="batches"
                        row-key="id"
                        @row="emit('open-batch', $event.id)"
                    >
                        <template #cell-id="{ row: batch }">
                            <span class="a-code a-tag">{{ batch.id }}</span>
                        </template>
                        <template #cell-qty="{ row: batch }">
                            <ANum>{{ num(batch.remaining, 3) }}</ANum>
                            {{ unit }}
                        </template>
                        <template #cell-expiry="{ row: batch }">
                            {{ fmtISO(batch.expiry) }}
                        </template>
                        <template #cell-state="{ row: batch }">
                            <AChip
                                :tone="BATCH_STATES[batch.state]?.tone"
                                size="sm"
                            >
                                {{ t(`batchState.${batch.state}`) }}
                            </AChip>
                        </template>
                        <template #cell-supplier="{ row: batch }">
                            <span v-if="batch.supplier">{{
                                loc(batch.supplier)
                            }}</span>
                            <span v-else class="t-sub">{{
                                t(`inventory.batchSource.${batch.source}`)
                            }}</span>
                        </template>
                    </ADataTable>
                    <p v-else class="t-sub">{{ t('items.card.noBatches') }}</p>
                </section>

                <section>
                    <div class="a-sect-t">
                        {{ t('inventory.tab.movements') }}
                    </div>
                    <ADataTable
                        v-if="movements.length"
                        :cols="movementCols"
                        :rows="movements"
                        row-key="id"
                    >
                        <template #cell-when="{ row: move }">
                            <ANum>{{ move.when.stamp }}</ANum>
                        </template>
                        <template #cell-kind="{ row: move }">
                            <AChip
                                :tone="STOCK_MOVE[move.kind]?.tone"
                                size="sm"
                                :dot="false"
                            >
                                {{ t(`stockMove.${move.kind}`) }}
                            </AChip>
                        </template>
                        <template #cell-qty="{ row: move }">
                            <span :class="{ 'is-out': move.qty < 0 }">
                                <ANum>{{ num(move.qty, 3) }}</ANum>
                            </span>
                        </template>
                        <template #cell-batch="{ row: move }">
                            <button
                                v-if="move.batch"
                                type="button"
                                class="a-linkish"
                                @click="emit('open-batch', move.batch)"
                            >
                                <span class="a-code a-tag">{{
                                    move.batch
                                }}</span>
                            </button>
                            <span v-else class="t-sub">—</span>
                        </template>
                        <template #cell-ref="{ row: move }">
                            <button
                                v-if="move.ref"
                                type="button"
                                class="a-linkish"
                                @click="emit('open-doc', move.ref)"
                            >
                                <span class="a-code a-tag">{{ move.ref }}</span>
                            </button>
                            <span v-else class="t-sub">—</span>
                        </template>
                    </ADataTable>
                    <p v-else class="t-sub">
                        {{ t('inventory.movements.none') }}
                    </p>
                </section>
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.body {
    display: grid;
    gap: 18px;
}

.is-out {
    color: var(--a-red);
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
