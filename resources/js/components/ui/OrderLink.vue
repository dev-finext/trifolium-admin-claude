<script setup>
// An order number that opens the order.
//
// One link for every place the console mentions an order — a table cell, a
// key-value row, an activity line — so they all read and behave the same. The
// number keeps its ANum typography and the colour of the text around it; a small
// grey arrow beside it points the way the page reads and says "this leads
// somewhere". The route is the order drawer over the list, so the reader lands
// on the order with the list still behind it.
//
// The click stops at the link by default: most of these cells sit in rows that
// have a click handler of their own, and the row must not fire as well.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocaleStore } from '@/stores/locale';

const props = defineProps({
    /** The order id, e.g. `TF-2640573`. */
    id: { type: String, required: true },
    /** Keep the click from reaching a row handler underneath. */
    stop: { type: Boolean, default: true },
    /** Query to carry along — the order list passes its own, so its filters
     *  are still there when the drawer closes. */
    query: { type: Object, default: null },
});

const { t } = useI18n();
const localeStore = useLocaleStore();

const to = computed(() => {
    const target = { name: 'order', params: { id: props.id } };

    return props.query ? { ...target, query: props.query } : target;
});

// The arrow points the way the page reads: leftwards in Hebrew, rightwards in
// English.
const arrow = computed(() =>
    localeStore.isRtl ? 'chevron_left' : 'chevron_right',
);

function onClick(event) {
    if (props.stop) {
        event.stopPropagation();
    }
}
</script>

<template>
    <RouterLink
        class="a-orderlink"
        :to="to"
        :title="t('actions.openOrder')"
        :aria-label="`${t('actions.openOrder')} ${id}`"
        @click="onClick"
    >
        <ANum>{{ id }}</ANum>
        <AIcon :name="arrow" :size="13" class="a-orderlink-arrow" />
    </RouterLink>
</template>

<style scoped>
/* The number reads like the text around it — the arrow is the affordance. */
.a-orderlink {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: inherit;
    font: inherit;
}

.a-orderlink:hover {
    color: inherit;
}

.a-orderlink-arrow {
    color: var(--a-ink-4);
    transition: color 0.15s;
}

.a-orderlink:hover .a-orderlink-arrow {
    color: var(--a-ink-2);
}
</style>
