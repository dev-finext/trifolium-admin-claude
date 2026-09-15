<script setup>
// Payments to suppliers — each with the bank's reference and its receipt, and
// the invoices it closed. One payment may settle several invoices.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import RecordPaymentModal from '@/components/purchasing/RecordPaymentModal.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import FileViewerModal from '@/components/ui/FileViewerModal.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { ils } from '@/lib/money';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const store = usePurchasingStore();
const items = useItemsStore();

const state = useUrlState({ yq: '' });
const recording = ref(false);
const viewing = ref(null);

const rows = computed(() => {
    const term = state.yq.trim().toLowerCase();

    return store.supplierPayments.filter(
        (payment) =>
            !term ||
            searchHaystack(
                payment.id,
                payment.reference,
                payment.supplier,
                payment.allocations.map((a) => a.invoice).join(' '),
            )
                .toLowerCase()
                .includes(term),
    );
});

const cols = computed(() => [
    { k: 'id', label: t('purchasing.payments.col.id'), nowrap: true },
    { k: 'supplier', label: t('purchasing.payments.col.supplier') },
    { k: 'date', label: t('purchasing.payments.col.date'), nowrap: true },
    { k: 'amount', label: t('purchasing.payments.col.amount'), nowrap: true },
    { k: 'method', label: t('purchasing.payments.col.method'), nowrap: true },
    {
        k: 'reference',
        label: t('purchasing.payments.col.reference'),
        nowrap: true,
    },
    { k: 'invoices', label: t('purchasing.payments.col.invoices') },
    { k: 'receipt', label: t('purchasing.payments.col.receipt'), nowrap: true },
]);

const receiptOf = (payment) =>
    items.attachmentsOf('supplier_payment', payment.id)[0] || null;

function onRecorded(payment) {
    recording.value = false;
    push({
        title: t('purchasing.payments.toast.recorded'),
        body: t('purchasing.payments.toast.recordedBody', {
            amount: ils(payment.amount, 2),
            n: payment.allocations.length,
        }),
    });
}
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="
                t('purchasing.payments.count', {
                    total: store.supplierPayments.length,
                })
            "
            :dirty="Boolean(state.yq)"
            @clear="state.yq = ''"
        >
            <AInput
                v-model="state.yq"
                class="search"
                :placeholder="t('purchasing.payments.search')"
            />
            <AButton kind="p" sm icon="plus" @click="recording = true">
                {{ t('purchasing.payments.record') }}
            </AButton>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #cell-id="{ row }"
                ><span class="a-code a-tag">{{ row.id }}</span></template
            >
            <template #cell-supplier="{ row }">{{
                loc(row.supplier)
            }}</template>
            <template #cell-date="{ row }"
                ><ANum>{{ row.date.stamp }}</ANum></template
            >
            <template #cell-amount="{ row }"
                ><ANum>{{ ils(row.amount, 2) }}</ANum></template
            >
            <template #cell-method="{ row }">
                <AChip tone="gray" size="sm" :dot="false">{{
                    t(`purchasing.payMethod.${row.method}`)
                }}</AChip>
            </template>
            <template #cell-reference="{ row }"
                ><ANum>{{ row.reference }}</ANum></template
            >
            <template #cell-invoices="{ row }">
                <div
                    v-for="allocation in row.allocations"
                    :key="allocation.invoice"
                    class="alloc"
                >
                    <span class="a-code a-tag">{{ allocation.invoice }}</span>
                    <ANum>{{ ils(allocation.amount, 2) }}</ANum>
                </div>
            </template>
            <template #cell-receipt="{ row }">
                <AButton
                    v-if="receiptOf(row)"
                    sm
                    kind="ghost"
                    icon="file_text"
                    @click.stop="viewing = receiptOf(row)"
                >
                    {{ t('purchasing.payments.receipt') }}
                </AButton>
                <span v-else class="t-sub">—</span>
            </template>
            <template #empty>
                <AEmpty
                    icon="coin"
                    :title="t('purchasing.payments.empty')"
                    :sub="t('purchasing.payments.emptySub')"
                />
            </template>
        </ADataTable>

        <RecordPaymentModal
            v-if="recording"
            @close="recording = false"
            @recorded="onRecorded"
        />

        <FileViewerModal
            :open="Boolean(viewing)"
            :file="viewing"
            :url="viewing ? items.attachmentUrl(viewing) : ''"
            @close="viewing = null"
        />
    </div>
</template>

<style scoped>
.search {
    width: 320px;
    flex: none;
}

.alloc {
    display: flex;
    gap: 8px;
    align-items: baseline;
}

.alloc + .alloc {
    margin-top: 4px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
