<script setup>
// A text field. Everything else — placeholder, id, inputmode, min/max — passes
// straight through to the input, so this wrapper only owns the class and the
// v-model.
//
// `ltr` is for content that is written left to right inside an RTL page: an
// order number, a phone number, an email, a batch code.
defineProps({
    modelValue: { type: [String, Number], default: '' },
    type: { type: String, default: 'text' },
    ltr: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <input
        class="a-input"
        :class="{ 'a-ltr-input': ltr }"
        :type="type"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
    />
</template>
