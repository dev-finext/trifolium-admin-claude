<script setup>
// Open balances, and the collection action against each one.
//
// The link is always for the whole balance, never for a single order — which is
// why the action lives on the practitioner row and not on the order rows below
// it. The filters are the URL's, so a bucket picked from the aging table arrives
// here as `?bucket=b3` and the list opens already narrowed.
import { computed } from 'vue';
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
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { AGING_BUCKETS, agingBucket, LINK_STATES } from '@/config';
import { num } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

const emit = defineEmits(['statement', 'link', 'payment']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const money = useMoneyStore();

/** This tab's slice of the query string. */
const view = useUrlState({ bq: '', bucket: '', track: '' });

const trackOptions = computed(() => [
    { value: '', label: t('finance.filter.trackAll') },
    { value: 'credit', label: t('finance.track.credit') },
    { value: 'revoked', label: t('finance.track.revoked') },
]);

const bucketOptions = computed(() => [
    { value: '', label: t('finance.filter.bucketAll') },
    ...AGING_BUCKETS.map((bucket) => ({
        value: bucket.id,
        label: t(`agingBucket.${bucket.id}`),
    })),
]);

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

const rows = computed(() =>
    money.debtors.filter((practitioner) => {
        if (
            view.bucket &&
            agingBucket(practitioner.debtDays).id !== view.bucket
        ) {
            return false;
        }

        if (view.track === 'credit' && !practitioner.credit) {
            return false;
        }

        if (view.track === 'revoked' && practitioner.credit) {
            return false;
        }

        const q = view.bq.trim().toLowerCase();

        if (
            q &&
            !searchHaystack(
                practitioner.code,
                practitioner.name,
                practitioner.phone,
            ).includes(q)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(
    () => Boolean(view.bq) || Boolean(view.bucket) || Boolean(view.track),
);

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

function clear() {
    view.bq = '';
    view.bucket = '';
    view.track = '';
}

function toggle(key, value) {
    view[key] = view[key] === value ? '' : value;
}

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
                :active="!view.bucket && !view.track"
                @click="
                    view.bucket = '';
                    view.track = '';
                "
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
                :active="view.track === 'credit'"
                @click="toggle('track', 'credit')"
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
                :active="view.bucket === oldest.id"
                @click="toggle('bucket', oldest.id)"
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
                :active="view.track === 'revoked'"
                @click="toggle('track', 'revoked')"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('finance.noun.practitioners')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.bq"
                :placeholder="t('finance.filter.searchPractitioner')"
                :width="320"
            />
            <ASelect v-model="view.track" :options="trackOptions" />
            <ASelect v-model="view.bucket" :options="bucketOptions" />
        </FilterBar>

        <ACard :title="t('finance.balances.title')" icon="coin" :pad="false">
            <template #right>
                <span class="f-hint">{{ t('finance.balances.hint') }}</span>
            </template>

            <ADataTable
                :cols="cols"
                :rows="rows"
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
