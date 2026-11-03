<script setup>
// Opening a production order: pick the product, say how much, choose whether it
// is planned or goes down to the lab now, and see before saving which batches
// each component would be drawn from.
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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BomPicker from '@/components/production/BomPicker.vue';
import ComponentBatchPicker from '@/components/production/ComponentBatchPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { toStockUnits } from '@/demo/production';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

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

const bomId = ref(props.bomId || '');
const qty = ref('');
const notes = ref('');
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

/**
 * Where the order starts its life — SAP's own two opening statuses.
 *
 * Planned is a run that is written down and holds nothing; released takes the
 * components and sends the paper to the bench. The pharmacy's own history is
 * almost entirely released (149 against 2 planned), but both exist and the
 * screen should not decide for the person opening it.
 */
const startState = ref('planned');

const startOptions = computed(() => [
    { value: 'planned', label: t('production.state.planned') },
    { value: 'issued', label: t('production.state.issued') },
]);

const bom = computed(() => (bomId.value ? items.bomById(bomId.value) : null));

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
        qty.value = String(next.yield?.qty || 1);
    }
});

if (bom.value) {
    qty.value = String(bom.value.yield?.qty || 1);
}

const qtyNumber = computed(() => Number(qty.value) || 0);
const runs = computed(() => (bom.value ? store.canProduce(bom.value) : 0));

/** Mirrors planComponents' own gate on drawing from waste batches. */
const allowWaste = computed(() =>
    Boolean(items.prepTypeById(bom.value?.prepType)?.acceptsWaste),
);

const plan = computed(() =>
    bom.value && qtyNumber.value > 0
        ? store.planComponents(bom.value, qtyNumber.value, manualPicks.value)
        : [],
);

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
        notes: notes.value,
        overrides: manualPicks.value,
    });

    // Released means the components are taken and the run is at the bench; the
    // order is written first either way, so the two states share one path.
    if (startState.value === 'issued') {
        await store.issueOrder(order.id);
    }

    saving.value = false;
    emit('created', order);
}
</script>

<template>
    <AModal
        open
        :title="t('production.create.title')"
        :width="760"
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
                <div class="a-hint">
                    {{
                        bom
                            ? t('production.create.qtyHint', {
                                  uom: bom.yield?.uom
                                      ? t(`inventory.unit.${bom.yield.uom}`)
                                      : '',
                              })
                            : ''
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cp-start">{{
                    t('production.create.start')
                }}</label>
                <ASelect
                    id="cp-start"
                    v-model="startState"
                    :options="startOptions"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t(`production.create.startHint.${startState}`) }}
                </div>
            </div>
            <div class="cp-wide">
                <label class="a-lbl" for="cp-notes">{{
                    t('production.create.notes')
                }}</label>
                <ATextarea
                    id="cp-notes"
                    v-model="notes"
                    class="a-w100"
                    :rows="2"
                />
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
                            <td colspan="3">
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

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
