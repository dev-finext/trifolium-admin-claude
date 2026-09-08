<script setup>
// Receive goods against a purchase order. The lines come prefilled from what is
// still open on the order, converted into stock units; the receiver corrects the
// quantities, gives each line its batch and expiry (defaulted from the family's
// shelf life), the price that becomes the item's last purchase price, and how
// many item labels to print. Partial receipts are normal — the order closes when
// its last line is in.
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL } from '@/config';
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

/** The batch number `offset` places after the next free one in the series. */
function batchNoAt(offset) {
    const parts = String(inventory.nextBatchNo).match(/^(\D*)(\d+)$/);

    return parts ? `${parts[1]}${Number(parts[2]) + offset}` : '';
}

const openLines = props.po.lines.filter(
    (line) => line.qty - (line.received || 0) > 0,
);

const form = reactive({
    docNum: '',
    date: isoDaysAgo(0),
    note: '',
    lines: openLines.map((line, i) => {
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
            batch: batchNoAt(i),
            existingBatch: '',
            supplierBatch: '',
            expiry: suggested?.iso || '',
            expiryMonths: suggested?.months || null,
            price: line.price != null ? String(line.price) : '',
            currency: props.po.currency,
            labels: '1',
            wh: stock?.wh || 'raw',
            stockUnit: stock?.unit || item?.uom?.sales || 'unit',
        };
    }),
});

const lineOk = (line) =>
    Number(line.qty) > 0 &&
    (line.existingBatch || line.batch.trim()) &&
    Boolean(line.expiry);

const good = computed(() => form.lines.filter(lineOk));
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
        :width="1320"
        class="a-modal-card--fit"
        @close="emit('close')"
    >
        <p class="a-hint intro">{{ t('purchasing.receive.hint') }}</p>

        <div class="a-3col">
            <div>
                <label class="a-lbl"
                    >{{ t('purchasing.receive.docNum') }}
                    <span class="req">*</span></label
                >
                <AInput v-model="form.docNum" ltr class="a-w100" />
            </div>
            <div>
                <label class="a-lbl">{{ t('purchasing.receive.date') }}</label>
                <AInput v-model="form.date" type="date" class="a-w100" />
            </div>
            <div>
                <label class="a-lbl">{{ t('purchasing.receive.note') }}</label>
                <AInput v-model="form.note" class="a-w100" />
            </div>
        </div>

        <div class="grid" role="table">
            <div class="row row--h" role="row">
                <span>{{ t('purchasing.receive.col.item') }}</span>
                <span>{{ t('purchasing.receive.col.open') }}</span>
                <span>{{ t('purchasing.receive.col.qty') }}</span>
                <span>{{ t('purchasing.receive.col.existing') }}</span>
                <span>{{ t('purchasing.receive.col.batch') }}</span>
                <span>{{ t('purchasing.receive.col.supplierBatch') }}</span>
                <span>{{ t('purchasing.receive.col.expiry') }}</span>
                <span>{{ t('purchasing.receive.col.price') }}</span>
                <span>{{ t('purchasing.receive.col.labels') }}</span>
                <span></span>
            </div>
            <div
                v-for="(line, i) in form.lines"
                :key="line.sku"
                class="row"
                :class="{ 'is-ok': lineOk(line) }"
                role="row"
            >
                <div>
                    <div class="t-strong">{{ loc(line.name) }}</div>
                    <div class="t-sub ltr">{{ line.sku }}</div>
                </div>
                <span class="num"
                    >{{ num(line.openPurchase, 1) }}
                    {{ t(`items.uom.${line.uom}`) }}</span
                >
                <AInput
                    v-model="line.qty"
                    type="number"
                    ltr
                    :placeholder="t(`inventory.unit.${line.stockUnit}`)"
                />
                <ASelect
                    :model-value="line.existingBatch"
                    :options="existingOptions(line)"
                    @update:model-value="onExisting(line, $event)"
                />
                <AInput
                    v-model="line.batch"
                    ltr
                    :disabled="Boolean(line.existingBatch)"
                />
                <AInput v-model="line.supplierBatch" ltr />
                <div>
                    <AInput
                        v-model="line.expiry"
                        type="date"
                        :disabled="Boolean(line.existingBatch)"
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
                <div class="pair">
                    <AInput v-model="line.price" type="number" ltr />
                    <span class="t-sub"
                        >{{ symbol }}/{{ t(`items.uom.${line.uom}`) }}</span
                    >
                </div>
                <AInput v-model="line.labels" type="number" ltr />
                <AButton
                    sm
                    kind="ghost"
                    icon="trash"
                    :disabled="form.lines.length === 1"
                    @click="removeLine(i)"
                />
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

.grid {
    margin-top: 16px;
}

.row {
    display: grid;
    grid-template-columns:
        minmax(180px, 1.3fr)
        110px 100px 150px 100px 110px 150px 130px 70px 40px;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--a-line-3);
}

.row--h {
    font-size: 12px;
    color: var(--a-ink-3);
    border-bottom: 1px solid var(--a-line);
}

.row.is-ok {
    background: var(--a-tint);
}

.pair {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tiny {
    margin-top: 2px;
    font-size: 11.5px;
}
</style>
