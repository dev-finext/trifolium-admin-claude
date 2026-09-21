<script setup>
// V3 — one line of the planning report, opened.
//
// The report row is a summary; this is the evidence behind it. Month by month
// consumption over the whole window, with the direct-sale part separated out,
// so a buyer can see whether an average of three a month is three every month or
// thirty once. Then what is on its way and from whom, who has supplied the item
// before and at what price, the levels and the remarks — and, when the plan is a
// production one, whether the run can actually be made and what is short.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { COVER_STATES } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { usePlanningStore } from '@/stores/planning';

const props = defineProps({
    /** The report row, or null while the drawer is closed. */
    row: { type: Object, default: null },
    /** The months the report was computed over, oldest first. */
    months: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = usePlanningStore();

const unit = computed(() =>
    props.row?.unit ? t(`inventory.unit.${props.row.unit}`) : '',
);

const qty = (value) =>
    value === null || value === undefined
        ? '—'
        : `${num(value, 3)} ${unit.value}`.trim();

/** The month-by-month series, with the tallest month setting the bar scale. */
const series = computed(() => {
    if (!props.row) {
        return [];
    }

    const rows = props.months.map((ym) => ({
        id: ym,
        month: ym,
        qty: Number(props.row.series?.[ym]) || 0,
        direct: Number(props.row.directSeries?.[ym]) || 0,
    }));
    const peak = rows.reduce((top, one) => Math.max(top, one.qty), 0) || 1;

    return rows.map((one) => ({
        ...one,
        share: Math.round((one.qty / peak) * 100),
        directShare: Math.round((one.direct / peak) * 100),
    }));
});

/** The same window a year earlier, for the trend the note asks about. */
const lastYear = computed(() => {
    if (!props.row || props.months.length < 13) {
        return null;
    }

    const shiftBack = (ym) => {
        const [year, month] = ym.split('-').map(Number);

        return `${year - 1}-${String(month).padStart(2, '0')}`;
    };

    const now = props.months.reduce(
        (sum, ym) => sum + (Number(props.row.series?.[ym]) || 0),
        0,
    );
    const then = props.months.reduce(
        (sum, ym) => sum + (Number(props.row.series?.[shiftBack(ym)]) || 0),
        0,
    );

    return { now, then, covered: then > 0 };
});

const coming = computed(() =>
    props.row ? store.openOrdersOf(props.row.sku) : [],
);

const comingCols = computed(() => [
    { k: 'kind', label: t('planning.drawer.col.kind'), nowrap: true },
    { k: 'doc', label: t('planning.drawer.col.doc'), nowrap: true },
    { k: 'party', label: t('planning.drawer.col.party') },
    { k: 'qty', label: t('planning.drawer.col.qty'), nowrap: true },
    { k: 'due', label: t('planning.drawer.col.due'), nowrap: true },
]);

const suppliers = computed(() =>
    props.row ? store.suppliersOf(props.row.sku) : [],
);

const supplierCols = computed(() => [
    { k: 'supplier', label: t('planning.drawer.col.supplier') },
    { k: 'qty', label: t('planning.drawer.col.taken'), nowrap: true },
    { k: 'lines', label: t('planning.drawer.col.times'), nowrap: true },
    { k: 'price', label: t('planning.drawer.col.priceRange'), nowrap: true },
    { k: 'lastOn', label: t('planning.drawer.col.lastOn'), nowrap: true },
]);

/** Can the planned production run actually be made, and what is short. */
const canMake = computed(() => {
    const planned = props.row?.plan?.production?.qty || 0;

    return planned && props.row
        ? store.producible(props.row.sku, planned)
        : null;
});

const shortCols = computed(() => [
    { k: 'name', label: t('planning.drawer.col.component') },
    { k: 'need', label: t('planning.drawer.col.need'), nowrap: true },
    { k: 'have', label: t('planning.drawer.col.have'), nowrap: true },
    { k: 'gap', label: t('planning.drawer.col.gap'), nowrap: true },
]);
</script>

<template>
    <ADrawer :open="Boolean(row)" @close="emit('close')">
        <template v-if="row">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">{{ loc(row.name) }}</h2>
                            <span class="a-code a-tag">{{ row.sku }}</span>
                            <AChip
                                :tone="COVER_STATES[row.coverState]?.tone"
                                size="sm"
                            >
                                {{ t(`planning.coverState.${row.coverState}`) }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span v-if="row.groupName">{{
                                row.groupName
                            }}</span>
                            <span v-if="row.foreign" class="ltr">{{
                                row.foreign
                            }}</span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            sm
                            icon="tag"
                            @click="emit('open-item', row.sku)"
                        >
                            {{ t('planning.drawer.openItem') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">
                            {{ t('ui.close') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div class="body">
                <div class="a-kpis">
                    <AKpi :label="t('planning.col.onHand')" small>
                        <template #value>{{ qty(row.onHand) }}</template>
                    </AKpi>
                    <AKpi :label="t('planning.col.committed')" small>
                        <template #value>{{ qty(row.committed) }}</template>
                    </AKpi>
                    <AKpi :label="t('planning.col.onOrder')" small>
                        <template #value>{{ qty(row.onOrder) }}</template>
                    </AKpi>
                    <AKpi :label="t('planning.drawer.available')" small>
                        <template #value>{{ qty(row.available) }}</template>
                    </AKpi>
                    <AKpi :label="t('planning.col.monthly')" small>
                        <template #value>{{ qty(row.monthly) }}</template>
                    </AKpi>
                    <AKpi :label="t('planning.col.cover')" small>
                        <template #value>{{
                            row.cover === null
                                ? t('planning.noDemandShort')
                                : t('planning.drawer.coverValue', {
                                      n: num(row.cover, 1),
                                  })
                        }}</template>
                    </AKpi>
                </div>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.drawer.byMonth') }}
                    </div>
                    <p class="a-hint">{{ t('planning.drawer.byMonthHint') }}</p>
                    <ol class="bars">
                        <li v-for="one in series" :key="one.id" class="bar">
                            <span class="bar-m ltr">{{ one.month }}</span>
                            <span class="bar-track">
                                <span
                                    class="bar-fill"
                                    :style="{ inlineSize: `${one.share}%` }"
                                />
                                <span
                                    v-if="one.direct"
                                    class="bar-direct"
                                    :style="{
                                        inlineSize: `${one.directShare}%`,
                                    }"
                                />
                            </span>
                            <span class="bar-n">
                                <ANum>{{ num(one.qty, 3) }}</ANum>
                            </span>
                        </li>
                    </ol>
                    <p v-if="lastYear?.covered" class="a-hint">
                        {{
                            t('planning.drawer.lastYear', {
                                now: num(lastYear.now, 3),
                                then: num(lastYear.then, 3),
                                pct: num(
                                    ((lastYear.now - lastYear.then) /
                                        lastYear.then) *
                                        100,
                                    0,
                                ),
                            })
                        }}
                    </p>
                </section>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.drawer.coming') }}
                    </div>
                    <ADataTable
                        v-if="coming.length"
                        :cols="comingCols"
                        :rows="coming"
                        row-key="id"
                    >
                        <template #cell-kind="{ row: one }">
                            <AChip
                                :tone="
                                    one.kind === 'purchase' ? 'blue' : 'teal'
                                "
                                size="sm"
                                :dot="false"
                            >
                                {{ t(`planning.target.${one.kind}`) }}
                            </AChip>
                        </template>
                        <template #cell-doc="{ row: one }">
                            <span class="a-code a-tag">{{ one.doc }}</span>
                        </template>
                        <template #cell-party="{ row: one }">
                            <span v-if="one.party">{{ one.party }}</span>
                            <span v-else class="t-sub">{{
                                t('planning.drawer.inHouse')
                            }}</span>
                        </template>
                        <template #cell-qty="{ row: one }">
                            <ANum>{{ num(one.qty, 3) }}</ANum>
                            {{ one.uom || unit }}
                        </template>
                        <template #cell-due="{ row: one }">
                            <ANum v-if="one.due">{{ fmtISO(one.due) }}</ANum>
                            <span v-else class="t-sub">—</span>
                        </template>
                    </ADataTable>
                    <p v-else class="t-sub">
                        {{ t('planning.drawer.nothingComing') }}
                    </p>
                </section>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.drawer.suppliers') }}
                    </div>
                    <p class="a-hint">
                        {{ t('planning.drawer.suppliersHint') }}
                    </p>
                    <ADataTable
                        v-if="suppliers.length"
                        :cols="supplierCols"
                        :rows="suppliers"
                        row-key="id"
                    >
                        <template #cell-supplier="{ row: one }">
                            <div class="t-strong">{{ one.supplier }}</div>
                            <div class="t-sub ltr">{{ one.supplierCode }}</div>
                            <AChip
                                v-if="one.supplierCode === row.supplierCode"
                                tone="green"
                                size="sm"
                                :dot="false"
                            >
                                {{ t('planning.drawer.preferred') }}
                            </AChip>
                        </template>
                        <template #cell-qty="{ row: one }">
                            <ANum>{{ num(one.qty, 3) }}</ANum>
                        </template>
                        <template #cell-price="{ row: one }">
                            <span v-if="one.lowPrice === one.highPrice">
                                <ANum>{{ ils(one.lowPrice, 2) }}</ANum>
                            </span>
                            <span v-else>
                                <ANum>{{ ils(one.lowPrice, 2) }}</ANum> –
                                <ANum>{{ ils(one.highPrice, 2) }}</ANum>
                            </span>
                        </template>
                        <template #cell-lastOn="{ row: one }">
                            <ANum v-if="one.lastOn">{{
                                fmtISO(one.lastOn)
                            }}</ANum>
                            <span v-else class="t-sub">—</span>
                        </template>
                    </ADataTable>
                    <p v-else class="t-sub">
                        {{ t('planning.drawer.noSuppliers') }}
                    </p>
                </section>

                <section v-if="canMake">
                    <div class="a-sect-t">
                        {{ t('planning.drawer.canMake') }}
                    </div>
                    <p v-if="canMake.reason === 'noRecipe'" class="t-sub">
                        {{ t('planning.drawer.noRecipe') }}
                    </p>
                    <p v-else-if="canMake.ok" class="ok">
                        {{
                            t('planning.drawer.canMakeOk', {
                                qty: num(row.plan.production.qty, 3),
                                unit,
                            })
                        }}
                    </p>
                    <template v-else>
                        <p class="bad">
                            {{
                                t('planning.drawer.canMakeShort', {
                                    n: canMake.short.length,
                                })
                            }}
                        </p>
                        <ADataTable
                            :cols="shortCols"
                            :rows="canMake.short"
                            row-key="sku"
                        >
                            <template #cell-name="{ row: one }">
                                <div class="t-strong">{{ loc(one.name) }}</div>
                                <div class="t-sub ltr">{{ one.sku }}</div>
                            </template>
                            <template #cell-need="{ row: one }">
                                <ANum>{{ num(one.need, 3) }}</ANum>
                            </template>
                            <template #cell-have="{ row: one }">
                                <ANum>{{ num(one.have, 3) }}</ANum>
                            </template>
                            <template #cell-gap="{ row: one }">
                                <span class="bad">
                                    <ANum>{{ num(one.gap, 3) }}</ANum>
                                </span>
                            </template>
                        </ADataTable>
                    </template>
                </section>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.drawer.levels') }}
                    </div>
                    <div class="a-kpis">
                        <AKpi :label="t('items.card.minLevel')" small>
                            <template #value>{{ qty(row.min) }}</template>
                        </AKpi>
                        <AKpi :label="t('items.card.maxLevel')" small>
                            <template #value>{{ qty(row.max) }}</template>
                        </AKpi>
                        <AKpi :label="t('planning.drawer.overMin')" small>
                            <template #value>{{ qty(row.overMin) }}</template>
                        </AKpi>
                        <AKpi :label="t('planning.drawer.leadTime')" small>
                            <template #value>{{
                                row.leadTime
                                    ? t('planning.drawer.days', {
                                          n: row.leadTime,
                                      })
                                    : '—'
                            }}</template>
                        </AKpi>
                    </div>
                    <p class="a-hint">{{ t('planning.drawer.levelsHint') }}</p>
                </section>

                <section v-if="row.remarks || row.internalNotes">
                    <div class="a-sect-t">{{ t('planning.col.remarks') }}</div>
                    <p v-if="row.remarks" class="remarks">{{ row.remarks }}</p>
                    <p v-if="row.internalNotes" class="remarks">
                        {{ row.internalNotes }}
                    </p>
                </section>
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.body {
    display: grid;
    gap: 18px;
}

.bars {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 3px;
}

.bar {
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr) 84px;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
}

.bar-track {
    position: relative;
    display: block;
    block-size: 14px;
    border-radius: 3px;
    background: var(--a-sunk);
    overflow: hidden;
}

.bar-fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    display: block;
    background: var(--a-accent);
    border-radius: 3px;
}

/* The part of the month that left as a direct sale of raw material rather than
   into a production run — the client's column 12, drawn on the same bar. */
.bar-direct {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    display: block;
    background: var(--a-amber);
    border-radius: 3px;
}

.bar-n {
    text-align: end;
}

.ok {
    margin: 0;
    color: var(--a-green);
    font-weight: 600;
}

.bad {
    margin: 0;
    color: var(--a-red);
    font-weight: 600;
}

.remarks {
    margin: 0 0 8px;
    white-space: pre-line;
    font-size: 13.5px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
