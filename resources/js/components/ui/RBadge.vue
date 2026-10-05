<script setup>
// The "R" marker — ready in production.
//
// It sits beside the screens that are already live in the pharmacy's real
// system, so that anyone walking through this console can tell at a glance
// which parts they are reviewing and which parts they are already using. The
// letter is deliberately the only thing on it; what it stands for is in the
// tooltip, because a pill that explains itself in the navigation is a pill that
// pushes the navigation around.
//
// It replaces the old V2 / V3 version pills, which marked which round of work a
// thing came from. That was a question about our process. This is a question
// about their system, which is the one worth answering on screen.
//
// Never against a real API: this is a review aid for the demo.
import { useI18n } from 'vue-i18n';

import { isDemoData } from '@/data/source';

defineProps({
    /** `sm` for inside table cells and chips. */
    size: { type: String, default: '' },
});

const { t } = useI18n();
</script>

<template>
    <span
        v-if="isDemoData"
        class="a-r"
        :class="{ 'is-sm': size === 'sm' }"
        :title="t('shell.ready.tip')"
        :aria-label="t('shell.ready.tip')"
    >
        {{ t('shell.ready.badge') }}
    </span>
</template>
