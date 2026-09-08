<script setup>
// The filter builder, in a drawer — for every list in the console.
//
// It lives in a drawer rather than in a bar above the table because the tables
// here are dense and read all day: a permanent filter panel would take that
// width away every hour to serve a task that happens a few times an hour.
//
// Every field is a checkbox multi-select with live counts, and the counts are
// computed against the *other* active filters, so the drawer tells the reader
// what each option is worth before they tick it.
//
// The screen owns the filter state. Every change leaves here as a patch.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import FacetCheckList from '@/components/ui/FacetCheckList.vue';
import NumericFilter from '@/components/ui/NumericFilter.vue';
import { activeKeys, facetsOf, isActive, toggleValue } from '@/lib/facets';
import { num } from '@/lib/money';

const props = defineProps({
    open: { type: Boolean, default: false },
    /** The screen's filter spec — see composables/useListFilters.js. */
    spec: { type: Object, required: true },
    /** The filter state — the same reactive URL object the list reads. */
    filters: { type: Object, required: true },
    /** The rows the date range left, before any field filter. */
    rows: { type: Array, default: () => [] },
    /** How many rows survive the whole filter set right now. */
    resultCount: { type: Number, default: 0 },
    /** Offer "save as a view" in the header. */
    savable: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'clear', 'save', 'patch']);

const { t, locale } = useI18n();

const fields = computed(() => props.spec.fields || []);

const active = computed(() => activeKeys(fields.value, props.filters));

const groups = computed(() =>
    (props.spec.groups || [])
        .map((id) => ({
            id,
            label: t(`${props.spec.ns}.filterGroup.${id}`),
            fields: fields.value.filter((field) => field.group === id),
        }))
        .filter((group) => group.fields.length),
);

const fieldLabel = (field) => t(`${props.spec.ns}.filter.field.${field.key}`);

/**
 * Option text. A field either names a locale prefix — its values are managed
 * ids — or brings its own labeller, for values that are record content.
 */
function optionLabel(field) {
    return (value) => {
        if (typeof field.optionLabel === 'function') {
            return field.optionLabel(value, props.rows);
        }

        return field.prefix ? t(`${field.prefix}.${value}`) : String(value);
    };
}

function facets(field) {
    return facetsOf(props.rows, fields.value, props.filters, field.key);
}

/** How many values are chosen in one field — shown beside its heading. */
function chosen(field) {
    if (!isActive(field, props.filters[field.key])) {
        return 0;
    }

    return field.kind === 'num' ? 1 : props.filters[field.key].length;
}

function onToggle(field, value) {
    emit('patch', {
        [field.key]: toggleValue(props.filters[field.key], value),
    });
}

function onAll(field, values) {
    emit('patch', { [field.key]: values });
}

function onClear(field) {
    emit('patch', { [field.key]: [] });
}

function onNum(field, next) {
    emit('patch', { [field.key]: next });
}

// Groups holding an active filter start open, so a pasted link shows what it did
// without the reader hunting through collapsed sections.
const openGroups = computed(() =>
    Object.fromEntries(
        groups.value.map((group) => [
            group.id,
            group.fields.some((field) => chosen(field) > 0),
        ]),
    ),
);

const localeKey = computed(() => locale.value);
</script>

<template>
    <ADrawer :open="open" @close="emit('close')">
        <template #header>
            <div class="fd-head">
                <h2 class="fd-title">{{ t('filters.title') }}</h2>
                <span class="fd-count">
                    {{
                        t('filters.resultCount', {
                            n: num(resultCount),
                            noun: spec.noun,
                        })
                    }}
                </span>
                <AButton
                    sm
                    icon="x"
                    :disabled="!active.length"
                    @click="emit('clear')"
                >
                    {{ t('filters.clearAll') }}
                </AButton>
                <AButton
                    v-if="savable"
                    sm
                    icon="save"
                    :disabled="!active.length"
                    @click="emit('save')"
                >
                    {{ t('filters.savedViews.save') }}
                </AButton>
            </div>
        </template>

        <p class="a-note a-note--info fd-hint">{{ t('filters.hint') }}</p>

        <div :key="localeKey" class="fd-groups">
            <details
                v-for="group in groups"
                :key="group.id"
                class="fd-group"
                :open="openGroups[group.id]"
            >
                <summary>
                    {{ group.label }}
                    <span class="fd-gcount">{{ group.fields.length }}</span>
                </summary>

                <div class="fd-body">
                    <section
                        v-for="field in group.fields"
                        :key="field.key"
                        class="fd-field"
                    >
                        <h3 class="fd-flabel">
                            {{ fieldLabel(field) }}
                            <span v-if="chosen(field)" class="fd-chosen num">
                                {{ chosen(field) }}
                            </span>
                        </h3>

                        <NumericFilter
                            v-if="field.kind === 'num'"
                            :model-value="filters[field.key]"
                            :unit="(spec.units || {})[field.key] || ''"
                            :name="fieldLabel(field)"
                            @update:model-value="onNum(field, $event)"
                        />

                        <FacetCheckList
                            v-else
                            :facets="facets(field)"
                            :label="optionLabel(field)"
                            :name="fieldLabel(field)"
                            @toggle="onToggle(field, $event)"
                            @all="onAll(field, $event)"
                            @clear="onClear(field)"
                        />
                    </section>
                </div>
            </details>
        </div>
    </ADrawer>
</template>

<style scoped>
.fd-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 14px;
}

.fd-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
}

.fd-count {
    color: var(--a-ink-3);
    font-size: 14px;
    margin-inline-end: auto;
}

.fd-hint {
    margin: 0 0 16px;
}

.fd-groups {
    display: grid;
    gap: 12px;
}

.fd-group {
    background: var(--a-surface);
    border: 1px solid var(--a-line);
    border-radius: var(--a-r);
}

.fd-group > summary {
    padding: 11px 14px;
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
}

.fd-group > summary::-webkit-details-marker {
    display: none;
}

.fd-group > summary::after {
    content: '';
    margin-inline-start: auto;
    width: 7px;
    height: 7px;
    border-inline-end: 2px solid var(--a-ink-4);
    border-block-end: 2px solid var(--a-ink-4);
    transform: rotate(45deg);
    transition: transform 0.15s;
}

.fd-group[open] > summary {
    border-bottom: 1px solid var(--a-line);
}

.fd-group[open] > summary::after {
    transform: rotate(-135deg);
}

.fd-gcount {
    font-size: 12.5px;
    color: var(--a-ink-4);
    font-weight: 500;
}

.fd-body {
    padding: 12px 14px;
    display: grid;
    gap: 18px;
}

.fd-flabel {
    margin: 0 0 6px;
    font-size: 12.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--a-ink-3);
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 7px;
}

.fd-chosen {
    background: var(--a-tint-2);
    color: var(--a-accent-2);
    border-radius: 999px;
    padding: 0 7px;
    font-size: 11.5px;
}
</style>
