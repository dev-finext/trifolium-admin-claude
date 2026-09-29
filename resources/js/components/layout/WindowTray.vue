<script setup>
// V3 — מגש החלונות.
//
// Where minimised records wait. It sits beside the signed-in agent because that
// is the corner of a desktop application where the things that belong to *you*
// live — not to the screen you happen to be on, which is why a window parked on
// the purchasing screen is still here on the inventory screen.
//
// Up to three stand as chips, and the rest go behind a "+N" that opens the full
// list. Three is not a technical limit: it is how many fit in a top bar on a
// laptop next to a search field, and beyond three a row of chips stops being
// something you read at a glance and becomes something you scan.
//
// Clicking a chip navigates to the address it was holding and takes it off the
// tray — it is no longer minimised, it is open. Closing it again with the
// window control puts it back.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AIcon from '@/components/ui/AIcon.vue';
import { useWindowsStore } from '@/stores/windows';

const { t } = useI18n();
const router = useRouter();
const windows = useWindowsStore();

const open = ref(false);
const root = ref(null);

const chips = computed(() => windows.chips);
const overflow = computed(() => windows.overflow);

function restore(id) {
    // `resume` takes the window off the tray and, when it is a form, leaves it
    // where the screen that owns the editor will pick it up.
    const row = windows.resume(id);

    open.value = false;

    if (row) {
        router.push(row.path).catch(() => {
            // The address may no longer resolve — a record archived, a screen
            // renamed. The window is off the tray either way; leaving it there
            // would be a chip that never works.
        });
    }
}

function drop(id) {
    windows.drop(id);

    if (!windows.count) {
        open.value = false;
    }
}

function clearAll() {
    windows.clear();
    open.value = false;
}

/** A click anywhere else closes the list, the way every menu on a desktop does. */
function onDocumentDown(event) {
    if (open.value && root.value && !root.value.contains(event.target)) {
        open.value = false;
    }
}

function onKeydown(event) {
    if (event.key === 'Escape' && open.value) {
        open.value = false;
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocumentDown);
    window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentDown);
    window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <div v-if="windows.count" ref="root" class="a-tray">
        <button
            v-for="win in chips"
            :key="win.id"
            type="button"
            class="a-tray-chip"
            :class="{ 'is-draft': Boolean(win.form) }"
            :title="
                win.subtitle
                    ? `${win.title} · ${win.subtitle}`
                    : String(win.title)
            "
            @click="restore(win.id)"
        >
            <AIcon :name="win.icon" :size="15" />
            <span class="a-tray-chip-t">{{ win.title }}</span>
            <span
                class="a-tray-x"
                role="button"
                tabindex="-1"
                :aria-label="t('shell.windows.drop')"
                :title="t('shell.windows.drop')"
                @click.stop="drop(win.id)"
            >
                <AIcon name="x" :size="13" />
            </span>
        </button>

        <button
            v-if="overflow"
            type="button"
            class="a-tray-more"
            :aria-expanded="open"
            :title="t('shell.windows.all')"
            @click="open = !open"
        >
            +{{ overflow }}
        </button>

        <div v-if="open" class="a-tray-panel">
            <header class="a-tray-panel-h">
                <AIcon name="window" :size="16" />
                <span>{{ t('shell.windows.title') }}</span>
                <button type="button" class="a-tray-clear" @click="clearAll">
                    {{ t('shell.windows.clear') }}
                </button>
            </header>
            <ul class="a-tray-list">
                <li v-for="win in windows.list" :key="win.id">
                    <button
                        type="button"
                        class="a-tray-row"
                        :class="{ 'is-draft': Boolean(win.form) }"
                        @click="restore(win.id)"
                    >
                        <AIcon :name="win.icon" :size="16" />
                        <span class="a-tray-row-c">
                            <span class="a-tray-row-t">{{ win.title }}</span>
                            <span v-if="win.subtitle" class="a-tray-row-s">{{
                                win.subtitle
                            }}</span>
                        </span>
                        <span v-if="win.form" class="a-tray-draft">{{
                            t('shell.windows.draft')
                        }}</span>
                    </button>
                    <button
                        type="button"
                        class="a-tray-rowx"
                        :aria-label="t('shell.windows.drop')"
                        :title="t('shell.windows.drop')"
                        @click="drop(win.id)"
                    >
                        <AIcon name="x" :size="14" />
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>
