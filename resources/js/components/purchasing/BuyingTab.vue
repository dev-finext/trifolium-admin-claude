<script setup>
// רכש — a sheet of items, for a request or for an order.
//
// One component for both, because the two differ in three things and in nothing
// else: an order names a supplier, an order's quantities are required, and a
// request's lines are ticked off as they are sourced. `config/buying.js` holds
// those three facts; everything here reads them rather than branching on the
// name.
//
// Lines arrive two ways. Pasting is the one the work actually uses — a column
// out of Excel, a line out of an email — and the search button turns the block
// into rows in one press. The type-ahead beside it is for the item the buyer
// thinks of afterwards.
//
// A line carries the item card rather than pointing at it, which makes the
// table wide — and a wide table is the right answer here, because the decision
// "do I order this, and how much" is made out of those columns and not out of
// eleven item cards opened one after another. The page scrolls sideways to
// reach them; the header row stays put as the rows pass under it.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { BUYING_KIND, buyingSheet, missingQty } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { downloadXlsx } from '@/lib/xlsx';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

/** How many matches the type-ahead offers before it asks for more letters. */
const MATCHES = 8;

const props = defineProps({
    /** `'request'` or `'order'`. */
    kind: { type: String, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const items = useItemsStore();
const store = useBuyingStore();

const rules = computed(() => BUYING_KIND[props.kind]);

const sheets = computed(() => store.listsOf(props.kind));

const openId = ref('');

/** The sheet on screen: the one chosen, or the newest there is. */
const sheet = computed(
    () => store.listById(openId.value) || sheets.value[0] || null,
);

watch(sheet, (one) => {
    openId.value = one?.id || '';
});

const closed = computed(() => sheet.value?.state === 'closed');

const sheetOptions = computed(() =>
    sheets.value.map((one) => ({
        value: one.id,
        label: [
            `${t(`buying.${props.kind}.one`)} ${one.number}`,
            one.created?.stamp || '',
            t('buying.lineCount', { n: one.lines.length }, one.lines.length),
            one.state === 'closed' ? t('buying.state.closed') : '',
        ]
            .filter(Boolean)
            .join(' · '),
    })),
);

const supplierOptions = computed(() => [
    { value: '', label: t('buying.pickSupplier') },
    ...dataset.suppliers.map((one) => ({
        value: one.code,
        label: `${loc(one.name)} · ${one.code}`,
    })),
]);

function newSheet() {
    const one = store.createList(props.kind);

    openId.value = one.id;
    paste.value = '';
    found.value = null;
}

function onSupplier(code) {
    const hit = dataset.suppliers.find((one) => one.code === code);

    store.setSupplier(sheet.value.id, {
        supplierCode: code,
        supplier: hit ? hit.name : null,
    });
}

// ---- adding lines --------------------------------------------------------

const paste = ref('');
const found = ref(null);

function search() {
    if (!sheet.value || !paste.value.trim()) {
        return;
    }

    found.value = store.addSkus(sheet.value.id, paste.value);

    if (found.value.added.length) {
        paste.value = '';
    }
}

const query = ref('');

const matches = computed(() => {
    const q = query.value.trim().toLowerCase();

    if (q.length < 2 || !sheet.value) {
        return [];
    }

    const taken = new Set(sheet.value.lines.map((line) => line.sku));

    return items.rows
        .filter(
            (row) =>
                !taken.has(row.sku) &&
                (row.sku.includes(q) ||
                    (row.names?.he || '').toLowerCase().includes(q) ||
                    (row.names?.en || '').toLowerCase().includes(q)),
        )
        .slice(0, MATCHES);
});

function pick(row) {
    store.addItem(sheet.value.id, row.sku);
    query.value = '';
}

// ---- the table -----------------------------------------------------------

const label = (key) => t(`buying.col.${key}`);

const amount = (key) => ({ k: key, label: label(key), align: 'end' });

/**
 * The item card, column by column, in the card's own order: who it is, who it
 * comes from, what it costs, what is on the shelf, and how it is replenished.
 */
const cols = computed(() => {
    const out = [
        { k: 'sku', label: label('sku'), nowrap: true },
        { k: 'name', label: label('name') },
        { k: 'foreignName', label: label('foreignName') },
        { k: 'group', label: label('group') },
        { k: 'state', label: label('state'), nowrap: true },

        { k: 'supplier', label: label('supplier') },
        { k: 'supplierCode', label: label('supplierCode'), nowrap: true },
        { k: 'catalogNum', label: label('catalogNum'), nowrap: true },
        { k: 'purchaseUom', label: label('purchaseUom'), nowrap: true },
        amount('numInBuy'),
        { k: 'packUom', label: label('packUom'), nowrap: true },
        amount('packQty'),
        amount('lastPrice'),
        { k: 'lastPriceOn', label: label('lastPriceOn'), nowrap: true },
        amount('evalPrice'),

        { k: 'uom', label: label('uom'), nowrap: true },
        amount('onHand'),
        amount('committed'),
        amount('available'),
        amount('onOrder'),
        amount('min'),
        amount('max'),
        amount('reorder'),

        amount('minOrder'),
        amount('leadDays'),
        { k: 'procurement', label: label('procurement'), nowrap: true },

        { k: 'qty', label: label('qty'), align: 'end', nowrap: true },
    ];

    if (rules.value.checklist) {
        out.push({ k: 'done', label: label('done'), nowrap: true });
    }

    out.push({ k: 'drop', label: '', nowrap: true });

    return out;
});

const short = computed(() => (sheet.value ? missingQty(sheet.value) : []));

const needsSupplier = computed(
    () => rules.value.supplier && !sheet.value?.supplierCode,
);

const blocked = computed(
    () =>
        !sheet.value?.lines.length ||
        short.value.length > 0 ||
        needsSupplier.value,
);

/** The codes a line stores, as the words a person reads. */
const fmt = {
    unit: (uom) => (uom ? t(`inventory.unit.${uom}`) : ''),
    state: (id) => t(`buying.itemState.${id}`),
    procurement: (id) => t(`items.procurementMethod.${id}`),
    date: (iso) => fmtISO(iso),
};

function exportSheet() {
    const one = sheet.value;
    const file = `${t(`buying.${props.kind}.file`)}-${one.number}.xlsx`;

    downloadXlsx(file, {
        name: t(`buying.${props.kind}.one`),
        rows: buyingSheet(one, fmt),
    });
    push({
        title: t('buying.exported', { n: one.lines.length }, one.lines.length),
        body: file,
    });
}
</script>

<template>
    <div class="by">
        <!-- Which sheet, and a new one -->
        <div class="a-pane by-head">
            <div class="a-fields by-pick">
                <label v-if="sheets.length" class="a-field">
                    <span>{{ t(`buying.${kind}.pick`) }}</span>
                    <ASelect v-model="openId" :options="sheetOptions" />
                </label>
                <label v-if="rules.supplier && sheet" class="a-field">
                    <span>{{ t('buying.supplier') }}</span>
                    <ASelect
                        :model-value="sheet.supplierCode || ''"
                        :options="supplierOptions"
                        @update:model-value="onSupplier"
                    />
                </label>
            </div>
            <AChip v-if="sheet" :tone="closed ? 'slate' : 'green'" size="sm">
                {{ t(`buying.state.${sheet.state}`) }}
            </AChip>
            <AButton class="a-push" kind="p" icon="plus" @click="newSheet">
                {{ t(`buying.${kind}.new`) }}
            </AButton>
        </div>

        <AEmpty
            v-if="!sheet"
            icon="inbox"
            :title="t(`buying.${kind}.emptyTitle`)"
            :sub="t(`buying.${kind}.emptySub`)"
        />

        <template v-else>
            <!-- Who wrote it, and what they wrote on it -->
            <div class="a-pane by-note">
                <label class="a-lbl" :for="`note-${kind}`">
                    {{ t('buying.note') }}
                </label>
                <ATextarea
                    :id="`note-${kind}`"
                    :model-value="sheet.note || ''"
                    :rows="2"
                    class="a-w100"
                    :placeholder="t('buying.notePlaceholder')"
                    @update:model-value="store.setNote(sheet.id, $event)"
                />
                <div class="a-hint">
                    {{
                        t('buying.openedBy', {
                            who: sheet.by ? loc(sheet.by) : '—',
                            when: sheet.created?.stamp || '',
                        })
                    }}
                </div>
            </div>

            <!-- Adding lines -->
            <div class="a-pane by-add">
                <div class="by-paste">
                    <label class="a-lbl" :for="`paste-${kind}`">
                        {{ t('buying.paste') }}
                    </label>
                    <ATextarea
                        :id="`paste-${kind}`"
                        v-model="paste"
                        :rows="3"
                        class="a-w100"
                        :placeholder="t('buying.pastePlaceholder')"
                    />
                    <div class="a-hint">{{ t('buying.pasteHint') }}</div>
                    <AButton
                        kind="p"
                        icon="search"
                        :disabled="!paste.trim()"
                        @click="search"
                    >
                        {{ t('buying.search') }}
                    </AButton>
                </div>

                <div class="by-find">
                    <label class="a-lbl" :for="`find-${kind}`">
                        {{ t('buying.addOne') }}
                    </label>
                    <AInput
                        :id="`find-${kind}`"
                        v-model="query"
                        :placeholder="t('buying.addOnePlaceholder')"
                        class="a-w100"
                    />
                    <ul v-if="matches.length" class="by-matches">
                        <li v-for="row in matches" :key="row.sku">
                            <button type="button" @click="pick(row)">
                                <span class="a-code a-tag">{{ row.sku }}</span>
                                <span class="by-match-n">{{
                                    row.names?.he
                                }}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- What the last search did -->
            <div v-if="found" class="a-pane by-found">
                <span v-if="found.added.length" class="by-ok">
                    {{
                        t(
                            'buying.foundAdded',
                            { n: found.added.length },
                            found.added.length,
                        )
                    }}
                </span>
                <span v-if="found.already.length" class="by-note-x">
                    {{
                        t('buying.foundAlready', {
                            list: found.already.join(', '),
                        })
                    }}
                </span>
                <span v-if="found.missing.length" class="by-bad">
                    {{
                        t('buying.foundMissing', {
                            list: found.missing.join(', '),
                        })
                    }}
                </span>
            </div>

            <!-- The sheet -->
            <AEmpty
                v-if="!sheet.lines.length"
                icon="list"
                :title="t('buying.noLinesTitle')"
                :sub="t('buying.noLinesSub')"
            />

            <div v-else class="a-tablewrap by-sheet">
                <ADataTable :cols="cols" :rows="sheet.lines" row-key="sku">
                    <template #cell-sku="{ row }">
                        <ANum class="a-code">{{ row.sku }}</ANum>
                    </template>
                    <template #cell-foreignName="{ row }">
                        <span
                            class="by-lat"
                            :class="{ 'by-nil': !row.foreignName }"
                            >{{ row.foreignName || '—' }}</span
                        >
                    </template>
                    <template #cell-group="{ row }">
                        <span :class="{ 'by-nil': !row.group }">{{
                            row.group || '—'
                        }}</span>
                    </template>
                    <template #cell-state="{ row }">
                        <AChip
                            size="sm"
                            :dot="false"
                            :tone="row.state === 'active' ? 'green' : 'red'"
                        >
                            {{ t(`buying.itemState.${row.state}`) }}
                        </AChip>
                    </template>
                    <template #cell-supplier="{ row }">
                        <span :class="{ 'by-nil': !row.supplier }">{{
                            row.supplier || '—'
                        }}</span>
                    </template>
                    <template #cell-supplierCode="{ row }">
                        <ANum :class="{ 'by-nil': !row.supplierCode }">{{
                            row.supplierCode || '—'
                        }}</ANum>
                    </template>
                    <template #cell-catalogNum="{ row }">
                        <ANum :class="{ 'by-nil': !row.catalogNum }">{{
                            row.catalogNum || '—'
                        }}</ANum>
                    </template>
                    <template #cell-purchaseUom="{ row }">
                        {{ fmt.unit(row.purchaseUom || row.uom) }}
                    </template>
                    <template #cell-numInBuy="{ row }">
                        <ANum>{{ num(row.numInBuy, 3) }}</ANum>
                    </template>
                    <template #cell-packUom="{ row }">
                        <span :class="{ 'by-nil': !row.packUom }">{{
                            row.packUom || '—'
                        }}</span>
                    </template>
                    <template #cell-packQty="{ row }">
                        <ANum :class="{ 'by-nil': row.packQty === null }">{{
                            row.packQty === null ? '—' : num(row.packQty, 3)
                        }}</ANum>
                    </template>
                    <template #cell-lastPrice="{ row }">
                        <ANum :class="{ 'by-nil': row.lastPrice === null }">{{
                            row.lastPrice === null ? '—' : ils(row.lastPrice, 2)
                        }}</ANum>
                    </template>
                    <template #cell-lastPriceOn="{ row }">
                        <ANum :class="{ 'by-nil': !row.lastPriceOn }">{{
                            row.lastPriceOn ? fmtISO(row.lastPriceOn) : '—'
                        }}</ANum>
                    </template>
                    <template #cell-evalPrice="{ row }">
                        <ANum :class="{ 'by-nil': row.evalPrice === null }">{{
                            row.evalPrice === null ? '—' : ils(row.evalPrice, 2)
                        }}</ANum>
                    </template>
                    <template #cell-uom="{ row }">
                        {{ fmt.unit(row.uom) }}
                    </template>
                    <template #cell-onHand="{ row }">
                        <ANum>{{ num(row.onHand, 3) }}</ANum>
                    </template>
                    <template #cell-committed="{ row }">
                        <ANum :class="{ 'by-nil': !row.committed }">{{
                            num(row.committed, 3)
                        }}</ANum>
                    </template>
                    <template #cell-available="{ row }">
                        <ANum :class="{ 'by-low': row.available <= 0 }">{{
                            num(row.available, 3)
                        }}</ANum>
                    </template>
                    <template #cell-onOrder="{ row }">
                        <ANum :class="{ 'by-nil': !row.onOrder }">{{
                            num(row.onOrder, 3)
                        }}</ANum>
                    </template>
                    <template #cell-min="{ row }">
                        <ANum :class="{ 'by-nil': row.min === null }">{{
                            row.min === null ? '—' : num(row.min, 3)
                        }}</ANum>
                    </template>
                    <template #cell-max="{ row }">
                        <ANum :class="{ 'by-nil': row.max === null }">{{
                            row.max === null ? '—' : num(row.max, 3)
                        }}</ANum>
                    </template>
                    <template #cell-reorder="{ row }">
                        <ANum :class="{ 'by-nil': row.reorder === null }">{{
                            row.reorder === null ? '—' : num(row.reorder, 3)
                        }}</ANum>
                    </template>
                    <template #cell-minOrder="{ row }">
                        <ANum :class="{ 'by-nil': row.minOrder === null }">{{
                            row.minOrder === null ? '—' : num(row.minOrder, 3)
                        }}</ANum>
                    </template>
                    <template #cell-leadDays="{ row }">
                        <ANum :class="{ 'by-nil': row.leadDays === null }">{{
                            row.leadDays === null
                                ? '—'
                                : t('buying.days', { n: row.leadDays })
                        }}</ANum>
                    </template>
                    <template #cell-procurement="{ row }">
                        {{ fmt.procurement(row.procurement) }}
                    </template>
                    <template #cell-qty="{ row }">
                        <AInput
                            :model-value="row.qty ?? ''"
                            type="number"
                            min="0"
                            ltr
                            class="by-qty"
                            :class="{
                                'is-short': rules.qtyRequired && !row.qty,
                            }"
                            :aria-label="t('buying.col.qty')"
                            @update:model-value="
                                store.setQty(sheet.id, row.sku, $event)
                            "
                        />
                    </template>
                    <template #cell-done="{ row }">
                        <label class="a-checkrow by-done">
                            <input
                                type="checkbox"
                                :checked="row.done"
                                :aria-label="t('buying.col.done')"
                                @change="store.toggleDone(sheet.id, row.sku)"
                            />
                        </label>
                    </template>
                    <template #cell-drop="{ row }">
                        <AButton
                            sm
                            kind="ghost"
                            icon="x"
                            :title="t('buying.dropLine')"
                            :aria-label="t('buying.dropLine')"
                            @click="store.removeLine(sheet.id, row.sku)"
                        />
                    </template>
                </ADataTable>
            </div>

            <!-- Out -->
            <div v-if="sheet.lines.length" class="a-pane by-foot">
                <span class="by-count">
                    {{
                        t(
                            'buying.lineCount',
                            { n: sheet.lines.length },
                            sheet.lines.length,
                        )
                    }}
                </span>
                <span v-if="needsSupplier" class="by-bad">
                    {{ t('buying.needSupplier') }}
                </span>
                <span v-else-if="short.length" class="by-bad">
                    {{ t('buying.needQty', { n: short.length }, short.length) }}
                </span>
                <AButton
                    class="a-push"
                    icon="check"
                    @click="
                        closed
                            ? store.reopenList(sheet.id)
                            : store.closeList(sheet.id)
                    "
                >
                    {{ closed ? t('buying.reopen') : t('buying.close') }}
                </AButton>
                <AButton
                    kind="p"
                    icon="download"
                    :disabled="blocked"
                    @click="exportSheet"
                >
                    {{ t('buying.export') }}
                </AButton>
            </div>
        </template>
    </div>
</template>

<style scoped>
.by-head,
.by-add,
.by-found,
.by-foot {
    display: flex;
    align-items: end;
    gap: 18px;
    flex-wrap: wrap;
}

.by-head {
    align-items: center;
}

.by-pick {
    --a-field-w: 280px;
    flex: 1 1 auto;
}

/* The working note. A sheet carries one — "sent by email on the 5th", "waiting
   on a price" — and it is the first thing the next person to open it reads. */
.by-note {
    max-width: 720px;
}

.by-note .a-hint {
    margin: 6px 0 0;
}

/* The paste box and the type-ahead sit side by side: one is for the list you
   already have, the other for the item you remember afterwards. */
.by-paste {
    flex: 1 1 380px;
    min-width: 0;
}

.by-paste .a-hint {
    margin: 4px 0 8px;
}

.by-find {
    position: relative;
    flex: 0 1 300px;
    min-width: 0;
}

.by-matches {
    position: absolute;
    z-index: 5;
    inset-inline: 0;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--a-surface);
    border: 1px solid var(--a-line);
    border-radius: 9px;
    box-shadow: 0 12px 30px rgb(24 32 22 / 14%);
    max-height: 260px;
    overflow-y: auto;
}

.by-matches button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border: 0;
    border-radius: 7px;
    background: none;
    font: inherit;
    text-align: start;
    cursor: pointer;
}

.by-matches button:hover {
    background: var(--a-hover);
}

.by-match-n {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.by-found {
    align-items: center;
    gap: 14px;
    font-size: 13px;
}

.by-ok {
    color: var(--a-green);
    font-weight: 600;
}

.by-note-x {
    color: var(--a-ink-4);
}

.by-bad {
    color: var(--a-red);
    font-weight: 600;
}

.by-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.by-foot {
    align-items: center;
}

.by-qty {
    width: 92px;
}

/* A quantity an order cannot leave without. Said on the field, not only in the
   footer, so the buyer can see which row is missing it. */
.by-qty.is-short {
    border-color: var(--a-red);
    background: var(--a-red-bg);
}

.by-done {
    justify-content: center;
}

/* The sheet is wider than the pane, and that is the arrangement: the page
   scrolls sideways to the columns it cannot show. What it must not do is make
   room by squeezing the columns — left to `width: 100%`, the browser takes the
   space out of the text columns first, and the item's name, which is the one
   thing every row is read by, ends up the narrowest cell in the row. So each
   column gets the width of its own content, down to a floor of the pane's
   width so that a two-line sheet still fills it. */
.by-sheet :deep(table.a-table) {
    width: max-content;
    min-width: 100%;
}

/* A name long enough to push the table out on its own wraps instead. */
.by-sheet :deep(tbody td) {
    max-width: 280px;
}

/* `.a-code` breaks a long code so it cannot widen a cell. In a row this wide
   the cell is already narrow, so the break lands between every pair of digits
   and the code comes out stacked. A code on a no-wrap cell stays on its line. */
.by-sheet :deep(td.nowrap .a-code) {
    white-space: nowrap;
    word-break: normal;
}

/* A cell with nothing in it should not read as loudly as one with a number. */
.by-nil {
    color: var(--a-ink-4);
}

/* Nothing on the shelf is the one figure in the row that should catch the eye
   without being looked for. */
.by-low {
    color: var(--a-red);
    font-weight: 600;
}

/* The botanical name is Latin inside a Hebrew row. */
.by-lat {
    direction: ltr;
    display: inline-block;
    unicode-bidi: isolate;
}
</style>
