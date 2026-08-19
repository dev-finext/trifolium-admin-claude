<script setup>
// The free-text field inside a filter bar: the shared input plus the leading
// magnifier the design puts on every search box.
//
// The placeholder doubles as the accessible name, so a caller passes one already
// translated string and the field is labelled without a visible label.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    modelValue: { type: String, default: '' },
    /** Already translated: what may be typed here. */
    placeholder: { type: String, default: '' },
    /** Field width, in px. */
    width: { type: Number, default: 300 },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-search f-search" :style="{ width: `${width}px` }">
        <span class="lead"><AIcon name="search" :size="18" /></span>
        <input
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="placeholder"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>

<style scoped>
.f-search {
    flex: none;
    max-width: 100%;
}

.f-search input {
    height: 44px;
}
</style>
