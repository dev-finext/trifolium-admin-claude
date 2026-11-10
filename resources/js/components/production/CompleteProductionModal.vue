<script setup>
// Receiving a run into stock: all of what is left, or a part of it.
//
// "חשוב שתהיה אופציה של קליטה חלקית למלאי, לפעמים מוצר רק חלק מכמות המוצר
// שהזמנתי ואני מכניסה למלאי רק את החלק הזה ושאר ההוראה נשארת פתוחה." So the
// first choice is which kind of receipt this is. A part leaves the order open
// and the rest still reserved; the last one closes it. A second part may go
// into the batch the first one opened — the same lot brought back in two goes —
// or open its own.
//
// After the receipt the form turns into the label step: the number of batch
// labels the containers come to ("קלטתי 1.200 ק״ג של אבקה — המערכת תדע להדפיס
// לי 4 מדבקות"), editable, and the button that prints them.
//
// Everything is pre-filled from the recipe and can be corrected.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useProductionLabels } from '@/composables/useProductionLabels';
import {
    labelCount,
    labelPackOf,
    receivedQty,
    resolveExpiryMonths,
} from '@/config';
import { toStockUnits } from '@/demo/production';
import { addMonths } from '@/lib/dates';
import { qtyText } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

const props = defineProps({
    order: { type: Object, required: true },
});

const emit = defineEmits(['close', 'completed']);

const { t } = useI18n();
const { loc } = useLocalized();
const { printBatchLabels } = useProductionLabels();
const dataset = useDatasetStore();
const inventory = useInventoryStore();
const items = useItemsStore();
const store = useProductionStore();

const bom = items.bomById(props.order.bomId);
const item = items.itemBySku(props.order.parentSku);
const wastePct = bom?.expectedWastePct || 0;
const months = resolveExpiryMonths({
    item,
    prepType: items.prepTypeById(props.order.prepType),
    settings: dataset.data.inventorySettings,
});

const round2 = (value) => Math.round(value * 100) / 100;
const uomLabel = (uom) => t(`inventory.unit.${uom || 'unit'}`);

/** What has come back so far, and the part of the run not yet accounted for. */
const received = receivedQty(props.order);
const receipts = props.order.receipts || [];
const leftQty = round2(
    props.order.plannedQty * Math.max(0, 1 - (Number(props.order.drawn) || 0)),
);

/** The batch the previous part opened, which a new part may go into. */
const previousBatch = [...receipts]
    .reverse()
    .map((receipt) => inventory.batchById(receipt.batch))
    .find(Boolean);

const form = reactive({
    final: 'final',
    yieldQty: String(round2(leftQty * (1 - wastePct / 100))),
    wasteQty: String(round2(leftQty * (wastePct / 100))),
    batchMode: 'new',
    // Calendar months, not 30-day blocks — this is the value receiveOrder()
    // actually saves unless the operator edits the date, since a pre-filled
    // field is never empty for its own `form.expiresOn || addMonths(...)`
    // fallback to kick in (stores/production.js receiveOrder).
    expiresOn: addMonths(null, months || 24),
    note: '',
    actual: Object.fromEntries(
        props.order.components
            .filter((component) => component.issue === 'manual')
            .map((component) => [component.sku, String(component.plannedQty)]),
    ),
});

const saving = ref(false);

/** Set once the receipt is saved: the form becomes the label step. */
const done = ref(null);
const labels = ref('');

const isFinal = computed(() => form.final === 'final');
const adding = computed(
    () => form.batchMode === 'add' && Boolean(previousBatch),
);

// Once the whole run has been drawn there is no "part" left to receive: the
// next receipt is the last.
const kindOptions = computed(() =>
    [
        { value: 'final', label: t('production.receive.kind.final') },
        leftQty > 0 && {
            value: 'partial',
            label: t('production.receive.kind.partial'),
        },
    ].filter(Boolean),
);

const batchOptions = computed(() =>
    [
        {
            value: 'new',
            label: t('production.receive.batch.new', {
                next: inventory.nextBatchNumber({ kind: 'production' }).number,
            }),
        },
        previousBatch && {
            value: 'add',
            label: t('production.receive.batch.add', {
                batch: inventory.batchNo(previousBatch),
            }),
        },
    ].filter(Boolean),
);

const manual = computed(() =>
    isFinal.value
        ? props.order.components.filter(
              (component) => component.issue === 'manual',
          )
        : [],
);

const yieldNumber = computed(() => Number(form.yieldQty) || 0);
const wasteNumber = computed(() => Number(form.wasteQty) || 0);

/** A part that already covers everything still out — most likely the last one. */
const coversAll = computed(
    () =>
        !isFinal.value &&
        yieldNumber.value + wasteNumber.value >= leftQty - 0.0001,
);

const ok = computed(() => {
    if (yieldNumber.value < 0 || wasteNumber.value < 0) {
        return false;
    }

    // Nothing back is a receipt only when it closes an order whose yield
    // already came back in earlier parts.
    if (yieldNumber.value === 0) {
        return isFinal.value && receipts.length > 0;
    }

    return adding.value || Boolean(form.expiresOn);
});

/** How the label count is reached, for the hint under it. */
const pack = labelPackOf({ item, settings: dataset.data.inventorySettings });

function suggestLabels(receipt) {
    const unit = inventory.itemBySku(props.order.parentSku)?.unit;

    return labelCount(
        receipt.stockQty ?? toStockUnits(receipt.qty, props.order.uom, unit),
        unit || props.order.uom,
        pack,
    );
}

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const result = await store.receiveOrder(props.order.id, {
        final: isFinal.value,
        yieldQty: yieldNumber.value,
        wasteQty: wasteNumber.value,
        batchMode: adding.value ? 'add' : 'new',
        expiresOn: adding.value ? null : form.expiresOn,
        // An emptied field is no figure — the recipe's quantity stands —
        // not a zero that would leave the shelf untouched.
        actual: Object.fromEntries(
            Object.entries(form.actual).map(([sku, value]) => [
                sku,
                String(value ?? '').trim() === '' ? '' : Number(value),
            ]),
        ),
        note: form.note,
    });

    saving.value = false;

    if (!result) {
        return;
    }

    // Nothing came back — there is nothing to label.
    if (!result.receipt.batch) {
        emit('completed', result);

        return;
    }

    const suggested = suggestLabels(result.receipt);

    labels.value = suggested ? String(suggested) : '';
    done.value = { ...result, suggested };
}

const labelNumber = computed(() => Math.round(Number(labels.value) || 0));

async function printLabels() {
    const { order, receipt } = done.value;

    if (!(await printBatchLabels(order, receipt, labelNumber.value))) {
        return;
    }

    await store.setReceiptLabels(order.id, receipt.n, labelNumber.value);
    emit('completed', done.value);
}

function finish() {
    emit('completed', done.value);
}

const packHint = computed(() => {
    if (!pack) {
        return t('production.receive.labels.noPack');
    }

    const size = `${qtyText(pack.qty, 3)} ${uomLabel(pack.uom)}`;

    return pack.source === 'item'
        ? t('production.receive.labels.byItem', {
              size,
              name: pack.name || t('items.card.salesPackDefault'),
          })
        : t('production.receive.labels.byFamily', {
              size,
              family: t(`items.family.${item?.family}`),
          });
});
</script>

<template>
    <AModal
        open
        :title="
            t('production.receive.title', {
                id: order.id,
                name: loc(order.name),
            })
        "
        :width="680"
        @close="done ? finish() : emit('close')"
    >
        <!-- the label step, once the receipt is in -->
        <div v-if="done" class="cm-done">
            <p class="cm-lede">
                {{
                    t('production.receive.saved', {
                        qty: qtyText(done.receipt.stockQty, 3),
                        uom: uomLabel(
                            inventory.itemBySku(order.parentSku)?.unit ||
                                order.uom,
                        ),
                        batch: inventory.batchNo(done.receipt.batch),
                    })
                }}
                <template v-if="!done.receipt.final">
                    {{ t('production.receive.stillOpen') }}
                </template>
            </p>
            <div class="cm-labels">
                <label class="a-lbl" for="cm-labels">{{
                    t('production.receive.labels.count')
                }}</label>
                <AInput
                    id="cm-labels"
                    v-model="labels"
                    type="number"
                    min="1"
                    ltr
                    class="cm-count"
                />
                <div class="a-hint">{{ packHint }}</div>
            </div>
        </div>

        <div v-else class="cm-grid">
            <div class="cm-wide cm-progress">
                {{
                    t('production.receive.progress', {
                        planned: qtyText(order.plannedQty, 3),
                        received: qtyText(round2(received), 3),
                        left: qtyText(leftQty, 3),
                        uom: uomLabel(order.uom),
                    })
                }}
            </div>
            <div>
                <label class="a-lbl" for="cm-kind">{{
                    t('production.receive.kind.label')
                }}</label>
                <ASelect
                    id="cm-kind"
                    v-model="form.final"
                    :options="kindOptions"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t(`production.receive.kind.hint.${form.final}`) }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cm-yield">{{
                    t('production.receive.yield')
                }}</label>
                <AInput
                    id="cm-yield"
                    v-model="form.yieldQty"
                    type="number"
                    min="0"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.receive.yieldHint', {
                            uom: uomLabel(order.uom),
                        })
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cm-waste">{{
                    t('production.complete.waste')
                }}</label>
                <AInput
                    id="cm-waste"
                    v-model="form.wasteQty"
                    type="number"
                    min="0"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        wastePct
                            ? t('production.complete.wasteHint', {
                                  pct: wastePct,
                              })
                            : t('production.complete.wasteNone')
                    }}
                </div>
            </div>
            <div v-if="previousBatch && yieldNumber > 0">
                <label class="a-lbl" for="cm-batch">{{
                    t('production.receive.batch.label')
                }}</label>
                <ASelect
                    id="cm-batch"
                    v-model="form.batchMode"
                    :options="batchOptions"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t(`production.receive.batch.hint.${form.batchMode}`) }}
                </div>
            </div>
            <div v-if="!adding && yieldNumber > 0">
                <label class="a-lbl" for="cm-exp">{{
                    t('production.complete.expiry')
                }}</label>
                <AInput
                    id="cm-exp"
                    v-model="form.expiresOn"
                    type="date"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.complete.expiryHint', {
                            months: months || 24,
                        })
                    }}
                </div>
            </div>
            <div v-for="component in manual" :key="component.sku">
                <label class="a-lbl" :for="`cm-${component.sku}`">
                    {{
                        t('production.complete.actual', {
                            name: loc(component.name),
                        })
                    }}
                </label>
                <AInput
                    :id="`cm-${component.sku}`"
                    v-model="form.actual[component.sku]"
                    type="number"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.complete.actualHint', {
                            qty: qtyText(component.plannedQty, 3),
                            uom: t(`inventory.unit.${component.uom}`),
                        })
                    }}
                </div>
            </div>
            <p v-if="coversAll" class="cm-wide a-warn cm-warn">
                {{ t('production.receive.coversAll') }}
            </p>
            <p
                v-if="isFinal && yieldNumber === 0 && receipts.length"
                class="cm-wide a-hint"
            >
                {{ t('production.receive.closeOnly') }}
            </p>
            <div class="cm-wide">
                <label class="a-lbl" for="cm-note">{{
                    t('production.complete.note')
                }}</label>
                <ATextarea
                    id="cm-note"
                    v-model="form.note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>

        <template #footer>
            <template v-if="done">
                <AButton
                    kind="p"
                    icon="printer"
                    :disabled="labelNumber < 1"
                    @click="printLabels"
                >
                    {{
                        t(
                            'production.receive.labels.print',
                            { n: labelNumber },
                            labelNumber,
                        )
                    }}
                </AButton>
                <AButton @click="finish">{{
                    t('production.receive.labels.skip')
                }}</AButton>
            </template>
            <template v-else>
                <AButton
                    kind="p"
                    icon="check"
                    :disabled="!ok || saving"
                    @click="save"
                >
                    {{
                        isFinal
                            ? t('production.receive.saveFinal')
                            : t('production.receive.savePartial')
                    }}
                </AButton>
                <AButton @click="emit('close')">{{
                    t('actions.cancel')
                }}</AButton>
            </template>
        </template>
    </AModal>
</template>

<style scoped>
.cm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px 16px;
}

.cm-wide {
    grid-column: 1 / -1;
}

.cm-progress {
    font-size: 13.5px;
    color: var(--a-ink-3, var(--a-ink-4));
}

.cm-warn {
    margin: 0;
}

.cm-done {
    display: grid;
    gap: 16px;
}

.cm-lede {
    margin: 0;
    font-size: 14px;
}

.cm-count {
    width: 120px;
}
</style>
