<script setup>
// Receive goods against a purchase order. The lines come prefilled from what is
// still open on the order, converted into stock units; the receiver corrects the
// quantities, gives each line its batch and expiry (defaulted from the family's
// shelf life), the price that becomes the item's last purchase price, and how
// many item labels to print. Partial receipts are normal — the order closes when
// its last line is in.
import { computed, reactive, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL, DEFAULT_WAREHOUSE } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';

const props = defineProps({
    po: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const items = useItemsStore();
const store = usePurchasingStore();
const uid = useId();

/**
 * The batch number line `i` opens. V3.
 *
 * Goods against a purchase order are goods from a supplier, so the batch is the
 * supplier's own code and nothing else — Yaron: "אם חומר גלם מגיע מספק המוצר
 * מקבל אצוות ספק תמיד לא משנה אם מספר קיים במערכת".
 */
function batchFor(i) {
    const line = form.lines[i];

    if (!line?.sku || line.existingBatch) {
        return '';
    }

    return String(line.supplierBatch || '').trim();
}

const openLines = props.po.lines.filter(
    (line) => line.qty - (line.received || 0) > 0,
);

const form = reactive({
    docNum: '',
    date: isoDaysAgo(0),
    note: '',
    lines: openLines.map((line) => {
        const item = items.itemBySku(line.sku);
        const stock = inventory.itemBySku(line.sku);
        const factor = item?.uom?.factor || 1;
        const suggested = store.defaultExpiryFor(line.sku);

        return {
            sku: line.sku,
            name: line.name,
            openPurchase: line.qty - (line.received || 0),
            uom: line.uom,
            qty: String(Math.round((line.qty - (line.received || 0)) * factor)),
            batch: '',
            existingBatch: '',
            supplierBatch: '',
            expiry: suggested?.iso || '',
            expiryMonths: suggested?.months || null,
            price: line.price != null ? String(line.price) : '',
            currency: props.po.currency,
            labels: '1',
            wh: stock?.wh || DEFAULT_WAREHOUSE,
            stockUnit: stock?.unit || item?.uom?.stock || 'unit',
        };
    }),
});

const lineOk = (line) =>
    Number(line.qty) > 0 &&
    (line.existingBatch || line.batch) &&
    Boolean(line.expiry);

const good = computed(() =>
    form.lines
        .map((line, i) => ({ ...line, batch: batchFor(i) }))
        .filter(lineOk),
);
const valid = computed(
    () => Boolean(form.docNum.trim()) && good.value.length > 0,
);

const symbol = CURRENCY_SYMBOL[props.po.currency] || '';

function existingOptions(line) {
    return [
        { value: '', label: t('purchasing.receive.existingNew') },
        ...inventory.openBatchesOf(line.sku).map((batch) => ({
            value: batch.id,
            label: t('inventory.receipt.existingOption', {
                id: batch.id,
                expiry: fmtISO(batch.expiry),
            }),
        })),
    ];
}

/** Choosing an existing batch copies its expiry and supplier batch onto the line. */
function onExisting(line, id) {
    line.existingBatch = id;

    const batch = inventory.batchById(id);

    if (batch) {
        line.expiry = batch.expiry;
        line.supplierBatch = batch.supplierBatch || '';
    }
}

function removeLine(i) {
    form.lines.splice(i, 1);
}

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await store.receiveAgainstPo(props.po.id, {
        docNum: form.docNum,
        date: form.date,
        note: form.note,
        lines: good.value.map((line) => ({
            sku: line.sku,
            qty: Number(line.qty),
            batch: line.existingBatch || line.batch,
            existingBatch: line.existingBatch || null,
            supplierBatch: line.supplierBatch,
            expiry: line.expiry,
            price: line.price === '' ? null : Number(line.price),
            currency: line.currency,
            labels: Number(line.labels) || 0,
            wh: line.wh,
        })),
    });

    emit('saved', result);
}
</script>

<template>
    <AModal
        open
        :title="t('purchasing.receive.title', { id: po.id })"
        :width="860"
        @close="emit('close')"
    >
        <p class="a-hint intro">{{ t('purchasing.receive.hint') }}</p>

        <div class="a-3col">
            <div>
                <label class="a-lbl" :for="`${uid}-doc`"
                    >{{ t('purchasing.receive.docNum') }}
                    <span class="req">*</span></label
                >
                <AInput
                    :id="`${uid}-doc`"
                    v-model="form.docNum"
                    ltr
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-date`">{{
                    t('purchasing.receive.date')
                }}</label>
                <AInput
                    :id="`${uid}-date`"
                    v-model="form.date"
                    type="date"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-note`">{{
                    t('purchasing.receive.note')
                }}</label>
                <AInput
                    :id="`${uid}-note`"
                    v-model="form.note"
                    class="a-w100"
                />
            </div>
        </div>

        <div class="a-lines lines">
            <div
                v-for="(line, i) in form.lines"
                :key="line.sku"
                class="a-line-block"
                :class="{ 'is-ok': lineOk(line) }"
            >
                <div class="a-line-head">
                    <span class="a-line-no">
                        {{ t('labels.lineNo', { n: i + 1 }) }}
                    </span>
                    <span class="a-sr">{{
                        t('purchasing.receive.col.item')
                    }}</span>
                    <span class="t-strong">{{ loc(line.name) }}</span>
                    <span class="t-sub ltr">{{ line.sku }}</span>
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        class="a-push"
                        :aria-label="
                            t('inventory.receipt.aria.remove', { n: i + 1 })
                        "
                        :disabled="form.lines.length === 1"
                        @click="removeLine(i)"
                    />
                </div>

                <div class="a-line-body a-line-body--stacked">
                    <div>
                        <label class="a-lbl" :for="`${uid}-q${i}`"
                            >{{ t('purchasing.receive.col.qty') }}
                            <span class="req">*</span></label
                        >
                        <AInput
                            :id="`${uid}-q${i}`"
                            v-model="line.qty"
                            type="number"
                            ltr
                            :placeholder="t(`inventory.unit.${line.stockUnit}`)"
                        />
                        <div class="a-hint">
                            {{ t('purchasing.receive.col.open') }} ·
                            <span class="num"
                                >{{ num(line.openPurchase, 1) }}
                                {{ t(`items.uom.${line.uom}`) }}</span
                            >
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-e${i}`">{{
                            t('purchasing.receive.col.existing')
                        }}</label>
                        <ASelect
                            :id="`${uid}-e${i}`"
                            :model-value="line.existingBatch"
                            :options="existingOptions(line)"
                            @update:model-value="onExisting(line, $event)"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('purchasing.receive.col.batch')
                        }}</label>
                        <div class="a-code a-tag batch-ro">
                            {{ line.existingBatch || batchFor(i) || '—' }}
                        </div>
                        <div class="a-hint">
                            {{ t('purchasing.receive.batchAuto') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-sb${i}`">{{
                            t('purchasing.receive.col.supplierBatch')
                        }}</label>
                        <AInput
                            :id="`${uid}-sb${i}`"
                            v-model="line.supplierBatch"
                            ltr
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-x${i}`"
                            >{{ t('purchasing.receive.col.expiry') }}
                            <span class="req">*</span></label
                        >
                        <AInput
                            :id="`${uid}-x${i}`"
                            v-model="line.expiry"
                            type="date"
                            :disabled="Boolean(line.existingBatch)"
                        />
                        <div
                            v-if="line.expiryMonths && !line.existingBatch"
                            class="a-hint"
                        >
                            {{
                                t('inventory.receipt.expiryAuto', {
                                    n: line.expiryMonths,
                                })
                            }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-p${i}`">{{
                            t('purchasing.receive.col.price')
                        }}</label>
                        <AInput
                            :id="`${uid}-p${i}`"
                            v-model="line.price"
                            type="number"
                            ltr
                        />
                        <div class="a-hint">
                            {{ symbol }}/{{ t(`items.uom.${line.uom}`) }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-l${i}`">{{
                            t('purchasing.receive.col.labels')
                        }}</label>
                        <AInput
                            :id="`${uid}-l${i}`"
                            v-model="line.labels"
                            type="number"
                            ltr
                        />
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!valid" @click="save">
                {{ t('purchasing.receive.submit', { n: good.length }) }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
            <span v-if="!valid" class="a-rf-need">{{
                t('purchasing.receive.need')
            }}</span>
        </template>
    </AModal>
</template>

<style scoped>
.intro {
    margin: 0 0 12px;
}

.req {
    color: var(--a-red);
}

.lines {
    margin-top: 16px;
}

.batch-ro {
    display: inline-block;
    margin-top: 8px;
}
</style>
