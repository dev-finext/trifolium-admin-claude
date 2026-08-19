<script setup>
// One stock adjustment, three reasons — and the distinction between them is the
// whole point of this dialog:
//
//   count  SETS the quantity to what was physically found and records the
//          variance. A shortfall comes out of the batches themselves, nearest
//          expiry first, so item and batch quantities never drift apart.
//   damage
//   reject DEDUCT a quantity from one named batch. A rejection also blocks that
//          batch from compounding, whatever is left in it.
//
// The written explanation is mandatory because it is what the log row carries.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BatchPickPanel from '@/components/inventory/BatchPickPanel.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ADJUST_REASON, ADJUST_REASONS } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

/** Room for the key-value block plus the three fields, and no more. */
const WIDTH = 680;

const props = defineProps({
    /** The stock row being adjusted, or null while the dialog is closed. */
    item: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();
const uid = useId();

const reason = ref(ADJUST_REASONS[0].id);
const qty = ref('');
const batch = ref('');
const why = ref('');

const open = computed(() => Boolean(props.item));
const rule = computed(() => ADJUST_REASON[reason.value]);
const isSet = computed(() => rule.value.mode === 'set');

const reasons = computed(() =>
    ADJUST_REASONS.map((entry) => ({
        value: entry.id,
        label: t(`adjustReason.${entry.id}.name`),
    })),
);

const batches = computed(() =>
    props.item ? inventory.openBatchesOf(props.item.sku) : [],
);

const asked = computed(() => Number(qty.value));
const diff = computed(() => {
    if (!props.item || qty.value === '') {
        return 0;
    }

    return isSet.value ? asked.value - props.item.onHand : -asked.value;
});

const valid = computed(
    () =>
        Boolean(props.item) &&
        qty.value !== '' &&
        asked.value >= 0 &&
        Boolean(why.value.trim()) &&
        (isSet.value || (asked.value > 0 && Boolean(batch.value))),
);

watch(
    () => props.item,
    (item) => {
        if (!item) {
            return;
        }

        reason.value = ADJUST_REASONS[0].id;
        qty.value = String(item.onHand);
        batch.value = '';
        why.value = '';
    },
    { immediate: true },
);

/** Switching to a count pre-fills what the books say; the other two start empty. */
function onReason(value) {
    reason.value = value;
    qty.value =
        ADJUST_REASON[value].mode === 'set' && props.item
            ? String(props.item.onHand)
            : '';
}

function onQty(value) {
    qty.value = String(value).replace(/\D/g, '');
}

function unitLabel() {
    return props.item ? t(`inventory.unit.${props.item.unit}`) : '';
}

function batchLabel(row) {
    return t('inventory.adjust.batchOption', {
        id: row.id,
        left: num(row.remaining),
        expiry: fmtISO(row.expiry),
    });
}

async function save() {
    if (!valid.value) {
        return;
    }

    const item = props.item;
    const result = await inventory.adjustStock({
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
                        :value="reason"
                        @change="onReason($event.target.value)"
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
                        {{ t(`adjustReason.${reason}.hint`) }}
                    </div>
                </div>

                <div class="a-2col a-adj-2col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-q`">
                            {{
                                isSet
                                    ? t('inventory.adjust.qtySet')
                                    : t('inventory.adjust.qtyDeduct')
                            }}
                            <span class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-q`"
                            class="a-w100"
                            inputmode="numeric"
                            :model-value="qty"
                            :placeholder="unitLabel()"
                            @update:model-value="onQty"
                        />
                    </div>

                    <div v-if="!isSet">
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

                    <div v-else>
                        <span class="a-lbl">
                            {{ t('inventory.adjust.diff') }}
                        </span>
                        <div
                            class="a-input a-w100 a-adj-diff"
                            :class="{
                                'is-down': diff < 0,
                                'is-up': diff > 0,
                            }"
                        >
                            <span class="num">
                                {{ diff > 0 ? '+' : '' }}{{ num(diff) }}
                            </span>
                            <span class="a-adj-diff-u">{{ unitLabel() }}</span>
                        </div>
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
                            isSet
                                ? t('inventory.adjust.whyPhCount')
                                : t('inventory.adjust.whyPhDeduct')
                        "
                    />
                </div>
            </div>

            <div
                v-if="!isSet && !batches.length"
                class="a-note a-note--warn a-adj-note"
            >
                {{ t('inventory.adjust.noBatches') }}
            </div>

            <div v-if="isSet && diff < 0" class="a-adj-note">
                <div class="a-note a-note--warn">
                    {{
                        batches.length
                            ? t('inventory.adjust.shortfall', {
                                  qty: num(Math.abs(diff)),
                                  unit: unitLabel(),
                              })
                            : t('inventory.adjust.shortfallNone')
                    }}
                </div>
                <BatchPickPanel
                    v-if="batches.length"
                    class="a-adj-plan"
                    :sku="item.sku"
                    :qty="Math.abs(diff)"
                    :unit="item.unit"
                />
            </div>

            <div
                v-if="isSet && diff > 0"
                class="a-note a-note--info a-adj-note"
            >
                {{
                    batches.length
                        ? t('inventory.adjust.surplus', {
                              qty: num(diff),
                              unit: unitLabel(),
                              batch: batches[0].id,
                          })
                        : t('inventory.adjust.surplusNone')
                }}
            </div>

            <div
                v-if="reason === 'reject'"
                class="a-note a-note--danger a-adj-note"
            >
                {{ t('inventory.adjust.rejectNote') }}
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

.a-adj-diff {
    display: flex;
    align-items: center;
    font-weight: 700;
    color: var(--a-ink-4);
}

.a-adj-diff.is-down {
    color: var(--a-red);
}

.a-adj-diff.is-up {
    color: var(--a-accent);
}

.a-adj-diff-u {
    margin-inline-start: 6px;
    font-weight: 400;
}

.a-adj-note {
    margin-top: 16px;
}

.a-adj-plan {
    margin-top: 12px;
}
</style>
