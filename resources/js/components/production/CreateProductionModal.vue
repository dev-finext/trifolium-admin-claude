<script setup>
// Opening a production order: pick the recipe, say how much, and see before
// saving which batches each component would be drawn from — and where the
// stock falls short.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
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

const bom = computed(() => (bomId.value ? items.bomById(bomId.value) : null));

/** Every recipe, the ones sized as a production run first. */
const bomOptions = computed(() => [
    { value: '', label: t('production.create.bomChoose') },
    ...[...items.boms]
        .sort((a, b) => (b.yield?.qty || 1) - (a.yield?.qty || 1))
        .map((row) => ({
            value: row.id,
            label: `${loc(row.name)} · ${row.parentSku}`,
        })),
]);

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

const plan = computed(() =>
    bom.value && qtyNumber.value > 0
        ? store.planComponents(bom.value, qtyNumber.value)
        : [],
);

const shortages = computed(() => plan.value.filter((row) => row.short > 0));

const ok = computed(() => Boolean(bom.value) && qtyNumber.value > 0);

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const order = await store.createOrder({
        bomId: bom.value.id,
        plannedQty: qtyNumber.value,
        notes: notes.value,
    });

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
                    t('production.create.bom')
                }}</label>
                <ASelect
                    id="cp-bom"
                    v-model="bomId"
                    :options="bomOptions"
                    class="a-w100"
                />
                <div v-if="bom" class="a-hint">
                    {{
                        t('production.create.recipeHint', {
                            qty: num(bom.yield?.qty || 1),
                            uom: bom.yield?.uom || '',
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
                                  uom: bom.yield?.uom || '',
                              })
                            : ''
                    }}
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
                    <tr v-for="row in plan" :key="row.sku">
                        <td>
                            <div class="t-strong">{{ loc(row.name) }}</div>
                            <div class="t-sub num">{{ row.sku }}</div>
                        </td>
                        <td class="nowrap">
                            <ANum>{{ num(row.plannedQty) }}</ANum> {{ row.uom }}
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
                                {{ row.stockUnit }}
                            </span>
                            <AChip
                                v-if="row.short"
                                tone="red"
                                size="sm"
                                class="cp-short"
                            >
                                {{
                                    t('production.drawer.short', {
                                        qty: num(row.short, 2),
                                        uom: row.stockUnit,
                                    })
                                }}
                            </AChip>
                            <span v-else-if="!row.picks.length" class="t-sub">
                                {{ t('production.drawer.noBatch') }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div v-if="shortages.length" class="a-note a-note--warn cp-note">
                {{ t('production.create.shortage', { n: shortages.length }) }}
            </div>
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

.cp-short {
    margin-inline-start: 4px;
}

.cp-note {
    margin-top: 10px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
