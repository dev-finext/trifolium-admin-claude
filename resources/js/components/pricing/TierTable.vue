<script setup>
// The percent table itself — one row per quantity band.
//
// A band says how much comes off the item's own unit price once the quantity
// reaches it. The group never holds a price: the unit price on every row is
// the example price the editor lets the agent type, so the table reads as
// money and not as abstract percentages.
//
// Every state the table renders (a missing percent, one outside 0–100, one that
// shrinks against the band before it) comes from useTierRows, the same
// arithmetic the editor gates its save on.
import { computed, onBeforeUpdate, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { fixed1, useTierRows } from '@/components/pricing/useTierRows';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ANum from '@/components/ui/ANum.vue';
import { ils, num, pct } from '@/lib/money';

const props = defineProps({
    /** `[{ lo, pct }]`, both as typed strings. */
    rows: { type: Array, required: true },
    /** True while the group owns its bands, which makes `lo` editable. */
    custom: { type: Boolean, default: false },
    /** The unit id the ladder is written for. */
    uom: { type: String, required: true },
    /** Bands starting at or below it are the full price. */
    baseQty: { type: Number, default: 1 },
    /** The example unit price the money columns are worked from. */
    previewPrice: { type: Number, default: 1 },
    /** e.g. 0.18 */
    vatRate: { type: Number, default: 0 },
});

const emit = defineEmits(['set-row', 'add-row', 'remove-row']);

const { t } = useI18n();

const { los, pcts, isBase, rangeError, pctError, rangeText } = useTierRows(
    computed(() => props.rows),
    computed(() => props.custom),
    computed(() => props.baseQty),
);

const uomName = computed(() => t(`pricing.uom.${props.uom}`));

/** One input per percent cell, so Enter walks down the column. */
const fields = ref([]);

onBeforeUpdate(() => {
    fields.value = [];
});

function focusNext(index) {
    const next = fields.value
        .slice(index + 1)
        .find((field) => field && !field.disabled);

    if (next) {
        next.focus();
        next.select();
    }
}

/** Digits and at most one decimal point. */
function cleanNumber(text) {
    let value = text.replace(/[^\d.]/g, '');
    const parts = value.split('.');

    if (parts.length > 2) {
        value = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    return value;
}

function onPct(index, event) {
    emit('set-row', index, { pct: cleanNumber(event.target.value) });
}

/** A percent settles at one decimal once the field is left. */
function onPctBlur(index, event) {
    const value = parseFloat(event.target.value);

    emit('set-row', index, {
        pct: Number.isNaN(value) ? '' : fixed1(value),
    });
}

function onLo(index, event) {
    emit('set-row', index, { lo: cleanNumber(event.target.value) });
}

function unitAt(index) {
    const off = pcts.value[index];

    return off == null ? null : props.previewPrice * (1 - off / 100);
}

function pctMessage(index) {
    const error = pctError(index);

    if (error === 'required') {
        return t('pricing.editor.pctTable.pctRequired');
    }

    if (error === 'range') {
        return t('pricing.editor.pctTable.pctRange');
    }

    return error === 'decreasing'
        ? t('pricing.editor.pctTable.pctDecreasing')
        : '';
}
</script>

<template>
    <div>
        <table class="a-table tp-table tp-table-lg">
            <thead>
                <tr>
                    <th
                        scope="col"
                        :style="{ width: custom ? '280px' : '170px' }"
                    >
                        {{ t('pricing.ladder.range') }}
                    </th>
                    <th scope="col" style="width: 190px">
                        {{ t('pricing.editor.pctTable.pct') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('pricing.ladder.unit') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('pricing.ladder.unitInclVat') }}
                    </th>
                    <th scope="col">{{ t('pricing.ladder.example') }}</th>
                    <th v-if="custom" scope="col" style="width: 60px"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, i) in rows" :key="i">
                    <td class="nowrap tp-range">
                        <template v-if="custom">
                            <div class="tp-lorow">
                                <span class="tp-cap">
                                    {{ t('pricing.editor.table.rangeFrom') }}
                                </span>
                                <input
                                    class="a-input tp-lo"
                                    inputmode="decimal"
                                    :value="row.lo"
                                    :aria-label="
                                        t('pricing.editor.table.rangeAria', {
                                            n: i + 1,
                                        })
                                    "
                                    @input="onLo(i, $event)"
                                />
                                <span class="tp-cap">
                                    {{
                                        rows[i + 1] && !Number.isNaN(los[i + 1])
                                            ? t(
                                                  'pricing.editor.table.rangeUpTo',
                                                  { n: num(los[i + 1]) },
                                              )
                                            : t(
                                                  'pricing.editor.table.rangeAndUp',
                                              )
                                    }}
                                </span>
                            </div>
                            <div
                                v-if="rangeError(i)"
                                class="tp-cellnote tp-bad"
                            >
                                {{
                                    rangeError(i) === 'ascending'
                                        ? t(
                                              'pricing.editor.table.rangeAscending',
                                          )
                                        : t(
                                              'pricing.editor.table.rangeRequired',
                                          )
                                }}
                            </div>
                        </template>
                        <template v-else>
                            <ANum>{{ rangeText(i) }}</ANum> {{ uomName }}
                        </template>
                    </td>
                    <td>
                        <template v-if="isBase(i)">
                            <AChip tone="gray" size="sm" :dot="false">
                                {{ t('pricing.ladder.base') }}
                            </AChip>
                            <div class="tp-cellnote tp-dim">
                                {{ t('pricing.editor.pctTable.pctBase') }}
                            </div>
                        </template>
                        <template v-else>
                            <span
                                class="tp-pwrap"
                                :class="{
                                    'is-warn': pctError(i) === 'decreasing',
                                    'is-empty': row.pct === '',
                                }"
                            >
                                <i>%</i>
                                <input
                                    :ref="(el) => (fields[i] = el)"
                                    inputmode="decimal"
                                    :value="row.pct"
                                    placeholder="0"
                                    :aria-label="
                                        t('pricing.editor.pctTable.pctAria', {
                                            n: i + 1,
                                        })
                                    "
                                    @input="onPct(i, $event)"
                                    @keydown.enter.prevent="focusNext(i)"
                                    @blur="onPctBlur(i, $event)"
                                />
                            </span>
                            <div
                                v-if="pctError(i)"
                                class="tp-cellnote"
                                :class="
                                    pctError(i) === 'decreasing'
                                        ? 'tp-warned'
                                        : 'tp-required'
                                "
                            >
                                {{ pctMessage(i) }}
                            </div>
                        </template>
                    </td>
                    <td class="nowrap">
                        <span v-if="unitAt(i) != null" class="num">
                            {{ ils(unitAt(i), 2) }}
                        </span>
                        <span v-else class="tp-dim">—</span>
                    </td>
                    <td class="nowrap">
                        <span v-if="unitAt(i) != null" class="num tp-soft">
                            {{ ils(unitAt(i) * (1 + vatRate), 2) }}
                        </span>
                        <span v-else class="tp-dim">—</span>
                    </td>
                    <td class="nowrap">
                        <span
                            v-if="unitAt(i) != null && !Number.isNaN(los[i])"
                            class="tp-ex"
                        >
                            <ANum>{{ num(los[i]) }}</ANum> {{ uomName }} ·
                            <span class="num tp-ex-total">
                                {{ ils(unitAt(i) * los[i], 2) }}
                            </span>
                            <span v-if="pcts[i]" class="tp-off">
                                {{
                                    t('pricing.ladder.off', {
                                        pct: pct(pcts[i], 1),
                                    })
                                }}
                            </span>
                        </span>
                        <span v-else class="tp-dim">—</span>
                    </td>
                    <td v-if="custom">
                        <AButton
                            sm
                            kind="ghost"
                            icon="x"
                            :title="
                                t('pricing.editor.table.removeRange', {
                                    n: i + 1,
                                })
                            "
                            :aria-label="
                                t('pricing.editor.table.removeRange', {
                                    n: i + 1,
                                })
                            "
                            :disabled="rows.length === 1"
                            @click="emit('remove-row', i)"
                        />
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-if="custom" class="tp-addrow">
            <AButton icon="plus" @click="emit('add-row')">
                {{ t('pricing.editor.table.addRange') }}
            </AButton>
            <span class="tp-addrow-hint">
                {{ t('pricing.editor.table.addRangeHint') }}
            </span>
        </div>
    </div>
</template>

<style scoped>
.tp-range {
    font-weight: 600;
}

.tp-cap {
    color: var(--a-ink-3);
    font-weight: 500;
}

.tp-bad {
    color: var(--a-red);
}

.tp-warned {
    color: var(--a-amber);
}

.tp-required {
    color: var(--a-red);
    font-weight: 600;
}

.tp-dim {
    color: var(--a-ink-4);
}

.tp-soft {
    color: var(--a-ink-3);
}

.tp-ex {
    color: var(--a-ink-3);
}

.tp-ex-total {
    font-weight: 600;
    color: var(--a-ink);
}

.tp-off {
    margin-inline-start: 6px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.tp-addrow {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border-top: 1px solid var(--a-line);
}

.tp-addrow-hint {
    font-size: 13.5px;
    color: var(--a-ink-4);
}
</style>
