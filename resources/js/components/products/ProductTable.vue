<script setup>
// The shelf-product grid.
//
// The consumer price column is derived, never stored: it is the net price put
// through priceParts(), which is the same arithmetic the practitioner catalogue
// uses. Editing a price in one place therefore moves every figure on the screen.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ProductThumb from '@/components/products/ProductThumb.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { DEFAULT_MIN_STOCK } from '@/config';
import { ils, priceParts } from '@/lib/money';
import { isBlockedForSale } from '@/stores/catalog';

defineProps({
    rows: { type: Array, default: () => [] },
    /** The whole label taxonomy, to resolve each product's label ids. */
    labels: { type: Array, default: () => [] },
    /** Id of the product whose drawer is open. */
    selected: { type: String, default: null },
    /** False only when the catalogue itself is empty, not the filter result. */
    hasAny: { type: Boolean, default: true },
});

const emit = defineEmits(['row', 'edit', 'archive', 'restore', 'new', 'clear']);

const { t } = useI18n();
const { loc } = useLocalized();

const grossOf = (row) => priceParts(row.net).display;
const minOf = (row) =>
    row.minStock == null ? DEFAULT_MIN_STOCK : row.minStock;
const stockOf = (row) => (row.stock == null ? 0 : row.stock);

const cols = computed(() => [
    { k: 'img', label: t('products.table.image'), w: '76px' },
    { k: 'name', label: t('products.table.name'), sortable: true },
    {
        k: 'sku',
        label: t('products.table.sku'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'net',
        label: t('products.table.net'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'gross',
        label: t('products.table.gross'),
        nowrap: true,
        sortable: true,
        sortValue: grossOf,
    },
    {
        k: 'w',
        label: t('products.table.weight'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.wVal,
    },
    {
        k: 'stock',
        label: t('products.table.stock'),
        nowrap: true,
        sortable: true,
        sortValue: stockOf,
    },
    { k: 'act', label: '', nowrap: true },
]);
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="id"
        :selected="selected"
        @row="emit('row', $event)"
    >
        <template #cell-img="{ row }">
            <ProductThumb :img="row.img" />
        </template>

        <template #cell-name="{ row }">
            <div class="t-strong">{{ loc(row.name) }}</div>
            <div class="t-sub">{{ loc(row.content) }}</div>
        </template>

        <template #cell-sku="{ row }">
            <span class="num ltr">{{ row.sku }}</span>
        </template>

        <template #cell-net="{ row }">
            <span class="num">{{ ils(row.net) }}</span>
        </template>

        <template #cell-gross="{ row }">
            <span class="num a-price-main">{{ ils(grossOf(row), 0) }}</span>
        </template>

        <template #cell-w="{ row }">
            <span v-if="row.wUom" class="a-weight">
                <ANum>{{ row.wVal }}</ANum>
                {{ t(`products.unit.${row.wUom}`) }}
            </span>
            <span v-else class="t-sub">{{ t('products.noWeight') }}</span>
        </template>

        <template #cell-stock="{ row }">
            <div
                class="num a-stockn"
                :class="{ 'is-bad': isBlockedForSale(row) }"
            >
                {{ stockOf(row) }}
            </div>
            <div class="t-sub">
                <AChip v-if="isBlockedForSale(row)" tone="red" size="sm">
                    {{ t('products.table.belowMin', { n: minOf(row) }) }}
                </AChip>
                <template v-else>
                    {{ t('products.table.minStock', { n: minOf(row) }) }}
                </template>
            </div>
        </template>

        <template #cell-act="{ row }">
            <!-- Row actions must not also open the drawer the row click opens. -->
            <div class="a-rowbtns" @click.stop>
                <AButton
                    v-if="row.status !== 'archived'"
                    sm
                    icon="edit"
                    @click="emit('edit', row)"
                >
                    {{ t('products.table.edit') }}
                </AButton>
                <AButton
                    v-if="row.status === 'archived'"
                    sm
                    icon="refresh"
                    @click="emit('restore', row)"
                >
                    {{ t('products.table.restore') }}
                </AButton>
                <AButton
                    v-else
                    sm
                    icon="trash"
                    class="a-btn--archive"
                    @click="emit('archive', row)"
                >
                    {{ t('products.table.archive') }}
                </AButton>
            </div>
        </template>

        <template #empty>
            <AEmpty
                v-if="!hasAny"
                icon="package"
                :title="t('products.empty.noneTitle')"
                :sub="t('products.empty.noneSub')"
            >
                <template #action>
                    <AButton kind="p" icon="plus" @click="emit('new')">
                        {{ t('products.actions.newProduct') }}
                    </AButton>
                </template>
            </AEmpty>
            <AEmpty
                v-else
                icon="search"
                :title="t('products.empty.filteredTitle')"
                :sub="t('products.empty.filteredSub')"
            >
                <template #action>
                    <AButton icon="x" @click="emit('clear')">
                        {{ t('ui.clearFilter') }}
                    </AButton>
                </template>
            </AEmpty>
        </template>
    </ADataTable>
</template>

<style scoped>
.a-weight {
    color: var(--a-ink-3);
}

.a-stockn {
    font-size: 15.5px;
    font-weight: 700;
}

.a-stockn.is-bad {
    color: var(--a-red);
}
</style>
