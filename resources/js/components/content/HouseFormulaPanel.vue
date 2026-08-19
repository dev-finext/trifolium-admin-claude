<script setup>
// The pharmacy's own formulas, as the wizard offers them: a name, the herbs in
// one line, the form it is prepared in, and how many herbs it carries.
//
// This panel owns its own slice of the query string (`sysQ`, `sysForm`,
// `sysSize`), so a filtered library can be pasted to a colleague.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
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
});

const emit = defineEmits(['preview']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

const filters = useUrlState({ sysQ: '', sysForm: '', sysSize: '' });

const dirty = computed(() =>
    Boolean(filters.sysQ || filters.sysForm || filters.sysSize),
);

function clear() {
    filters.sysQ = '';
    filters.sysForm = '';
    filters.sysSize = '';
}

/** Preparation forms at least one house formula is actually made in. */
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
        if (filters.sysForm && formula.typeId !== filters.sysForm) {
            return false;
        }

        if (!inBand(INGREDIENT_BANDS, filters.sysSize, formula.ing)) {
            return false;
        }

        const q = filters.sysQ.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            formula.name,
            formula.summary,
            t(`preparationForm.${formula.typeId}`),
        ).includes(q);
    }),
);

const cols = computed(() => [
    { k: 'name', label: t('libraries.col.name'), sortable: true },
    { k: 'form', label: t('libraries.col.form'), nowrap: true },
    { k: 'ing', label: t('libraries.col.herbs'), nowrap: true, sortable: true },
    { k: 'act', label: t('libraries.col.actions') },
]);
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('libraries.count.system', { n: formulas.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.sysQ"
                :placeholder="t('libraries.search.system')"
            />
            <ASelect
                v-model="filters.sysForm"
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
                v-model="filters.sysSize"
                :aria-label="t('libraries.filter.size')"
            >
                <option value="">{{ t('libraries.filter.sizeAll') }}</option>
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
                    icon="beaker"
                    :title="t('libraries.empty.system.title')"
                    :sub="t('libraries.empty.system.sub')"
                />
            </template>

            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">{{ loc(row.summary) }}</div>
            </template>

            <template #cell-form="{ row }">
                <AChip tone="teal" size="sm" :dot="false">
                    {{ t(`preparationForm.${row.typeId}`) }}
                </AChip>
            </template>

            <template #cell-ing="{ row }">
                <I18nT keypath="libraries.herbCount" tag="span" scope="global">
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
