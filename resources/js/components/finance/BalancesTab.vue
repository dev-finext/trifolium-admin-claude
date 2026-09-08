<script setup>
// Open balances, and the collection action against each one.
//
// The link is always for the whole balance, never for a single order — which is
// why the action lives on the practitioner row and not on the order rows below
// it. The filters are the URL's, so a bucket picked from the aging table arrives
// here as `?bucket=b3` and the list opens already narrowed.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import OpenCreditTable from '@/components/finance/OpenCreditTable.vue';
import SearchField from '@/components/finance/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { agingBucket, LINK_STATES } from '@/config';
import { num } from '@/lib/money';
import {
    BALANCE_FILTER_FIELDS,
    BALANCE_FILTER_GROUPS,
    useMoneyStore,
} from '@/stores/money';

const emit = defineEmits(['statement', 'link', 'payment']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const money = useMoneyStore();

const SPEC = { fields: BALANCE_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

/** This tab's slice of the query string. */
const view = useUrlState({
    bq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

/** The oldest bucket the config defines — the one the KPI tile watches. */
const oldest = computed(
    () => money.agingRows[money.agingRows.length - 1] || null,
);

const onCredit = computed(() =>
    money.debtors.filter((practitioner) => practitioner.credit),
);

const revoked = computed(() =>
    money.debtors.filter((practitioner) => !practitioner.credit),
);

const searched = computed(() => {
    const query = view.bq.trim().toLowerCase();

    if (!query) {
        return money.debtors;
    }

    return money.debtors.filter((practitioner) =>
        searchHaystack(
            practitioner.code,
            practitioner.name,
            practitioner.phone,
        ).includes(query),
    );
});

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.bq));

const spec = computed(() => ({
    id: 'balances',
    ns: 'finance',
    noun: t('finance.noun.practitioners'),
    groups: BALANCE_FILTER_GROUPS,
    units: { bdebt: '₪', bage: t('finance.filter.daysUnit') },
    fields: BALANCE_FILTER_FIELDS,
}));

function clear() {
    view.bq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { bq: '' }, patch);
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
        k: 'name',
        label: t('labels.practitioner'),
        sortable: true,
        sortValue: (row) => row.name,
    },
    { k: 'track', label: t('finance.balances.track'), nowrap: true },
    {
        k: 'amt',
        label: t('finance.balances.balance'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.debt,
    },
    {
        k: 'open',
        label: t('finance.balances.openOrders'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => money.openCreditOrders(row.code).length,
    },
    {
        k: 'age',
        label: t('finance.balances.debtAge'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.debtDays,
    },
    { k: 'link', label: t('finance.balances.lastLink'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

function linkOf(code) {
    return money.collectionLinkOf(code);
}

function linkState(code) {
    const link = linkOf(code);

    return link ? link.state : 'none';
}

function linkTone(code) {
    return (LINK_STATES[linkState(code)] || LINK_STATES.none).tone;
}
</script>

<template>
    <div class="a-grid f-tab">
        <div class="a-kpis">
            <FilterKpi
                icon="coin"
                :label="t('finance.balances.kpiAll')"
                :value="num(money.debtors.length)"
                :active="!filters.active.length"
                @click="filters.clear()"
            >
                <template #sub>
                    <AMoney :value="money.totalDebt" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="users"
                :label="t('finance.balances.kpiCredit')"
                :value="num(onCredit.length)"
                :sub="t('finance.balances.kpiCreditSub')"
                :active="view.track.includes('credit')"
                @click="filters.toggle('track', 'credit')"
            />

            <FilterKpi
                v-if="oldest"
                icon="alert"
                :label="
                    t('finance.balances.kpiOldest', {
                        range: t(`agingBucket.${oldest.id}`),
                    })
                "
                :value="num(oldest.n)"
                :active="view.bucket.includes(oldest.id)"
                @click="filters.toggle('bucket', oldest.id)"
            >
                <template #sub>
                    <AMoney :value="oldest.amt" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="lock"
                :label="t('finance.balances.kpiRevoked')"
                :value="num(revoked.length)"
                :sub="t('finance.balances.kpiRevokedSub')"
                :active="view.track.includes('revoked')"
                @click="filters.toggle('track', 'revoked')"
            />
        </div>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :total="searched.length"
            :label="t('finance.noun.practitioners')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.bq"
                :placeholder="t('finance.filter.searchPractitioner')"
                :width="320"
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

        <ACard :title="t('finance.balances.title')" icon="coin" :pad="false">
            <template #right>
                <span class="f-hint">{{ t('finance.balances.hint') }}</span>
            </template>

            <ADataTable
                :cols="cols"
                :rows="paged"
                row-key="code"
                @row="(row) => emit('statement', row.code)"
            >
                <template #empty>
                    <AEmpty
                        icon="check"
                        :title="t('finance.balances.emptyTitle')"
                        :sub="t('finance.balances.emptySub')"
                    />
                </template>

                <template #cell-name="{ row }">
                    <div class="t-strong">{{ loc(row.name) }}</div>
                    <div class="t-sub">
                        <ANum>{{ row.code }}</ANum> ·
                        <ANum>{{ row.phone }}</ANum>
                    </div>
                </template>

                <template #cell-track="{ row }">
                    <AChip
                        :tone="row.credit ? 'purple' : 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{
                            row.credit
                                ? t('finance.track.credit')
                                : t('finance.track.revoked')
                        }}
                    </AChip>
                </template>

                <template #cell-amt="{ row }">
                    <span class="f-owed"><AMoney :value="row.debt" /></span>
                </template>

                <template #cell-open="{ row }">
                    <ANum>{{
                        num(money.openCreditOrders(row.code).length)
                    }}</ANum>
                </template>

                <template #cell-age="{ row }">
                    <AChip
                        :tone="agingBucket(row.debtDays).tone"
                        size="sm"
                        :dot="false"
                    >
                        {{ t('finance.balances.days', { n: row.debtDays }) }}
                    </AChip>
                </template>

                <template #cell-link="{ row }">
                    <AChip :tone="linkTone(row.code)" size="sm">
                        {{ t(`finance.linkState.${linkState(row.code)}`) }}
                    </AChip>
                    <div v-if="linkOf(row.code)?.sentAt" class="t-sub">
                        {{
                            t('finance.balances.linkMeta', {
                                when: linkOf(row.code).sentAt.stamp,
                                days: linkOf(row.code).expiresIn,
                            })
                        }}
                    </div>
                </template>

                <template #cell-act="{ row }">
                    <div class="a-rowbtns" @click.stop>
                        <AButton
                            sm
                            kind="p"
                            icon="copy"
                            @click="emit('link', row.code)"
                        >
                            {{ t('finance.action.createLink') }}
                        </AButton>
                        <AButton
                            sm
                            icon="card"
                            @click="emit('payment', row.code)"
                        >
                            {{ t('finance.action.recordPayment') }}
                        </AButton>
                        <AButton
                            sm
                            icon="file_text"
                            @click="emit('statement', row.code)"
                        >
                            {{ t('finance.action.statement') }}
                        </AButton>
                    </div>
                </template>
            </ADataTable>
        </ACard>

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

        <OpenCreditTable />
    </div>
</template>

<style scoped>
.f-tab {
    margin-top: 20px;
}

.f-hint {
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.f-owed {
    font-weight: 700;
    color: var(--a-red);
}
</style>
