<script setup>
// Whether an order has been paid.
//
// This is a field of its own, not a step in the flow — in SAP it is
// `U_PayedSite`, and an order can be paid or unpaid at any point of its life.
// It used to be the first two statuses of the lifecycle, which is why every
// screen that shows a status shows this beside it now.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import { paymentStateOf } from '@/config';

const props = defineProps({
    order: { type: Object, required: true },
    size: { type: String, default: '' },
});

const { t } = useI18n();

const TONE = { unpaid: 'amber', paid: 'green', credit: 'purple' };

const state = computed(() => paymentStateOf(props.order));
</script>

<template>
    <AChip :tone="TONE[state]" :size="size" :dot="false">
        {{ t(`payment.${state}`) }}
    </AChip>
</template>
