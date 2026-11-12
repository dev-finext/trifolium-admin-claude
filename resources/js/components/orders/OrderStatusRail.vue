<script setup>
// The order's progress rail.
//
// One step per stage on the happy path (ORDER_FLOW), derived from the order's
// real status rather than a hardcoded index: `credit` sits where `paid` does
// (it is the paid-equivalent state, via `flowIdOf`). A cancelled order has no
// rail — it never travelled the path — so it shows why instead. The date on
// each reached step is read off the order's own audit trail through the
// store's `flowStamps`.
//
// The rail describes THIS order's route, not the longest possible one. An order
// with nothing to compound has no production step, so `in_production` is left
// out of it rather than shown as a step the order passed through: it never
// did, and a rail that ticks off work nobody performed is the kind of small
// lie that makes an agent stop trusting the whole screen. Shipping and
// self-pickup also part ways after `packing` — see `flowFor`.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { flowFor, flowIdOf, SKIPPED_STATUS_IDS } from '@/config';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const orders = useOrdersStore();

const status = computed(() => statusOf(props.order));
const cancelled = computed(() => status.value === 'cancelled');

/** The steps this order actually travels: no production step when there is nothing to make. */
const flow = computed(() => {
    const path = flowFor(props.order);

    return trackedItems(props.order).length
        ? path
        : path.filter((id) => id !== 'in_production');
});

const activeIndex = computed(() => {
    return flow.value.indexOf(flowIdOf(status.value));
});

const stamps = computed(() => orders.flowStamps(props.order));

/** A step nobody passes through any more ("באריזה"), unless this order stands on it. */
const skipped = (id) =>
    SKIPPED_STATUS_IDS.includes(id) && flowIdOf(status.value) !== id;

const steps = computed(() =>
    flow.value.map((id, index) => ({
        id,
        label: t(`status.${id}`),
        stamp: stamps.value[id] || '',
        skipped: skipped(id),
        done: !skipped(id) && index <= activeIndex.value,
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
                :class="{
                    done: step.done,
                    now: step.now,
                    'is-skipped': step.skipped,
                }"
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

<style scoped>
/* A step the flow no longer uses: shown, greyed, never ticked. */
.a-tl-step.is-skipped {
    opacity: 0.45;
}
</style>
