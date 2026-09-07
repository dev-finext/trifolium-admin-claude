<script setup>
// One goods receipt: what arrived, on which delivery note, and which batches it
// opened. Each line is a batch, so every row here is a link into the trace.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';

const props = defineProps({
    /** The receipt to show, or null while the drawer is closed. */
    receipt: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-batch']);

const { t } = useI18n();
const { loc } = useLocalized();

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

const lines = computed(() => props.receipt?.lines || []);
</script>

<template>
    <ADrawer :open="Boolean(receipt)" @close="emit('close')">
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
                                {{ t('inventory.receipts.drawer.docNum') }}
                                <ANum>{{ receipt.docNum }}</ANum>
                            </span>
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
                            <span v-if="receipt.po">
                                <V2Badge id="purchase-orders" size="sm" />
                                <RouterLink
                                    class="a-linkbtn"
                                    :to="{
                                        name: 'purchasing',
                                        query: { po: receipt.po },
                                    }"
                                >
                                    {{
                                        t('inventory.receipts.drawer.po', {
                                            id: receipt.po,
                                        })
                                    }}
                                </RouterLink>
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
                <ADataTable :cols="cols" :rows="lines" row-key="batch">
                    <template #cell-batch="{ row }">
                        <button
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-batch', row.batch)"
                        >
                            <span class="num">{{ row.batch }}</span>
                        </button>
                    </template>
                    <template #cell-name="{ row }">
                        <div class="t-strong">{{ loc(row.name) }}</div>
                        <div class="t-sub">{{ row.sku }}</div>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ num(row.qty) }}</ANum>
                        {{ t(`inventory.unit.${row.unit}`) }}
                    </template>
                    <template #cell-supplierBatch="{ row }">
                        <span v-if="row.supplierBatch" class="ltr">
                            {{ row.supplierBatch }}
                        </span>
                        <span v-else class="a-muted">—</span>
                    </template>
                    <template #cell-expiry="{ row }">
                        <ANum>{{ fmtISO(row.expiry) }}</ANum>
                    </template>
                    <template #cell-wh="{ row }">
                        {{ t(`warehouse.${row.wh}.name`) }}
                    </template>
                    <template #head-price="{ col }">
                        {{ col.label }}
                        <V2Badge id="receiving" size="sm" />
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
                        <V2Badge id="receiving" size="sm" />
                    </template>
                    <template #cell-labels="{ row }">
                        <ANum v-if="row.labels">{{ row.labels }}</ANum>
                        <span v-else class="a-muted">—</span>
                    </template>
                </ADataTable>
            </ACard>
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
</style>
