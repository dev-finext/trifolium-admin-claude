<script setup>
// Goods receipt — the only door stock comes in through.
//
// One row per batch: an item, a quantity, a batch number, the supplier's own
// batch code and an expiry date. Each row opens a separate batch and enters stock
// the moment the receipt is saved, which is why the row is dense rather than a
// wizard — a delivery of eight herbs is eight rows on one screen.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemPicker from '@/components/inventory/ItemPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import { useLocalized } from '@/composables/useLocalized';
import { WAREHOUSES } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** Wide enough for all eight columns of a receipt line without inner scrolling. */
const WIDTH = 1240;

const props = defineProps({
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const uid = useId();

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
        supplierBatch: '',
        expiry: '',
        wh: WAREHOUSES[0].id,
    };
}

watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        supplier.value = '';
        docNum.value = '';
        date.value = isoDaysAgo(0);
        note.value = '';
        lines.value = [emptyLine()];
    },
    { immediate: true },
);

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        id: warehouse.id,
        label: t(`warehouse.${warehouse.id}.short`),
    })),
);

const lineOk = (line) =>
    Boolean(line.sku) &&
    Number(line.qty) > 0 &&
    Boolean(line.batch.trim()) &&
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

    line.sku = sku;
    line.wh = item ? item.wh : WAREHOUSES[0].id;
}

function onQty(line, value) {
    line.qty = String(value).replace(/\D/g, '');
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
        docNum: docNum.value,
        date: date.value,
        note: note.value,
        lines: good.value,
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
                <label class="a-lbl" :for="`${uid}-sup`">
                    {{ t('inventory.receipt.supplier') }}
                    <span class="a-req">{{ t('labels.required') }}</span>
                </label>
                <AInput
                    :id="`${uid}-sup`"
                    v-model="supplier"
                    class="a-w100"
                    :list="`${uid}-sup-list`"
                    :placeholder="t('inventory.receipt.supplierPh')"
                />
                <datalist :id="`${uid}-sup-list`">
                    <option
                        v-for="hint in inventory.supplierHints"
                        :key="loc(hint)"
                        :value="loc(hint)"
                    />
                </datalist>
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
            <div class="a-rf-r a-rf-r--h" role="row">
                <span role="columnheader">
                    {{ t('inventory.receipt.col.item') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.qty') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.batch') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.supplierBatch') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.expiry') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.wh') }}
                </span>
                <span role="columnheader">
                    {{ t('inventory.receipt.col.after') }}
                </span>
                <span role="columnheader" />
            </div>

            <div
                v-for="(line, i) in lines"
                :key="i"
                class="a-rf-r"
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
                <AInput
                    v-model="line.batch"
                    ltr
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
                <AInput
                    v-model="line.expiry"
                    type="date"
                    :aria-label="
                        t('inventory.receipt.aria.expiry', { n: i + 1 })
                    "
                />
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
