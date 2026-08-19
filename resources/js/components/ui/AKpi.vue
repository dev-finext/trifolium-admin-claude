<script setup>
// A headline figure. One component instead of the same three divs on every
// screen, so the tiles line up and read the same way everywhere.
//
// `value` and `sub` also have slots, for a figure that is markup — money, a
// number with a unit, a chip next to a count.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    icon: { type: String, default: '' },
    label: { type: String, default: '' },
    value: { type: [String, Number], default: '' },
    sub: { type: String, default: '' },
    /** Steps the figure down where a tile has to hold a longer value. */
    small: { type: Boolean, default: false },
});
</script>

<template>
    <div class="a-kpi">
        <div class="k-l">
            <AIcon v-if="icon" :name="icon" :size="17" />
            {{ label }}
        </div>
        <div class="k-v" :class="{ 'is-small': small }">
            <slot name="value">{{ value }}</slot>
        </div>
        <div v-if="sub || $slots.sub" class="k-d">
            <slot name="sub">{{ sub }}</slot>
        </div>
    </div>
</template>

<style scoped>
.k-v.is-small {
    font-size: 24px;
}
</style>
