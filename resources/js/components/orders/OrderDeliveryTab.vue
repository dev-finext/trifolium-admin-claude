<script setup>
// The delivery tab. Two entirely different shapes behind one tab:
//
//   self pickup  — where and when to collect, and who is collecting.
//   courier      — recipient, address, and the courier plus tracking number.
//
// Courier delivery requires a signed power of attorney from the recipient, so
// its absence is stated plainly rather than left for the packer to discover.
// None of the couriers has an API, so the tracking number is typed in by hand
// and this screen says so instead of implying a carrier lookup.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ORG } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';
import { statusOf, useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const emit = defineEmits(['ask', 'assign']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const orders = useOrdersStore();

// The fulfilment ids are the ones in config/org.js FULFILMENT_IDS — 'pickup',
// not the React prototype's 'self_pickup'.
const isPickup = computed(() => props.order.deliveryType === 'pickup');

/** V2: the pickup point the order is bound for — a partner shop or a practitioner. */
const deliveries = useDeliveriesStore();
const point = computed(() =>
    props.order.pickupPoint
        ? deliveries.pointById(props.order.pickupPoint)
        : null,
);
const pickupPointText = computed(() =>
    point.value
        ? t('orders.delivery.pickupPointNamed', {
              name: loc(point.value.name),
              address: point.value.address
                  ? loc(point.value.address)
                  : loc(point.value.city) ||
                    t('orders.delivery.pickupAtPharmacy'),
          })
        : `${loc(ORG.name)} · ${loc(ORG.address)}`,
);

/** Whoever physically receives the order — the payer, whichever that is. */
const recipient = computed(() =>
    props.order.payer === 'patient'
        ? {
              name: loc(props.order.patient.name),
              phone: props.order.patient.phone,
          }
        : {
              name: `${loc(props.order.practitioner.first)} ${loc(props.order.practitioner.last)}`,
              phone: props.order.practitioner.phone,
          },
);

const address = computed(() => props.order.address || {});

const shipped = computed(() =>
    ['shipped', 'delivered'].includes(statusOf(props.order)),
);

const shipDate = computed(() =>
    shipped.value ? String(props.order.stamp || '').split(' ')[0] : '—',
);

/** The customer fills the address through the payment link; it may not be in yet. */
const awaitingAddress = computed(
    () => props.order.payer === 'patient' && !props.order.addressProvided,
);

/**
 * Both pickup actions are offered only once the order is actually waiting at the
 * counter. Telling somebody to come and collect an order still in the lab is the
 * kind of message that costs a wasted trip.
 */
const atCounter = computed(
    () => statusOf(props.order) === 'ready',
);

// Readiness is not set here: the lab reports it by finishing the order, and this
// button's job is to tell the customer about it. It used to claim a status change
// in its effects list and never make one.
function askReady() {
    emit('ask', {
        title: t('orders.delivery.readyTitle'),
        confirmLabel: t('orders.delivery.readyConfirm'),
        body: t('orders.delivery.readyBody', { id: props.order.id }),
        effects: [
            t('orders.delivery.readyEffectMessage'),
            t('orders.delivery.readyEffectLogged'),
        ],
        done: () => push({ title: t('orders.delivery.readyDone') }),
    });
}

// Handing a bag over the counter is the one delivery event no system observes, so
// the person who handed it over records it — and this one really does write it.
function askDelivered() {
    emit('ask', {
        title: t('orders.delivery.pickupTitle'),
        confirmLabel: t('orders.delivery.pickupConfirm'),
        body: t('orders.delivery.pickupBody', { id: props.order.id }),
        effects: [
            t('orders.effect.statusTo', { status: t('status.delivered') }),
            t('orders.delivery.pickupEffectPoints'),
        ],
        done: async () => {
            await orders.setStatus(props.order.id, 'delivered');
            push({ title: t('orders.delivery.pickupDone') });
        },
    });
}
</script>

<template>
    <div class="a-grid">
        <!-- self pickup -->
        <ACard
            v-if="isPickup"
            :title="t('orders.delivery.pickupCard')"
            icon="map_pin"
        >
            <template v-if="point" #right>
                <V2Badge id="pickup-points" size="sm" />
            </template>
            <AKeyValue
                :rows="[
                    [t('orders.delivery.method'), null],
                    [t('orders.delivery.pickupPoint'), pickupPointText],
                    [t('orders.delivery.hours'), loc(ORG.hours)],
                    [t('orders.delivery.collector'), recipient.name],
                    [t('orders.delivery.phone'), null],
                ]"
            >
                <template #value-0>
                    <AChip tone="teal" :dot="false">
                        {{ t('fulfilment.pickup') }}
                    </AChip>
                </template>
                <template #value-4>
                    <ANum>{{ recipient.phone }}</ANum>
                </template>
            </AKeyValue>

            <div v-if="atCounter" class="od-actions">
                <AButton kind="p" icon="whatsapp" @click="askReady">
                    {{ t('orders.delivery.markReadyNotify') }}
                </AButton>
                <AButton icon="check" @click="askDelivered">
                    {{ t('orders.delivery.deliveredAtPickup') }}
                </AButton>
            </div>
            <p v-else class="a-note a-note--info od-note">
                {{ t('orders.delivery.pickupNotReady') }}
            </p>
        </ACard>

        <!-- courier -->
        <template v-else>
            <div v-if="awaitingAddress" class="a-note a-note--warn">
                {{ t('orders.delivery.addressPending') }}
            </div>

            <div class="a-2col">
                <ACard :title="t('orders.delivery.addressCard')" icon="map_pin">
                    <AKeyValue
                        :rows="[
                            [t('orders.delivery.recipient'), recipient.name],
                            [t('orders.delivery.phone'), null],
                            [
                                t('orders.delivery.city'),
                                order.addressProvided
                                    ? loc(address.city)
                                    : t('orders.delivery.notReceived'),
                            ],
                            [
                                t('orders.delivery.street'),
                                order.addressProvided
                                    ? `${loc(address.street)} ${address.num}`
                                    : '—',
                            ],
                            [
                                t('orders.delivery.aptFloorEntry'),
                                order.addressProvided
                                    ? `${address.apt || '—'} · ${address.floor || '—'} · ${address.entry || '—'}`
                                    : '—',
                            ],
                            [t('orders.delivery.poa'), null],
                        ]"
                    >
                        <template #value-1>
                            <ANum>{{ recipient.phone }}</ANum>
                        </template>
                        <template #value-5>
                            <AChip
                                v-if="order.poaSigned"
                                tone="green"
                                size="sm"
                            >
                                {{ t('orders.delivery.poaSigned') }}
                            </AChip>
                            <AChip v-else tone="red" size="sm">
                                {{ t('orders.delivery.poaMissing') }}
                            </AChip>
                        </template>
                    </AKeyValue>
                </ACard>

                <ACard :title="t('orders.delivery.courierCard')" icon="truck">
                    <template #right>
                        <AButton sm icon="edit" @click="emit('assign')">
                            {{ t('orders.delivery.assign') }}
                        </AButton>
                    </template>

                    <AKeyValue
                        :rows="[
                            [t('orders.delivery.courier'), null],
                            [t('orders.delivery.tracking'), null],
                            [t('orders.delivery.shipDate'), null],
                        ]"
                    >
                        <template #value-0>
                            <template v-if="order.courier">
                                {{ t(`courier.${order.courier}`) }}
                            </template>
                            <span v-else class="od-muted">
                                {{ t('orders.delivery.noCourier') }}
                            </span>
                        </template>
                        <template #value-1>
                            <ANum v-if="order.tracking">
                                {{ order.tracking }}
                            </ANum>
                            <span v-else>—</span>
                        </template>
                        <template #value-2>
                            <ANum>{{ shipDate }}</ANum>
                        </template>
                    </AKeyValue>

                    <div class="a-note a-note--info od-note">
                        {{ t('orders.delivery.courierIntegrationNote') }}
                    </div>
                </ACard>
            </div>
        </template>
    </div>
</template>

<style scoped>
.od-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
}

.od-note {
    margin-top: 14px;
}

.od-muted {
    color: var(--a-ink-4);
}
</style>
