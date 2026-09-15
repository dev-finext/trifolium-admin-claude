<script setup>
// Closing a run: what came out, what went to waste, when the new batch
// expires, and — for components the operator counts by hand — how much was
// really used. Everything is pre-filled from the recipe and can be corrected.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { resolveExpiryMonths } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

const props = defineProps({
    order: { type: Object, required: true },
});

const emit = defineEmits(['close', 'completed']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const items = useItemsStore();
const store = useProductionStore();

const bom = items.bomById(props.order.bomId);
const wastePct = bom?.expectedWastePct || 0;
const months = resolveExpiryMonths({
    item: items.itemBySku(props.order.parentSku),
    prepType: items.prepTypeById(props.order.prepType),
    settings: dataset.data.inventorySettings,
});

const round2 = (value) => Math.round(value * 100) / 100;

const form = reactive({
    yieldQty: String(round2(props.order.plannedQty * (1 - wastePct / 100))),
    wasteQty: String(round2(props.order.plannedQty * (wastePct / 100))),
    expiresOn: isoDaysAgo(-(months || 24) * 30),
    note: '',
    actual: Object.fromEntries(
        props.order.components
            .filter((component) => component.issue === 'manual')
            .map((component) => [component.sku, String(component.plannedQty)]),
    ),
});

const saving = ref(false);

const manual = computed(() =>
    props.order.components.filter((component) => component.issue === 'manual'),
);

const ok = computed(() => Number(form.yieldQty) > 0 && Boolean(form.expiresOn));

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const order = await store.completeOrder(props.order.id, {
        yieldQty: Number(form.yieldQty),
        wasteQty: Number(form.wasteQty) || 0,
        expiresOn: form.expiresOn,
        actual: Object.fromEntries(
            Object.entries(form.actual).map(([sku, value]) => [
                sku,
                Number(value),
            ]),
        ),
        note: form.note,
    });

    saving.value = false;
    emit('completed', order);
}
</script>

<template>
    <AModal
        open
        :title="
            t('production.complete.title', {
                id: order.id,
                name: loc(order.name),
            })
        "
        :width="640"
        @close="emit('close')"
    >
        <div class="cm-grid">
            <div>
                <label class="a-lbl" for="cm-yield">{{
                    t('production.complete.yield')
                }}</label>
                <AInput
                    id="cm-yield"
                    v-model="form.yieldQty"
                    type="number"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.complete.yieldHint', {
                            qty: num(order.plannedQty),
                            uom: order.uom,
                        })
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cm-waste">{{
                    t('production.complete.waste')
                }}</label>
                <AInput
                    id="cm-waste"
                    v-model="form.wasteQty"
                    type="number"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        wastePct
                            ? t('production.complete.wasteHint', {
                                  pct: wastePct,
                              })
                            : t('production.complete.wasteNone')
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cm-exp">{{
                    t('production.complete.expiry')
                }}</label>
                <AInput
                    id="cm-exp"
                    v-model="form.expiresOn"
                    type="date"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.complete.expiryHint', {
                            months: months || 24,
                        })
                    }}
                </div>
            </div>
            <div v-for="component in manual" :key="component.sku">
                <label class="a-lbl" :for="`cm-${component.sku}`">
                    {{
                        t('production.complete.actual', {
                            name: loc(component.name),
                        })
                    }}
                </label>
                <AInput
                    :id="`cm-${component.sku}`"
                    v-model="form.actual[component.sku]"
                    type="number"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('production.complete.actualHint', {
                            qty: num(component.plannedQty),
                            uom: component.uom,
                        })
                    }}
                </div>
            </div>
            <div class="cm-wide">
                <label class="a-lbl" for="cm-note">{{
                    t('production.complete.note')
                }}</label>
                <ATextarea
                    id="cm-note"
                    v-model="form.note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="!ok || saving"
                @click="save"
            >
                {{ t('production.complete.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.cm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px 16px;
}

.cm-wide {
    grid-column: 1 / -1;
}
</style>
