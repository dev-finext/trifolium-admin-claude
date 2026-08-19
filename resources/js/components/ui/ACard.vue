<script setup>
// A titled panel. `pad` off is for a card whose body is a table or a list that
// draws its own edges.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    pad: { type: Boolean, default: true },
});
</script>

<template>
    <section class="a-card">
        <header v-if="title || $slots.right" class="a-card-h">
            <AIcon v-if="icon" :name="icon" :size="19" class="a-card-ic" />
            <h3 v-if="title">{{ title }}</h3>
            <div v-if="$slots.right" class="a-card-h-r">
                <slot name="right" />
            </div>
        </header>
        <div :class="{ 'a-card-b': pad }">
            <slot />
        </div>
    </section>
</template>

<style scoped>
.a-card-ic {
    color: var(--a-accent);
}
</style>
