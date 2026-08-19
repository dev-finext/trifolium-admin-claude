<script setup>
// The health board: a column header, then one block per external system.
//
// It renders exactly what the data layer reports and offers no way to re-check
// anything, because a check is a server-side job and this screen has no endpoint
// to ask. That is stated once, above the board, rather than implied by a button
// that could never work.
import { useI18n } from 'vue-i18n';

import ServiceGroup from '@/components/system/ServiceGroup.vue';
import ACard from '@/components/ui/ACard.vue';

defineProps({
    /** Groups from groupServices(), already filtered by the screen. */
    groups: { type: Array, default: () => [] },
    states: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
</script>

<template>
    <ACard :pad="false">
        <div class="a-svc a-svc--head">
            <div>{{ t('integrations.table.service') }}</div>
            <div>{{ t('integrations.table.state') }}</div>
            <div>{{ t('integrations.table.latency') }}</div>
            <div>{{ t('integrations.table.lastCheck') }}</div>
            <div>{{ t('integrations.table.uptime') }}</div>
        </div>

        <ServiceGroup
            v-for="group in groups"
            :key="group.key"
            :group="group"
            :states="states"
        />
    </ACard>
</template>
