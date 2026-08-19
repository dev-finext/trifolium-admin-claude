<script setup>
// What the recipient will actually see.
//
// A template body is DATA: it is rendered verbatim, never through vue-i18n
// interpolation, or its `{{…}}` placeholders would be eaten before they reach
// the screen. The store splits the body into text, substituted values and
// placeholders it has no value for; the third kind stays visible on purpose, so
// an author can see which token is still waiting for a value at send time.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ABubble from '@/components/ui/ABubble.vue';
import { useMessagingStore } from '@/stores/messaging';

const props = defineProps({
    /** A `{ he, en }` body, or one language's text. */
    body: { type: [Object, String], default: '' },
    /** Substitution values; the store's preview values when omitted. */
    values: { type: Object, default: null },
    /** Channel and time line under the bubble. */
    meta: { type: String, default: '' },
});

const { t } = useI18n();
const messaging = useMessagingStore();

const segments = computed(() =>
    props.values
        ? messaging.previewSegments(props.body, props.values)
        : messaging.previewSegments(props.body),
);
</script>

<template>
    <ABubble :meta="meta">
        <span class="m-body">
            <template v-for="(segment, i) in segments" :key="i">
                <span
                    v-if="segment.kind === 'token'"
                    class="m-token num"
                    :title="t('messaging.editor.unresolved')"
                    >{{ segment.text }}</span
                >
                <template v-else>{{ segment.text }}</template>
            </template>
        </span>
    </ABubble>
</template>

<style scoped>
.m-body {
    white-space: pre-wrap;
}

/* A placeholder with no value reads as an unfinished field, not as body copy. */
.m-token {
    border-radius: 5px;
    background: var(--a-tint);
    padding: 1px 5px;
    color: var(--a-accent-2);
    font-size: 0.92em;
    font-weight: 600;
}
</style>
