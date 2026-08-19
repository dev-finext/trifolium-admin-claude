<script setup>
// The ledger: one row per charge, payment and credit, in one stream.
//
// There is no accounting system behind this console, so this is the book of
// record rather than a report of one. Nothing is aggregated away — the tiles
// count the same rows the table lists.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SearchField from '@/components/finance/SearchField.vue';
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
import { TXN_KIND_TONES } from '@/config/finance';
import { num } from '@/lib/money';
import {
    COLLECTED_WINDOW_DAYS,
    TIME_WINDOWS,
    useMoneyStore,
} from '@/stores/money';

/** How tall the ledger grows before it scrolls inside its own pane. */
const MAX_HEIGHT = 560;

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const money = useMoneyStore();
const router = useRouter();

const view = useUrlState({ tq: '', tkind: '', tcode: '', twin: '' });

const kindOptions = computed(() => [
    { value: '', label: t('finance.filter.kindAll') },
    ...money.transactionKinds.map((kind) => ({
        value: kind,
        label: t(`finance.txnKind.${kind}`),
    })),
]);

const windowOptions = computed(() => [
    { value: '', label: t('finance.filter.windowAll') },
    ...TIME_WINDOWS.map((days) => ({
        value: String(days),
        label: t('finance.filter.windowDays', { days }),
    })),
]);

const practitionerOptions = computed(() => [
    { value: '', label: t('finance.filter.practitionerAll') },
    ...money.practitioners.map((practitioner) => ({
        value: practitioner.code,
        label: loc(practitioner.name),
    })),
]);

const countOf = (kind) =>
    money.transactions.filter((row) => row.kind === kind).length;

const rows = computed(() =>
    money.transactions.filter((row) => {
        if (view.tkind && row.kind !== view.tkind) {
            return false;
        }

        if (view.tcode && row.code !== view.tcode) {
            return false;
        }

        if (view.twin && row.when.daysAgo > Number(view.twin)) {
            return false;
        }

        const q = view.tq.trim().toLowerCase();

        if (
            q &&
            !searchHaystack(row.order, row.note, row.doc, row.code).includes(q)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.tq || view.tkind || view.tcode || view.twin),
);

const cols = computed(() => [
    {
        k: 'when',
        label: t('labels.date'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => -row.when.daysAgo,
    },
    { k: 'kind', label: t('finance.txn.kind'), nowrap: true },
    {
        k: 'who',
        label: t('labels.practitioner'),
        sortValue: (row) => money.byCode(row.code)?.name,
    },
    { k: 'note', label: t('finance.txn.note') },
    { k: 'order', label: t('labels.order'), nowrap: true },
    { k: 'doc', label: t('finance.txn.document'), nowrap: true },
    {
        k: 'amt',
        label: t('labels.amount'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.amt,
    },
]);

function clear() {
    view.tq = '';
    view.tkind = '';
    view.tcode = '';
    view.twin = '';
}

function toggle(key, value) {
    view[key] = view[key] === value ? '' : value;
}

function openOrder(id) {
    router.push({ name: 'order', params: { id } });
}

function nameOf(code) {
    const practitioner = money.byCode(code);

    return practitioner ? loc(practitioner.name) : code;
}
</script>

<template>
    <div class="a-grid f-tab">
        <div class="a-kpis">
            <FilterKpi
                icon="list"
                :label="t('finance.payments.kpiAll')"
                :value="num(money.transactions.length)"
                :sub="t('finance.payments.kpiAllSub')"
                :active="!view.tkind && !view.twin"
                @click="
                    view.tkind = '';
                    view.twin = '';
                "
            />

            <FilterKpi
                icon="clipboard_list"
                :label="t('finance.txnKind.charge')"
                :value="num(countOf('charge'))"
                :active="view.tkind === 'charge'"
                @click="toggle('tkind', 'charge')"
            >
                <template #sub>
                    <AMoney :value="money.chargeTotal" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="card"
                :label="t('finance.txnKind.payment')"
                :value="num(countOf('payment'))"
                :active="view.tkind === 'payment'"
                @click="toggle('tkind', 'payment')"
            >
                <template #sub>
                    <AMoney :value="money.paymentTotal" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="clock"
                :label="
                    t('finance.payments.kpiWindow', {
                        days: COLLECTED_WINDOW_DAYS,
                    })
                "
                :value="
                    num(
                        money.transactions.filter(
                            (row) => row.when.daysAgo <= COLLECTED_WINDOW_DAYS,
                        ).length,
                    )
                "
                :sub="t('finance.payments.kpiWindowSub')"
                :active="view.twin === String(COLLECTED_WINDOW_DAYS)"
                @click="toggle('twin', String(COLLECTED_WINDOW_DAYS))"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('finance.noun.transactions')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.tq"
                :placeholder="t('finance.filter.searchTxn')"
                :width="300"
            />
            <ASelect v-model="view.tcode" :options="practitionerOptions" />
            <ASelect v-model="view.tkind" :options="kindOptions" />
            <ASelect v-model="view.twin" :options="windowOptions" />
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :max-height="MAX_HEIGHT"
        >
            <template #empty>
                <AEmpty
                    icon="list"
                    :title="t('finance.payments.emptyTitle')"
                    :sub="t('finance.payments.emptySub')"
                />
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>

            <template #cell-kind="{ row }">
                <AChip :tone="TXN_KIND_TONES[row.kind] || 'gray'" size="sm">
                    {{ t(`finance.txnKind.${row.kind}`) }}
                </AChip>
            </template>

            <template #cell-who="{ row }">
                <div>{{ nameOf(row.code) }}</div>
                <div class="t-sub">
                    <ANum>{{ row.code }}</ANum>
                </div>
            </template>

            <template #cell-note="{ row }">
                {{ loc(row.note) }}
                <div v-if="row.method" class="t-sub">
                    {{ t(`paymentMethod.${row.method}`) }}
                </div>
            </template>

            <template #cell-order="{ row }">
                <button
                    v-if="row.order"
                    type="button"
                    class="a-linkbtn"
                    @click.stop="openOrder(row.order)"
                >
                    <ANum>{{ row.order }}</ANum>
                </button>
                <span v-else class="f-dash">—</span>
            </template>

            <template #cell-doc="{ row }">
                <ANum v-if="row.doc">{{ row.doc }}</ANum>
                <span v-else class="f-dash">—</span>
            </template>

            <template #cell-amt="{ row }">
                <span class="f-amt" :class="{ 'is-in': row.amt < 0 }">
                    <span v-if="row.amt < 0">−</span>
                    <AMoney :value="Math.abs(row.amt)" />
                </span>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.f-tab {
    margin-top: 20px;
}

.f-amt {
    font-weight: 700;
}

.f-amt.is-in {
    color: var(--a-accent);
}

.f-dash {
    color: var(--a-ink-4);
}
</style>
