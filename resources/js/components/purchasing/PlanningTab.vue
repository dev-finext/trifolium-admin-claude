<script setup>
// V3 — תכנון מלאי ורכש: the report that replaces the external workbook.
//
// The buyer picks a window and the item groups to look at, and gets one row per
// item: what is on the shelf, what is promised out, what is coming and from
// whom, what went out over the window, how many months of stock that leaves,
// and a column to type into. Typing a quantity re-reads the cover beside it, so
// the effect of the plan is visible before anything is sent anywhere.
//
// Everything on screen is traceable: the columns are the ones the client's note
// of 14.09.26 lists, the consumption rule is the pharmacy's own saved SAP query,
// and the months-of-stock arithmetic is the workbook's. `config/planning.js`
// says which is which, and `dev/progress.js` records what is still open.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    COVER_STATES,
    PLANNING_FILTER_FIELDS,
    PLANNING_FILTER_GROUPS,
} from '@/config';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';
import { usePlanningStore } from '@/stores/planning';

defineProps({
    /** The item number whose drawer is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open', 'request']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const store = usePlanningStore();
const items = useItemsStore();

const SPEC = { fields: PLANNING_FILTER_FIELDS };

const drawerOpen = ref(false);

const state = useUrlState({
    kq: '',
    kfrom: '',
    kto: '',
    kgroups: [],
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

/** The months the fixture holds, newest first, for the two window pickers. */
const monthOptions = computed(() =>
    [...store.months].reverse().map((ym) => ({ value: ym, label: ym })),
);

const window = computed(() => ({
    from: state.kfrom || store.defaultWindow.from,
    to: state.kto || store.defaultWindow.to,
}));

/** Every item group that has an item in it, named. */
const groupOptions = computed(() => {
    const seen = new Map();

    items.rows.forEach((row) => {
        if (row.group !== null && row.group !== undefined && row.groupName) {
            seen.set(row.group, row.groupName);
        }
    });

    return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), 'he'));
});

const chosenGroups = computed(() => state.kgroups.map(Number));

function toggleGroup(code) {
    const has = chosenGroups.value.includes(code);

    state.kgroups = has
        ? state.kgroups.filter((one) => Number(one) !== code)
        : [...state.kgroups, String(code)];
    state.pg = 1;
}

const report = computed(() =>
    store.report({ ...window.value, groups: chosenGroups.value }),
);

const all = computed(() => report.value.rows);

const tally = (predicate) => all.value.filter(predicate).length;

const searched = computed(() => {
    const term = state.kq.trim().toLowerCase();

    if (!term) {
        return all.value;
    }

    return all.value.filter((row) =>
        searchHaystack(row.sku, row.name, row.foreign, row.supplier).includes(
            term,
        ),
    );
});

const filters = useListFilters(SPEC, state, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const dirty = computed(() => filters.dirty || Boolean(state.kq));

function clear() {
    state.kq = '';
    filters.clear();
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const spec = computed(() => ({
    id: 'planning',
    ns: 'planning',
    noun: t('planning.filter.noun'),
    groups: PLANNING_FILTER_GROUPS,
    fields: PLANNING_FILTER_FIELDS.map((field) => {
        if (field.key === 'kgroup') {
            return {
                ...field,
                optionLabel: (code) => items.groupName(Number(code)) || code,
            };
        }

        if (field.key === 'ksup') {
            return {
                ...field,
                optionLabel: (code) => {
                    if (code === 'none') {
                        return t('planning.noSupplier');
                    }

                    const hit = all.value.find(
                        (row) => row.supplierCode === code,
                    );

                    return hit?.supplier ? loc(hit.supplier) : String(code);
                },
            };
        }

        return field;
    }),
}));

const cols = computed(() => [
    { k: 'sku', label: t('planning.col.sku'), nowrap: true, sortable: true },
    {
        k: 'name',
        label: t('planning.col.name'),
        sortable: true,
        sortValue: (row) => loc(row.name),
    },
    { k: 'groupName', label: t('planning.col.group'), nowrap: true },
    {
        k: 'onHand',
        label: t('planning.col.onHand'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'committed',
        label: t('planning.col.committed'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'onOrder',
        label: t('planning.col.onOrder'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'total',
        label: t('planning.col.total'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'monthly',
        label: t('planning.col.monthly'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'cover',
        label: t('planning.col.cover'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => (row.cover === null ? 9999 : row.cover),
    },
    { k: 'plan', label: t('planning.col.plan'), nowrap: true },
    {
        k: 'direct',
        label: t('planning.col.direct'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'supplier',
        label: t('planning.col.supplier'),
        sortable: true,
        sortValue: (row) => (row.supplier ? loc(row.supplier) : ''),
    },
    { k: 'price', label: t('planning.col.price'), nowrap: true },
    { k: 'remarks', label: t('planning.col.remarks') },
]);

const unit = (id) => t(`inventory.unit.${id}`);

const coverTone = (row) => COVER_STATES[row.coverState]?.tone || 'gray';

/** How many rows are below their own threshold — the reason to look at all. */
const kpis = computed(() => ({
    low: tally((row) => row.coverState === 'low'),
    critical: tally((row) => row.coverState === 'critical'),
    planned: tally((row) => row.planned > 0),
    noDemand: tally((row) => row.coverState === 'noDemand'),
}));

const coverOnly = (id) => state.kcover.length === 1 && state.kcover[0] === id;

/** What is typed into a planning cell, per row and target. */
const typed = (row, target) => row.plan?.[target]?.qty ?? '';

function setPlan(row, target, value) {
    store.plan(row.sku, target, Number(value) || 0);
}

/** Whether a cell can be typed into at all. */
const editable = (row, target) =>
    row.targets.includes(target) &&
    (!row.plan?.[target] || row.plan[target].state === 'planned');

function exportRows() {
    const file = `planning-${isoDaysAgo(0)}.csv`;
    const n = downloadCsv(
        file,
        [
            t('planning.col.sku'),
            t('planning.col.name'),
            t('planning.col.foreign'),
            t('planning.col.group'),
            t('planning.col.onHand'),
            t('planning.col.committed'),
            t('planning.col.onOrder'),
            t('planning.col.total'),
            t('planning.col.monthly'),
            t('planning.col.cover'),
            t('planning.col.planPurchase'),
            t('planning.col.planProduction'),
            t('planning.col.plannedCover'),
            t('planning.col.direct'),
            t('planning.col.supplier'),
            t('planning.col.price'),
            t('planning.col.remarks'),
        ],
        rows.value.map((row) => [
            row.sku,
            loc(row.name),
            row.foreign || '',
            row.groupName || '',
            row.onHand,
            row.committed,
            row.onOrder,
            row.total,
            row.monthly,
            row.cover ?? '',
            typed(row, 'purchase'),
            typed(row, 'production'),
            row.plannedCover ?? '',
            row.direct,
            row.supplier ? loc(row.supplier) : '',
            row.price ?? '',
            row.remarks || '',
        ]),
    );

    push({ kind: 'ok', text: t('planning.exported', { n, file }) });
}
</script>

<template>
    <div class="wrap">
        <p class="lede">
            {{ t('planning.lede') }}
            <V2Badge id="planning" v="3" size="sm" />
        </p>

        <div class="window">
            <div>
                <label class="a-lbl">{{ t('planning.window.from') }}</label>
                <ASelect v-model="state.kfrom" :options="monthOptions" ltr />
            </div>
            <div>
                <label class="a-lbl">{{ t('planning.window.to') }}</label>
                <ASelect v-model="state.kto" :options="monthOptions" ltr />
            </div>
            <div class="grow">
                <label class="a-lbl">{{ t('planning.window.groups') }}</label>
                <div class="groups">
                    <button
                        v-for="option in groupOptions"
                        :key="option.value"
                        type="button"
                        class="grp"
                        :class="{
                            'is-on': chosenGroups.includes(option.value),
                        }"
                        @click="toggleGroup(option.value)"
                    >
                        {{ option.label }}
                    </button>
                </div>
                <div class="a-hint">
                    {{
                        chosenGroups.length
                            ? t('planning.window.groupsPicked', {
                                  n: chosenGroups.length,
                              })
                            : t('planning.window.groupsAll')
                    }}
                </div>
            </div>
        </div>

        <div class="a-kpis">
            <FilterKpi
                icon="alert"
                :label="t('planning.kpi.critical')"
                :value="kpis.critical"
                :sub="t('planning.kpi.criticalSub')"
                :active="coverOnly('critical')"
                @click="filters.toggle('kcover', 'critical')"
            />
            <FilterKpi
                icon="clock"
                :label="t('planning.kpi.low')"
                :value="kpis.low"
                :sub="
                    t('planning.kpi.lowSub', {
                        n: report.rows[0]?.threshold ?? 3,
                    })
                "
                :active="coverOnly('low')"
                @click="filters.toggle('kcover', 'low')"
            />
            <FilterKpi
                icon="edit"
                :label="t('planning.kpi.planned')"
                :value="kpis.planned"
                :sub="t('planning.kpi.plannedSub')"
                :active="false"
            />
            <FilterKpi
                icon="list"
                :label="t('planning.kpi.noDemand')"
                :value="kpis.noDemand"
                :sub="t('planning.kpi.noDemandSub')"
                :active="coverOnly('noDemand')"
                @click="filters.toggle('kcover', 'noDemand')"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('planning.filter.count', { total: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.kq"
                class="search"
                :placeholder="t('planning.search')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
            <AButton icon="download" @click="exportRows">
                {{ t('planning.export') }}
            </AButton>
            <AButton
                kind="p"
                icon="inbox"
                :disabled="!kpis.planned"
                @click="emit('request')"
            >
                {{ t('planning.toRequest') }}
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
            v-if="paged.length"
            :cols="cols"
            :rows="paged"
            row-key="id"
            :selected="selected"
            :row-class="(row) => `cover-${row.coverState}`"
            @row="emit('open', $event.sku)"
        >
            <template #cell-sku="{ row }">
                <span class="a-code a-tag">{{ row.sku }}</span>
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div v-if="row.foreign" class="t-sub ltr">
                    {{ row.foreign }}
                </div>
            </template>
            <template #cell-onHand="{ row }">
                <ANum>{{ num(row.onHand, 3) }}</ANum>
                <div class="t-sub">{{ unit(row.unit) }}</div>
            </template>
            <template #cell-committed="{ row }">
                <ANum>{{ num(row.committed, 3) }}</ANum>
            </template>
            <template #cell-onOrder="{ row }">
                <template v-if="row.onOrder || row.coming.length">
                    <ANum>{{ num(row.onOrder, 3) }}</ANum>
                    <div v-if="row.comingFrom" class="t-sub who">
                        {{ row.comingFrom }}
                    </div>
                </template>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-total="{ row }">
                <ANum>{{ num(row.total, 3) }}</ANum>
            </template>
            <template #cell-monthly="{ row }">
                <ANum>{{ num(row.monthly, 3) }}</ANum>
            </template>
            <template #cell-cover="{ row }">
                <AChip :tone="coverTone(row)" size="sm" :dot="false">
                    {{
                        row.cover === null
                            ? t('planning.noDemandShort')
                            : num(row.cover, 1)
                    }}
                </AChip>
                <div v-if="row.planned" class="t-sub planned">
                    {{
                        t('planning.afterPlan', {
                            cover:
                                row.plannedCover === null
                                    ? '—'
                                    : num(row.plannedCover, 1),
                        })
                    }}
                </div>
            </template>
            <template #cell-plan="{ row }">
                <div class="plans">
                    <label
                        v-if="row.targets.includes('purchase')"
                        class="planfield"
                    >
                        <span class="a-lbl">{{
                            t('planning.col.planPurchase')
                        }}</span>
                        <AInput
                            v-if="editable(row, 'purchase')"
                            :model-value="typed(row, 'purchase')"
                            type="number"
                            min="0"
                            step="any"
                            class="plan"
                            @click.stop
                            @update:model-value="
                                setPlan(row, 'purchase', $event)
                            "
                        />
                        <AChip v-else tone="blue" size="sm" :dot="false">
                            {{ num(row.plan.purchase.qty, 3) }}
                        </AChip>
                    </label>
                    <label
                        v-if="row.targets.includes('production')"
                        class="planfield"
                    >
                        <span class="a-lbl">{{
                            t('planning.col.planProduction')
                        }}</span>
                        <AInput
                            v-if="editable(row, 'production')"
                            :model-value="typed(row, 'production')"
                            type="number"
                            min="0"
                            step="any"
                            class="plan"
                            @click.stop
                            @update:model-value="
                                setPlan(row, 'production', $event)
                            "
                        />
                        <AChip v-else tone="blue" size="sm" :dot="false">
                            {{ num(row.plan.production.qty, 3) }}
                        </AChip>
                    </label>
                    <span v-if="!row.targets.length" class="t-sub">—</span>
                </div>
            </template>
            <template #cell-direct="{ row }">
                <ANum>{{ num(row.direct, 3) }}</ANum>
            </template>
            <template #cell-supplier="{ row }">
                <span v-if="row.supplier">{{ loc(row.supplier) }}</span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-price="{ row }">
                <span
                    v-if="row.price"
                    :title="
                        t('planning.priceTip', {
                            price: ils(row.price, 2),
                            on: row.priceOn || '—',
                        })
                    "
                >
                    <ANum>{{ ils(row.price, 2) }}</ANum>
                </span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-remarks="{ row }">
                <span v-if="row.remarks" class="remarks" :title="row.remarks">{{
                    row.remarks
                }}</span>
                <span v-else class="t-sub">—</span>
            </template>
        </ADataTable>

        <AEmpty
            v-else
            icon="chart"
            :title="t('planning.empty.title')"
            :sub="t('planning.empty.sub')"
        />

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
        />

        <p class="foot t-sub">
            {{
                t('planning.foot', {
                    from: report.from || '—',
                    to: report.to || '—',
                    months: report.months.length,
                })
            }}
        </p>
    </div>
</template>

<style scoped>
.wrap {
    display: grid;
    gap: 14px;
    margin-top: 18px;
}

.lede {
    margin: 0;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.window {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: start;
    padding: 12px 14px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-sunk);
}

.grow {
    flex: 1 1 340px;
    min-width: 0;
}

.groups {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.grp {
    border: 1px solid var(--a-line);
    background: var(--a-surface);
    color: var(--a-ink-2);
    border-radius: 999px;
    padding: 4px 10px;
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
}

.grp.is-on {
    border-color: var(--a-blue);
    background: var(--a-blue-bg);
    color: var(--a-blue);
}

.search {
    width: 300px;
    max-width: 100%;
}

.plans {
    display: grid;
    gap: 6px;
}

.planfield {
    display: grid;
    gap: 2px;
}

.planfield .a-lbl {
    margin: 0;
    font-size: 11px;
}

.plan {
    width: 92px;
}

.planned {
    color: var(--a-blue);
    font-weight: 600;
}

.who {
    display: block;
    font-size: 11.5px;
    max-width: 180px;
}

.remarks {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 240px;
    font-size: 12.5px;
}

.foot {
    margin: 0;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
