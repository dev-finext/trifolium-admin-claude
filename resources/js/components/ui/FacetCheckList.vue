<script setup>
// A multi-select checkbox list where every option carries the number of rows it
// would return, counted against the other active filters.
//
// The count is the point. Without it a reader ticks boxes and hopes; with it the
// list says what each choice is worth before the click, and an option that would
// return nothing is dimmed instead of silently emptying the table.
//
// Selected options are kept at the top by the caller's ordering, so the current
// choice never scrolls out of reach in a long list.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';

/** Above this many options the list gets its own search box. */
const SEARCH_FROM = 8;

const props = defineProps({
    /** `[{ value, n, selected }]` — straight from `facetsOf()`. */
    facets: { type: Array, default: () => [] },
    /** `(value) => string` — already-translated option text. */
    label: { type: Function, required: true },
    /** Accessible name for the group, already translated. */
    name: { type: String, default: '' },
});

const emit = defineEmits(['toggle', 'all', 'clear']);

const { t } = useI18n();
const term = ref('');

const shown = computed(() => {
    const needle = term.value.trim().toLowerCase();

    if (!needle) {
        return props.facets;
    }

    return props.facets.filter((facet) =>
        String(props.label(facet.value)).toLowerCase().includes(needle),
    );
});

const searchable = computed(() => props.facets.length >= SEARCH_FROM);

const anySelected = computed(() =>
    props.facets.some((facet) => facet.selected),
);

/** Options worth offering a "select all" over — the ones that return rows. */
const selectable = computed(() =>
    shown.value.filter((facet) => facet.n > 0).map((facet) => facet.value),
);
</script>

<template>
    <div class="fc">
        <input
            v-if="searchable"
            v-model="term"
            type="search"
            class="a-input fc-search"
            :placeholder="t('ui.facet.search')"
            :aria-label="t('ui.facet.searchIn', { name })"
        />

        <div class="fc-list" role="group" :aria-label="name">
            <label
                v-for="facet in shown"
                :key="String(facet.value)"
                class="fc-opt"
                :class="{ 'is-zero': facet.n === 0 && !facet.selected }"
            >
                <input
                    type="checkbox"
                    class="a-check"
                    :checked="facet.selected"
                    @change="emit('toggle', facet.value)"
                />
                <span class="fc-lbl">{{ label(facet.value) }}</span>
                <span class="fc-n num">{{ facet.n }}</span>
            </label>

            <p v-if="!shown.length" class="fc-none">
                {{ t('ui.facet.noMatch') }}
            </p>
        </div>

        <div v-if="shown.length > 1 || anySelected" class="fc-foot">
            <AButton
                sm
                kind="ghost"
                :disabled="!selectable.length"
                @click="emit('all', selectable)"
            >
                {{ t('ui.facet.selectAll') }}
            </AButton>
            <AButton
                sm
                kind="ghost"
                :disabled="!anySelected"
                @click="emit('clear')"
            >
                {{ t('ui.facet.clear') }}
            </AButton>
        </div>
    </div>
</template>

<style scoped>
.fc {
    display: grid;
    gap: 6px;
}

.fc-search {
    height: 34px;
    font-size: 14px;
    min-width: 0;
    width: 100%;
}

.fc-list {
    display: grid;
    gap: 1px;
    max-height: 232px;
    overflow-y: auto;
}

.fc-opt {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 8px;
    border-radius: 7px;
    font-size: 14.5px;
    color: var(--a-ink-2);
    cursor: pointer;
}

.fc-opt:hover {
    background: var(--a-sunk);
}

.fc-opt:focus-within {
    outline: 2px solid var(--a-accent);
    outline-offset: -2px;
}

/* An option that would return nothing stays clickable — it may already be
   selected — but reads as the dead end it is. */
.fc-opt.is-zero {
    opacity: 0.45;
}

.fc-lbl {
    flex: 1;
    min-width: 0;
}

.fc-n {
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.fc-none {
    margin: 0;
    padding: 10px 8px;
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.fc-foot {
    display: flex;
    gap: 4px;
    border-top: 1px solid var(--a-line);
    padding-top: 5px;
}
</style>
