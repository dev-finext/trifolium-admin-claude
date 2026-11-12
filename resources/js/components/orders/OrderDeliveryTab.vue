<script setup>
// The "משלוח" tab — read only.
//
// From "בהכנה" onward only the shipping station moves an order
// (SHIPPING_STATION_SPEC.md §13): this tab shows the recipient, the address,
// the power-of-attorney state, the courier and tracking, and the shipment's
// own history, but no button here changes any of it. "פתח בעמדת המשלוחים" is
// the one door out.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import { formatAddress } from '@/components/users/address';
import { useLocalized } from '@/composables/useLocalized';
import { ORG } from '@/config';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const { courierName } = useCourierName();

const isPickup = computed(() => props.order.shipTo === 'pickup');

/** Whoever physically receives the order. */
const recipient = computed(() => {
    if (props.order.shipTo === 'patient') {
        return {
            name: loc(props.order.patient.name),
            phone: props.order.recipientPhone || props.order.patient.phone,
        };
    }

    if (props.order.shipTo === 'me') {
        return {
            name: `${loc(props.order.practitioner.first)} ${loc(props.order.practitioner.last)}`,
            phone: props.order.recipientPhone || props.order.practitioner.phone,
        };
    }

    return props.order.payer === 'patient'
        ? {
              name: loc(props.order.patient.name),
              phone: props.order.patient.phone,
          }
        : {
              name: `${loc(props.order.practitioner.first)} ${loc(props.order.practitioner.last)}`,
              phone: props.order.practitioner.phone,
          };
});

const address = computed(() =>
    props.order.addressProvided
        ? formatAddress(props.order.address, t, loc)
        : '',
);

/** The order's own shipments, newest first — the handover history. */
const shipments = computed(() =>
    [...(props.order.shipments || [])].sort((a, b) =>
        `${b.linkedAt?.iso || ''}${b.linkedAt?.time || ''}`.localeCompare(
            `${a.linkedAt?.iso || ''}${a.linkedAt?.time || ''}`,
        ),
    ),
);
const activeShipment = computed(
    () =>
        shipments.value.find(
            (s) => s.status === 'active' || s.status === 'handed',
        ) || null,
);

function shipmentStateLabel(shipment) {
    return t(`orders.delivery.shipmentState.${shipment.status}`);
}

function openInStation() {
    router.push({ name: 'deliveries', query: { order: props.order.id } });
}
</script>

<template>
    <div class="a-grid">
        <ACard
            v-if="isPickup"
            :title="t('orders.delivery.pickupCard')"
            icon="map_pin"
        >
            <AKeyValue
                :rows="[
                    [t('orders.delivery.method'), null],
                    [
                        t('orders.delivery.pickupPoint'),
                        `${loc(ORG.name)} · ${loc(ORG.address)}`,
                    ],
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

            <div v-if="order.collectedAt" class="a-note a-note--info od-note">
                {{
                    t('orders.delivery.collectedNote', {
                        stamp: order.collectedAt.stamp,
                        by: order.collectedByName
                            ? loc(order.collectedByName)
                            : t('orders.value.none'),
                    })
                }}
            </div>
        </ACard>

        <template v-else>
            <div
                v-if="order.shipTo === 'patient' && !order.addressProvided"
                class="a-note a-note--warn"
            >
                {{ t('orders.delivery.addressPending') }}
            </div>
            <div v-if="!order.shipTo" class="a-note a-note--danger">
                {{ t('orders.delivery.unknownRecipient') }}
            </div>

            <div class="a-2col">
                <ACard :title="t('orders.delivery.addressCard')" icon="map_pin">
                    <AKeyValue
                        :rows="[
                            [t('orders.delivery.recipient'), recipient.name],
                            [t('orders.delivery.phone'), null],
                            [
                                t('orders.delivery.address'),
                                address || t('orders.delivery.notReceived'),
                            ],
                            [
                                t('orders.delivery.notes'),
                                order.deliveryNotes
                                    ? loc(order.deliveryNotes)
                                    : t('orders.value.none'),
                            ],
                            [t('orders.delivery.poa'), null],
                        ]"
                    >
                        <template #value-1>
                            <ANum>{{ recipient.phone }}</ANum>
                        </template>
                        <template #value-4>
                            <AChip
                                v-if="
                                    order.shipTo === 'me'
                                        ? order.courierAuth
                                        : order.poa?.status === 'signed'
                                "
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
                    <AKeyValue
                        :rows="[
                            [t('orders.delivery.courier'), null],
                            [t('orders.delivery.tracking'), null],
                            [t('orders.delivery.packages'), null],
                            [t('orders.delivery.shipDate'), null],
                        ]"
                    >
                        <template #value-0>
                            <template v-if="order.courier">
                                {{ courierName(order.courier) }}
                                <AChip
                                    v-if="activeShipment?.isManual"
                                    tone="gray"
                                    size="sm"
                                    :dot="false"
                                >
                                    {{ t('orders.delivery.manualShipment') }}
                                </AChip>
                            </template>
                            <span v-else class="od-muted">
                                {{ t('orders.delivery.noCourier') }}
                            </span>
                        </template>
                        <template #value-1>
                            <ANum v-if="order.tracking">{{
                                order.tracking
                            }}</ANum>
                            <span v-else>—</span>
                        </template>
                        <template #value-2>
                            <ANum>{{ order.packagesCount || 1 }}</ANum>
                        </template>
                        <template #value-3>
                            <ANum v-if="order.shippedAt">{{
                                order.shippedAt.stamp
                            }}</ANum>
                            <span v-else>—</span>
                        </template>
                    </AKeyValue>

                    <div v-if="shipments.length" class="od-shiphist">
                        <div class="a-sect-t">
                            {{ t('orders.delivery.shipmentHistory') }}
                        </div>
                        <div
                            v-for="shipment in shipments"
                            :key="shipment.id"
                            class="od-shiprow"
                        >
                            <AChip size="sm" :dot="false">{{
                                shipmentStateLabel(shipment)
                            }}</AChip>
                            <span class="t-sub">
                                {{ courierName(shipment.courierCode) }} ·
                                <ANum>{{ shipment.trackingNumber }}</ANum> ·
                                {{ shipment.linkedAt?.stamp }}
                            </span>
                        </div>
                    </div>
                </ACard>
            </div>
        </template>

        <div class="od-open">
            <AButton sm icon="truck" @click="openInStation">
                {{ t('orders.delivery.openInStation') }}
            </AButton>
        </div>
    </div>
</template>

<style scoped>
.od-note {
    margin-top: 14px;
}

.od-muted {
    color: var(--a-ink-4);
}

.od-shiphist {
    margin-top: 16px;
}

.od-shiprow {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
    border-top: 1px solid var(--a-border, #e5e7eb);
}

.od-open {
    grid-column: 1 / -1;
}
</style>
