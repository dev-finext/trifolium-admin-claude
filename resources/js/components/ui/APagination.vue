<script setup>
// How a table behaves when the list is longer than a screen.
//
// The demo fixture is small, so this looks like ceremony here — it is not. Every
// list in the real system is thousands of rows, and this is the contract for
// that: the page and the page size travel in the URL beside the filter, so a
// link restores exactly what its sender was looking at, and the server gets the
// same two parameters it will need.
//
// Reading order is the document's: in Hebrew "previous" sits on the right.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ANum from '@/components/ui/ANum.vue';
import { num } from '@/lib/money';

const props = defineProps({
    /** Rows behind the pager, after filtering. */
    total: { type: Number, default: 0 },
    /** 1-based. */
    page: { type: Number, default: 1 },
    size: { type: Number, default: 50 },
    /** Page sizes offered. */
    sizes: { type: Array, default: () => [50, 100, 200] },
});

const emit = defineEmits(['update:page', 'update:size']);

const { t } = useI18n();

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
const current = computed(() => Math.min(Math.max(1, props.page), pages.value));
const first = computed(() =>
    props.total ? (current.value - 1) * props.size + 1 : 0,
);
const last = computed(() => Math.min(current.value * props.size, props.total));

function go(page) {
    emit('update:page', Math.min(Math.max(1, page), pages.value));
}

function setSize(event) {
    // A bigger page keeps the first row of the current one in view.
    const size = Number(event.target.value);
    const anchor = first.value;

    emit('update:size', size);
    emit('update:page', Math.max(1, Math.ceil(anchor / size)));
}
</script>

<template>
    <div class="a-pager">
        <span class="a-pager-t">
            {{ t('ui.page.showing') }}
            <ANum>{{ num(first) }}–{{ num(last) }}</ANum>
            {{ t('ui.page.of') }}
            <ANum>{{ num(total) }}</ANum>
        </span>

        <label class="a-pager-size">
            {{ t('ui.page.size') }}
            <select
                class="a-select a-pager-sel"
                :value="size"
                @change="setSize"
            >
                <option v-for="one in sizes" :key="one" :value="one">
                    {{ one }}
                </option>
            </select>
        </label>

        <span class="a-pager-nav a-push">
            <button
                type="button"
                class="a-pager-b"
                :disabled="current <= 1"
                :aria-label="t('ui.page.prev')"
                @click="go(current - 1)"
            >
                ‹
            </button>
            <span class="a-pager-n">
                <ANum>{{ current }} / {{ pages }}</ANum>
            </span>
            <button
                type="button"
                class="a-pager-b"
                :disabled="current >= pages"
                :aria-label="t('ui.page.next')"
                @click="go(current + 1)"
            >
                ›
            </button>
        </span>
    </div>
</template>

<style scoped>
.a-pager {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 11px 18px;
    border-top: 1px solid var(--a-line);
    background: var(--a-surface);
    font-size: 13.5px;
    color: var(--a-ink-3);
    border-end-start-radius: var(--a-r);
    border-end-end-radius: var(--a-r);
}

.a-pager-t {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.a-pager-size {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}

.a-pager-sel {
    padding: 3px 8px;
    font-size: 13.5px;
    width: auto;
}

.a-pager-nav {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

/* The arrows are glyphs, not direction: the browser mirrors the row in RTL, so
   "‹" always sits on the side the reader came from. */
.a-pager-b {
    width: 30px;
    height: 30px;
    border: 1px solid var(--a-line-2);
    border-radius: 7px;
    background: var(--a-surface);
    color: var(--a-ink);
    font: inherit;
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
}

.a-pager-b:hover:not(:disabled) {
    background: var(--a-tint);
    border-color: var(--a-accent);
}

.a-pager-b:disabled {
    opacity: 0.4;
    cursor: default;
}

.a-pager-n {
    min-width: 62px;
    text-align: center;
}
</style>
