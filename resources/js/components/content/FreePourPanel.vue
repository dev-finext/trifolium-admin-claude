<script setup>
// Free pour: the finished bases a practitioner pours a personal formula into.
// The base's own composition is fixed, so the library lists what is on the shelf
// and at what price rather than a recipe.
//
// Owns `baseQ`, `baseForm` and `basePrice` in the query string.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { inBand, SHELF_PRICE_BANDS } from '@/stores/content';

const props = defineProps({
    bases: { type: Array, default: () => [] },
});

const emit = defineEmits(['preview']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

const filters = useUrlState({ baseQ: '', baseForm: '', basePrice: '' });

const dirty = computed(() =>
    Boolean(filters.baseQ || filters.baseForm || filters.basePrice),
);

function clear() {
    filters.baseQ = '';
    filters.baseForm = '';
    filters.basePrice = '';
}

/**
 * The shelf form is the unit the base is sold in — millilitres for a liquid,
 * capsules for a counted pack, grams for an ointment or a powder.
 */
const formOptions = computed(() => [
    ...new Set(props.bases.map((base) => base.unit)),
]);

const priceOptions = computed(() =>
    SHELF_PRICE_BANDS.map((band) => ({
        value: band.id,
        label: t('libraries.filter.optionCount', {
            label: t(`libraries.band.price.${band.id}`),
            n: props.bases.filter((base) => band.matches(base.price)).length,
        }),
    })),
);

const rows = computed(() =>
    props.bases.filter((base) => {
        if (filters.baseForm && base.unit !== filters.baseForm) {
            return false;
        }

        if (!inBand(SHELF_PRICE_BANDS, filters.basePrice, base.price)) {
            return false;
        }

        const q = filters.baseQ.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            base.sku,
            base.name,
            base.size,
            t(`libraries.shelfUnit.${base.unit}`),
        ).includes(q);
    }),
);

const cols = computed(() => [
    { k: 'sku', label: t('libraries.col.sku'), nowrap: true, sortable: true },
    { k: 'name', label: t('libraries.col.base'), sortable: true },
    { k: 'size', label: t('libraries.col.shelfSize'), nowrap: true },
    {
        k: 'price',
        label: t('libraries.col.price'),
        nowrap: true,
        sortable: true,
    },
    { k: 'ind', label: t('libraries.col.indication') },
    { k: 'act', label: t('libraries.col.actions') },
]);
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('libraries.count.free', { n: bases.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.baseQ"
                width="300px"
                :placeholder="t('libraries.search.free')"
            />
            <ASelect
                v-model="filters.baseForm"
                :aria-label="t('libraries.filter.shelfForm')"
            >
                <option value="">
                    {{ t('libraries.filter.shelfFormAll') }}
                </option>
                <option v-for="unit in formOptions" :key="unit" :value="unit">
                    {{ t(`libraries.shelfUnit.${unit}`) }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.basePrice"
                :aria-label="t('libraries.filter.price')"
            >
                <option value="">{{ t('libraries.filter.priceAll') }}</option>
                <option
                    v-for="option in priceOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="sku"
            @row="emit('preview', $event)"
        >
            <template #empty>
                <AEmpty
                    icon="package"
                    :title="t('libraries.empty.free.title')"
                    :sub="t('libraries.empty.free.sub')"
                />
            </template>

            <template #cell-sku="{ row }">
                <ANum>{{ row.sku }}</ANum>
            </template>

            <template #cell-name="{ row }">
                <span class="t-strong">{{ loc(row.name) }}</span>
            </template>

            <template #cell-size="{ row }">
                <I18nT
                    :keypath="`libraries.size.${row.unit}`"
                    tag="span"
                    scope="global"
                >
                    <template #n>
                        <ANum>{{ row.size }}</ANum>
                    </template>
                </I18nT>
            </template>

            <template #cell-price="{ row }">
                <AMoney :value="row.price" />
            </template>

            <template #cell-ind>{{ t('libraries.freePourBase') }}</template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton sm icon="eye" @click="emit('preview', row)">
                        {{ t('libraries.preview.open') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>
    </div>
</template>
