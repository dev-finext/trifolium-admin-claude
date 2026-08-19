<script setup>
// A KPI tile that is also the filter switch for the rows it counts: click
// "12 awaiting payment" and the table below shows those twelve. Every V2 table
// filters this way, which is why the behaviour lives here and not in a screen.
import AKpi from '@/components/ui/AKpi.vue';

defineProps({
    icon: { type: String, default: '' },
    label: { type: String, default: '' },
    value: { type: [String, Number], default: '' },
    sub: { type: String, default: '' },
    small: { type: Boolean, default: false },
    /** True while this tile's filter is the one in force. */
    active: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);
</script>

<template>
    <div
        class="a-filterkpi"
        :class="{ 'is-on': active }"
        role="button"
        tabindex="0"
        :aria-pressed="active"
        @click="emit('click')"
        @keydown.enter.prevent="emit('click')"
        @keydown.space.prevent="emit('click')"
    >
        <AKpi
            :icon="icon"
            :label="label"
            :value="value"
            :sub="sub"
            :small="small"
        >
            <template v-if="$slots.value" #value>
                <slot name="value" />
            </template>
            <template v-if="$slots.sub" #sub>
                <slot name="sub" />
            </template>
        </AKpi>
    </div>
</template>

<style scoped>
.a-filterkpi {
    cursor: pointer;
    border-radius: 14px;
    transition: box-shadow 0.12s;
}

.a-filterkpi.is-on {
    box-shadow: 0 0 0 2px var(--a-accent);
}
</style>
