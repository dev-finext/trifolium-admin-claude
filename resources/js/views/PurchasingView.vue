<script setup>
// רכש — three things the buyer does, and nothing else.
//
//   ייצור פנימי   make it here instead of buying it, and send the run to the
//                 bench with its paper
//   בקשת רכש      a shopping list: what is wanted, before anybody has been
//                 asked for a price. Ticked off as it is sourced
//   הזמנת רכש     one supplier, quantities that are required, and a file to
//                 send them
//
// None of the three posts stock or reserves anything except the production run,
// which is the only one of them that is a document in its own right. The other
// two end in a spreadsheet.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import BuyingTab from '@/components/purchasing/BuyingTab.vue';
import InternalProductionTab from '@/components/purchasing/InternalProductionTab.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';

/** How many skeleton rows stand in while the dataset loads. */
const SKELETON_ROWS = 8;

const { t } = useI18n();
const dataset = useDatasetStore();

const view = useUrlState({ tab: 'production' });

const tabs = computed(() => [
    { id: 'production', label: t('buying.tab.production'), icon: 'beaker' },
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

    <template v-else>
        <InternalProductionTab v-if="view.tab === 'production'" />
        <BuyingTab v-else :key="view.tab" :kind="view.tab" />
    </template>
</template>
