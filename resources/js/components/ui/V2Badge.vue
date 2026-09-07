<script setup>
// The "V2" marker.
//
// Sits beside anything that did not exist in the first version of the console —
// a screen, a card, a table, a field, a button — so a reviewer can tell the new
// from the old at a glance. With an `id` it is a link into the matching section of
// the development progress article, which says what was built, on the strength of
// which specification, and what is still open about it.
//
// Renders nothing when the markers are switched off, and never against a real API.
import { useI18n } from 'vue-i18n';

import { useV2Store } from '@/stores/v2';

defineProps({
    /** Section id in the progress article, e.g. `item-card`. Optional. */
    id: { type: String, default: '' },
    /** `sm` for inside table cells and chips. */
    size: { type: String, default: '' },
});

const { t } = useI18n();
const v2 = useV2Store();
</script>

<template>
    <RouterLink
        v-if="v2.shown && id"
        class="a-v2"
        :class="{ 'is-sm': size === 'sm' }"
        :to="{ name: 'devProgress', hash: `#${id}` }"
        :title="t('shell.v2.tip')"
        @click.stop
    >
        {{ t('shell.v2.badge') }}
    </RouterLink>
    <span
        v-else-if="v2.shown"
        class="a-v2"
        :class="{ 'is-sm': size === 'sm' }"
        :title="t('shell.v2.tipPlain')"
    >
        {{ t('shell.v2.badge') }}
    </span>
</template>
