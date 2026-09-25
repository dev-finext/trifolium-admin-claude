<script setup>
// הוראות ייצור — the runs that turn a recipe into a batch: planned, issued to
// the bench, completed with a yield and a waste figure, or cancelled.
//
// The list follows the shared filter system; the open order lives in the
// query string (`order`), and `order=new` opens the create form — a recipe
// page can send someone straight to "make more of this" with `bom=<id>`.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import CompleteProductionModal from '@/components/production/CompleteProductionModal.vue';
import CreateProductionModal from '@/components/production/CreateProductionModal.vue';
import ProductionDrawer from '@/components/production/ProductionDrawer.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
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
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    PRODUCTION_FILTER_FIELDS,
    PRODUCTION_FILTER_GROUPS,
    PRODUCTION_STATE,
} from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num, pct } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const inventory = useInventoryStore();
const items = useItemsStore();
const store = useProductionStore();

const SPEC = { fields: PRODUCTION_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    order: '',
    bom: '',
});

/** The order whose completion form is open, and the one being cancelled. */
const completing = ref(null);
const cancelling = ref(null);

const openOrder = computed(() =>
    state.order && state.order !== 'new' ? store.orderById(state.order) : null,
);
const creating = computed(() => state.order === 'new');

const itemName = (sku) => {
    const item = items.itemBySku(sku);

    return item ? loc({ he: item.names.he, en: item.names.en }) : sku;
};

const prepName = (id) => {
    const type = items.prepTypeById(id);

    return type ? loc(type.name) : id;
};

const searched = computed(() => {
    const term = state.q.trim().toLowerCase();

    if (!term) {
        return store.orders;
    }

    return store.orders.filter((order) =>
        searchHaystack(order.id, order.name, order.parentSku, order.outputBatch)
            .toLowerCase()
            .includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);
const rows = computed(() => filters.rows);
const { paged, total } = usePaged(rows, state);
const dirty = computed(() => filters.dirty || Boolean(state.q));

const spec = computed(() => ({
    id: 'production',
    ns: 'production',
    noun: t('production.filter.noun'),
    groups: PRODUCTION_FILTER_GROUPS,
    units: { rqty: '' },
    fields: PRODUCTION_FILTER_FIELDS.map((field) => {
        if (field.key === 'rprep') {
            return { ...field, optionLabel: prepName };
        }

        if (field.key === 'ritem') {
            return { ...field, optionLabel: itemName };
        }

        return field;
    }),
}));

function clear() {
    state.q = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { q: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

// ---- the four figures --------------------------------------------------------

/** Completed in the last thirty days — the window the waste figure reads over. */
const since = isoDaysAgo(30);
const thisMonth = (order) =>
    order.state === 'completed' && (order.completedOn?.iso || '') >= since;

const kpis = computed(() => {
    const done = store.orders.filter(thisMonth);
    const produced = done.reduce(
        (sum, order) => sum + (order.yieldQty || 0),
        0,
    );
    const waste = done.reduce((sum, order) => sum + (order.wasteQty || 0), 0);

    return {
        open: store.openOrders.length,
        produced: done.length,
        wastePct: produced + waste ? (waste / (produced + waste)) * 100 : 0,
    };
});

// ---- the table ---------------------------------------------------------------

const cols = computed(() => [
    { k: 'id', label: t('production.col.id'), nowrap: true },
    { k: 'parent', label: t('production.col.parent') },
    { k: 'prep', label: t('production.col.prepType'), nowrap: true },
    { k: 'qty', label: t('production.col.planned'), nowrap: true },
    { k: 'state', label: t('production.col.state'), nowrap: true },
    { k: 'when', label: t('production.col.when'), nowrap: true },
    { k: 'output', label: t('production.col.output'), nowrap: true },
    { k: 'by', label: t('production.col.by'), nowrap: true },
]);

/** The date that says where the run stands: done, cancelled, issued, planned. */
function whenOf(order) {
    return (
        order.completedOn ||
        order.cancelledOn ||
        order.issuedOn ||
        order.createdOn
    );
}

// ---- actions -------------------------------------------------------------------

async function onCreated(order) {
    state.order = order.id;
    state.bom = '';
    push({
        title: t('production.toast.created'),
        body: t('production.toast.createdBody', {
            id: order.id,
            name: loc(order.name),
        }),
    });
}

async function issue(order) {
    await store.issueOrder(order.id);
    push({ title: t('production.toast.issued'), body: order.id });
}

async function onCompleted(order) {
    completing.value = null;
    push({
        title: t('production.toast.completed'),
        body: t('production.toast.completedBody', {
            batch: order.outputBatch,
            qty: num(order.yieldQty),
            uom: order.uom,
        }),
    });
}

async function confirmCancel(reason) {
    const order = cancelling.value;

    cancelling.value = null;
    await store.cancelOrder(order.id, reason);
    push({ title: t('production.toast.cancelled'), body: order.id, bad: true });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.operations'), t('nav.item.production')]"
            :title="t('production.title')"
            :sub="
                t('production.sub', {
                    open: kpis.open,
                    completed: kpis.produced,
                })
            "
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="state.order = 'new'">
                    {{ t('production.action.create') }}
                </AButton>
            </template>
        </PageHead>

        <ASkeleton v-if="dataset.isBusy" />
        <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
        <template v-else>
            <div class="a-kpis kpi-row">
                <FilterKpi
                    icon="layers"
                    :label="t('production.kpi.open')"
                    :value="kpis.open"
                    :sub="t('production.kpi.openSub')"
                    :active="
                        state.rstate.length === 2 &&
                        state.rstate.includes('planned') &&
                        state.rstate.includes('issued')
                    "
                    @click="filters.patch({ rstate: ['planned', 'issued'] })"
                />
                <FilterKpi
                    icon="check"
                    :label="t('production.kpi.produced')"
                    :value="kpis.produced"
                    :sub="t('production.kpi.producedSub')"
                    :active="state.rstate.includes('completed')"
                    @click="filters.toggle('rstate', 'completed')"
                />
                <FilterKpi
                    icon="alert"
                    :label="t('production.kpi.waste')"
                    :value="pct(kpis.wastePct, 1)"
                    :sub="t('production.kpi.wasteSub')"
                    :active="state.rwaste.includes('yes')"
                    @click="filters.toggle('rwaste', 'yes')"
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
                :total="searched.length"
                :label="
                    t('production.countLabel', { total: store.orders.length })
                "
                :dirty="dirty"
                @clear="clear"
            >
                <AInput
                    v-model="state.q"
                    class="search"
                    :placeholder="t('production.filter.search')"
                />
                <AButton icon="layers" @click="drawerOpen = true">
                    {{
                        filters.active.length
                            ? t('filters.openWith', {
                                  n: filters.active.length,
                              })
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
                :selected="state.order"
                @row="state.order = $event.id"
            >
                <template #cell-id="{ row }">
                    <span class="a-code a-tag">{{ row.id }}</span>
                </template>
                <template #cell-parent="{ row }">
                    <div class="t-strong">{{ loc(row.name) }}</div>
                    <div class="t-sub num">{{ row.parentSku }}</div>
                </template>
                <template #cell-prep="{ row }">
                    <AChip tone="gray" size="sm" :dot="false">
                        {{ prepName(row.prepType) }}
                    </AChip>
                </template>
                <template #cell-qty="{ row }">
                    <ANum>{{ num(row.plannedQty) }}</ANum> {{ row.uom }}
                    <div v-if="row.yieldQty != null" class="t-sub">
                        {{
                            t('production.cell.yielded', {
                                qty: num(row.yieldQty),
                                waste: num(row.wasteQty || 0),
                                uom: row.uom,
                            })
                        }}
                    </div>
                </template>
                <template #cell-state="{ row }">
                    <AChip :tone="PRODUCTION_STATE[row.state]?.tone || 'gray'">
                        {{ t(`production.state.${row.state}`) }}
                    </AChip>
                </template>
                <template #cell-when="{ row }">
                    <ANum>{{ whenOf(row)?.stamp }}</ANum>
                </template>
                <template #cell-output="{ row }">
                    <template v-if="row.outputBatch">
                        <span class="a-code a-tag">{{
                            inventory.batchNo(row.outputBatch)
                        }}</span>
                        <span v-if="row.wasteBatch" class="a-code a-tag pv-gap">
                            {{ inventory.batchNo(row.wasteBatch) }}
                        </span>
                    </template>
                    <span v-else class="t-sub">—</span>
                </template>
                <template #cell-by="{ row }">{{ loc(row.by) }}</template>
                <template #empty>
                    <AEmpty
                        icon="layers"
                        :title="t('production.empty.title')"
                        :sub="t('production.empty.sub')"
                    />
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
        </template>

        <ProductionDrawer
            :order="openOrder"
            @close="state.order = ''"
            @issue="issue"
            @complete="completing = $event"
            @cancel="cancelling = $event"
        />

        <CreateProductionModal
            v-if="creating"
            :bom-id="state.bom"
            @close="((state.order = ''), (state.bom = ''))"
            @created="onCreated"
        />

        <CompleteProductionModal
            v-if="completing"
            :order="completing"
            @close="completing = null"
            @completed="onCompleted"
        />

        <ConfirmDialog
            :open="Boolean(cancelling)"
            :title="t('production.cancel.title')"
            :body="
                cancelling
                    ? t('production.cancel.body', {
                          id: cancelling.id,
                          name: loc(cancelling.name),
                      })
                    : ''
            "
            :effects="
                cancelling?.state === 'issued'
                    ? [t('production.cancel.releases')]
                    : []
            "
            :confirm-label="t('production.cancel.confirm')"
            danger
            reason
            @close="cancelling = null"
            @confirm="confirmCancel"
        />
    </div>
</template>

<style scoped>
.kpi-row {
    margin-bottom: 14px;
}

.search {
    width: 360px;
    flex: none;
}

.pv-gap {
    margin-inline-start: 6px;
}
</style>
