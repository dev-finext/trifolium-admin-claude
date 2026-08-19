<script setup>
// Inventory — stock, goods receipt, batches and the stock ledger.
//
// Stock enters ONLY through a goods receipt: each receipt line opens one batch
// with its own number and expiry, and every batch is traceable forward to the
// customer who received part of it. There is no vendor management and no
// purchase orders here — the supplier is recorded as plain data on the receipt.
//
// The active tab and the open drawer live in the query string, so a filtered
// view or one batch's trace can be pasted to a colleague. The receipt form and
// the adjustment dialog are actions, not addresses, and stay local.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AdjustStockModal from '@/components/inventory/AdjustStockModal.vue';
import BatchesTab from '@/components/inventory/BatchesTab.vue';
import BatchTraceDrawer from '@/components/inventory/BatchTraceDrawer.vue';
import GoodsReceiptModal from '@/components/inventory/GoodsReceiptModal.vue';
import MovementsTab from '@/components/inventory/MovementsTab.vue';
import ReceiptDrawer from '@/components/inventory/ReceiptDrawer.vue';
import ReceiptsTab from '@/components/inventory/ReceiptsTab.vue';
import StockTab from '@/components/inventory/StockTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const inventory = useInventoryStore();
const route = useRoute();
const router = useRouter();

const view = useUrlState({ tab: 'stock', batch: '', receipt: '' });

/** The receipt form and the adjustment are actions, not addresses. */
const receiving = ref(false);
const adjusting = ref(null);

const tabs = computed(() => [
    {
        id: 'stock',
        label: t('inventory.tab.stock'),
        icon: 'grid',
        n: inventory.lowStock.length || undefined,
    },
    {
        id: 'receipts',
        label: t('inventory.tab.receipts'),
        icon: 'package',
        n: inventory.receipts.length,
    },
    {
        id: 'batches',
        label: t('inventory.tab.batches'),
        icon: 'layers',
        n:
            inventory.expiringBatches.length +
                inventory.expiredBatches.length || undefined,
    },
    {
        id: 'movements',
        label: t('inventory.tab.movements'),
        icon: 'list',
        n: inventory.movements.length,
    },
]);

const tracedBatch = computed(() =>
    view.batch ? inventory.batchById(view.batch) : null,
);

const shownReceipt = computed(() =>
    view.receipt ? inventory.receiptById(view.receipt) : null,
);

/** One drawer at a time: opening a batch closes the receipt, and back. */
function openBatch(id) {
    view.receipt = '';
    view.batch = id;
}

function openReceipt(id) {
    view.batch = '';
    view.receipt = id;
}

/**
 * Jump to another tab carrying its filters with it. An empty value clears the
 * key instead of writing it, so the target tab opens with exactly the filters
 * named here and no leftovers.
 */
function goto(tab, patch = {}) {
    const query = { ...route.query, tab };

    Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
            delete query[key];
        } else {
            query[key] = String(value);
        }
    });

    router.replace({ query });
}

/** From the stock table into the batches tab, filtered to one item. */
function openItemBatches(sku) {
    goto('batches', { bq: sku, bstate: '', bexp: '' });
}

/** From the stock KPI into the batches tab, filtered to the expiring ones. */
function openExpiring() {
    goto('batches', { bstate: 'expiring', bexp: '', bq: '', bwh: '' });
}

function onReceived({ id, batches }) {
    view.tab = 'receipts';
    push({
        title: t('inventory.toast.received.title'),
        body: t(
            'inventory.toast.received.body',
            { id, n: batches.length },
            batches.length,
        ),
    });
}

/** `B-2611 −40 · B-2612 −12` — which batches the adjustment moved. */
function movedNote(moved) {
    return moved
        .map(
            ({ id, delta }) =>
                `${id} ${delta < 0 ? '−' : '+'}${num(Math.abs(delta))}`,
        )
        .join(' · ');
}

function onAdjusted({ item, reason, diff, moved }) {
    const params = {
        item: loc(item.name),
        reason: t(`adjustReason.${reason}.name`),
        diff: `${diff > 0 ? '+' : ''}${num(diff)}`,
        unit: t(`inventory.unit.${item.unit}`),
    };

    push({
        title: t('inventory.toast.adjusted.title'),
        body: moved.length
            ? t('inventory.toast.adjusted.bodyBatches', {
                  ...params,
                  batches: movedNote(moved),
              })
            : t('inventory.toast.adjusted.body', params),
    });
}

/** The whole stock table, for the count sheet. */
function exportStock() {
    const file = `stock-${isoDaysAgo(0)}.csv`;
    const header = [
        t('inventory.stock.col.sku'),
        t('inventory.stock.col.name'),
        t('inventory.stock.col.lat'),
        t('inventory.stock.col.kind'),
        t('inventory.stock.col.wh'),
        t('inventory.stock.col.onHand'),
        t('inventory.stock.col.alloc'),
        t('inventory.stock.col.avail'),
        t('inventory.stock.col.min'),
        t('inventory.stock.col.unit'),
    ];
    const n = downloadCsv(
        file,
        header,
        inventory.stock.map((row) => [
            row.sku,
            loc(row.name),
            row.lat || '',
            t(`inventory.stockKind.${row.kind}`),
            t(`warehouse.${row.wh}.name`),
            row.onHand,
            row.alloc,
            row.avail,
            row.min,
            t(`inventory.unit.${row.unit}`),
        ]),
    );

    push({
        title: t('inventory.toast.exported.title'),
        body: t('inventory.toast.exported.body', { file, n }),
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.inventory')]"
        :title="t('inventory.title')"
        :sub="
            t('inventory.sub', {
                items: inventory.stock.length,
                batches: inventory.liveBatches.length,
                receipts: inventory.receipts.length,
            })
        "
    >
        <template #actions>
            <AButton
                icon="download"
                :disabled="!inventory.stock.length"
                @click="exportStock"
            >
                {{ t('inventory.action.export') }}
            </AButton>
            <AButton kind="p" icon="plus" @click="receiving = true">
                {{ t('inventory.action.newReceipt') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <template v-else>
        <StockTab
            v-if="view.tab === 'stock'"
            @adjust="adjusting = $event"
            @open-batches="openItemBatches"
            @open-expiring="openExpiring"
        />
        <ReceiptsTab
            v-else-if="view.tab === 'receipts'"
            :selected="view.receipt"
            @open-receipt="openReceipt"
            @open-batch="openBatch"
            @new-receipt="receiving = true"
        />
        <BatchesTab
            v-else-if="view.tab === 'batches'"
            :selected="view.batch"
            @open-batch="openBatch"
            @open-receipt="openReceipt"
        />
        <MovementsTab
            v-else-if="view.tab === 'movements'"
            @open-batch="openBatch"
            @open-receipt="openReceipt"
        />
    </template>

    <GoodsReceiptModal
        :open="receiving"
        @close="receiving = false"
        @saved="onReceived"
    />
    <AdjustStockModal
        :item="adjusting"
        @close="adjusting = null"
        @saved="onAdjusted"
    />

    <ReceiptDrawer
        :receipt="shownReceipt"
        @close="view.receipt = ''"
        @open-batch="openBatch"
    />
    <BatchTraceDrawer
        :batch="tracedBatch"
        @close="view.batch = ''"
        @open-receipt="openReceipt"
    />
</template>
