<script setup>
// Every icon in the console. The glyph geometry lives in icons.js; this
// component owns the wrapper, so stroke weight, caps and joins are identical
// everywhere and a screen only names the icon it wants.
//
// An unknown name renders nothing rather than an empty box — a missing glyph
// must never push a layout around.
import { computed } from 'vue';

import { AD_ICONS } from '@/components/ui/icons';

const props = defineProps({
    name: { type: String, required: true },
    size: { type: [Number, String], default: 18 },
    stroke: { type: [Number, String], default: 1.6 },
});

const glyph = computed(() => AD_ICONS[props.name] || '');
</script>

<template>
    <svg
        v-if="glyph"
        class="a-ico"
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="stroke"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        v-html="glyph"
    />
</template>

<style scoped>
/* An icon never shrinks inside a flex row — the label wraps instead. */
.a-ico {
    flex-shrink: 0;
}
</style>
