<script setup>
// An amount of money. Always LTR, always the same symbol placement, whichever
// direction the page is in — the formatting rule lives in @/lib/money.
import { computed } from 'vue';

import { ils } from '@/lib/money';

const props = defineProps({
    value: { type: [Number, String], default: 0 },
    /** The headline amount on a card or a drawer header. */
    big: { type: Boolean, default: false },
});

// Whole shekels read as whole shekels; agorot appear only where they exist — a
// VAT line, a rounding difference, a partial refund.
const text = computed(() => {
    const amount = Number(props.value) || 0;

    return ils(amount, Number.isInteger(amount) ? 0 : 2);
});
</script>

<template>
    <span class="num a-money" :class="{ 'is-big': big }">{{ text }}</span>
</template>

<style scoped>
.a-money {
    font-weight: 600;
}

.a-money.is-big {
    font-size: 22px;
    font-weight: 700;
}
</style>
