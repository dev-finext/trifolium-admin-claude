<script setup>
// Tab strip. The active tab belongs in the URL (`?tab=…` through useUrlState),
// not in a component's own state — a colleague opening a pasted link must land
// on the same tab.
//
// `label` arrives already translated: the caller knows which catalog its tabs
// come from.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    /** `[{ id, label, icon?, n? }]` — `n` is the count badge. */
    tabs: { type: Array, required: true },
    modelValue: { type: [String, Number], default: '' },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <div class="a-tabs" role="tablist">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="a-tab"
            :class="{ 'is-on': modelValue === tab.id }"
            :aria-selected="modelValue === tab.id"
            @click="emit('update:modelValue', tab.id)"
        >
            <AIcon v-if="tab.icon" :name="tab.icon" :size="16" />
            {{ tab.label }}
            <span v-if="tab.n != null" class="n">{{ tab.n }}</span>
        </button>
    </div>
</template>
