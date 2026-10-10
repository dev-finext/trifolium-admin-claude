<script setup>
// A centred dialog. Modals sit above drawers: a modal opened from inside a
// drawer takes Escape first (its listener runs in the capture phase and stops
// there), so closing it leaves the drawer open.
//
// V3 — an editor that names itself can be minimised, like any other window, and
// the control sits next to the close button because that is the window-control
// corner of a dialog. The difference from a record window is that a form has
// something to keep: `win.form()` is called at the moment of the click, not
// when the modal opened, so what is parked is the typing as it stands.
//
// The header is tinted for a draft. A window holding unsaved work and a window
// holding a record you were reading are not the same thing to come back to, and
// the tray says so too.
import { computed, onBeforeUnmount, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute } from 'vue-router';
import AIcon from '@/components/ui/AIcon.vue';
import { useScrollLock } from '@/composables/useScrollLock';
import { useToast } from '@/composables/useToast';
import { useWindowsStore } from '@/stores/windows';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** Card width in px (a string passes through as authored). */
    width: { type: [Number, String], default: null },
    /**
     * What this editor is, so it can be minimised with its typing:
     * `{ id, title, subtitle, icon, form }`, where `form` is a function
     * returning `{ view, data, stamp }`. Omitted, and no control appears.
     */
    win: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const route = useRoute();
const windows = useWindowsStore();
const { push } = useToast();

const canMinimize = computed(() => Boolean(props.win?.id && props.win?.title));

/**
 * Whether the header is tinted.
 *
 * Only a window with typing to keep — `win.form` — is a draft. A modal that
 * holds a saved record and is merely minimisable is not one, and tinting it
 * would say the opposite of what the tray says about the same window.
 */
const isDraft = computed(() => Boolean(canMinimize.value && props.win?.form));

function minimize() {
    if (!canMinimize.value) {
        return;
    }

    windows.minimize({
        id: props.win.id,
        title: props.win.title,
        subtitle: props.win.subtitle || '',
        icon: props.win.icon || 'edit',
        // Read now, not when the modal opened: what is parked is the typing as
        // it stands at the click.
        form: props.win.form ? props.win.form() : null,
        path: route.fullPath,
    });

    // A form that vanishes is a form somebody thinks they have lost. It says
    // where the typing went and how to get it back, once.
    push({
        title: t('shell.windows.savedToast'),
        body: t('shell.windows.savedToastBody'),
    });

    emit('close');
}

// A form that is already on the tray keeps its place when it closes — by the ×,
// by the scrim, by Escape, or because it saved. What must not survive is an
// older copy of the typing, so the tray's copy is brought up to date on the way
// out. A form that was never parked is not added here: parking is an act of its
// own, and closing a window is not parking it.
onBeforeUnmount(() => {
    if (canMinimize.value && props.win.form && windows.has(props.win.id)) {
        windows.refresh(props.win.id, props.win.form());
    }
});

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
                    <header
                        class="a-card-h a-modal-h"
                        :class="{ 'is-draft': isDraft }"
                    >
                        <h3>{{ title }}</h3>
                        <button
                            v-if="canMinimize"
                            type="button"
                            class="a-btn a-btn--sm a-modal-min"
                            :title="t('shell.windows.minimizeFormHint')"
                            @click="minimize"
                        >
                            <AIcon name="minimize" :size="16" />
                            <span>{{ t('shell.windows.minimizeForm') }}</span>
                        </button>
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
