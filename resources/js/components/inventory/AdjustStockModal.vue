<script setup>
// A manual stock issue: deduct a quantity from one named batch, for one of the
// fixed OUT reasons (DEMO_INVENTORY_FIXES_PROMPT.md rule 4 / §6.4). The batch
// caps how much can be taken, and the explanation is mandatory because it is
// what the log row carries. A count's own variance is recorded through a
// count, not here.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { REASONS_OUT } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num, qtyText } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** Room for the key-value block plus the three fields, and no more. */
const WIDTH = 680;

const props = defineProps({
    /** The stock row being issued from, or null while the dialog is closed. */
    item: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const uid = useId();

const reason = ref(REASONS_OUT[0].id);
const qty = ref('');
const batch = ref('');
const why = ref('');

const open = computed(() => Boolean(props.item));

const reasons = computed(() =>
    REASONS_OUT.map((entry) => ({
        value: entry.id,
        label: t(`reason.${entry.id}.name`),
    })),
);

/**
 * Every batch still holding something — expired and waste ones too. Those
 * are exactly what a write-off is for, and FEFO's open list leaves them out,
 * so they could never leave stock. The same list the stock table counts.
 */
const batches = computed(() =>
    props.item ? inventory.heldBatchesOf(props.item.sku) : [],
);

const asked = computed(() => Number(qty.value));

const valid = computed(
    () =>
        Boolean(props.item) &&
        qty.value !== '' &&
        asked.value > 0 &&
        Boolean(batch.value) &&
        Boolean(why.value.trim()),
);

watch(
    () => props.item,
    (item) => {
        if (!item) {
            return;
        }

        reason.value = REASONS_OUT[0].id;
        qty.value = '';
        batch.value = '';
        why.value = '';
    },
    { immediate: true },
);

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

async function save() {
    if (!valid.value) {
        return;
    }

    const item = props.item;
    const result = await inventory.manualIssue({
        sku: item.sku,
        reason: reason.value,
        qty: asked.value,
        batch: batch.value,
        note: why.value,
    });

    emit('saved', { item, reason: reason.value, ...result });
    emit('close');
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
                    [t('inventory.adjust.kv.batches'), batches.length],
                ]"
            >
                <template #value-0>
                    <span class="a-code a-tag">{{ item.sku }}</span>
                </template>
                <template #value-1>
                    <ANum>{{ num(item.onHand) }}</ANum> {{ unitLabel() }}
                </template>
                <template #value-2>
                    <ANum>{{ num(item.alloc) }}</ANum> {{ unitLabel() }}
                </template>
                <template #value-3>
                    <ANum>{{ batches.length }}</ANum>
                </template>
            </AKeyValue>

            <div class="a-adj-form">
                <div>
                    <label class="a-lbl" :for="`${uid}-r`">
                        {{ t('inventory.adjust.reason') }}
                        <span class="a-req">{{ t('labels.required') }}</span>
                    </label>
                    <select
                        :id="`${uid}-r`"
                        class="a-select a-w100"
                        v-model="reason"
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
                            {{ t('inventory.adjust.qtyDeduct') }}
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

                <div>
                    <label class="a-lbl" :for="`${uid}-w`">
                        {{ t('inventory.adjust.why') }}
                        <span class="a-req">{{ t('labels.required') }}</span>
                    </label>
                    <ATextarea
                        :id="`${uid}-w`"
                        v-model="why"
                        :rows="2"
                        :placeholder="t('inventory.adjust.whyPhDeduct')"
                    />
                </div>
            </div>

            <div v-if="!batches.length" class="a-note a-note--warn a-adj-note">
                {{ t('inventory.adjust.noBatches') }}
            </div>
        </template>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!valid" @click="save">
                {{ t('inventory.adjust.save') }}
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

.a-adj-2col {
    gap: 16px;
}

.a-adj-hint {
    margin-top: 5px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-adj-note {
    margin-top: 16px;
}
</style>
