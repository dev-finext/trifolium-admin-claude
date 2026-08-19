<script setup>
// Which batches a quantity comes out of.
//
// Batch selection for compounding is not a choice an agent makes: config
// BATCH_PICK says `fifo`, so the system takes from the batch nearest to expiry
// and spills into the next one, and the pharmacist approves that pick before any
// stock is deducted. This panel is that rule made visible — it computes the pick
// and shows the resulting balances without touching them.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemPicker from '@/components/inventory/ItemPicker.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import { BATCH_PICK } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The item the quantity is drawn from. */
    sku: { type: String, default: '' },
    qty: { type: [Number, String], default: '' },
    unit: { type: String, default: '' },
    /** Render the item and quantity inputs, rather than taking them as props. */
    controls: { type: Boolean, default: false },
    /** State the pharmacist gate — true where the pick feeds compounding. */
    approval: { type: Boolean, default: false },
});

const emit = defineEmits(['update:sku', 'update:qty']);

const { t } = useI18n();
const inventory = useInventoryStore();

const quantity = computed({
    get: () => String(props.qty ?? ''),
    set: (value) => emit('update:qty', value.replace(/\D/g, '')),
});

const item = computed(() => inventory.itemBySku(props.sku));
const unitKey = computed(() => props.unit || item.value?.unit || 'unit');
const asked = computed(() => Number(props.qty) || 0);
const plan = computed(() =>
    props.sku && asked.value > 0
        ? inventory.fifoPlan(props.sku, asked.value)
        : { steps: [], short: 0 },
);

const cols = computed(() => [
    { k: 'batch', label: t('inventory.pick.col.batch'), nowrap: true },
    { k: 'expiry', label: t('inventory.pick.col.expiry'), nowrap: true },
    { k: 'take', label: t('inventory.pick.col.take'), nowrap: true },
    { k: 'after', label: t('inventory.pick.col.after'), nowrap: true },
]);

const rows = computed(() =>
    plan.value.steps.map((step) => ({
        id: step.batch.id,
        batch: step.batch.id,
        expiry: fmtISO(step.batch.expiry),
        take: step.take,
        after: step.after,
    })),
);

const hasOpenBatches = computed(
    () => Boolean(props.sku) && inventory.openBatchesOf(props.sku).length > 0,
);
</script>

<template>
    <ACard :title="t('inventory.pick.title')" icon="layers" :pad="false">
        <template #right>
            <span class="a-pick-rule">
                {{ t('inventory.pick.fifo') }}
                <template
                    v-if="approval && BATCH_PICK.requiresPharmacistApproval"
                >
                    {{ t('inventory.pick.approval') }}
                </template>
            </span>
        </template>

        <div v-if="controls" class="a-pick-ctl">
            <div class="a-pick-ctl-i">
                <label class="a-lbl" for="pick-item">
                    {{ t('inventory.pick.item') }}
                </label>
                <ItemPicker
                    input-id="pick-item"
                    :model-value="sku"
                    :items="inventory.stock"
                    @update:model-value="emit('update:sku', $event)"
                />
            </div>
            <div class="a-pick-ctl-q">
                <label class="a-lbl" for="pick-qty">
                    {{ t('inventory.pick.qty') }}
                </label>
                <AInput
                    id="pick-qty"
                    v-model="quantity"
                    class="a-w100"
                    inputmode="numeric"
                    :placeholder="t(`inventory.unit.${unitKey}`)"
                />
            </div>
        </div>

        <ADataTable v-if="rows.length" :cols="cols" :rows="rows" row-key="id">
            <template #cell-batch="{ row }">
                <span class="t-strong num">{{ row.batch }}</span>
            </template>
            <template #cell-expiry="{ row }">
                <ANum>{{ row.expiry }}</ANum>
            </template>
            <template #cell-take="{ row }">
                <span class="num a-pick-take">−{{ num(row.take) }}</span>
                {{ t(`inventory.unit.${unitKey}`) }}
            </template>
            <template #cell-after="{ row }">
                <ANum>{{ num(row.after) }}</ANum>
            </template>
        </ADataTable>

        <div v-else class="a-pick-idle">
            <AEmpty
                icon="layers"
                :title="
                    sku && !hasOpenBatches
                        ? t('inventory.pick.noBatches')
                        : t('inventory.pick.idle')
                "
            />
        </div>

        <div v-if="rows.length" class="a-pick-sum">
            <div v-if="plan.short > 0" class="a-note a-note--warn">
                {{
                    t('inventory.pick.short', {
                        qty: num(plan.short),
                        unit: t(`inventory.unit.${unitKey}`),
                    })
                }}
            </div>
            <div v-else class="a-note a-note--ok">
                {{
                    t('inventory.pick.covered', { n: rows.length }, rows.length)
                }}
            </div>
        </div>
    </ACard>
</template>

<style scoped>
.a-pick-rule {
    font-size: 13.5px;
    color: var(--a-ink-3);
    max-width: 460px;
    line-height: 1.5;
}

.a-pick-ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--a-line);
}

.a-pick-ctl-i {
    flex: 1 1 280px;
    min-width: 0;
}

.a-pick-ctl-q {
    flex: 0 1 160px;
}

.a-pick-take {
    font-weight: 700;
    color: var(--a-red);
}

.a-pick-idle,
.a-pick-sum {
    padding: 18px;
}
</style>
