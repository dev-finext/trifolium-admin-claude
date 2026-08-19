<script setup>
// An operator plus a value — "greater than 400", "fewer than 3".
//
// It replaces fixed bands (under ₪150 / ₪150–300 / over ₪300), which can only
// answer the questions someone anticipated. An empty value means the filter is
// off, so clearing the box is the same gesture as removing the filter.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ASelect from '@/components/ui/ASelect.vue';
import { NUM_OPS } from '@/lib/facets';

const props = defineProps({
    /** `{ op, v }` — `v` as a string, empty when the filter is off. */
    modelValue: { type: Object, default: () => ({ op: 'gt', v: '' }) },
    /** Unit shown as the input's placeholder, already translated. */
    unit: { type: String, default: '' },
    /** Accessible name for the pair, already translated. */
    name: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const op = computed(() => props.modelValue?.op || 'gt');
const value = computed(() => props.modelValue?.v ?? '');

const opOptions = computed(() =>
    NUM_OPS.map((id) => ({ value: id, label: t(`ui.numOp.${id}`) })),
);

function setOp(next) {
    emit('update:modelValue', { op: next, v: value.value });
}

function setValue(event) {
    emit('update:modelValue', { op: op.value, v: event.target.value });
}
</script>

<template>
    <div class="nf">
        <ASelect
            :model-value="op"
            :options="opOptions"
            :aria-label="t('ui.numOp.label', { name })"
            @update:model-value="setOp"
        />
        <input
            class="a-input nf-val"
            type="number"
            inputmode="numeric"
            :value="value"
            :placeholder="unit"
            :aria-label="name"
            @input="setValue"
        />
    </div>
</template>

<style scoped>
.nf {
    display: flex;
    gap: 6px;
    align-items: center;
}

.nf :deep(select) {
    min-width: 0;
    flex: 0 0 auto;
    height: 36px;
    font-size: 14px;
}

.nf-val {
    flex: 1;
    min-width: 0;
    height: 36px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    direction: ltr;
    text-align: start;
}
</style>
