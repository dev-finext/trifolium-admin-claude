<script setup>
// The purchase-order list: what is on order from whom, how much of it has
// arrived, and what is still expected.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { CURRENCY_SYMBOL, PO_STATE, PO_STATE_IDS } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { usePurchasingStore } from '@/stores/purchasing';

defineProps({
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const store = usePurchasingStore();

const state = useUrlState({ pq: '', pstate: '', psup: '' });

const all = computed(() => store.rows);

const tally = (predicate) => all.value.filter(predicate).length;

const rows = computed(() => {
    const term = state.pq.trim().toLowerCase();

    return all.value.filter(
        (row) =>
            (!state.pstate || row.state === state.pstate) &&
            (!state.psup || row.supplierCode === state.psup) &&
            (!term ||
                searchHaystack(
                    row.id,
                    row.supplier,
                    row.lines.map((line) => line.name),
                ).includes(term)),
    );
});

const dirty = computed(() => Boolean(state.pq || state.pstate || state.psup));

const stateOptions = computed(() => [
    { value: '', label: t('purchasing.filter.state') },
    ...PO_STATE_IDS.map((id) => ({
        value: id,
        label: `${t(`purchasing.state.${id}`)} (${tally((row) => row.state === id)})`,
    })),
]);

const supplierOptions = computed(() => {
    const seen = new Map();

    all.value.forEach((row) => seen.set(row.supplierCode, row.supplier));

    return [
        { value: '', label: t('purchasing.filter.supplier') },
        ...[...seen.entries()].map(([code, name]) => ({
            value: code,
            label: `${loc(name)} (${tally((row) => row.supplierCode === code)})`,
        })),
    ];
});

const openValue = computed(() =>
    all.value
        .filter((row) => row.state === 'open' || row.state === 'partial')
        .reduce(
            (sum, row) => sum + (row.currency === 'ILS' ? row.openValue : 0),
            0,
        ),
);

const cols = computed(() => [
    { k: 'id', label: t('purchasing.col.id'), nowrap: true, sortable: true },
    {
        k: 'supplier',
        label: t('purchasing.col.supplier'),
        sortable: true,
        sortValue: (row) => loc(row.supplier),
    },
    {
        k: 'state',
        label: t('purchasing.col.state'),
        nowrap: true,
        sortable: true,
    },
    { k: 'lines', label: t('purchasing.col.lines') },
    {
        k: 'value',
        label: t('purchasing.col.value'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.value,
    },
    {
        k: 'eta',
        label: t('purchasing.col.eta'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.eta || '',
    },
    {
        k: 'created',
        label: t('purchasing.col.created'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.created.iso,
    },
]);

const money = (row, value) =>
    `${CURRENCY_SYMBOL[row.currency] || ''}${num(value, 0)}`;

function clear() {
    state.pq = '';
    state.pstate = '';
    state.psup = '';
}

function toggleState(id) {
    state.pstate = state.pstate === id ? '' : id;
}
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <FilterKpi
                icon="inbox"
                :label="t('purchasing.kpi.open')"
                :value="tally((row) => row.state === 'open')"
                :sub="t('purchasing.kpi.openSub')"
                :active="state.pstate === 'open'"
                @click="toggleState('open')"
            />
            <FilterKpi
                icon="clock"
                :label="t('purchasing.kpi.partial')"
                :value="tally((row) => row.state === 'partial')"
                :sub="t('purchasing.kpi.partialSub')"
                :active="state.pstate === 'partial'"
                @click="toggleState('partial')"
            />
            <FilterKpi
                icon="check"
                :label="t('purchasing.kpi.closed')"
                :value="tally((row) => row.state === 'closed')"
                :sub="t('purchasing.kpi.closedSub')"
                :active="state.pstate === 'closed'"
                @click="toggleState('closed')"
            />
            <FilterKpi
                icon="coin"
                :label="t('purchasing.kpi.value')"
                :value="`₪${num(openValue)}`"
                :sub="t('purchasing.kpi.valueSub')"
                :active="false"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('purchasing.filter.count', { total: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.pq"
                class="search"
                :placeholder="t('purchasing.filter.search')"
            />
            <ASelect v-model="state.pstate" :options="stateOptions" />
            <ASelect v-model="state.psup" :options="supplierOptions" />
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="selected"
            @row="emit('open', $event.id)"
        >
            <template #cell-id="{ row }">
                <span class="t-strong num">{{ row.id }}</span>
                <div class="t-sub">{{ loc(row.by) }}</div>
            </template>
            <template #cell-supplier="{ row }">
                <div class="t-strong">{{ loc(row.supplier) }}</div>
                <div class="t-sub ltr">{{ row.supplierCode }}</div>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="PO_STATE[row.state]?.tone">{{
                    t(`purchasing.state.${row.state}`)
                }}</AChip>
                <div class="t-sub num">
                    {{
                        t('purchasing.col.progress', {
                            received: num(row.received, 1),
                            total: num(row.ordered, 1),
                        })
                    }}
                </div>
            </template>
            <template #cell-lines="{ row }">
                <div class="t-sub">
                    {{ t('purchasing.col.linesN', { n: row.lines.length }) }}
                </div>
                <div class="names">
                    {{ row.lines.map((line) => loc(line.name)).join(' · ') }}
                </div>
            </template>
            <template #cell-value="{ row }">
                <ANum>{{ money(row, row.value) }}</ANum>
                <div
                    v-if="row.openValue && row.openValue !== row.value"
                    class="t-sub"
                >
                    {{
                        t('purchasing.col.openValue', {
                            value: money(row, row.openValue),
                        })
                    }}
                </div>
            </template>
            <template #cell-eta="{ row }">
                <ANum v-if="row.eta">{{ fmtISO(row.eta) }}</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-created="{ row }">
                <ANum>{{ row.created.stamp }}</ANum>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.kpi-row {
    margin-top: 18px;
}

.search {
    width: 300px;
    max-width: 100%;
}

.names {
    font-size: 13px;
    max-width: 380px;
}
</style>
