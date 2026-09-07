<script setup>
// The courier's pickup list: every parcel handed to one courier and waiting to
// go, printed for the driver to sign against. Today this is SAP's "orders for
// Tapuz" query; here it is one button.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ACTIVE_COURIERS, ORG } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { esc, printHtml } from '@/lib/print';
import { useDeliveriesStore } from '@/stores/deliveries';

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

const courier = ref(
    ACTIVE_COURIERS.find((row) => deliveries.courierPickupList(row.id).length)
        ?.id ||
        ACTIVE_COURIERS[0]?.id ||
        '',
);

const options = computed(() =>
    ACTIVE_COURIERS.map((row) => ({
        value: row.id,
        label: `${row.code} — ${courierName(row.id)} (${deliveries.courierPickupList(row.id).length})`,
    })),
);

const rows = computed(() =>
    courier.value ? deliveries.courierPickupList(courier.value) : [],
);

const cols = computed(() => [
    { k: 'id', label: t('deliveries.pickupList.col.order'), nowrap: true },
    { k: 'recipient', label: t('deliveries.pickupList.col.recipient') },
    { k: 'address', label: t('deliveries.pickupList.col.address') },
    { k: 'phone', label: t('deliveries.pickupList.col.phone'), nowrap: true },
    {
        k: 'tracking',
        label: t('deliveries.pickupList.col.tracking'),
        nowrap: true,
    },
    { k: 'items', label: t('deliveries.pickupList.col.items'), nowrap: true },
]);

function address(order) {
    if (!order.addressProvided) {
        return t('deliveries.row.addressPending');
    }

    return t('deliveries.row.street', {
        street: loc(order.address.street),
        num: order.address.num,
        city: loc(order.address.city),
    });
}

function print() {
    const title = t('deliveries.pickupList.header', {
        courier: courierName(courier.value),
        date: fmtISO(isoDaysAgo(0)),
    });
    const head = [
        t('deliveries.pickupList.col.order'),
        t('deliveries.pickupList.col.recipient'),
        t('deliveries.pickupList.col.address'),
        t('deliveries.pickupList.col.phone'),
        t('deliveries.pickupList.col.tracking'),
        t('deliveries.pickupList.col.items'),
    ];
    const body = rows.value
        .map(
            (order) => `<tr>
                <td class="code">${esc(order.id)}</td>
                <td>${esc(loc(order.patient.name))}</td>
                <td>${esc(address(order))}</td>
                <td class="num">${esc(order.patient.phone)}</td>
                <td class="code">${esc(order.tracking || '—')}</td>
                <td class="num">${order.items.length}</td>
            </tr>`,
        )
        .join('');
    const html = `
        <h1>${esc(title)}</h1>
        <div class="meta">${esc(loc(ORG.name))} · ${esc(loc(ORG.address))} · ${esc(ORG.phone)}</div>
        <table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
        <div class="meta">${esc(t('deliveries.pickupList.total', { n: rows.value.length }))}</div>
        <div class="grid">
            <div><div class="sig"></div><div class="small">${esc(t('deliveries.pickupList.signPharmacy'))}</div></div>
            <div><div class="sig"></div><div class="small">${esc(t('deliveries.pickupList.signCourier'))}</div></div>
        </div>`;

    if (printHtml(title, html, 'rtl')) {
        push({ title: t('deliveries.pickupList.printed'), body: title });
    } else {
        push({ title: t('deliveries.pickupList.blocked'), bad: true });
    }
}
</script>

<template>
    <AModal
        open
        :title="t('deliveries.pickupList.title')"
        :width="980"
        @close="emit('close')"
    >
        <div class="a-grid">
            <div class="top">
                <V2Badge id="pickup-points" size="sm" />
                <span class="t-sub">{{ t('deliveries.pickupList.note') }}</span>
            </div>
            <div class="pick">
                <label class="a-lbl">{{
                    t('deliveries.pickupList.courier')
                }}</label>
                <ASelect v-model="courier" :options="options" class="sel" />
            </div>

            <ADataTable :cols="cols" :rows="rows" row-key="id">
                <template #empty>
                    <AEmpty
                        icon="truck"
                        :title="t('deliveries.pickupList.empty')"
                    />
                </template>
                <template #cell-id="{ row }"
                    ><span class="t-strong num">{{ row.id }}</span></template
                >
                <template #cell-recipient="{ row }">{{
                    loc(row.patient.name)
                }}</template>
                <template #cell-address="{ row }">{{ address(row) }}</template>
                <template #cell-phone="{ row }"
                    ><ANum>{{ row.patient.phone }}</ANum></template
                >
                <template #cell-tracking="{ row }">
                    <ANum v-if="row.tracking">{{ row.tracking }}</ANum>
                    <span v-else class="t-sub">—</span>
                </template>
                <template #cell-items="{ row }"
                    ><ANum>{{ row.items.length }}</ANum></template
                >
            </ADataTable>
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="printer"
                :disabled="!rows.length"
                @click="print"
            >
                {{ t('deliveries.pickupList.print') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.close') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.top {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pick {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sel {
    min-width: 320px;
}
</style>
