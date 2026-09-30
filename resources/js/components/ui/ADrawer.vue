<script setup>
// The side panel every "open this record" flow uses. It is teleported to the
// body so no ancestor's overflow or transform can clip it, and it locks the
// page behind it while it is open.
//
// V3 — a drawer that names itself gets a window bar: the record's name, and a
// control that parks it in the tray beside the signed-in agent. The bar is
// rendered here rather than in each of the thirteen drawers so that every
// window in the console has the same one, in the same place, with the same
// behaviour — which is the whole point of a window control.
//
// The address is read off the router at the moment the bar is clicked, not when
// the drawer opened: a drawer stays up while its screen's filters and tabs move
// underneath it, and what should come back is the screen as it is now.
import { computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import AIcon from '@/components/ui/AIcon.vue';
import { useScrollLock } from '@/composables/useScrollLock';
import { useWindowsStore } from '@/stores/windows';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    open: { type: Boolean, default: false },
    /** Widens the drawer to the whole viewport, for a record with a wide table. */
    full: { type: Boolean, default: false },
    /**
     * What this drawer is, so it can be minimised: `{ id, title, subtitle,
     * icon }`. Omitted — on a filter panel, or an editor holding a form — and
     * the window bar does not appear at all.
     */
    win: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const route = useRoute();
const windows = useWindowsStore();

const canMinimize = computed(() => Boolean(props.win?.id && props.win?.title));

function minimize() {
    if (!canMinimize.value) {
        return;
    }

    windows.minimize({
        id: props.win.id,
        title: props.win.title,
        subtitle: props.win.subtitle || '',
        icon: props.win.icon || 'file_text',
        path: route.fullPath,
    });

    emit('close');
}

useScrollLock(() => props.open);

// Escape closes the drawer — unless a modal is open on top of it. The modal owns
// the key while it is up, and closing it must not also close what it was opened
// from.
function onKeydown(event) {
    if (event.key !== 'Escape') {
        return;
    }

    if (document.querySelector('.a-modal')) {
        return;
    }

    emit('close');
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            window.addEventListener('keydown', onKeydown);
        } else {
            window.removeEventListener('keydown', onKeydown);
        }
    },
    { immediate: true },
);

onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
    <Teleport to="body">
        <template v-if="open">
            <div class="a-scrim" @click="emit('close')" />
            <aside
                v-bind="$attrs"
                class="a-drawer"
                :class="{ 'is-full': full }"
                role="dialog"
                aria-modal="true"
            >
                <div v-if="canMinimize" class="a-winbar">
                    <AIcon
                        :name="win.icon || 'file_text'"
                        :size="15"
                        class="a-winbar-i"
                    />
                    <span class="a-winbar-t">{{ win.title }}</span>
                    <span v-if="win.subtitle" class="a-winbar-s">{{
                        win.subtitle
                    }}</span>
                    <button
                        type="button"
                        class="a-winbar-b"
                        :title="t('shell.windows.minimizeHint')"
                        :aria-label="t('shell.windows.minimize')"
                        @click="minimize"
                    >
                        <AIcon name="minimize" :size="16" />
                        <span>{{ t('shell.windows.minimize') }}</span>
                    </button>
                </div>

                <div v-if="$slots.header" class="a-drawer-h">
                    <slot name="header" />
                </div>
                <div class="a-drawer-b">
                    <slot />
                </div>
            </aside>
        </template>
    </Teleport>
</template>
