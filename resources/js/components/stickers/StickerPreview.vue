<script setup>
// One label, rendered from its template and data at a chosen scale. The markup
// is the same the print run uses, so what is on screen is what comes out.
import { computed } from 'vue';

import { useStickerData } from '@/composables/useStickerData';

/** CSS pixels per millimetre. */
const MM = 96 / 25.4;

const props = defineProps({
    template: { type: Object, required: true },
    data: { type: Object, default: () => ({}) },
    scale: { type: Number, default: 2 },
});

const { stickerHtml } = useStickerData();

const html = computed(() => stickerHtml(props.template, props.data));

const box = computed(() => ({
    width: `${props.template.size.w * MM * props.scale}px`,
    height: `${props.template.size.h * MM * props.scale}px`,
}));
</script>

<template>
    <div class="sp" :style="box">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
            class="sp-in"
            :style="{ transform: `scale(${scale})` }"
            v-html="html"
        />
    </div>
</template>

<style scoped>
.sp {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--a-line-2);
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
    flex: none;
}

.sp-in {
    position: absolute;
    top: 0;
    right: 0;
    transform-origin: top right;
}
</style>
