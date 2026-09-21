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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useV2Store } from '@/stores/v2';

const props = defineProps({
    /** Section id in the progress article, e.g. `item-card`. Optional. */
    id: { type: String, default: '' },
    /** `sm` for inside table cells and chips. */
    size: { type: String, default: '' },
    /** Which round of work this marks — '2' or '3'. */
    v: { type: String, default: '2' },
});

const { t } = useI18n();
const v2 = useV2Store();

/** The literal on the pill, and the tooltip that says what it means. */
const label = computed(() => `V${props.v}`);
const tip = computed(() =>
    t(props.id ? 'shell.v2.tip' : 'shell.v2.tipPlain', { v: props.v }),
);
</script>

<template>
    <RouterLink
        v-if="v2.shown && id"
        class="a-v2"
        :class="{ 'is-sm': size === 'sm' }"
        :to="{ name: 'devProgress', hash: `#${id}` }"
        :title="tip"
        @click.stop
    >
        {{ label }}
    </RouterLink>
    <span
        v-else-if="v2.shown"
        class="a-v2"
        :class="{ 'is-sm': size === 'sm' }"
        :title="tip"
    >
        {{ label }}
    </span>
</template>
