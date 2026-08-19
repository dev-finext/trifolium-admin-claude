<script setup>
// The free-text box in front of a filtered table. `width` is the space the
// screen can spare for it — a receipt search that matches four fields needs more
// room than a batch number.
import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    modelValue: { type: String, default: '' },
    /** Doubles as the accessible name: it says exactly what is searched. */
    placeholder: { type: String, default: '' },
    width: { type: Number, default: 320 },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div
        class="a-search"
        :style="{ maxWidth: `${props.width}px`, flexBasis: `${props.width}px` }"
    >
        <span class="lead"><AIcon name="search" :size="17" /></span>
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
/* The bar's own height, not the top bar's taller one. */
.a-search input {
    height: 40px;
}
</style>
