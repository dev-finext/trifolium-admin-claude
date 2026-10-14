<script setup>
// What a ladder does to a price — the band table and a chart of unit price
// against quantity, both worked from one example unit price.
//
// The quantity axis is logarithmic, because a ladder is. Bands at 1, 1,000 and
// 3,000 grams, or at 100 and 3,350 capsules, or at a millionth of a gram and a
// whole one, are all multiplicative steps; on a linear axis the early bands
// collapse into the left edge and the chart stops saying anything. Log spacing
// gives every band the same room whatever its magnitude, which is what makes
// one chart serve all of them.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ANum from '@/components/ui/ANum.vue';
import { ladderTable } from '@/lib/ladder';
import { money, pctText, qtyText } from '@/lib/money';

const props = defineProps({
    /** A normalised group draft — baseQty, breaks and percents. */
    group: { type: Object, required: true },
    /** The example unit price before VAT. */
    unitPrice: { type: Number, default: 1 },
    vatRate: { type: Number, default: 0 },
    /** Whether to draw the chart under the table. */
    chart: { type: Boolean, default: true },
});

const { t } = useI18n();

const uomName = computed(() =>
    props.group.uom ? t(`pricing.uom.${props.group.uom}`) : '',
);

const rows = computed(() =>
    ladderTable(props.group, props.unitPrice, props.vatRate),
);

// ---- the chart ---------------------------------------------------------------

const W = 320;
const H = 130;
const PAD = { top: 10, right: 12, bottom: 26, left: 52 };

/** How many quantity labels fit along the axis without colliding. */
const MAX_X_LABELS = 6;

const points = computed(() =>
    rows.value.filter((row) => Number.isFinite(row.from) && row.from > 0),
);

/** The log-space window the bands are drawn in, with a little room after. */
const span = computed(() => {
    const list = points.value;

    if (!list.length) {
        return { from: 0, to: 1 };
    }

    const first = Math.log10(list[0].from);
    const last = Math.log10(list[list.length - 1].from);
    // A single band, or several at one magnitude, still needs a width.
    const width = Math.max(last - first, 0.5);

    return { from: first, to: first + width * 1.25 };
});

const xOf = (qty) => {
    const { from, to } = span.value;
    const share = (Math.log10(qty) - from) / (to - from || 1);

    return (
        PAD.left + (W - PAD.left - PAD.right) * Math.min(1, Math.max(0, share))
    );
};

const yOf = (price) =>
    PAD.top + (H - PAD.top - PAD.bottom) * (1 - price / (props.unitPrice || 1));

/** A step line: the unit price holds through a band and drops at the next. */
const path = computed(() => {
    if (!points.value.length) {
        return '';
    }

    const parts = [
        `M ${xOf(points.value[0].from)} ${yOf(points.value[0].unit)}`,
    ];

    points.value.slice(1).forEach((row) => {
        parts.push(`H ${xOf(row.from)}`, `V ${yOf(row.unit)}`);
    });
    parts.push(`H ${W - PAD.right}`);

    return parts.join(' ');
});

/** Every band is a dot; only some can carry a label without colliding. */
const xLabels = computed(() => {
    const list = points.value;

    if (list.length <= MAX_X_LABELS) {
        return list;
    }

    const step = Math.ceil(list.length / MAX_X_LABELS);

    return list.filter((_, i) => i % step === 0 || i === list.length - 1);
});

const yTicks = computed(() =>
    [1, 0.75, 0.5, 0.25].map((share) => ({
        y: yOf(props.unitPrice * share),
        label: money(props.unitPrice * share),
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
                                          from: qtyText(row.from),
                                      })
                                    : t('pricing.ladder.upTo', {
                                          from: qtyText(row.from),
                                          to: qtyText(row.to),
                                      })
                            }}
                        </ANum>
                        {{ uomName }}
                    </td>
                    <td class="nowrap">
                        <span v-if="row.pct" class="num">
                            {{
                                t('pricing.ladder.off', {
                                    pct: pctText(row.pct),
                                })
                            }}
                        </span>
                        <span v-else class="lp-dim">
                            {{ t('pricing.ladder.base') }}
                        </span>
                    </td>
                    <td class="num nowrap">{{ money(row.unit) }}</td>
                    <td class="num nowrap lp-soft">
                        {{ money(row.unitInclVat) }}
                    </td>
                    <td class="num nowrap">{{ money(row.exampleTotal) }}</td>
                </tr>
            </tbody>
        </table>
        <div class="lp-foot">
            <span>
                {{
                    t('pricing.ladder.vatNote', {
                        rate: pctText(vatRate * 100),
                    })
                }}
            </span>
            <span v-if="chart && points.length">
                {{ t('pricing.ladder.chartScale') }}
            </span>
        </div>

        <svg
            v-if="chart && points.length"
            class="lp-chart"
            :viewBox="`0 0 ${W} ${H}`"
            role="img"
            :aria-label="t('pricing.ladder.chartAria')"
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
                v-for="row in xLabels"
                :key="`x${row.from}`"
                class="lp-tick lp-xtick"
                :x="xOf(row.from)"
                :y="H - PAD.bottom + 14"
                text-anchor="middle"
            >
                {{ qtyText(row.from) }}
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
                {{ t('pricing.ladder.chartX', { uom: uomName }) }}
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

/* The quantity labels sit under their own tick, not at the end of a row. */
.lp-xtick {
    text-anchor: middle;
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
