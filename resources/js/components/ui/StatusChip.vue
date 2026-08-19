<script setup>
// An order's status, rendered from the status model — the tone comes from
// @/config/statuses and the words from the locale catalog, so no screen decides
// what "בהקפה" looks like.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import { ORDER_STATUS } from '@/config';

const props = defineProps({
    status: { type: String, required: true },
    size: { type: String, default: '' },
});

const { t } = useI18n();

const meta = computed(() => ORDER_STATUS[props.status] || null);
const tone = computed(() => meta.value?.tone || 'gray');
// An id the status model does not know is shown as-is rather than as a missing
// translation key: a bad id should be obvious, not invisible.
const label = computed(() =>
    meta.value ? t(`status.${props.status}`) : props.status,
);
</script>

<template>
    <AChip :tone="tone" :size="size">{{ label }}</AChip>
</template>
