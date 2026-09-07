<script setup>
// The lab queue: every order on the bench, urgent ones first, with its formulas,
// which of the four roles have been marked, how it leaves the pharmacy, and how
// long it has been waiting. The prep sheet prints from the row.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { usePrepSheet } from '@/composables/usePrepSheet';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { LAB_ROLE_IDS } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';
import { statusOf, trackedItems } from '@/stores/orders';

const props = defineProps({
    /** The orders on the bench, already sorted. */
    queue: { type: Array, default: () => [] },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const { courierName } = useCourierName();
const { printPrepSheet } = usePrepSheet();
const deliveries = useDeliveriesStore();

const state = useUrlState({ lq: '', lstage: '', lurgent: false });

const rows = computed(() => {
    const term = state.lq.trim().toLowerCase();

    return props.queue.filter(
        (order) =>
            (!state.lstage || statusOf(order) === state.lstage) &&
            (!state.lurgent || order.urgent) &&
            (!term ||
                searchHaystack(
                    order.id,
                    order.practitioner.name,
                    order.patient.name,
                    trackedItems(order).map((item) => item.name),
                ).includes(term)),
    );
});

const tally = (predicate) => props.queue.filter(predicate).length;

const cols = computed(() => [
    { k: 'id', label: t('lab.queue.col.order'), nowrap: true },
    { k: 'practitioner', label: t('lab.queue.col.practitioner') },
    { k: 'formulas', label: t('lab.queue.col.formulas') },
    { k: 'roles', label: t('lab.queue.col.roles'), nowrap: true },
    { k: 'fulfilment', label: t('lab.queue.col.fulfilment') },
    { k: 'placed', label: t('lab.queue.col.placed'), nowrap: true },
    { k: 'act', label: t('lab.queue.col.actions'), nowrap: true },
]);

const liveFormulas = (order) =>
    trackedItems(order).filter((item) => item.stage !== 'cancelled');

function fulfilment(order) {
    if (order.deliveryType === 'pickup') {
        const point = order.pickupPoint
            ? deliveries.pointById(order.pickupPoint)
            : null;

        return point
            ? t('lab.sheet.pickupAt', { name: loc(point.name) })
            : t('lab.sheet.pharmacy');
    }

    return order.courier
        ? t('lab.sheet.courier', { name: courierName(order.courier) })
        : t('fulfilment.courier');
}

function toggleStage(id) {
    state.lstage = state.lstage === id ? '' : id;
}

async function print(order) {
    const ok = await printPrepSheet(order);

    push(
        ok
            ? { title: t('lab.sheet.printed'), body: order.id }
            : { title: t('lab.sheet.blocked'), bad: true },
    );
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">{{ t('lab.queue.note') }}</div>

        <div class="a-kpis">
            <FilterKpi
                icon="beaker"
                :label="t('lab.kpi.inLab')"
                :value="tally((order) => statusOf(order) === 'in_production')"
                :sub="t('lab.kpi.inLabSub')"
                :active="state.lstage === 'in_production'"
                @click="toggleStage('in_production')"
            />
            <FilterKpi
                icon="package"
                :label="t('lab.kpi.ready')"
                :value="
                    tally((order) => statusOf(order) === 'ready_for_delivery')
                "
                :sub="t('lab.kpi.readySub')"
                :active="state.lstage === 'ready_for_delivery'"
                @click="toggleStage('ready_for_delivery')"
            />
            <FilterKpi
                icon="alert"
                :label="t('lab.kpi.urgent')"
                :value="tally((order) => order.urgent)"
                :sub="t('lab.kpi.urgentSub')"
                :active="state.lurgent"
                @click="state.lurgent = !state.lurgent"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('lab.queue.count')"
            :dirty="Boolean(state.lq || state.lstage || state.lurgent)"
            @clear="
                ((state.lq = ''), (state.lstage = ''), (state.lurgent = false))
            "
        >
            <AInput
                v-model="state.lq"
                class="search"
                :placeholder="t('lab.queue.search')"
            />
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            @row="emit('open', $event)"
        >
            <template #empty>
                <AEmpty
                    icon="beaker"
                    :title="t('lab.queue.empty')"
                    :sub="t('lab.queue.emptyHint')"
                />
            </template>

            <template #cell-id="{ row }">
                <div class="t-strong num">{{ row.id }}</div>
                <div class="marks">
                    <StatusChip :status="statusOf(row)" size="sm" />
                    <AChip v-if="row.urgent" tone="red" size="sm" :dot="false">
                        {{ t('orders.detail.urgent') }}
                    </AChip>
                </div>
            </template>
            <template #cell-practitioner="{ row }">
                <div>{{ loc(row.practitioner.name) }}</div>
                <div class="t-sub">{{ loc(row.patient.name) }}</div>
                <AChip
                    v-if="row.practitioner.specialTerms"
                    tone="amber"
                    size="sm"
                    :dot="false"
                    :title="loc(row.practitioner.specialTerms)"
                >
                    {{ t('orders.detail.specialTerms') }}
                </AChip>
            </template>
            <template #cell-formulas="{ row }">
                <div class="t-sub">
                    {{
                        t('lab.queue.formulasN', {
                            n: liveFormulas(row).length,
                        })
                    }}
                </div>
                <div class="names">
                    {{
                        liveFormulas(row)
                            .map((item) => loc(item.name))
                            .join(' · ')
                    }}
                </div>
            </template>
            <template #cell-roles="{ row }">
                <span class="roles">
                    <span
                        v-for="role in LAB_ROLE_IDS"
                        :key="role"
                        class="role"
                        :class="{ 'is-on': row.lab?.[role] }"
                        :title="`${t(`orders.labRole.${role}`)}${row.lab?.[role] ? ` · ${loc(row.lab[role].by)}` : ''}`"
                    >
                        {{ t(`orders.labRole.${role}`).slice(0, 1) }}
                    </span>
                </span>
            </template>
            <template #cell-fulfilment="{ row }">{{
                fulfilment(row)
            }}</template>
            <template #cell-placed="{ row }">
                <ANum>{{ row.placed?.stamp || row.stamp }}</ANum>
                <div class="t-sub">
                    {{
                        row.daysAgo
                            ? t('lab.queue.daysIn', { n: row.daysAgo })
                            : t('lab.queue.today')
                    }}
                </div>
            </template>
            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton sm kind="p" icon="printer" @click="print(row)">
                        {{ t('lab.queue.printSheet') }}
                    </AButton>
                    <AButton sm icon="external" @click="emit('open', row)">
                        {{ t('lab.queue.open') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.search {
    width: 320px;
    max-width: 100%;
}

.marks {
    display: flex;
    gap: 6px;
    margin-top: 5px;
    flex-wrap: wrap;
}

.names {
    font-size: 13.5px;
    max-width: 360px;
}

.roles {
    display: inline-flex;
    gap: 4px;
}

.role {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--a-line-2);
    color: var(--a-ink-4);
    font-size: 12px;
    font-weight: 700;
}

.role.is-on {
    border-color: var(--a-green);
    background: var(--a-green-bg);
    color: var(--a-green);
}
</style>
