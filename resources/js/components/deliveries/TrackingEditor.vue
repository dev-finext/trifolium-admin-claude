<script setup>
// The tracking-number field.
//
// None of the courier companies the pharmacy ships with exposes an API, so this
// number is read off the shipping label and typed in by hand. The field checks
// the shape, says so when the leading letter is not the letter of the company
// that was picked, and states plainly that nothing is looked up with the carrier.
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AInput from '@/components/ui/AInput.vue';
import { isTracking } from '@/stores/deliveries';

const props = defineProps({
    modelValue: { type: String, default: '' },
    /** Letter code of the courier this assignment is being saved against. */
    courierCode: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const uid = useId();

const value = computed(() => String(props.modelValue || '').trim());
const invalid = computed(() => value.value !== '' && !isTracking(value.value));

const mismatch = computed(() => {
    if (invalid.value || !value.value || !props.courierCode) {
        return false;
    }

    return value.value.charAt(0) !== props.courierCode;
});

// A label is printed in capitals; typing it in lower case is a keystroke, not a
// different number.
function onInput(next) {
    emit('update:modelValue', String(next).toUpperCase());
}
</script>

<template>
    <div>
        <label class="a-lbl" :for="`${uid}-track`">
            {{ t('deliveries.tracking.label') }}
        </label>
        <AInput
            :id="`${uid}-track`"
            ltr
            class="a-w100"
            :model-value="modelValue"
            @update:model-value="onInput"
        />
        <div v-if="invalid" class="a-inv">
            {{ t('deliveries.tracking.invalid') }}
        </div>
        <div v-else-if="mismatch" class="a-inv">
            {{
                t('deliveries.tracking.mismatch', {
                    found: value.charAt(0),
                    expected: courierCode,
                })
            }}
        </div>
        <div v-else class="a-hint">{{ t('deliveries.tracking.format') }}</div>
        <div class="a-note a-note--info manual">
            {{ t('deliveries.tracking.manual') }}
        </div>
    </div>
</template>

<style scoped>
.manual {
    margin-top: 14px;
}
</style>
