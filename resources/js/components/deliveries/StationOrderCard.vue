<script setup>
// The station's own order card (SHIPPING_STATION_SPEC.md §5.4): recipient and
// address, the packing checklist, the courier shipment, the order's content
// read-only, and its full history — everything the station needs for one
// order, in a drawer that never leaves the page.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AComboSelect from '@/components/ui/AComboSelect.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ExceptionChip from '@/components/ui/ExceptionChip.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { formatAddress } from '@/components/users/address';
import { useLocalized } from '@/composables/useLocalized';
import { useStickerData } from '@/composables/useStickerData';
import { useToast } from '@/composables/useToast';
import { totalContainers } from '@/lib/containers';
import { L } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useDeliveriesStore } from '@/stores/deliveries';
import { statusOf } from '@/stores/orders';
import { useStickersStore } from '@/stores/stickers';

const props = defineProps({
    order: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const router = useRouter();
const dataset = useDatasetStore();
const store = useDeliveriesStore();
const stickers = useStickersStore();
const { labelsForShipping, printStickers } = useStickerData();

const pin = computed(() => dataset.session?.pin || true);

const win = computed(() =>
    props.order
        ? {
              id: `delivery:${props.order.id}`,
              title: props.order.id,
              icon: 'truck',
          }
        : null,
);

const status = computed(() => (props.order ? statusOf(props.order) : ''));
const exceptions = computed(() =>
    props.order ? store.stationExceptionsOf(props.order) : [],
);
const packing = computed(() =>
    props.order ? store.packingOf(props.order) : [],
);
const totalN = computed(() => (props.order ? totalContainers(props.order) : 0));
const checkedN = computed(() =>
    props.order ? store.packedCount(props.order) : 0,
);
const activeShipment = computed(
    () => props.order && store.activeShipmentOf(props.order),
);
const handedShipment = computed(
    () => props.order && store.handedShipmentOf(props.order),
);
const history = computed(() =>
    props.order ? store.historyOf(props.order) : [],
);

const recipient = computed(() => {
    const order = props.order;

    if (!order) {
        return { name: '', phone: '' };
    }

    if (order.shipTo === 'patient') {
        return { name: loc(order.patient.name), phone: order.recipientPhone };
    }

    if (order.shipTo === 'me') {
        return {
            name: loc(order.practitioner.name),
            phone: order.recipientPhone,
        };
    }

    return order.payer === 'patient'
        ? { name: loc(order.patient.name), phone: order.patient.phone }
        : {
              name: loc(order.practitioner.name),
              phone: order.practitioner.phone,
          };
});

const addressText = computed(() =>
    props.order ? formatAddress(props.order.address, t, loc) : '',
);

const maskedId = (value) =>
    value
        ? `${'•'.repeat(Math.max(0, value.length - 3))}${value.slice(-3)}`
        : '';

// ---- address editing -------------------------------------------------------

const editingAddress = ref(false);
const addressForm = reactive({
    city: '',
    street: '',
    num: '',
    apt: '',
    floor: '',
    entry: '',
});

function openAddressEditor() {
    const a = props.order?.address || {};

    addressForm.city = loc(a.city) || '';
    addressForm.street = loc(a.street) || '';
    addressForm.num = a.num || '';
    addressForm.apt = a.apt || '';
    addressForm.floor = a.floor || '';
    addressForm.entry = loc(a.entry) || '';
    editingAddress.value = true;
}

async function saveAddress() {
    await store.updateAddress(props.order, {
        city: L(addressForm.city, addressForm.city),
        street: L(addressForm.street, addressForm.street),
        num: addressForm.num,
        apt: addressForm.apt,
        floor: addressForm.floor,
        entry: L(addressForm.entry, addressForm.entry),
    });
    editingAddress.value = false;
    push({ title: t('deliveries.card.addressSaved') });
}

// ---- unknown recipient ------------------------------------------------------

const shipToPick = ref('');

async function confirmShipTo() {
    if (!shipToPick.value || !props.order) {
        return;
    }

    await store.setShipTo(props.order, shipToPick.value);
    shipToPick.value = '';
}

// ---- packing ----------------------------------------------------------------

const manualTarget = ref(null);

function askManual(row, containerNo) {
    manualTarget.value = {
        orderItemId: row.item.id,
        containerNo,
        name: loc(row.item.name),
    };
}

async function confirmManual(reason) {
    const target = manualTarget.value;

    manualTarget.value = null;

    if (target) {
        await store.tickManually(
            props.order,
            target.orderItemId,
            target.containerNo,
            reason,
        );
    }
}

function tickShelf(row, containerNo) {
    store.tickShelfContainer(props.order, row.item.id, containerNo);
}

// ---- courier shipment ---------------------------------------------------------

const courierCode = ref('');
const packagesInput = ref(1);
const linking = ref(false);
const manualTrackingOpen = ref(false);
const manualForm = reactive({ courierCode: '', trackingNumber: '' });

function resetShipmentForm() {
    courierCode.value =
        activeShipment.value?.courierCode || store.defaultCourier?.code || '';
    packagesInput.value = props.order?.packagesCount || 1;
}

resetShipmentForm();

const canLink = computed(
    () => Boolean(props.order) && store.linkPreconditions(props.order) === null,
);

async function doLink() {
    if (!props.order || linking.value) {
        return;
    }

    linking.value = true;

    const result = await store.linkCourier(props.order, {
        courierCode: courierCode.value,
        packagesCount: packagesInput.value,
    });

    linking.value = false;

    if (result.ok) {
        push({
            title: t('deliveries.card.linked'),
            body: t('deliveries.card.linkedBody', {
                tracking: result.tracking,
                courier: t(`courier.${result.courier}`),
            }),
        });
        printShippingLabels();
    } else {
        push({
            title: t('deliveries.card.linkFailed'),
            body: result.message || '',
            bad: true,
        });
    }
}

async function doRetry() {
    linking.value = true;

    const result = await store.retryLink(props.order);

    linking.value = false;

    if (result.ok) {
        push({ title: t('deliveries.card.linked'), body: result.tracking });
        printShippingLabels();
    } else {
        push({
            title: t('deliveries.card.linkFailed'),
            body: result.message || '',
            bad: true,
        });
    }
}

function openManualTracking() {
    manualForm.courierCode =
        courierCode.value || store.defaultCourier?.code || '';
    manualForm.trackingNumber = '';
    manualTrackingOpen.value = true;
}

async function confirmManualTracking(reason) {
    if (!manualForm.trackingNumber.trim()) {
        push({ title: t('deliveries.card.trackingRequired'), bad: true });

        return;
    }

    manualTrackingOpen.value = false;
    await store.enterManualTracking(props.order, {
        courierCode: manualForm.courierCode,
        trackingNumber: manualForm.trackingNumber,
        reason,
    });
    printShippingLabels();
}

function printShippingLabels() {
    const template = stickers.templateById('shipping');
    const labels = labelsForShipping(props.order);

    if (template) {
        printStickers(template, labels, props.order.id);
    }
}

// ---- self pickup --------------------------------------------------------------

const collectedByName = ref('');
const collectAsk = ref(false);

async function doMarkReady() {
    await store.markReadyForPickup(props.order);
}

async function confirmCollect() {
    collectAsk.value = false;
    await store.markCollected(props.order, {
        collectedByName: collectedByName.value,
    });
    collectedByName.value = '';
}

// ---- step back / cancel --------------------------------------------------------

const stepBackAsk = ref(false);
const cancelAsk = ref(false);

const canStepBack = computed(() =>
    ['packing', 'awaiting_courier', 'ready_for_pickup'].includes(status.value),
);
const canCancel = computed(() =>
    [
        'in_production',
        'packing',
        'awaiting_courier',
        'ready_for_pickup',
    ].includes(status.value),
);

async function confirmStepBack(reason) {
    stepBackAsk.value = false;
    await store.stepBack(props.order, reason, {
        phoneConfirmed: status.value === 'awaiting_courier',
    });
}

async function confirmCancelOrder(reason) {
    cancelAsk.value = false;
    await store.cancelFromStation(props.order, reason, {
        phoneConfirmed: status.value === 'awaiting_courier',
    });
    emit('close');
}

function openInOrders() {
    router.push({ name: 'order', params: { id: props.order.id } });
}

function eventSentence(row) {
    if (row.kind === 'status') {
        return t('deliveries.history.statusChange', {
            from: t(`status.${row.from}`),
            to: t(`status.${row.to}`),
        });
    }

    return t(`deliveries.event.${row.type}`);
}
</script>

<template>
    <ADrawer :open="Boolean(order)" :win="win" @close="emit('close')">
        <template v-if="order">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                <span class="a-code a-tag">{{ order.id }}</span>
                            </h2>
                            <StatusChip :status="status" size="lg" />
                            <ExceptionChip
                                v-for="id in exceptions"
                                :key="id"
                                :id="id"
                            />
                        </div>
                        <div class="a-dhead-m">
                            <span>{{
                                t(
                                    `fulfilment.${order.shipTo === 'pickup' ? 'pickup' : 'courier'}`,
                                )
                            }}</span>
                            <span v-if="order.courier">
                                {{ t(`courier.${order.courier}`) }}
                                · <ANum>{{ order.tracking }}</ANum>
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton sm icon="x" @click="emit('close')">
                            {{ t('actions.cancel') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div class="a-dbody soc-grid">
                <div
                    v-if="exceptions.includes('unknown_recipient')"
                    class="a-note a-note--warn soc-wide"
                >
                    <div>{{ t('exception.unknown_recipient.label') }}</div>
                    <div class="soc-inline">
                        <ASelect
                            v-model="shipToPick"
                            :options="[
                                { value: '', label: '—' },
                                {
                                    value: 'me',
                                    label: t('deliveries.card.shipTo.me'),
                                },
                                {
                                    value: 'patient',
                                    label: t('deliveries.card.shipTo.patient'),
                                },
                                {
                                    value: 'pickup',
                                    label: t('deliveries.card.shipTo.pickup'),
                                },
                            ]"
                        />
                        <AButton
                            sm
                            icon="check"
                            :disabled="!shipToPick"
                            @click="confirmShipTo"
                        >
                            {{ t('actions.confirm') }}
                        </AButton>
                    </div>
                </div>

                <!-- 1. recipient & address -->
                <ACard
                    :title="t('deliveries.card.recipientTitle')"
                    icon="map_pin"
                >
                    <AKeyValue
                        :rows="[
                            [t('deliveries.card.recipient'), recipient.name],
                            [t('deliveries.card.phone'), null],
                            [
                                t('deliveries.card.address'),
                                order.addressProvided
                                    ? addressText
                                    : t('deliveries.card.addressMissing'),
                            ],
                            [
                                t('deliveries.card.notes'),
                                order.deliveryNotes
                                    ? loc(order.deliveryNotes)
                                    : '—',
                            ],
                            [t('deliveries.card.poa'), null],
                        ]"
                    >
                        <template #value-1
                            ><ANum>{{ recipient.phone }}</ANum></template
                        >
                        <template #value-4>
                            <template v-if="order.shipTo === 'me'">
                                <AChip
                                    :tone="order.courierAuth ? 'green' : 'red'"
                                    size="sm"
                                >
                                    {{
                                        t(
                                            order.courierAuth
                                                ? 'deliveries.card.poaSigned'
                                                : 'deliveries.card.poaMissing',
                                        )
                                    }}
                                </AChip>
                            </template>
                            <template v-else-if="order.shipTo === 'patient'">
                                <AChip
                                    :tone="
                                        order.poa?.status === 'signed'
                                            ? 'green'
                                            : 'red'
                                    "
                                    size="sm"
                                >
                                    {{
                                        t(
                                            order.poa?.status === 'signed'
                                                ? 'deliveries.card.poaSigned'
                                                : 'deliveries.card.poaMissing',
                                        )
                                    }}
                                </AChip>
                                <div
                                    v-if="order.poa?.status === 'signed'"
                                    class="t-sub"
                                >
                                    {{ loc(order.poa.fullName) }} ·
                                    {{ maskedId(order.poa.idNumber) }} ·
                                    {{ order.poa.signedAt?.stamp }}
                                </div>
                                <div
                                    v-else-if="order.poa?.requestedAt"
                                    class="t-sub"
                                >
                                    {{
                                        t('deliveries.card.poaRequestedAt', {
                                            stamp: order.poa.requestedAt.stamp,
                                        })
                                    }}
                                </div>
                            </template>
                            <span v-else>—</span>
                        </template>
                    </AKeyValue>

                    <AButton
                        v-if="
                            !editingAddress &&
                            ![
                                'awaiting_courier',
                                'shipped',
                                'collected',
                            ].includes(status)
                        "
                        sm
                        kind="ghost"
                        icon="edit"
                        class="soc-gap"
                        @click="openAddressEditor"
                    >
                        {{ t('deliveries.card.editAddress') }}
                    </AButton>

                    <div v-if="editingAddress" class="soc-addr-form soc-gap">
                        <AInput
                            v-model="addressForm.city"
                            :placeholder="t('deliveries.card.city')"
                        />
                        <AInput
                            v-model="addressForm.street"
                            :placeholder="t('deliveries.card.street')"
                        />
                        <AInput
                            v-model="addressForm.num"
                            :placeholder="t('deliveries.card.num')"
                        />
                        <AInput
                            v-model="addressForm.apt"
                            :placeholder="t('deliveries.card.apt')"
                        />
                        <AInput
                            v-model="addressForm.floor"
                            :placeholder="t('deliveries.card.floor')"
                        />
                        <AInput
                            v-model="addressForm.entry"
                            :placeholder="t('deliveries.card.entry')"
                        />
                        <div class="soc-row-actions">
                            <AButton
                                sm
                                kind="p"
                                icon="check"
                                @click="saveAddress"
                            >
                                {{ t('actions.save') }}
                            </AButton>
                            <AButton
                                sm
                                kind="ghost"
                                @click="editingAddress = false"
                            >
                                {{ t('actions.cancel') }}
                            </AButton>
                        </div>
                    </div>
                </ACard>

                <!-- 2. packing checklist -->
                <ACard
                    :title="
                        t('deliveries.card.packingTitle', {
                            k: checkedN,
                            n: totalN,
                        })
                    "
                    icon="package"
                    :pad="false"
                >
                    <table class="a-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    {{ t('deliveries.card.col.item') }}
                                </th>
                                <th scope="col">
                                    {{ t('deliveries.card.col.containers') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in packing" :key="row.item.id">
                                <td>
                                    <div class="t-strong">
                                        {{ loc(row.item.name) }}
                                    </div>
                                    <div class="t-sub">
                                        {{ row.checked }}/{{ row.count }}
                                    </div>
                                </td>
                                <td>
                                    <span
                                        v-for="b in row.barcodes"
                                        :key="b.barcode"
                                        class="soc-container"
                                        :class="{ 'is-checked': b.checked }"
                                    >
                                        <AChip
                                            :tone="b.checked ? 'green' : 'gray'"
                                            size="sm"
                                            :dot="false"
                                        >
                                            {{ b.containerNo }}
                                        </AChip>
                                        <button
                                            v-if="
                                                !b.checked &&
                                                row.item.kind === 'shelf'
                                            "
                                            type="button"
                                            class="a-btn a-btn--sm a-btn--ghost"
                                            @click="
                                                tickShelf(row, b.containerNo)
                                            "
                                        >
                                            {{ t('deliveries.card.tick') }}
                                        </button>
                                        <button
                                            v-else-if="!b.checked"
                                            type="button"
                                            class="a-btn a-btn--sm a-btn--ghost"
                                            @click="
                                                askManual(row, b.containerNo)
                                            "
                                        >
                                            {{
                                                t('deliveries.card.manualTick')
                                            }}
                                        </button>
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ACard>

                <!-- 3. shipment -->
                <ACard
                    v-if="order.shipTo !== 'pickup'"
                    :title="t('deliveries.card.shipmentTitle')"
                    icon="truck"
                >
                    <template v-if="!activeShipment && !handedShipment">
                        <div class="soc-row">
                            <label class="a-lbl">{{
                                t('deliveries.card.courier')
                            }}</label>
                            <AComboSelect
                                v-model="courierCode"
                                :options="
                                    store.activeCouriers.map((c) => ({
                                        value: c.code,
                                        label: t(`courier.${c.code}`),
                                    }))
                                "
                            />
                        </div>
                        <div class="soc-row">
                            <label class="a-lbl">{{
                                t('deliveries.card.packages')
                            }}</label>
                            <AInput
                                v-model="packagesInput"
                                type="number"
                                ltr
                                class="soc-pkg"
                            />
                        </div>
                        <AButton
                            kind="p"
                            icon="truck"
                            :disabled="!canLink || linking"
                            @click="doLink"
                        >
                            {{
                                linking
                                    ? t('deliveries.card.linking')
                                    : t('deliveries.card.link')
                            }}
                        </AButton>
                        <div
                            v-if="
                                (order.events || []).some(
                                    (e) => e.type === 'shipment_link_failed',
                                ) && status === 'packing'
                            "
                            class="a-note a-note--danger soc-gap"
                        >
                            {{
                                order.events
                                    .filter(
                                        (e) =>
                                            e.type === 'shipment_link_failed',
                                    )
                                    .slice(-1)[0]?.data?.message
                            }}
                            <div class="soc-row-actions">
                                <AButton sm icon="refresh" @click="doRetry">
                                    {{ t('deliveries.card.retry') }}
                                </AButton>
                                <AButton
                                    sm
                                    kind="ghost"
                                    icon="edit"
                                    @click="openManualTracking"
                                >
                                    {{ t('deliveries.card.manualTracking') }}
                                </AButton>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <AKeyValue
                            :rows="[
                                [t('deliveries.card.tracking'), null],
                                [
                                    t('deliveries.card.linkedAt'),
                                    (activeShipment || handedShipment)?.linkedAt
                                        ?.stamp,
                                ],
                                [
                                    t('deliveries.card.packages'),
                                    (activeShipment || handedShipment)
                                        ?.packagesCount,
                                ],
                            ]"
                        >
                            <template #value-0>
                                <ANum>{{ order.tracking }}</ANum>
                                <AChip
                                    v-if="
                                        (activeShipment || handedShipment)
                                            ?.isManual
                                    "
                                    tone="gray"
                                    size="sm"
                                >
                                    {{ t('deliveries.card.manual') }}
                                </AChip>
                            </template>
                        </AKeyValue>
                        <AButton
                            sm
                            icon="printer"
                            class="soc-gap"
                            @click="printShippingLabels"
                        >
                            {{ t('deliveries.card.reprintLabel') }}
                        </AButton>
                    </template>
                </ACard>

                <!-- 4. content, read only -->
                <ACard
                    :title="t('deliveries.card.contentTitle')"
                    icon="list"
                    :pad="false"
                >
                    <table class="a-table">
                        <tbody>
                            <tr
                                v-for="item in order.items.filter(
                                    (i) => !i.cancelled,
                                )"
                                :key="item.id"
                            >
                                <td class="t-strong">{{ loc(item.name) }}</td>
                                <td class="t-sub">
                                    {{
                                        item.kind === 'shelf'
                                            ? `${item.qty}`
                                            : loc(item.name)
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ACard>

                <!-- 5. history -->
                <ACard
                    :title="t('deliveries.card.historyTitle')"
                    icon="clock"
                    class="soc-wide"
                >
                    <ul class="a-timeline-list">
                        <li
                            v-for="(row, i) in history"
                            :key="i"
                            class="soc-hrow"
                        >
                            <span class="t-sub">{{ row.at?.stamp }}</span>
                            <span>{{ eventSentence(row) }}</span>
                            <AChip
                                v-if="row.visibleToCustomer"
                                tone="blue"
                                size="sm"
                                :dot="false"
                            >
                                {{ t('deliveries.card.visibleToCustomer') }}
                            </AChip>
                        </li>
                    </ul>
                </ACard>
            </div>

            <div class="soc-footer">
                <AButton
                    v-if="order.shipTo === 'pickup' && status === 'packing'"
                    kind="p"
                    icon="check"
                    :disabled="!store.allPacked(order)"
                    @click="doMarkReady"
                >
                    {{ t('deliveries.card.markReady') }}
                </AButton>
                <AButton
                    v-if="
                        order.shipTo === 'pickup' &&
                        status === 'ready_for_pickup'
                    "
                    kind="p"
                    icon="check"
                    @click="collectAsk = true"
                >
                    {{ t('deliveries.card.markCollected') }}
                </AButton>
                <AButton
                    v-if="canStepBack"
                    kind="ghost"
                    icon="chevron_left"
                    @click="stepBackAsk = true"
                >
                    {{ t('deliveries.card.stepBack') }}
                </AButton>
                <AButton
                    v-if="canCancel"
                    kind="danger"
                    icon="x"
                    @click="cancelAsk = true"
                >
                    {{ t('deliveries.card.cancelOrder') }}
                </AButton>
                <AButton
                    kind="ghost"
                    icon="external"
                    class="soc-open-link"
                    @click="openInOrders"
                >
                    {{ t('deliveries.card.openInOrders') }}
                </AButton>
            </div>
        </template>
    </ADrawer>

    <ConfirmDialog
        :open="Boolean(manualTarget)"
        :pin="pin"
        reason
        :title="t('deliveries.card.manualTick')"
        :body="
            manualTarget
                ? t('deliveries.card.manualTickBody', {
                      name: manualTarget.name,
                  })
                : ''
        "
        @close="manualTarget = null"
        @confirm="confirmManual"
    />

    <ConfirmDialog
        :open="manualTrackingOpen"
        :pin="pin"
        reason
        :title="t('deliveries.card.manualTracking')"
        @close="manualTrackingOpen = false"
        @confirm="confirmManualTracking"
    >
        <div class="soc-row">
            <AComboSelect
                v-model="manualForm.courierCode"
                :options="
                    store.activeCouriers.map((c) => ({
                        value: c.code,
                        label: t(`courier.${c.code}`),
                    }))
                "
            />
            <AInput
                v-model="manualForm.trackingNumber"
                ltr
                :placeholder="t('deliveries.card.trackingNumber')"
            />
        </div>
    </ConfirmDialog>

    <ConfirmDialog
        :open="collectAsk"
        :title="t('deliveries.card.markCollected')"
        @close="collectAsk = false"
        @confirm="confirmCollect"
    >
        <AInput
            v-model="collectedByName"
            :placeholder="t('deliveries.card.collectedByName')"
        />
    </ConfirmDialog>

    <ConfirmDialog
        :open="stepBackAsk"
        :pin="pin"
        reason
        danger
        :title="t('deliveries.card.stepBack')"
        :effects="
            status === 'awaiting_courier'
                ? [t('deliveries.card.stepBackDestroyLabel')]
                : []
        "
        :confirm-check="
            status === 'awaiting_courier'
                ? t('deliveries.card.phoneConfirm')
                : ''
        "
        @close="stepBackAsk = false"
        @confirm="confirmStepBack"
    />

    <ConfirmDialog
        :open="cancelAsk"
        :pin="pin"
        reason
        danger
        :title="t('deliveries.card.cancelOrder')"
        :confirm-check="
            status === 'awaiting_courier'
                ? t('deliveries.card.phoneConfirm')
                : ''
        "
        @close="cancelAsk = false"
        @confirm="confirmCancelOrder"
    />
</template>

<style scoped>
.soc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
}

.soc-wide {
    grid-column: 1 / -1;
}

.soc-gap {
    margin-top: 10px;
}

.soc-inline {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
}

.soc-container {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    margin-inline-end: 8px;
    margin-bottom: 4px;
}

.soc-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.soc-row-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.soc-pkg {
    width: 80px;
}

.soc-footer {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    padding: 14px 0;
    border-top: 1px solid var(--a-line-2);
    margin-top: 14px;
}

.soc-open-link {
    margin-inline-start: auto;
}

.soc-addr-form {
    display: grid;
    gap: 10px;
    max-width: 420px;
}

.a-timeline-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
}

.soc-hrow {
    display: flex;
    gap: 10px;
    align-items: baseline;
    font-size: 13.5px;
}
</style>
