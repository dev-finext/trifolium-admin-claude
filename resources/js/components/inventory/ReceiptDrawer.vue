<script setup>
// One goods receipt: what arrived, on which delivery note, and which batches it
// opened. Each line is a batch, so every row here is a link into the trace.
//
// 12.11.2026: a receipt is a supplier document (config/supplierDocs.js), and the
// head says which — "תעודת משלוח" or "חשבונית מס" — the number the supplier
// printed on it, and where it stands: an open note waiting for its invoice, or
// the invoice that billed it. A general line ("פריט כללי") has no item and no
// batch; a line of an item that is not batch-managed has no batch. The scans of
// the document are at the foot, and more can be added there.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ANum from '@/components/ui/ANum.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL, docRef, isOpenNote } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useInventoryStore } from '@/stores/inventory';
import { usePurchasingStore } from '@/stores/purchasing';

const props = defineProps({
    /** The receipt to show, or null while the drawer is closed. */
    receipt: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-batch']);
/**
 * V3 — what this window is called when it is parked in the tray.
 *
 * Null while the drawer is closed, which is what keeps the window bar off an
 * empty drawer.
 */ const win = computed(() =>
    props.receipt
        ? {
              id: `receipt:${props.receipt.id}`,
              title: `${t('inventory.receipts.drawer.title')} ${props.receipt.id}`,
              subtitle: loc(props.receipt.supplier) || '',
              icon: 'truck',
          }
        : null,
);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const purchasing = usePurchasingStore();
const buying = useBuyingStore();

/** The order on the desk this receipt was booked against, if any. */
const order = computed(() =>
    props.receipt?.po ? buying.listById(props.receipt.po) : null,
);

/** Where the document stands — the same words as the supplier card's. */
const docStatus = computed(() => {
    const receipt = props.receipt;

    if (!receipt) {
        return '';
    }

    if (receipt.docType === 'tax_invoice') {
        return t('supplierDocs.status.invoice');
    }

    const invoice = purchasing.invoiceOfReceipt(receipt);

    if (invoice) {
        return t('supplierDocs.status.attached', { num: invoice.num });
    }

    if (receipt.sapInvoice) {
        const sap = receipt.sapInvoice;

        return sap.ref || sap.docNum
            ? t('supplierDocs.status.sap', { num: sap.ref || sap.docNum })
            : t('supplierDocs.status.sapUnknown');
    }

    return t('supplierDocs.status.open');
});

const cols = computed(() => [
    {
        k: 'batch',
        label: t('inventory.receipts.drawer.col.batch'),
        nowrap: true,
    },
    { k: 'name', label: t('inventory.receipts.drawer.col.item') },
    { k: 'qty', label: t('inventory.receipts.drawer.col.qty'), nowrap: true },
    {
        k: 'supplierBatch',
        label: t('inventory.receipts.drawer.col.supplierBatch'),
        nowrap: true,
    },
    {
        k: 'expiry',
        label: t('inventory.receipts.drawer.col.expiry'),
        nowrap: true,
    },
    { k: 'wh', label: t('inventory.receipts.drawer.col.wh'), nowrap: true },
    // V2
    {
        k: 'price',
        label: t('inventory.receipts.drawer.col.price'),
        nowrap: true,
    },
    {
        k: 'labels',
        label: t('inventory.receipts.drawer.col.labels'),
        nowrap: true,
    },
]);

/**
 * The receipt's lines, each with a key of its own. A real receipt's lines carry
 * no batch — the extract does not join the two — so the batch cannot be the
 * key: every line would share the same empty one.
 */
const lines = computed(() =>
    (props.receipt?.lines || []).map((line, i) => ({
        key: String(i),
        ...line,
    })),
);
</script>

<template>
    <ADrawer :open="Boolean(receipt)" :win="win" @close="emit('close')">
        <template v-if="receipt">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top a-dhead-flush">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t('inventory.receipts.drawer.title') }}
                                <span class="num">{{ receipt.id }}</span>
                            </h2>
                            <AChip tone="green" size="lg">
                                {{ t('inventory.receipts.drawer.state') }}
                            </AChip>
                            <AChip
                                size="lg"
                                :dot="false"
                                :tone="
                                    receipt.docType === 'tax_invoice'
                                        ? 'blue'
                                        : 'slate'
                                "
                            >
                                {{
                                    t(
                                        `supplierDocs.type.${receipt.docType || 'delivery_note'}`,
                                    )
                                }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span>
                                {{
                                    t('inventory.receipts.drawer.supplier', {
                                        name: loc(receipt.supplier),
                                    })
                                }}
                            </span>
                            <span>
                                {{
                                    receipt.docType === 'tax_invoice'
                                        ? t('buying.receive.docNumInvoice')
                                        : t('inventory.receipts.drawer.docNum')
                                }}
                                <ANum>{{ docRef(receipt) }}</ANum>
                                <template v-if="receipt.supplierRef">
                                    ·
                                    {{
                                        t('supplierDocs.sapNum', {
                                            num: receipt.docNum,
                                        })
                                    }}
                                </template>
                            </span>
                            <span
                                v-if="receipt.docType !== 'tax_invoice'"
                                :class="{
                                    'rd-open': isOpenNote(receipt),
                                }"
                                >{{ docStatus }}</span
                            >
                            <span>
                                {{ t('inventory.receipts.drawer.received') }}
                                <ANum>{{ receipt.when.stamp }}</ANum>
                            </span>
                            <span>
                                {{
                                    t('inventory.receipts.drawer.by', {
                                        name: loc(receipt.by),
                                    })
                                }}
                            </span>
                            <span v-if="order">
                                <RouterLink
                                    class="a-linkbtn"
                                    :to="{
                                        name: 'buyingSheet',
                                        params: { kind: 'order', id: order.id },
                                    }"
                                >
                                    {{
                                        t('inventory.receipts.drawer.po', {
                                            id: order.number,
                                        })
                                    }}
                                </RouterLink>
                            </span>
                            <span v-else-if="receipt.poNumber">
                                {{
                                    t('inventory.receipts.drawer.po', {
                                        id: receipt.poNumber,
                                    })
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton sm icon="x" @click="emit('close')">
                            {{ t('ui.close') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div v-if="receipt.note" class="a-note a-note--info a-rd-note">
                {{ loc(receipt.note) }}
            </div>

            <ACard
                :title="t('inventory.receipts.drawer.lines')"
                icon="package"
                :pad="false"
            >
                <ADataTable :cols="cols" :rows="lines" row-key="key">
                    <template #cell-batch="{ row }">
                        <button
                            v-if="row.batch"
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-batch', row.batch)"
                        >
                            <span class="num">{{
                                inventory.batchNo(row.batch)
                            }}</span>
                        </button>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #cell-name="{ row }">
                        <div class="t-strong">{{ loc(row.name) }}</div>
                        <div class="t-sub">
                            {{
                                row.general
                                    ? t('supplierDocs.general')
                                    : row.sku
                            }}
                        </div>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ num(row.qty) }}</ANum>
                        <template v-if="row.unit">
                            {{ t(`inventory.unit.${row.unit}`) }}
                        </template>
                    </template>
                    <template #cell-supplierBatch="{ row }">
                        <span v-if="row.supplierBatch" class="ltr">
                            {{ row.supplierBatch }}
                        </span>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #cell-expiry="{ row }">
                        <ANum v-if="row.expiry">{{ fmtISO(row.expiry) }}</ANum>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #cell-wh="{ row }">
                        <template v-if="row.wh">
                            {{ t(`warehouse.${row.wh}.name`) }}
                        </template>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #head-price="{ col }">
                        {{ col.label }}
                    </template>
                    <template #cell-price="{ row }">
                        <ANum v-if="row.price != null">
                            {{ CURRENCY_SYMBOL[row.currency] || ''
                            }}{{ num(row.price, 2) }}
                        </ANum>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #head-labels="{ col }">
                        {{ col.label }}
                    </template>
                    <template #cell-labels="{ row }">
                        <ANum v-if="row.labels">{{ row.labels }}</ANum>
                        <span v-else class="a-muted">—</span>
                    </template>
                </ADataTable>
            </ACard>

            <AttachmentsPanel
                :key="receipt.id"
                class="rd-scans"
                entity="receipt"
                :ref-id="receipt.id"
                :title="t('supplierDocs.tab.scans')"
            />
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-flush {
    padding-bottom: 0;
}

.a-dhead-h {
    margin: 0;
    font-size: 26px;
}

.a-rd-note {
    margin-bottom: 16px;
}

.a-muted {
    color: var(--a-ink-4);
}

/* A delivery note still waiting for its invoice. */
.rd-open {
    color: var(--a-amber, var(--a-ink));
    font-weight: 600;
}

.rd-scans {
    margin-top: 16px;
}
</style>
