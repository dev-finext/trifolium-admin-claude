<script setup>
// Goods receipt — the only door stock comes in through.
//
// One row per batch: an item, a quantity, a batch number, the supplier's own
// batch code and an expiry date. Each row opens a separate batch and enters stock
// the moment the receipt is saved, which is why the row is dense rather than a
// wizard — a delivery of eight herbs is eight rows on one screen.
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
import { usePurchasingStore } from '@/stores/purchasing';

/** Wide enough for every column of a receipt line without inner scrolling. */
const WIDTH = 1520;

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
const purchasing = usePurchasingStore();
const uid = useId();

const supplierCode = ref('');
const supplier = ref('');
const docNum = ref('');
const date = ref(isoDaysAgo(0));
const note = ref('');
const lines = ref([]);

/** The batch number `offset` places after the next free one in the series. */
function batchNoAt(offset) {
    const parts = String(inventory.nextBatchNo).match(/^(\D*)(\d+)$/);

    return parts ? `${parts[1]}${Number(parts[2]) + offset}` : '';
}

function emptyLine(offset = 0) {
    return {
        sku: '',
        qty: '',
        batch: batchNoAt(offset),
        existingBatch: '',
        supplierBatch: '',
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
    Boolean(line.existingBatch || line.batch.trim()) &&
    Boolean(line.expiry);

const good = computed(() => lines.value.filter(lineOk));
const valid = computed(
    () =>
        Boolean(supplier.value.trim()) &&
        Boolean(docNum.value.trim()) &&
        good.value.length > 0,
);

function onItem(line, sku) {
    const item = inventory.itemBySku(sku);
    const suggested = purchasing.defaultExpiryFor(sku);

    line.sku = sku;
    line.wh = item ? item.wh : WAREHOUSES[0].id;
    line.existingBatch = '';
    line.expiryMonths = suggested?.months || null;

    if (suggested && !line.expiry) {
        line.expiry = suggested.iso;
    }
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

function addLine() {
    lines.value.push(emptyLine(lines.value.length));
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
        class="a-modal-card--fit"
        @close="emit('close')"
    >
        <div class="a-rf-head">
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
            class="a-rf-grid"
            role="table"
            :aria-label="t('inventory.receipt.rows')"
        >
            <div class="a-rf-r a-rf-r--h rf" role="row">
                <span role="columnheader">{{
                    t('inventory.receipt.col.item')
                }}</span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.qty')
                }}</span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.existing') }}
                    <V2Badge id="receiving" size="sm" />
                </span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.batch')
                }}</span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.supplierBatch')
                }}</span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.expiry')
                }}</span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.wh')
                }}</span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.price') }}
                    <V2Badge id="receiving" size="sm" />
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.labels') }}
                    <V2Badge id="receiving" size="sm" />
                </span>
                <span role="columnheader">{{
                    t('inventory.receipt.col.after')
                }}</span>
                <span role="columnheader" />
            </div>

            <div
                v-for="(line, i) in lines"
                :key="i"
                class="a-rf-r rf"
                :class="{ 'is-ok': lineOk(line) }"
                role="row"
            >
                <ItemPicker
                    :input-id="`${uid}-i${i}`"
                    :model-value="line.sku"
                    :items="inventory.stock"
                    @update:model-value="onItem(line, $event)"
                />
                <AInput
                    :model-value="line.qty"
                    inputmode="numeric"
                    :aria-label="t('inventory.receipt.aria.qty', { n: i + 1 })"
                    :placeholder="unitHint(line)"
                    @update:model-value="onQty(line, $event)"
                />
                <ASelect
                    :model-value="line.existingBatch"
                    :options="existingOptions(line)"
                    :aria-label="
                        t('inventory.receipt.aria.existing', { n: i + 1 })
                    "
                    @update:model-value="onExisting(line, $event)"
                />
                <AInput
                    v-model="line.batch"
                    ltr
                    :disabled="Boolean(line.existingBatch)"
                    :aria-label="
                        t('inventory.receipt.aria.batch', { n: i + 1 })
                    "
                />
                <AInput
                    v-model="line.supplierBatch"
                    ltr
                    :aria-label="
                        t('inventory.receipt.aria.supplierBatch', { n: i + 1 })
                    "
                    :placeholder="t('inventory.receipt.supplierBatchPh')"
                />
                <div>
                    <AInput
                        v-model="line.expiry"
                        type="date"
                        :disabled="Boolean(line.existingBatch)"
                        :aria-label="
                            t('inventory.receipt.aria.expiry', { n: i + 1 })
                        "
                    />
                    <div
                        v-if="line.expiryMonths && !line.existingBatch"
                        class="a-hint tiny"
                    >
                        {{
                            t('inventory.receipt.expiryAuto', {
                                n: line.expiryMonths,
                            })
                        }}
                    </div>
                </div>
                <select
                    v-model="line.wh"
                    class="a-select"
                    :aria-label="t('inventory.receipt.aria.wh', { n: i + 1 })"
                >
                    <option
                        v-for="warehouse in warehouses"
                        :key="warehouse.id"
                        :value="warehouse.id"
                    >
                        {{ warehouse.label }}
                    </option>
                </select>
                <div class="price">
                    <AInput
                        v-model="line.price"
                        type="number"
                        ltr
                        :aria-label="
                            t('inventory.receipt.aria.price', { n: i + 1 })
                        "
                    />
                    <span class="t-sub nowrap"
                        >{{ currencyOf(line) }}/{{ purchaseUnit(line) }}</span
                    >
                </div>
                <AInput
                    v-model="line.labels"
                    type="number"
                    ltr
                    :aria-label="
                        t('inventory.receipt.aria.labels', { n: i + 1 })
                    "
                />
                <span class="a-rf-after num">{{ after(line) || '—' }}</span>
                <AButton
                    sm
                    icon="trash"
                    :aria-label="
                        t('inventory.receipt.aria.remove', { n: i + 1 })
                    "
                    :disabled="lines.length === 1"
                    @click="removeLine(i)"
                />
            </div>
        </div>

        <div class="a-rf-foot">
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
/* Eleven columns since the second version — the shared rule is authored for eight. */
.a-rf-r.rf {
    grid-template-columns:
        minmax(200px, 1.5fr) 80px 140px 100px 110px 150px 90px 130px 70px 100px
        40px;
}

.other {
    margin-top: 6px;
}

.price {
    display: flex;
    align-items: center;
    gap: 6px;
}

.nowrap {
    white-space: nowrap;
}

.tiny {
    margin-top: 2px;
    font-size: 11.5px;
}
</style>
