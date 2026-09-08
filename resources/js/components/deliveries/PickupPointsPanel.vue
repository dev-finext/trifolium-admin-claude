<script setup>
// Pickup points: the partner shops and the practitioners who collect for their
// patients — with their dispatch days, the courier that serves them and the
// consolidation notes. The daily alert at the top says which points go out
// today and how many orders are waiting for them.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CourierPickupList from '@/components/deliveries/CourierPickupList.vue';
import PickupPointEditor from '@/components/deliveries/PickupPointEditor.vue';
import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { WEEKDAY_IDS } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

const editing = ref(null);
const listing = ref(false);

const rows = computed(() =>
    deliveries.pickupPoints.map((point) => {
        const waiting = deliveries.ordersAtPoint(point.id);

        return {
            ...point,
            waiting: waiting.length,
            ready: waiting.filter(
                (order) => order.status === 'packed',
            ).length,
            today: point.active && point.days.includes(deliveries.todayId),
        };
    }),
);

const cols = computed(() => [
    {
        k: 'name',
        label: t('deliveries.points.col.name'),
        sortable: true,
        sortValue: (row) => loc(row.name),
    },
    { k: 'kind', label: t('deliveries.points.col.kind'), nowrap: true },
    { k: 'address', label: t('deliveries.points.col.address') },
    { k: 'days', label: t('deliveries.points.col.days') },
    { k: 'courier', label: t('deliveries.points.col.courier'), nowrap: true },
    { k: 'notes', label: t('deliveries.points.col.notes') },
    {
        k: 'waiting',
        label: t('deliveries.points.col.waiting'),
        nowrap: true,
        sortable: true,
    },
]);

const dayLabel = (id) => t(`weekday.${id}`);

/** Days as the week's order, so Sunday–Thursday reads left to right in the cell. */
function daysOf(point) {
    return WEEKDAY_IDS.filter((id) => point.days.includes(id));
}

function onSaved(result) {
    push({
        title: result.created
            ? t('deliveries.points.toast.created')
            : t('deliveries.points.toast.updated'),
        body: loc(result.point.name),
    });
    editing.value = null;
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="head">
            <V2Badge id="pickup-points" />
            <span class="t-sub">{{ t('deliveries.points.note') }}</span>
            <div class="a-push actions">
                <AButton sm icon="printer" @click="listing = true">
                    {{ t('deliveries.points.pickupList') }}
                </AButton>
                <AButton sm kind="p" icon="plus" @click="editing = {}">
                    {{ t('deliveries.points.add') }}
                </AButton>
            </div>
        </div>

        <div
            class="a-note"
            :class="
                deliveries.todayAlert.points ? 'a-note--warn' : 'a-note--ok'
            "
        >
            <strong v-if="deliveries.todayAlert.points">
                {{ t('deliveries.alert.title', deliveries.todayAlert) }}
            </strong>
            <template v-else>{{ t('deliveries.alert.none') }}</template>
            <span class="t-sub day"> · {{ dayLabel(deliveries.todayId) }}</span>
        </div>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            @row="editing = $event"
        >
            <template #cell-name="{ row }">
                <div class="t-strong">
                    {{ loc(row.name) }}
                    <AChip v-if="row.today" tone="amber" size="sm">{{
                        t('deliveries.points.today')
                    }}</AChip>
                    <AChip
                        v-if="!row.active"
                        tone="gray"
                        size="sm"
                        :dot="false"
                        >{{ t('deliveries.points.inactive') }}</AChip
                    >
                </div>
                <div v-if="row.city" class="t-sub">{{ loc(row.city) }}</div>
            </template>
            <template #cell-kind="{ row }">
                <AChip
                    :tone="row.kind === 'shop' ? 'teal' : 'purple'"
                    size="sm"
                    :dot="false"
                >
                    {{ t(`pickupKind.${row.kind}`) }}
                </AChip>
            </template>
            <template #cell-address="{ row }">
                <span v-if="row.address">{{ loc(row.address) }}</span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-days="{ row }">
                <span class="days">
                    <span
                        v-for="id in daysOf(row)"
                        :key="id"
                        class="day-chip"
                        :class="{ 'is-today': id === deliveries.todayId }"
                    >
                        {{ dayLabel(id) }}
                    </span>
                </span>
            </template>
            <template #cell-courier="{ row }">
                <span v-if="row.courier">{{ courierName(row.courier) }}</span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-notes="{ row }">
                <span v-if="row.notes" class="notes">{{ loc(row.notes) }}</span>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-waiting="{ row }">
                <button
                    v-if="row.waiting"
                    type="button"
                    class="a-linkbtn"
                    @click.stop="emit('open', row.id)"
                >
                    <ANum>{{
                        t('deliveries.points.waiting', {
                            n: row.waiting,
                            ready: row.ready,
                        })
                    }}</ANum>
                </button>
                <span v-else class="t-sub">—</span>
            </template>
        </ADataTable>

        <PickupPointEditor
            v-if="editing"
            :point="editing"
            @close="editing = null"
            @saved="onSaved"
        />
        <CourierPickupList v-if="listing" @close="listing = false" />
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.actions {
    display: flex;
    gap: 8px;
}

.day {
    margin-inline-start: 6px;
}

.days {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
}

.day-chip {
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--a-line);
    font-size: 12px;
    color: var(--a-ink-2);
}

.day-chip.is-today {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
    color: var(--a-amber);
    font-weight: 700;
}

.notes {
    font-size: 13.5px;
}
</style>
