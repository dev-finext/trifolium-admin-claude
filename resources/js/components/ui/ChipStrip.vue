<script setup>
// A row of filter chips that does not take the screen when there are forty of
// them.
//
// The item families are twenty-odd chips and the item groups are fifty; laid
// out flat they wrap to four rows and push the table off a laptop. Clipping
// them to a scrolling sliver was worse — a filter you cannot see is a filter
// nobody uses.
//
// So the strip shows one row and says how many chips are behind it. The count
// is the control: press it and the strip opens. Nothing is hidden silently,
// and the open state is remembered per strip for the session, because someone
// who opened it once is usually working that way.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    /** Distinguishes one strip's remembered state from another's. */
    id: { type: String, required: true },
});

const { t } = useI18n();

const strip = ref(null);
const open = ref(false);
const rows = ref(1);

const KEY = (id) => `trifolium:chipstrip:${id}`;

/** How many rows the chips would take if nothing held them back. */
function measure() {
    const el = strip.value;

    if (!el) {
        return;
    }

    const children = [...el.children].filter(
        (child) => child.offsetParent !== null,
    );

    if (!children.length) {
        rows.value = 1;

        return;
    }

    // A new row starts wherever a chip sits lower than the one before it.
    const tops = new Set(children.map((child) => Math.round(child.offsetTop)));

    rows.value = tops.size;
}

let observer = null;

onMounted(() => {
    try {
        open.value = sessionStorage.getItem(KEY(props.id)) === '1';
    } catch {
        // A browser that refuses storage simply starts collapsed.
    }

    measure();

    if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(measure);
        observer.observe(strip.value);
    }
});

onBeforeUnmount(() => observer?.disconnect());

watch(open, (next) => {
    try {
        sessionStorage.setItem(KEY(props.id), next ? '1' : '0');
    } catch {
        // Nothing to do: the strip still opens, it just will not be remembered.
    }
});

/** Only worth a control when there is something behind the first row. */
const overflowing = computed(() => rows.value > 1);
</script>

<template>
    <div class="chipstrip" :class="{ 'is-open': open || !overflowing }">
        <div ref="strip" class="chipstrip-row">
            <slot />
        </div>
        <button
            v-if="overflowing"
            type="button"
            class="chipstrip-more"
            :aria-expanded="open"
            @click="open = !open"
        >
            <AIcon :name="open ? 'x' : 'plus'" :size="13" />
            {{ open ? t('filters.chips.less') : t('filters.chips.more') }}
        </button>
    </div>
</template>

<style scoped>
.chipstrip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 8px 0 10px;
}

/* Collapsed, the row is exactly one line tall and the rest is out of the way.
   Open, it takes whatever it needs. */
.chipstrip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1 1 auto;
    min-width: 0;
    max-height: 30px;
    overflow: hidden;
}

.chipstrip.is-open .chipstrip-row {
    max-height: none;
    overflow: visible;
}

.chipstrip-more {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px dashed var(--a-line-2, var(--a-line));
    background: transparent;
    color: var(--a-ink-3);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
}

.chipstrip-more:hover {
    border-color: var(--a-accent);
    color: var(--a-accent-2);
}
</style>
