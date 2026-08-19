<script setup>
// The free-text field inside a FilterBar. The placeholder names the fields it
// searches, and doubles as the accessible name — a filter bar has no room for a
// visible label, so the two must not diverge.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-search">
        <span class="lead">
            <AIcon name="search" :size="17" />
        </span>
        <input
            type="search"
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="placeholder"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>
