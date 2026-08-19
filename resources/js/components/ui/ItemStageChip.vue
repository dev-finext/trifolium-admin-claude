<script setup>
// One item's stage inside an order. Items are tracked individually — an order's
// own status is the lowest stage among its items — so this chip appears wherever
// a line is listed, not only on the order header.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import { ITEM_STAGE } from '@/config';

const props = defineProps({
    stage: { type: String, required: true },
    size: { type: String, default: '' },
});

const { t } = useI18n();

const meta = computed(() => ITEM_STAGE[props.stage] || null);
const tone = computed(() => meta.value?.tone || 'gray');
const label = computed(() =>
    meta.value ? t(`itemStage.${props.stage}`) : props.stage,
);
</script>

<template>
    <AChip :tone="tone" :size="size">{{ label }}</AChip>
</template>
