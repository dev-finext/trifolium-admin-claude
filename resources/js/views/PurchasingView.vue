<script setup>
// רכש — two things the buyer does, and nothing else.
//
//   בקשת רכש      a shopping list: what is wanted, before anybody has been
//                 asked for a price. Ticked off as it is sourced
//   הזמנת רכש     one supplier, quantities that are required, a file to send
//                 them, and the goods booked in when they arrive
//
// Making something here instead of buying it is a production order, and
// production orders have their own screen — הוראות ייצור. It was a third tab
// here for a while, which put the same job in two places.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import GoodsReceiptModal from '@/components/inventory/GoodsReceiptModal.vue';
import PageHead from '@/components/layout/PageHead.vue';
import BuyingTab from '@/components/purchasing/BuyingTab.vue';
import ReceiptLabelsModal from '@/components/purchasing/ReceiptLabelsModal.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { BUYING_KIND_IDS } from '@/config';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useStickersStore } from '@/stores/stickers';

/** How many skeleton rows stand in while the dataset loads. */
const SKELETON_ROWS = 8;

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const stickers = useStickersStore();
const inventory = useInventoryStore();

// Receiving without a purchase order — "קנייה בלי הזמנה". Receiving against
// one happens on that order's own sheet (BuyingSheetView/BuyingReceive); this
// is the only other door, and it is the only door now — goods receipt no
// longer lives on the Inventory screen (DEMO_INVENTORY_FIXES_PROMPT.md §5).
const receiving = ref(false);

/** The receipt whose batch labels are offered for printing, once signed. */
const labelling = ref(null);

function onReceived({ id, batches }) {
    // The store hands back the receipt's number; the labels are read off the
    // receipt itself.
    const receipt = inventory.receiptById(id);

    if ((receipt?.lines || []).some((line) => stickers.itemCount(line) > 0)) {
        labelling.value = receipt;
    }

    push({
        title: t('inventory.toast.received.title'),
        body: t(
            'inventory.toast.received.body',
            { id, n: batches.length },
            batches.length,
        ),
    });
}

const view = useUrlState({ tab: 'request' });

// A link to the third tab this page used to have still exists in somebody's
// history; `kind` has to be one of the two or the sheet has no rules to read.
watch(
    () => view.tab,
    (tab) => {
        if (!BUYING_KIND_IDS.includes(tab)) {
            view.tab = 'request';
        }
    },
    { immediate: true },
);

const tabs = computed(() => [
    { id: 'request', label: t('buying.tab.request'), icon: 'list' },
    { id: 'order', label: t('buying.tab.order'), icon: 'inbox' },
]);
</script>

<template>
    <PageHead
        :crumbs="[t('buying.crumb'), t('buying.title')]"
        :title="t('buying.title')"
        :sub="t('buying.sub')"
    >
        <template #actions>
            <AButton icon="plus" @click="receiving = true">
                {{ t('buying.action.receiveNoOrder') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <AErrorState v-if="dataset.error" :message="dataset.error" />
    <ASkeleton v-else-if="dataset.isBusy" :rows="SKELETON_ROWS" />

    <BuyingTab v-else :key="view.tab" :kind="view.tab" />

    <GoodsReceiptModal
        :open="receiving"
        @close="receiving = false"
        @saved="onReceived"
    />

    <ReceiptLabelsModal :receipt="labelling" @close="labelling = null" />
</template>
