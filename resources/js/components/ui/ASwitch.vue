<script setup>
// An on/off control for a setting that takes effect immediately. Where a change
// needs confirming, pair it with ConfirmDialog rather than toggling first.
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    /** Accessible name. Falls back to a generic one, but a real label is better. */
    label: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
</script>

<template>
    <button
        type="button"
        class="a-switch"
        :class="{ on: modelValue }"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="label || t('ui.toggle')"
        @click="emit('update:modelValue', !props.modelValue)"
    >
        <i />
    </button>
</template>
