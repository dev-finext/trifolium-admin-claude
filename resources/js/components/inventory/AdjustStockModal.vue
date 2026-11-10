<script setup>
// התאמת מלאי — a manual correction of one item's stock, in either direction.
//
//   הוספה למלאי   raise a batch the item holds, or open a new one: found on a
//                 count, a patient's return, a booking error the other way
//   הורדה מהמלאי  deduct from one named batch, for one of the fixed OUT
//                 reasons (DEMO_INVENTORY_FIXES_PROMPT.md rule 4 / §6.4); the
//                 batch caps how much can be taken
//
// Either way the explanation is mandatory, because it is what the log row
// carries, and either way the movement is an adjustment — the consumption
// figures leave it out, so a correction never reads as demand. A count's own
// variance is recorded through a count, not here.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { REASONS_IN, REASONS_OUT } from '@/config';
import { fmtISO } from '@/lib/dates';
import { qtyText } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** Room for the key-value block plus the fields, and no more. */
const WIDTH = 680;

/** The batch select's value for "a batch this item does not hold yet". */
const NEW = '__new';

/**
 * The reasons stock may come in by hand. A receipt from a supplier is not one
 * of them — it has its own document, against an order or without one.
 */
const IN_REASONS = REASONS_IN.filter(
    (entry) => !['po_receipt', 'purchase_no_order'].includes(entry.id),
);

const props = defineProps({
    /** The stock row being corrected, or null while the dialog is closed. */
    item: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const inventory = useInventoryStore();
const uid = useId();

const dir = ref('out');
const reason = ref(REASONS_OUT[0].id);
const qty = ref('');
const batch = ref('');
const why = ref('');
const fresh = ref({ number: '', expiry: '', madeOn: '' });
const saving = ref(false);

const open = computed(() => Boolean(props.item));

const reasons = computed(() =>
    (dir.value === 'in' ? IN_REASONS : REASONS_OUT).map((entry) => ({
        value: entry.id,
        label: t(`reason.${entry.id}.name`),
    })),
);

/**
 * The batches a correction can touch. Going out: every batch still holding
 * something — expired and waste ones too, which are exactly what a write-off
 * is for. Coming in: every batch the item ever had, a spent one included —
 * stock found on a shelf belongs to the batch on its label — plus a new one.
 */
const batches = computed(() => {
    if (!props.item) {
        return [];
    }

    return dir.value === 'in'
        ? inventory.batchesOf(props.item.sku).filter((row) => !row.waste)
        : inventory.heldBatchesOf(props.item.sku);
});

const asked = computed(() => Number(qty.value));

const picked = computed(() =>
    batch.value && batch.value !== NEW
        ? inventory.batchById(batch.value)
        : null,
);

/** Going out, a batch gives no more than it holds. */
const overdraw = computed(
    () =>
        dir.value === 'out' &&
        Boolean(picked.value) &&
        asked.value > picked.value.remaining,
);

const valid = computed(
    () =>
        Boolean(props.item) &&
        qty.value !== '' &&
        asked.value > 0 &&
        Boolean(batch.value) &&
        !overdraw.value &&
        (batch.value !== NEW || Boolean(fresh.value.expiry)) &&
        Boolean(why.value.trim()) &&
        !saving.value,
);

function reset() {
    reason.value = (dir.value === 'in' ? IN_REASONS : REASONS_OUT)[0].id;
    batch.value = '';
    fresh.value = { number: '', expiry: '', madeOn: '' };
}

watch(
    () => props.item,
    (item) => {
        if (!item) {
            return;
        }

        dir.value = 'out';
        qty.value = '';
        why.value = '';
        reset();
    },
    { immediate: true },
);

watch(dir, reset);

function onQty(value) {
    // A quantity in kg or litres carries a decimal point — stripping anything
    // but digits turned 2.5 into 25 (DEMO_INVENTORY_FIXES_PROMPT.md §5.4.6).
    qty.value = String(value)
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');
}

function unitLabel() {
    return props.item ? t(`inventory.unit.${props.item.unit}`) : '';
}

/** An expired or waste batch says so in the list, so it is picked knowingly. */
function batchLabel(row) {
    const option = t('inventory.adjust.batchOption', {
        id: inventory.batchNo(row),
        left: qtyText(row.remaining, 3),
        expiry: row.expiry
            ? fmtISO(row.expiry)
            : t('inventory.batches.noExpiry'),
    });
    const flag = row.waste ? 'waste' : row.state === 'expired' ? 'expired' : '';

    return flag
        ? t('inventory.adjust.batchFlagged', {
              option,
              state: t(`batchState.${flag}`),
          })
        : option;
}

/** `1,200 → 1,450`: what the item's stock becomes. */
const after = computed(() => {
    if (!props.item || !(asked.value > 0)) {
        return '';
    }

    const next =
        dir.value === 'in'
            ? props.item.onHand + asked.value
            : props.item.onHand - asked.value;

    return `${qtyText(props.item.onHand, 3)} → ${qtyText(Math.max(0, next), 3)}`;
});

async function save() {
    if (!valid.value) {
        return;
    }

    const item = props.item;

    saving.value = true;

    try {
        const result =
            dir.value === 'in'
                ? await inventory.manualReceive({
                      sku: item.sku,
                      reason: reason.value,
                      qty: asked.value,
                      batch: batch.value === NEW ? '' : batch.value,
                      newBatch: batch.value === NEW ? fresh.value : null,
                      note: why.value,
                  })
                : await inventory.manualIssue({
                      sku: item.sku,
                      reason: reason.value,
                      qty: asked.value,
                      batch: batch.value,
                      note: why.value,
                  });

        emit('saved', { item, reason: reason.value, ...result });
        emit('close');
    } catch (error) {
        push({ title: String(error?.message || error), bad: true });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        :open="open"
        :title="
            t('inventory.adjust.title', { item: item ? loc(item.name) : '' })
        "
        :width="WIDTH"
        @close="emit('close')"
    >
        <template v-if="item">
            <AKeyValue
                :rows="[
                    [t('inventory.adjust.kv.sku'), item.sku],
                    [t('inventory.adjust.kv.onHand'), ''],
                    [t('inventory.adjust.kv.alloc'), ''],
                    [t('inventory.adjust.kv.batches'), ''],
                ]"
            >
                <template #value-0>
                    <span class="a-code a-tag">{{ item.sku }}</span>
                </template>
                <template #value-1>
                    <ANum>{{ qtyText(item.onHand, 3) }}</ANum> {{ unitLabel() }}
                </template>
                <template #value-2>
                    <ANum>{{ qtyText(item.alloc, 3) }}</ANum> {{ unitLabel() }}
                </template>
                <template #value-3>
                    <ANum>{{ inventory.heldBatchesOf(item.sku).length }}</ANum>
                </template>
            </AKeyValue>

            <div class="a-adj-form">
                <div>
                    <span class="a-lbl" :id="`${uid}-d`">
                        {{ t('inventory.adjust.dir') }}
                    </span>
                    <div
                        class="a-adj-dir"
                        role="radiogroup"
                        :aria-labelledby="`${uid}-d`"
                    >
                        <label class="a-checkrow">
                            <input v-model="dir" type="radio" value="in" />
                            <span>{{ t('inventory.adjust.dirIn') }}</span>
                        </label>
                        <label class="a-checkrow">
                            <input v-model="dir" type="radio" value="out" />
                            <span>{{ t('inventory.adjust.dirOut') }}</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="a-lbl" :for="`${uid}-r`">
                        {{ t('inventory.adjust.reason') }}
                        <span class="a-req">{{ t('labels.required') }}</span>
                    </label>
                    <select
                        :id="`${uid}-r`"
                        v-model="reason"
                        class="a-select a-w100"
                    >
                        <option
                            v-for="entry in reasons"
                            :key="entry.value"
                            :value="entry.value"
                        >
                            {{ entry.label }}
                        </option>
                    </select>
                    <div class="a-adj-hint">
                        {{ t(`reason.${reason}.hint`) }}
                    </div>
                </div>

                <div class="a-2col a-adj-2col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-q`">
                            {{
                                dir === 'in'
                                    ? t('inventory.adjust.qtyAdd')
                                    : t('inventory.adjust.qtyDeduct')
                            }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-q`"
                            class="a-w100"
                            inputmode="decimal"
                            :model-value="qty"
                            :placeholder="unitLabel()"
                            @update:model-value="onQty"
                        />
                        <div v-if="overdraw" class="a-adj-hint a-adj-bad">
                            {{
                                t('inventory.adjust.overdraw', {
                                    left: qtyText(picked.remaining, 3),
                                    unit: unitLabel(),
                                })
                            }}
                        </div>
                        <div v-else-if="after" class="a-adj-hint">
                            {{ t('inventory.adjust.after') }} ·
                            <span class="num">{{ after }}</span>
                        </div>
                    </div>

                    <div>
                        <label class="a-lbl" :for="`${uid}-b`">
                            {{ t('inventory.adjust.batch') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <select
                            :id="`${uid}-b`"
                            v-model="batch"
                            class="a-select a-w100"
                        >
                            <option value="">
                                {{ t('inventory.adjust.batchPick') }}
                            </option>
                            <option v-if="dir === 'in'" :value="NEW">
                                {{ t('inventory.adjust.batchNew') }}
                            </option>
                            <option
                                v-for="row in batches"
                                :key="row.id"
                                :value="row.id"
                            >
                                {{ batchLabel(row) }}
                            </option>
                        </select>
                    </div>
                </div>

                <div v-if="batch === NEW" class="a-adj-new">
                    <div>
                        <label class="a-lbl" :for="`${uid}-bn`">
                            {{ t('inventory.adjust.newNumber') }}
                        </label>
                        <AInput
                            :id="`${uid}-bn`"
                            v-model="fresh.number"
                            ltr
                            class="a-w100"
                        />
                        <div class="a-adj-hint">
                            {{ t('inventory.adjust.newNumberHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-bx`">
                            {{ t('inventory.batches.trace.expiry') }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-bx`"
                            v-model="fresh.expiry"
                            type="date"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-bm`">
                            {{ t('inventory.batches.trace.madeOn') }}
                        </label>
                        <AInput
                            :id="`${uid}-bm`"
                            v-model="fresh.madeOn"
                            type="date"
                            class="a-w100"
                        />
                    </div>
                </div>

                <div>
                    <label class="a-lbl" :for="`${uid}-w`">
                        {{ t('inventory.adjust.why') }}
                        <span class="a-req">{{ t('labels.required') }}</span>
                    </label>
                    <ATextarea
                        :id="`${uid}-w`"
                        v-model="why"
                        :rows="2"
                        :placeholder="
                            dir === 'in'
                                ? t('inventory.adjust.whyPhAdd')
                                : t('inventory.adjust.whyPhDeduct')
                        "
                    />
                    <div class="a-adj-hint">
                        {{ t('inventory.adjust.notConsumption') }}
                    </div>
                </div>
            </div>

            <div
                v-if="dir === 'out' && !batches.length"
                class="a-note a-note--warn a-adj-note"
            >
                {{ t('inventory.adjust.noBatches') }}
            </div>
        </template>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!valid" @click="save">
                {{
                    dir === 'in'
                        ? t('inventory.adjust.saveIn')
                        : t('inventory.adjust.save')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.a-adj-form {
    display: grid;
    gap: 16px;
    margin-top: 18px;
}

.a-adj-dir {
    display: flex;
    gap: 22px;
    flex-wrap: wrap;
    margin-top: 6px;
}

.a-adj-2col {
    gap: 16px;
}

.a-adj-new {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px 16px;
}

.a-adj-hint {
    margin-top: 5px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-adj-bad {
    color: var(--a-red);
    font-weight: 600;
}

.a-adj-note {
    margin-top: 16px;
}
</style>
