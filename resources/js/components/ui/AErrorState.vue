<script setup>
// What a screen shows when its data did not load.
//
// Deliberately generic: the component does not know why the load failed and does
// not guess. A caller that has a real, specific message passes it in `title` /
// `body`; otherwise the catalog's neutral wording is used.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    /** Defaults to `ui.loadFailed`. */
    title: { type: String, default: '' },
    /** Defaults to `ui.loadFailedHint`. */
    body: { type: String, default: '' },
});

const emit = defineEmits(['retry']);

const { t } = useI18n();

const heading = computed(() => props.title || t('ui.loadFailed'));
const detail = computed(() => props.body || t('ui.loadFailedHint'));
</script>

<template>
    <div class="a-empty">
        <AIcon name="alert" :size="44" class="a-error-ic" />
        <div class="t">{{ heading }}</div>
        <div class="s">{{ detail }}</div>
        <div class="a-error-a">
            <AButton kind="p" icon="refresh" @click="emit('retry')">
                {{ t('ui.retry') }}
            </AButton>
        </div>
    </div>
</template>

<style scoped>
.a-error-ic {
    color: var(--a-red);
}

.a-error-a {
    margin-top: 18px;
}
</style>
