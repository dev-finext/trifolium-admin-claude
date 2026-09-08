<script setup>
// The stock ledger: every quantity that moved, and the document it moved on.
//
// Goods in is positive, an allocation to compounding is negative, and an
// adjustment carries the sign of its variance. Each row names the batch it moved
// out of, which is what makes a quantity on a shelf answerable.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { inRange } from '@/lib/dateRange';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import {
    MOVEMENT_FILTER_FIELDS,
    MOVEMENT_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';

/** Which movement kinds point at an order rather than at a stock document. */
const ORDER_REF_KINDS = ['allocated_to_compounding', 'released_on_cancel'];

const emit = defineEmits(['open-batch', 'open-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const SPEC = { fields: MOVEMENT_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    mq: '',
    preset: 'all',
    from: '',
    to: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

const term = computed(() => view.mq.trim().toLowerCase());

const searched = computed(() =>
    inventory.movements.filter(
        (move) =>
            inRange(move.when.iso, range.value) &&
            (!term.value ||
                searchHaystack(
                    move.batch,
                    move.name,
                    move.sku,
                    move.ref,
                ).includes(term.value)),
    ),
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(
    () => filters.dirty || Boolean(view.mq) || Boolean(view.from || view.to),
);

const spec = computed(() => ({
    id: 'movements',
    ns: 'inventory',
    noun: t('inventory.filter.moveNoun'),
    groups: MOVEMENT_FILTER_GROUPS,
    fields: MOVEMENT_FILTER_FIELDS.map((field) => {
        if (field.key === 'mwh') {
            return { ...field, optionLabel: (id) => t(`warehouse.${id}.name`) };
        }

        if (field.key === 'mitem') {
            return {
                ...field,
                optionLabel: (sku) => {
                    const hit = inventory.movements.find(
                        (move) => move.sku === sku,
                    );

                    return hit ? `${loc(hit.name)} · ${sku}` : String(sku);
                },
            };
        }

        return field;
    }),
}));

function clear() {
    view.mq = '';
    view.preset = 'all';
    view.from = '';
    view.to = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { mq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const cols = computed(() => [
    {
        k: 'when',
        label: t('inventory.movements.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => `${row.when.iso} ${row.when.time}`,
    },
    {
        k: 'kind',
        label: t('inventory.movements.col.kind'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('inventory.movements.col.item'), sortable: true },
    {
        k: 'batch',
        label: t('inventory.movements.col.batch'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'qty',
        label: t('inventory.movements.col.qty'),
        nowrap: true,
        sortable: true,
    },
    { k: 'ref', label: t('inventory.movements.col.ref'), nowrap: true },
    { k: 'by', label: t('inventory.movements.col.by') },
]);

const isOrderRef = (move) => ORDER_REF_KINDS.includes(move.kind);
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">
            {{ t('inventory.movements.note') }}
        </div>

        <DateRangeBar v-model="range" />

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('inventory.movements.count')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchBox
                v-model="view.mq"
                :placeholder="t('inventory.movements.search')"
                :width="340"
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
            :filters="view"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable :cols="cols" :rows="paged" row-key="id">
            <template #empty>
                <AEmpty
                    icon="list"
                    :title="t('inventory.movements.empty.title')"
                    :sub="t('inventory.movements.empty.sub')"
                />
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>
            <template #cell-kind="{ row }">
                {{ t(`stockMove.${row.kind}`) }}
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">{{ row.sku }}</div>
            </template>
            <template #cell-batch="{ row }">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open-batch', row.batch)"
                >
                    <ANum>{{ row.batch }}</ANum>
                </button>
            </template>
            <template #cell-qty="{ row }">
                <span class="num a-move-q" :class="{ 'is-out': row.qty < 0 }">
                    {{ row.qty > 0 ? '+' : '' }}{{ num(row.qty) }}
                </span>
                {{ t(`inventory.unit.${row.unit}`) }}
            </template>
            <template #cell-ref="{ row }">
                <RouterLink
                    v-if="isOrderRef(row)"
                    class="a-linkbtn"
                    :to="{ name: 'order', params: { id: row.ref } }"
                >
                    <ANum>{{ row.ref }}</ANum>
                </RouterLink>
                <button
                    v-else-if="row.kind === 'goods_in'"
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open-receipt', row.ref)"
                >
                    <ANum>{{ row.ref }}</ANum>
                </button>
                <span v-else class="a-muted">—</span>
            </template>
            <template #cell-by="{ row }">
                <template v-if="row.by">{{ loc(row.by) }}</template>
                <span v-else class="a-muted">
                    {{ t('inventory.movements.system') }}
                </span>
            </template>
        </ADataTable>

        <APagination
            v-model:page="view.pg"
            v-model:size="view.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="view"
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

.a-muted {
    color: var(--a-ink-4);
}

.a-move-q {
    font-weight: 700;
    color: var(--a-accent);
}

.a-move-q.is-out {
    color: var(--a-red);
}
</style>
