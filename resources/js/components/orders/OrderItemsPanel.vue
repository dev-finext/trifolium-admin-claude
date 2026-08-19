<script setup>
// The "order contents" tab: every item on the order.
//
// A compounded formula is an expandable card with its own preparation stage; a
// shelf product is a compact row with no stage at all. Cancelling one item
// refunds its share and leaves the rest of the order running — the store owns
// that rule.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import OrderItemCard from '@/components/orders/OrderItemCard.vue';
import OrderItemStages from '@/components/orders/OrderItemStages.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ils } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import {
    itemRefund,
    shelfItems,
    trackedItems,
    useOrdersStore,
} from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const toast = useToast();
const dataset = useDatasetStore();
const orders = useOrdersStore();

const formulas = computed(() => trackedItems(props.order));
const shelf = computed(() => shelfItems(props.order));

/** The first formula still being worked starts open — it is the one to check. */
const open = ref(
    (() => {
        const busy = formulas.value.find(
            (item) =>
                !['shipped', 'delivered', 'cancelled'].includes(item.stage),
        );

        return busy ? [busy.id] : [];
    })(),
);

const cancelling = ref(null);

const shelfCols = computed(() => [
    { k: 'sku', label: t('orders.itemsTab.skuCol'), nowrap: true },
    { k: 'name', label: t('orders.itemsTab.productCol') },
    { k: 'qty', label: t('orders.itemsTab.qtyCol'), nowrap: true },
    { k: 'price', label: t('orders.itemsTab.unitPriceCol'), nowrap: true },
    { k: 'sum', label: t('orders.itemsTab.lineTotalCol'), nowrap: true },
]);

const refund = computed(() =>
    cancelling.value ? itemRefund(props.order, cancelling.value) : 0,
);

function toggle(id) {
    open.value = open.value.includes(id)
        ? open.value.filter((row) => row !== id)
        : [...open.value, id];
}

function print() {
    toast.push({
        title: t('orders.itemsTab.printDone'),
        body: t('orders.itemsTab.printDoneBody'),
    });
}

async function confirmCancel(reason) {
    const item = cancelling.value;

    cancelling.value = null;

    if (!item) {
        return;
    }

    const refunded = await orders.cancelItem(props.order.id, item.id, reason);

    toast.push({
        title: t('orders.itemsTab.cancelDone'),
        body: t('orders.itemsTab.cancelDoneBody', {
            name: loc(item.name),
            refund: ils(refunded, 0),
        }),
        bad: true,
    });
}
</script>

<template>
    <div class="a-grid">
        <OrderItemStages :order="order" />

        <ACard
            v-if="formulas.length"
            :title="t('orders.itemsTab.formulas', { n: formulas.length })"
            icon="beaker"
            :pad="false"
        >
            <template #right>
                <AButton sm kind="p" icon="printer" @click="print">
                    {{ t('orders.itemsTab.print') }}
                </AButton>
            </template>
            <div class="a-icards">
                <OrderItemCard
                    v-for="item in formulas"
                    :key="item.id"
                    :order="order"
                    :item="item"
                    :open="open.includes(item.id)"
                    @toggle="toggle(item.id)"
                    @cancel="cancelling = $event"
                />
            </div>
        </ACard>

        <ACard
            v-if="shelf.length"
            :title="t('orders.itemsTab.shelf', { n: shelf.length })"
            icon="package"
            :pad="false"
        >
            <template #right>
                <AChip tone="gray" size="sm" :dot="false">
                    {{ t('orders.itemsTab.shelfNoTracking') }}
                </AChip>
            </template>
            <ADataTable :cols="shelfCols" :rows="shelf" row-key="id">
                <template #cell-sku="{ row }">
                    <ANum>{{ row.sku }}</ANum>
                </template>
                <template #cell-name="{ row }">
                    <span class="t-strong">{{ loc(row.name) }}</span>
                    <div v-if="row.size" class="t-sub">
                        <ANum>{{ row.size }}</ANum>
                    </div>
                </template>
                <template #cell-qty="{ row }">
                    <ANum>{{ row.qty }}</ANum>
                </template>
                <template #cell-price="{ row }">
                    <AMoney :value="row.price" />
                </template>
                <template #cell-sum="{ row }">
                    <AMoney :value="row.price * row.qty" />
                </template>
            </ADataTable>
        </ACard>

        <ConfirmDialog
            :open="Boolean(cancelling)"
            danger
            reason
            :pin="dataset.session?.pin || true"
            :title="t('orders.itemsTab.cancelTitle')"
            :confirm-label="t('orders.itemsTab.cancelConfirm')"
            :body="
                cancelling
                    ? t('orders.itemsTab.cancelBody', {
                          name: loc(cancelling.name),
                          id: order.id,
                          refund: ils(refund, 0),
                      })
                    : ''
            "
            :effects="
                cancelling
                    ? [
                          t('orders.effect.refundTo', {
                              refund: ils(refund, 0),
                              payer: t(`payer.${order.payer}`),
                          }),
                          t('orders.effect.othersContinue'),
                          t('orders.effect.loggedInDocs'),
                      ]
                    : []
            "
            @close="cancelling = null"
            @confirm="confirmCancel"
        />
    </div>
</template>
