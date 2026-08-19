<script setup>
// A product's picture, or the hatched placeholder that says it has none.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    /** `{ src, name }`, or null while the product carries no image. */
    img: { type: Object, default: null },
    size: { type: Number, default: 48 },
});

const { t } = useI18n();

const box = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
}));

// The glyph sits inside the tile rather than filling it.
const glyph = computed(() => Math.round(props.size * 0.42));
</script>

<template>
    <img v-if="img" class="a-thumb" :src="img.src" alt="" :style="box" />
    <span
        v-else
        class="a-thumb a-thumb--e"
        :style="box"
        :title="t('products.table.noImage')"
    >
        <AIcon name="image" :size="glyph" />
    </span>
</template>
