<script setup>
// Which item groups a price scale covers.
//
// A scale used to claim SKU prefixes, which meant the screen had to teach
// longest-match precedence and refuse overlaps as they were typed. It claims
// item groups now — SAP's own `OITB` grouping, the same one the item screen
// filters by — so coverage is a set, membership is exact, and a group either
// belongs to this scale or to another one.
//
// The names are the groups' own (`10 צמחים`, `מדבקות פריטים`). They are data,
// not copy, and they are never translated: the same string shows in both
// languages because that is the group's name in SAP.
//
// A group another scale already holds is shown, disabled, and says who holds
// it. Hiding it would leave the agent wondering where a group went.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import ChipStrip from '@/components/ui/ChipStrip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';

const props = defineProps({
    /** The chosen item-group codes. */
    modelValue: { type: Array, default: () => [] },
    /** `[{ code, name, items }]` — every group in the catalogue. */
    options: { type: Array, default: () => [] },
    /** `(code) => scale | null` — who else already holds this group. */
    heldBy: { type: Function, default: () => null },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();
const uid = useId();

const term = ref('');

const chosen = computed(() => new Set(props.modelValue));

const shown = computed(() => {
    const needle = term.value.trim().toLowerCase();

    if (!needle) {
        return props.options;
    }

    return props.options.filter(
        (group) =>
            String(group.name).toLowerCase().includes(needle) ||
            String(group.code).includes(needle),
    );
});

/** How many items the scale would cover as it currently stands. */
const covered = computed(() =>
    props.options
        .filter((group) => chosen.value.has(group.code))
        .reduce((sum, group) => sum + group.items, 0),
);

function toggle(group) {
    if (props.heldBy(group.code)) {
        return;
    }

    const next = new Set(chosen.value);

    if (next.has(group.code)) {
        next.delete(group.code);
    } else {
        next.add(group.code);
    }

    emit('update:modelValue', [...next]);
}

function title(group) {
    const owner = props.heldBy(group.code);

    return owner
        ? t('pricing.editor.itemGroups.heldBy', { group: loc(owner.name) })
        : '';
}
</script>

<template>
    <div>
        <div class="ig-head">
            <span class="ig-count">
                {{
                    modelValue.length
                        ? t(
                              'pricing.editor.itemGroups.chosen',
                              { n: modelValue.length, items: num(covered) },
                              modelValue.length,
                          )
                        : t('pricing.editor.itemGroups.none')
                }}
            </span>
            <input
                :id="`${uid}-q`"
                v-model="term"
                type="search"
                class="a-input ig-q"
                :placeholder="t('pricing.editor.itemGroups.search')"
                :aria-label="t('pricing.editor.itemGroups.search')"
            />
        </div>

        <ChipStrip id="pricing-item-groups">
            <button
                v-for="group in shown"
                :key="group.code"
                type="button"
                class="ig-chip"
                :class="{
                    'is-on': chosen.has(group.code),
                    'is-held': Boolean(heldBy(group.code)),
                }"
                :aria-pressed="chosen.has(group.code)"
                :disabled="Boolean(heldBy(group.code))"
                :title="title(group)"
                @click="toggle(group)"
            >
                <AIcon
                    v-if="heldBy(group.code)"
                    name="lock"
                    :size="12"
                    class="ig-lock"
                />
                <span class="ig-code">{{ group.code }}</span>
                <!-- The group's own name, in SAP's own words. Never translated. -->
                <span dir="auto">{{ group.name }}</span>
                <span class="ig-n">{{ num(group.items) }}</span>
            </button>
        </ChipStrip>

        <div v-if="!shown.length" class="a-hint ig-empty">
            {{ t('pricing.editor.itemGroups.noMatch') }}
        </div>
    </div>
</template>

<style scoped>
.ig-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.ig-count {
    font-size: 13px;
    color: var(--a-ink-3);
}

.ig-q {
    margin-inline-start: auto;
    width: 200px;
}

/* The chip language is the item screen's, because it is the same grouping. */
.ig-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--a-line);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}

.ig-chip.is-on {
    border-color: var(--a-tint-2);
    background: var(--a-tint);
    color: var(--a-accent-2);
}

.ig-code {
    font-family: var(--a-mono, monospace);
    font-size: 11.5px;
    color: var(--a-ink-4);
}

.ig-n {
    font-variant-numeric: tabular-nums;
    color: var(--a-ink-4);
}

.ig-chip.is-on .ig-code,
.ig-chip.is-on .ig-n {
    color: inherit;
}

/* Held by another scale: visible, so nobody wonders where it went. */
.ig-chip.is-held {
    opacity: 0.45;
    cursor: not-allowed;
}

.ig-lock {
    color: var(--a-ink-4);
}

.ig-empty {
    margin-top: 8px;
}
</style>
