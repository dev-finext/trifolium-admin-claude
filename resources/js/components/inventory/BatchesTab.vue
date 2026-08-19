<script setup>
// Batches and expiry.
//
// A batch is the unit of traceability: it carries the supplier, the delivery it
// arrived on, its own expiry date and what is left of it. Its state follows from
// those two numbers — inside BATCH_EXPIRY_WARN_DAYS of expiry it is `expiring`,
// past the date `expired` and blocked from compounding.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BatchPickPanel from '@/components/inventory/BatchPickPanel.vue';
import SearchBox from '@/components/inventory/SearchBox.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    BATCH_EXPIRY_WARN_DAYS,
    BATCH_STATE_IDS,
    BATCH_STATES,
    WAREHOUSES,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/**
 * The expiry windows the filter offers, in days. The wide one is the warning
 * window itself; the narrow one is the month ahead, which is the horizon the lab
 * plans a week of compounding against.
 */
const NEAR_EXPIRY_DAYS = 30;
const EXPIRY_WINDOWS = [NEAR_EXPIRY_DAYS, BATCH_EXPIRY_WARN_DAYS];

defineProps({
    /** The batch whose trace drawer is open, so its row reads as selected. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open-batch', 'open-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const view = useUrlState({
    bq: '',
    bstate: '',
    bexp: '',
    bwh: '',
    pick: '',
    pickQty: '',
});

const states = computed(() =>
    BATCH_STATE_IDS.map((id) => ({ value: id, label: t(`batchState.${id}`) })),
);

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        value: warehouse.id,
        label: t(`warehouse.${warehouse.id}.name`),
    })),
);

const term = computed(() => view.bq.trim().toLowerCase());

function inWindow(batch) {
    if (!view.bexp) {
        return true;
    }

    if (view.bexp === 'past') {
        return batch.daysToExp < 0;
    }

    const days = Number(view.bexp);

    return batch.daysToExp >= 0 && batch.daysToExp < days;
}

const rows = computed(() =>
    inventory.batches.filter(
        (batch) =>
            (!view.bstate || batch.state === view.bstate) &&
            (!view.bwh || batch.wh === view.bwh) &&
            inWindow(batch) &&
            (!term.value ||
                searchHaystack(
                    batch.id,
                    batch.name,
                    batch.sku,
                    batch.supplier,
                    batch.receipt,
                ).includes(term.value)),
    ),
);

const dirty = computed(
    () =>
        Boolean(view.bq) ||
        Boolean(view.bstate) ||
        Boolean(view.bexp) ||
        Boolean(view.bwh),
);

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

function expiryNote(batch) {
    return batch.daysToExp < 0
        ? t('inventory.batches.expiredAgo', { n: -batch.daysToExp })
        : t('inventory.batches.expiresIn', { n: batch.daysToExp });
}

function clear() {
    view.bq = '';
    view.bstate = '';
    view.bexp = '';
    view.bwh = '';
}

function showAll() {
    view.bstate = '';
    view.bexp = '';
}

function onState(state) {
    view.bstate = view.bstate === state ? '' : state;
    view.bexp = '';
}

/** The two filters answer the same question, so one always clears the other. */
function onWindow(value) {
    view.bexp = value;

    if (value) {
        view.bstate = '';
    }
}
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
                :active="!view.bstate && !view.bexp"
                :label="t('inventory.batches.kpi.all')"
                :value="inventory.batches.length"
                :sub="t('inventory.batches.kpi.allSub')"
                @click="showAll"
            />
            <FilterKpi
                icon="clock"
                :active="view.bstate === 'expiring'"
                :label="t('inventory.batches.kpi.expiring')"
                :value="inventory.expiringBatches.length"
                :sub="
                    t('inventory.batches.kpi.expiringSub', {
                        days: BATCH_EXPIRY_WARN_DAYS,
                    })
                "
                @click="onState('expiring')"
            />
            <FilterKpi
                icon="alert"
                :active="view.bstate === 'expired'"
                :label="t('inventory.batches.kpi.expired')"
                :value="inventory.expiredBatches.length"
                :sub="t('inventory.batches.kpi.expiredSub')"
                @click="onState('expired')"
            />
        </div>

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
            <select
                v-model="view.bstate"
                class="a-select"
                :aria-label="t('inventory.batches.aria.state')"
            >
                <option value="">
                    {{ t('inventory.batches.filter.state') }}
                </option>
                <option
                    v-for="state in states"
                    :key="state.value"
                    :value="state.value"
                >
                    {{ state.label }}
                </option>
            </select>
            <select
                class="a-select"
                :value="view.bexp"
                :aria-label="t('inventory.batches.aria.expiry')"
                @change="onWindow($event.target.value)"
            >
                <option value="">
                    {{ t('inventory.batches.filter.expiry') }}
                </option>
                <option
                    v-for="days in EXPIRY_WINDOWS"
                    :key="days"
                    :value="String(days)"
                >
                    {{ t('inventory.batches.filter.days', { n: days }) }}
                </option>
                <option value="past">
                    {{ t('inventory.batches.filter.past') }}
                </option>
            </select>
            <select
                v-model="view.bwh"
                class="a-select"
                :aria-label="t('inventory.batches.aria.wh')"
            >
                <option value="">{{ t('inventory.batches.filter.wh') }}</option>
                <option
                    v-for="warehouse in warehouses"
                    :key="warehouse.value"
                    :value="warehouse.value"
                >
                    {{ warehouse.label }}
                </option>
            </select>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
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

        <BatchPickPanel
            v-model:sku="view.pick"
            v-model:qty="view.pickQty"
            controls
            approval
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
</style>
