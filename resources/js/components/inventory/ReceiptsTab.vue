<script setup>
// Goods receipts. There are no purchase orders in this console: a receipt
// records the supplier's name and delivery-note number as plain data, and the
// batches it opened are the link to everything downstream.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
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
import {
    optionKey,
    RECEIPT_FILTER_FIELDS,
    RECEIPT_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';

defineProps({
    /** The receipt whose drawer is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open-receipt', 'open-batch', 'new-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const SPEC = { fields: RECEIPT_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    rq: '',
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

const term = computed(() => view.rq.trim().toLowerCase());

const searched = computed(() =>
    inventory.receipts.filter(
        (receipt) =>
            inRange(receipt.when.iso, range.value) &&
            (!term.value ||
                searchHaystack(
                    receipt.id,
                    receipt.supplier,
                    receipt.docNum,
                    receipt.batches,
                    receipt.by,
                ).includes(term.value)),
    ),
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(
    () => filters.dirty || Boolean(view.rq) || Boolean(view.from || view.to),
);

const spec = computed(() => ({
    id: 'receipts',
    ns: 'inventory',
    noun: t('inventory.filter.receiptNoun'),
    groups: RECEIPT_FILTER_GROUPS,
    fields: RECEIPT_FILTER_FIELDS.map((field) => {
        if (field.key === 'rsup' || field.key === 'rby') {
            return {
                ...field,
                optionLabel: (key) => {
                    const hit = inventory.receipts.find(
                        (receipt) =>
                            optionKey(
                                field.key === 'rsup'
                                    ? receipt.supplier
                                    : receipt.by,
                            ) === key,
                    );

                    return hit
                        ? loc(field.key === 'rsup' ? hit.supplier : hit.by)
                        : String(key);
                },
            };
        }

        return field;
    }),
}));

function clear() {
    view.rq = '';
    view.preset = 'all';
    view.from = '';
    view.to = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { rq: '' }, patch);
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
        k: 'id',
        label: t('inventory.receipts.col.id'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'supplier',
        label: t('inventory.receipts.col.supplier'),
        sortable: true,
    },
    {
        k: 'lines',
        label: t('inventory.receipts.col.lines'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.lines.length,
    },
    { k: 'batches', label: t('inventory.receipts.col.batches') },
    {
        k: 'when',
        label: t('inventory.receipts.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.when.iso,
    },
    { k: 'by', label: t('inventory.receipts.col.by') },
    { k: 'note', label: t('inventory.receipts.col.note') },
]);
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">
            {{ t('inventory.receipts.note') }}
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
            :label="
                t('inventory.receipts.count', {
                    total: inventory.receipts.length,
                })
            "
            :dirty="dirty"
            @clear="clear"
        >
            <SearchBox
                v-model="view.rq"
                :placeholder="t('inventory.receipts.search')"
                :width="360"
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

        <ADataTable
            :cols="cols"
            :rows="paged"
            row-key="id"
            :selected="selected"
            @row="emit('open-receipt', $event.id)"
        >
            <template #empty>
                <AEmpty
                    icon="package"
                    :title="t('inventory.receipts.empty.title')"
                    :sub="t('inventory.receipts.empty.sub')"
                />
            </template>

            <template #cell-id="{ row }">
                <span class="t-strong num">{{ row.id }}</span>
            </template>
            <template #cell-supplier="{ row }">
                <div class="t-strong">{{ loc(row.supplier) }}</div>
                <div class="t-sub">
                    {{ t('inventory.receipts.docNum', { n: row.docNum }) }}
                </div>
            </template>
            <template #cell-lines="{ row }">
                <ANum>{{ row.lines.length }}</ANum>
            </template>
            <template #cell-batches="{ row }">
                <span class="a-batchchips">
                    <button
                        v-for="id in row.batches"
                        :key="id"
                        type="button"
                        class="a-batchbtn"
                        @click.stop="emit('open-batch', id)"
                    >
                        <AChip tone="teal" size="sm" :dot="false">
                            <span class="num">{{ id }}</span>
                        </AChip>
                    </button>
                </span>
            </template>
            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>
            <template #cell-by="{ row }">{{ loc(row.by) }}</template>
            <template #cell-note="{ row }">
                <template v-if="row.note">{{ loc(row.note) }}</template>
                <span v-else class="a-muted">—</span>
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

.a-batchchips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.a-batchbtn {
    border: 0;
    padding: 0;
    background: none;
    font: inherit;
}
</style>
