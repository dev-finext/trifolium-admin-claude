<script setup>
// Wallet & points — one point is one shekel.
//
// Every figure on this screen is derived from the points ledger, which is the
// only source of truth for a balance: the tiles count ledger rows, the list shows
// the card balances those rows produce, and nothing here edits a balance except
// through a documented adjustment in the ledger itself.
//
// Each tile is also the filter for the list below it, and the selection lives in
// the URL — so "the practitioners who have redeemed points" is an address.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/finance/SearchField.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import PointsLedgerPanel from '@/components/wallet/PointsLedgerPanel.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { ils, num } from '@/lib/money';
import {
    useMoneyStore,
    WALLET_FILTER_FIELDS,
    WALLET_FILTER_GROUPS,
} from '@/stores/money';

/** How wide the balances list sits once a ledger is open beside it. */
const LIST_WIDTH = '420px';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();

const SPEC = { fields: WALLET_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    practitioner: '',
});
const checking = ref(false);

const withPoints = computed(() =>
    money.practitioners.filter((row) => row.points > 0),
);
const withDebt = computed(() =>
    money.practitioners.filter((row) => row.debt > 0),
);
const debtTotal = computed(() =>
    withDebt.value.reduce((sum, row) => sum + row.debt, 0),
);
const earners = computed(() =>
    money.practitioners.filter((row) => money.hasEarned(row.code)),
);
const spenders = computed(() =>
    money.practitioners.filter((row) => money.hasRedeemed(row.code)),
);

const selected = computed(() =>
    view.practitioner ? money.byCode(view.practitioner) : null,
);

/** Every practitioner, with the two ledger answers resolved onto the row. */
const all = computed(() =>
    money.practitioners.map((row) => ({
        ...row,
        earned: money.hasEarned(row.code),
        redeemed: money.hasRedeemed(row.code),
    })),
);

const searched = computed(() => {
    const query = view.q.trim().toLowerCase();

    if (!query) {
        return all.value;
    }

    return all.value.filter((row) =>
        searchHaystack(row.code, row.name, row.phone).includes(query),
    );
});

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.q));

const spec = computed(() => ({
    id: 'wallet',
    ns: 'wallet',
    noun: t('wallet.noun.practitioners'),
    groups: WALLET_FILTER_GROUPS,
    units: { wpts: t('wallet.filter.pointsUnit'), wowed: '₪' },
    fields: WALLET_FILTER_FIELDS,
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

// With a ledger open beside it the list keeps only what identifies a row; the
// value, order count and debt come back when the ledger closes.
const cols = computed(() => {
    const base = [
        {
            k: 'name',
            label: t('labels.practitioner'),
            sortable: true,
            sortValue: (row) => row.name,
        },
        {
            k: 'points',
            label: t('wallet.list.points'),
            nowrap: true,
            sortable: true,
        },
    ];

    if (selected.value) {
        return base;
    }

    return [
        ...base,
        {
            k: 'value',
            label: t('wallet.list.value'),
            nowrap: true,
            sortable: true,
            sortValue: (row) => row.points,
        },
        {
            k: 'orders',
            label: t('labels.orders'),
            nowrap: true,
            sortable: true,
        },
        {
            k: 'debt',
            label: t('wallet.list.debt'),
            nowrap: true,
            sortable: true,
        },
    ];
});

const checkEffects = computed(() => [
    t('wallet.check.effect1', { n: money.practitioners.length }),
    t('wallet.check.effect2'),
    t('wallet.check.effect3'),
]);

/** Reconcile every card against its ledger and report what does not agree. */
function runCheck() {
    checking.value = false;

    const { checked, gaps } = money.checkLedgerIntegrity();

    push({
        title: gaps.length
            ? t('wallet.toast.gapsFound')
            : t('wallet.toast.noGaps'),
        body: gaps.length
            ? t('wallet.toast.gapsBody', {
                  n: gaps.length,
                  names: gaps.map((gap) => loc(gap.name)).join(' · '),
              })
            : t('wallet.toast.noGapsBody', { n: checked }),
        bad: gaps.length > 0,
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.customers'), t('nav.item.wallet')]"
        :title="t('wallet.title')"
        :sub="t('wallet.sub')"
    >
        <template #actions>
            <AButton icon="refresh" @click="checking = true">
                {{ t('wallet.check.action') }}
            </AButton>
        </template>
    </PageHead>

    <div class="a-kpis w-tiles">
        <FilterKpi
            icon="coin"
            :label="t('wallet.kpi.total')"
            :value="num(money.totalPoints)"
            :sub="
                t('wallet.kpi.totalSub', { value: ils(money.totalPoints, 0) })
            "
            :active="!filters.active.length"
            @click="filters.clear()"
        />
        <FilterKpi
            icon="users"
            :label="t('wallet.kpi.withBalance')"
            :value="num(withPoints.length)"
            :sub="
                t('wallet.kpi.withBalanceSub', {
                    n: money.practitioners.length,
                })
            "
            :active="view.wpoints.includes('has')"
            @click="filters.toggle('wpoints', 'has')"
        />
        <FilterKpi
            icon="user"
            :label="t('wallet.kpi.withoutBalance')"
            :value="num(money.practitioners.length - withPoints.length)"
            :sub="t('wallet.kpi.withoutBalanceSub')"
            :active="view.wpoints.includes('none')"
            @click="filters.toggle('wpoints', 'none')"
        />
        <FilterKpi
            icon="card"
            :label="t('wallet.kpi.withDebt')"
            :value="num(withDebt.length)"
            :sub="t('wallet.kpi.withDebtSub', { amount: ils(debtTotal, 0) })"
            :active="view.wdebt.includes('has')"
            @click="filters.toggle('wdebt', 'has')"
        />
    </div>

    <div class="a-kpis w-tiles">
        <FilterKpi
            icon="chart"
            :label="t('wallet.kpi.earned')"
            :value="num(money.pointsEarned)"
            :sub="t('wallet.kpi.earnedSub', { n: earners.length })"
            :active="view.wact.includes('earn')"
            @click="filters.toggle('wact', 'earn')"
        />
        <FilterKpi
            icon="card"
            :label="t('wallet.kpi.redeemed')"
            :value="num(money.pointsRedeemed)"
            :sub="
                t('wallet.kpi.redeemedSub', {
                    n: spenders.length,
                    value: ils(money.pointsRedeemed, 0),
                })
            "
            :active="view.wact.includes('spend')"
            @click="filters.toggle('wact', 'spend')"
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
        :label="t('wallet.noun.practitioners')"
        :dirty="dirty"
        @clear="clear"
    >
        <SearchField
            v-model="view.q"
            :placeholder="t('wallet.filter.search')"
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

    <div
        class="a-grid w-split"
        :style="{
            gridTemplateColumns: selected ? `${LIST_WIDTH} 1fr` : '1fr',
        }"
    >
        <ACard :title="t('wallet.list.title')" icon="users" :pad="false">
            <ADataTable
                :cols="cols"
                :rows="paged"
                row-key="code"
                :selected="view.practitioner"
                @row="(row) => (view.practitioner = row.code)"
            >
                <template #empty>
                    <AEmpty
                        icon="coin"
                        :title="t('wallet.list.emptyTitle')"
                        :sub="t('wallet.list.emptySub')"
                    />
                </template>

                <template #cell-name="{ row }">
                    <div class="t-strong">{{ loc(row.name) }}</div>
                    <div class="t-sub">
                        <ANum>{{ row.code }}</ANum>
                    </div>
                </template>

                <template #cell-points="{ row }">
                    <span class="w-pts"
                        ><ANum>{{ num(row.points) }}</ANum></span
                    >
                </template>

                <template #cell-value="{ row }">
                    <AMoney :value="row.points" />
                </template>

                <template #cell-orders="{ row }">
                    <ANum>{{ num(row.orders) }}</ANum>
                </template>

                <template #cell-debt="{ row }">
                    <span v-if="row.debt" class="w-debt">
                        <AMoney :value="row.debt" />
                    </span>
                    <span v-else class="w-dash">—</span>
                </template>
            </ADataTable>

            <APagination
                v-model:page="view.pg"
                v-model:size="view.ps"
                :total="total"
            />
        </ACard>

        <PointsLedgerPanel
            v-if="selected"
            :practitioner="selected"
            can-adjust
        />
    </div>

    <ConfirmDialog
        :open="checking"
        :title="t('wallet.check.title')"
        :body="t('wallet.check.body')"
        :effects="checkEffects"
        :confirm-label="t('wallet.check.confirm')"
        @close="checking = false"
        @confirm="runCheck"
    />
</template>

<style scoped>
.w-tiles {
    margin-bottom: 20px;
}

.w-split {
    margin-top: 18px;
    align-items: start;
}

.w-pts {
    font-weight: 700;
    font-size: 16px;
}

.w-debt {
    color: var(--a-red);
    font-weight: 600;
}

.w-dash {
    color: var(--a-ink-4);
}
</style>
