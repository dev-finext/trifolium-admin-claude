<script setup>
// One compounded formula on an order: an expandable card with its own
// preparation stage, its recipe, its dose, and the two note blocks — one for
// the pharmacy, one printed on the customer's label.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ItemStageChip from '@/components/ui/ItemStageChip.vue';
import { useLocalized } from '@/composables/useLocalized';

/** A ratio bar's fill, scaled so the largest realistic share fills it. */
const RATIO_BAR_SCALE = 2.6;

const props = defineProps({
    order: { type: Object, required: true },
    item: { type: Object, required: true },
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle', 'cancel']);

const { t } = useI18n();
const { loc } = useLocalized();

const cancelled = computed(() => props.item.stage === 'cancelled');

const done = computed(() =>
    ['shipped', 'delivered'].includes(props.item.stage),
);

const meta = computed(() =>
    t('orders.value.itemMeta', {
        type: t(`preparationForm.${props.item.typeId}`),
        vol: props.item.vol,
        unit: t(`orders.unit.${props.item.unit}`),
        use: t(`orders.use.${props.item.use}`),
        herbs: t('orders.value.herbCount', { n: props.item.herbs.length }),
    }),
);

const detailRows = computed(() => [
    [t('orders.col.customer'), loc(props.order.patient.name)],
    [t('orders.field.prepType'), t(`preparationForm.${props.item.typeId}`)],
    [
        t('orders.field.quantity'),
        t('orders.value.quantity', {
            vol: props.item.vol,
            unit: t(`orders.unit.${props.item.unit}`),
            packages: props.item.packages,
        }),
    ],
    props.item.evap && [
        t('orders.field.evaporation'),
        t(`orders.evaporation.${props.item.evap}`),
    ],
]);

const doseRows = computed(() => [
    [
        t('orders.field.dailyDose'),
        t('orders.value.dose', {
            qty: props.item.dose.qty,
            unit: t(`orders.unit.${props.item.dose.unit}`),
            times: props.item.dose.times,
        }),
    ],
    [t('orders.field.timing'), t(`orders.doseTiming.${props.item.timing}`)],
]);

const herbCols = computed(() => [
    { k: 'heb', label: t('orders.itemsTab.herbCol') },
    { k: 'cn', label: t('orders.itemsTab.chineseCol') },
    { k: 'qty', label: t('orders.itemsTab.qtyCol'), nowrap: true },
    { k: 'pct', label: t('orders.itemsTab.ratioCol') },
]);

function barWidth(share) {
    return `${Math.min(100, share * RATIO_BAR_SCALE)}%`;
}
</script>

<template>
    <div class="a-icard" :class="{ 'is-off': cancelled }">
        <div class="a-icard-h">
            <button
                type="button"
                class="a-icard-x"
                :aria-expanded="open"
                :aria-label="
                    open
                        ? t('orders.itemsTab.collapse')
                        : t('orders.itemsTab.expand')
                "
                @click="emit('toggle')"
            >
                <AIcon
                    :name="open ? 'chevron_down' : 'chevron_left'"
                    :size="18"
                />
            </button>
            <div class="a-icard-id">
                <div class="a-icard-t">{{ loc(item.name) }}</div>
                <div class="t-sub">{{ meta }}</div>
            </div>
            <div class="a-icard-chips">
                <ItemStageChip :stage="item.stage" />
                <AChip v-if="item.pharm" tone="green" size="sm">
                    {{ t('orders.itemsTab.pharmApproved') }}
                </AChip>
            </div>
            <div class="a-push a-icard-act">
                <AButton
                    v-if="!cancelled && !done"
                    sm
                    kind="danger"
                    icon="x"
                    @click="emit('cancel', item)"
                >
                    {{ t('orders.itemsTab.cancelItem') }}
                </AButton>
            </div>
        </div>

        <div v-if="open" class="a-icard-b">
            <div class="a-2col a-icard-kv">
                <AKeyValue :rows="detailRows" />
                <AKeyValue :rows="doseRows">
                    <dt>{{ t('orders.field.itemStage') }}</dt>
                    <dd><ItemStageChip :stage="item.stage" size="sm" /></dd>
                    <dt>{{ t('orders.field.pharmApproval') }}</dt>
                    <dd>
                        <template v-if="item.pharm">
                            <AChip tone="green" size="sm">
                                {{ t('orders.itemsTab.pharmApprovedShort') }}
                            </AChip>
                            <span class="a-icard-pharm">
                                {{ loc(item.pharm.by) }} ·
                                <ANum>{{ item.pharm.when.stamp }}</ANum>
                            </span>
                        </template>
                        <AChip v-else tone="amber" size="sm">
                            {{ t('orders.itemsTab.pharmPending') }}
                        </AChip>
                    </dd>
                </AKeyValue>
            </div>

            <div class="a-icard-herbs">
                <ADataTable
                    :cols="herbCols"
                    :rows="item.herbs"
                    :row-key="(herb) => `${item.id}-${herb.id}`"
                >
                    <template #cell-heb="{ row }">
                        <div class="t-strong">{{ loc(row.name) }}</div>
                        <div class="t-sub ltr">{{ row.lat }}</div>
                    </template>
                    <template #cell-cn="{ row }">
                        <span class="a-icard-cn">
                            {{ row.cn || t('orders.value.none') }}
                        </span>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ row.qty }}</ANum>
                        {{ t(`orders.unit.${item.unit}`) }}
                    </template>
                    <template #cell-pct="{ row }">
                        <div class="a-ratio">
                            <div class="a-ratio-track">
                                <div
                                    class="a-ratio-fill"
                                    :style="{ width: barWidth(row.pct) }"
                                />
                            </div>
                            <ANum>{{ row.pct }}%</ANum>
                        </div>
                    </template>
                </ADataTable>
            </div>

            <div class="a-2col a-icard-notes">
                <div>
                    <div class="a-lbl">
                        {{ t('orders.itemsTab.internalNotes') }}
                        <span class="a-lbl-soft">
                            {{ t('orders.itemsTab.internalNotesNote') }}
                        </span>
                    </div>
                    <div class="a-icard-note a-icard-note--internal">
                        {{ loc(item.internalNotes) }}
                    </div>
                </div>
                <div>
                    <div class="a-lbl">
                        {{ t('orders.itemsTab.externalNotes') }}
                        <span class="a-lbl-soft">
                            {{ t('orders.itemsTab.externalNotesNote') }}
                        </span>
                    </div>
                    <div class="a-icard-note a-icard-note--label">
                        {{ loc(item.externalNotes) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.a-icard-id {
    min-width: 0;
}

.a-icard-chips,
.a-icard-act {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.a-icard-kv {
    gap: 18px;
}

.a-icard-pharm {
    margin-inline-start: 6px;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.a-icard-herbs {
    margin-top: 18px;
}

.a-icard-cn {
    font-size: 14px;
}

.a-ratio {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 150px;
}

.a-ratio-track {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: var(--a-sunk);
}

.a-ratio-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--a-accent);
}

.a-icard-notes {
    gap: 18px;
    margin-top: 18px;
}

.a-lbl-soft {
    color: var(--a-ink-4);
    font-weight: 400;
}

.a-icard-note {
    padding: 14px 16px;
    font-size: 15px;
    line-height: 1.65;
}

.a-icard-note--internal {
    border-radius: 12px;
    background: var(--a-sunk);
}

.a-icard-note--label {
    border: 1px dashed var(--a-line-2);
    border-radius: 9px;
    background: var(--a-card, #fff);
}
</style>
