<script setup>
// How the order's formulas are spread across the preparation stages.
//
// Item stages are informational: each compounded formula carries its own stage,
// but no item blocks or delays the order itself — the card's caption says so.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import { ITEM_STAGES } from '@/config';
import { shelfItems, trackedItems } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();

const formulas = computed(() => trackedItems(props.order));

const live = computed(() =>
    formulas.value.filter((item) => item.stage !== 'cancelled'),
);

const cancelled = computed(() => formulas.value.length - live.value.length);

const shelfCount = computed(() => shelfItems(props.order).length);

const columns = computed(() =>
    ITEM_STAGES.map((stage) => ({
        id: stage.id,
        n: live.value.filter((item) => item.stage === stage.id).length,
    })),
);

const summary = computed(() => {
    const parts = [t('orders.itemsTab.tracked', live.value.length)];

    if (shelfCount.value) {
        parts.push(t('orders.items.shelfCount', shelfCount.value));
    }

    if (cancelled.value) {
        parts.push(t('orders.itemsTab.cancelledCount', cancelled.value));
    }

    return parts.join(' · ');
});
</script>

<template>
    <ACard :title="t('orders.itemsTab.progress')" icon="layers">
        <template #right>
            <span class="a-stages-note">
                {{ t('orders.itemsTab.progressNote') }}
            </span>
        </template>

        <div v-if="!live.length" class="a-note a-note--info">
            {{
                shelfCount
                    ? t('orders.itemsTab.noneTrackedShelf', {
                          shelf: t('orders.items.shelfCount', shelfCount),
                      })
                    : t('orders.itemsTab.noneTracked')
            }}
        </div>
        <template v-else>
            <div class="a-istep">
                <div
                    v-for="column in columns"
                    :key="column.id"
                    class="a-istep-c"
                    :class="{ 'is-on': column.n > 0 }"
                >
                    <div class="a-istep-bar" />
                    <div class="a-istep-n">
                        {{ column.n || '' }}
                    </div>
                    <div class="a-istep-l">
                        {{ t(`itemStage.${column.id}`) }}
                    </div>
                </div>
            </div>
            <div class="a-stages-sum">{{ summary }}</div>
        </template>
    </ACard>
</template>

<style scoped>
.a-stages-note {
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.a-stages-sum {
    margin-top: 14px;
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
