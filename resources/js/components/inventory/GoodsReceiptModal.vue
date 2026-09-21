<script setup>
// Goods receipt — the only door stock comes in through.
//
// One block per batch: an item, a quantity, a batch number, the supplier's own
// batch code and an expiry date. Each block opens a separate batch and enters
// stock the moment the receipt is saved, which is why the block is dense rather
// than a wizard — a delivery of eight herbs is eight blocks on one screen.
//
// Second-version additions, each marked: the supplier is picked from the supplier
// list (free text stays for a one-off), a line may top up an existing batch
// instead of opening one, the expiry defaults from the family's shelf life, and a
// line carries the price that becomes the item's last purchase price and the
// number of item labels to print.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemPicker from '@/components/inventory/ItemPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL, WAREHOUSES } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

/** One field to a row, label beside it: the form no longer needs the width. */
const WIDTH = 860;

/** The supplier select's value for "not on the list — type it". */
const OTHER = '__other';

const props = defineProps({
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const inventory = useInventoryStore();
const items = useItemsStore();
const uid = useId();

const supplierCode = ref('');
const supplier = ref('');
const docNum = ref('');
const date = ref(isoDaysAgo(0));
const note = ref('');
const lines = ref([]);

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
        docNum.value = '';
        date.value = isoDaysAgo(0);
        note.value = '';
        lines.value = [emptyLine()];
    },
    { immediate: true },
);

const supplierOptions = computed(() => [
    { value: '', label: t('inventory.receipt.supplierPick') },
    ...dataset.suppliers.map((row) => ({
        value: row.code,
        label: loc(row.name),
    })),
    { value: OTHER, label: t('inventory.receipt.supplierOther') },
]);

/** Picking a listed supplier fills the name; "other" opens the free-text field. */
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

const lineOk = (line) =>
    Boolean(line.sku) &&
    Number(line.qty) > 0 &&
    Boolean(line.existingBatch || line.batch) &&
    Boolean(line.expiry);

const good = computed(() =>
    lines.value
        .map((line, i) => ({ ...line, batch: batchFor(i) }))
        .filter(lineOk),
);
const valid = computed(
    () =>
        Boolean(supplier.value.trim()) &&
        Boolean(docNum.value.trim()) &&
        good.value.length > 0,
);

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
}

function onQty(line, value) {
    line.qty = String(value).replace(/\D/g, '');
}

function existingOptions(line) {
    return [
        { value: '', label: t('inventory.receipt.existingNew') },
        ...inventory.openBatchesOf(line.sku).map((batch) => ({
            value: batch.id,
            label: t('inventory.receipt.existingOption', {
                id: batch.id,
                expiry: fmtISO(batch.expiry),
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

    const receipt = await inventory.receiveGoods({
        supplier: supplier.value.trim(),
        supplierCode:
            supplierCode.value && supplierCode.value !== OTHER
                ? supplierCode.value
                : null,
        docNum: docNum.value,
        date: date.value,
        note: note.value,
        lines: good.value.map((line) => ({
            ...line,
            currency: items.itemBySku(line.sku)?.price?.currency || 'ILS',
        })),
    });

    emit('saved', receipt);
    emit('close');
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
                    <V2Badge id="receiving" size="sm" />
                </label>
                <ASelect
                    :id="`${uid}-supsel`"
                    :model-value="supplierCode"
                    :options="supplierOptions"
                    class="a-w100"
                    @update:model-value="onSupplier"
                />
                <AInput
                    v-if="supplierCode === OTHER"
                    :id="`${uid}-sup`"
                    v-model="supplier"
                    class="a-w100 other"
                    :placeholder="t('inventory.receipt.supplierPh')"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-doc`">
                    {{ t('inventory.receipt.docNum') }}
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
                            :items="inventory.stock"
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
                            inputmode="numeric"
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
                    <div>
                        <label class="a-lbl" :for="`${uid}-e${i}`">
                            {{ t('inventory.receipt.col.existing') }}
                            <V2Badge id="receiving" size="sm" />
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
                    <div>
                        <label class="a-lbl" :for="`${uid}-sb${i}`">
                            {{ t('inventory.receipt.col.supplierBatch') }}
                            <span v-if="!line.existingBatch" class="a-req">{{
                                t('labels.required')
                            }}</span>
                            <V2Badge v="3" size="sm" />
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
                    <div>
                        <label class="a-lbl" :for="`${uid}-ws${i}`">
                            {{ t('inventory.receipt.col.waste') }}
                            <V2Badge v="3" size="sm" />
                        </label>
                        <label class="a-check">
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
                    <div>
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
                    <div>
                        <label class="a-lbl" :for="`${uid}-p${i}`">
                            {{ t('inventory.receipt.col.price') }}
                            <V2Badge id="receiving" size="sm" />
                        </label>
                        <AInput
                            :id="`${uid}-p${i}`"
                            v-model="line.price"
                            type="number"
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
                            <V2Badge id="receiving" size="sm" />
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
                    </div>
                </div>
            </div>
        </div>

        <div class="foot">
            <AButton sm icon="plus" @click="addLine">
                {{ t('inventory.receipt.addLine') }}
            </AButton>
            <span>{{ t('inventory.receipt.hint') }}</span>
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
            <span v-if="!valid" class="a-rf-need">
                {{ t('inventory.receipt.need') }}
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

.other {
    margin-top: 6px;
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
</style>
