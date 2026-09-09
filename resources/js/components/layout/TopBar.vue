<script setup>
// The top bar: the sidebar toggle, global search, and the right-hand cluster —
// language switch, open exceptions, signed-in agent.
//
// The language switch comes first in that cluster, next to the search: it is a
// primary control of this console, not a setting buried in a menu.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import GlobalSearch from '@/components/layout/GlobalSearch.vue';
import LocaleToggle from '@/components/layout/LocaleToggle.vue';
import NotificationBell from '@/components/layout/NotificationBell.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useDatasetStore } from '@/stores/dataset';
import { useLocaleStore } from '@/stores/locale';
import { useV2Store } from '@/stores/v2';

const props = defineProps({
    /** Mirrors the sidebar's collapsed state; the button here flips it. */
    navCollapsed: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle-nav']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const localeStore = useLocaleStore();
const v2 = useV2Store();

// The chevron points the way the sidebar will move, which is mirrored with the
// writing direction: the sidebar sits on the right in Hebrew, on the left in
// English.
const toggleIcon = computed(() => {
    if (props.navCollapsed) {
        return localeStore.isRtl ? 'chevron_left' : 'chevron_right';
    }

    return localeStore.isRtl ? 'chevron_right' : 'chevron_left';
});

const toggleLabel = computed(() =>
    props.navCollapsed ? t('nav.expand') : t('nav.collapse'),
);

const meName = computed(() => (dataset.me ? loc(dataset.me.name) : ''));

/** First letter of each of the two name halves, in the active locale. */
const initials = computed(() =>
    meName.value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join(''),
);
</script>

<template>
    <header class="a-top" :aria-label="t('shell.landmark.top')">
        <button
            type="button"
            class="a-iconbtn a-navtoggle"
            :aria-pressed="navCollapsed"
            :aria-label="toggleLabel"
            :title="`${toggleLabel} (Ctrl+B)`"
            @click="emit('toggle-nav')"
        >
            <AIcon :name="toggleIcon" :size="20" />
        </button>

        <GlobalSearch />

        <div class="a-top-r">
            <LocaleToggle />
            <!-- Review aid, demo only: shows or hides every V2 marker at once. -->
            <button
                v-if="v2.available"
                type="button"
                class="a-v2toggle"
                :class="{ 'is-on': v2.shown }"
                :aria-pressed="v2.shown"
                :title="v2.shown ? t('shell.v2.hide') : t('shell.v2.show')"
                @click="v2.toggle()"
            >
                <span class="a-v2 is-static">{{ t('shell.v2.badge') }}</span>
                <span class="a-v2toggle-t">
                    {{ v2.shown ? t('shell.v2.on') : t('shell.v2.off') }}
                </span>
            </button>
            <NotificationBell />

            <div v-if="dataset.me" class="a-me">
                <div class="a-avatar" aria-hidden="true">{{ initials }}</div>
                <div class="a-me-c">
                    <div class="a-me-n">{{ meName }}</div>
                    <div class="a-me-r">{{ t('shell.me.role') }}</div>
                </div>
            </div>
        </div>
    </header>
</template>

<style scoped>
.a-me-c {
    line-height: 1.35;
}
</style>
