<script setup>
// רכש › ייצור פנימי — what the pharmacy makes instead of buying.
//
// Choose an item that has a recipe, say how much, and the screen answers the
// only question that matters before a run is opened: can it actually be made,
// and if not, what is missing. That answer is `producible()` in the planning
// store, which is the pharmacy's own arithmetic — one level deep, components
// against what is on the shelf now, with the units converted both ways because
// a tincture is counted in litres and made a thousand millilitres at a time.
//
// Then one button. "שלח למעבדה" prints the preparation sheet and issues the
// order, which is what reserves the components and puts the paper on the bench.
// The print is attempted first and never blocks the issue: a printer that is
// out of paper must not leave the lab without its order.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useProductionSheet } from '@/composables/useProductionSheet';
import { useToast } from '@/composables/useToast';
import { num } from '@/lib/money';
import { convertQty } from '@/lib/units';
import { useItemsStore } from '@/stores/items';
import { usePlanningStore } from '@/stores/planning';
import { useProductionStore } from '@/stores/production';

/** How many matches the type-ahead offers before it asks for more letters. */
const MATCHES = 8;

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const items = useItemsStore();
const planning = usePlanningStore();
const production = useProductionStore();
const { printProductionSheet } = useProductionSheet();

const query = ref('');
const chosen = ref(null);
const qty = ref('');
const busy = ref(false);

/** Only items the pharmacy has a recipe for can be produced here. */
const makeable = computed(() => items.rows.filter((row) => row.bomCount > 0));

const matches = computed(() => {
    const q = query.value.trim().toLowerCase();

    if (q.length < 2) {
        return [];
    }

    return makeable.value
        .filter(
            (row) =>
                row.sku.includes(q) ||
                (row.names?.he || '').toLowerCase().includes(q) ||
                (row.names?.en || '').toLowerCase().includes(q),
        )
        .slice(0, MATCHES);
});

function pick(row) {
    chosen.value = row;
    query.value = '';
    qty.value = '';
}

const recipe = computed(() =>
    chosen.value ? items.bomsOfParent(chosen.value.sku)[0] || null : null,
);

const amount = computed(() => Number(qty.value) || 0);

/** Can it be made, and what is short — the pharmacy's own arithmetic. */
const check = computed(() =>
    chosen.value && amount.value > 0
        ? planning.producible(chosen.value.sku, amount.value)
        : null,
);

const shortCols = computed(() => [
    { k: 'sku', label: t('production.make.shortSku'), nowrap: true },
    { k: 'name', label: t('production.make.shortName') },
    { k: 'need', label: t('production.make.shortNeed'), align: 'end' },
    { k: 'have', label: t('production.make.shortHave'), align: 'end' },
    { k: 'gap', label: t('production.make.shortGap'), align: 'end' },
]);

const canSend = computed(
    () => Boolean(chosen.value) && amount.value > 0 && check.value?.ok,
);

/**
 * Open the run and send it to the bench.
 *
 * The order is stated in the recipe's own unit, not in the unit the item is
 * counted in — the two are converted here rather than left to the lab.
 */
async function sendToLab() {
    if (!canSend.value || busy.value) {
        return;
    }

    busy.value = true;

    try {
        const plannedQty = convertQty(
            amount.value,
            chosen.value.uom?.stock || recipe.value.yield?.uom,
            recipe.value.yield?.uom,
        );

        if (plannedQty === null) {
            push({ title: t('production.make.unitMismatch'), bad: true });

            return;
        }

        const order = await production.createOrder({
            bomId: recipe.value.id,
            plannedQty,
        });

        // The paper first, the state second — but a browser that blocks the
        // window must not keep the order off the bench.
        if (!printProductionSheet(order)) {
            push({ title: t('production.make.printFailed'), bad: true });
        }

        await production.issueOrder(order.id);

        push({
            title: t('production.make.sent', { id: order.id }),
            body: t('production.make.sentBody', {
                qty: num(plannedQty, 3),
                unit: t(`inventory.unit.${order.uom}`),
            }),
        });

        chosen.value = null;
        qty.value = '';
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <div class="ip">
        <!-- What to make -->
        <div class="a-pane ip-pick">
            <div class="ip-find">
                <label class="a-lbl" for="ip-find">
                    {{ t('production.make.what') }}
                </label>
                <AInput
                    id="ip-find"
                    v-model="query"
                    :placeholder="t('production.make.whatPlaceholder')"
                    class="a-w100"
                />
                <div class="a-hint">{{ t('production.make.whatHint') }}</div>
                <ul v-if="matches.length" class="ip-matches">
                    <li v-for="row in matches" :key="row.sku">
                        <button type="button" @click="pick(row)">
                            <span class="a-code a-tag">{{ row.sku }}</span>
                            <span class="ip-match-n">{{ row.names?.he }}</span>
                        </button>
                    </li>
                </ul>
            </div>

            <div v-if="chosen" class="a-fields ip-qty">
                <label class="a-field">
                    <span>
                        {{
                            t('production.make.qty', {
                                unit: t(
                                    `inventory.unit.${chosen.uom?.stock || 'unit'}`,
                                ),
                            })
                        }}
                    </span>
                    <AInput v-model="qty" type="number" min="0" ltr />
                </label>
            </div>
        </div>

        <AEmpty
            v-if="!chosen"
            icon="beaker"
            :title="t('production.make.emptyTitle')"
            :sub="t('production.make.emptySub')"
        />

        <template v-else>
            <!-- What was chosen -->
            <div class="a-pane ip-chosen">
                <div>
                    <div class="t-strong">{{ chosen.names?.he }}</div>
                    <div class="t-sub">
                        <ANum class="a-code a-tag">{{ chosen.sku }}</ANum>
                        <span v-if="recipe" class="ip-recipe">
                            {{ loc(recipe.name) }} ·
                            {{
                                t('production.make.batch', {
                                    qty: num(recipe.yield?.qty || 1, 3),
                                    unit: t(
                                        `inventory.unit.${recipe.yield?.uom || 'unit'}`,
                                    ),
                                })
                            }}
                        </span>
                    </div>
                </div>
                <AButton class="a-push" sm @click="chosen = null">
                    {{ t('production.make.clear') }}
                </AButton>
            </div>

            <!-- Can it be made -->
            <div
                v-if="check"
                class="a-pane ip-verdict"
                :class="{ 'is-ok': check.ok }"
            >
                <template v-if="check.ok">
                    {{ t('production.make.canMake') }}
                </template>
                <template v-else-if="check.reason === 'unitMismatch'">
                    {{ t('production.make.unitMismatch') }}
                </template>
                <template v-else-if="check.reason === 'noRecipe'">
                    {{ t('production.make.noRecipe') }}
                </template>
                <template v-else>
                    {{
                        t(
                            'production.make.cannotMake',
                            { n: check.short.length },
                            check.short.length,
                        )
                    }}
                </template>
            </div>

            <div v-if="check && check.short.length" class="a-tablewrap">
                <ADataTable :cols="shortCols" :rows="check.short" row-key="sku">
                    <template #cell-sku="{ row }">
                        <ANum class="a-code">{{ row.sku }}</ANum>
                    </template>
                    <template #cell-name="{ row }">{{
                        loc(row.name)
                    }}</template>
                    <template #cell-need="{ row }">
                        <ANum
                            >{{ row.need === null ? '—' : num(row.need, 3) }}
                            {{ t(`inventory.unit.${row.unit}`) }}</ANum
                        >
                    </template>
                    <template #cell-have="{ row }">
                        <ANum>{{ num(row.have, 3) }}</ANum>
                    </template>
                    <template #cell-gap="{ row }">
                        <ANum class="ip-gap">{{
                            row.gap === null ? '—' : num(row.gap, 3)
                        }}</ANum>
                    </template>
                </ADataTable>
            </div>

            <!-- Out -->
            <div class="a-pane ip-foot">
                <span v-if="!amount" class="t-sub">
                    {{ t('production.make.needQty') }}
                </span>
                <AButton
                    class="a-push"
                    kind="p"
                    icon="printer"
                    :disabled="!canSend || busy"
                    @click="sendToLab"
                >
                    {{ t('production.make.send') }}
                </AButton>
            </div>
        </template>
    </div>
</template>

<style scoped>
.ip-pick,
.ip-chosen,
.ip-verdict,
.ip-foot {
    display: flex;
    align-items: end;
    gap: 18px;
    flex-wrap: wrap;
}

.ip-find {
    position: relative;
    flex: 1 1 380px;
    min-width: 0;
}

.ip-find .a-hint {
    margin: 4px 0 0;
}

.ip-matches {
    position: absolute;
    z-index: 5;
    inset-inline: 0;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--a-surface);
    border: 1px solid var(--a-line);
    border-radius: 9px;
    box-shadow: 0 12px 30px rgb(24 32 22 / 14%);
    max-height: 260px;
    overflow-y: auto;
}

.ip-matches button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border: 0;
    border-radius: 7px;
    background: none;
    font: inherit;
    text-align: start;
    cursor: pointer;
}

.ip-matches button:hover {
    background: var(--a-hover);
}

.ip-match-n {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ip-qty {
    --a-field-w: 180px;
    flex: 0 0 auto;
    width: 200px;
}

.ip-chosen,
.ip-verdict,
.ip-foot {
    align-items: center;
}

.ip-recipe {
    margin-inline-start: 8px;
}

/* The verdict is the screen's answer, so it looks like one. */
.ip-verdict {
    font-weight: 600;
    color: var(--a-red);
    background: var(--a-red-bg);
}

.ip-verdict.is-ok {
    color: var(--a-green);
    background: var(--a-green-bg);
}

.ip-gap {
    color: var(--a-red);
    font-weight: 600;
}
</style>
