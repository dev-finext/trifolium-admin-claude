<script setup>
// The free-text box that sits at the head of a filter bar.
//
// It is the `.a-search` field from the design system, sized to the content it
// searches — the shared primitives have no search box of their own yet, so this
// wrapper keeps the four content screens looking like one screen.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    modelValue: { type: String, default: '' },
    /** Also the accessible name: it says what can be searched. */
    placeholder: { type: String, default: '' },
    /** Field width, any CSS length. */
    width: { type: String, default: '320px' },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-search is-fixed" :style="{ width }">
        <span class="lead"><AIcon name="search" :size="18" /></span>
        <input
            type="search"
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="placeholder"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>

<style scoped>
/* A filter bar lays its controls out in a row: this one keeps the width it was
   given instead of absorbing the leftover space. */
.a-search.is-fixed {
    flex: none;
    max-width: 100%;
}

.a-search input {
    height: 44px;
}
</style>
