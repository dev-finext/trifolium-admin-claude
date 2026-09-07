<script setup>
// רכש — purchase orders, receipts against them, supplier delivery notes waiting
// for their invoice, and the consumption report the next order is planned from.
// Second-version material.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import ConsumptionTab from '@/components/purchasing/ConsumptionTab.vue';
import PurchaseOrderDrawer from '@/components/purchasing/PurchaseOrderDrawer.vue';
import PurchaseOrderEditor from '@/components/purchasing/PurchaseOrderEditor.vue';
import PurchaseOrdersTab from '@/components/purchasing/PurchaseOrdersTab.vue';
import ReceiveAgainstPoModal from '@/components/purchasing/ReceiveAgainstPoModal.vue';
import SupplierNotesTab from '@/components/purchasing/SupplierNotesTab.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const store = usePurchasingStore();

const view = useUrlState({ tab: 'pos', po: '' });

const editing = ref(null);
const receiving = ref(null);

const counts = computed(() => ({
    open: store.purchaseOrders.filter((po) => po.state === 'open').length,
    partial: store.purchaseOrders.filter((po) => po.state === 'partial').length,
    notes: store.openNotes.length,
}));

const tabs = computed(() => [
    {
        id: 'pos',
        label: t('purchasing.tab.pos'),
        icon: 'inbox',
        n: counts.value.open + counts.value.partial,
    },
    {
        id: 'notes',
        label: t('purchasing.tab.notes'),
        icon: 'file_text',
        n: counts.value.notes || undefined,
    },
    {
        id: 'consumption',
        label: t('purchasing.tab.consumption'),
        icon: 'chart',
    },
]);

const openPo = computed(() =>
    view.po ? store.rows.find((row) => row.id === view.po) || null : null,
);

function onSaved(result) {
    push({
        title: result.created
            ? t('purchasing.toast.created')
            : t('purchasing.toast.updated'),
        body: result.po.id,
    });
    editing.value = null;
    view.tab = 'pos';
    view.po = result.po.id;
}

function onReceived({ receipt, note, state }) {
    push({
        title: t('purchasing.receive.toast', { id: receiving.value?.id }),
        body: t('purchasing.receive.toastBody', {
            receipt: receipt.id,
            n: receipt.batches.length,
            note: note.id,
            state: t(`purchasing.state.${state}`),
        }),
    });
    receiving.value = null;
}

function onCancelled(po) {
    push({ title: t('purchasing.toast.cancelled'), body: po.id, bad: true });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.purchasing')]"
        :title="t('purchasing.title')"
        :sub="t('purchasing.sub', counts)"
    >
        <template #badge>
            <V2Badge id="purchase-orders" />
        </template>
        <template #actions>
            <AButton kind="p" icon="plus" @click="editing = {}">
                {{ t('purchasing.action.newPo') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <template v-else>
        <PurchaseOrdersTab
            v-if="view.tab === 'pos'"
            :selected="view.po"
            @open="view.po = $event"
        />
        <SupplierNotesTab
            v-else-if="view.tab === 'notes'"
            @open-po="view.po = $event"
        />
        <ConsumptionTab v-else-if="view.tab === 'consumption'" />
    </template>

    <PurchaseOrderDrawer
        :po="openPo"
        @close="view.po = ''"
        @edit="editing = $event"
        @receive="receiving = $event"
        @cancelled="onCancelled"
    />

    <PurchaseOrderEditor
        v-if="editing"
        :po="editing"
        @close="editing = null"
        @saved="onSaved"
    />
    <ReceiveAgainstPoModal
        v-if="receiving"
        :po="receiving"
        @close="receiving = null"
        @saved="onReceived"
    />
</template>
