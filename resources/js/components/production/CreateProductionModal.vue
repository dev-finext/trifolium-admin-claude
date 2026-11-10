<script setup>
// Opening a production order: pick the product, say how much, and see before
// saving which batches each component would be drawn from. The order goes down
// to the lab as it is saved — there is no planned stage — so its components
// are reserved at once.
//
// The quantity is in the item's own unit of measure, off its card, and the
// form says which unit that is without letting it be changed: a litre of
// tincture is a litre whatever unit the recipe happens to be written in.
//
// The product, not the recipe. SAP's production order names an item and loads
// that item's bill of materials — `OITT` has one row per item code, 2,121 of
// them, so a recipe and the thing it makes are the same choice.
//
// Nothing here refuses a run whose components are short. SAP does not either:
// 149 of its released orders have 146 component lines not yet drawn, because
// the shelf is answered for when the goods issue is posted and not when the
// order is written. What the preview shows is what would be drawn — a
// statement, not a verdict.
//
// The preview carries each component's stock the way SAP's own production
// order does — on hand and available — and two more answers the decision is
// made from: how much will be left on the shelf once this run draws its
// share, and whether more is already on its way from a supplier, how much,
// and on which order: "רואים את כל הפרטי בנים ... ואת מצב המלאי שלהם, כולל
// פרטים על כמות מוזמנת".
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BomPicker from '@/components/production/BomPicker.vue';
import ComponentBatchPicker from '@/components/production/ComponentBatchPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { lineOutstanding, productionDueDays } from '@/config';
import { toStockUnits } from '@/demo/production';
import { num, qtyText } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { standingNotesOf, useProductionStore } from '@/stores/production';

const props = defineProps({
    /** A recipe to start from, when the page was reached from one. */
    bomId: { type: String, default: '' },
});

const emit = defineEmits(['close', 'created']);

const { t } = useI18n();
const { loc } = useLocalized();
const items = useItemsStore();
const inventory = useInventoryStore();
const store = useProductionStore();
const buying = useBuyingStore();

const bomId = ref(props.bomId || '');
const qty = ref('');
const labNote = ref('');
const internalNote = ref('');
const dueOn = ref('');
const saving = ref(false);

/**
 * Hand-picked allocations, by component SKU, replacing FEFO for that one
 * row — Natalie's ask to see the rest of the shelf and choose from it, not
 * just where FEFO landed.
 */
const manualPicks = ref({});
/** Which component row has its batch picker open, at most one at a time. */
const expandedSku = ref('');

watch(bomId, () => {
    manualPicks.value = {};
    expandedSku.value = '';
});

const bom = computed(() => (bomId.value ? items.bomById(bomId.value) : null));

/** The item's own unit of measure — the unit the quantity is written in. */
const uom = computed(() => (bom.value ? store.unitFor(bom.value) : ''));

const uomLabel = computed(() =>
    uom.value ? t(`inventory.unit.${uom.value}`) : '',
);

/** One run of the recipe, restated in the item's own unit. */
const runQty = computed(() =>
    bom.value
        ? toStockUnits(
              bom.value.yield?.qty || 1,
              bom.value.yield?.uom,
              uom.value,
          )
        : 1,
);

/** The preparation type's own target figure, when it has one. */
const dueDays = computed(() =>
    bom.value
        ? productionDueDays(items.prepTypeById(bom.value.prepType))
        : null,
);

const prepName = computed(() => {
    const type = bom.value ? items.prepTypeById(bom.value.prepType) : null;

    return type ? loc(type.name) : '';
});

// The date starts where the preparation's figure puts it and is the person's
// to move; picking another product starts it over.
watch(
    bom,
    (next) => {
        dueOn.value = next ? store.dueOnFor(next) || '' : '';
    },
    { immediate: true },
);

/**
 * What the item card says to every run of this item — copied onto the order
 * when it is saved, and shown here so nobody types it again as a one-off.
 */
const standing = computed(() =>
    bom.value
        ? standingNotesOf(items.itemBySku(bom.value.parentSku), bom.value)
        : { item: null, recipe: null },
);

/** A component's stock as the item card has it, in the unit it is held in. */
function stockOf(sku) {
    const row = items.rowBySku(sku);

    return {
        onHand: row?.onHand ?? null,
        avail: row?.avail ?? null,
        onOrder: row?.onOrder ?? 0,
    };
}

/** Every product the pharmacy has a recipe for, searchable by name or SKU. */
const productOptions = computed(() =>
    [...items.boms]
        .map((row) => ({
            value: row.id,
            name: row.name,
            sku: row.parentSku,
        }))
        .sort((a, b) => loc(a.name).localeCompare(loc(b.name), 'he')),
);

watch(bom, (next) => {
    if (next && !qty.value) {
        qty.value = String(runQty.value);
    }
});

if (bom.value) {
    qty.value = String(runQty.value);
}

const qtyNumber = computed(() => Number(qty.value) || 0);
const runs = computed(() => (bom.value ? store.canProduce(bom.value) : 0));

/** Mirrors planComponents' own gate on drawing from waste batches. */
const allowWaste = computed(() =>
    Boolean(items.prepTypeById(bom.value?.prepType)?.acceptsWaste),
);

const plan = computed(() =>
    bom.value && qtyNumber.value > 0
        ? store.planComponents(
              bom.value,
              qtyNumber.value,
              manualPicks.value,
              uom.value,
          )
        : [],
);

/** What this run draws of one component, in the unit its shelf counts in. */
const needOf = (row) => toStockUnits(row.plannedQty, row.uom, row.stockUnit);

/**
 * What is left on the shelf once this run draws its share — on hand less
 * what it takes. Below zero is what the shelf does not have.
 */
function leftAfter(row) {
    const onHand = stockOf(row.sku).onHand;

    return onHand == null
        ? null
        : Math.round((onHand - needOf(row)) * 1000) / 1000;
}

/**
 * Whether more of a component is on its way from a supplier: the quantity on
 * order — the item card's own figure, which counts every order sent and not
 * yet received — the orders this console sent it on, and any draft still
 * waiting to go out, which is not counted until it is sent.
 */
function supplierOrders(sku) {
    const sent = [];
    const drafts = [];

    buying.listsOf('order').forEach((list) => {
        const lines = list.lines.filter((line) => line.sku === sku);

        if (!lines.length) {
            return;
        }

        if (list.state === 'sent') {
            const due = lines.reduce(
                (sum, line) =>
                    sum + lineOutstanding(line) * (Number(line.numInBuy) || 1),
                0,
            );

            if (due > 0) {
                sent.push(list.number);
            }
        } else if (list.state === 'draft') {
            drafts.push(list.number);
        }
    });

    return { qty: stockOf(sku).onOrder || 0, sent, drafts };
}

const ok = computed(() => Boolean(bom.value) && qtyNumber.value > 0);

function batchesFor(sku) {
    return inventory.openBatchesOf(sku, { allowWaste: allowWaste.value });
}

function toggleManual(sku) {
    expandedSku.value = expandedSku.value === sku ? '' : sku;
}

function onPicksChange(sku, picks) {
    if (picks === null) {
        delete manualPicks.value[sku];

        return;
    }

    manualPicks.value[sku] = picks;
}

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const order = await store.createOrder({
        bomId: bom.value.id,
        plannedQty: qtyNumber.value,
        labNote: labNote.value,
        internalNote: internalNote.value,
        dueOn: dueOn.value || null,
        overrides: manualPicks.value,
    });

    saving.value = false;
    emit('created', order);
}
</script>

<template>
    <AModal
        open
        :title="t('production.create.title')"
        :width="940"
        @close="emit('close')"
    >
        <div class="cp-grid">
            <div class="cp-wide">
                <label class="a-lbl" for="cp-bom">{{
                    t('production.create.product')
                }}</label>
                <BomPicker
                    input-id="cp-bom"
                    v-model="bomId"
                    :options="productOptions"
                />
                <div v-if="bom" class="a-hint">
                    {{
                        t('production.create.recipeHint', {
                            qty: num(bom.yield?.qty || 1),
                            uom: bom.yield?.uom
                                ? t(`inventory.unit.${bom.yield.uom}`)
                                : '',
                            runs,
                        })
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cp-qty">{{
                    t('production.create.qty')
                }}</label>
                <AInput
                    id="cp-qty"
                    v-model="qty"
                    type="number"
                    ltr
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="cp-uom">{{
                    t('production.create.uom')
                }}</label>
                <AInput
                    id="cp-uom"
                    :model-value="uomLabel"
                    readonly
                    disabled
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t('production.create.uomHint') }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cp-due">{{
                    t('production.create.due')
                }}</label>
                <AInput
                    id="cp-due"
                    v-model="dueOn"
                    type="date"
                    ltr
                    class="a-w100"
                />
                <div v-if="bom" class="a-hint">
                    {{
                        dueDays
                            ? t('production.create.dueHint', {
                                  n: dueDays,
                                  type: prepName,
                              })
                            : t('production.create.dueNone', {
                                  type: prepName,
                              })
                    }}
                </div>
            </div>
            <div v-if="bom" class="cp-wide">
                <div class="a-lbl">{{ t('production.notes.standing') }}</div>
                <div
                    v-if="standing.item || standing.recipe"
                    class="a-note a-note--info cp-standing"
                >
                    <div v-if="standing.item">
                        <span class="cp-src">{{
                            t('production.notes.fromItem')
                        }}</span>
                        <span class="cp-text">{{ standing.item }}</span>
                    </div>
                    <div v-if="standing.recipe">
                        <span class="cp-src">{{
                            t('production.notes.fromRecipe')
                        }}</span>
                        <span class="cp-text">{{ loc(standing.recipe) }}</span>
                    </div>
                </div>
                <div v-else class="t-sub">
                    {{ t('production.notes.standingNone') }}
                </div>
                <div class="a-hint">
                    {{ t('production.notes.standingHint') }}
                </div>
            </div>
            <div class="cp-wide">
                <label class="a-lbl" for="cp-notes">{{
                    t('production.notes.lab')
                }}</label>
                <ATextarea
                    id="cp-notes"
                    v-model="labNote"
                    class="a-w100"
                    :rows="2"
                    :placeholder="t('production.notes.labPlaceholder')"
                />
                <div class="a-hint">{{ t('production.notes.labHint') }}</div>
            </div>
            <div class="cp-wide">
                <label class="a-lbl" for="cp-internal">{{
                    t('production.notes.internal')
                }}</label>
                <ATextarea
                    id="cp-internal"
                    v-model="internalNote"
                    class="a-w100"
                    :rows="2"
                    :placeholder="t('production.notes.internalPlaceholder')"
                />
                <div class="a-hint">
                    {{ t('production.notes.internalHint') }}
                </div>
            </div>
        </div>

        <div v-if="plan.length" class="cp-plan">
            <div class="a-sect-t">{{ t('production.create.preview') }}</div>
            <table class="a-table">
                <thead>
                    <tr>
                        <th scope="col">
                            {{ t('production.drawer.compItem') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('production.drawer.compPlanned') }}
                        </th>
                        <th scope="col" class="nowrap cp-n">
                            {{ t('production.stock.onHand') }}
                        </th>
                        <th scope="col" class="nowrap cp-n">
                            {{ t('production.stock.avail') }}
                        </th>
                        <th scope="col" class="nowrap cp-n">
                            {{ t('production.stock.leftAfter') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('production.stock.supplierOrder') }}
                        </th>
                        <th scope="col">
                            {{ t('production.drawer.compPicks') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="row in plan" :key="row.sku">
                        <tr>
                            <td>
                                <div class="t-strong">{{ loc(row.name) }}</div>
                                <div class="t-sub num">{{ row.sku }}</div>
                            </td>
                            <td class="nowrap">
                                <ANum>{{ num(row.plannedQty) }}</ANum>
                                {{ t(`inventory.unit.${row.uom}`) }}
                            </td>
                            <td class="nowrap cp-n">
                                <template
                                    v-if="stockOf(row.sku).onHand != null"
                                >
                                    <ANum>{{
                                        qtyText(stockOf(row.sku).onHand, 3)
                                    }}</ANum>
                                    {{ t(`inventory.unit.${row.stockUnit}`) }}
                                </template>
                                <span v-else class="t-sub">—</span>
                            </td>
                            <td class="nowrap cp-n">
                                <template v-if="stockOf(row.sku).avail != null">
                                    <ANum
                                        :class="{
                                            'cp-low':
                                                stockOf(row.sku).avail <
                                                needOf(row),
                                        }"
                                        >{{
                                            qtyText(stockOf(row.sku).avail, 3)
                                        }}</ANum
                                    >
                                    {{ t(`inventory.unit.${row.stockUnit}`) }}
                                </template>
                                <span v-else class="t-sub">—</span>
                            </td>
                            <td class="nowrap cp-n">
                                <template v-if="leftAfter(row) != null">
                                    <ANum
                                        :class="{
                                            'cp-low': leftAfter(row) < 0,
                                        }"
                                        >{{ qtyText(leftAfter(row), 3) }}</ANum
                                    >
                                    {{ t(`inventory.unit.${row.stockUnit}`) }}
                                </template>
                                <span v-else class="t-sub">—</span>
                            </td>
                            <td>
                                <template
                                    v-if="supplierOrders(row.sku).qty > 0"
                                >
                                    <span class="cp-yes">{{
                                        t('production.stock.supplierYes')
                                    }}</span>
                                    ·
                                    <ANum>{{
                                        qtyText(supplierOrders(row.sku).qty, 3)
                                    }}</ANum>
                                    {{ t(`inventory.unit.${row.stockUnit}`) }}
                                    <div
                                        v-if="
                                            supplierOrders(row.sku).sent.length
                                        "
                                        class="t-sub"
                                    >
                                        {{
                                            t('production.stock.supplierOn', {
                                                list: supplierOrders(
                                                    row.sku,
                                                ).sent.join(', '),
                                            })
                                        }}
                                    </div>
                                </template>
                                <span v-else class="t-sub">{{
                                    t('production.stock.supplierNo')
                                }}</span>
                                <div
                                    v-if="supplierOrders(row.sku).drafts.length"
                                    class="t-sub"
                                >
                                    {{
                                        t('production.stock.supplierDraft', {
                                            list: supplierOrders(
                                                row.sku,
                                            ).drafts.join(', '),
                                        })
                                    }}
                                </div>
                            </td>
                            <td>
                                <span
                                    v-for="pick in row.picks"
                                    :key="pick.batch"
                                    class="cp-pick"
                                >
                                    <span class="a-code a-tag">{{
                                        inventory.batchNo(pick.batch)
                                    }}</span>
                                    <ANum>{{ num(pick.qty, 2) }}</ANum>
                                    {{ t(`inventory.unit.${row.stockUnit}`) }}
                                </span>
                                <span v-if="row.short" class="cp-uncovered">
                                    {{
                                        t('production.drawer.short', {
                                            qty: num(row.short, 2),
                                            uom: t(
                                                `inventory.unit.${row.stockUnit}`,
                                            ),
                                        })
                                    }}
                                </span>
                                <span
                                    v-else-if="!row.picks.length"
                                    class="t-sub"
                                >
                                    {{ t('production.drawer.noBatch') }}
                                </span>
                                <AButton
                                    sm
                                    kind="ghost"
                                    icon="layers"
                                    class="cp-manual-btn"
                                    @click="toggleManual(row.sku)"
                                >
                                    {{
                                        manualPicks[row.sku]
                                            ? t('production.create.pick.auto')
                                            : t('production.create.pick.manual')
                                    }}
                                </AButton>
                            </td>
                        </tr>
                        <tr v-if="expandedSku === row.sku" class="cp-pick-row">
                            <td colspan="7">
                                <ComponentBatchPicker
                                    :name="row.name"
                                    :batches="batchesFor(row.sku)"
                                    :needed="
                                        toStockUnits(
                                            row.plannedQty,
                                            row.uom,
                                            row.stockUnit,
                                        )
                                    "
                                    :uom="t(`inventory.unit.${row.stockUnit}`)"
                                    :model-value="manualPicks[row.sku] || []"
                                    @update:model-value="
                                        onPicksChange(row.sku, $event)
                                    "
                                />
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="save"
                :disabled="!ok || saving"
                @click="save"
            >
                {{ t('production.create.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.cp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 16px;
}

.cp-wide {
    grid-column: 1 / -1;
}

.cp-plan {
    margin-top: 18px;
    /* Seven columns do not fit a phone; the table scrolls, the form does not. */
    overflow-x: auto;
}

.cp-pick {
    display: inline-flex;
    gap: 5px;
    align-items: baseline;
    margin-inline-end: 12px;
}

.cp-manual-btn {
    display: block;
    margin-top: 4px;
}

.cp-pick-row td {
    padding-top: 0;
    background: var(--a-bg-2, transparent);
}

/* What an open batch does not cover. Said plainly: it does not stop the run. */
.cp-uncovered {
    margin-inline-start: 4px;
    color: var(--a-ink-4);
}

.cp-n {
    text-align: end;
}

/* Less available than this run needs — the reason to look at "on order". */
.cp-low {
    color: var(--a-red);
    font-weight: 600;
}

/* More is on its way from a supplier. */
.cp-yes {
    font-weight: 600;
}

.cp-standing {
    display: grid;
    gap: 6px;
    margin-top: 4px;
    white-space: pre-line;
}

.cp-src {
    font-weight: 600;
    margin-inline-end: 6px;
}

.cp-text {
    unicode-bidi: plaintext;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
