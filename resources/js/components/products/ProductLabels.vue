<script setup>
// A product's labels in a table cell. Three fit; the rest collapse into a
// counting chip that names them on hover.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import { useLocalized } from '@/composables/useLocalized';

/** How many label chips a cell shows before collapsing the remainder. */
const VISIBLE = 3;

const props = defineProps({
    /** Label ids carried by the product. */
    ids: { type: Array, default: () => [] },
    /** The whole label taxonomy, to resolve ids to names. */
    labels: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { loc } = useLocalized();

const nameOf = (id) => {
    const label = props.labels.find((row) => row.id === id);

    return label ? loc(label.name) : id;
};

const head = computed(() => props.ids.slice(0, VISIBLE));
const rest = computed(() => props.ids.slice(VISIBLE));

const restTitle = computed(() =>
    t('products.table.moreLabels', {
        n: rest.value.length,
        names: rest.value.map(nameOf).join(' · '),
    }),
);
</script>

<template>
    <span v-if="!ids.length" class="a-muted">—</span>
    <div v-else class="a-chipwrap">
        <AChip v-for="id in head" :key="id" tone="gray" size="sm" :dot="false">
            {{ nameOf(id) }}
        </AChip>
        <AChip v-if="rest.length" tone="teal" size="sm" :dot="false">
            <span :title="restTitle">+{{ rest.length }}</span>
        </AChip>
    </div>
</template>

<style scoped>
.a-muted {
    color: var(--a-ink-4);
}
</style>
