<script setup>
// רכיבי פורמולה — the formula-ingredient catalogue.
//
// The one screen where an ingredient is created: the same record is what the
// compounding wizard offers and what the warehouse counts. Quantities are shown
// but never edited here — stock enters through a goods receipt and leaves through
// compounding or an adjustment. Every filter lives in the query string.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import IngredientDrawer from '@/components/ingredients/IngredientDrawer.vue';
import IngredientEditor from '@/components/ingredients/IngredientEditor.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
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
import { INGREDIENT_KINDS } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';
import {
    INGREDIENT_FILTER_FIELDS,
    INGREDIENT_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const inventory = useInventoryStore();
const catalog = useCatalogStore();

const SPEC = { fields: INGREDIENT_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    sort: '',
    dir: 'asc',
});

const editing = ref(null);

/** The row whose card is open. Clicking a row reads; the card offers to edit. */
const viewing = ref(null);
const removing = ref(null);

/** Every ingredient, plus its resolved pricing group. */
const all = computed(() =>
    inventory.ingredients.map((row) => ({
        ...row,
        // resolveSku answers { group, prefix } — the row wants the group.
        group: row.priceSku
            ? (catalog.resolveSku(row.priceSku)?.group ?? null)
            : null,
    })),
);

/** How many ingredients match a predicate — used by the KPIs and select counts. */
function tally(predicate) {
    return all.value.filter(predicate).length;
}

const searched = computed(() => {
    const term = state.q.trim().toLowerCase();

    if (!term) {
        return all.value;
    }

    return all.value.filter((row) =>
        searchHaystack(row.name, row.sku, row.priceSku, row.lat, row.cn)
            .toLowerCase()
            .includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const dirty = computed(() => filters.dirty || Boolean(state.q));

const spec = computed(() => ({
    id: 'ingredients',
    ns: 'ingredients',
    noun: t('ingredients.filter.noun'),
    groups: INGREDIENT_FILTER_GROUPS,
    units: { iavail: t('ingredients.filter.qtyUnit') },
    fields: INGREDIENT_FILTER_FIELDS.map((field) => {
        if (field.key === 'iwh') {
            return { ...field, optionLabel: (id) => t(`warehouse.${id}.name`) };
        }

        if (field.key === 'ipg') {
            return {
                ...field,
                optionLabel: (id) =>
                    id === 'none'
                        ? t('ingredients.filter.noGroup')
                        : loc(
                              catalog.priceGroups.find(
                                  (group) => group.id === id,
                              )?.name,
                          ) || String(id),
            };
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

const cols = computed(() => [
    { k: 'sku', label: t('ingredients.col.sku'), nowrap: true, sortable: true },
    {
        k: 'name',
        label: t('ingredients.col.name'),
        sortable: true,
        sortValue: (row) => loc(row.name),
    },
    { k: 'kind', label: t('ingredients.col.kind') },
    {
        k: 'stock',
        label: t('ingredients.col.stock'),
        sortable: true,
        sortValue: (row) => row.avail,
    },
    {
        k: 'min',
        label: t('ingredients.col.min'),
        nowrap: true,
        sortValue: (row) => row.min,
    },
    { k: 'group', label: t('ingredients.col.priceGroup') },
    { k: 'actions', label: t('ingredients.col.actions'), nowrap: true },
]);

const sortModel = computed(() => ({ key: state.sort, dir: state.dir }));

const sub = computed(() =>
    t('ingredients.sub', {
        total: all.value.length,
        west: tally((row) => (row.system || 'west') === 'west'),
        chinese: tally((row) => row.system === 'chinese'),
    }),
);

const crumbs = computed(() => [
    t('nav.group.operations'),
    t('nav.item.ingredients'),
]);

function onSort(next) {
    state.sort = next.key;
    state.dir = next.dir;
}

function unitLabel(row) {
    return t(`ingredients.unit.${row.unit}`);
}

// ---- delete --------------------------------------------------------------

const removeBlock = computed(() =>
    removing.value ? inventory.ingredientBlock(removing.value) : null,
);

const removeBlockedDeps = computed(() => {
    const block = removeBlock.value;

    if (!block) {
        return '';
    }

    const parts = [];

    if (block.onHand > 0) {
        parts.push(
            t('ingredients.remove.depStock', {
                qty: num(block.onHand),
                unit: unitLabel(removing.value),
            }),
        );
    }

    if (block.batches) {
        parts.push(t('ingredients.remove.depBatches', { n: block.batches }));
    }

    if (block.formulas) {
        parts.push(t('ingredients.remove.depFormulas', { n: block.formulas }));
    }

    return parts.join(' · ');
});

const removeEffects = computed(() => [
    t('ingredients.remove.effectWizard'),
    t('ingredients.remove.effectHistory'),
    t('ingredients.remove.effectLog'),
]);

async function confirmRemove(reason) {
    const row = removing.value;

    await inventory.removeIngredient(row.sku, reason);
    push({
        title: t('ingredients.toast.removed'),
        body: t('ingredients.toast.removedBody', {
            name: loc(row.name),
            reason,
        }),
        bad: true,
    });
    removing.value = null;
}

function onSaved(result) {
    push(
        result.created
            ? {
                  title: t('ingredients.toast.created'),
                  body: t('ingredients.toast.createdBody', result),
              }
            : {
                  title: t('ingredients.toast.updated'),
                  body: t('ingredients.toast.updatedBody', result),
              },
    );
    editing.value = null;
}

function exportRows() {
    const file = `ingredients-${isoDaysAgo(0)}.xlsx`;

    push({
        title: t('ingredients.toast.exported'),
        body: t('ingredients.toast.exportedBody', {
            n: rows.value.length,
            file,
        }),
    });
}
</script>

<template>
    <div>
        <PageHead :crumbs="crumbs" :title="t('ingredients.title')" :sub="sub">
            <template #actions>
                <AButton icon="download" @click="exportRows">
                    {{ t('ingredients.action.export') }}
                </AButton>
                <AButton kind="p" icon="plus" @click="editing = {}">
                    {{ t('ingredients.action.add') }}
                </AButton>
            </template>
        </PageHead>

        <div class="a-kpis kpi-row">
            <FilterKpi
                icon="beaker"
                :label="t('ingredients.kpi.all')"
                :value="all.length"
                :sub="t('ingredients.kpi.allSub')"
                :active="!filters.active.length"
                @click="filters.clear()"
            />
            <FilterKpi
                v-for="id in INGREDIENT_KINDS"
                :key="id"
                :icon="
                    id === 'raw' ? 'leaf' : id === 'base' ? 'beaker' : 'package'
                "
                :label="t(`ingredients.kind.${id}`)"
                :value="tally((row) => row.kind === id)"
                :sub="t('ingredients.kpi.filters')"
                :active="state.ikind.includes(id)"
                @click="filters.toggle('ikind', id)"
            />
            <FilterKpi
                icon="alert"
                :label="t('ingredients.kpi.low')"
                :value="tally((row) => row.low)"
                :sub="t('ingredients.kpi.lowSub')"
                :active="state.istk.includes('low')"
                @click="filters.toggle('istk', 'low')"
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
            :label="t('ingredients.filter.count', { total: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.q"
                class="search"
                :placeholder="t('ingredients.filter.search')"
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
            row-key="sku"
            :sort="sortModel"
            :empty-title="t('ingredients.empty.title')"
            :empty-sub="t('ingredients.empty.hint')"
            @update:sort="onSort"
            @row="viewing = $event"
        >
            <template #cell-sku="{ row }">
                <span class="a-code a-tag">{{ row.sku }}</span>
                <div v-if="row.priceSku" class="t-sub num">
                    {{ t('ingredients.col.priceCode', { code: row.priceSku }) }}
                </div>
            </template>

            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div v-if="row.lat" class="t-sub ltr">{{ row.lat }}</div>
            </template>

            <template #cell-kind="{ row }">
                <AChip :dot="false" size="sm">
                    {{ t(`ingredients.kind.${row.kind}`) }}
                </AChip>
                <span class="method">{{
                    t(`ingredients.system.${row.system || 'west'}`)
                }}</span>
            </template>

            <template #cell-stock="{ row }">
                <span :class="{ 'is-low': row.low }">
                    <ANum>{{ num(row.avail) }}</ANum>
                    {{ unitLabel(row) }}
                </span>
                <div v-if="row.low" class="a-inv">
                    {{
                        row.avail <= 0
                            ? t('ingredients.stock.empty')
                            : t('ingredients.stock.low')
                    }}
                </div>
            </template>

            <template #cell-min="{ row }">
                <ANum>{{ num(row.min) }}</ANum>
            </template>

            <template #cell-group="{ row }">
                <span v-if="row.group">{{ loc(row.group.name) }}</span>
                <span v-else class="t-sub">{{
                    t('ingredients.stock.noGroup')
                }}</span>
            </template>

            <template #cell-actions="{ row }">
                <div class="a-rowbtns">
                    <AButton sm icon="edit" @click="editing = row">
                        {{ t('ingredients.action.edit') }}
                    </AButton>
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        @click="removing = row"
                    >
                        {{ t('ingredients.action.remove') }}
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

        <IngredientDrawer
            :row="viewing"
            @close="viewing = null"
            @edit="
                (row) => {
                    viewing = null;
                    editing = row;
                }
            "
        />

        <IngredientEditor
            v-if="editing"
            :item="editing"
            @close="editing = null"
            @saved="onSaved"
        />

        <ConfirmDialog
            v-if="removing && removeBlock"
            open
            :title="t('ingredients.remove.blockedTitle')"
            :body="
                t('ingredients.remove.blockedBody', {
                    name: loc(removing.name),
                    sku: removing.sku,
                    deps: removeBlockedDeps,
                })
            "
            :confirm-label="t('actions.close')"
            @close="removing = null"
            @confirm="removing = null"
        />

        <ConfirmDialog
            v-else-if="removing"
            open
            danger
            reason
            :title="t('ingredients.remove.title')"
            :body="
                t('ingredients.remove.body', {
                    name: loc(removing.name),
                    sku: removing.sku,
                })
            "
            :effects="removeEffects"
            :confirm-label="t('ingredients.remove.confirm')"
            @close="removing = null"
            @confirm="confirmRemove"
        />
    </div>
</template>

<style scoped>
.kpi-row {
    margin-top: 18px;
}

.search {
    width: 330px;
    max-width: 100%;
}

.method {
    margin-inline-start: 8px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.is-low {
    color: var(--a-red);
    font-weight: 600;
}
</style>
