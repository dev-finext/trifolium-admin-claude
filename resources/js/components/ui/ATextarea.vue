<script setup>
// A multi-line field: a reason, a note on an order, a message body.
defineProps({
    modelValue: { type: [String, Number], default: '' },
    rows: { type: [Number, String], default: 3 },
    ltr: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <textarea
        class="a-textarea"
        :class="{ 'a-ltr-input': ltr }"
        :rows="rows"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
    />
</template>
