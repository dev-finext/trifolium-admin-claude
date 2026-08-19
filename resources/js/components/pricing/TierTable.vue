<script setup>
// The price table itself — one row per quantity band.
//
// Every figure it renders (the discount off the base band, the example total,
// the warning when a price rises against the band before it) comes from
// useTierRows, the same arithmetic the editor gates its save on — so the table
// can never look complete while the save button stays blocked.
//
// A rising price is flagged, not forbidden: a supplier may genuinely price a
// larger quantity higher. An empty price is forbidden — the group would
// silently fail to price an order in that band.
import { computed, onBeforeUpdate, ref } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import { fixed2, useTierRows } from '@/components/pricing/useTierRows';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ANum from '@/components/ui/ANum.vue';
import { ils, num, pct } from '@/lib/money';

const props = defineProps({
    /** `[{ lo, price }]`, both as typed strings. */
    rows: { type: Array, required: true },
    /** True while the group owns its bands, which makes `lo` editable. */
    custom: { type: Boolean, default: false },
    /** The unit id prices are quoted per. */
    uom: { type: String, required: true },
});

const emit = defineEmits(['set-row', 'add-row', 'remove-row']);

const { t } = useI18n();

const { los, prices, rangeError, rangeText, previousPrice, discount } =
    useTierRows(
        computed(() => props.rows),
        computed(() => props.custom),
    );

const uomName = computed(() => t(`pricing.uom.${props.uom}`));

/** One input per price cell, so Enter walks down the column. */
const fields = ref([]);

onBeforeUpdate(() => {
    fields.value = [];
});

function focusNext(index) {
    const next = fields.value[index + 1];

    if (next) {
        next.focus();
        next.select();
    }
}

/** Digits and at most one decimal point. */
function onPrice(index, event) {
    let value = event.target.value.replace(/[^\d.]/g, '');
    const parts = value.split('.');

    if (parts.length > 2) {
        value = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    emit('set-row', index, { price: value });
}

/** A price settles at two decimals once the field is left. */
function onPriceBlur(index, event) {
    const value = parseFloat(event.target.value);

    emit('set-row', index, {
        price: Number.isNaN(value) ? '' : fixed2(value),
    });
}

function onLo(index, event) {
    emit('set-row', index, {
        lo: event.target.value.replace(/[^\d.]/g, ''),
    });
}

function rose(index) {
    const price = prices.value[index];
    const before = previousPrice(index);

    return price != null && before != null && price > before;
}

function exampleTotal(index) {
    return los.value[index] * prices.value[index];
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
                        {{ t('pricing.editor.table.range') }}
                    </th>
                    <th scope="col" style="width: 230px">
                        {{ t('pricing.editor.table.unitPrice') }}
                    </th>
                    <th scope="col" style="width: 150px">
                        {{ t('pricing.editor.table.discount') }}
                    </th>
                    <th scope="col">{{ t('pricing.editor.table.example') }}</th>
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
                        <span
                            class="tp-pwrap"
                            :class="{
                                'is-warn': rose(i),
                                'is-empty': row.price === '',
                            }"
                        >
                            <i>₪</i>
                            <input
                                :ref="(el) => (fields[i] = el)"
                                inputmode="decimal"
                                :value="row.price"
                                placeholder="0.00"
                                :aria-label="
                                    t('pricing.editor.table.priceAria')
                                "
                                @input="onPrice(i, $event)"
                                @keydown.enter.prevent="focusNext(i)"
                                @blur="onPriceBlur(i, $event)"
                            />
                        </span>
                        <div v-if="rose(i)" class="tp-cellnote tp-warned">
                            {{ t('pricing.editor.table.priceRose') }}
                        </div>
                        <div
                            v-if="prices[i] == null"
                            class="tp-cellnote tp-required"
                        >
                            {{ t('pricing.editor.table.priceRequired') }}
                        </div>
                    </td>
                    <td class="nowrap">
                        <template v-if="i === 0">
                            <AChip
                                v-if="prices[0] != null"
                                tone="gray"
                                size="sm"
                                :dot="false"
                            >
                                {{ t('pricing.editor.table.base') }}
                            </AChip>
                            <span v-else class="tp-dim">—</span>
                        </template>
                        <span
                            v-else-if="discount(i) != null"
                            class="num tp-disc"
                            :class="{ 'is-up': discount(i) < 0 }"
                        >
                            {{
                                discount(i) >= 0
                                    ? t('pricing.editor.table.discountDown', {
                                          pct: pct(discount(i)),
                                      })
                                    : t('pricing.editor.table.discountUp', {
                                          pct: pct(-discount(i)),
                                      })
                            }}
                        </span>
                        <span v-else class="tp-dim">—</span>
                    </td>
                    <td class="nowrap">
                        <I18nT
                            v-if="prices[i] != null && !Number.isNaN(los[i])"
                            keypath="pricing.editor.table.exampleValue"
                            tag="span"
                            scope="global"
                            class="tp-ex"
                        >
                            <template #qty>
                                <ANum>{{ num(los[i]) }}</ANum>
                            </template>
                            <template #uom>{{ uomName }}</template>
                            <template #total>
                                <span class="num tp-ex-total">
                                    {{ ils(exampleTotal(i), 2) }}
                                </span>
                            </template>
                        </I18nT>
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

.tp-disc {
    font-weight: 600;
    color: var(--a-ink-2);
}

.tp-disc.is-up {
    color: var(--a-amber);
}

.tp-ex {
    color: var(--a-ink-3);
}

.tp-ex-total {
    font-weight: 600;
    color: var(--a-ink);
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
