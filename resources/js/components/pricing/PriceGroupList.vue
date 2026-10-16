<script setup>
// The overview grid of pricing groups.
//
// The "items priced" figure is live resolution, not a stored count: every item
// in the catalogue is matched to the scale holding its item group, so adding a
// group to one scale moves the number on the screen at once. Zero is
// highlighted — a scale covering an item group that holds nothing.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { pctText, qtyText } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';
import { useItemsStore } from '@/stores/items';

defineProps({
    /** The groups that survived the screen's filters. */
    rows: { type: Array, default: () => [] },
    /** Id of the group whose editor is open. */
    selected: { type: String, default: null },
});

const emit = defineEmits(['row', 'edit', 'items', 'export', 'remove']);

const { t } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();
const itemsStore = useItemsStore();

const cols = computed(() => [
    { k: 'name', label: t('pricing.table.group'), w: '230px' },
    { k: 'uom', label: t('pricing.table.uom'), nowrap: true },
    { k: 'base', label: t('pricing.table.baseQty'), nowrap: true },
    { k: 'ladder', label: t('pricing.table.ladder') },
    { k: 'items', label: t('pricing.table.items'), nowrap: true },
    { k: 'upd', label: t('pricing.table.updated'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

const itemCount = (group) => catalog.itemsOfGroup(group.id).length;

/** One line that says how many bands the ladder has and where it tops out. */
function ladderText(group) {
    const top = catalog.topOfGroup(group);

    return t('pricing.table.bands', {
        n: group.breaks.length,
        pct: pctText(top?.pct || 0),
    });
}
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="id"
        :selected="selected"
        @row="emit('row', $event)"
    >
        <template #cell-name="{ row }">
            <div>
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="tp-chips tp-chips-pad">
                    <!-- The item groups' own names, in SAP's words. -->
                    <span
                        v-for="code in row.itemGroups"
                        :key="code"
                        class="tp-chip"
                        dir="auto"
                    >
                        {{ itemsStore.groupName(code) || code }}
                    </span>
                </div>
            </div>
        </template>

        <template #cell-uom="{ row }">
            <span v-if="row.uom">{{ t(`pricing.uom.${row.uom}`) }}</span>
            <span v-else class="tp-dim">—</span>
        </template>

        <template #cell-base="{ row }">
            <span class="tp-soft">
                {{
                    t('pricing.table.baseQtyValue', {
                        qty: qtyText(row.baseQty),
                        uom: row.uom ? t(`pricing.uom.${row.uom}`) : '',
                    })
                }}
            </span>
        </template>

        <template #cell-ladder="{ row }">
            <span class="tp-soft">{{ ladderText(row) }}</span>
        </template>

        <template #cell-items="{ row }">
            <button
                type="button"
                class="a-linkbtn num tp-count"
                :class="{ 'is-none': itemCount(row) === 0 }"
                :aria-label="
                    t('pricing.table.itemsAria', { name: loc(row.name) })
                "
                @click.stop="emit('items', row)"
            >
                {{ itemCount(row) }}
            </button>
        </template>

        <template #cell-upd="{ row }">
            <div class="tp-upd">
                <div class="tp-upd-when">
                    <ANum>{{ row.updated?.stamp }}</ANum>
                </div>
                <div v-if="row.updatedBy" class="tp-upd-by">
                    {{ t('pricing.table.by', { name: loc(row.updatedBy) }) }}
                </div>
            </div>
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton sm icon="edit" @click="emit('edit', row)">
                    {{ t('pricing.table.edit') }}
                </AButton>
                <AButton
                    sm
                    kind="ghost"
                    icon="download"
                    :title="
                        t('pricing.table.exportAria', { name: loc(row.name) })
                    "
                    :aria-label="
                        t('pricing.table.exportAria', { name: loc(row.name) })
                    "
                    @click="emit('export', row)"
                />
                <AButton
                    sm
                    kind="ghost"
                    icon="x"
                    :title="
                        t('pricing.table.deleteAria', { name: loc(row.name) })
                    "
                    :aria-label="
                        t('pricing.table.deleteAria', { name: loc(row.name) })
                    "
                    @click="emit('remove', row)"
                />
            </div>
        </template>

        <template #empty>
            <AEmpty
                icon="layers"
                :title="t('pricing.empty.filteredTitle')"
                :sub="t('pricing.empty.filteredSub')"
            />
        </template>
    </ADataTable>
</template>

<style scoped>
.tp-chips-pad {
    margin-top: 5px;
}

.tp-dim {
    color: var(--a-ink-4);
}

.tp-soft {
    color: var(--a-ink-3);
    font-size: 13.5px;
}

.tp-count {
    font-weight: 600;
    font-size: 15px;
}

.tp-count.is-none {
    color: var(--a-amber);
}

.tp-upd {
    font-size: 13.5px;
}

.tp-upd-when {
    color: var(--a-ink-3);
}

.tp-upd-by {
    color: var(--a-ink-4);
    margin-top: 2px;
}
</style>
