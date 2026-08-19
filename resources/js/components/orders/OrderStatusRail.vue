<script setup>
// The order's progress rail.
//
// One step per stage on the happy path (ORDER_FLOW), derived from the order's
// real status rather than a hardcoded index: `credit` sits where `paid` does
// (it is the paid-equivalent state) and `completed` collapses onto `delivered`.
// A cancelled order has no rail — it never travelled the path — so it shows why
// instead. The date on each reached step is read off the order's own audit
// trail through the store's `flowStamps`.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { ORDER_FLOW } from '@/config';
import { statusOf, useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const orders = useOrdersStore();

/** Statuses that are not on the flow but sit at a flow step's position. */
const RAIL_ALIAS = { credit: 'paid', completed: 'delivered' };

const status = computed(() => statusOf(props.order));
const cancelled = computed(() => status.value === 'cancelled');

const activeIndex = computed(() => {
    const on = RAIL_ALIAS[status.value] || status.value;

    return ORDER_FLOW.indexOf(on);
});

const stamps = computed(() => orders.flowStamps(props.order));

const steps = computed(() =>
    ORDER_FLOW.map((id, index) => ({
        id,
        label: t(`status.${id}`),
        stamp: stamps.value[id] || '',
        done: index <= activeIndex.value,
        now: index === activeIndex.value,
    })),
);
</script>

<template>
    <ACard :title="t('orders.rail.flow')" icon="clock">
        <div v-if="cancelled" class="a-note a-note--danger">
            {{ t('orders.rail.cancelled') }}
        </div>
        <div v-else class="a-timeline">
            <div
                v-for="step in steps"
                :key="step.id"
                class="a-tl-step"
                :class="{ done: step.done, now: step.now }"
            >
                <div class="a-tl-mark">
                    <AIcon v-if="step.done" name="check" :size="14" />
                </div>
                <div>
                    <div class="a-tl-t">{{ step.label }}</div>
                    <div class="a-tl-d">
                        <ANum v-if="step.stamp">{{ step.stamp }}</ANum>
                        <template v-else>{{ t('orders.value.none') }}</template>
                    </div>
                </div>
            </div>
        </div>
    </ACard>
</template>
