<script setup>
// Batches and expiry.
//
// A batch is the unit of traceability: it carries the supplier, the delivery it
// arrived on, its own expiry date and what is left of it. Its state follows from
// those two numbers — inside BATCH_EXPIRY_WARN_DAYS of expiry it is `expiring`,
// past the date `expired` and blocked from compounding.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BatchPickPanel from '@/components/inventory/BatchPickPanel.vue';
import BatchSettingsCard from '@/components/inventory/BatchSettingsCard.vue';
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

const emit = defineEmits(['open-batch', 'open-receipt']);

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
    pick: '',
    pickQty: '',
});

const term = computed(() => view.bq.trim().toLowerCase());

const searched = computed(() =>
    term.value
        ? inventory.batches.filter((batch) =>
              searchHaystack(
                  batch.id,
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

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.bq));

/** The two warning tiles are values of the state field. */
const stateOnly = (id) => view.bstate.length === 1 && view.bstate[0] === id;

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
</script>

<template>
    <div class="a-grid a-tabbody">
        <div
            v-if="
                inventory.expiringBatches.length +
                inventory.expiredBatches.length
            "
            class="a-note a-note--warn"
        >
            <strong>
                {{
                    t('inventory.batches.warn', {
                        expiring: inventory.expiringBatches.length,
                        expired: inventory.expiredBatches.length,
                    })
                }}
            </strong>
            {{ t('inventory.batches.warnBody') }}
        </div>
        <div v-else class="a-note a-note--ok">
            {{ t('inventory.batches.ok') }}
        </div>

        <div class="a-kpis">
            <FilterKpi
                icon="layers"
                :active="!filters.dirty"
                :label="t('inventory.batches.kpi.all')"
                :value="inventory.batches.length"
                :sub="t('inventory.batches.kpi.allSub')"
                @click="filters.clear"
            />
            <FilterKpi
                icon="clock"
                :active="stateOnly('expiring')"
                :label="t('inventory.batches.kpi.expiring')"
                :value="inventory.expiringBatches.length"
                :sub="
                    t('inventory.batches.kpi.expiringSub', {
                        days: BATCH_EXPIRY_WARN_DAYS,
                    })
                "
                @click="filters.toggle('bstate', 'expiring')"
            />
            <FilterKpi
                icon="alert"
                :active="stateOnly('expired')"
                :label="t('inventory.batches.kpi.expired')"
                :value="inventory.expiredBatches.length"
                :sub="t('inventory.batches.kpi.expiredSub')"
                @click="filters.toggle('bstate', 'expired')"
            />
        </div>

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
                <span class="t-strong num">{{ row.id }}</span>
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">{{ row.sku }}</div>
            </template>
            <template #cell-supplier="{ row }">
                <div>{{ loc(row.supplier) }}</div>
                <div v-if="row.supplierBatch" class="t-sub ltr">
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
                <ANum>{{ fmtISO(row.expiry) }}</ANum>
                <div class="t-sub">{{ expiryNote(row) }}</div>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="BATCH_STATES[row.state]?.tone">
                    {{ t(`batchState.${row.state}`) }}
                </AChip>
            </template>
            <template #cell-receipt="{ row }">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open-receipt', row.receipt)"
                >
                    <ANum>{{ row.receipt }}</ANum>
                </button>
            </template>
            <template #cell-use="{ row }">
                <ANum>{{ inventory.useOfBatch(row.id).length }}</ANum>
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

        <BatchPickPanel
            v-model:sku="view.pick"
            v-model:qty="view.pickQty"
            controls
            approval
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
</style>
