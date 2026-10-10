<script setup>
// רכש — two things the buyer does, and nothing else.
//
//   בקשת רכש      a shopping list: what is wanted, before anybody has been
//                 asked for a price. Ticked off as it is sourced
//   הזמנת רכש     one supplier, quantities that are required, a file to send
//                 them, and the goods booked in when they arrive
//
// Making something here instead of buying it is a production order, and
// production orders have their own screen — הוראות ייצור. It was a third tab
// here for a while, which put the same job in two places.
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import BuyingTab from '@/components/purchasing/BuyingTab.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useUrlState } from '@/composables/useUrlState';
import { BUYING_KIND_IDS } from '@/config';
import { useDatasetStore } from '@/stores/dataset';

/** How many skeleton rows stand in while the dataset loads. */
const SKELETON_ROWS = 8;

const { t } = useI18n();
const dataset = useDatasetStore();

const view = useUrlState({ tab: 'request' });

// A link to the third tab this page used to have still exists in somebody's
// history; `kind` has to be one of the two or the sheet has no rules to read.
watch(
    () => view.tab,
    (tab) => {
        if (!BUYING_KIND_IDS.includes(tab)) {
            view.tab = 'request';
        }
    },
    { immediate: true },
);

const tabs = computed(() => [
    { id: 'request', label: t('buying.tab.request'), icon: 'list' },
    { id: 'order', label: t('buying.tab.order'), icon: 'inbox' },
]);
</script>

<template>
    <PageHead
        :crumbs="[t('buying.crumb'), t('buying.title')]"
        :title="t('buying.title')"
        :sub="t('buying.sub')"
    />

    <ATabs v-model="view.tab" :tabs="tabs" />

    <AErrorState v-if="dataset.error" :message="dataset.error" />
    <ASkeleton v-else-if="dataset.isBusy" :rows="SKELETON_ROWS" />

    <BuyingTab v-else :key="view.tab" :kind="view.tab" />
</template>
