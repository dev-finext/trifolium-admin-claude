<script setup>
// Every practitioner with a card in our database.
//
// The filters answer the questions an agent actually arrives with: who is on
// credit terms, who owes us money and for how long, who is listed on the
// website, and who works in which discipline. All of them live in the URL, so a
// filtered directory can be pasted to a colleague.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import { cityKey } from '@/components/users/address';
import SearchField from '@/components/users/SearchField.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    PRACTITIONER_FILTER_FIELDS,
    PRACTITIONER_FILTER_GROUPS,
    usePeopleStore,
} from '@/stores/people';

const props = defineProps({
    /** The customer number whose card is open, so its row stays marked. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const people = usePeopleStore();

const SPEC = { fields: PRACTITIONER_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const all = computed(() => people.practitioners);

const searched = computed(() => {
    const query = view.q.trim().toLowerCase();

    if (!query) {
        return all.value;
    }

    return all.value.filter((one) =>
        searchHaystack(
            one.code,
            one.first,
            one.last,
            one.phone,
            one.email,
            one.clinic,
        ).includes(query),
    );
});

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.q));

const spec = computed(() => ({
    id: 'practitioners',
    ns: 'users',
    noun: t('users.filter.practitionerNoun'),
    groups: PRACTITIONER_FILTER_GROUPS,
    units: { debt: '₪' },
    fields: PRACTITIONER_FILTER_FIELDS.map((field) =>
        field.key === 'city'
            ? {
                  ...field,
                  optionLabel: (he) => {
                      const hit = all.value.find(
                          (one) => cityKey(one.city) === he,
                      );

                      return hit ? loc(hit.city) : he;
                  },
              }
            : field,
    ),
}));

function clear() {
    view.q = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { q: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const cols = computed(() => [
    {
        k: 'code',
        label: t('users.directory.col.code'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('users.directory.col.name'), sortable: true },
    {
        k: 'therapy',
        label: t('users.directory.col.therapy'),
        sortable: true,
        sortValue: (row) => t(`therapy.${row.therapy}`),
    },
    {
        k: 'clinic',
        label: t('users.directory.col.clinic'),
        sortable: true,
    },
    {
        k: 'points',
        label: t('users.directory.col.points'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'disc',
        label: t('users.directory.col.disc'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'orders',
        label: t('users.directory.col.orders'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'credit',
        label: t('users.directory.col.track'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'debt',
        label: t('users.directory.col.debt'),
        nowrap: true,
        sortable: true,
    },
]);

defineExpose({ rows });
</script>

<template>
    <div>
        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('users.directory.count', { n: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.q"
                :placeholder="t('users.directory.search')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="view"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable
            :cols="cols"
            :rows="paged"
            row-key="code"
            :selected="props.selected || null"
            @row="(row) => emit('open', row.code)"
        >
            <template #cell-code="{ row }">
                <span class="t-strong"
                    ><ANum>{{ row.code }}</ANum></span
                >
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">
                    <ANum>{{ row.phone }}</ANum>
                </div>
            </template>
            <template #cell-therapy="{ row }">
                <div>{{ t(`therapy.${row.therapy}`) }}</div>
                <div class="t-sub">{{ loc(row.spec) }}</div>
            </template>
            <template #cell-clinic="{ row }">
                <template v-if="row.clinic">{{ loc(row.clinic) }}</template>
                <span v-else class="u-muted">
                    {{ t('users.directory.notListed') }}
                </span>
            </template>
            <template #cell-points="{ row }">
                <ANum>{{ row.points }}</ANum>
            </template>
            <template #cell-disc="{ row }">
                <ANum>{{ row.disc }}</ANum
                >%
            </template>
            <template #cell-orders="{ row }">
                <ANum>{{ row.orders }}</ANum>
            </template>
            <template #cell-credit="{ row }">
                <AChip v-if="row.credit" tone="purple" size="sm" :dot="false">
                    {{ t('users.directory.credit') }}
                </AChip>
                <span v-else class="u-muted">
                    {{ t('users.directory.immediate') }}
                </span>
            </template>
            <template #cell-debt="{ row }">
                <template v-if="row.debt">
                    <span class="u-debt"><AMoney :value="row.debt" /></span>
                    <div class="t-sub">
                        {{ t('users.directory.debtDays', { n: row.debtDays }) }}
                    </div>
                </template>
                <span v-else class="u-muted">—</span>
            </template>
            <template #empty>
                <AEmpty
                    icon="users"
                    :title="t('users.directory.emptyTitle')"
                    :sub="t('users.directory.emptySub')"
                />
            </template>
        </ADataTable>

        <APagination
            v-model:page="view.pg"
            v-model:size="view.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="view"
            :rows="searched"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />
    </div>
</template>

<style scoped>
.u-muted {
    color: var(--a-ink-4);
}

.u-debt {
    color: var(--a-red);
    font-weight: 700;
}
</style>
