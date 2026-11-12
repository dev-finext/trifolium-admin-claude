<script setup>
// ספקים — the supplier cards: who the pharmacy buys from, on what terms, with
// which compliance documents on file. Under daily operations, next to the
// purchasing that names them. The cards hold bank details and purchase prices,
// so opening them goes through the same re-confirmation gate as before.
//
// Two tabs (12.11.2026): the supplier cards, and "תעודות משלוח פתוחות" —
// every delivery note across suppliers that no tax invoice is attached to yet,
// where one invoice is attached to one or more notes of a supplier
// (components/purchasing/OpenNotesTab.vue). The notes tab holds no bank
// details, so it is not behind the cards' gate.
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import OpenNotesTab from '@/components/purchasing/OpenNotesTab.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import SuppliersTab from '@/components/users/SuppliersTab.vue';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { usePurchasingStore } from '@/stores/purchasing';
import { useSystemStore } from '@/stores/system';

const { t } = useI18n();
const dataset = useDatasetStore();
const system = useSystemStore();
const purchasing = usePurchasingStore();

const view = useUrlState({ stab: 'list' });

const tabs = computed(() => [
    { id: 'list', label: t('suppliers.tab.list'), icon: 'users' },
    {
        id: 'notes',
        label: t('suppliers.tab.openNotes'),
        icon: 'file_text',
        n: purchasing.openDeliveryNotes.length || undefined,
    },
]);

/** The confirmation the cards' gate raises. */
const ask = ref(null);

// The gate says it stays open until the screen is left — so leaving it shuts
// it. Scoped to this visit, not to the session, the same as the admin users.
onBeforeUnmount(() => system.lockSupplierCards());

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
        :crumbs="[t('nav.group.purchasing_inventory'), t('nav.item.suppliers')]"
        :title="t('suppliers.title')"
        :sub="sub"
    />

    <ATabs v-model="view.stab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <OpenNotesTab v-else-if="view.stab === 'notes'" />
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
