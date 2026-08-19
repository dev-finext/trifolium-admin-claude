<script setup>
// The date filter that sits above a list. Every count downstream is scoped to
// it — the status tiles on a screen count what is inside the range, never the
// whole table — so it is placed first and reports the resulting count in `note`.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { DATE_PRESET_IDS, emptyRange, presetRange } from '@/lib/dateRange';

const props = defineProps({
    /** `{ preset, from, to }` — the preset ids come from DATE_PRESET_IDS. */
    modelValue: {
        type: Object,
        default: () => ({ preset: 'all', from: '', to: '' }),
    },
    /** What the range currently yields, e.g. "42 orders in range". */
    note: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const range = computed(() => props.modelValue || {});
const hasDates = computed(() => Boolean(range.value.from || range.value.to));

function set(patch) {
    emit('update:modelValue', { ...range.value, ...patch });
}

function pick(id) {
    set({ preset: id, ...presetRange(id) });
}

function clear() {
    set({ preset: 'all', ...emptyRange() });
}
</script>

<template>
    <div class="a-daterange">
        <span class="a-daterange-l">
            <AIcon name="clock" :size="18" />
            {{ t('ui.dateRange') }}
        </span>
        <div class="a-seg">
            <button
                v-for="id in DATE_PRESET_IDS"
                :key="id"
                type="button"
                class="a-seg-b"
                :class="{ 'is-on': range.preset === id }"
                @click="pick(id)"
            >
                {{ t(`ui.datePreset.${id}`) }}
            </button>
        </div>
        <div class="a-daterange-in">
            <input
                class="a-input a-daterange-d"
                type="date"
                :value="range.from"
                :max="range.to || undefined"
                :aria-label="t('ui.from')"
                @change="set({ preset: 'custom', from: $event.target.value })"
            />
            <span class="a-daterange-sep" aria-hidden="true">&ndash;</span>
            <input
                class="a-input a-daterange-d"
                type="date"
                :value="range.to"
                :min="range.from || undefined"
                :aria-label="t('ui.to')"
                @change="set({ preset: 'custom', to: $event.target.value })"
            />
            <AButton v-if="hasDates" sm kind="ghost" icon="x" @click="clear">
                {{ t('ui.clear') }}
            </AButton>
        </div>
        <span v-if="note || $slots.note" class="a-count-txt a-push">
            <slot name="note">{{ note }}</slot>
        </span>
    </div>
</template>

<style scoped>
.a-daterange-in {
    display: flex;
    align-items: center;
    gap: 8px;
}

.a-daterange-d {
    width: 168px;
}

.a-daterange-sep {
    color: var(--a-ink-4);
}
</style>
