<script setup>
// The heading block every screen opens with: breadcrumbs, title, one line of
// context, and the screen's own actions.
//
// Callers pass already-translated strings — the component names no screen and so
// holds no copy of its own.
import { computed } from 'vue';

import AIcon from '@/components/ui/AIcon.vue';
import { useLocaleStore } from '@/stores/locale';

defineProps({
    /** Trail of crumbs, outermost first. The last one is the current screen. */
    crumbs: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    sub: { type: String, default: '' },
});

const localeStore = useLocaleStore();

// The separator points the way the trail reads: leftwards in Hebrew, rightwards
// in English.
const separator = computed(() =>
    localeStore.isRtl ? 'chevron_left' : 'chevron_right',
);
</script>

<template>
    <div class="a-pagehead">
        <div class="grow">
            <div v-if="crumbs.length" class="a-crumbs">
                <template v-for="(crumb, i) in crumbs" :key="i">
                    <AIcon v-if="i > 0" :name="separator" :size="14" />
                    <span :class="{ 'is-last': i === crumbs.length - 1 }">
                        {{ crumb }}
                    </span>
                </template>
            </div>

            <h1 class="a-h1">{{ title }}<slot name="badge" /></h1>
            <div v-if="sub" class="a-sub">{{ sub }}</div>
        </div>

        <div v-if="$slots.actions" class="a-pagehead-a">
            <slot name="actions" />
        </div>
    </div>
</template>
