<script setup>
// ספקים — the supplier cards: who the pharmacy buys from, on what terms, with
// which compliance documents on file. Under daily operations, next to the
// purchasing that names them. The cards hold bank details and purchase prices,
// so opening them goes through the same re-confirmation gate as before.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import SuppliersTab from '@/components/users/SuppliersTab.vue';
import { useDatasetStore } from '@/stores/dataset';
import { useSystemStore } from '@/stores/system';

const { t } = useI18n();
const dataset = useDatasetStore();
const system = useSystemStore();

/** The confirmation the cards' gate raises. */
const ask = ref(null);

const sub = computed(() =>
    t('suppliers.sub', {
        n: system.suppliers.length,
        active: system.suppliers.filter((row) => row.status === 'active')
            .length,
    }),
);

function confirmAsk(reason, code) {
    const pending = ask.value;

    ask.value = null;
    pending?.done?.(reason, code);
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.suppliers')]"
        :title="t('suppliers.title')"
        :sub="sub"
    />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <SuppliersTab v-else @ask="ask = $event" />

    <ConfirmDialog
        :open="Boolean(ask)"
        :title="ask?.title || ''"
        :body="ask?.body || ''"
        :effects="ask?.effects || []"
        :confirm-label="ask?.confirmLabel || ''"
        :pin="ask?.pin || false"
        @close="ask = null"
        @confirm="confirmAsk"
    />
</template>
