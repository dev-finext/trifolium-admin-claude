<script setup>
// Recording a payment to a supplier: which open invoices it closes and for how
// much, how it was paid, the bank's reference, and the receipt. A supplier
// whose bookkeeping certificate lapsed cannot be paid — the form says so.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { SUPPLIER_PAYMENT_METHOD_IDS, supplierInvoiceOpen } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { ils } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { usePurchasingStore } from '@/stores/purchasing';

const emit = defineEmits(['close', 'recorded']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const store = usePurchasingStore();

const form = reactive({
    supplierCode: '',
    date: isoDaysAgo(0),
    method: 'transfer',
    reference: '',
    note: '',
});
/** invoice id → amount typed, for the invoices ticked. */
const picked = reactive({});
const receipt = ref(null);
const saving = ref(false);

const supplierOptions = computed(() => [
    { value: '', label: t('purchasing.capture.supplierChoose') },
    ...dataset.suppliers.map((supplier) => ({
        value: supplier.code,
        label: loc(supplier.name),
    })),
]);

const methodOptions = computed(() =>
    SUPPLIER_PAYMENT_METHOD_IDS.map((id) => ({
        value: id,
        label: t(`purchasing.payMethod.${id}`),
    })),
);

const openInvoices = computed(() =>
    store.openInvoices.filter(
        (invoice) => invoice.supplierCode === form.supplierCode,
    ),
);

const allocations = computed(() =>
    Object.entries(picked)
        .filter(([, amount]) => amount !== '' && Number(amount) > 0)
        .map(([invoice, amount]) => ({ invoice, amount: Number(amount) })),
);

const amount = computed(() =>
    allocations.value.reduce((sum, allocation) => sum + allocation.amount, 0),
);

const block = computed(() =>
    form.supplierCode
        ? store.paymentBlock({
              supplierCode: form.supplierCode,
              allocations: allocations.value,
          })
        : null,
);

const ok = computed(
    () => !block.value && amount.value > 0 && form.reference.trim() !== '',
);

function toggle(invoice) {
    if (invoice.id in picked) {
        delete picked[invoice.id];
    } else {
        picked[invoice.id] = String(supplierInvoiceOpen(invoice));
    }
}

function onSupplier() {
    Object.keys(picked).forEach((id) => delete picked[id]);
}

function onFile(event) {
    receipt.value = event.target.files?.[0] || null;
}

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const payment = await store.recordSupplierPayment({
        supplierCode: form.supplierCode,
        date: form.date,
        method: form.method,
        reference: form.reference,
        allocations: allocations.value,
        receipt: receipt.value,
        note: form.note,
    });

    saving.value = false;
    emit('recorded', payment);
}
</script>

<template>
    <AModal
        open
        :title="t('purchasing.pay.title')"
        :width="720"
        @close="emit('close')"
    >
        <div class="rp-grid">
            <div>
                <label class="a-lbl" for="rp-sup">{{
                    t('purchasing.pay.supplier')
                }}</label>
                <ASelect
                    id="rp-sup"
                    v-model="form.supplierCode"
                    :options="supplierOptions"
                    class="a-w100"
                    @update:model-value="onSupplier"
                />
            </div>
            <div>
                <label class="a-lbl" for="rp-date">{{
                    t('purchasing.pay.date')
                }}</label>
                <AInput
                    id="rp-date"
                    v-model="form.date"
                    type="date"
                    ltr
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="rp-method">{{
                    t('purchasing.pay.method')
                }}</label>
                <ASelect
                    id="rp-method"
                    v-model="form.method"
                    :options="methodOptions"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="rp-ref">{{
                    t('purchasing.pay.reference')
                }}</label>
                <AInput
                    id="rp-ref"
                    v-model="form.reference"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t('purchasing.pay.referenceHint') }}
                </div>
            </div>

            <div
                v-if="block === 'compliance'"
                class="rp-wide a-note a-note--danger"
            >
                {{ t('purchasing.pay.blockedCompliance') }}
            </div>

            <div class="rp-wide">
                <label class="a-lbl">{{ t('purchasing.pay.invoices') }}</label>
                <div v-if="!form.supplierCode" class="a-hint">
                    {{ t('purchasing.pay.invoicesPick') }}
                </div>
                <div v-else-if="!openInvoices.length" class="a-hint">
                    {{ t('purchasing.pay.invoicesNone') }}
                </div>
                <table v-else class="a-table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">
                                {{ t('purchasing.invoices.col.id') }}
                            </th>
                            <th scope="col" class="nowrap">
                                {{ t('purchasing.pay.open') }}
                            </th>
                            <th scope="col" class="nowrap">
                                {{ t('purchasing.pay.amount') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="invoice in openInvoices" :key="invoice.id">
                            <td>
                                <input
                                    type="checkbox"
                                    :checked="invoice.id in picked"
                                    @change="toggle(invoice)"
                                />
                            </td>
                            <td>
                                <span class="a-code a-tag">{{
                                    invoice.id
                                }}</span>
                                <div class="t-sub num">{{ invoice.num }}</div>
                            </td>
                            <td class="nowrap">
                                <ANum>{{
                                    ils(supplierInvoiceOpen(invoice), 2)
                                }}</ANum>
                            </td>
                            <td class="nowrap">
                                <AInput
                                    v-if="invoice.id in picked"
                                    v-model="picked[invoice.id]"
                                    type="number"
                                    ltr
                                    :aria-label="t('purchasing.pay.amount')"
                                    class="rp-amt"
                                />
                                <span v-else class="t-sub">—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div
                    v-if="block === 'allocation' && allocations.length"
                    class="a-inv"
                >
                    {{ t('purchasing.pay.blockedAllocation') }}
                </div>
            </div>

            <div class="rp-wide rp-total">
                <span>{{ t('purchasing.pay.total') }}</span>
                <ANum>{{ ils(amount, 2) }}</ANum>
            </div>

            <div class="rp-wide">
                <label class="a-lbl" for="rp-file">{{
                    t('purchasing.pay.receipt')
                }}</label>
                <input
                    id="rp-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    class="a-input a-w100"
                    @change="onFile"
                />
                <div class="a-hint">{{ t('purchasing.pay.receiptHint') }}</div>
            </div>
            <div class="rp-wide">
                <label class="a-lbl" for="rp-note">{{
                    t('purchasing.pay.note')
                }}</label>
                <ATextarea
                    id="rp-note"
                    v-model="form.note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>
        <template #footer>
            <AButton
                kind="p"
                icon="save"
                :disabled="!ok || saving"
                @click="save"
                >{{ t('purchasing.pay.save') }}</AButton
            >
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.rp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 16px;
}

.rp-wide {
    grid-column: 1 / -1;
}

.rp-amt {
    width: 140px;
}

.rp-total {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    border-top: 1px solid var(--a-line);
    font-weight: 600;
    font-size: 16px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
