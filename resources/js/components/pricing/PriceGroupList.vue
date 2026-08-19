<script setup>
// The overview grid of pricing groups.
//
// The "SKUs assigned" figure is live resolution, not a stored count: every SKU
// in the ingredient catalogue is resolved against all groups, so a prefix edit
// in one group moves the number shown on another. Zero is highlighted — a group
// that prices nothing is usually a typo in its prefixes.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ils } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';

defineProps({
    /** The groups that survived the screen's filters. */
    rows: { type: Array, default: () => [] },
    /** Id of the group whose editor is open. */
    selected: { type: String, default: null },
});

const emit = defineEmits(['row', 'edit', 'export', 'remove']);

const { t } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();

const cols = computed(() => [
    { k: 'name', label: t('pricing.table.group'), w: '250px' },
    { k: 'uom', label: t('pricing.table.uom'), nowrap: true },
    { k: 'scale', label: t('pricing.table.scale'), nowrap: true },
    { k: 'base', label: t('pricing.table.base'), nowrap: true },
    { k: 'fill', label: t('pricing.table.matched'), nowrap: true },
    { k: 'upd', label: t('pricing.table.updated'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

const matchedCount = (group) => catalog.skusOfGroup(group.id).length;
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
                    <span
                        v-for="prefix in row.prefixes"
                        :key="prefix"
                        class="tp-chip"
                    >
                        {{ prefix }}
                    </span>
                </div>
            </div>
        </template>

        <template #cell-uom="{ row }">
            <span v-if="row.uom">{{ t(`pricing.uom.${row.uom}`) }}</span>
            <span v-else class="tp-dim">—</span>
        </template>

        <template #cell-scale="{ row }">
            <AChip
                v-if="catalog.isCustomScale(row)"
                tone="teal"
                size="sm"
                :dot="false"
            >
                {{ t('pricing.table.custom', { n: row.breaks.length }) }}
            </AChip>
            <span v-else class="tp-soft">
                {{
                    t('pricing.table.default', {
                        n: catalog.defaultBreaks.length,
                    })
                }}
            </span>
        </template>

        <template #cell-base="{ row }">
            <span v-if="row.uom && row.prices[0] != null">
                {{
                    t('pricing.table.from', {
                        price: ils(row.prices[0], 2),
                        per: t(`pricing.per.${row.uom}`),
                    })
                }}
            </span>
            <span v-else class="tp-dim">—</span>
        </template>

        <template #cell-fill="{ row }">
            <span
                class="num tp-count"
                :class="{ 'is-none': matchedCount(row) === 0 }"
            >
                {{ matchedCount(row) }}
            </span>
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
}

.tp-count {
    font-weight: 600;
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
