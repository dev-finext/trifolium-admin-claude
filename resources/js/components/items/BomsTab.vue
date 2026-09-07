<script setup>
// Bills of materials, listed by parent — and searchable by child, which is the
// question the warehouse actually asks: "which products is this herb in?"
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';

defineProps({
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open', 'open-item']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const store = useItemsStore();

const state = useUrlState({ bq: '' });

const itemName = (sku) => {
    const item = store.itemBySku(sku);

    return item
        ? loc({ he: item.names.he, en: item.names.en || item.names.he })
        : sku;
};

const rows = computed(() => {
    const term = state.bq.trim().toLowerCase();

    return store.boms
        .map((bom) => {
            const parent = store.itemBySku(bom.parentSku);
            const byParent =
                !term ||
                searchHaystack(
                    bom.name,
                    bom.cn,
                    parent?.names,
                    bom.parentSku,
                ).includes(term);
            const viaComponent = term
                ? bom.components.find((component) => {
                      const item = store.itemBySku(component.sku);

                      return searchHaystack(
                          item?.names,
                          component.sku,
                          item?.code,
                      ).includes(term);
                  })
                : null;

            return byParent || viaComponent
                ? {
                      ...bom,
                      parent,
                      via: !byParent && viaComponent ? viaComponent.sku : null,
                  }
                : null;
        })
        .filter(Boolean);
});

const cols = computed(() => [
    {
        k: 'parent',
        label: t('items.bom.col.parent'),
        sortable: true,
        sortValue: (row) => row.name.he,
    },
    { k: 'components', label: t('items.bom.col.components') },
    { k: 'alcohol', label: t('items.bom.col.alcohol'), nowrap: true },
    { k: 'oil', label: t('items.bom.col.oil'), nowrap: true },
    { k: 'ratio', label: t('items.bom.col.ratio'), nowrap: true },
    {
        k: 'updated',
        label: t('items.bom.col.updated'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.updated?.iso,
    },
]);
</script>

<template>
    <div>
        <div class="tab-head">
            <V2Badge id="bom" />
            <span class="t-sub">{{
                t('items.bom.sub', { n: store.boms.length })
            }}</span>
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('items.bom.count', { total: store.boms.length })"
            :dirty="Boolean(state.bq)"
            @clear="state.bq = ''"
        >
            <AInput
                v-model="state.bq"
                class="search"
                :placeholder="t('items.bom.search')"
            />
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="selected"
            @row="emit('open', $event.id)"
        >
            <template #cell-parent="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">
                    <span class="a-code a-tag">{{
                        row.parent?.code || row.parentSku
                    }}</span>
                    <span v-if="row.cn"> · {{ row.cn }}</span>
                </div>
                <AChip v-if="row.via" size="sm" tone="teal" :dot="false">
                    {{
                        t('items.bom.viaComponent', { name: itemName(row.via) })
                    }}
                </AChip>
            </template>
            <template #cell-components="{ row }">
                <div class="t-sub">
                    {{ t('items.bom.n', { n: row.components.length }) }}
                </div>
                <div class="comp-names">
                    {{ row.components.map((c) => itemName(c.sku)).join(' · ') }}
                </div>
            </template>
            <template #cell-alcohol="{ row }">
                <ANum v-if="row.alcoholPct != null"
                    >{{ num(row.alcoholPct) }}%</ANum
                >
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-oil="{ row }">
                <ANum v-if="row.oilPct != null">{{ num(row.oilPct) }}%</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-ratio="{ row }">
                <ANum v-if="row.ratio">{{ row.ratio }}</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-updated="{ row }">
                <ANum>{{ row.updated?.stamp }}</ANum>
                <div class="t-sub">{{ loc(row.updatedBy) }}</div>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.tab-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0 12px;
}

.search {
    width: 360px;
    max-width: 100%;
}

.comp-names {
    font-size: 13px;
    max-width: 420px;
}
</style>
