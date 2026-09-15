<script setup>
// Which items a group prices, and what the ladder does to each of them.
//
// Answering this from the items collection — an explicit assignment on the
// item first, then the longest matching prefix — is what makes the count on
// the overview agree with the price group shown on every item card.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ils, num } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';

const props = defineProps({
    /** The group whose items are listed, or null while closed. */
    group: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();

const items = computed(() =>
    props.group ? catalog.itemsOfGroup(props.group.id) : [],
);

const top = computed(() =>
    props.group ? catalog.topOfGroup(props.group) : null,
);

const cols = computed(() => [
    { k: 'code', label: t('pricing.itemsDrawer.col.code'), nowrap: true },
    { k: 'name', label: t('pricing.itemsDrawer.col.name') },
    { k: 'uom', label: t('pricing.itemsDrawer.col.uom'), nowrap: true },
    {
        k: 'price',
        label: t('pricing.itemsDrawer.col.unitPrice'),
        nowrap: true,
    },
    {
        k: 'base',
        label: t('pricing.itemsDrawer.col.atBase', {
            qty: num(props.group?.baseQty || 0),
        }),
        nowrap: true,
    },
    {
        k: 'top',
        label: t('pricing.itemsDrawer.col.atTop', {
            qty: num(top.value?.from || 0),
        }),
        nowrap: true,
    },
    {
        k: 'how',
        label: t('pricing.itemsDrawer.col.assignment'),
        nowrap: true,
    },
]);

const unitPrice = (item) => catalog.unitPriceOf(item);

function priceAtTop(item) {
    return top.value
        ? catalog.priceForItem(item, top.value.from)
        : unitPrice(item);
}
</script>

<template>
    <ADrawer :open="Boolean(group)" @close="emit('close')">
        <template #header>
            <div class="a-dhead-top">
                <div>
                    <div class="a-dhead-t">
                        <h2 class="ig-title">
                            {{
                                t('pricing.itemsDrawer.title', {
                                    name: group ? loc(group.name) : '',
                                })
                            }}
                        </h2>
                    </div>
                    <div class="a-dhead-m">
                        {{ t('pricing.itemsDrawer.sub', { n: items.length }) }}
                    </div>
                </div>
                <div class="a-dhead-a">
                    <AButton kind="ghost" icon="x" @click="emit('close')">
                        {{ t('pricing.itemsDrawer.close') }}
                    </AButton>
                </div>
            </div>
        </template>

        <ADataTable :cols="cols" :rows="items" row-key="sku">
            <template #cell-code="{ row }">
                <button
                    type="button"
                    class="a-linkbtn"
                    :title="t('pricing.itemsDrawer.open')"
                    @click="emit('open-item', row.sku)"
                >
                    <ANum>{{ row.sku }}</ANum>
                </button>
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">
                    {{ loc(row.names?.he || row.names) }}
                </div>
            </template>
            <template #cell-uom="{ row }">
                <span v-if="row.uom?.sales">
                    {{ t(`items.uom.${row.uom.sales}`) }}
                </span>
                <AChip
                    v-if="catalog.uomMismatch(row)"
                    tone="amber"
                    size="sm"
                    class="ig-gap"
                >
                    {{ t('pricing.itemsDrawer.uomMismatch') }}
                </AChip>
            </template>
            <template #cell-price="{ row }">
                <span v-if="unitPrice(row) != null" class="num">
                    {{ ils(unitPrice(row), 2) }}
                </span>
                <span v-else class="ig-dim">
                    {{ t('pricing.itemsDrawer.noPrice') }}
                </span>
            </template>
            <template #cell-base="{ row }">
                <span v-if="unitPrice(row) != null" class="num">
                    {{ ils(unitPrice(row), 2) }}
                </span>
                <span v-else class="ig-dim">—</span>
            </template>
            <template #cell-top="{ row }">
                <span v-if="unitPrice(row) != null" class="num">
                    {{ ils(priceAtTop(row), 2) }}
                </span>
                <span v-else class="ig-dim">—</span>
            </template>
            <template #cell-how="{ row }">
                <AChip
                    :tone="row.priceGroup ? 'blue' : 'gray'"
                    size="sm"
                    :dot="false"
                >
                    {{
                        row.priceGroup
                            ? t('pricing.itemsDrawer.assignment.explicit')
                            : t('pricing.itemsDrawer.assignment.default')
                    }}
                </AChip>
            </template>
            <template #empty>
                <AEmpty
                    icon="tag"
                    :title="t('pricing.itemsDrawer.empty')"
                    :sub="t('pricing.itemsDrawer.emptySub')"
                />
            </template>
        </ADataTable>
    </ADrawer>
</template>

<style scoped>
.ig-title {
    margin: 0;
    font-size: 21px;
    font-weight: 700;
}

.ig-dim {
    color: var(--a-ink-4);
}

.ig-gap {
    margin-inline-start: 6px;
}
</style>
