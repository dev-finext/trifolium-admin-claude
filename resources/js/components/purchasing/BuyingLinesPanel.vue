<script setup>
// The lines of one sheet, and the two ways lines get onto it.
//
// Pasting is the one the work actually uses — a column out of Excel, a line out
// of an email — and the search button turns the block into rows in one press.
// The type-ahead beside it is for the item the buyer thinks of afterwards.
//
// A line carries the item card rather than pointing at it, which makes the
// table wide, and a wide table is the right answer: the decision "do I order
// this, and how much" is made out of those columns and not out of eleven item
// cards opened one after another. The bar above the table reaches the rest.
//
// Shared by both editors, because a request's lines and an order's lines are
// the same lines — what differs is three facts, and they are in config/buying.js.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { BUYING_KIND } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useItemsStore } from '@/stores/items';

/** How many matches the type-ahead offers before it asks for more letters. */
const MATCHES = 8;

const props = defineProps({
    /** The sheet whose lines these are. */
    list: { type: Object, required: true },
    /** A sheet that has been received or has failed is read from, not edited. */
    readonly: { type: Boolean, default: false },
});

const { t } = useI18n();
const items = useItemsStore();
const store = useBuyingStore();

const rules = computed(() => BUYING_KIND[props.list.kind]);

// ---- adding lines --------------------------------------------------------

const paste = ref('');
const found = ref(null);

function search() {
    if (!paste.value.trim()) {
        return;
    }

    found.value = store.addSkus(props.list.id, paste.value);

    if (found.value.added.length) {
        paste.value = '';
    }
}

const query = ref('');

const matches = computed(() => {
    const q = query.value.trim().toLowerCase();

    if (q.length < 2) {
        return [];
    }

    const taken = new Set(props.list.lines.map((line) => line.sku));

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
    store.addItem(props.list.id, row.sku);
    query.value = '';
}

// ---- the table -----------------------------------------------------------

const label = (key) => t(`buying.col.${key}`);

const amount = (key) => ({ k: key, label: label(key), align: 'end' });

/** Was anything ever booked in against this sheet? */
const hasReceipt = computed(() =>
    props.list.lines.some((line) => line.received !== null),
);

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

    if (hasReceipt.value) {
        out.push(amount('received'));
    }

    if (rules.value.checklist) {
        out.push({ k: 'done', label: label('done'), nowrap: true });
    }

    if (!props.readonly) {
        out.push({ k: 'drop', label: '', nowrap: true });
    }

    return out;
});

const unit = (uom) => (uom ? t(`inventory.unit.${uom}`) : '');
</script>

<template>
    <div class="bl">
        <!-- Adding lines -->
        <div v-if="!readonly" class="a-pane bl-add">
            <div class="bl-paste">
                <label class="a-lbl" :for="`paste-${list.id}`">
                    {{ t('buying.paste') }}
                </label>
                <ATextarea
                    :id="`paste-${list.id}`"
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

            <div class="bl-find">
                <label class="a-lbl" :for="`find-${list.id}`">
                    {{ t('buying.addOne') }}
                </label>
                <AInput
                    :id="`find-${list.id}`"
                    v-model="query"
                    :placeholder="t('buying.addOnePlaceholder')"
                    class="a-w100"
                />
                <ul v-if="matches.length" class="bl-matches">
                    <li v-for="row in matches" :key="row.sku">
                        <button type="button" @click="pick(row)">
                            <span class="a-code a-tag">{{ row.sku }}</span>
                            <span class="bl-match-n">{{ row.names?.he }}</span>
                        </button>
                    </li>
                </ul>
            </div>
        </div>

        <!-- What the last search did -->
        <div v-if="found" class="a-pane bl-found">
            <span v-if="found.added.length" class="bl-ok">
                {{
                    t(
                        'buying.foundAdded',
                        { n: found.added.length },
                        found.added.length,
                    )
                }}
            </span>
            <span v-if="found.already.length" class="bl-quiet">
                {{
                    t('buying.foundAlready', { list: found.already.join(', ') })
                }}
            </span>
            <span v-if="found.missing.length" class="bl-bad">
                {{
                    t('buying.foundMissing', { list: found.missing.join(', ') })
                }}
            </span>
        </div>

        <AEmpty
            v-if="!list.lines.length"
            icon="list"
            :title="t('buying.noLinesTitle')"
            :sub="t('buying.noLinesSub')"
        />

        <ADataTable
            v-else
            class="bl-sheet"
            :cols="cols"
            :rows="list.lines"
            row-key="sku"
        >
            <template #cell-sku="{ row }">
                <ANum class="a-code">{{ row.sku }}</ANum>
            </template>
            <template #cell-foreignName="{ row }">
                <span class="bl-lat" :class="{ 'bl-nil': !row.foreignName }">{{
                    row.foreignName || '—'
                }}</span>
            </template>
            <template #cell-group="{ row }">
                <span :class="{ 'bl-nil': !row.group }">{{
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
                <span :class="{ 'bl-nil': !row.supplier }">{{
                    row.supplier || '—'
                }}</span>
            </template>
            <template #cell-supplierCode="{ row }">
                <ANum :class="{ 'bl-nil': !row.supplierCode }">{{
                    row.supplierCode || '—'
                }}</ANum>
            </template>
            <template #cell-catalogNum="{ row }">
                <ANum :class="{ 'bl-nil': !row.catalogNum }">{{
                    row.catalogNum || '—'
                }}</ANum>
            </template>
            <template #cell-purchaseUom="{ row }">
                {{ unit(row.purchaseUom || row.uom) }}
            </template>
            <template #cell-numInBuy="{ row }">
                <ANum>{{ num(row.numInBuy, 3) }}</ANum>
            </template>
            <template #cell-packUom="{ row }">
                <span :class="{ 'bl-nil': !row.packUom }">{{
                    row.packUom || '—'
                }}</span>
            </template>
            <template #cell-packQty="{ row }">
                <ANum :class="{ 'bl-nil': row.packQty === null }">{{
                    row.packQty === null ? '—' : num(row.packQty, 3)
                }}</ANum>
            </template>
            <template #cell-lastPrice="{ row }">
                <ANum :class="{ 'bl-nil': row.lastPrice === null }">{{
                    row.lastPrice === null ? '—' : ils(row.lastPrice, 2)
                }}</ANum>
            </template>
            <template #cell-lastPriceOn="{ row }">
                <ANum :class="{ 'bl-nil': !row.lastPriceOn }">{{
                    row.lastPriceOn ? fmtISO(row.lastPriceOn) : '—'
                }}</ANum>
            </template>
            <template #cell-evalPrice="{ row }">
                <ANum :class="{ 'bl-nil': row.evalPrice === null }">{{
                    row.evalPrice === null ? '—' : ils(row.evalPrice, 2)
                }}</ANum>
            </template>
            <template #cell-uom="{ row }">{{ unit(row.uom) }}</template>
            <template #cell-onHand="{ row }">
                <ANum>{{ num(row.onHand, 3) }}</ANum>
            </template>
            <template #cell-committed="{ row }">
                <ANum :class="{ 'bl-nil': !row.committed }">{{
                    num(row.committed, 3)
                }}</ANum>
            </template>
            <template #cell-available="{ row }">
                <ANum :class="{ 'bl-low': row.available <= 0 }">{{
                    num(row.available, 3)
                }}</ANum>
            </template>
            <template #cell-onOrder="{ row }">
                <ANum :class="{ 'bl-nil': !row.onOrder }">{{
                    num(row.onOrder, 3)
                }}</ANum>
            </template>
            <template #cell-min="{ row }">
                <ANum :class="{ 'bl-nil': row.min === null }">{{
                    row.min === null ? '—' : num(row.min, 3)
                }}</ANum>
            </template>
            <template #cell-max="{ row }">
                <ANum :class="{ 'bl-nil': row.max === null }">{{
                    row.max === null ? '—' : num(row.max, 3)
                }}</ANum>
            </template>
            <template #cell-reorder="{ row }">
                <ANum :class="{ 'bl-nil': row.reorder === null }">{{
                    row.reorder === null ? '—' : num(row.reorder, 3)
                }}</ANum>
            </template>
            <template #cell-minOrder="{ row }">
                <ANum :class="{ 'bl-nil': row.minOrder === null }">{{
                    row.minOrder === null ? '—' : num(row.minOrder, 3)
                }}</ANum>
            </template>
            <template #cell-leadDays="{ row }">
                <ANum :class="{ 'bl-nil': row.leadDays === null }">{{
                    row.leadDays === null
                        ? '—'
                        : t('buying.days', { n: row.leadDays })
                }}</ANum>
            </template>
            <template #cell-procurement="{ row }">
                {{ t(`items.procurementMethod.${row.procurement}`) }}
            </template>
            <template #cell-qty="{ row }">
                <AInput
                    v-if="!readonly"
                    :model-value="row.qty ?? ''"
                    type="number"
                    min="0"
                    ltr
                    class="bl-qty"
                    :class="{ 'is-short': rules.qtyRequired && !row.qty }"
                    :aria-label="t('buying.col.qty')"
                    @update:model-value="store.setQty(list.id, row.sku, $event)"
                />
                <ANum v-else>{{
                    row.qty === null ? '—' : num(row.qty, 3)
                }}</ANum>
            </template>
            <template #cell-received="{ row }">
                <ANum
                    :class="{
                        'bl-nil': row.received === null,
                        'bl-low':
                            row.received !== null && row.received < row.qty,
                    }"
                    >{{
                        row.received === null ? '—' : num(row.received, 3)
                    }}</ANum
                >
            </template>
            <template #cell-done="{ row }">
                <label class="a-checkrow bl-done">
                    <input
                        type="checkbox"
                        :checked="row.done"
                        :disabled="readonly"
                        :aria-label="t('buying.col.done')"
                        @change="store.toggleDone(list.id, row.sku)"
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
                    @click="store.removeLine(list.id, row.sku)"
                />
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
/* `minmax(0, 1fr)` and not the default `auto`: a grid track sizes itself to its
   widest item, and the widest item here is a table three thousand pixels across.
   Left to grow, the track takes the scroll bar above the table with it and there
   is nothing left for it to scroll. */
.bl {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

.bl-add,
.bl-found {
    display: flex;
    align-items: end;
    gap: 18px;
    flex-wrap: wrap;
}

/* The paste box and the type-ahead sit side by side: one is for the list you
   already have, the other for the item you remember afterwards. */
.bl-paste {
    flex: 1 1 340px;
    min-width: 0;
}

.bl-paste .a-hint {
    margin: 4px 0 8px;
}

.bl-find {
    position: relative;
    flex: 0 1 280px;
    min-width: 0;
}

.bl-matches {
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

.bl-matches button {
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

.bl-matches button:hover {
    background: var(--a-hover);
}

.bl-match-n {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bl-found {
    align-items: center;
    gap: 14px;
    font-size: 13px;
}

.bl-ok {
    color: var(--a-green);
    font-weight: 600;
}

.bl-quiet {
    color: var(--a-ink-4);
}

.bl-bad {
    color: var(--a-red);
    font-weight: 600;
}

.bl-qty {
    width: 92px;
}

/* A quantity an order cannot leave without. Said on the field, not only in the
   footer, so the buyer can see which row is missing it. */
.bl-qty.is-short {
    border-color: var(--a-red);
    background: var(--a-red-bg);
}

.bl-done {
    justify-content: center;
}

/* The sheet is wider than the pane, and that is the arrangement: the bar above
   it reaches the columns it cannot show. What it must not do is make room by
   squeezing the columns — left to `width: 100%`, the browser takes the space
   out of the text columns first, and the item's name, which is the one thing
   every row is read by, ends up the narrowest cell in the row. */
.bl-sheet :deep(table.a-table) {
    width: max-content;
    min-width: 100%;
}

/* A name long enough to push the table out on its own wraps instead. */
.bl-sheet :deep(tbody td) {
    max-width: 280px;
}

/* A cell with nothing in it should not read as loudly as one with a number. */
.bl-nil {
    color: var(--a-ink-4);
}

/* Nothing on the shelf, or less than was ordered — the two figures in the row
   that should catch the eye without being looked for. */
.bl-low {
    color: var(--a-red);
    font-weight: 600;
}

/* The botanical name is Latin inside a Hebrew row. */
.bl-lat {
    direction: ltr;
    display: inline-block;
    unicode-bidi: isolate;
}
</style>
