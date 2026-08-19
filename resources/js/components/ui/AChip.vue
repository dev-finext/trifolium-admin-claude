<script setup>
// The chip is the console's status vocabulary. Everything that reads as a state
// — an order status, an item stage, an exception, who pays — is a chip in one of
// the shared tones, so the same colour always means the same kind of thing.
import { computed } from 'vue';

const props = defineProps({
    /** A tone from `TONES` in @/config/settings. */
    tone: { type: String, default: 'gray' },
    /** `'sm'` | `'lg'` — anything else is the default size. */
    size: { type: String, default: '' },
    dot: { type: Boolean, default: true },
});

const sizeClass = computed(() => {
    if (props.size === 'lg') {
        return 'a-chip--lg';
    }

    if (props.size === 'sm') {
        return 'a-chip--sm';
    }

    return '';
});
</script>

<template>
    <span class="a-chip" :class="[`c-${tone}`, sizeClass]">
        <i v-if="dot" class="a-dot" />
        <slot />
    </span>
</template>
