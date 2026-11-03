<script setup>
// Which open batches one component is drawn from, by hand.
//
// FEFO draws the nearest-expiry batch first and that is right most of the
// time, but it is a choice the system makes silently — the agent sees only
// where it landed, never what else was on the shelf. Natalie, on exactly
// that: "אין לי אופציה לראות את שאר האצוות של הפריט בן, צריכה להיות לי
// אופציה לבחור גם ידנית מאיזה אצוות אני רוצה לייצר את המוצר". This is the
// "see the rest" and the "choose by hand", open for one component at a time.
//
// The quantities here are a draft until they cover what the recipe needs —
// nothing is reserved or taken from stock until the order is actually saved.
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';

const props = defineProps({
    name: { type: [String, Object], required: true },
    /** Every open batch of this component, nearest pick-order first. */
    batches: { type: Array, default: () => [] },
    /** How much the recipe needs, in the component's stock unit. */
    needed: { type: Number, required: true },
    uom: { type: String, default: '' },
    /** The current picks — `[{ batch, qty }]`, in the same stock unit. */
    modelValue: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();

/** One draft quantity per batch, seeded from the current picks. */
const draft = reactive({});

function seed() {
    props.batches.forEach((batch) => {
        draft[batch.id] =
            props.modelValue.find((pick) => pick.batch === batch.id)?.qty || '';
    });
}

seed();

watch(() => props.batches.map((batch) => batch.id).join(','), seed);

const allocated = computed(() =>
    Object.values(draft).reduce((sum, value) => sum + (Number(value) || 0), 0),
);

function commit() {
    emit(
        'update:modelValue',
        props.batches
            .map((batch) => ({
                batch: batch.id,
                qty: Number(draft[batch.id]) || 0,
            }))
            .filter((pick) => pick.qty > 0),
    );
}

/** Digits and at most one decimal point. */
function cleanNumber(text) {
    const value = text.replace(/[^\d.]/g, '');
    const parts = value.split('.');

    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
}

function onQty(batchId, event) {
    draft[batchId] = cleanNumber(event.target.value);
    commit();
}
</script>

<template>
    <div
        class="bp"
        role="region"
        :aria-label="t('production.create.pick.title', { name: loc(name) })"
    >
        <div class="bp-head">
            <span class="bp-need">
                {{
                    t('production.create.pick.needed', {
                        qty: num(needed, 2),
                        uom,
                    })
                }}
            </span>
            <span
                class="bp-alloc"
                :class="{
                    'is-short': allocated < needed,
                    'is-full': allocated >= needed,
                }"
            >
                {{
                    t('production.create.pick.allocated', {
                        qty: num(allocated, 2),
                        needed: num(needed, 2),
                        uom,
                    })
                }}
            </span>
        </div>

        <p v-if="!batches.length" class="bp-none">
            {{ t('production.create.pick.none') }}
        </p>

        <table v-else class="a-table bp-table">
            <thead>
                <tr>
                    <th scope="col">
                        {{ t('production.create.pick.batchCol') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('production.create.pick.expiryCol') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('production.create.pick.remainingCol') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('production.create.pick.qtyCol') }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="batch in batches" :key="batch.id">
                    <td class="nowrap">
                        <span class="a-code a-tag">{{
                            batch.number || batch.id
                        }}</span>
                        <span v-if="batch.waste" class="t-sub bp-waste">
                            {{ t('inventory.batches.trace.wasteChip') }}
                        </span>
                    </td>
                    <td class="nowrap num">{{ fmtISO(batch.expiry) }}</td>
                    <td class="nowrap">
                        <ANum>{{ num(batch.remaining, 2) }}</ANum> {{ uom }}
                    </td>
                    <td>
                        <input
                            class="a-input bp-qty num"
                            inputmode="decimal"
                            :value="draft[batch.id]"
                            :max="batch.remaining"
                            :aria-label="
                                t('production.create.pick.qtyCol') +
                                ' · ' +
                                (batch.number || batch.id)
                            "
                            @input="onQty(batch.id, $event)"
                        />
                    </td>
                </tr>
            </tbody>
        </table>

        <AButton
            sm
            kind="ghost"
            icon="refresh"
            @click="emit('update:modelValue', null)"
        >
            {{ t('production.create.pick.autoBack') }}
        </AButton>
    </div>
</template>

<style scoped>
.bp {
    padding: 10px 2px 2px;
}

.bp-head {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-bottom: 8px;
    font-size: 13px;
}

.bp-need {
    color: var(--a-ink-3);
}

.bp-alloc.is-short {
    color: var(--a-amber);
    font-weight: 600;
}

.bp-alloc.is-full {
    color: var(--a-green, var(--a-ink-2));
    font-weight: 600;
}

.bp-none {
    margin: 0 0 8px;
    color: var(--a-ink-4);
    font-size: 13px;
}

.bp-table {
    margin-bottom: 10px;
}

.bp-waste {
    margin-inline-start: 6px;
}

.bp-qty {
    width: 110px;
    text-align: center;
}
</style>
