<script setup>
// A centred dialog. Modals sit above drawers: a modal opened from inside a
// drawer takes Escape first (its listener runs in the capture phase and stops
// there), so closing it leaves the drawer open.
import { computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import { useScrollLock } from '@/composables/useScrollLock';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** Card width in px (a string passes through as authored). */
    width: { type: [Number, String], default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();

useScrollLock(() => props.open);

const cardStyle = computed(() => {
    if (!props.width) {
        return null;
    }

    const w =
        typeof props.width === 'number' ? `${props.width}px` : props.width;

    return { width: `min(${w}, 100%)` };
});

function onKeydown(event) {
    if (event.key !== 'Escape') {
        return;
    }

    event.stopPropagation();
    emit('close');
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            window.addEventListener('keydown', onKeydown, true);
        } else {
            window.removeEventListener('keydown', onKeydown, true);
        }
    },
    { immediate: true },
);

onUnmounted(() => window.removeEventListener('keydown', onKeydown, true));
</script>

<template>
    <Teleport to="body">
        <template v-if="open">
            <div class="a-scrim a-scrim--modal" @click="emit('close')" />
            <div class="a-modal" @click.self="emit('close')">
                <div
                    v-bind="$attrs"
                    class="a-modal-card"
                    :style="cardStyle"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="title"
                >
                    <header class="a-card-h a-modal-h">
                        <h3>{{ title }}</h3>
                        <button
                            type="button"
                            class="a-btn a-btn--ghost a-btn--sm a-modal-x"
                            :aria-label="t('ui.close')"
                            @click="emit('close')"
                        >
                            <AIcon name="x" :size="18" />
                        </button>
                    </header>
                    <div class="a-modal-b">
                        <slot />
                    </div>
                    <footer v-if="$slots.footer" class="a-modal-f">
                        <slot name="footer" />
                    </footer>
                </div>
            </div>
        </template>
    </Teleport>
</template>
