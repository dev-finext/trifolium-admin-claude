<script setup>
// "ממתין לשליח": the pickup list for one company and the handover itself
// (SHIPPING_STATION_SPEC.md §9). Printing and handing over are two separate
// steps, but handing over never requires printing first — it creates the list
// record itself if nothing was printed yet.
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ORG } from '@/config';
import { esc, printHtml } from '@/lib/print';
import { useDeliveriesStore } from '@/stores/deliveries';

const props = defineProps({
    open: { type: Boolean, default: false },
    courierCode: { type: String, default: '' },
    orders: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'done']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const { courierName } = useCourierName();
const store = useDeliveriesStore();

/** Which orders are still with the pharmacy — ticked means "the driver took it". */
const ticked = reactive({});
/** Set once a list has actually been printed or created, so a second print or a
 * hand-over without printing both reuse the same record. */
let listId = null;

watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        listId = null;
        props.orders.forEach((order) => {
            ticked[order.id] = true;
        });
    },
);

const totalPackages = () =>
    props.orders.reduce((sum, order) => sum + (order.packagesCount || 1), 0);

async function ensureList() {
    if (listId) {
        return listId;
    }

    const row = await store.printPickupList(props.courierCode);

    listId = row.id;

    return listId;
}

async function print() {
    await ensureList();

    const rows = props.orders
        .map(
            (order) => `<tr>
                <td>${esc(order.tracking || '')}</td>
                <td>${esc(order.id)}</td>
                <td>${esc(loc(order.patient.name))}</td>
                <td>${esc(loc(order.address?.city))}</td>
                <td>${esc(order.packagesCount || 1)}</td>
            </tr>`,
        )
        .join('');

    const body = `
        <h2>${esc(courierName(props.courierCode))} — ${esc(new Date().toLocaleDateString('he-IL'))}</h2>
        <table class="a-table">
            <thead><tr>
                <th>${esc(t('deliveries.pickupList.col.tracking'))}</th>
                <th>${esc(t('deliveries.pickupList.col.order'))}</th>
                <th>${esc(t('deliveries.pickupList.col.recipient'))}</th>
                <th>${esc(t('deliveries.pickupList.col.city'))}</th>
                <th>${esc(t('deliveries.pickupList.col.packages'))}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p>${esc(t('deliveries.pickupList.totals', { orders: props.orders.length, packages: totalPackages() }))}</p>
        <p>${esc(ORG.phone)}</p>
        <div style="margin-top:40px;display:flex;gap:40px">
            <div>${esc(t('deliveries.pickupList.driverName'))}: ______________</div>
            <div>${esc(t('deliveries.pickupList.signature'))}: ______________</div>
            <div>${esc(t('deliveries.pickupList.time'))}: ______________</div>
        </div>
    `;

    printHtml(
        `${t('deliveries.pickupList.title')} — ${courierName(props.courierCode)}`,
        body,
        'rtl',
    );
}

async function handOver() {
    const id = await ensureList();
    const ids = Object.entries(ticked)
        .filter(([, on]) => on)
        .map(([orderId]) => orderId);

    const moved = await store.handToCourier(id, ids);

    push({
        title: t('deliveries.pickupList.handedTitle'),
        body: t('deliveries.pickupList.handedBody', { n: moved.length }),
    });
    emit('done');
    emit('close');
}
</script>

<template>
    <AModal
        :open="open"
        :title="
            t('deliveries.pickupList.titleFor', {
                courier: courierName(courierCode),
            })
        "
        :width="640"
        @close="emit('close')"
    >
        <table class="a-table">
            <thead>
                <tr>
                    <th scope="col" style="width: 36px"></th>
                    <th scope="col">
                        {{ t('deliveries.pickupList.col.order') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.pickupList.col.recipient') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.pickupList.col.city') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('deliveries.pickupList.col.packages') }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="order in orders" :key="order.id">
                    <td>
                        <input
                            type="checkbox"
                            class="a-check"
                            v-model="ticked[order.id]"
                        />
                    </td>
                    <td class="num">{{ order.id }}</td>
                    <td>{{ loc(order.patient.name) }}</td>
                    <td>{{ loc(order.address?.city) }}</td>
                    <td class="nowrap">
                        <ANum>{{ order.packagesCount || 1 }}</ANum>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="a-hint" style="margin-top: 10px">
            {{ t('deliveries.pickupList.untickHint') }}
        </div>

        <template #footer>
            <AButton kind="p" icon="check" @click="handOver">
                {{ t('deliveries.pickupList.handOver') }}
            </AButton>
            <AButton icon="printer" @click="print">
                {{ t('deliveries.pickupList.print') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>
