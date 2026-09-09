<script setup>
// What one item holds, what is spoken for, and what is on its way — with the
// documents behind each number one click away.
//
// The same panel serves the item card and the ingredient card: an ingredient
// and an item are one record read by two different people, and neither should
// have to learn a second layout to answer "who is this stock promised to".
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined item row, or null while the card is closed. */
    row: { type: Object, default: null },
});

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const inventory = useInventoryStore();

/** Which of the three lists is expanded. */
const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

const stockPanel = ref('committed');

const committed = computed(() =>
    props.row ? store.committedOf(props.row.sku) : [],
);

const onOrder = computed(() =>
    props.row ? store.onOrderOf(props.row.sku) : [],
);

const onOrderQty = computed(() =>
    onOrder.value.reduce((sum, line) => sum + (line.qtySales ?? line.qty), 0),
);

const batches = computed(() =>
    props.row ? inventory.openBatchesOf(props.row.sku) : [],
);

const committedCols = computed(() => [
    { k: 'order', label: t('items.card.colOrder'), nowrap: true },
    { k: 'item', label: t('items.card.colItem') },
    { k: 'practitioner', label: t('items.card.colPractitioner') },
    { k: 'qty', label: t('items.card.colQty'), nowrap: true },
]);

const onOrderCols = computed(() => [
    { k: 'po', label: t('items.card.colPo'), nowrap: true },
    { k: 'supplier', label: t('items.card.colSupplier') },
    { k: 'qty', label: t('items.card.colQty'), nowrap: true },
    { k: 'eta', label: t('items.card.colEta'), nowrap: true },
]);

const batchCols = computed(() => [
    { k: 'id', label: t('items.card.colBatch'), nowrap: true },
    { k: 'remaining', label: t('items.card.colRemaining'), nowrap: true },
    { k: 'expiry', label: t('items.card.colExpiry'), nowrap: true },
]);
</script>

<template>
    <ACard :title="t('items.card.stock')" icon="grid" class="span2">
        <template v-if="row.tracked">
            <div class="stock-tiles">
                <div class="tile">
                    <div class="tile-l">
                        {{ t('items.card.onHand') }}
                    </div>
                    <div class="tile-v num">
                        {{ num(row.onHand) }}
                    </div>
                </div>
                <button
                    type="button"
                    class="tile is-btn"
                    :class="{ 'is-on': stockPanel === 'committed' }"
                    @click="stockPanel = 'committed'"
                >
                    <div class="tile-l">
                        {{ t('items.card.committed') }}
                    </div>
                    <div class="tile-v num">
                        {{ num(row.alloc) }}
                    </div>
                    <div class="tile-s">
                        {{
                            t('items.card.drill', {
                                n: committed.length,
                            })
                        }}
                    </div>
                </button>
                <button
                    type="button"
                    class="tile is-btn"
                    :class="{ 'is-on': stockPanel === 'onOrder' }"
                    @click="stockPanel = 'onOrder'"
                >
                    <div class="tile-l">
                        {{ t('items.card.onOrder') }}
                    </div>
                    <div class="tile-v num">
                        {{ num(onOrderQty) }}
                    </div>
                    <div class="tile-s">
                        {{
                            t('items.card.drill', {
                                n: onOrder.length,
                            })
                        }}
                    </div>
                </button>
                <div class="tile">
                    <div class="tile-l">
                        {{ t('items.card.avail') }}
                    </div>
                    <div class="tile-v num" :class="{ 'is-low': row.low }">
                        {{ num(row.avail) }}
                    </div>
                    <div class="tile-s">
                        {{
                            t('items.card.minText', {
                                n: num(row.min ?? 0),
                            })
                        }}
                    </div>
                </div>
                <button
                    type="button"
                    class="tile is-btn"
                    :class="{ 'is-on': stockPanel === 'batches' }"
                    @click="stockPanel = 'batches'"
                >
                    <div class="tile-l">
                        {{ t('items.card.batches') }}
                    </div>
                    <div class="tile-v num">
                        {{ batches.length }}
                    </div>
                    <div class="tile-s">
                        {{ uomLabel(row.uom?.sales) }}
                    </div>
                </button>
            </div>

            <ADataTable
                v-if="stockPanel === 'committed'"
                :cols="committedCols"
                :rows="committed"
                row-key="id"
                :max-height="260"
            >
                <template #empty>
                    <p class="t-sub inset">
                        {{ t('items.card.noCommitted') }}
                    </p>
                </template>
                <template #cell-order="{ row: line }">
                    <RouterLink
                        class="a-linkbtn"
                        :to="{
                            name: 'order',
                            params: { id: line.order },
                        }"
                    >
                        <ANum>{{ line.order }}</ANum>
                    </RouterLink>
                </template>
                <template #cell-item="{ row: line }">
                    <div>{{ loc(line.itemName) }}</div>
                    <div v-if="line.status" class="t-sub">
                        {{ t(`status.${line.status}`) }}
                    </div>
                </template>
                <template #cell-practitioner="{ row: line }">{{
                    loc(line.practitioner)
                }}</template>
                <template #cell-qty="{ row: line }">
                    <ANum>{{ num(line.qty) }}</ANum>
                    {{ uomLabel(line.unit) }}
                </template>
            </ADataTable>

            <ADataTable
                v-else-if="stockPanel === 'onOrder'"
                :cols="onOrderCols"
                :rows="onOrder"
                row-key="id"
                :max-height="260"
            >
                <template #empty>
                    <p class="t-sub inset">
                        {{ t('items.card.noOnOrder') }}
                    </p>
                </template>
                <template #cell-po="{ row: line }"
                    ><ANum>{{ line.po }}</ANum></template
                >
                <template #cell-supplier="{ row: line }">{{
                    loc(line.supplier)
                }}</template>
                <template #cell-qty="{ row: line }">
                    <ANum>{{ num(line.qty) }}</ANum>
                    {{ uomLabel(line.uom) }}
                </template>
                <template #cell-eta="{ row: line }">
                    <ANum>{{ line.eta ? fmtISO(line.eta) : '—' }}</ANum>
                </template>
            </ADataTable>

            <ADataTable
                v-else
                :cols="batchCols"
                :rows="batches"
                row-key="id"
                :max-height="260"
            >
                <template #empty>
                    <p class="t-sub inset">
                        {{ t('items.card.noBatches') }}
                    </p>
                </template>
                <template #cell-id="{ row: batch }"
                    ><ANum>{{ batch.id }}</ANum></template
                >
                <template #cell-remaining="{ row: batch }">
                    <ANum>{{ num(batch.remaining) }}</ANum>
                    {{ t(`inventory.unit.${batch.unit}`) }}
                </template>
                <template #cell-expiry="{ row: batch }">
                    <ANum>{{ fmtISO(batch.expiry) }}</ANum>
                    <AChip
                        v-if="batch.state !== 'active'"
                        size="sm"
                        tone="amber"
                    >
                        {{ t(`batchState.${batch.state}`) }}
                    </AChip>
                </template>
            </ADataTable>
        </template>
        <p v-else class="t-sub">{{ t('items.card.notTracked') }}</p>
    </ACard>
</template>
