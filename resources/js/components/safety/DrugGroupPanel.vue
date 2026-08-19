<script setup>
// לפי תרופה — the same links, grouped by the individual drug name and ordered by
// how many herbs each drug is documented against.
//
// This is the view an agent uses when the patient's medicine is the known fact:
// "the patient takes Coumadin — which herbs need care?"
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { drugList, useSafetyStore } from '@/stores/safety';

const emit = defineEmits(['edit']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const store = useSafetyStore();

const view = useUrlState({ dq: '', dsize: '' });

/** One entry per individual drug name, largest group first. */
const grouped = computed(() => {
    const map = new Map();

    store.interactions.forEach((row) => {
        drugList(row.drug).forEach((name) => {
            if (!map.has(name)) {
                map.set(name, []);
            }

            map.get(name).push(row);
        });
    });

    return [...map.entries()]
        .map(([name, rows]) => ({ name, rows }))
        .sort((a, b) => b.rows.length - a.rows.length);
});

const shown = computed(() =>
    grouped.value.filter((group) => {
        if (view.dsize === 'multi' && group.rows.length < 2) {
            return false;
        }

        if (view.dsize === 'one' && group.rows.length !== 1) {
            return false;
        }

        const term = view.dq.trim().toLowerCase();

        if (!term) {
            return true;
        }

        const herbs = group.rows.map((row) => store.herb(row.herbId)?.name);

        return searchHaystack(group.name, herbs).includes(term);
    }),
);

const dirty = computed(() => Boolean(view.dq || view.dsize));

function clear() {
    view.dq = '';
    view.dsize = '';
}
</script>

<template>
    <div class="a-grid a-drugtab">
        <div class="a-note a-note--info">{{ t('safety.drug.note') }}</div>

        <FilterBar
            :count="shown.length"
            :label="t('safety.drug.label')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.dq"
                :placeholder="t('safety.drug.search')"
                :label="t('safety.drug.searchAria')"
            />

            <ASelect
                v-model="view.dsize"
                :aria-label="t('safety.drug.sizeAria')"
            >
                <option value="">{{ t('safety.drug.sizeAll') }}</option>
                <option value="multi">{{ t('safety.drug.sizeMulti') }}</option>
                <option value="one">{{ t('safety.drug.sizeOne') }}</option>
            </ASelect>
        </FilterBar>

        <ACard v-if="!shown.length">
            <AEmpty
                icon="card"
                :title="t('safety.drug.empty.title')"
                :sub="t('safety.drug.empty.sub')"
            />
        </ACard>

        <ACard v-for="group in shown" :key="group.name">
            <div class="a-dg-h">
                <span class="ltr a-dg-name">{{ group.name }}</span>
                <span class="a-dg-rel" aria-hidden="true">⇄</span>
                <span class="a-dg-n">
                    <ANum>{{ group.rows.length }}</ANum>
                    {{ t('safety.drug.herbs') }}
                </span>
            </div>

            <div class="a-dg-rows">
                <div
                    v-for="row in group.rows"
                    :key="`${group.name}-${row.id}`"
                    class="a-dg-row"
                >
                    <strong>{{ loc(store.herb(row.herbId)?.name) }}</strong>
                    <span class="ltr a-dg-all">{{ row.drug }}</span>
                    <span class="a-dg-imp">
                        <ANum>{{ store.impact(row.herbId) }}</ANum>
                        {{ t('safety.list.orders') }}
                    </span>
                    <AButton sm icon="edit" @click="emit('edit', row)">
                        {{ t('actions.edit') }}
                    </AButton>
                </div>
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.a-drugtab {
    margin-top: 20px;
}

.a-dg-h {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.a-dg-name {
    font-size: 19px;
    font-weight: 700;
}

.a-dg-rel {
    color: var(--a-ink-4);
}

.a-dg-n,
.a-dg-imp {
    color: var(--a-ink-3);
}

.a-dg-rows {
    display: grid;
    gap: 10px;
    margin-top: 14px;
}

.a-dg-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    border-top: 1px solid var(--a-line);
    padding-top: 10px;
}

.a-dg-all {
    flex: 1;
    min-width: 220px;
    color: var(--a-ink-4);
    font-size: 13.5px;
}
</style>
