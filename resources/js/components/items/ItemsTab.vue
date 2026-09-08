<script setup>
// The item list: every item in one table, whatever list it came from, with the
// figures a buyer, a pharmacist and the site manager each look for first —
// units, stock, last purchase price, supplier, site state and whether the card
// is complete under the family's mandatory-field policy.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
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
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { CURRENCY_SYMBOL } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import {
    ITEM_FILTER_FIELDS,
    ITEM_FILTER_GROUPS,
    useItemsStore,
} from '@/stores/items';

defineProps({
    /** The sku whose card is open, so its row reads as selected. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open', 'edit']);

const SPEC = { fields: ITEM_FILTER_FIELDS };

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const store = useItemsStore();
const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    sort: '',
    dir: 'asc',
});

const all = computed(() => store.rows);

function tally(predicate) {
    return all.value.filter(predicate).length;
}

/** Free text first, then the field filters — the shared engine does the rest. */
const searched = computed(() => {
    const term = state.q.trim().toLowerCase();

    if (!term) {
        return all.value;
    }

    return all.value.filter((row) =>
        searchHaystack(row.names, row.sku, row.code, row.preferred?.name)
            .toLowerCase()
            .includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

/** The supplier's own name, and the two values that are not a supplier. */
function supplierLabel(code) {
    if (code === 'none') {
        return t('items.filter.noSupplier');
    }

    if (code === 'na') {
        return t('items.filter.supplierNa');
    }

    const hit = all.value.find((row) => row.suppliers?.preferred === code);

    return hit?.preferred ? loc(hit.preferred.name) : String(code);
}

const spec = computed(() => ({
    id: 'items',
    ns: 'items',
    noun: t('items.filter.noun'),
    groups: ITEM_FILTER_GROUPS,
    units: { price: '₪' },
    fields: ITEM_FILTER_FIELDS.map((field) =>
        field.key === 'sup' ? { ...field, optionLabel: supplierLabel } : field,
    ),
}));

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const dirty = computed(() => filters.dirty || state.q.trim() !== '');

const cols = computed(() => [
    { k: 'code', label: t('items.col.code'), nowrap: true, sortable: true },
    {
        k: 'name',
        label: t('items.col.name'),
        sortable: true,
        sortValue: (row) => row.names.he,
    },
    {
        k: 'family',
        label: t('items.col.family'),
        sortable: true,
        sortValue: (row) => t(`items.family.${row.family}`),
    },
    { k: 'uom', label: t('items.col.uom'), nowrap: true },
    { k: 'flags', label: t('items.col.flags'), nowrap: true },
    {
        k: 'stock',
        label: t('items.col.stock'),
        sortable: true,
        sortValue: (row) => row.avail ?? -1,
    },
    {
        k: 'price',
        label: t('items.col.price'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.price?.lastPurchase ?? -1,
    },
    { k: 'supplier', label: t('items.col.supplier') },
    { k: 'site', label: t('items.col.site'), nowrap: true },
    { k: 'complete', label: t('items.col.complete'), nowrap: true },
]);

const sortModel = computed(() => ({ key: state.sort, dir: state.dir }));

function onSort(next) {
    state.sort = next.key;
    state.dir = next.dir;
}

function clear() {
    state.q = '';
    filters.clear();
}

/** Apply a saved view: its fields replace the current ones. */
function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { q: '' }, patch);
}

/** One chip removed: a value out of its field, or a numeric test cleared. */
function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : '—');

function uomText(row) {
    if (!row.uom?.purchase || row.uom.purchase === row.uom.sales) {
        return uomLabel(row.uom?.sales);
    }

    return t('items.cell.uom', {
        purchase: uomLabel(row.uom.purchase),
        sales: uomLabel(row.uom.sales),
        factor: num(row.uom.factor),
    });
}

function priceText(row) {
    if (
        row.price?.lastPurchase === null ||
        row.price?.lastPurchase === undefined
    ) {
        return '';
    }

    return `${CURRENCY_SYMBOL[row.price.currency] || ''}${num(row.price.lastPurchase, 2)}`;
}

function exportRows() {
    const file = `items-${isoDaysAgo(0)}.csv`;
    const header = [
        t('items.col.code'),
        t('items.col.name'),
        t('items.col.family'),
        t('items.col.uom'),
        t('items.col.stock'),
        t('items.col.price'),
        t('items.col.supplier'),
        t('items.col.site'),
        t('items.col.complete'),
    ];
    const n = downloadCsv(
        file,
        header,
        rows.value.map((row) => [
            row.code,
            loc(
                row.names.he && {
                    he: row.names.he,
                    en: row.names.en || row.names.he,
                },
            ),
            t(`items.family.${row.family}`),
            uomText(row),
            row.avail ?? '',
            priceText(row),
            row.preferred ? loc(row.preferred.name) : '',
            row.site?.sync ? t('items.cell.siteOn') : '',
            row.missing.length
                ? t('items.cell.missingN', { n: row.missing.length })
                : t('items.cell.complete'),
        ]),
    );

    push({
        title: t('items.toast.exported'),
        body: t('items.toast.exportedBody', { n, file }),
    });
}
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <FilterKpi
                icon="tag"
                :label="t('items.kpi.all')"
                :value="all.length"
                :sub="t('items.kpi.allSub')"
                :active="!dirty"
                @click="clear"
            />
            <FilterKpi
                icon="alert"
                :label="t('items.kpi.missing')"
                :value="tally((row) => row.missing.length)"
                :sub="t('items.kpi.missingSub')"
                :active="state.miss.includes('yes')"
                @click="filters.toggle('miss', 'yes')"
            />
            <FilterKpi
                icon="truck"
                :label="t('items.kpi.noSupplier')"
                :value="
                    tally(
                        (row) =>
                            row.flags?.purchase && !row.suppliers?.preferred,
                    )
                "
                :sub="t('items.kpi.noSupplierSub')"
                :active="state.sup.includes('none')"
                @click="filters.toggle('sup', 'none')"
            />
            <FilterKpi
                icon="external"
                :label="t('items.kpi.site')"
                :value="tally((row) => row.site?.sync)"
                :sub="t('items.kpi.siteSub')"
                :active="state.site.includes('on')"
                @click="filters.toggle('site', 'on')"
            />
        </div>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="state"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('items.filter.count', { total: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.q"
                class="search"
                :placeholder="t('items.filter.search')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
            <AButton
                sm
                icon="download"
                :disabled="!rows.length"
                @click="exportRows"
            >
                {{ t('items.action.export') }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="state"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable
            :cols="cols"
            :rows="paged"
            row-key="sku"
            :selected="selected"
            :sort="sortModel"
            @update:sort="onSort"
            @row="emit('open', $event.sku)"
        >
            <template #cell-code="{ row }">
                <span class="a-code a-tag">{{ row.code }}</span>
                <div class="t-sub ltr">{{ row.sku }}</div>
            </template>

            <template #cell-name="{ row }">
                <div class="t-strong">
                    {{
                        loc({
                            he: row.names.he,
                            en: row.names.en || row.names.he,
                        })
                    }}
                </div>
                <div v-if="row.names.lat" class="t-sub ltr">
                    {{ row.names.lat }}
                </div>
            </template>

            <template #cell-family="{ row }">
                <AChip :dot="false" size="sm">{{
                    t(`items.family.${row.family}`)
                }}</AChip>
            </template>

            <template #cell-uom="{ row }">
                <span class="num">{{ uomText(row) }}</span>
            </template>

            <template #cell-flags="{ row }">
                <span class="flags">
                    <span
                        v-for="id in ITEM_FLAG_IDS"
                        :key="id"
                        class="flag"
                        :class="{ 'is-on': row.flags?.[id] }"
                        :title="t(`items.flag.${id}`)"
                    >
                        {{ t(`items.flag.${id}`) }}
                    </span>
                    <span v-if="row.flags?.consumable" class="flag is-cons">
                        {{ t('items.card.consumable') }}
                    </span>
                </span>
            </template>

            <template #cell-stock="{ row }">
                <template v-if="row.tracked">
                    <span :class="{ 'is-low': row.low }">
                        <ANum>{{ num(row.avail) }}</ANum>
                        {{ uomLabel(row.uom?.sales) }}
                    </span>
                    <div v-if="row.alloc" class="t-sub">
                        {{ t('items.cell.committed', { n: num(row.alloc) }) }}
                    </div>
                </template>
                <span v-else class="t-sub">{{ t('items.cell.noStock') }}</span>
            </template>

            <template #cell-price="{ row }">
                <template v-if="priceText(row)">
                    <ANum>{{ priceText(row) }}</ANum>
                    <span class="t-sub">
                        / {{ uomLabel(row.uom?.purchase) }}</span
                    >
                </template>
                <span v-else class="t-sub">{{ t('items.cell.noPrice') }}</span>
            </template>

            <template #cell-supplier="{ row }">
                <span v-if="row.preferred">{{ loc(row.preferred.name) }}</span>
                <span v-else class="t-sub">—</span>
            </template>

            <template #cell-site="{ row }">
                <AChip v-if="row.site?.sync" tone="teal" size="sm" :dot="false">
                    {{ t('items.cell.siteOn') }}
                </AChip>
                <span v-else class="t-sub">{{ t('items.cell.siteOff') }}</span>
            </template>

            <template #cell-complete="{ row }">
                <AChip v-if="row.missing.length" tone="amber" size="sm">
                    {{ t('items.cell.missingN', { n: row.missing.length }) }}
                </AChip>
                <AChip v-else tone="green" size="sm" :dot="false">
                    {{ t('items.cell.complete') }}
                </AChip>
                <div v-if="row.waivedMissing.length" class="t-sub">
                    {{ t('items.cell.waived') }}
                </div>
            </template>
        </ADataTable>

        <APagination
            v-model:page="state.pg"
            v-model:size="state.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
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
.kpi-row {
    margin-top: 18px;
}

.search {
    width: 320px;
    max-width: 100%;
}

.flags {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
}

.flag {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--a-line);
    color: var(--a-ink-4);
    font-size: 11px;
    text-decoration: line-through;
}

.flag.is-on {
    border-color: var(--a-tint-2);
    background: var(--a-tint);
    color: var(--a-accent-2);
    text-decoration: none;
}

.flag.is-cons {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
    color: var(--a-amber);
    text-decoration: none;
}

.is-low {
    color: var(--a-red);
    font-weight: 600;
}
</style>
