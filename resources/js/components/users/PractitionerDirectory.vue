<script setup>
// Every practitioner with a card in our database.
//
// The filters answer the questions an agent actually arrives with: who is on
// credit terms, who owes us money and for how long, who is listed on the
// website, and who works in which discipline. All of them live in the URL, so a
// filtered directory can be pasted to a colleague.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { cityKey } from '@/components/users/address';
import SearchField from '@/components/users/SearchField.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { CREDIT, THERAPY_IDS } from '@/config';
import { usePeopleStore } from '@/stores/people';

const props = defineProps({
    /** The customer number whose card is open, so its row stays marked. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const people = usePeopleStore();

const view = useUrlState({
    q: '',
    th: '',
    cr: '',
    dbt: '',
    city: '',
    site: '',
});

const all = computed(() => people.practitioners);

const countBy = (predicate) => all.value.filter(predicate).length;

const isLate = (one) => one.debt > 0 && one.debtDays > CREDIT.warnDays;

const therapyIds = computed(() =>
    THERAPY_IDS.filter((id) => all.value.some((one) => one.therapy === id)),
);

/** Cities the practitioners actually work in, in the reader's language. */
const cities = computed(() => {
    const seen = new Map();

    all.value.forEach((one) => {
        const key = cityKey(one.city);

        if (key && !seen.has(key)) {
            seen.set(key, one.city);
        }
    });

    return [...seen.entries()]
        .map(([key, city]) => ({ key, label: loc(city) }))
        .sort((a, b) => a.label.localeCompare(b.label));
});

const rows = computed(() =>
    all.value.filter((one) => {
        if (view.th && one.therapy !== view.th) {
            return false;
        }

        if (view.cr === 'credit' && !one.credit) {
            return false;
        }

        if (view.cr === 'now' && one.credit) {
            return false;
        }

        if (view.dbt === 'open' && !(one.debt > 0)) {
            return false;
        }

        if (view.dbt === 'late' && !isLate(one)) {
            return false;
        }

        if (view.dbt === 'none' && one.debt > 0) {
            return false;
        }

        if (view.city && cityKey(one.city) !== view.city) {
            return false;
        }

        if (view.site === 'yes' && !one.clinic) {
            return false;
        }

        if (view.site === 'no' && one.clinic) {
            return false;
        }

        const query = view.q.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(
                one.code,
                one.first,
                one.last,
                one.phone,
                one.email,
                one.clinic,
            ).includes(query)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.q || view.th || view.cr || view.dbt || view.city || view.site),
);

function clear() {
    view.q = '';
    view.th = '';
    view.cr = '';
    view.dbt = '';
    view.city = '';
    view.site = '';
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

            <ASelect
                v-model="view.cr"
                :aria-label="t('users.directory.trackAria')"
            >
                <option value="">{{ t('users.directory.allTracks') }}</option>
                <option value="credit">
                    {{
                        t('users.directory.option', {
                            label: t('users.directory.credit'),
                            n: countBy((one) => one.credit),
                        })
                    }}
                </option>
                <option value="now">
                    {{
                        t('users.directory.option', {
                            label: t('users.directory.immediate'),
                            n: countBy((one) => !one.credit),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.dbt"
                :aria-label="t('users.directory.debtAria')"
            >
                <option value="">{{ t('users.directory.allDebt') }}</option>
                <option value="open">
                    {{
                        t('users.directory.debtOpen', {
                            n: countBy((one) => one.debt > 0),
                        })
                    }}
                </option>
                <option value="late">
                    {{
                        t('users.directory.debtLate', {
                            days: CREDIT.warnDays,
                            n: countBy(isLate),
                        })
                    }}
                </option>
                <option value="none">
                    {{
                        t('users.directory.debtNone', {
                            n: countBy((one) => !one.debt),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.th"
                :aria-label="t('users.directory.therapyAria')"
            >
                <option value="">
                    {{ t('users.directory.allTherapies') }}
                </option>
                <option v-for="id in therapyIds" :key="id" :value="id">
                    {{
                        t('users.directory.option', {
                            label: t(`therapy.${id}`),
                            n: countBy((one) => one.therapy === id),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.city"
                :aria-label="t('users.directory.cityAria')"
            >
                <option value="">{{ t('users.directory.allCities') }}</option>
                <option
                    v-for="city in cities"
                    :key="city.key"
                    :value="city.key"
                >
                    {{
                        t('users.directory.option', {
                            label: city.label,
                            n: countBy((one) => cityKey(one.city) === city.key),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.site"
                :aria-label="t('users.directory.siteAria')"
            >
                <option value="">{{ t('users.directory.allSite') }}</option>
                <option value="yes">
                    {{
                        t('users.directory.siteYes', {
                            n: countBy((one) => one.clinic),
                        })
                    }}
                </option>
                <option value="no">
                    {{
                        t('users.directory.siteNo', {
                            n: countBy((one) => !one.clinic),
                        })
                    }}
                </option>
            </ASelect>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
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
