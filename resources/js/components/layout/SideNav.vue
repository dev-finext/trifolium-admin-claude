<script setup>
// The grouped navigation, built from NAV_GROUPS. Every label and heading is
// keyed by the id in config/nav.js — this file names no screen.
//
// The sidebar owns the collapse *preference*: it reads and writes localStorage
// and it listens for the Ctrl/Cmd+B shortcut, because the width being remembered
// is the sidebar's own business. It publishes the state through `v-model:collapsed`
// so AdminShell can narrow the grid column and TopBar can render the control that
// flips it.
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { NAV_GROUPS, NAV_STORAGE_KEY, NAV_TOGGLE_KEY } from '@/config';
import { isDemoData } from '@/data/source';
import { useDatasetStore } from '@/stores/dataset';

const collapsed = defineModel('collapsed', { type: Boolean, default: false });

const { t } = useI18n();
const dataset = useDatasetStore();

/** The groups this deployment shows — the development group only against the fixture. */
const groups = NAV_GROUPS.filter((group) => !group.devOnly || isDemoData);

/** The value localStorage holds when the sidebar is collapsed. */
const STORED_OFF = 'off';
const STORED_ON = 'on';

function readStored() {
    try {
        return localStorage.getItem(NAV_STORAGE_KEY) === STORED_OFF;
    } catch {
        // Private-mode browsers throw on localStorage access; default to open.
        return false;
    }
}

// Restored during setup rather than on mount, so the grid paints at its stored
// width instead of animating to it.
collapsed.value = readStored();

watch(collapsed, (off) => {
    try {
        localStorage.setItem(NAV_STORAGE_KEY, off ? STORED_OFF : STORED_ON);
    } catch {
        // Persistence is a convenience, never a requirement.
    }
});

function onKeydown(event) {
    if (!(event.metaKey || event.ctrlKey)) {
        return;
    }

    if (event.key.toLowerCase() !== NAV_TOGGLE_KEY) {
        return;
    }

    event.preventDefault();
    collapsed.value = !collapsed.value;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

/** The badge for one nav item, or null when that item carries no count. */
function countFor(id) {
    const count = dataset.navCounts[id];

    return count && count.n > 0 ? count : null;
}

/** Tooltip on a badge — the sentence that says what the number means. */
function countTitle(id) {
    const count = countFor(id);

    return count ? t(`shell.count.${id}`, count.params) : '';
}

/** Collapsed to an icon rail, the group name is the only context left. */
function itemTitle(groupId, itemId) {
    if (!collapsed.value) {
        return undefined;
    }

    return `${t(`nav.group.${groupId}`)} · ${t(`nav.item.${itemId}`)}`;
}
</script>

<template>
    <nav class="a-side" :aria-label="t('shell.landmark.nav')">
        <div class="a-side-head">
            <div class="a-logo"><AIcon name="leaf" :size="19" /></div>
            <div class="a-side-brand">
                <div class="a-brand-n">{{ t('nav.brand') }}</div>
                <div class="a-brand-s">{{ t('nav.brandSub') }}</div>
            </div>
        </div>

        <div class="a-side-scroll">
            <div
                v-for="group in groups"
                :key="group.id"
                class="a-navgroup"
                :class="{ 'is-sep': group.separated }"
            >
                <div class="a-navgroup-t">
                    {{ t(`nav.group.${group.id}`) }}
                    <V2Badge v-if="group.devOnly" id="v2-intro" size="sm" />
                </div>

                <RouterLink
                    v-for="item in group.items"
                    :key="item.id"
                    class="a-navitem"
                    active-class="is-on"
                    :class="{ 'is-soon': item.inDevelopment }"
                    :to="{ name: item.id }"
                    :title="itemTitle(group.id, item.id)"
                >
                    <AIcon :name="item.icon" :size="19" />
                    <span>{{ t(`nav.item.${item.id}`) }}</span>
                    <V2Badge v-if="item.v2" :id="item.v2" size="sm" />
                    <span v-if="item.inDevelopment" class="a-soon">
                        {{ t('nav.inDevelopment') }}
                    </span>
                    <span
                        v-if="countFor(item.id)"
                        class="a-count"
                        :class="{ 'is-alert': countFor(item.id).alert }"
                        :title="countTitle(item.id)"
                    >
                        {{ countFor(item.id).n }}
                    </span>
                </RouterLink>
            </div>
        </div>
    </nav>
</template>

<style scoped>
/* The two brand lines. Sized here rather than in admin.css because nothing else
   in the console uses them. */
.a-brand-n {
    font-weight: 700;
    font-size: 16.5px;
    letter-spacing: -0.01em;
}

.a-brand-s {
    font-size: 12.5px;
    color: #8ba184;
}

/* .a-navitem is authored for a button in admin.css. As a RouterLink it inherits
   the anchor underline on hover, which the nav must not have; its colours already
   win on specificity. */
.a-navitem {
    text-decoration: none;
}
</style>
