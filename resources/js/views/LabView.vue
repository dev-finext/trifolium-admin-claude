<script setup>
// מעבדה — the lab's own screen, second version.
//
// Phase A of the lab: the queue of orders on the bench, urgent ones first, with
// the four roles marked by hand and a prep sheet a click away; and the managed
// texts every preparation carries. Phase B — scanning stations and a live queue
// on a screen — was deferred by decision; what is here is its groundwork.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import LabQueueTab from '@/components/lab/LabQueueTab.vue';
import LabSettingsTab from '@/components/lab/LabSettingsTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';

/** The statuses that put an order on the lab's bench or its packing table. */
const BENCH_STATUS_IDS = ['lab', 'packed'];

const { t } = useI18n();
const router = useRouter();
const dataset = useDatasetStore();
const orders = useOrdersStore();

const view = useUrlState({ tab: 'queue' });

/** Orders with at least one live formula, urgent first, then oldest first. */
const queue = computed(() =>
    orders.all
        .filter(
            (order) =>
                BENCH_STATUS_IDS.includes(statusOf(order)) &&
                trackedItems(order).some((item) => !item.cancelled),
        )
        .sort((a, b) => {
            if (Boolean(a.urgent) !== Boolean(b.urgent)) {
                return a.urgent ? -1 : 1;
            }

            return String(a.iso).localeCompare(String(b.iso));
        }),
);

const urgentCount = computed(
    () => queue.value.filter((order) => order.urgent).length,
);

const tabs = computed(() => [
    {
        id: 'queue',
        label: t('lab.tab.queue'),
        icon: 'clipboard_list',
        n: queue.value.length,
    },
    { id: 'settings', label: t('lab.tab.settings'), icon: 'settings' },
]);

function openOrder(order) {
    router.push({
        name: 'order',
        params: { id: order.id },
        query: { tab: 'items' },
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.lab')]"
        :title="t('lab.title')"
        :sub="t('lab.sub', { queue: queue.length, urgent: urgentCount })"
    >
        <template #badge>
            <V2Badge id="prep-sheet" />
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <template v-else>
        <LabQueueTab
            v-if="view.tab === 'queue'"
            :queue="queue"
            @open="openOrder"
        />
        <LabSettingsTab v-else-if="view.tab === 'settings'" />
    </template>
</template>
