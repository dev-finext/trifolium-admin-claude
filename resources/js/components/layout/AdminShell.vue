<script setup>
// The two-column frame: navigation beside a column holding the top bar and the
// scrolling body.
//
// The collapse preference belongs to SideNav (it is the sidebar's own width, and
// the sidebar is what persists it); the shell holds the value because the grid
// column is the shell's, and hands it to TopBar, which renders the control that
// flips it.
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import SideNav from '@/components/layout/SideNav.vue';
import TopBar from '@/components/layout/TopBar.vue';

const { t } = useI18n();
const route = useRoute();

const navCollapsed = ref(false);
const body = ref(null);

// `.a-body` is the scroller, not the window, so the router's scrollBehavior does
// not reach it: a screen change starts at the top of the new screen. A change of
// query string — a filter, a tab, a selected row — deliberately does not scroll,
// because the reader is still on the same screen.
watch(
    () => route.path,
    () => {
        if (body.value) {
            body.value.scrollTop = 0;
        }
    },
);
</script>

<template>
    <div class="a-app" :class="{ 'is-nav-off': navCollapsed }">
        <SideNav v-model:collapsed="navCollapsed" />

        <div class="a-main">
            <TopBar
                :nav-collapsed="navCollapsed"
                @toggle-nav="navCollapsed = !navCollapsed"
            />

            <main
                ref="body"
                class="a-body"
                :aria-label="t('shell.landmark.main')"
            >
                <slot />
            </main>
        </div>
    </div>
</template>
