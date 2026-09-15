<script setup>
// What a ladder does to a price — the band table and a small chart of unit
// price against quantity, both worked from one example unit price.
//
// The same preview serves both modes: a percent table has its rows anyway, a
// formula has none until it is sampled, and this is where it is sampled.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ANum from '@/components/ui/ANum.vue';
import { floorQty, ladderTable } from '@/lib/ladder';
import { ils, num, pct } from '@/lib/money';

const props = defineProps({
    /** A normalised group draft — mode, baseQty, breaks/percents or formula. */
    group: { type: Object, required: true },
    /** The example unit price before VAT. */
    unitPrice: { type: Number, default: 1 },
    vatRate: { type: Number, default: 0 },
    /** The shared quantity scale a curve is sampled on. */
    scale: { type: Array, default: () => [] },
    /** Whether to draw the chart under the table. */
    chart: { type: Boolean, default: true },
});

const { t } = useI18n();

const uomName = computed(() =>
    props.group.uom ? t(`pricing.uom.${props.group.uom}`) : '',
);

const rows = computed(() =>
    ladderTable(props.group, props.unitPrice, props.vatRate, props.scale),
);

const floorAt = computed(() => floorQty(props.group));

// ---- the chart ---------------------------------------------------------------
//
// A step chart: the unit price holds through each band and drops at the next
// band's start. Axes are labelled; the drawing is plain SVG in the page's
// tokens — no library for four lines and a handful of ticks.

const W = 320;
const H = 130;
const PAD = { top: 10, right: 12, bottom: 26, left: 44 };

const points = computed(() =>
    rows.value.filter((row) => Number.isFinite(row.from) && row.from > 0),
);

const xMax = computed(() => {
    const last = points.value[points.value.length - 1];

    return last ? last.from * 1.15 : 1;
});

const xOf = (qty) => PAD.left + ((W - PAD.left - PAD.right) * qty) / xMax.value;
const yOf = (price) =>
    PAD.top + (H - PAD.top - PAD.bottom) * (1 - price / (props.unitPrice || 1));

const path = computed(() => {
    if (!points.value.length) {
        return '';
    }

    const parts = [`M ${xOf(0)} ${yOf(props.unitPrice)}`];

    points.value.forEach((row) => {
        parts.push(`H ${xOf(row.from)}`, `V ${yOf(row.unit)}`);
    });
    parts.push(`H ${W - PAD.right}`);

    return parts.join(' ');
});

const yTicks = computed(() =>
    [1, 0.75, 0.5, 0.25].map((share) => ({
        y: yOf(props.unitPrice * share),
        label: ils(props.unitPrice * share, 2),
    })),
);
</script>

<template>
    <div class="lp">
        <table class="a-table tp-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('pricing.ladder.range') }}</th>
                    <th scope="col">{{ t('pricing.ladder.pct') }}</th>
                    <th scope="col" class="nowrap">
                        {{ t('pricing.ladder.unit') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('pricing.ladder.unitInclVat') }}
                    </th>
                    <th scope="col">{{ t('pricing.ladder.example') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows" :key="row.from">
                    <td class="nowrap">
                        <ANum>
                            {{
                                row.to == null
                                    ? t('pricing.ladder.andUp', {
                                          from: num(row.from),
                                      })
                                    : t('pricing.ladder.upTo', {
                                          from: num(row.from),
                                          to: num(row.to),
                                      })
                            }}
                        </ANum>
                        {{ uomName }}
                    </td>
                    <td class="nowrap">
                        <span v-if="row.pct" class="num">
                            {{
                                t('pricing.ladder.off', {
                                    pct: pct(row.pct, 1),
                                })
                            }}
                        </span>
                        <span v-else class="lp-dim">
                            {{ t('pricing.ladder.base') }}
                        </span>
                    </td>
                    <td class="num nowrap">{{ ils(row.unit, 2) }}</td>
                    <td class="num nowrap lp-soft">
                        {{ ils(row.unitInclVat, 2) }}
                    </td>
                    <td class="num nowrap">{{ ils(row.exampleTotal, 2) }}</td>
                </tr>
            </tbody>
        </table>
        <div class="lp-foot">
            <span>
                {{ t('pricing.ladder.vatNote', { rate: pct(vatRate * 100) }) }}
            </span>
            <span v-if="group.mode === 'formula'">
                {{
                    floorAt
                        ? t('pricing.editor.formula.floorAt', {
                              qty: num(Math.ceil(floorAt)),
                              uom: uomName,
                          })
                        : t('pricing.editor.formula.floorNever')
                }}
            </span>
        </div>

        <svg
            v-if="chart && points.length"
            class="lp-chart"
            :viewBox="`0 0 ${W} ${H}`"
            role="img"
            :aria-label="t('pricing.editor.formula.chartAria')"
        >
            <g v-for="tick in yTicks" :key="tick.label">
                <line
                    class="lp-grid"
                    :x1="PAD.left"
                    :x2="W - PAD.right"
                    :y1="tick.y"
                    :y2="tick.y"
                />
                <text class="lp-tick" :x="PAD.left - 6" :y="tick.y + 3">
                    {{ tick.label }}
                </text>
            </g>
            <line
                class="lp-axis"
                :x1="PAD.left"
                :x2="W - PAD.right"
                :y1="H - PAD.bottom"
                :y2="H - PAD.bottom"
            />
            <text
                v-for="row in points"
                :key="row.from"
                class="lp-tick"
                :x="xOf(row.from)"
                :y="H - PAD.bottom + 14"
                text-anchor="middle"
            >
                {{ num(row.from) }}
            </text>
            <path class="lp-line" :d="path" />
            <circle
                v-for="row in points"
                :key="`c${row.from}`"
                class="lp-dot"
                :cx="xOf(row.from)"
                :cy="yOf(row.unit)"
                r="2.5"
            />
            <text
                class="lp-axis-label"
                :x="W - PAD.right"
                :y="H - 4"
                text-anchor="end"
            >
                {{ t('pricing.editor.formula.chartX', { uom: uomName }) }}
            </text>
        </svg>
    </div>
</template>

<style scoped>
.lp-dim {
    color: var(--a-ink-4);
}

.lp-soft {
    color: var(--a-ink-3);
}

.lp-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    padding: 10px 14px;
    font-size: 12.5px;
    color: var(--a-ink-4);
    border-top: 1px solid var(--a-line-3);
}

.lp-chart {
    display: block;
    width: 100%;
    max-width: 520px;
    height: auto;
    margin: 6px 14px 12px;
    direction: ltr;
}

.lp-grid {
    stroke: var(--a-line-3);
    stroke-width: 1;
}

.lp-axis {
    stroke: var(--a-line);
    stroke-width: 1;
}

.lp-tick,
.lp-axis-label {
    font-size: 8.5px;
    fill: var(--a-ink-4);
}

.lp-tick {
    text-anchor: end;
}

.lp-line {
    fill: none;
    stroke: var(--a-brand, var(--a-ink-2));
    stroke-width: 1.6;
}

.lp-dot {
    fill: var(--a-brand, var(--a-ink-2));
}
</style>
