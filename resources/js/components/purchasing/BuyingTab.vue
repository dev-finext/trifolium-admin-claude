<script setup>
// רכש — the sheets the buyer has, listed.
//
// The page is an index, not an editor: every request or order the pharmacy has
// written, newest first, with where each one stands. "New" opens an empty one,
// and a row opens the one it names.
//
// A row opens its own page, not a drawer or a dialog. A line on these sheets
// carries the whole item card, which makes the table twenty-nine columns wide,
// and booking a sixty-seven line delivery in is the longest piece of typing in
// the area — neither fits in a box floating over the screen.
//
// Narrowing the list (12.11.2026) is the console's standard set, the same on
// both tabs: a search box (number, supplier, note, who opened it), a date range
// on the date the sheet was opened, the state as tabs above the table, and the
// supplier in the filter drawer, with chips and saved views. An order's
// supplier is the order's; a request is found by any supplier one of its lines
// names. The filters live in the address, so a filtered list can be sent as a
// link; saved views are kept per tab.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ATabs from '@/components/ui/ATabs.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import { filterDefaults, useListFilters } from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    BUYING_FILTER_FIELDS,
    BUYING_FILTER_GROUPS,
    BUYING_STATES,
    buyingStateTone,
    hasReceipts,
    lineMoved,
    lineOutstanding,
} from '@/config';
import { inRange } from '@/lib/dateRange';
import { searchHaystack } from '@/lib/localized';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';

const props = defineProps({
    /** `'request'` or `'order'`. */
    kind: { type: String, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const store = useBuyingStore();
const dataset = useDatasetStore();

const sheets = computed(() => store.listsOf(props.kind));

const SPEC = { fields: BUYING_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    st: '',
    bq: '',
    preset: 'all',
    from: '',
    to: '',
    ...filterDefaults(SPEC),
});

// The address outlives a tab switch, and the two kinds do not share states: a
// state the other tab chose means nothing here.
const STATE_IDS = (BUYING_STATES[props.kind] || []).map((state) => state.id);

if (view.st && !STATE_IDS.includes(view.st)) {
    view.st = '';
}

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

const term = computed(() => view.bq.trim().toLowerCase());

/** The supplier a code names, as the screen shows it. */
const supplierLabel = (code) =>
    code === 'none'
        ? t('buying.filter.noSupplier')
        : loc(dataset.suppliers.find((one) => one.code === code)?.name) || code;

/** Search and the opening-date range — before the drawer's fields. */
const searched = computed(() =>
    sheets.value.filter(
        (row) =>
            inRange(row.created?.iso, range.value) &&
            (!term.value ||
                searchHaystack(
                    row.number,
                    row.supplier,
                    row.note,
                    row.by,
                ).includes(term.value)),
    ),
);

const filters = useListFilters(SPEC, view, searched);

const statusTabs = computed(() => {
    const all = filters.rows;

    return [
        { id: '', label: t('ui.all'), n: all.length },
        ...(BUYING_STATES[props.kind] || []).map((state) => ({
            id: state.id,
            label: t(`buying.state.${state.id}`),
            n: all.filter((row) => row.state === state.id).length,
        })),
    ];
});

const filteredSheets = computed(() =>
    view.st
        ? filters.rows.filter((row) => row.state === view.st)
        : filters.rows,
);

const dirty = computed(
    () =>
        filters.dirty ||
        Boolean(view.bq) ||
        Boolean(view.from || view.to) ||
        Boolean(view.st),
);

const spec = computed(() => ({
    id: `buying-${props.kind}`,
    ns: 'buying',
    noun: t('buying.filter.noun'),
    groups: BUYING_FILTER_GROUPS,
    fields: BUYING_FILTER_FIELDS.map((field) =>
        field.key === 'bsup' ? { ...field, optionLabel: supplierLabel } : field,
    ),
}));

function clear() {
    view.bq = '';
    view.st = '';
    view.preset = 'all';
    view.from = '';
    view.to = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { bq: '', st: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const openSheet = (id) =>
    router.push({
        name: 'buyingSheet',
        params: { kind: props.kind, id },
    });

function newSheet() {
    openSheet(store.createList(props.kind).id);
}

const cols = computed(() => {
    const out = [
        { k: 'number', label: t('buying.col.number'), nowrap: true },
        { k: 'created', label: t('buying.col.opened'), nowrap: true },
        { k: 'by', label: t('buying.col.by') },
    ];

    if (props.kind === 'order') {
        out.push({ k: 'supplier', label: t('buying.supplier') });
    }

    out.push(
        { k: 'lines', label: t('buying.col.lines'), align: 'end' },
        { k: 'state', label: t('buying.col.sheetState'), nowrap: true },
        { k: 'note', label: t('buying.note') },
    );

    return out;
});

/** A request says how far through its checklist it is; an order what came in. */
function progress(row) {
    if (!row.lines.length) {
        return '';
    }

    if (row.kind === 'request') {
        const moved = row.lines.filter(lineMoved).length;

        return moved
            ? t('buying.request.moved', {
                  done: moved,
                  total: row.lines.length,
              })
            : t('buying.request.ticked', {
                  done: row.lines.filter((line) => line.done).length,
                  total: row.lines.length,
              });
    }

    // Arrived means arrived in full; a line part of which came is still due.
    const arrived = row.lines.filter(
        (line) => Number(line.received) > 0 && lineOutstanding(line) <= 0,
    ).length;

    return arrived
        ? t('buying.order.arrived', { done: arrived, total: row.lines.length })
        : '';
}
</script>

<template>
    <div class="bt">
        <div class="a-pane bt-head">
            <span class="bt-count">
                {{
                    t('buying.sheetCount', { n: sheets.length }, sheets.length)
                }}
            </span>
            <AButton class="a-push" kind="p" icon="plus" @click="newSheet">
                {{ t(`buying.${kind}.new`) }}
            </AButton>
        </div>

        <AEmpty
            v-if="!sheets.length"
            icon="inbox"
            :title="t(`buying.${kind}.emptyTitle`)"
            :sub="t(`buying.${kind}.emptySub`)"
        />

        <template v-else>
            <DateRangeBar v-model="range" />

            <SavedViews
                ref="savedViews"
                :spec="spec"
                :filters="view"
                :rows="searched"
                @apply="applyView"
            />

            <FilterBar
                :count="filteredSheets.length"
                :label="t('buying.listCount', { total: sheets.length })"
                :dirty="dirty"
                @clear="clear"
            >
                <SearchBox
                    v-model="view.bq"
                    :placeholder="t('buying.listSearch')"
                    :width="340"
                />
                <AButton icon="layers" @click="drawerOpen = true">
                    {{
                        filters.active.length
                            ? t('filters.openWith', {
                                  n: filters.active.length,
                              })
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

            <ATabs v-model="view.st" :tabs="statusTabs" />

            <ADataTable
                :cols="cols"
                :rows="filteredSheets"
                row-key="id"
                @row="openSheet($event.id)"
            >
                <template #empty>
                    <AEmpty icon="inbox" :title="t('buying.listEmpty')" />
                </template>
                <template #cell-number="{ row }">
                    <ANum class="a-code">{{ row.number }}</ANum>
                </template>
                <template #cell-created="{ row }">
                    <ANum>{{ row.created?.stamp || '—' }}</ANum>
                </template>
                <template #cell-by="{ row }">{{
                    row.by ? loc(row.by) : '—'
                }}</template>
                <template #cell-supplier="{ row }">
                    <span :class="{ 'bt-nil': !row.supplier }">{{
                        loc(row.supplier) || '—'
                    }}</span>
                </template>
                <template #cell-lines="{ row }">
                    <ANum>{{ row.lines.length }}</ANum>
                    <span v-if="progress(row)" class="bt-progress">{{
                        progress(row)
                    }}</span>
                </template>
                <template #cell-state="{ row }">
                    <AChip :tone="buyingStateTone(row.state)">
                        {{ t(`buying.state.${row.state}`) }}
                    </AChip>
                    <div
                        v-if="row.state === 'sent' && hasReceipts(row)"
                        class="bt-progress bt-part"
                    >
                        {{ t('buying.order.partial') }}
                    </div>
                    <div
                        v-else-if="row.state === 'received' && row.closedShort"
                        class="bt-progress bt-part"
                    >
                        {{ t('buying.order.closedShort') }}
                    </div>
                </template>
                <template #cell-note="{ row }">
                    <span :class="{ 'bt-nil': !row.note }">{{
                        row.note || '—'
                    }}</span>
                </template>
            </ADataTable>

            <FilterDrawer
                :open="drawerOpen"
                :spec="spec"
                :filters="view"
                :rows="searched"
                :result-count="filteredSheets.length"
                @close="drawerOpen = false"
                @clear="clear"
                @patch="filters.patch"
                @save="savedViews?.openSave()"
            />
        </template>
    </div>
</template>

<style scoped>
.bt {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

.bt-head {
    display: flex;
    align-items: center;
    gap: 18px;
}

.bt-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.bt-progress {
    margin-inline-start: 8px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.bt-part {
    margin-inline-start: 0;
    margin-top: 2px;
}

.bt-nil {
    color: var(--a-ink-4);
}
</style>
