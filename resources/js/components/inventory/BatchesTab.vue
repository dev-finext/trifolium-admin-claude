<script setup>
// Batches and expiry.
//
// A batch is the unit of traceability: it carries the supplier, the delivery it
// arrived on, its own expiry date and what is left of it. Its state follows from
// those two numbers — inside BATCH_EXPIRY_WARN_DAYS of expiry it is `expiring`,
// past the date `expired` and blocked from compounding.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BatchDatesModal from '@/components/inventory/BatchDatesModal.vue';
import BatchSettingsCard from '@/components/inventory/BatchSettingsCard.vue';
import RefLink from '@/components/inventory/RefLink.vue';
import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
    useSorted,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { BATCH_EXPIRY_WARN_DAYS, BATCH_STATES } from '@/config';
import { fmtISO } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import {
    BATCH_FILTER_FIELDS,
    BATCH_FILTER_GROUPS,
    useInventoryStore,
} from '@/stores/inventory';

defineProps({
    /** The batch whose trace drawer is open, so its row reads as selected. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open-batch', 'open-ref']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const SPEC = { fields: BATCH_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    bq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const term = computed(() => view.bq.trim().toLowerCase());

const searched = computed(() =>
    term.value
        ? inventory.batches.filter((batch) =>
              searchHaystack(
                  batch.id,
                  batch.number,
                  batch.name,
                  batch.sku,
                  batch.supplier,
                  batch.receipt,
              ).includes(term.value),
          )
        : inventory.batches,
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const dirty = computed(() => filters.dirty || Boolean(view.bq));

const spec = computed(() => ({
    id: 'batches',
    ns: 'inventory',
    noun: t('inventory.filter.batchNoun'),
    groups: BATCH_FILTER_GROUPS,
    fields: BATCH_FILTER_FIELDS.map((field) => {
        if (field.key === 'bwh') {
            return { ...field, optionLabel: (id) => t(`warehouse.${id}.name`) };
        }

        if (field.key === 'bitem') {
            return {
                ...field,
                optionLabel: (sku) => {
                    const hit = inventory.batches.find(
                        (batch) => batch.sku === sku,
                    );

                    return hit ? `${loc(hit.name)} · ${sku}` : String(sku);
                },
            };
        }

        return field;
    }),
}));

function clear() {
    view.bq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { bq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

/**
 * How long until the batch expires, or how long since it did. A batch SAP
 * holds with no expiry says so, rather than "expires in 0 days".
 */
function expiryNote(batch) {
    if (!Number.isFinite(batch.daysToExp)) {
        return t('inventory.batches.noExpiry');
    }

    return batch.daysToExp < 0
        ? t('inventory.batches.expiredAgo', { n: -batch.daysToExp })
        : t('inventory.batches.expiresIn', { n: batch.daysToExp });
}

const cols = computed(() => [
    {
        k: 'id',
        label: t('inventory.batches.col.id'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('inventory.batches.col.name'), sortable: true },
    { k: 'supplier', label: t('inventory.batches.col.supplier') },
    {
        k: 'qty',
        label: t('inventory.batches.col.qty'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.remaining,
    },
    {
        k: 'expiry',
        label: t('inventory.batches.col.expiry'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.daysToExp,
    },
    {
        k: 'state',
        label: t('inventory.batches.col.state'),
        nowrap: true,
        sortable: true,
    },
    { k: 'receipt', label: t('inventory.batches.col.receipt'), nowrap: true },
    {
        k: 'use',
        label: t('inventory.batches.col.use'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => inventory.useOfBatch(row.id).length,
    },
]);

const { sort, sorted } = useSorted(rows, view, () => cols.value);

/** The batch whose dates are being corrected, straight from its row. */
const dating = ref(null);
const { paged, total } = usePaged(sorted, view);
</script>

<template>
    <div class="a-grid a-tabbody">
        <p class="a-batch-dash">
            {{
                t('inventory.batches.dash', {
                    all: inventory.batches.length,
                    expiring: inventory.expiringBatches.length,
                    expired: inventory.expiredBatches.length,
                    days: BATCH_EXPIRY_WARN_DAYS,
                })
            }}
        </p>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('inventory.batches.count')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchBox
                v-model="view.bq"
                :placeholder="t('inventory.batches.search')"
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

        <ADataTable
            :cols="cols"
            :rows="paged"
            v-model:sort="sort"
            row-key="id"
            :selected="selected"
            @row="emit('open-batch', $event.id)"
        >
            <template #empty>
                <AEmpty
                    icon="layers"
                    :title="t('inventory.batches.empty.title')"
                    :sub="t('inventory.batches.empty.sub')"
                />
            </template>

            <template #cell-id="{ row }">
                <span class="t-strong num">{{ inventory.batchNo(row) }}</span>
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">{{ row.sku }}</div>
            </template>
            <template #cell-supplier="{ row }">
                <div>{{ loc(row.supplier) }}</div>
                <div
                    v-if="
                        row.supplierBatch &&
                        row.supplierBatch !== inventory.batchNo(row)
                    "
                    class="t-sub ltr"
                >
                    {{ row.supplierBatch }}
                </div>
            </template>
            <template #cell-qty="{ row }">
                <ANum>{{ num(row.remaining) }}</ANum>
                <span class="a-muted">
                    / {{ num(row.qty) }}
                    {{ t(`inventory.unit.${row.unit}`) }}
                </span>
            </template>
            <template #cell-expiry="{ row }">
                <span class="bt-exp">
                    <ANum v-if="row.expiry">{{ fmtISO(row.expiry) }}</ANum>
                    <span v-else class="a-muted">—</span>
                    <AButton
                        sm
                        kind="ghost"
                        icon="edit"
                        :title="t('inventory.batches.dates.editShort')"
                        :aria-label="t('inventory.batches.dates.editShort')"
                        @click.stop="dating = row"
                    />
                </span>
                <div class="t-sub">{{ expiryNote(row) }}</div>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="BATCH_STATES[row.state]?.tone">
                    {{ t(`batchState.${row.state}`) }}
                </AChip>
            </template>
            <template #cell-receipt="{ row }">
                <!-- The document the batch came in on: its goods receipt, or
                     for a batch the pharmacy made, the production order. A
                     real batch whose receipt the extract does not join to has
                     neither, and shows a dash. -->
                <RefLink
                    :id="row.receipt || row.production"
                    @open="emit('open-ref', $event)"
                />
            </template>
            <template #cell-use="{ row }">
                <ANum>{{ inventory.useOfBatch(row.id).length }}</ANum>
            </template>
        </ADataTable>

        <BatchDatesModal :batch="dating" @close="dating = null" />

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

        <BatchSettingsCard />
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.a-muted {
    color: var(--a-ink-4);
}

.a-batch-dash {
    margin: 0;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.bt-exp {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}
</style>
