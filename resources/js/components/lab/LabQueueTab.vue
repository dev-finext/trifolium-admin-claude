<script setup>
// The lab queue: every order on the bench, urgent ones first, with its formulas,
// which of the four roles have been marked, how it leaves the pharmacy, and how
// long it has been waiting. The prep sheet prints from the row.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { usePrepSheet } from '@/composables/usePrepSheet';
import { useSaveGuard } from '@/composables/useSaveGuard';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { LAB_ROLE_IDS } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';
import { useItemsStore } from '@/stores/items';
import {
    LAB_FILTER_FIELDS,
    LAB_FILTER_GROUPS,
    statusOf,
    trackedItems,
    useOrdersStore,
} from '@/stores/orders';

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
const { guard } = useSaveGuard();
const deliveries = useDeliveriesStore();
const orders = useOrdersStore();
const items = useItemsStore();
const drawerOpen = ref(false);
const savedViews = ref(null);

const SPEC = { fields: LAB_FILTER_FIELDS };

const state = useUrlState({
    lq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    sort: '',
    dir: 'asc',
});

/** Free text first, then the field filters. */
const searched = computed(() => {
    const term = state.lq.trim().toLowerCase();

    if (!term) {
        return props.queue;
    }

    return props.queue.filter((order) =>
        searchHaystack(
            order.id,
            order.practitioner.name,
            order.patient.name,
            trackedItems(order).map((item) => item.name),
        ).includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

const sorted = computed(() => {
    const rows = [...filters.rows];

    if (!state.sort) {
        return rows;
    }

    const col = cols.value.find((one) => one.k === state.sort);
    const value = col?.sortValue || ((row) => row[state.sort]);
    const dir = state.dir === 'desc' ? -1 : 1;

    return rows.sort((a, b) => {
        const x = value(a);
        const y = value(b);

        if (typeof x === 'number' && typeof y === 'number') {
            return (x - y) * dir;
        }

        return (
            String(x).localeCompare(String(y), undefined, { numeric: true }) *
            dir
        );
    });
});

const rows = computed(() => sorted.value);

const { paged, total } = usePaged(rows, state);

const sortModel = computed(() => ({ key: state.sort, dir: state.dir }));

function onSort(next) {
    state.sort = next.key;
    state.dir = next.dir;
}

/** The preparation type's own name, so the filter reads like the bench does. */
function prepLabel(id) {
    const type = items.prepTypeById(id);

    return type ? loc(type.name) : id;
}

function practitionerLabel(code) {
    const hit = props.queue.find((order) => order.practitioner.code === code);

    return hit ? `${loc(hit.practitioner.name)} · ${code}` : String(code);
}

const spec = computed(() => ({
    id: 'lab',
    ns: 'lab',
    noun: t('lab.filter.noun'),
    groups: LAB_FILTER_GROUPS,
    units: { waiting: t('lab.filter.daysUnit') },
    fields: LAB_FILTER_FIELDS.map((field) => {
        if (field.key === 'prep') {
            return { ...field, optionLabel: prepLabel };
        }

        if (field.key === 'practitioner') {
            return { ...field, optionLabel: practitionerLabel };
        }

        return field;
    }),
}));

function clear() {
    state.lq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { lq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

/**
 * Mark or clear one of the four roles straight from the queue row.
 *
 * Through the save guard: a refused write puts the mark back where it was and
 * offers the action again, rather than leaving the row claiming work that was
 * never recorded.
 */
async function toggleRole(order, role) {
    const on = !order.lab?.[role];

    await guard({
        label: t(on ? 'lab.queue.roleMarked' : 'lab.queue.roleCleared', {
            role: t(`orders.labRole.${role}`),
        }),
        body: order.id,
        run: () => orders.setLabRole(order.id, role, on),
    });
}

const tally = (predicate) => props.queue.filter(predicate).length;

const cols = computed(() => [
    {
        k: 'id',
        label: t('lab.queue.col.order'),
        nowrap: true,
        sortable: true,
        // Urgent first whichever way the column is sorted: it is the queue's
        // own rule, not a preference.
        sortValue: (row) => `${row.urgent ? 0 : 1}${row.id}`,
    },
    {
        k: 'practitioner',
        label: t('lab.queue.col.practitioner'),
        sortable: true,
        sortValue: (row) => loc(row.practitioner.name),
    },
    {
        k: 'formulas',
        label: t('lab.queue.col.formulas'),
        sortable: true,
        sortValue: (row) => liveFormulas(row).length,
    },
    {
        k: 'roles',
        label: t('lab.queue.col.roles'),
        nowrap: true,
        sortable: true,
        sortValue: (row) =>
            LAB_ROLE_IDS.filter((role) => row.lab?.[role]).length,
    },
    {
        k: 'fulfilment',
        label: t('lab.queue.col.fulfilment'),
        sortable: true,
        sortValue: (row) => fulfilment(row),
    },
    {
        k: 'placed',
        label: t('lab.queue.col.placed'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.daysAgo ?? 0,
    },
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
                :active="state.stage.includes('in_production')"
                @click="filters.toggle('stage', 'in_production')"
            />
            <FilterKpi
                icon="package"
                :label="t('lab.kpi.ready')"
                :value="
                    tally((order) => statusOf(order) === 'ready_for_delivery')
                "
                :sub="t('lab.kpi.readySub')"
                :active="state.stage.includes('ready_for_delivery')"
                @click="filters.toggle('stage', 'ready_for_delivery')"
            />
            <FilterKpi
                icon="alert"
                :label="t('lab.kpi.urgent')"
                :value="tally((order) => order.urgent)"
                :sub="t('lab.kpi.urgentSub')"
                :active="state.urgent.includes('yes')"
                @click="filters.toggle('urgent', 'yes')"
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
            :label="t('lab.queue.count')"
            :dirty="filters.dirty || Boolean(state.lq)"
            @clear="clear"
        >
            <AInput
                v-model="state.lq"
                class="search"
                :placeholder="t('lab.queue.search')"
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
            :sort="sortModel"
            @update:sort="onSort"
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
                <span class="roles" @click.stop>
                    <button
                        v-for="role in LAB_ROLE_IDS"
                        :key="role"
                        type="button"
                        class="role"
                        :class="{ 'is-on': row.lab?.[role] }"
                        :aria-pressed="Boolean(row.lab?.[role])"
                        :title="
                            row.lab?.[role]
                                ? t('lab.queue.roleBy', {
                                      role: t(`orders.labRole.${role}`),
                                      by: loc(row.lab[role].by),
                                  })
                                : t('lab.queue.roleMark', {
                                      role: t(`orders.labRole.${role}`),
                                  })
                        "
                        :aria-label="
                            t(
                                row.lab?.[role]
                                    ? 'lab.queue.roleClear'
                                    : 'lab.queue.roleMark',
                                { role: t(`orders.labRole.${role}`) },
                            )
                        "
                        @click="toggleRole(row, role)"
                    >
                        {{ t(`orders.labRole.${role}`).slice(0, 1) }}
                    </button>
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
    width: 26px;
    height: 26px;
    border-radius: 7px;
    border: 1px solid var(--a-line-2);
    background: var(--a-surface);
    color: var(--a-ink-4);
    font: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition:
        background 0.12s,
        border-color 0.12s,
        color 0.12s;
}

.role:hover {
    border-color: var(--a-accent);
    color: var(--a-accent);
}

.role.is-on {
    border-color: var(--a-green);
    background: var(--a-green-bg);
    color: var(--a-green);
}

.role.is-on:hover {
    border-color: var(--a-red);
    color: var(--a-red);
}
</style>
