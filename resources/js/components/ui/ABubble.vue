<script setup>
// A WhatsApp-style preview of a message: what the recipient will actually see,
// rendered the same way wherever a template is previewed or a sent message is
// read back.
defineProps({
    /** Timestamp / delivery line under the bubble. */
    meta: { type: String, default: '' },
});
</script>

<template>
    <div class="a-bubble">
        <div class="a-bubble-b"><slot /></div>
        <div v-if="meta || $slots.meta" class="a-bubble-m">
            <slot name="meta">{{ meta }}</slot>
        </div>
    </div>
</template>
