<script setup>
// A state light with its word next to it, for a table cell.
import { useI18n } from 'vue-i18n';

import ServiceLight from '@/components/system/ServiceLight.vue';

defineProps({
    state: { type: String, required: true },
});

const { t } = useI18n();
</script>

<template>
    <span class="a-svcst">
        <ServiceLight :state="state" />
        <span class="a-svcst-t" :class="`is-${state}`">
            {{ t(`integrations.state.${state}`) }}
        </span>
    </span>
</template>
