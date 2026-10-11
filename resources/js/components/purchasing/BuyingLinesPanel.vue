<script setup>
// The lines of one sheet, and the two ways lines get onto it.
//
// Pasting is the one the work actually uses — a column out of Excel, a line out
// of an email — and the search button turns the block into rows in one press.
// The type-ahead beside it is for the item the buyer thinks of afterwards.
//
// **The table fits the page.** It carried the whole item card for a while,
// twenty-nine columns and three thousand pixels of it, and that was the wrong
// trade: the quantity — the one cell anybody comes here to fill — ended up past
// the right-hand edge, and the page's own heading and status band scrolled out
// of view to reach it. What stays on the row is what the decision is made from:
// how much is on the shelf, how much is already coming, what the minimum is,
// and the quantity. The rest of the card is a click away on the row, and the
// export still writes every column, because a spreadsheet is the one place
// where carrying everything costs nothing.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BuyingLineDrawer from '@/components/purchasing/BuyingLineDrawer.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { BUYING_KIND } from '@/config';
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

/** Was anything ever booked in against this sheet? */
const hasReceipt = computed(() =>
    props.list.lines.some((line) => line.received !== null),
);

/**
 * What a buyer reads before writing a quantity, and nothing else.
 *
 * `cls` on the two working columns tints them, header included, so the part of
 * the row that is filled in reads as one block rather than as two more cells.
 */
const cols = computed(() => {
    const out = [
        { k: 'sku', label: label('sku'), nowrap: true, sortable: true },
        { k: 'name', label: label('name'), sortable: true },
        { k: 'uom', label: label('uomShort'), nowrap: true },
        {
            k: 'available',
            label: label('available'),
            align: 'end',
            nowrap: true,
            sortable: true,
        },
        { k: 'onOrder', label: label('onOrder'), align: 'end', nowrap: true },
        { k: 'min', label: label('minShort'), align: 'end', nowrap: true },
        {
            k: 'lastPrice',
            label: label('lastPrice'),
            align: 'end',
            nowrap: true,
        },
        {
            k: 'qty',
            label: label('qty'),
            align: 'end',
            nowrap: true,
            cls: 'bl-work',
        },
    ];

    if (hasReceipt.value) {
        out.push({
            k: 'received',
            label: label('received'),
            align: 'end',
            nowrap: true,
            cls: 'bl-work',
        });
    }

    if (rules.value.checklist) {
        out.push({
            k: 'done',
            label: label('done'),
            nowrap: true,
            cls: 'bl-work',
        });
    }

    out.push({ k: 'more', label: '', nowrap: true });

    return out;
});

const unit = (uom) => (uom ? t(`inventory.unit.${uom}`) : '');

// ---- one line in full ------------------------------------------------------

const openSku = ref('');

const openLine = computed(
    () => props.list.lines.find((line) => line.sku === openSku.value) || null,
);
</script>

<template>
    <div class="bl">
        <!-- Whatever the sheet carries above its lines, and the two ways a
             line gets onto it. One grid, so every label starts on the same
             line and every field shares one edge. -->
        <div v-if="$slots.head || !readonly" class="bl-add">
            <div class="bl-main">
                <slot name="head" />

                <template v-if="!readonly">
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
                </template>
            </div>

            <div v-if="!readonly" class="bl-find">
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
        <div v-if="found" class="bl-found">
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
            :selected="openSku"
        >
            <template #cell-sku="{ row }">
                <ANum class="a-code">{{ row.sku }}</ANum>
            </template>
            <template #cell-name="{ row }">
                <button
                    type="button"
                    class="bl-name"
                    :title="row.name"
                    @click="openSku = row.sku"
                >
                    {{ row.name }}
                </button>
            </template>
            <template #cell-uom="{ row }">{{ unit(row.uom) }}</template>
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
            <template #cell-lastPrice="{ row }">
                <ANum :class="{ 'bl-nil': row.lastPrice === null }">{{
                    row.lastPrice === null ? '—' : ils(row.lastPrice, 2)
                }}</ANum>
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
            <template #cell-more="{ row }">
                <span class="bl-tools">
                    <AButton
                        sm
                        kind="ghost"
                        icon="external"
                        :title="t('buying.lineDetails')"
                        :aria-label="t('buying.lineDetails')"
                        @click="openSku = row.sku"
                    />
                    <AButton
                        v-if="!readonly"
                        sm
                        kind="ghost"
                        icon="x"
                        :title="t('buying.dropLine')"
                        :aria-label="t('buying.dropLine')"
                        @click="store.removeLine(list.id, row.sku)"
                    />
                </span>
            </template>
        </ADataTable>

        <BuyingLineDrawer :line="openLine" :list="list" @close="openSku = ''" />
    </div>
</template>

<style scoped>
.bl {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

/* The paste box and the type-ahead sit side by side: one is for the list you
   already have, the other for the item you remember afterwards. Two columns
   and `align-items: start`, not a flex row ending at the same baseline — the
   left column is a label, a box, a hint and a button tall, so a bottom-aligned
   neighbour floats down beside the button with nothing to line up against. */
.bl-add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: start;
    gap: 18px;
}

.bl-main {
    min-width: 0;
}

.bl-main .a-hint {
    margin: 4px 0 8px;
}

.bl-found {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 13px;
}

.bl-find {
    position: relative;
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

/* The item's name opens the rest of its card. It is a button rather than a
   clickable row because the row already holds two inputs and a checkbox, and a
   row that is itself a control swallows the clicks meant for them. */
.bl-name {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--a-accent-ink, var(--a-ink));
    text-align: start;
    cursor: pointer;
}

.bl-name:hover {
    text-decoration: underline;
}

/* Ten columns on a laptop pane is a tight fit, and the console's own cell
   padding is written for tables of five. Trimming it is what keeps this table
   off a horizontal scroll bar at the narrowest width the shell allows. */
.bl-sheet :deep(th),
.bl-sheet :deep(td) {
    padding-inline: 12px;
}

/* The part of the row that is filled in, header included, so the quantity is
   somewhere the eye lands instead of somewhere it has to be looked for. */
.bl-sheet :deep(.bl-work) {
    background: var(--a-tint);
}

/* Every width below is measured, not guessed: the row has to clear the 815
   pixels a table gets inside the narrowest pane the shell allows.
 *
 * `min-width` and not only `width`: `.a-input` carries a 150px minimum, which
 * is right for a form field and four times what a quantity needs, and a width
 * alone does not get past it. That one line was 50 pixels of the overflow. */
.bl-qty {
    width: 76px;
    min-width: 76px;
}

.bl-sheet :deep(.a-code) {
    padding-inline: 8px;
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

.bl-tools {
    display: inline-flex;
    gap: 0;
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
</style>
