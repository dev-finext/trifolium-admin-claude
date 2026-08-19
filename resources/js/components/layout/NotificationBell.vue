<script setup>
// Open exceptions.
//
// The badge is always the number of rows in the list — there is no separate
// counter to drift out of step with it, and an empty list means an empty panel
// rather than a zero badge. Every row routes to the screen that resolves it,
// with the filter already applied.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useDatasetStore } from '@/stores/dataset';

const { t, te } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const dataset = useDatasetStore();

const open = ref(false);

const rows = computed(() => dataset.openExceptions);

function title(row) {
    return t(`shell.exception.${row.id}.title`, row.params);
}

/**
 * The second line: the records behind the row when it lists them, otherwise the
 * sentence in the catalog. Names are record content, so they resolve through
 * `loc()` in the active locale.
 */
function detail(row) {
    if (row.names?.length) {
        return row.names
            .map((parts) => parts.map((part) => loc(part)).join(' · '))
            .join(' · ');
    }

    const key = `shell.exception.${row.id}.sub`;

    return te(key) ? t(key, row.params) : '';
}

function go(row) {
    router.push(row.to);
    open.value = false;
}

function onKeydown(event) {
    if (event.key === 'Escape') {
        open.value = false;
    }
}

// The listener exists only while the panel is open, so Escape elsewhere in the
// console stays free for whatever has focus.
watch(open, (isOpen) => {
    if (isOpen) {
        window.addEventListener('keydown', onKeydown);

        return;
    }

    window.removeEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
    <div class="a-notifwrap">
        <button
            type="button"
            class="a-iconbtn"
            :aria-label="t('shell.notifications.label', { n: rows.length })"
            :aria-expanded="open"
            @click="open = !open"
        >
            <AIcon name="bell" :size="20" />
            <span v-if="rows.length" class="bdg">{{ rows.length }}</span>
        </button>

        <template v-if="open">
            <div class="a-notif-scrim" @click="open = false" />
            <div class="a-card a-notif">
                <div class="a-card-h a-notif-h">
                    <h3>{{ t('shell.notifications.title') }}</h3>
                </div>

                <div v-if="!rows.length" class="a-notif-empty">
                    {{ t('shell.notifications.empty') }}
                </div>

                <button
                    v-for="row in rows"
                    :key="row.id"
                    type="button"
                    class="a-notif-row"
                    @click="go(row)"
                >
                    <AIcon :name="row.icon" :size="19" class="a-notif-ic" />
                    <span>
                        <span class="a-notif-t">{{ title(row) }}</span>
                        <span v-if="detail(row)" class="a-notif-s">
                            {{ detail(row) }}
                        </span>
                    </span>
                </button>
            </div>
        </template>
    </div>
</template>

<style scoped>
.a-notifwrap {
    position: relative;
}

/* Catches the next click anywhere else and closes the panel. */
.a-notif-scrim {
    position: fixed;
    inset: 0;
    z-index: 39;
}

.a-notif-h {
    padding: 14px 18px;
}

.a-notif-h h3 {
    font-size: 16px;
}

.a-notif-empty {
    padding: 26px 18px;
    color: var(--a-ink-4);
    text-align: center;
}

.a-notif-ic {
    margin-top: 2px;
    color: var(--a-accent);
}
</style>
