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
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import OrderLink from '@/components/ui/OrderLink.vue';
import { useLocalized } from '@/composables/useLocalized';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined item row, or null while the card is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['open-batch']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const inventory = useInventoryStore();

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

/** The sales unit every quantity tile counts in — empty until the item has one. */
const salesUom = computed(() =>
    props.row?.uom?.stock ? t(`items.uom.${props.row.uom.stock}`) : '',
);

/** Which of the three lists is expanded. */
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

/**
 * Every batch of this item, open or spent. V3.
 *
 * The panel used to list only what still carries stock, which answers "what can
 * I use" but not "where did this item come from" — and a recall question is
 * always about a batch that has already gone out. Nearest expiry first, and the
 * ones still holding stock ahead of the ones that do not.
 */
const batches = computed(() => {
    if (!props.row) {
        return [];
    }

    return inventory.batches
        .filter((batch) => batch.sku === props.row.sku)
        .slice()
        .sort(
            (a, b) =>
                Number(b.remaining > 0) - Number(a.remaining > 0) ||
                a.daysToExp - b.daysToExp,
        );
});

/** How many of them still carry something — the figure the tile counts. */
const liveBatches = computed(
    () => batches.value.filter((batch) => batch.remaining > 0).length,
);

/** Waste of this item still on the shelf, and the batches it sits in. */
const wasteBatches = computed(() =>
    props.row ? inventory.wasteBatchesOf(props.row.sku) : [],
);
const waste = computed(() =>
    props.row ? inventory.wasteOf(props.row.sku) : 0,
);
const askMerge = ref(false);

async function mergeWaste() {
    askMerge.value = false;
    await inventory.mergeWaste(props.row.sku);
}

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
    { k: 'source', label: t('items.card.colBatchSource'), nowrap: true },
    { k: 'remaining', label: t('items.card.colRemaining'), nowrap: true },
    { k: 'expiry', label: t('items.card.colExpiry'), nowrap: true },
]);
</script>

<template>
    <ACard :title="t('items.card.stock')" icon="grid">
        <template v-if="row.tracked">
            <div class="stock-tiles">
                <div class="tile">
                    <div class="tile-l">
                        {{ t('items.card.onHand') }}
                    </div>
                    <div class="tile-v">
                        <ANum>{{ num(row.onHand) }}</ANum>
                        <span v-if="salesUom" class="tile-u">{{
                            salesUom
                        }}</span>
                    </div>
                    <div v-if="waste > 0" class="tile-s">
                        {{ t('items.card.wasteOf', { n: num(waste, 2) }) }}
                        <button
                            v-if="wasteBatches.length > 1"
                            type="button"
                            class="a-linkbtn"
                            @click="askMerge = true"
                        >
                            {{ t('items.card.mergeWaste') }}
                        </button>
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
                    <div class="tile-v">
                        <ANum>{{ num(row.alloc) }}</ANum>
                        <span v-if="salesUom" class="tile-u">{{
                            salesUom
                        }}</span>
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
                    <div class="tile-v">
                        <ANum>{{ num(onOrderQty) }}</ANum>
                        <span v-if="salesUom" class="tile-u">{{
                            salesUom
                        }}</span>
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
                    <div class="tile-v" :class="{ 'is-low': row.low }">
                        <ANum>{{ num(row.avail) }}</ANum>
                        <span v-if="salesUom" class="tile-u">{{
                            salesUom
                        }}</span>
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
                    <div class="tile-v">
                        <ANum>{{ liveBatches }}</ANum>
                    </div>
                    <div class="tile-s">
                        {{
                            t('items.card.drill', {
                                n: batches.length,
                            })
                        }}
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
                    <OrderLink :id="line.order" />
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
                @row="emit('open-batch', $event.id)"
            >
                <template #empty>
                    <p class="t-sub inset">
                        {{ t('items.card.noBatches') }}
                    </p>
                </template>
                <template #cell-id="{ row: batch }">
                    <ANum>{{ batch.number || batch.id }}</ANum>
                </template>
                <template #cell-source="{ row: batch }">
                    <AChip
                        :tone="batch.waste ? 'red' : 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{
                            batch.waste
                                ? t('inventory.batchSource.waste')
                                : t(`inventory.batchSource.${batch.source}`)
                        }}
                    </AChip>
                </template>
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
                        class="batch-state"
                    >
                        {{ t(`batchState.${batch.state}`) }}
                    </AChip>
                </template>
            </ADataTable>
        </template>
        <p v-else class="t-sub">{{ t('items.card.notTracked') }}</p>
        <ConfirmDialog
            :open="askMerge"
            :title="t('items.card.mergeTitle')"
            :body="
                t('items.card.mergeBody', {
                    n: wasteBatches.length,
                    qty: num(waste, 2),
                })
            "
            :confirm-label="t('items.card.mergeConfirm')"
            @close="askMerge = false"
            @confirm="mergeWaste"
        />
    </ACard>
</template>

<style scoped>
.stock-tiles {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

/* Three of the five tiles are buttons; the reset makes them read as tiles. */
.tile {
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    background: var(--a-surface);
    text-align: start;
    font: inherit;
    color: inherit;
}

.tile.is-btn {
    cursor: pointer;
}

.tile.is-btn:hover {
    border-color: var(--a-ink-4);
}

.tile.is-on {
    border-color: var(--a-accent);
    background: var(--a-tint);
}

.tile-l {
    font-size: 12px;
    color: var(--a-ink-3);
}

/* The number and its unit share one line — "120 גרם", not "120" over "גרם". */
.tile-v {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
}

.tile-v.is-low {
    color: var(--a-red);
}

.tile-u {
    font-size: 13px;
    font-weight: 500;
    color: var(--a-ink-3);
}

.tile-s {
    font-size: 12px;
    color: var(--a-ink-4);
}

/* `.t-sub` is only styled globally inside a table; the card's own sub-lines
   carry the same copy the other panels do. */
.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.inset {
    padding: 12px 14px;
    margin: 0;
}

.batch-state {
    margin-inline-start: 6px;
}
</style>
