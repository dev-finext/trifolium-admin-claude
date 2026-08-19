<script setup>
// A dropdown. Give it `options` for a plain list, or put `<option>` elements in
// the default slot when they need grouping or an empty first entry.
import { computed } from 'vue';

const props = defineProps({
    modelValue: { type: [String, Number], default: '' },
    /** `['a', 'b']` or `[{ value, label }]` — labels arrive translated. */
    options: { type: Array, default: () => [] },
    ltr: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const items = computed(() =>
    props.options.map((option) =>
        option !== null && typeof option === 'object'
            ? option
            : { value: option, label: option },
    ),
);
</script>

<template>
    <select
        class="a-select"
        :class="{ 'a-ltr-input': ltr }"
        :value="modelValue"
        @change="emit('update:modelValue', $event.target.value)"
    >
        <slot>
            <option v-for="item in items" :key="item.value" :value="item.value">
                {{ item.label }}
            </option>
        </slot>
    </select>
</template>
