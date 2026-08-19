<script setup>
// לפי צמח — the interaction table itself: one row per documented herb ⇄ drug
// link, with the number of orders whose formulas contain that herb, so the blast
// radius of an edit is visible before it is made.
//
// Filters live in the query string: a filtered table can be pasted to a colleague
// and it opens the same way.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { drugList, useSafetyStore } from '@/stores/safety';

const emit = defineEmits(['edit', 'remove']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const store = useSafetyStore();

const view = useUrlState({ q: '', herb: '', drug: '', impact: '' });

const cols = computed(() => [
    {
        k: 'herb',
        label: t('safety.list.col.herb'),
        sortable: true,
        sortValue: (row) => store.herb(row.herbId)?.name,
    },
    { k: 'rel', label: '', w: '54px' },
    { k: 'drug', label: t('safety.list.col.drugs'), sortable: true },
    {
        k: 'impact',
        label: t('safety.list.col.impact'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => store.impact(row.herbId),
    },
    { k: 'act', label: '', w: '210px' },
]);

const shown = computed(() =>
    store.interactions.filter((row) => {
        if (view.herb && row.herbId !== view.herb) {
            return false;
        }

        if (view.drug && !drugList(row.drug).includes(view.drug)) {
            return false;
        }

        const affected = store.impact(row.herbId);

        if (view.impact === 'yes' && !affected) {
            return false;
        }

        if (view.impact === 'no' && affected) {
            return false;
        }

        const term = view.q.trim().toLowerCase();

        if (!term) {
            return true;
        }

        const herb = store.herb(row.herbId);

        return searchHaystack(herb?.name, herb?.lat, row.drug).includes(term);
    }),
);

const dirty = computed(() =>
    Boolean(view.q || view.herb || view.drug || view.impact),
);

function clear() {
    view.q = '';
    view.herb = '';
    view.drug = '';
    view.impact = '';
}
</script>

<template>
    <FilterBar
        :count="shown.length"
        :label="t('safety.list.label')"
        :dirty="dirty"
        @clear="clear"
    >
        <SearchField
            v-model="view.q"
            :placeholder="t('safety.list.search')"
            :label="t('safety.list.searchAria')"
        />

        <ASelect v-model="view.herb" :aria-label="t('safety.list.herbAria')">
            <option value="">{{ t('safety.list.herbAll') }}</option>
            <option v-for="id in store.herbsWithRows" :key="id" :value="id">
                {{
                    t('safety.list.option', {
                        name: loc(store.herb(id)?.name),
                        n: store.rowsForHerb(id).length,
                    })
                }}
            </option>
        </ASelect>

        <ASelect v-model="view.drug" :aria-label="t('safety.list.drugAria')">
            <option value="">{{ t('safety.list.drugAll') }}</option>
            <option v-for="name in store.allDrugs" :key="name" :value="name">
                {{
                    t('safety.list.option', {
                        name,
                        n: store.rowsForDrug(name).length,
                    })
                }}
            </option>
        </ASelect>

        <ASelect
            v-model="view.impact"
            :aria-label="t('safety.list.impactAria')"
        >
            <option value="">{{ t('safety.list.impactAll') }}</option>
            <option value="yes">{{ t('safety.list.impactYes') }}</option>
            <option value="no">{{ t('safety.list.impactNo') }}</option>
        </ASelect>
    </FilterBar>

    <ADataTable
        :cols="cols"
        :rows="shown"
        row-key="id"
        @row="emit('edit', $event)"
    >
        <template #empty>
            <AEmpty
                icon="shield"
                :title="t('safety.list.empty.title')"
                :sub="t('safety.list.empty.sub')"
            />
        </template>

        <template #cell-herb="{ row }">
            <div class="t-strong">{{ loc(store.herb(row.herbId)?.name) }}</div>
            <div class="t-sub ltr">{{ store.herb(row.herbId)?.lat }}</div>
        </template>

        <template #cell-rel>
            <span class="a-rel" aria-hidden="true">⇄</span>
        </template>

        <template #cell-drug="{ row }">
            <div class="a-drugs">
                <AChip
                    v-for="name in drugList(row.drug)"
                    :key="name"
                    tone="blue"
                    size="sm"
                    :dot="false"
                >
                    <span class="ltr">{{ name }}</span>
                </AChip>
            </div>
        </template>

        <template #cell-impact="{ row }">
            <ANum>{{ store.impact(row.herbId) }}</ANum>
            {{ t('safety.list.orders') }}
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton sm icon="edit" @click="emit('edit', row)">
                    {{ t('actions.edit') }}
                </AButton>
                <AButton sm icon="trash" @click="emit('remove', row)">
                    {{ t('actions.delete') }}
                </AButton>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.a-rel {
    color: var(--a-ink-4);
    font-size: 20px;
}

.a-drugs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
</style>
