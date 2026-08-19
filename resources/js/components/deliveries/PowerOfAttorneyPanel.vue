<script setup>
// Powers of attorney for courier delivery (ייפוי כוח).
//
// A courier hands the parcel to whoever opens the door, or leaves it at the
// address, so a signature from the recipient is what makes the handover
// attributable. Until it is on file the order cannot be marked shipped.
//
// Self-pickup orders never need one — the recipient identifies themselves at the
// counter — which is why this panel only ever looks at courier orders.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { POA_STATES, poaState, useDeliveriesStore } from '@/stores/deliveries';

/** Tone and icon per state — the same vocabulary the chips and the tiles use. */
const STATE_LOOK = {
    missing: { tone: 'red', icon: 'alert' },
    requested: { tone: 'amber', icon: 'send' },
    signed: { tone: 'green', icon: 'signature' },
};

const props = defineProps({
    /** Courier orders on the desk — the only ones a power of attorney applies to. */
    orders: { type: Array, default: () => [] },
    /** Which of POA_STATES the list is showing; held in the URL by the screen. */
    state: { type: String, default: 'missing' },
});

const emit = defineEmits(['update:state', 'open']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const deliveries = useDeliveriesStore();

/** The order a single request is being confirmed for. */
const asking = ref(null);
const askingAll = ref(false);

const byState = computed(() => {
    const groups = Object.fromEntries(POA_STATES.map((id) => [id, []]));

    props.orders.forEach((order) => groups[poaState(order)].push(order));

    return groups;
});

const rows = computed(() => byState.value[props.state] || []);

const pending = computed(() => [
    ...byState.value.missing,
    ...byState.value.requested,
]);

const cols = computed(() => [
    { k: 'id', label: t('deliveries.col.order'), nowrap: true },
    { k: 'to', label: t('deliveries.col.recipient'), nowrap: true },
    { k: 'city', label: t('deliveries.poa.col.city'), nowrap: true },
    { k: 'st', label: t('deliveries.col.status'), nowrap: true },
    { k: 'poa', label: t('deliveries.poa.col.state'), nowrap: true },
    { k: 'act', label: t('deliveries.col.actions'), nowrap: true },
]);

const effects = computed(() => [
    t('deliveries.poa.effect.template'),
    t('deliveries.poa.effect.link'),
    t('deliveries.poa.effect.blocked'),
]);

const askingBody = computed(() =>
    asking.value
        ? t('deliveries.poa.confirm.body', {
              name: loc(asking.value.patient.name),
              phone: asking.value.patient.phone,
              id: asking.value.id,
          })
        : '',
);

async function requestOne() {
    const order = asking.value;

    asking.value = null;

    if (!order) {
        return;
    }

    await deliveries.requestPoa(order.id);
    push({
        title: t('deliveries.poa.done.title'),
        body: t('deliveries.poa.done.body', {
            name: loc(order.patient.name),
        }),
    });
}

async function requestEveryone() {
    const orders = pending.value;

    askingAll.value = false;

    if (!orders.length) {
        return;
    }

    await deliveries.requestPoaAll(orders.map((order) => order.id));
    push({
        title: t('deliveries.poa.done.title'),
        body: t('deliveries.poa.done.bodyAll', { n: orders.length }),
    });
}
</script>

<template>
    <div class="a-grid panel">
        <div class="a-note a-note--info">{{ t('deliveries.poa.note') }}</div>

        <div class="a-kpis">
            <FilterKpi
                v-for="id in POA_STATES"
                :key="id"
                :icon="STATE_LOOK[id].icon"
                :label="t(`deliveries.poa.kpi.${id}`)"
                :value="byState[id].length"
                :active="state === id"
                @click="emit('update:state', id)"
            />
        </div>

        <ACard :title="t('deliveries.poa.title')" icon="signature" :pad="false">
            <template #right>
                <AButton
                    sm
                    kind="p"
                    icon="whatsapp"
                    :disabled="!pending.length"
                    @click="askingAll = true"
                >
                    {{ t('deliveries.poa.requestAll', { n: pending.length }) }}
                </AButton>
            </template>

            <ADataTable
                :cols="cols"
                :rows="rows"
                row-key="id"
                @row="emit('open', $event)"
            >
                <template #empty>
                    <AEmpty
                        icon="signature"
                        :title="t(`deliveries.poa.empty.${state}.title`)"
                        :sub="t(`deliveries.poa.empty.${state}.sub`)"
                    />
                </template>

                <template #cell-id="{ row }">
                    <span class="t-strong num">{{ row.id }}</span>
                </template>

                <template #cell-to="{ row }">
                    <div class="t-strong">{{ loc(row.patient.name) }}</div>
                    <div class="t-sub">
                        <ANum>{{ row.patient.phone }}</ANum>
                    </div>
                </template>

                <template #cell-city="{ row }">
                    {{ loc(row.address.city) }}
                </template>

                <template #cell-st="{ row }">
                    <StatusChip :status="row.status" />
                </template>

                <template #cell-poa="{ row }">
                    <AChip
                        :tone="STATE_LOOK[poaState(row)].tone"
                        size="sm"
                        :dot="false"
                    >
                        {{ t(`deliveries.poa.state.${poaState(row)}`) }}
                    </AChip>
                    <div v-if="row.poaRequestedAt" class="t-sub">
                        {{
                            t('deliveries.poa.requestedAt', {
                                stamp: row.poaRequestedAt,
                            })
                        }}
                    </div>
                </template>

                <template #cell-act="{ row }">
                    <div class="a-rowbtns" @click.stop>
                        <AButton
                            v-if="!row.poaSigned"
                            sm
                            :kind="row.poaRequestedAt ? '' : 'p'"
                            icon="whatsapp"
                            @click="asking = row"
                        >
                            {{
                                row.poaRequestedAt
                                    ? t('deliveries.poa.requestAgain')
                                    : t('deliveries.poa.request')
                            }}
                        </AButton>
                        <AButton sm icon="external" @click="emit('open', row)">
                            {{ t('deliveries.action.open') }}
                        </AButton>
                    </div>
                </template>
            </ADataTable>
        </ACard>
    </div>

    <ConfirmDialog
        :open="Boolean(asking)"
        :title="t('deliveries.poa.confirm.title')"
        :body="askingBody"
        :effects="effects"
        :confirm-label="t('deliveries.poa.confirm.label')"
        @close="asking = null"
        @confirm="requestOne"
    />

    <ConfirmDialog
        :open="askingAll"
        :title="t('deliveries.poa.confirmAll.title')"
        :body="t('deliveries.poa.confirmAll.body', { n: pending.length })"
        :effects="effects"
        :confirm-label="t('deliveries.poa.confirmAll.label')"
        @close="askingAll = false"
        @confirm="requestEveryone"
    />
</template>

<style scoped>
.panel {
    margin-top: 18px;
}
</style>
