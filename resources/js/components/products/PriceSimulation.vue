<script setup>
// Read-only: what the net price the agent typed turns into by the time a
// practitioner sees it.
//
// Every figure comes from priceParts() in lib/money — the VAT rate and the
// rounding rule are stated once in config/settings.js and this panel only
// renders them. Nothing here re-does that arithmetic.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { ils, pct, priceParts } from '@/lib/money';

const props = defineProps({
    /** The net price as typed — a string mid-edit, a number once parsed. */
    net: { type: [String, Number], default: '' },
});

const { t } = useI18n();

const parts = computed(() => priceParts(props.net));

/** `18%` for a whole rate, `17.5%` for one that needs the decimal. */
const rate = computed(() => {
    const percent = Math.round(parts.value.rate * 1000) / 10;

    return pct(percent, Number.isInteger(percent) ? 0 : 1);
});
</script>

<template>
    <div class="a-sim" aria-live="polite">
        <div class="a-sim-t">{{ t('products.sim.title') }}</div>
        <div class="a-sim-r">
            <span>{{ t('products.sim.net') }}</span>
            <b class="num">{{ ils(parts.net) }}</b>
        </div>
        <div class="a-sim-r">
            <span>{{ t('products.sim.vat', { rate }) }}</span>
            <b class="num">{{ ils(parts.vat) }}</b>
        </div>
        <div class="a-sim-r">
            <span>{{ t('products.sim.gross') }}</span>
            <b class="num">{{ ils(parts.gross) }}</b>
        </div>
        <div class="a-sim-r is-main">
            <span>{{ t('products.sim.display') }}</span>
            <b class="num">{{ ils(parts.display, 0) }}</b>
        </div>
        <div class="a-sim-r">
            <span>{{ t('products.sim.roundUp') }}</span>
            <b class="num">{{ ils(parts.roundUp) }}</b>
        </div>
        <div class="a-sim-n">{{ t('products.sim.note') }}</div>
    </div>
</template>
