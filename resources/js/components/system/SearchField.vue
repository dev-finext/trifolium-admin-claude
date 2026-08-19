<script setup>
// The search box at the head of this area's filter bars: the ported `.a-search`
// field with its leading magnifier. The counting, the clear button and the rest
// of the bar belong to FilterBar.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    /** Accessible name; falls back to the placeholder. */
    label: { type: String, default: '' },
    width: { type: Number, default: 320 },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-search a-sysq" :style="{ width: `${width}px` }">
        <span class="lead"><AIcon name="search" :size="18" /></span>
        <input
            type="search"
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="label || placeholder"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>

<style scoped>
/* `.a-search` grows to fill its row; inside a filter bar it holds its width. */
.a-sysq {
    flex: none;
    max-width: 100%;
}

.a-sysq input {
    height: 44px;
}
</style>
