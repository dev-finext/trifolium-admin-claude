<script setup>
// The `.a-search` field, written once for this screen. Five filter bars and two
// pickers here search something, and they all have to carry the same lead icon,
// the same focus ring and the same height.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    /** Accessible name — every search box on this screen searches something else. */
    label: { type: String, default: '' },
    /** The input's id, for a visible `<label for>` next to the field. */
    inputId: { type: String, default: undefined },
    /** `bar` sits in a filter bar at a fixed width; `wide` fills its container. */
    variant: { type: String, default: 'bar' },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-search" :class="variant === 'wide' ? 'a-w100' : 'is-bar'">
        <span class="lead"><AIcon name="search" :size="18" /></span>
        <input
            :id="inputId"
            type="search"
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="label"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>

<style scoped>
/* A filter bar holds several controls on one line, so the search box takes a
   fixed share of it rather than all the room it can get. */
.a-search.is-bar {
    flex: none;
    width: 320px;
    max-width: 100%;
}
</style>
