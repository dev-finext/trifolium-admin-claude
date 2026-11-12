<script setup>
// הצמדת חשבונית מס — one tax invoice for one or more open delivery notes of one
// supplier (12.11.2026).
//
// **For production.** The whole model is config/supplierDocs.js; the write is
// stores/buying.js `attachInvoice` → stores/purchasing.js `attachInvoice`.
//
// Opened from three places: the suppliers screen's "תעודות משלוח פתוחות" tab,
// the supplier card's documents tab, and an order waiting for its invoice. From
// a supplier or an order the supplier is fixed; from the open-notes tab it is
// the supplier of the note it was opened on, and can be changed. Then:
//
//   1. which of the supplier's open notes the invoice covers — ticked; the
//      notes it was opened with start ticked, and so does a supplier's only one;
//   2. the invoice's number and date (both required), its scan (optional) and
//      a note;
//   3. a price for every line of every ticked note — required, per purchase
//      unit and before VAT, opened at the line's quote price (the order's
//      "הצעת מחיר"; a general line at its own price), empty where there is none.
//      One labelled block per note, a labelled field per line — never a
//      header row over bare inputs.
//
// The value before VAT, the VAT and the total add up as the prices are typed.
// Saving asks once, saying what will happen — the notes close, the invoice
// enters the supplier's open balance, the prices reach the batches and the item
// cards, and which orders close because nothing else waits on them.
import { computed, reactive, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AFilePick from '@/components/ui/AFilePick.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { docRef, lineBuyQty, SETTINGS } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { ils, qtyText } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';
import { usePurchasingStore } from '@/stores/purchasing';

/** Wide enough for a note's lines to sit three to a row. */
const WIDTH = 900;

const props = defineProps({
    open: { type: Boolean, default: false },
    /** The supplier, when the dialog is opened for one. */
    supplierCode: { type: String, default: '' },
    /** Receipt ids that start ticked. */
    preselect: { type: Array, default: () => [] },
    /** May the supplier be changed here? Only from the open-notes tab. */
    pickSupplier: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'attached']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const uid = useId();
const dataset = useDatasetStore();
const purchasing = usePurchasingStore();
const buying = useBuyingStore();

const code = ref('');
const picked = ref([]);
const num = ref('');
const date = ref(isoDaysAgo(0));
const file = ref(null);
const note = ref('');
const saving = ref(false);
const asking = ref(false);
/** One price string per line, per note: `{ [receiptId]: string[] }`. */
const prices = reactive({});

/** A price the person typed: a number, zero or more. */
const isPrice = (value) =>
    value !== '' &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0;

const notes = computed(() =>
    code.value ? purchasing.openNotesOf(code.value) : [],
);

/** What a line's price field opens at: the quote, or a general line's own. */
const openingPrice = (line) => {
    const value = line.general ? line.price : line.quotePrice;

    return value === null || value === undefined ? '' : String(value);
};

function fillPrices() {
    Object.keys(prices).forEach((key) => delete prices[key]);
    notes.value.forEach((receipt) => {
        prices[receipt.id] = receipt.lines.map(openingPrice);
    });
}

function reset() {
    code.value = props.supplierCode || '';
    num.value = '';
    date.value = isoDaysAgo(0);
    file.value = null;
    note.value = '';
    saving.value = false;
    asking.value = false;
    fillPrices();

    const own = new Set(notes.value.map((receipt) => receipt.id));
    const given = props.preselect.filter((id) => own.has(id));

    picked.value = given.length
        ? given
        : notes.value.length === 1
          ? [notes.value[0].id]
          : [];
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            reset();
        }
    },
    { immediate: true },
);

function onSupplier(next) {
    code.value = next;
    picked.value = [];
    fillPrices();

    if (notes.value.length === 1) {
        picked.value = [notes.value[0].id];
    }
}

/** Every supplier with an open note — the only ones an invoice can attach to. */
const supplierOptions = computed(() => {
    const counts = new Map();

    purchasing.openDeliveryNotes.forEach((receipt) => {
        if (receipt.supplierCode) {
            counts.set(
                receipt.supplierCode,
                (counts.get(receipt.supplierCode) || 0) + 1,
            );
        }
    });

    return [
        { value: '', label: t('supplierDocs.attach.supplierPick') },
        ...[...counts.entries()].map(([value, n]) => {
            const supplier = dataset.suppliers.find(
                (one) => one.code === value,
            );

            return {
                value,
                label: t(
                    'supplierDocs.attach.supplierOption',
                    { name: loc(supplier?.name) || value, n },
                    n,
                ),
            };
        }),
    ];
});

const supplierName = computed(() => {
    const supplier = dataset.suppliers.find((one) => one.code === code.value);

    return supplier ? loc(supplier.name) : '';
});

function toggle(id) {
    picked.value = picked.value.includes(id)
        ? picked.value.filter((one) => one !== id)
        : [...picked.value, id];
}

const chosen = computed(() =>
    notes.value.filter((receipt) => picked.value.includes(receipt.id)),
);

/** Lines of the ticked notes that still have no price. */
const missing = computed(() =>
    chosen.value.reduce(
        (sum, receipt) =>
            sum +
            receipt.lines.filter(
                (line, index) => !isPrice(prices[receipt.id]?.[index]),
            ).length,
        0,
    ),
);

const round2 = (value) => Math.round(value * 100) / 100;

const net = computed(() =>
    round2(
        chosen.value.reduce(
            (sum, receipt) =>
                sum +
                receipt.lines.reduce(
                    (inner, line, index) =>
                        inner +
                        lineBuyQty(line) *
                            (Number(prices[receipt.id]?.[index]) || 0),
                    0,
                ),
            0,
        ),
    ),
);
const vat = computed(() => round2(net.value * SETTINGS.vatRate));
const total = computed(() => round2(net.value + vat.value));

/** The first thing still missing, said beside the button. */
const blocker = computed(() => {
    if (!code.value) {
        return t('supplierDocs.attach.need.supplier');
    }

    if (!chosen.value.length) {
        return t('supplierDocs.attach.need.notes');
    }

    if (!num.value.trim()) {
        return t('supplierDocs.attach.need.num');
    }

    if (!date.value) {
        return t('supplierDocs.attach.need.date');
    }

    return missing.value
        ? t(
              'supplierDocs.attach.need.prices',
              { n: missing.value },
              missing.value,
          )
        : '';
});

/**
 * The orders this invoice will close: each one waiting for its invoice whose
 * open notes are all among the ticked ones — the same rule the store applies.
 */
const closing = computed(() => {
    const ticked = new Set(picked.value);

    return [
        ...new Set(chosen.value.map((receipt) => receipt.po).filter(Boolean)),
    ]
        .map((id) => buying.listById(id))
        .filter(
            (list) =>
                list?.state === 'awaiting_invoice' &&
                buying
                    .openNotesOfList(list)
                    .every((receipt) => ticked.has(receipt.id)),
        );
});

const effects = computed(() => {
    const out = [
        t(
            'supplierDocs.attach.effectNotes',
            { n: chosen.value.length },
            chosen.value.length,
        ),
        t('supplierDocs.attach.effectBalance', { total: ils(total.value, 2) }),
        t('supplierDocs.attach.effectPrices'),
    ];

    if (closing.value.length) {
        out.push(
            t(
                'supplierDocs.attach.effectOrders',
                {
                    numbers: closing.value
                        .map((list) => list.number)
                        .join(', '),
                },
                closing.value.length,
            ),
        );
    }

    return out;
});

const unit = (uom) => (uom ? t(`inventory.unit.${uom}`) : '');

/** Under a line's price: what it is, how much, and the quote it opened at. */
function lineHint(line) {
    const qty = t('supplierDocs.attach.qtyLine', {
        qty: qtyText(lineBuyQty(line), 3),
        uom: unit(line.unit),
    });

    if (line.general) {
        return qty;
    }

    return `${qty} · ${
        line.quotePrice === null || line.quotePrice === undefined
            ? t('supplierDocs.attach.noQuote')
            : t('supplierDocs.attach.quote', {
                  price: ils(line.quotePrice, 2),
              })
    }`;
}

/** The order a note was received against, by its number. */
function poNumber(receipt) {
    return buying.listById(receipt.po)?.number || receipt.poNumber || '';
}

async function confirmed() {
    asking.value = false;

    if (blocker.value) {
        return;
    }

    saving.value = true;

    try {
        const { invoice, closed } = await buying.attachInvoice({
            supplierCode: code.value,
            num: num.value.trim(),
            date: date.value,
            receipts: chosen.value.map((receipt) => receipt.id),
            prices: Object.fromEntries(
                chosen.value.map((receipt) => [
                    receipt.id,
                    prices[receipt.id].map(Number),
                ]),
            ),
            file: file.value,
            note: note.value,
        });

        push({
            title: t('supplierDocs.attach.done', { num: invoice.num }),
            body: [
                t(
                    'supplierDocs.attach.doneBody',
                    { n: invoice.receipts.length },
                    invoice.receipts.length,
                ),
                closed.length
                    ? t(
                          'supplierDocs.attach.doneOrders',
                          {
                              numbers: closed
                                  .map((list) => list.number)
                                  .join(', '),
                          },
                          closed.length,
                      )
                    : '',
            ]
                .filter(Boolean)
                .join(' · '),
        });
        emit('attached', { invoice, closed });
        emit('close');
    } catch (error) {
        push({ title: String(error?.message || error), bad: true });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('supplierDocs.attach.title')"
        :width="WIDTH"
        @close="emit('close')"
    >
        <p class="a-hint ai-lead">{{ t('supplierDocs.attach.lead') }}</p>

        <div class="ai-head">
            <div>
                <label class="a-lbl" :for="`${uid}-sup`">
                    {{ t('supplierDocs.attach.supplier') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <ASelect
                    v-if="pickSupplier"
                    :id="`${uid}-sup`"
                    :model-value="code"
                    :options="supplierOptions"
                    class="a-w100"
                    @update:model-value="onSupplier"
                />
                <div v-else :id="`${uid}-sup`" class="ai-fixed">
                    {{ supplierName || code }}
                </div>
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-num`">
                    {{ t('supplierDocs.attach.num') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <AInput :id="`${uid}-num`" v-model="num" ltr class="a-w100" />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-date`">
                    {{ t('supplierDocs.attach.date') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <AInput
                    :id="`${uid}-date`"
                    v-model="date"
                    type="date"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-file`">
                    {{ t('supplierDocs.attach.file') }}
                </label>
                <AFilePick v-model="file" :input-id="`${uid}-file`" />
                <div class="a-hint">
                    {{ t('supplierDocs.attach.fileHint') }}
                </div>
            </div>
        </div>

        <fieldset v-if="code" class="ai-notes">
            <legend class="a-lbl">{{ t('supplierDocs.attach.notes') }}</legend>
            <p v-if="!notes.length" class="a-hint">
                {{ t('supplierDocs.attach.noNotes') }}
            </p>
            <label
                v-for="receipt in notes"
                :key="receipt.id"
                class="a-checkrow ai-note"
            >
                <input
                    type="checkbox"
                    :checked="picked.includes(receipt.id)"
                    @change="toggle(receipt.id)"
                />
                <span>
                    {{
                        t('supplierDocs.attach.noteLabel', {
                            ref: docRef(receipt),
                            date: fmtISO(receipt.when.iso),
                        })
                    }}
                    <span v-if="poNumber(receipt)" class="ai-sub">
                        ·
                        {{
                            t('supplierDocs.attach.notePo', {
                                number: poNumber(receipt),
                            })
                        }}
                    </span>
                </span>
            </label>
        </fieldset>

        <div
            v-for="receipt in chosen"
            :key="receipt.id"
            class="ai-block"
            role="group"
            :aria-label="
                t('supplierDocs.attach.noteLabel', {
                    ref: docRef(receipt),
                    date: fmtISO(receipt.when.iso),
                })
            "
        >
            <div class="ai-block-head">
                <span class="t-strong">{{
                    t('supplierDocs.attach.noteLabel', {
                        ref: docRef(receipt),
                        date: fmtISO(receipt.when.iso),
                    })
                }}</span>
                <span v-if="poNumber(receipt)" class="ai-sub">{{
                    t('supplierDocs.attach.notePo', {
                        number: poNumber(receipt),
                    })
                }}</span>
            </div>
            <div class="ai-lines">
                <div
                    v-for="(line, index) in receipt.lines"
                    :key="`${receipt.id}-${index}`"
                    class="ai-line"
                    :class="{
                        'is-wanted': !isPrice(prices[receipt.id]?.[index]),
                    }"
                >
                    <div class="ai-line-name" :title="loc(line.name)">
                        <span v-if="line.sku" class="a-code">{{
                            line.sku
                        }}</span>
                        <span v-else class="ai-sub">{{
                            t('supplierDocs.general')
                        }}</span>
                        <span class="ai-line-text">{{ loc(line.name) }}</span>
                    </div>
                    <label class="a-lbl" :for="`${uid}-${receipt.id}-${index}`">
                        {{ t('supplierDocs.attach.price') }}
                        <span class="a-req">{{ t('labels.required') }}</span>
                    </label>
                    <AInput
                        :id="`${uid}-${receipt.id}-${index}`"
                        v-model="prices[receipt.id][index]"
                        type="number"
                        min="0"
                        step="0.01"
                        ltr
                    />
                    <div class="a-hint">{{ lineHint(line) }}</div>
                </div>
            </div>
        </div>

        <div v-if="chosen.length" class="ai-sum">
            <div>
                <span>{{ t('supplierDocs.attach.net') }}</span>
                <ANum>{{ ils(net, 2) }}</ANum>
            </div>
            <div>
                <span>{{
                    t('supplierDocs.attach.vat', {
                        rate: Math.round(SETTINGS.vatRate * 100),
                    })
                }}</span>
                <ANum>{{ ils(vat, 2) }}</ANum>
            </div>
            <div class="t-strong">
                <span>{{ t('supplierDocs.attach.total') }}</span>
                <ANum>{{ ils(total, 2) }}</ANum>
            </div>
        </div>

        <div class="ai-note-field">
            <label class="a-lbl" :for="`${uid}-note`">
                {{ t('supplierDocs.attach.note') }}
            </label>
            <AInput :id="`${uid}-note`" v-model="note" class="a-w100" />
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="Boolean(blocker) || saving"
                @click="asking = true"
            >
                {{ t('supplierDocs.attach.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
            <span v-if="blocker" class="a-rf-need">{{ blocker }}</span>
        </template>
    </AModal>

    <ConfirmDialog
        :open="asking"
        :title="t('supplierDocs.attach.confirmTitle', { num: num.trim() })"
        :body="
            t(
                'supplierDocs.attach.confirmBody',
                { n: chosen.length },
                chosen.length,
            )
        "
        :effects="effects"
        :confirm-label="t('supplierDocs.attach.save')"
        @close="asking = false"
        @confirm="confirmed"
    />
</template>

<style scoped>
.ai-lead {
    margin: 0 0 14px;
}

.ai-head {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px 14px;
    margin-bottom: 16px;
}

.ai-fixed {
    padding: 8px 0;
    font-weight: 600;
}

.ai-notes {
    display: grid;
    gap: 6px;
    margin: 0 0 16px;
    padding: 0;
    border: 0;
}

.ai-note {
    align-items: baseline;
}

.ai-sub {
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.ai-block {
    display: grid;
    gap: 10px;
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid var(--a-line);
    border-radius: var(--a-r);
}

.ai-block-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
}

.ai-lines {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px 16px;
}

.ai-line {
    min-width: 0;
}

.ai-line-name {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
    font-weight: 600;
    font-size: 13.5px;
    min-width: 0;
    white-space: nowrap;
}

.ai-line-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* A line still without its price, said on the field. */
.ai-line.is-wanted :deep(.a-input) {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
}

.ai-sum {
    display: grid;
    justify-content: end;
    gap: 4px;
    margin: 4px 0 16px;
    font-size: 14px;
}

.ai-sum > div {
    display: flex;
    justify-content: space-between;
    gap: 24px;
}

.ai-note-field {
    margin-bottom: 4px;
}
</style>
