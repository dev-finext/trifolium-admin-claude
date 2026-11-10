<script setup>
// A physical count, as the shelf has it.
//
// An item not held in batches is counted as one figure. An item that is — any
// item with a batch still holding stock — is counted batch by batch: a field of
// its own for every batch, expired and waste ones included because they are on
// the shelf too, each pre-filled with what the system holds under it. Every
// batch that differs becomes its own line on one count document, and the item's
// stock follows its batches. A single total could not say which batch the
// difference belongs to, and the batches are what FEFO and a recall work from.
//
// It takes the same `row` and raises the same events as the item card's count
// dialog (components/items/CountModal.vue), so it can stand in for it: only
// `row.sku` is read, and everything else comes from the inventory store.
import { computed, reactive, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { fmtISO } from '@/lib/dates';
import { qtyText } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The item being counted — a stock row or the item card's joined row. */
    row: { type: Object, required: true },
});

const emit = defineEmits(['close', 'counted']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const uid = useId();

const round3 = (value) => Math.round(value * 1000) / 1000;

const stock = computed(() => inventory.itemBySku(props.row.sku) || null);

/** The batches still holding stock, nearest expiry first. */
const held = computed(() => inventory.heldBatchesOf(props.row.sku));

const byBatch = computed(() => held.value.length > 0);

const onHand = computed(() => stock.value?.onHand ?? props.row.onHand ?? 0);

/**
 * What the record holds outside every batch. Nothing, for an item SAP keeps
 * in batches — except where the extract carried an item's total without every
 * batch behind it. Shown as a field of its own so the count decides what
 * happens to it, rather than the dialog writing it off unseen.
 */
const loose = computed(() =>
    byBatch.value
        ? round3(
              onHand.value -
                  held.value.reduce((sum, batch) => sum + batch.remaining, 0),
          )
        : 0,
);

const single = ref('');
const figures = reactive({});
const looseQty = ref('');
const note = ref('');
const saving = ref(false);

/** Every field starts at what the system holds, so a count that agrees is one click. */
watch(
    () => props.row.sku,
    () => {
        single.value = String(onHand.value);
        Object.keys(figures).forEach((id) => delete figures[id]);
        held.value.forEach((batch) => {
            figures[batch.id] = String(batch.remaining);
        });
        looseQty.value = loose.value > 0 ? String(loose.value) : '';
        note.value = '';
    },
    { immediate: true },
);

/** Digits and one decimal point — a count in kilograms has one. */
const clean = (value) =>
    String(value)
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');

const filled = (value) =>
    value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

const unit = computed(() =>
    stock.value?.unit ? t(`inventory.unit.${stock.value.unit}`) : '',
);

const name = computed(() =>
    stock.value ? loc(stock.value.name) : String(props.row.sku),
);

const ready = computed(() =>
    byBatch.value
        ? held.value.every((batch) => filled(figures[batch.id])) &&
          (loose.value <= 0 || filled(looseQty.value))
        : filled(single.value),
);

/** The item's stock once the count is posted, and how far that moved it. */
const after = computed(() => {
    if (!byBatch.value) {
        return Number(single.value) || 0;
    }

    const counted = held.value.reduce(
        (sum, batch) => sum + (Number(figures[batch.id]) || 0),
        0,
    );

    return round3(
        counted + (loose.value > 0 ? Number(looseQty.value) || 0 : 0),
    );
});

const delta = computed(() => round3(after.value - onHand.value));

function batchHint(batch) {
    const hint = t('inventory.count.batchHint', {
        qty: qtyText(batch.remaining, 3),
        unit: unit.value,
        expiry: batch.expiry
            ? fmtISO(batch.expiry)
            : t('inventory.batches.noExpiry'),
    });
    const flag = batch.waste
        ? 'waste'
        : batch.state === 'expired'
          ? 'expired'
          : '';

    return flag
        ? t('inventory.count.batchFlagged', {
              hint,
              state: t(`batchState.${flag}`),
          })
        : hint;
}

async function save() {
    if (!ready.value || saving.value) {
        return;
    }

    saving.value = true;

    const counted = byBatch.value
        ? {
              batches: Object.fromEntries(
                  held.value.map((batch) => [
                      batch.id,
                      Number(figures[batch.id]),
                  ]),
              ),
              ...(loose.value > 0 ? { loose: Number(looseQty.value) } : {}),
          }
        : Number(single.value);

    try {
        const result = await inventory.recordCount(
            props.row.sku,
            counted,
            note.value,
        );

        emit('counted', result);
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        open
        :title="t('inventory.count.title', { name })"
        :width="byBatch ? 620 : 480"
        @close="emit('close')"
    >
        <div class="cm">
            <template v-if="byBatch">
                <p class="a-hint cm-intro">
                    {{ t('inventory.count.byBatch') }}
                </p>

                <div class="cm-batches">
                    <div v-for="batch in held" :key="batch.id">
                        <label class="a-lbl" :for="`${uid}-b-${batch.id}`">
                            {{
                                t('inventory.count.batch', {
                                    id: inventory.batchNo(batch),
                                })
                            }}
                        </label>
                        <AInput
                            :id="`${uid}-b-${batch.id}`"
                            :model-value="figures[batch.id]"
                            inputmode="decimal"
                            ltr
                            class="a-w100"
                            :placeholder="unit"
                            @update:model-value="
                                figures[batch.id] = clean($event)
                            "
                        />
                        <div class="a-hint">{{ batchHint(batch) }}</div>
                    </div>

                    <div v-if="loose > 0">
                        <label class="a-lbl" :for="`${uid}-loose`">
                            {{ t('inventory.count.loose') }}
                        </label>
                        <AInput
                            :id="`${uid}-loose`"
                            :model-value="looseQty"
                            inputmode="decimal"
                            ltr
                            class="a-w100"
                            :placeholder="unit"
                            @update:model-value="looseQty = clean($event)"
                        />
                        <div class="a-hint">
                            {{
                                t('inventory.count.looseHint', {
                                    qty: qtyText(loose, 3),
                                    unit,
                                })
                            }}
                        </div>
                    </div>
                </div>

                <p class="cm-total">
                    {{
                        t('inventory.count.total', {
                            qty: qtyText(after, 3),
                            unit,
                            delta: `${delta > 0 ? '+' : ''}${qtyText(delta, 3)}`,
                        })
                    }}
                </p>
            </template>

            <div v-else>
                <label class="a-lbl" :for="`${uid}-qty`">
                    {{ t('inventory.count.qty') }}
                </label>
                <AInput
                    :id="`${uid}-qty`"
                    :model-value="single"
                    inputmode="decimal"
                    ltr
                    class="a-w100"
                    @update:model-value="single = clean($event)"
                />
                <div class="a-hint">
                    {{
                        t('inventory.count.qtyHint', {
                            qty: qtyText(onHand, 3),
                            unit,
                        })
                    }}
                </div>
            </div>

            <div>
                <label class="a-lbl" :for="`${uid}-note`">
                    {{ t('inventory.count.note') }}
                </label>
                <ATextarea
                    :id="`${uid}-note`"
                    v-model="note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="!ready || saving"
                @click="save"
            >
                {{ t('inventory.count.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.cm {
    display: grid;
    gap: 16px;
}

.cm-intro {
    margin: 0;
}

/* One field to a cell, each with its own label above it; the cells wrap
   rather than squeeze, so no field rides over the next. */
.cm-batches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px 16px;
}

.cm-total {
    margin: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--a-ink-2);
}
</style>
