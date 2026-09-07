<script setup>
// The queue table: one dense row per delivery on the desk, and the actions an
// agent takes from it — assign or update a courier, dispatch, notify a pickup
// customer, open the order. The filters that feed `rows` live in
// DeliveryFilters.vue; the state both read lives in the screen's URL.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { COURIER, ORDER_STATUS_IDS, ORG } from '@/config';
import { fmtISO } from '@/lib/dates';
import { useDeliveriesStore } from '@/stores/deliveries';

defineProps({
    /** The deliveries that survived the screen's filters. */
    rows: { type: Array, default: () => [] },
    /** `{ key, dir }` — the sort the screen holds in the URL. */
    sort: { type: Object, default: null },
});

const emit = defineEmits(['update:sort', 'assign', 'ship', 'notify', 'open']);

const { t } = useI18n();
const { loc } = useLocalized();
const { courierName } = useCourierName();
const deliveries = useDeliveriesStore();

/** V2: the pickup point an order is bound for, when it is not the pharmacy. */
const pointOf = (order) =>
    order.pickupPoint ? deliveries.pointById(order.pickupPoint) : null;

const cols = computed(() => [
    {
        k: 'id',
        label: t('deliveries.col.order'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'to',
        label: t('deliveries.col.recipient'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.patient.name,
    },
    {
        k: 'type',
        label: t('deliveries.col.type'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => t(`fulfilment.${order.deliveryType}`),
    },
    {
        k: 'addr',
        label: t('deliveries.col.address'),
        sortable: true,
        sortValue: (order) => order.address.city,
    },
    {
        k: 'courier',
        label: t('deliveries.col.courier'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => courierName(order.courier),
    },
    {
        k: 'track',
        label: t('deliveries.col.tracking'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.tracking || '',
    },
    {
        k: 'st',
        label: t('deliveries.col.status'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => ORDER_STATUS_IDS.indexOf(order.status),
    },
    {
        k: 'date',
        label: t('deliveries.col.date'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.iso,
    },
    { k: 'act', label: t('deliveries.col.actions'), nowrap: true },
]);

/** The letter code the courier prints on the label and opens its numbers with. */
const courierCode = (id) => COURIER[id]?.code || '';

/** A parcel can only be dispatched once a courier is holding it. */
function canShip(order) {
    return (
        order.deliveryType === 'courier' &&
        order.status === 'ready_for_delivery' &&
        Boolean(order.courier)
    );
}

function street(order) {
    return t('deliveries.row.street', {
        street: loc(order.address.street),
        num: order.address.num,
        city: loc(order.address.city),
    });
}

function addressDetail(order) {
    return t('deliveries.row.addressDetail', {
        apt: order.address.apt,
        floor: order.address.floor,
        entry: order.address.entry,
    });
}
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="id"
        :sort="sort"
        @update:sort="emit('update:sort', $event)"
        @row="emit('open', $event)"
    >
        <template #empty>
            <AEmpty
                icon="truck"
                :title="t('deliveries.empty.title')"
                :sub="t('deliveries.empty.sub')"
            />
        </template>

        <template #cell-id="{ row }">
            <div class="t-strong num id">{{ row.id }}</div>
            <div v-if="row.urgent" class="mark">
                <AChip tone="red" size="sm" :dot="false">
                    {{ t('deliveries.row.urgent') }}
                </AChip>
                <V2Badge id="order-flags" size="sm" />
            </div>
            <div v-if="row.credit && !row.creditPaid" class="mark">
                <AChip tone="purple" size="sm" :dot="false">
                    {{ t('status.credit') }}
                </AChip>
            </div>
            <div
                v-if="row.deliveryType === 'courier' && !row.poaSigned"
                class="mark"
            >
                <AChip tone="red" size="sm" :dot="false">
                    {{ t('deliveries.poa.state.missing') }}
                </AChip>
            </div>
        </template>

        <template #cell-to="{ row }">
            <div class="t-strong">{{ loc(row.patient.name) }}</div>
            <div class="t-sub">
                <ANum>{{ row.patient.phone }}</ANum>
            </div>
        </template>

        <template #cell-type="{ row }">
            <span class="mode">
                <AIcon
                    :name="row.deliveryType === 'courier' ? 'truck' : 'map_pin'"
                    :size="17"
                />
                {{ t(`fulfilment.${row.deliveryType}`) }}
            </span>
        </template>

        <template #cell-addr="{ row }">
            <template v-if="row.deliveryType === 'pickup'">
                <div v-if="pointOf(row)" class="muted">
                    {{
                        t('deliveries.row.point', {
                            name: loc(pointOf(row).name),
                        })
                    }}
                    <V2Badge id="pickup-points" size="sm" />
                </div>
                <div v-else class="muted">{{ loc(ORG.address) }}</div>
                <div v-if="row.pickupNotifiedAt" class="t-sub">
                    {{
                        t('deliveries.row.notified', {
                            stamp: row.pickupNotifiedAt,
                        })
                    }}
                </div>
            </template>
            <template v-else-if="row.addressProvided">
                <div>{{ street(row) }}</div>
                <div class="t-sub">{{ addressDetail(row) }}</div>
            </template>
            <AChip v-else tone="amber" size="sm">
                {{ t('deliveries.row.addressPending') }}
            </AChip>
        </template>

        <template #cell-courier="{ row }">
            <template v-if="row.courier">
                <div>{{ courierName(row.courier) }}</div>
                <div class="t-sub">
                    {{
                        t('deliveries.row.supplierCode', {
                            code: courierCode(row.courier),
                        })
                    }}
                </div>
            </template>
            <span v-else class="faint">
                {{ t('deliveries.row.noCourier') }}
            </span>
        </template>

        <template #cell-track="{ row }">
            <template v-if="row.tracking">
                <ANum>{{ row.tracking }}</ANum>
                <div v-if="row.sentOn" class="t-sub">
                    {{
                        t('deliveries.row.sentOn', { date: fmtISO(row.sentOn) })
                    }}
                </div>
            </template>
            <span v-else class="faint">{{ t('deliveries.row.none') }}</span>
        </template>

        <template #cell-st="{ row }">
            <StatusChip :status="row.status" />
        </template>

        <template #cell-date="{ row }">
            <span class="muted num">{{ fmtISO(row.iso) }}</span>
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton
                    v-if="row.deliveryType === 'courier'"
                    sm
                    icon="truck"
                    @click="emit('assign', row)"
                >
                    {{
                        row.courier
                            ? t('deliveries.action.updateTracking')
                            : t('deliveries.action.assign')
                    }}
                </AButton>
                <AButton
                    v-if="canShip(row)"
                    sm
                    icon="send"
                    :disabled="!row.poaSigned"
                    :title="
                        row.poaSigned
                            ? t('deliveries.action.ship')
                            : t('deliveries.action.shipBlocked')
                    "
                    @click="emit('ship', row)"
                >
                    {{ t('deliveries.action.ship') }}
                </AButton>
                <AButton
                    v-if="row.deliveryType === 'pickup'"
                    sm
                    icon="whatsapp"
                    @click="emit('notify', row)"
                >
                    {{ t('deliveries.action.notifyPickup') }}
                </AButton>
                <AButton sm icon="external" @click="emit('open', row)">
                    {{ t('deliveries.action.open') }}
                </AButton>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.id {
    font-size: 16px;
}

.mark {
    margin-top: 5px;
}

.mode {
    display: flex;
    align-items: center;
    gap: 7px;
}

.mode .a-ico {
    color: var(--a-ink-3);
}

.muted {
    color: var(--a-ink-3);
}

.faint {
    color: var(--a-ink-4);
}
</style>
