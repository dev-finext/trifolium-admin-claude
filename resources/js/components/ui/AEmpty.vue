<script setup>
// The state a list is in when it has nothing to show. It says what is missing
// and, through the `action` slot, offers the one thing that would change that.
import AIcon from '@/components/ui/AIcon.vue';

defineProps({
    icon: { type: String, default: 'inbox' },
    title: { type: String, default: '' },
    sub: { type: String, default: '' },
});
</script>

<template>
    <div class="a-empty">
        <AIcon :name="icon" :size="44" class="a-empty-ic" />
        <div v-if="title" class="t">{{ title }}</div>
        <div v-if="sub" class="s">{{ sub }}</div>
        <div v-if="$slots.action" class="a-empty-a">
            <slot name="action" />
        </div>
    </div>
</template>

<style scoped>
.a-empty-ic {
    color: var(--a-line-2);
}

.a-empty-a {
    margin-top: 18px;
}
</style>
