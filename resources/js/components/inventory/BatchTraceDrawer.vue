<script setup>
// Batch traceability: one batch, forward to every customer who received part of
// it. This is the drawer a recall question is answered from, which is why the
// chain lists the order, the formula, the patient and the practitioner rather
// than only a quantity.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ActionGate from '@/components/ui/ActionGate.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { BATCH_STATES } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The batch to trace, or null while the drawer is closed. */
    batch: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-receipt']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const uses = computed(() =>
    props.batch ? inventory.useOfBatch(props.batch.id) : [],
);

const unitLabel = computed(() =>
    props.batch ? t(`inventory.unit.${props.batch.unit}`) : '',
);

/** `received` travels as the same moment object every record's date field uses. */
const receivedOn = computed(() => {
    const received = props.batch?.received;

    if (!received) {
        return '';
    }

    return fmtISO(typeof received === 'string' ? received : received.iso);
});

const cols = computed(() => [
    {
        k: 'order',
        label: t('inventory.batches.trace.col.order'),
        nowrap: true,
    },
    { k: 'item', label: t('inventory.batches.trace.col.item') },
    { k: 'customer', label: t('inventory.batches.trace.col.customer') },
    { k: 'qty', label: t('inventory.batches.trace.col.qty'), nowrap: true },
    { k: 'when', label: t('inventory.batches.trace.col.when'), nowrap: true },
]);
</script>

<template>
    <ADrawer :open="Boolean(batch)" @close="emit('close')">
        <template v-if="batch">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top a-dhead-flush">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t('inventory.batches.trace.title') }}
                                <span class="num">{{ batch.id }}</span>
                            </h2>
                            <AChip
                                :tone="BATCH_STATES[batch.state]?.tone"
                                size="lg"
                            >
                                {{ t(`batchState.${batch.state}`) }}
                            </AChip>
                            <AChip tone="gray" :dot="false">
                                {{ loc(batch.name) }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span>
                                {{
                                    t('inventory.batches.trace.supplier', {
                                        name: loc(batch.supplier),
                                    })
                                }}
                            </span>
                            <span>
                                {{ t('inventory.batches.trace.received') }}
                                <ANum>{{ receivedOn }}</ANum>
                            </span>
                            <span>
                                {{ t('inventory.batches.trace.expiry') }}
                                <ANum>{{ fmtISO(batch.expiry) }}</ANum>
                            </span>
                            <span>
                                {{
                                    t('inventory.batches.trace.remaining', {
                                        left: num(batch.remaining),
                                        unit: unitLabel,
                                        qty: num(batch.qty),
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

            <div class="a-2col a-trace-cols">
                <ACard
                    :title="t('inventory.batches.trace.details')"
                    icon="layers"
                >
                    <AKeyValue
                        :rows="[
                            [t('inventory.batches.trace.sku'), batch.sku],
                            [
                                t('inventory.batches.trace.receipt'),
                                batch.receipt,
                            ],
                            [
                                t('inventory.batches.trace.supplierBatch'),
                                batch.supplierBatch,
                            ],
                            [
                                t('inventory.batches.trace.wh'),
                                t(`warehouse.${batch.wh}.name`),
                            ],
                            [t('inventory.batches.trace.by'), loc(batch.by)],
                            [t('inventory.batches.trace.daysToExp'), ''],
                        ]"
                    >
                        <template #value-0>
                            <span class="a-code a-tag">{{ batch.sku }}</span>
                        </template>
                        <template #value-1>
                            <button
                                type="button"
                                class="a-linkbtn"
                                @click="emit('open-receipt', batch.receipt)"
                            >
                                <ANum>{{ batch.receipt }}</ANum>
                            </button>
                        </template>
                        <template #value-2>
                            <span v-if="batch.supplierBatch" class="ltr">
                                {{ batch.supplierBatch }}
                            </span>
                            <span v-else>—</span>
                        </template>
                        <template #value-5>
                            <AChip
                                v-if="batch.daysToExp < 0"
                                tone="red"
                                size="sm"
                            >
                                {{
                                    t('inventory.batches.expiredAgo', {
                                        n: -batch.daysToExp,
                                    })
                                }}
                            </AChip>
                            <template v-else>
                                {{
                                    t('inventory.batches.trace.days', {
                                        n: batch.daysToExp,
                                    })
                                }}
                            </template>
                        </template>
                    </AKeyValue>

                    <div
                        v-if="batch.state === 'expired'"
                        class="a-note a-note--danger a-trace-note"
                    >
                        {{ t('inventory.batches.trace.expiredBlocked') }}
                    </div>
                    <div
                        v-else-if="batch.state === 'rejected'"
                        class="a-note a-note--danger a-trace-note"
                    >
                        {{ t('inventory.batches.trace.rejectedBlocked') }}
                    </div>
                </ACard>

                <ACard
                    :title="t('inventory.batches.trace.chain')"
                    icon="clipboard_list"
                    :pad="false"
                >
                    <template #right>
                        <span class="a-trace-n">
                            {{
                                t('inventory.batches.trace.uses', {
                                    n: uses.length,
                                })
                            }}
                        </span>
                    </template>

                    <ADataTable :cols="cols" :rows="uses" row-key="id">
                        <template #empty>
                            <AEmpty
                                icon="layers"
                                :title="
                                    t('inventory.batches.trace.empty.title')
                                "
                                :sub="t('inventory.batches.trace.empty.sub')"
                            />
                        </template>

                        <template #cell-order="{ row }">
                            <RouterLink
                                class="a-linkbtn"
                                :to="{
                                    name: 'order',
                                    params: { id: row.order },
                                }"
                            >
                                <ANum>{{ row.order }}</ANum>
                            </RouterLink>
                        </template>
                        <template #cell-item="{ row }">
                            <div class="t-strong">{{ loc(row.itemName) }}</div>
                            <div class="t-sub num">{{ row.item }}</div>
                        </template>
                        <template #cell-customer="{ row }">
                            <div>{{ loc(row.patient) }}</div>
                            <div class="t-sub">{{ loc(row.practitioner) }}</div>
                        </template>
                        <template #cell-qty="{ row }">
                            <ANum>{{ num(row.qty) }}</ANum>
                            {{ t(`inventory.unit.${row.unit}`) }}
                        </template>
                        <template #cell-when="{ row }">
                            <ANum>{{ row.when.stamp }}</ANum>
                        </template>
                    </ADataTable>
                </ACard>
            </div>

            <!-- V2: analyses behind the approval code -->
            <ACard :title="t('inventory.batches.trace.analyses')" icon="file">
                <ActionGate id="batch_analyses">
                    <AttachmentsPanel entity="batch" :ref-id="batch.id" bare />
                </ActionGate>
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

.a-trace-cols {
    align-items: start;
}

.a-trace-note {
    margin-top: 14px;
}

.a-trace-n {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
