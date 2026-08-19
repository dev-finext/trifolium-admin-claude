<script setup>
// The classical Chinese prescriptions. Their romanised, Chinese and pinyin names
// and the treatise each one comes from are part of the record and are never
// translated — only the indication is.
//
// Owns `preQ`, `preSrc`, `preForm` and `preSize` in the query string.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { PREPARATION_FORMS } from '@/config';
import { INGREDIENT_BANDS, inBand } from '@/stores/content';

const props = defineProps({
    formulas: { type: Array, default: () => [] },
    /** The classical sources cited, in first-seen order. */
    sources: { type: Array, default: () => [] },
});

const emit = defineEmits(['preview']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

const filters = useUrlState({
    preQ: '',
    preSrc: '',
    preForm: '',
    preSize: '',
});

const dirty = computed(() =>
    Boolean(
        filters.preQ || filters.preSrc || filters.preForm || filters.preSize,
    ),
);

function clear() {
    filters.preQ = '';
    filters.preSrc = '';
    filters.preForm = '';
    filters.preSize = '';
}

/** A treatise is cited as `Title · 書名`; the select shows the romanised half. */
function sourceLabel(source) {
    return String(source).split(' · ')[0];
}

const sourceOptions = computed(() =>
    props.sources.map((source) => ({
        value: source,
        label: t('libraries.filter.optionCount', {
            label: sourceLabel(source),
            n: props.formulas.filter((formula) => formula.source === source)
                .length,
        }),
    })),
);

const formOptions = computed(() =>
    PREPARATION_FORMS.filter((form) =>
        props.formulas.some((formula) => formula.typeId === form.id),
    ).map((form) => ({
        value: form.id,
        label: t('libraries.filter.optionCount', {
            label: t(`preparationForm.${form.id}`),
            n: props.formulas.filter((formula) => formula.typeId === form.id)
                .length,
        }),
    })),
);

const sizeOptions = computed(() =>
    INGREDIENT_BANDS.map((band) => ({
        value: band.id,
        label: t('libraries.filter.optionCount', {
            label: t(`libraries.band.size.${band.id}`),
            n: props.formulas.filter((formula) => band.matches(formula.ing))
                .length,
        }),
    })),
);

const rows = computed(() =>
    props.formulas.filter((formula) => {
        if (filters.preSrc && formula.source !== filters.preSrc) {
            return false;
        }

        if (filters.preForm && formula.typeId !== filters.preForm) {
            return false;
        }

        if (!inBand(INGREDIENT_BANDS, filters.preSize, formula.ing)) {
            return false;
        }

        const q = filters.preQ.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            formula.nameEn,
            formula.nameZh,
            formula.namePinyin,
            formula.source,
            formula.indication,
        ).includes(q);
    }),
);

const cols = computed(() => [
    { k: 'nameEn', label: t('libraries.col.presetName'), sortable: true },
    { k: 'source', label: t('libraries.col.source'), sortable: true },
    { k: 'indication', label: t('libraries.col.indication') },
    {
        k: 'ing',
        label: t('libraries.col.composition'),
        nowrap: true,
        sortable: true,
    },
    { k: 'act', label: t('libraries.col.actions') },
]);
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('libraries.count.preset', { n: formulas.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.preQ"
                width="340px"
                :placeholder="t('libraries.search.preset')"
            />
            <ASelect
                v-model="filters.preSrc"
                :aria-label="t('libraries.filter.source')"
            >
                <option value="">{{ t('libraries.filter.sourceAll') }}</option>
                <option
                    v-for="option in sourceOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.preForm"
                :aria-label="t('libraries.filter.form')"
            >
                <option value="">{{ t('libraries.filter.formAll') }}</option>
                <option
                    v-for="option in formOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.preSize"
                :aria-label="t('libraries.filter.composition')"
            >
                <option value="">
                    {{ t('libraries.filter.compositionAll') }}
                </option>
                <option
                    v-for="option in sizeOptions"
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
            row-key="id"
            @row="emit('preview', $event)"
        >
            <template #empty>
                <AEmpty
                    icon="book"
                    :title="t('libraries.empty.preset.title')"
                    :sub="t('libraries.empty.preset.sub')"
                />
            </template>

            <template #cell-nameEn="{ row }">
                <div class="t-strong ltr">{{ row.nameEn }}</div>
                <div class="t-sub">{{ row.nameZh }} · {{ row.namePinyin }}</div>
            </template>

            <template #cell-source="{ row }">
                <span class="ltr">{{ row.source }}</span>
            </template>

            <template #cell-indication="{ row }">
                {{ loc(row.indication) }}
            </template>

            <template #cell-ing="{ row }">
                <I18nT
                    keypath="libraries.compositionCell"
                    tag="span"
                    scope="global"
                >
                    <template #n>
                        <ANum>{{ row.ing }}</ANum>
                    </template>
                </I18nT>
            </template>

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
