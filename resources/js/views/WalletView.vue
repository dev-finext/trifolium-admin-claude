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
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import PointsLedgerPanel from '@/components/wallet/PointsLedgerPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { ils, num } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

/** How wide the balances list sits once a ledger is open beside it. */
const LIST_WIDTH = '420px';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();

const view = useUrlState({ q: '', only: '', practitioner: '' });
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

const onlyOptions = computed(() => [
    { value: '', label: t('wallet.filter.balanceAll') },
    { value: 'points', label: t('wallet.filter.withPoints') },
    { value: 'none', label: t('wallet.filter.withoutPoints') },
    { value: 'debt', label: t('wallet.filter.withDebt') },
    { value: 'earn', label: t('wallet.filter.withEarned') },
    { value: 'spend', label: t('wallet.filter.withRedeemed') },
]);

/** One predicate per filter value, so the select and the tiles agree. */
const PREDICATES = {
    points: (row) => row.points > 0,
    none: (row) => row.points === 0,
    debt: (row) => row.debt > 0,
    earn: (row, store) => store.hasEarned(row.code),
    spend: (row, store) => store.hasRedeemed(row.code),
};

const rows = computed(() =>
    money.practitioners.filter((row) => {
        const predicate = PREDICATES[view.only];

        if (predicate && !predicate(row, money)) {
            return false;
        }

        const q = view.q.trim().toLowerCase();

        if (q && !searchHaystack(row.code, row.name, row.phone).includes(q)) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() => Boolean(view.q) || Boolean(view.only));

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

function toggle(value) {
    view.only = view.only === value ? '' : value;
}

function clear() {
    view.q = '';
    view.only = '';
}

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
            :active="!view.only"
            @click="view.only = ''"
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
            :active="view.only === 'points'"
            @click="toggle('points')"
        />
        <FilterKpi
            icon="user"
            :label="t('wallet.kpi.withoutBalance')"
            :value="num(money.practitioners.length - withPoints.length)"
            :sub="t('wallet.kpi.withoutBalanceSub')"
            :active="view.only === 'none'"
            @click="toggle('none')"
        />
        <FilterKpi
            icon="card"
            :label="t('wallet.kpi.withDebt')"
            :value="num(withDebt.length)"
            :sub="t('wallet.kpi.withDebtSub', { amount: ils(debtTotal, 0) })"
            :active="view.only === 'debt'"
            @click="toggle('debt')"
        />
    </div>

    <div class="a-kpis w-tiles">
        <FilterKpi
            icon="chart"
            :label="t('wallet.kpi.earned')"
            :value="num(money.pointsEarned)"
            :sub="t('wallet.kpi.earnedSub', { n: earners.length })"
            :active="view.only === 'earn'"
            @click="toggle('earn')"
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
            :active="view.only === 'spend'"
            @click="toggle('spend')"
        />
    </div>

    <FilterBar
        :count="rows.length"
        :label="t('wallet.noun.practitioners')"
        :dirty="dirty"
        @clear="clear"
    >
        <SearchField
            v-model="view.q"
            :placeholder="t('wallet.filter.search')"
            :width="320"
        />
        <ASelect v-model="view.only" :options="onlyOptions" />
    </FilterBar>

    <div
        class="a-grid w-split"
        :style="{
            gridTemplateColumns: selected ? `${LIST_WIDTH} 1fr` : '1fr',
        }"
    >
        <ACard :title="t('wallet.list.title')" icon="users" :pad="false">
            <ADataTable
                :cols="cols"
                :rows="rows"
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
