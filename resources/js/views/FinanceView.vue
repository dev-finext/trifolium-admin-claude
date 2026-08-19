<script setup>
// Finance — balances, collection and tax documents.
//
// The screen is the pharmacy's ledger rather than a report on someone else's:
// there is no accounting system behind it, so every charge, payment, credit note,
// collection link and document is a row here.
//
// The active tab and every filter live in the query string, and each tab owns its
// own keys — which is what lets a tile on the overview hand a filtered list to
// whoever has to act on it, as a link that opens exactly the same way.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import BalancesTab from '@/components/finance/BalancesTab.vue';
import CollectionLinkModal from '@/components/finance/CollectionLinkModal.vue';
import DocsTab from '@/components/finance/DocsTab.vue';
import ManualPaymentModal from '@/components/finance/ManualPaymentModal.vue';
import OverviewTab from '@/components/finance/OverviewTab.vue';
import PaymentsTab from '@/components/finance/PaymentsTab.vue';
import StatementDrawer from '@/components/finance/StatementDrawer.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { DOC_PROVIDER } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { useMoneyStore } from '@/stores/money';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();
const route = useRoute();
const router = useRouter();

const view = useUrlState({ tab: 'overview', practitioner: '' });

/** The collection link and the manual payment are actions, not addresses. */
const linkCode = ref('');
const paymentCode = ref('');

const tabs = computed(() => [
    { id: 'overview', label: t('finance.tab.overview'), icon: 'chart' },
    {
        id: 'balances',
        label: t('finance.tab.balances'),
        icon: 'coin',
        n: money.debtors.length,
    },
    {
        id: 'payments',
        label: t('finance.tab.payments'),
        icon: 'list',
        n: money.transactions.length,
    },
    {
        id: 'docs',
        label: t('finance.tab.docs'),
        icon: 'file_text',
        n: money.failedDocuments.length || undefined,
    },
]);

const statement = computed(() =>
    view.practitioner ? money.byCode(view.practitioner) : null,
);

/**
 * Jump to another tab carrying its filter with it. An empty value clears the
 * key instead of writing it, so "all balances" and "balances aged 90+" are two
 * different addresses and neither inherits the other's leftovers.
 */
function goto({ tab, patch }) {
    const query = { ...route.query, tab };

    Object.entries(patch || {}).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
            delete query[key];
        } else {
            query[key] = value;
        }
    });

    router.replace({ query });
}

/** The whole ledger, for the bookkeeper. */
function exportLedger() {
    const header = [
        t('labels.date'),
        t('finance.txn.kind'),
        t('labels.practitioner'),
        t('finance.txn.note'),
        t('labels.order'),
        t('finance.txn.document'),
        t('labels.amount'),
    ];
    const n = downloadCsv(
        `ledger-${isoDaysAgo(0)}.csv`,
        header,
        money.transactions.map((row) => [
            row.when.stamp,
            t(`finance.txnKind.${row.kind}`),
            loc(money.byCode(row.code)?.name) || row.code,
            loc(row.note),
            row.order || '',
            row.doc || '',
            row.amt,
        ]),
    );

    push({
        title: t('finance.toast.exported'),
        body: t('finance.toast.exportedLedger', { n }),
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.customers'), t('nav.item.finance')]"
        :title="t('finance.title')"
        :sub="
            t('finance.sub', {
                n: money.creditPractitioners.length,
                provider: DOC_PROVIDER.name,
            })
        "
    >
        <template #actions>
            <AButton
                icon="download"
                :disabled="!money.transactions.length"
                @click="exportLedger"
            >
                {{ t('finance.action.exportLedger') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <OverviewTab v-if="view.tab === 'overview'" @goto="goto" />
    <BalancesTab
        v-else-if="view.tab === 'balances'"
        @statement="(code) => (view.practitioner = code)"
        @link="(code) => (linkCode = code)"
        @payment="(code) => (paymentCode = code)"
    />
    <PaymentsTab v-else-if="view.tab === 'payments'" />
    <DocsTab v-else-if="view.tab === 'docs'" />

    <ADrawer :open="Boolean(statement)" @close="view.practitioner = ''">
        <StatementDrawer
            v-if="statement"
            :practitioner="statement"
            @close="view.practitioner = ''"
            @link="
                (code) => {
                    view.practitioner = '';
                    linkCode = code;
                }
            "
            @payment="
                (code) => {
                    view.practitioner = '';
                    paymentCode = code;
                }
            "
        />
    </ADrawer>

    <CollectionLinkModal :code="linkCode" @close="linkCode = ''" />
    <ManualPaymentModal :code="paymentCode" @close="paymentCode = ''" />
</template>
