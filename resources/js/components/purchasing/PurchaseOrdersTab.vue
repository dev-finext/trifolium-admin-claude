<script setup>
// The purchase-order list: what is on order from whom, how much of it has
// arrived, and what is still expected.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    CURRENCY_SYMBOL,
    PO_FILTER_FIELDS,
    PO_FILTER_GROUPS,
    PO_STATE,
} from '@/config';
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

const SPEC = { fields: PO_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    pq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const all = computed(() => store.rows);

const tally = (predicate) => all.value.filter(predicate).length;

const searched = computed(() => {
    const term = state.pq.trim().toLowerCase();

    if (!term) {
        return all.value;
    }

    return all.value.filter((row) =>
        searchHaystack(
            row.id,
            row.supplier,
            row.lines.map((line) => line.name),
        ).includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const dirty = computed(() => filters.dirty || Boolean(state.pq));

/** A tile is one value of the state field. */
const stateOnly = (id) => state.pstate.length === 1 && state.pstate[0] === id;

const spec = computed(() => ({
    id: 'purchaseOrders',
    ns: 'purchasing',
    noun: t('purchasing.filter.noun'),
    groups: PO_FILTER_GROUPS,
    units: { pvalue: '₪' },
    fields: PO_FILTER_FIELDS.map((field) => {
        if (field.key === 'psup') {
            return {
                ...field,
                optionLabel: (code) => {
                    const hit = all.value.find(
                        (row) => row.supplierCode === code,
                    );

                    return hit ? loc(hit.supplier) : String(code);
                },
            };
        }

        if (field.key === 'pby') {
            return {
                ...field,
                optionLabel: (he) => {
                    const hit = all.value.find(
                        (row) => (row.by?.he || row.by) === he,
                    );

                    return hit ? loc(hit.by) : String(he);
                },
            };
        }

        return field;
    }),
}));

function clear() {
    state.pq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { pq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

/** An order's money, in the currency the order itself was placed in. */
const money = (row, value) =>
    `${CURRENCY_SYMBOL[row.currency] || ''}${num(value, 0)}`;

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
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <FilterKpi
                icon="inbox"
                :label="t('purchasing.kpi.open')"
                :value="tally((row) => row.state === 'open')"
                :sub="t('purchasing.kpi.openSub')"
                :active="stateOnly('open')"
                @click="filters.toggle('pstate', 'open')"
            />
            <FilterKpi
                icon="clock"
                :label="t('purchasing.kpi.partial')"
                :value="tally((row) => row.state === 'partial')"
                :sub="t('purchasing.kpi.partialSub')"
                :active="stateOnly('partial')"
                @click="filters.toggle('pstate', 'partial')"
            />
            <FilterKpi
                icon="check"
                :label="t('purchasing.kpi.closed')"
                :value="tally((row) => row.state === 'closed')"
                :sub="t('purchasing.kpi.closedSub')"
                :active="stateOnly('closed')"
                @click="filters.toggle('pstate', 'closed')"
            />
            <FilterKpi
                icon="coin"
                :label="t('purchasing.kpi.value')"
                :value="`₪${num(openValue)}`"
                :sub="t('purchasing.kpi.valueSub')"
                :active="false"
            />
        </div>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="state"
            :rows="searched"
            @apply="applyView"
        />

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
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="state"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable
            :cols="cols"
            :rows="paged"
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

        <APagination
            v-model:page="state.pg"
            v-model:size="state.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
            :rows="searched"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />
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
