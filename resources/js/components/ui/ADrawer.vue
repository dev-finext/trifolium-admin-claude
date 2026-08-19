<script setup>
// The side panel every "open this record" flow uses. It is teleported to the
// body so no ancestor's overflow or transform can clip it, and it locks the
// page behind it while it is open.
import { onUnmounted, watch } from 'vue';

import { useScrollLock } from '@/composables/useScrollLock';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    open: { type: Boolean, default: false },
    /** Widens the drawer to the whole viewport, for a record with a wide table. */
    full: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

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
