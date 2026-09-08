<script setup>
// The order-detail route (/orders/:id).
//
// It is deep-linkable: the whole state — which order, which tab, whether the
// drawer is full-screen — is in the URL, so a filtered list plus one open order
// can be pasted to a colleague and open identically. The list (OrdersBrowser)
// renders underneath the drawer, so the view a colleague was sent stays behind
// the order they opened, and closing returns to it with its filters intact.
//
// The drawer body is a tabbed panel beside a persistent progress rail. The tab
// components already exist for overview and contents; the correspondence,
// documentation and rail panels are this area's own. The header carries the
// status changes through OrderActionsBar. An id that resolves to no order shows
// the not-found state rather than an empty drawer.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import CourierDialog from '@/components/orders/CourierDialog.vue';
import OrderActionsBar from '@/components/orders/OrderActionsBar.vue';
import OrderDeliveryTab from '@/components/orders/OrderDeliveryTab.vue';
import OrderDocsStream from '@/components/orders/OrderDocsStream.vue';
import OrderItemsPanel from '@/components/orders/OrderItemsPanel.vue';
import OrderMessagesPanel from '@/components/orders/OrderMessagesPanel.vue';
import OrderOverviewTab from '@/components/orders/OrderOverviewTab.vue';
import OrderPaymentTab from '@/components/orders/OrderPaymentTab.vue';
import OrderSafetyTab from '@/components/orders/OrderSafetyTab.vue';
import OrdersBrowser from '@/components/orders/OrdersBrowser.vue';
import OrderStatusRail from '@/components/orders/OrderStatusRail.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ExceptionChip from '@/components/ui/ExceptionChip.vue';
import PayerChip from '@/components/ui/PayerChip.vue';
import PaymentChip from '@/components/ui/PaymentChip.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { ils } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { statusOf, useOrdersStore } from '@/stores/orders';

/** The tabs that have a panel, in the order they appear. */
const TAB_COMPONENTS = {
    overview: OrderOverviewTab,
    items: OrderItemsPanel,
    payment: OrderPaymentTab,
    delivery: OrderDeliveryTab,
    messaging: OrderMessagesPanel,
    safety: OrderSafetyTab,
    docs: OrderDocsStream,
};

const { t } = useI18n();
const { loc } = useLocalized();
const route = useRoute();
const router = useRouter();
const dataset = useDatasetStore();
const orders = useOrdersStore();

const view = useUrlState({ tab: 'overview', full: false });

const id = computed(() => String(route.params.id));
const order = computed(() => orders.byId(id.value));
const loading = computed(() => dataset.isBusy && !order.value);

const status = computed(() => (order.value ? statusOf(order.value) : ''));

const creditUnpaid = computed(
    () => Boolean(order.value?.credit) && !order.value?.creditPaid,
);

const tabs = computed(() => {
    if (!order.value) {
        return [];
    }

    return [
        { id: 'overview', label: t('orders.tabs.overview'), icon: 'list' },
        {
            id: 'items',
            label: t('orders.tabs.items'),
            icon: 'layers',
            n: order.value.items.length,
        },
        { id: 'payment', label: t('orders.tabs.payment'), icon: 'card' },
        { id: 'delivery', label: t('orders.tabs.delivery'), icon: 'truck' },
        {
            id: 'messaging',
            label: t('orders.tabs.messaging'),
            icon: 'whatsapp',
            n: orders.messagesFor(id.value).length || undefined,
        },
        {
            id: 'safety',
            label: t('orders.tabs.safety'),
            icon: 'shield',
            n: orders.interactionsFor(order.value).length || undefined,
        },
        { id: 'docs', label: t('orders.tabs.docs'), icon: 'file_text' },
    ];
});

const activeTab = computed(() =>
    TAB_COMPONENTS[view.tab] ? view.tab : 'overview',
);
const activeComponent = computed(() => TAB_COMPONENTS[activeTab.value]);

/**
 * A confirmation raised by a tab. The tabs describe what should happen and what
 * it will affect; the dialog is owned here so one tab's dialog cannot outlive
 * a switch to another.
 */
const ask = ref(null);

/** The order whose courier is being assigned, if any. */
const assigning = ref(null);

async function saveCourier(form) {
    const target = assigning.value;

    assigning.value = null;

    if (target) {
        await orders.assignCourier(target.id, form);
    }
}

function confirmAsk(reason, code) {
    const pending = ask.value;

    ask.value = null;
    pending?.done?.(reason, code);
}

/** Closing returns to the list, keeping its filters but dropping detail state. */
function close() {
    const query = { ...route.query };

    delete query.tab;
    delete query.full;
    router.push({ name: 'orders', query });
}
</script>

<template>
    <OrdersBrowser />

    <ADrawer :open="true" :full="view.full" @close="close">
        <ASkeleton v-if="loading" :rows="10" />

        <template v-else-if="!order">
            <div class="od-notfound-bar">
                <AButton sm icon="chevron_left" @click="close">
                    {{ t('orders.backToList') }}
                </AButton>
            </div>
            <AEmpty
                icon="inbox"
                :title="t('orders.notFound.title')"
                :sub="t('orders.notFound.sub')"
            />
        </template>

        <template v-else>
            <div class="a-dhead a-dhead--shadow">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="od-id">
                                <ANum>{{ order.id }}</ANum>
                            </h2>
                            <StatusChip :status="status" size="lg" />
                            <PayerChip :payer="order.payer" />
                            <!-- V2: urgency and the practitioner's special terms -->
                            <template v-if="order.urgent">
                                <AChip tone="red" :dot="false">
                                    {{ t('orders.detail.urgent') }}
                                </AChip>
                                <V2Badge id="order-flags" size="sm" />
                            </template>
                            <template v-if="order.practitioner.specialTerms">
                                <AChip
                                    tone="amber"
                                    :dot="false"
                                    :title="
                                        loc(order.practitioner.specialTerms)
                                    "
                                >
                                    {{ t('orders.detail.specialTerms') }}
                                </AChip>
                                <V2Badge id="order-flags" size="sm" />
                            </template>
                            <template v-if="order.cancelCause">
                                <AChip tone="red" :dot="false">
                                    {{
                                        t('orders.detail.cancelledWhy', {
                                            cause: t(
                                                `orders.cancelCause.${order.cancelCause}`,
                                            ),
                                        })
                                    }}
                                </AChip>
                                <V2Badge id="crm" size="sm" />
                            </template>
                            <PaymentChip :order="order" />
                            <ExceptionChip
                                v-for="flag in order.flags"
                                :key="flag"
                                :id="flag"
                            />
                        </div>
                        <div class="a-dhead-m">
                            <span>
                                {{
                                    t('orders.detail.created', {
                                        stamp: order.stamp,
                                    })
                                }}
                            </span>
                            <span>
                                {{
                                    t('orders.detail.practitioner', {
                                        name: loc(order.practitioner.name),
                                        code: order.practitioner.code,
                                    })
                                }}
                            </span>
                            <span>
                                {{
                                    t('orders.detail.customer', {
                                        name: loc(order.patient.name),
                                        phone: order.patient.phone,
                                    })
                                }}
                            </span>
                            <span>
                                {{ t('orders.detail.totalLabel') }}
                                <AMoney :value="order.pricing.total" />
                            </span>
                        </div>
                    </div>

                    <div class="a-dhead-a">
                        <AButton
                            sm
                            :icon="view.full ? 'chevron_left' : 'grid'"
                            @click="view.full = !view.full"
                        >
                            {{
                                view.full
                                    ? t('orders.detail.exitFull')
                                    : t('orders.detail.fullScreen')
                            }}
                        </AButton>
                        <AButton sm icon="x" @click="close">
                            {{ t('orders.backToList') }}
                        </AButton>
                    </div>
                </div>

                <div v-if="creditUnpaid" class="a-note a-note--warn od-note">
                    {{
                        t('orders.detail.creditWarn', {
                            name: loc(order.practitioner.name),
                            debt: ils(order.practitioner.debt, 0),
                            days: order.practitioner.debtDays,
                        })
                    }}
                </div>
                <div
                    v-if="order.docStatus === 'failed'"
                    class="a-note a-note--danger od-note"
                >
                    {{ t('orders.detail.docFailed') }}
                </div>

                <OrderActionsBar :order="order" />

                <ATabs
                    :tabs="tabs"
                    :model-value="activeTab"
                    @update:model-value="view.tab = $event"
                />
            </div>

            <div class="od-body">
                <div class="od-main">
                    <component
                        :is="activeComponent"
                        :order="order"
                        @ask="ask = $event"
                        @assign="assigning = order"
                    />
                </div>
                <OrderStatusRail :order="order" class="od-rail" />
            </div>
        </template>
    </ADrawer>

    <CourierDialog
        :open="Boolean(assigning)"
        :order="assigning"
        @close="assigning = null"
        @save="saveCourier"
    />

    <ConfirmDialog
        :open="Boolean(ask)"
        :title="ask?.title || ''"
        :body="ask?.body || ''"
        :effects="ask?.effects || []"
        :confirm-label="ask?.confirmLabel || ''"
        :danger="ask?.danger || false"
        :reason="ask?.reason || false"
        :pin="ask?.pin || false"
        @close="ask = null"
        @confirm="confirmAsk"
    />
</template>

<style scoped>
.od-id {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
}

.od-note {
    margin-bottom: 14px;
}

.od-notfound-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 18px;
}

.od-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 20px;
    align-items: start;
}

@media (max-width: 900px) {
    .od-body {
        grid-template-columns: 1fr;
    }
}
</style>
