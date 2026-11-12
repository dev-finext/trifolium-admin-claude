<script setup>
// Goods receipt — the only door stock comes in through.
//
// One block per batch: an item, a quantity, a batch number, the supplier's own
// batch code and an expiry date. Each block opens a separate batch and enters
// stock the moment the receipt is saved, which is why the block is dense rather
// than a wizard — a delivery of eight herbs is eight blocks on one screen.
//
// Second-version additions, each marked: the supplier is picked from the supplier
// list, a line may top up an existing batch instead of opening one, the expiry
// defaults from the family's shelf life, and a line carries the price that
// becomes the item's last purchase price and the number of item labels to print.
//
// **The supplier is always a card from the list (12.11.2026).** Every receipt is
// a supplier document kept on that supplier's card, and a delivery note waits
// there for its tax invoice — so a supplier typed by hand, with no card, has no
// place for either. The free-text "ספק אחר" was removed for exactly that reason.
//
// **For production — 12.11.2026.** The same document rules as a receipt against
// an order (BuyingReceive, config/supplierDocs.js): the person chooses which
// document the goods came on — "תעודת משלוח", no prices; or "חשבונית מס", a
// price on every line, mandatory, before VAT, and the invoice is recorded on
// the supplier, so a tax invoice needs a supplier from the list. An item whose
// card has "ניהול אצוות" off is booked in with no batch, production date or
// expiry. Any number of "פריט כללי" lines — description, quantity, price
// before VAT — ride on the document without touching stock. The scan may be
// attached here. Everything is booked through `purchasing.receiveDocument`.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemPicker from '@/components/inventory/ItemPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AFilePick from '@/components/ui/AFilePick.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CURRENCY_SYMBOL, RECEIPT_DOC_TYPE_IDS, WAREHOUSES } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';
import { supplierSelectable } from '@/stores/system';

/** One field to a row, label beside it: the form no longer needs the width. */
const WIDTH = 860;

const props = defineProps({
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const inventory = useInventoryStore();
const items = useItemsStore();
const purchasing = usePurchasingStore();
const uid = useId();

const supplierCode = ref('');
const supplier = ref('');
// Which document the goods came on — chosen, never assumed.
const docType = ref('');
const docNum = ref('');
const date = ref(isoDaysAgo(0));
const note = ref('');
const file = ref(null);
const lines = ref([]);
// "פריט כללי" — lines on the document that are not catalogue items.
const general = ref([]);
const saving = ref(false);

const invoice = computed(() => docType.value === 'tax_invoice');

const docTypeOptions = computed(() => [
    { value: '', label: t('buying.receive.docTypePick') },
    ...RECEIPT_DOC_TYPE_IDS.map((id) => ({
        value: id,
        label: t(`supplierDocs.type.${id}`),
    })),
]);

/** A price the person typed: a number, zero or more. */
const isPrice = (value) =>
    value !== '' &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0;

/** Is the line's item kept in batches? "ניהול אצוות" on its card. */
const batched = (line) =>
    !line.sku || items.itemBySku(line.sku)?.flags?.batch !== false;

/**
 * The batch number line `i` opens. V3.
 *
 * Goods from a supplier keep the supplier's own batch code, always — Yaron:
 * "אם חומר גלם מגיע מספק המוצר מקבל אצוות ספק תמיד לא משנה אם מספר קיים
 * במערכת". So there is nothing for the console to allocate here: the number is
 * whatever the delivery note says, and the line cannot be saved without it.
 */
function batchFor(i) {
    const line = lines.value[i];

    if (!line?.sku || line.existingBatch) {
        return '';
    }

    return String(line.supplierBatch || '').trim();
}

function emptyLine() {
    return {
        sku: '',
        qty: '',
        batch: '',
        existingBatch: '',
        supplierBatch: '',
        // V3 — Noam: a mark at goods receipt is what tells ground waste from
        // whole herb, so no separate numbering is needed to say the same thing.
        waste: false,
        // V3 — the supplier's manufacturing date, off the certificate.
        madeOn: '',
        expiry: '',
        expiryMonths: null,
        wh: WAREHOUSES[0].id,
        price: '',
        labels: '1',
    };
}

watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        supplierCode.value = '';
        supplier.value = '';
        docType.value = '';
        docNum.value = '';
        date.value = isoDaysAgo(0);
        note.value = '';
        file.value = null;
        lines.value = [emptyLine()];
        general.value = [];
        saving.value = false;
    },
    { immediate: true },
);

// A suspended supplier is not offered for a new receipt — that is what its
// suspension promises.
const supplierOptions = computed(() => [
    { value: '', label: t('inventory.receipt.supplierPick') },
    ...dataset.suppliers.filter(supplierSelectable).map((row) => ({
        value: row.code,
        label: loc(row.name),
    })),
]);

/** Picking a supplier fills the name the receipt records. */
function onSupplier(code) {
    supplierCode.value = code;

    const known = dataset.suppliers.find((row) => row.code === code);

    supplier.value = known ? loc(known.name) : '';
}

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        id: warehouse.id,
        label: t(`warehouse.${warehouse.id}.short`),
    })),
);

// A line of an item that is not batch-managed needs no batch and no expiry; on
// a tax invoice every line needs its price.
const lineOk = (line) =>
    Boolean(line.sku) &&
    Number(line.qty) > 0 &&
    (!batched(line) ||
        (Boolean(line.existingBatch || line.batch) && Boolean(line.expiry))) &&
    (!invoice.value || isPrice(line.price));

const good = computed(() =>
    lines.value
        .map((line, i) => ({ ...line, batch: batchFor(i) }))
        .filter(lineOk),
);

/** General lines missing their description, quantity or price. */
const badGeneral = computed(() =>
    general.value.filter(
        (line) =>
            !line.name.trim() ||
            !(Number(line.qty) > 0) ||
            !isPrice(line.price),
    ),
);

const valid = computed(
    () =>
        Boolean(supplierCode.value) &&
        Boolean(docType.value) &&
        Boolean(docNum.value.trim()) &&
        good.value.length > 0 &&
        badGeneral.value.length === 0 &&
        !saving.value,
);

/** The one reason the save button is off, beside it. */
const blocker = computed(() => {
    if (!docType.value) {
        return t('buying.receive.needDocType');
    }

    if (badGeneral.value.length) {
        return t('buying.receive.needGeneral');
    }

    return t('inventory.receipt.need');
});

function addGeneral() {
    general.value.push({ name: '', qty: '1', price: '' });
}

function removeGeneral(index) {
    general.value.splice(index, 1);
}

/**
 * V3 — nothing is guessed for goods that came from a supplier.
 *
 * The console used to offer an expiry date computed from the item's family.
 * Natalie scoped that calculation to production only — "שים לב שרק מייצור פנימי
 * ולא הזמנת רכש מספק" — and for a pharmacy it is the safer reading anyway: a
 * purchased batch's expiry is a fact printed on the supplier's certificate, and
 * a date the software invented for it would be a date nobody checked.
 */
function onItem(line, sku) {
    const item = inventory.itemBySku(sku);

    line.sku = sku;
    line.wh = item ? item.wh : WAREHOUSES[0].id;
    line.existingBatch = '';
    line.expiryMonths = null;
    // An item that is not batch-managed opens at no labels (12.11.2026).
    line.labels = batched(line) ? '1' : '0';
}

function onQty(line, value) {
    // A delivery in kg or litres carries a decimal point — stripping anything
    // but digits turned 2.5 into 25 (as AdjustStockModal already learned).
    line.qty = String(value)
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');
}

function existingOptions(line) {
    return [
        { value: '', label: t('inventory.receipt.existingNew') },
        ...inventory.openBatchesOf(line.sku).map((batch) => ({
            value: batch.id,
            // The number the pharmacy calls it, not the record's key — the
            // two differ whenever a supplier's code is shared.
            label: t('inventory.receipt.existingOption', {
                id: inventory.batchNo(batch),
                expiry: batch.expiry
                    ? fmtISO(batch.expiry)
                    : t('inventory.batches.noExpiry'),
            }),
        })),
    ];
}

/** Topping up an existing batch: its expiry and supplier batch come along. */
function onExisting(line, id) {
    line.existingBatch = id;

    const batch = inventory.batchById(id);

    if (batch) {
        line.expiry = batch.expiry;
        line.supplierBatch = batch.supplierBatch || '';
    }
}

/** The currency the item's card is priced in, for the price field's hint. */
function currencyOf(line) {
    return (
        CURRENCY_SYMBOL[items.itemBySku(line.sku)?.price?.currency] ||
        CURRENCY_SYMBOL.ILS
    );
}

function purchaseUnit(line) {
    const uom = items.itemBySku(line.sku)?.uom?.purchase;

    return uom ? t(`items.uom.${uom}`) : '';
}

/** `₪/kg` — or the currency alone until an item is picked. */
function priceHint(line) {
    const unit = purchaseUnit(line);

    return unit ? `${currencyOf(line)}/${unit}` : currencyOf(line);
}

function addLine() {
    lines.value.push(emptyLine());
}

function removeLine(index) {
    if (lines.value.length > 1) {
        lines.value.splice(index, 1);
    }
}

/** The quantity field hints at the unit the picked item is held in. */
function unitHint(line) {
    const item = inventory.itemBySku(line.sku);

    return item ? t(`inventory.unit.${item.unit}`) : '';
}

/** `1,200 → 2,400`: what the item's on-hand total becomes with this line. */
function after(line) {
    const item = inventory.itemBySku(line.sku);
    const qty = Number(line.qty);

    if (!item || !(qty > 0)) {
        return '';
    }

    return `${num(item.onHand)} → ${num(item.onHand + qty)}`;
}

async function save() {
    if (!valid.value) {
        return;
    }

    saving.value = true;

    try {
        const receipt = await purchasing.receiveDocument({
            supplier: supplier.value.trim(),
            supplierCode: supplierCode.value,
            docType: docType.value,
            docNum: docNum.value,
            date: date.value,
            note: note.value,
            file: file.value,
            lines: [
                ...good.value.map((line) => {
                    const kept = batched(line);

                    return {
                        ...line,
                        batched: kept,
                        existingBatch: kept ? line.existingBatch : '',
                        supplierBatch: kept ? line.supplierBatch : '',
                        waste: kept && line.waste,
                        madeOn: kept ? line.madeOn : '',
                        expiry: kept ? line.expiry : null,
                        // A delivery note carries no price; the store drops any.
                        price: invoice.value ? Number(line.price) : null,
                        currency:
                            items.itemBySku(line.sku)?.price?.currency || 'ILS',
                    };
                }),
                ...general.value.map((line) => ({
                    general: true,
                    name: line.name.trim(),
                    qty: Number(line.qty),
                    price: Number(line.price),
                })),
            ],
        });

        emit('saved', receipt);
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
        :title="t('inventory.receipt.title')"
        :width="WIDTH"
        @close="emit('close')"
    >
        <div class="head">
            <div>
                <label class="a-lbl" :for="`${uid}-supsel`">
                    {{ t('inventory.receipt.supplier') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <ASelect
                    :id="`${uid}-supsel`"
                    :model-value="supplierCode"
                    :options="supplierOptions"
                    class="a-w100"
                    @update:model-value="onSupplier"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-dt`">
                    {{ t('buying.receive.docType') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <ASelect
                    :id="`${uid}-dt`"
                    v-model="docType"
                    :options="docTypeOptions"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-doc`">
                    {{
                        invoice
                            ? t('buying.receive.docNumInvoice')
                            : docType
                              ? t('buying.receive.docNumNote')
                              : t('inventory.receipt.docNum')
                    }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <AInput
                    :id="`${uid}-doc`"
                    v-model="docNum"
                    class="a-w100"
                    ltr
                    inputmode="numeric"
                    :placeholder="t('inventory.receipt.docNumPh')"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-date`">
                    {{ t('inventory.receipt.date') }}
                </label>
                <AInput
                    :id="`${uid}-date`"
                    v-model="date"
                    type="date"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-note`">
                    {{ t('inventory.receipt.note') }}
                </label>
                <AInput
                    :id="`${uid}-note`"
                    v-model="note"
                    class="a-w100"
                    :placeholder="t('inventory.receipt.notePh')"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-file`">
                    {{ t('buying.receive.file') }}
                </label>
                <AFilePick v-model="file" :input-id="`${uid}-file`" />
            </div>
        </div>

        <div v-if="docType" class="a-note a-note--info rule">
            {{
                invoice
                    ? t('inventory.receipt.invoicePrices')
                    : t('buying.receive.noteNoPrices')
            }}
        </div>

        <div
            class="a-lines"
            role="list"
            :aria-label="t('inventory.receipt.rows')"
        >
            <div
                v-for="(line, i) in lines"
                :key="i"
                class="a-line-block"
                :class="{ 'is-ok': lineOk(line) }"
                role="listitem"
            >
                <div class="a-line-head">
                    <span class="a-line-no">
                        {{ t('labels.lineNo', { n: i + 1 }) }}
                    </span>
                    <AButton
                        sm
                        icon="trash"
                        class="a-push"
                        :aria-label="
                            t('inventory.receipt.aria.remove', { n: i + 1 })
                        "
                        :disabled="lines.length === 1"
                        @click="removeLine(i)"
                    />
                </div>

                <div class="a-line-body a-line-body--stacked">
                    <div class="a-line-wide">
                        <label class="a-lbl" :for="`${uid}-i${i}`">
                            {{ t('inventory.receipt.col.item') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <ItemPicker
                            :input-id="`${uid}-i${i}`"
                            :model-value="line.sku"
                            :items="inventory.liveStock"
                            @update:model-value="onItem(line, $event)"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-q${i}`">
                            {{ t('inventory.receipt.col.qty') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-q${i}`"
                            :model-value="line.qty"
                            inputmode="decimal"
                            :aria-label="
                                t('inventory.receipt.aria.qty', { n: i + 1 })
                            "
                            :placeholder="unitHint(line)"
                            @update:model-value="onQty(line, $event)"
                        />
                        <div v-if="after(line)" class="a-hint">
                            {{ t('inventory.receipt.col.after') }} ·
                            <span class="num">{{ after(line) }}</span>
                        </div>
                    </div>
                    <div v-if="!batched(line)" class="a-line-wide">
                        <div class="a-hint">
                            {{ t('buying.receive.notBatched') }}
                        </div>
                    </div>
                    <div v-if="batched(line)">
                        <label class="a-lbl" :for="`${uid}-e${i}`">
                            {{ t('inventory.receipt.col.existing') }}
                        </label>
                        <ASelect
                            :id="`${uid}-e${i}`"
                            :model-value="line.existingBatch"
                            :options="existingOptions(line)"
                            :aria-label="
                                t('inventory.receipt.aria.existing', {
                                    n: i + 1,
                                })
                            "
                            @update:model-value="onExisting(line, $event)"
                        />
                    </div>
                    <div v-if="batched(line)">
                        <label class="a-lbl" :for="`${uid}-sb${i}`">
                            {{ t('inventory.receipt.col.supplierBatch') }}
                            <span v-if="!line.existingBatch" class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            v-if="!line.existingBatch"
                            :id="`${uid}-sb${i}`"
                            v-model="line.supplierBatch"
                            ltr
                            :aria-label="
                                t('inventory.receipt.aria.supplierBatch', {
                                    n: i + 1,
                                })
                            "
                            :placeholder="
                                t('inventory.receipt.supplierBatchPh')
                            "
                        />
                        <div v-else class="a-code a-tag batch-ro">
                            {{ inventory.batchNo(line.existingBatch) }}
                        </div>
                        <div class="a-hint">
                            {{ t('inventory.receipt.batchIsSupplier') }}
                        </div>
                    </div>
                    <div v-if="batched(line)">
                        <label class="a-lbl" :for="`${uid}-ws${i}`">
                            {{ t('inventory.receipt.col.waste') }}
                        </label>
                        <label class="a-checkrow waste">
                            <input
                                :id="`${uid}-ws${i}`"
                                v-model="line.waste"
                                type="checkbox"
                                :disabled="Boolean(line.existingBatch)"
                            />
                            <span>{{ t('inventory.receipt.wasteYes') }}</span>
                        </label>
                        <div class="a-hint">
                            {{ t('inventory.receipt.wasteHint') }}
                        </div>
                    </div>
                    <div v-if="batched(line)">
                        <label class="a-lbl" :for="`${uid}-md${i}`">
                            {{ t('inventory.receipt.col.madeOn') }}
                        </label>
                        <AInput
                            :id="`${uid}-md${i}`"
                            v-model="line.madeOn"
                            type="date"
                            :disabled="Boolean(line.existingBatch)"
                            :aria-label="
                                t('inventory.receipt.aria.madeOn', { n: i + 1 })
                            "
                        />
                        <div class="a-hint">
                            {{ t('inventory.receipt.madeOnHint') }}
                        </div>
                    </div>
                    <div v-if="batched(line)">
                        <label class="a-lbl" :for="`${uid}-x${i}`">
                            {{ t('inventory.receipt.col.expiry') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-x${i}`"
                            v-model="line.expiry"
                            type="date"
                            :disabled="Boolean(line.existingBatch)"
                            :aria-label="
                                t('inventory.receipt.aria.expiry', { n: i + 1 })
                            "
                        />
                        <div v-if="!line.existingBatch" class="a-hint">
                            {{ t('inventory.receipt.expiryFromSupplier') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-w${i}`">
                            {{ t('inventory.receipt.col.wh') }}
                        </label>
                        <select
                            :id="`${uid}-w${i}`"
                            v-model="line.wh"
                            class="a-select"
                            :aria-label="
                                t('inventory.receipt.aria.wh', { n: i + 1 })
                            "
                        >
                            <option
                                v-for="warehouse in warehouses"
                                :key="warehouse.id"
                                :value="warehouse.id"
                            >
                                {{ warehouse.label }}
                            </option>
                        </select>
                    </div>
                    <div v-if="invoice">
                        <label class="a-lbl" :for="`${uid}-p${i}`">
                            {{ t('buying.receive.priceInvoice') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-p${i}`"
                            v-model="line.price"
                            type="number"
                            min="0"
                            step="0.01"
                            ltr
                            :aria-label="
                                t('inventory.receipt.aria.price', { n: i + 1 })
                            "
                        />
                        <div class="a-hint">{{ priceHint(line) }}</div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-l${i}`">
                            {{ t('inventory.receipt.col.labels') }}
                        </label>
                        <AInput
                            :id="`${uid}-l${i}`"
                            v-model="line.labels"
                            type="number"
                            ltr
                            :aria-label="
                                t('inventory.receipt.aria.labels', { n: i + 1 })
                            "
                        />
                        <div class="a-hint">
                            {{ t('buying.receive.labelsNoPack') }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="foot">
            <AButton sm icon="plus" @click="addLine">
                {{ t('inventory.receipt.addLine') }}
            </AButton>
            <AButton sm icon="plus" @click="addGeneral">
                {{ t('buying.receive.general.add') }}
            </AButton>
            <span>{{ t('inventory.receipt.hint') }}</span>
        </div>

        <div v-if="general.length" class="gen">
            <p class="a-hint gen-lead">
                {{ t('buying.receive.general.lead') }}
            </p>
            <div class="a-lines" role="list">
                <div
                    v-for="(line, g) in general"
                    :key="g"
                    class="a-line-block"
                    :class="{
                        'is-ok':
                            line.name.trim() &&
                            Number(line.qty) > 0 &&
                            isPrice(line.price),
                    }"
                    role="listitem"
                >
                    <div class="a-line-head">
                        <span class="a-line-no">
                            {{ t('buying.receive.general.line', { n: g + 1 }) }}
                        </span>
                        <AButton
                            sm
                            icon="trash"
                            class="a-push"
                            :aria-label="t('buying.receive.general.remove')"
                            @click="removeGeneral(g)"
                        />
                    </div>
                    <div class="a-line-body a-line-body--stacked">
                        <div class="a-line-wide">
                            <label class="a-lbl" :for="`${uid}-gn${g}`">
                                {{ t('buying.receive.general.name') }}
                                <span class="a-req">{{
                                    t('labels.required')
                                }}</span>
                            </label>
                            <AInput
                                :id="`${uid}-gn${g}`"
                                v-model="line.name"
                                class="a-w100"
                                :placeholder="
                                    t('buying.receive.general.namePh')
                                "
                            />
                        </div>
                        <div>
                            <label class="a-lbl" :for="`${uid}-gq${g}`">
                                {{ t('buying.receive.general.qty') }}
                                <span class="a-req">{{
                                    t('labels.required')
                                }}</span>
                            </label>
                            <AInput
                                :id="`${uid}-gq${g}`"
                                v-model="line.qty"
                                type="number"
                                min="0"
                                ltr
                            />
                        </div>
                        <div>
                            <label class="a-lbl" :for="`${uid}-gp${g}`">
                                {{ t('buying.receive.general.price') }}
                                <span class="a-req">{{
                                    t('labels.required')
                                }}</span>
                            </label>
                            <AInput
                                :id="`${uid}-gp${g}`"
                                v-model="line.price"
                                type="number"
                                min="0"
                                step="0.01"
                                ltr
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!valid" @click="save">
                {{
                    t(
                        'inventory.receipt.submit',
                        { n: good.length },
                        good.length,
                    )
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
            <span v-if="!valid && !saving" class="a-rf-need">
                {{ blocker }}
            </span>
        </template>
    </AModal>
</template>

<style scoped>
.head {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 14px;
    margin-bottom: 16px;
}

.foot {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 14px;
    font-size: 13px;
    color: var(--a-ink-4);
    line-height: 1.5;
}

.batch-ro {
    display: inline-block;
    margin-top: 8px;
}

.rule {
    margin: 0 0 14px;
}

.gen {
    margin-top: 14px;
}

.gen-lead {
    margin: 0 0 8px;
}
</style>
