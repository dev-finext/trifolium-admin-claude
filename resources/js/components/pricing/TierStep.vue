<script setup>
// One numbered step heading in the group editor. The number is layout, not
// state — every step is always visible and editable.
defineProps({
    n: { type: [String, Number], required: true },
    title: { type: String, default: '' },
    sub: { type: String, default: '' },
});
</script>

<template>
    <div class="tp-step">
        <span class="tp-stepnum">{{ n }}</span>
        <div>
            <div class="tp-step-t">{{ title }}</div>
            <div v-if="sub" class="tp-step-s">{{ sub }}</div>
        </div>
        <span v-if="$slots.right" class="a-push tp-step-r">
            <slot name="right" />
        </span>
    </div>
</template>

<style scoped>
.tp-step-r {
    display: flex;
    align-items: center;
}
</style>
