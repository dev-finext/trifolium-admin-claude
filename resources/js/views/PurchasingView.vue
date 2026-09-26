<script setup>
// רכש — purchase orders, receipts against them, supplier delivery notes waiting
// for their invoice, and the consumption report the next order is planned from.
// Second-version material.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import ConsumptionTab from '@/components/purchasing/ConsumptionTab.vue';
import PlanningRowDrawer from '@/components/purchasing/PlanningRowDrawer.vue';
import PlanningTab from '@/components/purchasing/PlanningTab.vue';
import ProduceFromPlanModal from '@/components/purchasing/ProduceFromPlanModal.vue';
import PurchaseOrderDrawer from '@/components/purchasing/PurchaseOrderDrawer.vue';
import PurchaseOrderEditor from '@/components/purchasing/PurchaseOrderEditor.vue';
import PurchaseOrdersTab from '@/components/purchasing/PurchaseOrdersTab.vue';
import PurchaseRequestDrawer from '@/components/purchasing/PurchaseRequestDrawer.vue';
import PurchaseRequestsTab from '@/components/purchasing/PurchaseRequestsTab.vue';
import RaiseRequestModal from '@/components/purchasing/RaiseRequestModal.vue';
import ReceiveAgainstPoModal from '@/components/purchasing/ReceiveAgainstPoModal.vue';
import SupplierInvoicesTab from '@/components/purchasing/SupplierInvoicesTab.vue';
import SupplierNotesTab from '@/components/purchasing/SupplierNotesTab.vue';
import SupplierPaymentsTab from '@/components/purchasing/SupplierPaymentsTab.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { usePlanningStore } from '@/stores/planning';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const store = usePurchasingStore();
const planning = usePlanningStore();
const router = useRouter();

const view = useUrlState({ tab: 'planning', po: '', item: '', req: '' });

/** The two exits out of the planning report, each a modal while it is open. */
const raising = ref(false);
const producing = ref(false);

const editing = ref(null);
const receiving = ref(null);

const counts = computed(() => ({
    open: store.purchaseOrders.filter((po) => po.state === 'open').length,
    partial: store.purchaseOrders.filter((po) => po.state === 'partial').length,
    notes: store.openNotes.length,
}));

const tabs = computed(() => [
    {
        id: 'planning',
        label: t('purchasing.tab.planning'),
        icon: 'chart',
        n: planningReport.value.rows.filter((row) =>
            ['low', 'critical'].includes(row.coverState),
        ).length,
    },
    {
        id: 'requests',
        label: t('purchasing.tab.requests'),
        icon: 'inbox',
        n:
            planning.purchaseRequests.filter((row) =>
                ['draft', 'sent'].includes(row.state),
            ).length || undefined,
    },
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
        id: 'invoices',
        label: t('purchasing.tab.invoices'),
        icon: 'file_text',
        n: store.payableKpis.overdueCount || undefined,
    },
    {
        id: 'payments',
        label: t('purchasing.tab.payments'),
        icon: 'coin',
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

/**
 * The planning report, computed once for the view: the tab reads it for the
 * table and the drawer reads the one row out of it, so the two can never show a
 * different number for the same item.
 */
const planningReport = computed(() => planning.report());

const openPlanning = computed(() =>
    view.item
        ? planningReport.value.rows.find((row) => row.sku === view.item) || null
        : null,
);

const openRequest = computed(() =>
    view.req ? planning.requestById(view.req) : null,
);

/** A request was raised: show the list it landed in. */
function onRaised(made) {
    raising.value = false;

    if (!made?.length) {
        return;
    }

    push({
        title: t('planning.request.raisedToast', { n: made.length }),
        body: made.map((one) => one.number).join(' · '),
    });
    view.tab = 'requests';
    view.req = made.length === 1 ? made[0].id : '';
}

/**
 * Production orders were opened straight from the report.
 *
 * They do not live here — an order belongs to the production screen — so the
 * report hands the buyer over to it, with the single order already open.
 */
function onProduced(made) {
    producing.value = false;

    if (!made?.length) {
        return;
    }

    push({
        title: t('planning.produce.openedToast', { n: made.length }),
        body: made.map((one) => one.id).join(' · '),
    });
    router.push({
        name: 'production',
        query: made.length === 1 ? { order: made[0].id } : {},
    });
}

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
        <SupplierInvoicesTab
            v-else-if="view.tab === 'invoices'"
            @open-po="view.po = $event"
        />
        <SupplierPaymentsTab v-else-if="view.tab === 'payments'" />
        <ConsumptionTab v-else-if="view.tab === 'consumption'" />
        <PurchaseRequestsTab
            v-else-if="view.tab === 'requests'"
            :selected="view.req"
            @open="view.req = $event"
        />
        <PlanningTab
            v-else
            :selected="view.item"
            @open="view.item = $event"
            @request="raising = true"
            @produce="producing = true"
        />
    </template>

    <PlanningRowDrawer
        :row="openPlanning"
        :months="planningReport.months"
        @close="view.item = ''"
        @open-item="router.push({ name: 'items', query: { sku: $event } })"
    />

    <PurchaseRequestDrawer
        :request="openRequest"
        @close="view.req = ''"
        @open-po="
            view.req = '';
            view.tab = 'pos';
            view.po = $event;
        "
    />

    <RaiseRequestModal
        v-if="raising"
        @close="raising = false"
        @raised="onRaised"
    />

    <ProduceFromPlanModal
        v-if="producing"
        @close="producing = false"
        @produced="onProduced"
    />

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
