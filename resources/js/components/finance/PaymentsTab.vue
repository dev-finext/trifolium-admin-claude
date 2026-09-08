<script setup>
// The ledger: one row per charge, payment and credit, in one stream.
//
// There is no accounting system behind this console, so this is the book of
// record rather than a report of one. Nothing is aggregated away — the tiles
// count the same rows the table lists.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SearchField from '@/components/finance/SearchField.vue';
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
import { TXN_KIND_TONES } from '@/config/finance';
import { num } from '@/lib/money';
import {
    COLLECTED_WINDOW_DAYS,
    TXN_FILTER_FIELDS,
    TXN_FILTER_GROUPS,
    useMoneyStore,
} from '@/stores/money';

/** How tall the ledger grows before it scrolls inside its own pane. */
const MAX_HEIGHT = 560;

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const money = useMoneyStore();
const router = useRouter();

const SPEC = { fields: TXN_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    tq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const countOf = (kind) =>
    money.transactions.filter((row) => row.kind === kind).length;

const searched = computed(() => {
    const query = view.tq.trim().toLowerCase();

    if (!query) {
        return money.transactions;
    }

    return money.transactions.filter((row) =>
        searchHaystack(row.order, row.note, row.doc, row.code).includes(query),
    );
});

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.tq));

const spec = computed(() => ({
    id: 'payments',
    ns: 'finance',
    noun: t('finance.noun.transactions'),
    groups: TXN_FILTER_GROUPS,
    units: { tamt: '₪', tage: t('finance.filter.daysUnit') },
    fields: TXN_FILTER_FIELDS.map((field) =>
        field.key === 'tcode'
            ? {
                  ...field,
                  optionLabel: (code) => {
                      const hit = money.byCode(code);

                      return hit ? `${loc(hit.name)} · ${code}` : String(code);
                  },
              }
            : field,
    ),
}));

/** The window tile is the `tage` field with one preset value on it. */
const windowOn = computed(
    () =>
        view.tage.op === 'lt' && view.tage.v === String(COLLECTED_WINDOW_DAYS),
);

function toggleWindow() {
    filters.patch({
        tage: {
            op: 'lt',
            v: windowOn.value ? '' : String(COLLECTED_WINDOW_DAYS),
        },
    });
}

function clear() {
    view.tq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { tq: '' }, patch);
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
                :active="!filters.active.length"
                @click="filters.clear()"
            />

            <FilterKpi
                icon="clipboard_list"
                :label="t('finance.txnKind.charge')"
                :value="num(countOf('charge'))"
                :active="view.tkind.includes('charge')"
                @click="filters.toggle('tkind', 'charge')"
            >
                <template #sub>
                    <AMoney :value="money.chargeTotal" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="card"
                :label="t('finance.txnKind.payment')"
                :value="num(countOf('payment'))"
                :active="view.tkind.includes('payment')"
                @click="filters.toggle('tkind', 'payment')"
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
                :active="windowOn"
                @click="toggleWindow"
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
            :label="t('finance.noun.transactions')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.tq"
                :placeholder="t('finance.filter.searchTxn')"
                :width="300"
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
