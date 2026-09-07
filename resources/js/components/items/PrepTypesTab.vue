<script setup>
// The managed list of preparation types: SAP's seventeen, each with what a label
// needs — the fixed text, the default shelf life, what it contains — editable
// here rather than a constant in code, exactly as the labels specification asked.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useItemsStore } from '@/stores/items';

const emit = defineEmits(['edit']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const cols = computed(() => [
    {
        k: 'name',
        label: t('items.prep.col.name'),
        sortable: true,
        sortValue: (row) => row.name.he,
    },
    { k: 'unit', label: t('items.prep.col.unit'), nowrap: true },
    {
        k: 'expiry',
        label: t('items.prep.col.expiry'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.expiryMonths,
    },
    { k: 'labelText', label: t('items.prep.col.labelText') },
    { k: 'contains', label: t('items.prep.col.contains') },
    { k: 'recipe', label: t('items.prep.col.recipe'), nowrap: true },
    { k: 'legacy', label: t('items.prep.col.legacy'), nowrap: true },
    { k: 'act', label: t('items.prep.col.actions'), nowrap: true },
]);

/** How many items are offered for each type — the number that says what a change touches. */
function usage(id) {
    return store.items.filter((item) => (item.prepTypes || []).includes(id))
        .length;
}
</script>

<template>
    <div>
        <div class="tab-head">
            <V2Badge id="prep-types" />
            <span class="t-sub">{{
                t('items.prep.sub', { n: store.prepTypes.length })
            }}</span>
        </div>

        <ADataTable
            :cols="cols"
            :rows="store.prepTypes"
            row-key="id"
            @row="emit('edit', $event)"
        >
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub ltr">
                    {{ row.id }} ·
                    {{ t('items.prep.usage', { n: usage(row.id) }) }}
                </div>
            </template>
            <template #cell-unit="{ row }">{{
                t(`items.uom.${row.unit}`)
            }}</template>
            <template #cell-expiry="{ row }">
                {{ t('items.prep.months', { n: row.expiryMonths }) }}
            </template>
            <template #cell-labelText="{ row }">
                <span v-if="row.labelText">{{ loc(row.labelText) }}</span>
                <span v-else class="t-sub">{{
                    t('items.prep.noLabelText')
                }}</span>
            </template>
            <template #cell-contains="{ row }">
                <span v-if="row.contains.length" class="chips">
                    <AChip
                        v-for="id in row.contains"
                        :key="id"
                        size="sm"
                        :dot="false"
                    >
                        {{ t(`items.prep.contains.${id}`) }}
                    </AChip>
                </span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-recipe="{ row }">
                <span v-if="row.recipe.length">{{
                    t('items.prep.recipeSteps', { n: row.recipe.length })
                }}</span>
                <span v-else class="t-sub">{{ t('items.prep.noRecipe') }}</span>
            </template>
            <template #cell-legacy="{ row }">
                <AChip v-if="row.legacy" size="sm" tone="gray" :dot="false">{{
                    t('items.prep.legacyYes')
                }}</AChip>
                <AChip v-else size="sm" tone="teal" :dot="false">{{
                    t('items.prep.legacyNo')
                }}</AChip>
            </template>
            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <AButton sm icon="edit" @click.stop="emit('edit', row)">
                        {{ t('items.action.editPrep') }}
                    </AButton>
                </div>
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

.chips {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}
</style>
