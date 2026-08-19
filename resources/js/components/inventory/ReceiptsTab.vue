<script setup>
// Goods receipts. There are no purchase orders in this console: a receipt
// records the supplier's name and delivery-note number as plain data, and the
// batches it opened are the link to everything downstream.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { searchHaystack } from '@/lib/localized';
import { optionKey, useInventoryStore } from '@/stores/inventory';

/**
 * The ranges a goods-receipt question is asked in: the past week, the past
 * month, the past quarter.
 */
const RECEIPT_WINDOWS = [7, 30, 90];

defineProps({
    /** The receipt whose drawer is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open-receipt', 'open-batch', 'new-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const view = useUrlState({ rq: '', rsup: '', rby: '', rwin: '' });

const term = computed(() => view.rq.trim().toLowerCase());

const rows = computed(() =>
    inventory.receipts.filter(
        (receipt) =>
            (!view.rwin || receipt.when.daysAgo <= Number(view.rwin)) &&
            (!view.rsup || optionKey(receipt.supplier) === view.rsup) &&
            (!view.rby || optionKey(receipt.by) === view.rby) &&
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

const dirty = computed(
    () =>
        Boolean(view.rq) ||
        Boolean(view.rsup) ||
        Boolean(view.rby) ||
        Boolean(view.rwin),
);

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

function clear() {
    view.rq = '';
    view.rsup = '';
    view.rby = '';
    view.rwin = '';
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">
            {{ t('inventory.receipts.note') }}
        </div>

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
            <select
                v-model="view.rsup"
                class="a-select"
                :aria-label="t('inventory.receipts.aria.supplier')"
            >
                <option value="">
                    {{ t('inventory.receipts.filter.supplier') }}
                </option>
                <option
                    v-for="supplier in inventory.receiptSuppliers"
                    :key="supplier.key"
                    :value="supplier.key"
                >
                    {{
                        t('inventory.receipts.filter.option', {
                            name: loc(supplier.label),
                            n: supplier.n,
                        })
                    }}
                </option>
            </select>
            <select
                v-model="view.rby"
                class="a-select"
                :aria-label="t('inventory.receipts.aria.by')"
            >
                <option value="">
                    {{ t('inventory.receipts.filter.by') }}
                </option>
                <option
                    v-for="person in inventory.receiptReceivers"
                    :key="person.key"
                    :value="person.key"
                >
                    {{
                        t('inventory.receipts.filter.option', {
                            name: loc(person.label),
                            n: person.n,
                        })
                    }}
                </option>
            </select>
            <select
                v-model="view.rwin"
                class="a-select"
                :aria-label="t('inventory.receipts.aria.window')"
            >
                <option value="">
                    {{ t('inventory.receipts.filter.window') }}
                </option>
                <option
                    v-for="days in RECEIPT_WINDOWS"
                    :key="days"
                    :value="String(days)"
                >
                    {{ t('inventory.receipts.filter.days', { n: days }) }}
                </option>
            </select>
            <AButton sm kind="p" icon="plus" @click="emit('new-receipt')">
                {{ t('inventory.action.newReceipt') }}
            </AButton>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
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
