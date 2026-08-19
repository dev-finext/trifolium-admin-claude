<script setup>
// The console's button. `kind` picks the weight — primary for the action a
// screen wants you to take, danger for the one it wants you to think about,
// ghost for the ones that only exist next to something else.
//
// `type="button"` by default so a button inside a form never submits it by
// accident; pass `type="submit"` where that is the intent.
import { computed } from 'vue';

import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    /** `'p'` (primary) | `'danger'` | `'ghost'` — omit for the plain button. */
    kind: { type: String, default: '' },
    sm: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
});

const KIND_CLASS = {
    p: 'a-btn--p',
    danger: 'a-btn--danger',
    ghost: 'a-btn--ghost',
};

const kindClass = computed(() => KIND_CLASS[props.kind] || '');
</script>

<template>
    <button
        type="button"
        class="a-btn"
        :class="[kindClass, { 'a-btn--sm': sm }]"
        :disabled="disabled"
    >
        <AIcon v-if="icon" :name="icon" :size="sm ? 15 : 17" />
        <slot />
    </button>
</template>
