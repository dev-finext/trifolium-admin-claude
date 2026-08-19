<script setup>
// The system log's filter bar: a free-text box and three closed lists — who
// acted, what they did, and how it reached the system. The action and source
// lists carry a count each, scoped to the rows inside the current date range, so
// the reader sees how much each choice narrows the log before making it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/system/SearchField.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { LOG_ACTION_IDS, LOG_SOURCE_IDS } from '@/config';
import { num } from '@/lib/money';

const props = defineProps({
    /** `{ q, actor, action, source }`, straight from the URL state. */
    filters: { type: Object, required: true },
    /** Distinct actors the log has rows for: `[{ id, name }]`. */
    actors: { type: Array, default: () => [] },
    /** `{ action: { id: n }, source: { id: n } }`, scoped to the date range. */
    counts: { type: Object, default: () => ({ action: {}, source: {} }) },
    shown: { type: Number, default: 0 },
    dirty: { type: Boolean, default: false },
});

const emit = defineEmits(['update:filters', 'clear']);

const { t } = useI18n();
const { loc } = useLocalized();

const withCount = (label, n) => `${label} (${num(n || 0)})`;

const actorOptions = computed(() => [
    { value: '', label: t('log.filter.actorAll') },
    ...props.actors.map((actor) => ({
        value: actor.id,
        label: loc(actor.name),
    })),
]);

const actionOptions = computed(() => [
    { value: '', label: t('log.filter.actionAll') },
    ...LOG_ACTION_IDS.map((id) => ({
        value: id,
        label: withCount(t(`logAction.${id}`), props.counts.action[id]),
    })),
]);

const sourceOptions = computed(() => [
    { value: '', label: t('log.filter.sourceAll') },
    ...LOG_SOURCE_IDS.map((id) => ({
        value: id,
        label: withCount(t(`logSource.${id}`), props.counts.source[id]),
    })),
]);

function set(key, value) {
    emit('update:filters', { [key]: value });
}
</script>

<template>
    <FilterBar
        :count="shown"
        :label="t('log.filter.label')"
        :dirty="dirty"
        @clear="emit('clear')"
    >
        <SearchField
            :model-value="filters.q"
            :placeholder="t('log.filter.search')"
            :label="t('log.filter.searchLabel')"
            :width="280"
            @update:model-value="set('q', $event)"
        />
        <ASelect
            :model-value="filters.actor"
            :options="actorOptions"
            :aria-label="t('log.filter.actor')"
            @update:model-value="set('actor', $event)"
        />
        <ASelect
            :model-value="filters.action"
            :options="actionOptions"
            :aria-label="t('log.filter.action')"
            @update:model-value="set('action', $event)"
        />
        <ASelect
            :model-value="filters.source"
            :options="sourceOptions"
            :aria-label="t('log.filter.source')"
            @update:model-value="set('source', $event)"
        />
    </FilterBar>
</template>
