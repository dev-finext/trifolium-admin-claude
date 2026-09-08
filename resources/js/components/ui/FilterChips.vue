<script setup>
// What the filter is doing right now, above the table, one chip per chosen
// value — and every chip removes itself.
//
// Without this the only sign that a list is filtered is a number beside a
// button, which is how people end up staring at an empty table wondering where
// their rows went. The chips make the filter visible where the rows are.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import { isActive } from '@/lib/facets';
import { num } from '@/lib/money';

const props = defineProps({
    /** The screen's filter spec — see composables/useListFilters.js. */
    spec: { type: Object, required: true },
    /** The live filter state. */
    filters: { type: Object, required: true },
    /** Rows behind the filter, for fields whose labels are record content. */
    rows: { type: Array, default: () => [] },
});

const emit = defineEmits(['remove', 'clear']);

const { t } = useI18n();

/** A word unit reads with a space before it; ₪ and % do not. */
function withUnit(value, unit) {
    if (!unit) {
        return value;
    }

    return /^\p{L}/u.test(unit) ? `${value} ${unit}` : `${value}${unit}`;
}

const OPS = { gt: '>', lt: '<', eq: '=' };

function optionLabel(field, value) {
    if (typeof field.optionLabel === 'function') {
        return field.optionLabel(value, props.rows);
    }

    return field.prefix ? t(`${field.prefix}.${value}`) : String(value);
}

/** One chip per chosen value; a numeric field is one chip for its whole test. */
const chips = computed(() => {
    const out = [];

    (props.spec.fields || []).forEach((field) => {
        const selection = props.filters[field.key];

        if (!isActive(field, selection)) {
            return;
        }

        const name = t(`${props.spec.ns}.filter.field.${field.key}`);

        if (field.kind === 'num') {
            out.push({
                id: field.key,
                key: field.key,
                value: null,
                text: `${name} ${OPS[selection.op] || '>'} ${withUnit(
                    num(Number(selection.v)),
                    (props.spec.units || {})[field.key],
                )}`,
            });

            return;
        }

        selection.forEach((value) => {
            out.push({
                id: `${field.key}:${value}`,
                key: field.key,
                value,
                text: `${name}: ${optionLabel(field, value)}`,
            });
        });
    });

    return out;
});
</script>

<template>
    <div
        v-if="chips.length"
        class="fc"
        role="group"
        :aria-label="t('filters.chips.label')"
    >
        <button
            v-for="chip in chips"
            :key="chip.id"
            type="button"
            class="fc-chip"
            :aria-label="t('filters.chips.remove', { name: chip.text })"
            @click="emit('remove', chip)"
        >
            <span>{{ chip.text }}</span>
            <span class="fc-x" aria-hidden="true">×</span>
        </button>

        <AButton sm icon="x" @click="emit('clear')">
            {{ t('filters.clearAll') }}
        </AButton>
    </div>
</template>

<style scoped>
.fc {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.fc-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--a-tint-2);
    background: var(--a-tint);
    color: var(--a-accent-2);
    border-radius: 999px;
    padding: 4px 12px;
    font: inherit;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
}

.fc-chip:hover {
    border-color: var(--a-accent);
}

.fc-x {
    font-size: 15px;
    line-height: 1;
    color: var(--a-ink-4);
}

.fc-chip:hover .fc-x {
    color: var(--a-red);
}
</style>
