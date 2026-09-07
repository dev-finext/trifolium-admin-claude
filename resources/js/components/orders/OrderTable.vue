<script setup>
// The order list itself.
//
// Sorting is the shared table's; this component only says what each column sorts
// by. Status sorts along the order flow rather than alphabetically, because
// "which orders are furthest behind" is the question an agent is actually asking.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ExceptionChip from '@/components/ui/ExceptionChip.vue';
import PayerChip from '@/components/ui/PayerChip.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ORDER_STATUS_IDS } from '@/config';
import { fmtISO } from '@/lib/dates';
import { shelfItems, statusOf, trackedItems } from '@/stores/orders';

const props = defineProps({
    rows: { type: Array, default: () => [] },
    /** Ids of the orders currently ticked. */
    selection: { type: Array, default: () => [] },
    /** `{ key, dir }`, held in the URL by the screen. */
    sort: { type: Object, default: null },
    /** The order the detail route holds open, so its row reads as selected. */
    openId: { type: String, default: null },
});

const emit = defineEmits([
    'open',
    'toggle',
    'toggle-all',
    'remind',
    'assign',
    'update:sort',
    'clear',
]);

const { t } = useI18n();
const { loc } = useLocalized();

const cols = computed(() => [
    { k: 'sel', label: t('orders.col.select'), w: '46px' },
    { k: 'id', label: t('orders.col.id'), nowrap: true, sortable: true },
    {
        k: 'patient',
        label: t('orders.col.customer'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.patient.name,
    },
    {
        k: 'pract',
        label: t('orders.col.practitioner'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.practitioner.name,
    },
    { k: 'type', label: t('orders.col.type'), nowrap: true },
    { k: 'items', label: t('orders.col.items') },
    { k: 'payer', label: t('orders.col.payer'), nowrap: true },
    {
        k: 'total',
        label: t('orders.col.total'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.pricing.total,
    },
    {
        k: 'status',
        label: t('orders.col.status'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => ORDER_STATUS_IDS.indexOf(statusOf(order)),
    },
    { k: 'del', label: t('orders.col.fulfilment'), nowrap: true },
    {
        k: 'date',
        label: t('orders.col.date'),
        nowrap: true,
        sortable: true,
        sortValue: (order) => order.iso,
    },
    { k: 'act', label: t('orders.col.actions'), nowrap: true },
]);

const isTicked = (order) => props.selection.includes(order.id);

/** Every row the filter left is ticked — the header checkbox's state. */
const allTicked = computed(
    () => props.rows.length > 0 && props.rows.every((order) => isTicked(order)),
);

/** "First formula +2", then how the items break down by kind. */
function itemSummary(order) {
    const formulas = trackedItems(order).length;
    const shelf = shelfItems(order).length;
    const parts = [];

    if (formulas > 0) {
        parts.push(t('orders.items.formulaCount', formulas));
    }

    if (shelf > 0) {
        parts.push(t('orders.items.shelfCount', shelf));
    }

    return parts.join(' · ');
}
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="id"
        :sort="sort"
        :selected="openId"
        @update:sort="emit('update:sort', $event)"
        @row="emit('open', $event)"
    >
        <template #empty>
            <AEmpty
                icon="clipboard_list"
                :title="t('orders.empty.title')"
                :sub="t('orders.empty.sub')"
            >
                <template #action>
                    <AButton @click="emit('clear')">
                        {{ t('ui.clearFilter') }}
                    </AButton>
                </template>
            </AEmpty>
        </template>

        <!-- Select-all sits in its own header cell, where a reader looks for it;
             `orders.col.select` stays the column's accessible name. -->
        <template #head-sel>
            <input
                type="checkbox"
                class="a-check"
                :checked="allTicked"
                :aria-label="t('orders.select.all')"
                @change="emit('toggle-all')"
            />
        </template>

        <!-- The actions column carries no visible heading — each cell says what
             its own button does — but is still named for a screen reader. -->
        <template #head-act>
            <span class="a-sr">{{ t('orders.col.actions') }}</span>
        </template>

        <template #cell-sel="{ row }">
            <input
                type="checkbox"
                class="a-check"
                :checked="isTicked(row)"
                :aria-label="t('orders.select.row', { id: row.id })"
                @click.stop
                @change="emit('toggle', row.id)"
            />
        </template>

        <template #cell-id="{ row }">
            <div class="t-strong a-orderid">
                <ANum>{{ row.id }}</ANum>
            </div>
            <div v-if="row.urgent" class="a-chipwrap a-orderflags">
                <AChip tone="red" size="sm" :dot="false">
                    {{ t('orders.detail.urgent') }}
                </AChip>
                <V2Badge id="order-flags" size="sm" />
            </div>
            <div v-if="row.flags?.length" class="a-chipwrap a-orderflags">
                <ExceptionChip
                    v-for="flag in row.flags"
                    :key="flag"
                    :id="flag"
                    size="sm"
                />
            </div>
        </template>

        <template #cell-patient="{ row }">
            <div class="t-strong">{{ loc(row.patient.name) }}</div>
            <div class="t-sub">
                <ANum>{{ row.patient.phone }}</ANum>
            </div>
        </template>

        <template #cell-pract="{ row }">
            <div>{{ loc(row.practitioner.name) }}</div>
            <div class="t-sub">
                <ANum>{{ row.practitioner.code }}</ANum> ·
                {{ t(`therapy.${row.practitioner.therapy}`) }}
            </div>
        </template>

        <template #cell-type="{ row }">
            <AChip
                :tone="row.type === 'formula' ? 'teal' : 'gray'"
                size="sm"
                :dot="false"
            >
                {{ t(`orders.type.${row.type}`) }}
            </AChip>
        </template>

        <template #cell-items="{ row }">
            <div>
                {{ loc(row.items[0]?.name) }}
                <template v-if="row.items.length > 1">
                    {{ t('orders.items.more', { n: row.items.length - 1 }) }}
                </template>
            </div>
            <div class="t-sub">{{ itemSummary(row) }}</div>
        </template>

        <template #cell-payer="{ row }">
            <PayerChip :payer="row.payer" size="sm" />
        </template>

        <template #cell-total="{ row }">
            <AMoney :value="row.pricing.total" />
        </template>

        <template #cell-status="{ row }">
            <StatusChip :status="statusOf(row)" />
        </template>

        <template #cell-del="{ row }">
            <span class="a-orderdel">
                <AIcon
                    :name="row.deliveryType === 'courier' ? 'truck' : 'map_pin'"
                    :size="17"
                />
                {{ t(`fulfilment.${row.deliveryType}`) }}
            </span>
        </template>

        <template #cell-date="{ row }">
            <span class="a-orderdate"
                ><ANum>{{ fmtISO(row.iso) }}</ANum></span
            >
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton
                    v-if="statusOf(row) === 'pending_payment'"
                    sm
                    icon="whatsapp"
                    @click="emit('remind', row)"
                >
                    {{ t('orders.row.remind') }}
                </AButton>
                <AButton
                    v-if="
                        statusOf(row) === 'ready_for_delivery' &&
                        row.deliveryType === 'courier'
                    "
                    sm
                    icon="truck"
                    @click="emit('assign', row)"
                >
                    {{ t('orders.row.assign') }}
                </AButton>
                <AButton sm icon="external" @click="emit('open', row)">
                    {{ t('orders.row.open') }}
                </AButton>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.a-orderid {
    font-size: 16px;
}

.a-orderflags {
    margin-top: 5px;
}

.a-orderdel {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--a-ink-2);
}

.a-orderdel .a-ico {
    color: var(--a-ink-3);
}

.a-orderdate {
    color: var(--a-ink-3);
}
</style>
