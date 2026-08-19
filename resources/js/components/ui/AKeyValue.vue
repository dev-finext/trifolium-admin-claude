<script setup>
// The definition list used for every "details" block in the console.
//
//     <AKeyValue :rows="[[t('orders.field.placed'), order.placedAt]]" />
//
// A row whose value is markup (a chip, a link, money) overrides that one cell
// through the `value-<index>` slot; the default slot appends hand-written
// `<dt>`/`<dd>` pairs after the rows.
import { computed } from 'vue';

const props = defineProps({
    /** `[[key, value]]`. Falsy entries are dropped, so a caller can write
     *  `cond && [key, value]` inline instead of building the array first. */
    rows: { type: Array, default: () => [] },
});

const pairs = computed(() => props.rows.filter(Boolean));
</script>

<template>
    <dl class="a-kv">
        <template v-for="(pair, i) in pairs" :key="i">
            <dt>{{ pair[0] }}</dt>
            <dd>
                <slot :name="`value-${i}`" :row="pair">{{ pair[1] }}</slot>
            </dd>
        </template>
        <slot />
    </dl>
</template>
