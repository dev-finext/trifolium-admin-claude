<script setup>
// Batch traceability: one batch, forward to every customer who received part of
// it. This is the drawer a recall question is answered from, which is why the
// chain lists the order, the formula, the patient and the practitioner rather
// than only a quantity.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ActionGate from '@/components/ui/ActionGate.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import ChangeLogPanel from '@/components/ui/ChangeLogPanel.vue';
import OrderLink from '@/components/ui/OrderLink.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { BATCH_STATES, STOCK_MOVE } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The batch to trace, or null while the drawer is closed. */
    batch: { type: Object, default: null },
});

const emit = defineEmits([
    'close',
    'open-receipt',
    'open-production',
    'open-batch',
    'open-doc',
    'open-report',
]);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const uses = computed(() =>
    props.batch ? inventory.useOfBatch(props.batch.id) : [],
);

/**
 * Every movement this batch ever had. V3.
 *
 * The specification asks for a link from a batch to everything that happened to
 * it — the receipt that opened it, the runs that drew on it, the orders it went
 * out on. Each row names the document behind it, and the document opens.
 */
const moves = computed(() =>
    props.batch ? inventory.movementsOfBatch(props.batch.id) : [],
);

const moveCols = computed(() => [
    { k: 'when', label: t('inventory.batches.moves.when'), nowrap: true },
    { k: 'kind', label: t('inventory.batches.moves.kind'), nowrap: true },
    { k: 'qty', label: t('inventory.batches.moves.qty'), nowrap: true },
    { k: 'ref', label: t('inventory.batches.moves.ref'), nowrap: true },
    { k: 'by', label: t('inventory.batches.moves.by') },
]);

/** Which screen a movement's document belongs to, read off its own number. */
function openRef(ref) {
    if (!ref) {
        return;
    }

    if (String(ref).startsWith('GR-')) {
        emit('open-receipt', ref);
    } else if (String(ref).startsWith('PR-')) {
        emit('open-production', ref);
    } else {
        emit('open-doc', ref);
    }
}

/**
 * Correcting the batch's two dates. V3.
 *
 * Both are single fields, as the specification insists — the expiry that FEFO
 * and the label work from, and the production date the supplier's certificate
 * gives. Changing either is written to the change log with its old value.
 */
const editing = ref(false);
const saving = ref(false);
const form = reactive({ expiry: '', madeOn: '', reason: '' });

watch(editing, (open) => {
    if (open && props.batch) {
        form.expiry = props.batch.expiry || '';
        form.madeOn = props.batch.madeOn || '';
        form.reason = '';
    }
});

const dirty = computed(
    () =>
        Boolean(props.batch) &&
        (form.expiry !== (props.batch.expiry || '') ||
            (form.madeOn || '') !== (props.batch.madeOn || '')),
);

async function saveDates() {
    saving.value = true;

    try {
        await inventory.editBatchDates(props.batch.id, { ...form });
        editing.value = false;
    } finally {
        saving.value = false;
    }
}

/**
 * What went into a batch the pharmacy made: the production run records which
 * component batch each quantity was drawn from, which is the other half of the
 * trace — forward to the customer, backward to the herb.
 */
const madeFrom = computed(() =>
    (props.batch?.components || []).map((one, i) => ({
        id: `${one.batch}-${i}`,
        ...one,
        name: inventory.itemBySku(one.sku)?.name || one.sku,
        unit: inventory.itemBySku(one.sku)?.unit || null,
    })),
);

const madeFromCols = computed(() => [
    { k: 'sku', label: t('inventory.batches.trace.sku'), nowrap: true },
    { k: 'name', label: t('inventory.batches.col.name') },
    { k: 'batch', label: t('inventory.batches.trace.fromBatch'), nowrap: true },
    { k: 'qty', label: t('inventory.batches.trace.drawnQty'), nowrap: true },
]);

const unitLabel = computed(() =>
    props.batch ? t(`inventory.unit.${props.batch.unit}`) : '',
);

/**
 * Every goods receipt that fed this batch, oldest first. V3.
 *
 * The same lot may arrive more than once — a supplier ships the rest of it a
 * month later — and both deliveries belong to one batch under one number. The
 * batch therefore has one expiry and a list of receipt dates.
 */
const receipts = computed(() =>
    props.batch ? inventory.receiptsOfBatch(props.batch.id) : [],
);

const receiptCols = computed(() => [
    { k: 'when', label: t('inventory.batches.receipts.when'), nowrap: true },
    { k: 'qty', label: t('inventory.batches.receipts.qty'), nowrap: true },
    { k: 'ref', label: t('inventory.batches.receipts.doc'), nowrap: true },
    { k: 'by', label: t('inventory.batches.receipts.by') },
]);

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
                                <span class="num">{{
                                    inventory.batchNo(batch)
                                }}</span>
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
                            <span v-if="batch.supplier">
                                {{
                                    t('inventory.batches.trace.supplier', {
                                        name: loc(batch.supplier),
                                    })
                                }}
                            </span>
                            <span v-else-if="batch.production">
                                {{
                                    t('inventory.batches.trace.fromRun', {
                                        id: batch.production,
                                    })
                                }}
                            </span>
                            <span>
                                {{ t('inventory.batches.trace.received') }}
                                <ANum>{{ receivedOn }}</ANum>
                                <template v-if="receipts.length > 1">
                                    ·
                                    {{
                                        t('inventory.batches.receipts.more', {
                                            n: receipts.length,
                                        })
                                    }}
                                </template>
                            </span>
                            <span>
                                {{ t('inventory.batches.trace.expiry') }}
                                <ANum>{{ fmtISO(batch.expiry) }}</ANum>
                            </span>
                            <span>
                                {{
                                    t('inventory.batches.trace.remaining', {
                                        left: num(batch.remaining, 3),
                                        unit: unitLabel,
                                        qty: num(batch.qty, 3),
                                    })
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton sm icon="edit" @click="editing = true">
                            {{ t('inventory.batches.dates.edit') }}
                            <V2Badge v="3" size="sm" />
                        </AButton>
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
                                t('inventory.batches.trace.source'),
                                t(`inventory.batchSource.${batch.source}`),
                            ],
                            [
                                t('inventory.batches.trace.receipt'),
                                batch.receipt,
                            ],
                            [
                                t('inventory.batches.trace.production'),
                                batch.production,
                            ],
                            [
                                t('inventory.batches.trace.unitCost'),
                                batch.unitCost,
                            ],
                            [
                                t('inventory.batches.trace.supplierBatch'),
                                batch.supplierBatch,
                            ],
                            [
                                t('inventory.batches.trace.madeOn'),
                                batch.madeOn ? fmtISO(batch.madeOn) : null,
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
                            <AChip
                                :tone="batch.waste ? 'red' : 'gray'"
                                size="sm"
                                :dot="false"
                            >
                                {{
                                    batch.waste
                                        ? t('inventory.batches.trace.wasteChip')
                                        : t(
                                              `inventory.batchSource.${batch.source}`,
                                          )
                                }}
                            </AChip>
                        </template>
                        <template #value-2>
                            <button
                                v-if="batch.receipt"
                                type="button"
                                class="a-linkbtn"
                                @click="emit('open-receipt', batch.receipt)"
                            >
                                <ANum>{{ batch.receipt }}</ANum>
                            </button>
                            <span v-else>—</span>
                        </template>
                        <template #value-3>
                            <button
                                v-if="batch.production"
                                type="button"
                                class="a-linkbtn"
                                @click="
                                    emit('open-production', batch.production)
                                "
                            >
                                <ANum>{{ batch.production }}</ANum>
                            </button>
                            <span v-else>—</span>
                        </template>
                        <template #value-4>
                            <span v-if="batch.unitCost">
                                {{ ils(batch.unitCost, 2) }}
                            </span>
                            <span v-else>—</span>
                        </template>
                        <template #value-5>
                            <span v-if="batch.supplierBatch" class="ltr">
                                {{ batch.supplierBatch }}
                            </span>
                            <span v-else>—</span>
                        </template>
                        <template #value-9>
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
                            <OrderLink :id="row.order" />
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
            <ACard
                v-if="madeFrom.length"
                :title="t('inventory.batches.trace.madeFrom')"
                icon="beaker"
                :pad="false"
            >
                <ADataTable :cols="madeFromCols" :rows="madeFrom" row-key="id">
                    <template #cell-sku="{ row }">
                        <span class="a-code a-tag">{{ row.sku }}</span>
                    </template>
                    <template #cell-name="{ row }">{{
                        loc(row.name)
                    }}</template>
                    <template #cell-batch="{ row }">
                        <button
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-batch', row.batch)"
                        >
                            <ANum>{{ inventory.batchNo(row.batch) }}</ANum>
                        </button>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ num(row.qty, 3) }}</ANum>
                        <template v-if="row.unit">
                            {{ t(`inventory.unit.${row.unit}`) }}
                        </template>
                    </template>
                </ADataTable>
            </ACard>

            <ACard
                v-if="receipts.length"
                :title="t('inventory.batches.receipts.title')"
                icon="inbox"
            >
                <template #right>
                    <V2Badge v="3" size="sm" />
                </template>
                <p class="a-hint">
                    {{ t('inventory.batches.receipts.hint') }}
                </p>
                <ADataTable :cols="receiptCols" :rows="receipts" row-key="id">
                    <template #cell-when="{ row }">
                        <ANum>{{ row.when.stamp }}</ANum>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ num(row.qty, 3) }}</ANum>
                        <span v-if="row.unit"
                            >&nbsp;{{ t(`inventory.unit.${row.unit}`) }}</span
                        >
                    </template>
                    <template #cell-ref="{ row }">
                        <button
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-receipt', row.ref)"
                        >
                            <ANum>{{ row.ref }}</ANum>
                        </button>
                    </template>
                    <template #cell-by="{ row }">
                        <span v-if="row.by">{{ loc(row.by) }}</span>
                        <span v-else class="a-trace-n">—</span>
                    </template>
                </ADataTable>
            </ACard>

            <ACard :title="t('inventory.batches.moves.title')" icon="list">
                <template #right>
                    <V2Badge v="3" size="sm" />
                </template>
                <p class="a-hint">{{ t('inventory.batches.moves.hint') }}</p>
                <p v-if="moves.length" class="a-trace-report">
                    <button
                        type="button"
                        class="a-linkbtn"
                        @click="emit('open-report', batch.id)"
                    >
                        {{ t('inventory.batches.moves.inReport') }}
                    </button>
                </p>
                <ADataTable
                    v-if="moves.length"
                    :cols="moveCols"
                    :rows="moves"
                    row-key="id"
                >
                    <template #cell-when="{ row }">
                        <ANum>{{ row.when.stamp }}</ANum>
                    </template>
                    <template #cell-kind="{ row }">
                        <AChip
                            :tone="STOCK_MOVE[row.kind]?.tone"
                            size="sm"
                            :dot="false"
                        >
                            {{ t(`stockMove.${row.kind}`) }}
                        </AChip>
                    </template>
                    <template #cell-qty="{ row }">
                        <span :class="{ 'is-out': row.qty < 0 }">
                            <ANum>{{ num(row.qty, 3) }}</ANum>
                        </span>
                        <span v-if="row.unit"
                            >&nbsp;{{ t(`inventory.unit.${row.unit}`) }}</span
                        >
                    </template>
                    <template #cell-ref="{ row }">
                        <button
                            v-if="row.ref"
                            type="button"
                            class="a-linkbtn"
                            @click="openRef(row.ref)"
                        >
                            <ANum>{{ row.ref }}</ANum>
                        </button>
                        <span v-else class="a-trace-n">—</span>
                    </template>
                    <template #cell-by="{ row }">
                        <span v-if="row.by">{{ loc(row.by) }}</span>
                        <span v-else class="a-trace-n">—</span>
                    </template>
                </ADataTable>
                <p v-else class="a-trace-n">
                    {{ t('inventory.batches.moves.none') }}
                </p>
            </ACard>

            <ACard :title="t('inventory.batches.trace.analyses')" icon="file">
                <ActionGate id="batch_analyses">
                    <AttachmentsPanel entity="batch" :ref-id="batch.id" bare />
                </ActionGate>
            </ACard>

            <ChangeLogPanel entity="batch" :ref-id="batch.id" />

            <AModal
                v-if="editing"
                open
                :title="t('inventory.batches.dates.title')"
                :width="480"
                @close="editing = false"
            >
                <div class="bd-form">
                    <div>
                        <label class="a-lbl" for="bd-exp">{{
                            t('inventory.batches.trace.expiry')
                        }}</label>
                        <AInput
                            id="bd-exp"
                            v-model="form.expiry"
                            type="date"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('inventory.batches.dates.expiryHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" for="bd-made">{{
                            t('inventory.batches.trace.madeOn')
                        }}</label>
                        <AInput
                            id="bd-made"
                            v-model="form.madeOn"
                            type="date"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('inventory.batches.dates.madeOnHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" for="bd-why">{{
                            t('inventory.batches.dates.reason')
                        }}</label>
                        <ATextarea
                            id="bd-why"
                            v-model="form.reason"
                            :rows="2"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('inventory.batches.dates.reasonHint') }}
                        </div>
                    </div>
                </div>
                <template #footer>
                    <AButton
                        kind="p"
                        icon="save"
                        :disabled="!dirty || saving"
                        @click="saveDates"
                        >{{ t('inventory.batches.dates.save') }}</AButton
                    >
                    <AButton @click="editing = false">{{
                        t('actions.cancel')
                    }}</AButton>
                </template>
            </AModal>
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

.is-out {
    color: var(--a-red);
}

.bd-form {
    display: grid;
    gap: 14px;
}

.a-trace-report {
    margin: 0 0 10px;
}
</style>
