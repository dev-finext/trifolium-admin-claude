<script setup>
// One practitioner's account statement: every charge and every payment on the
// card, with the balance running through them.
//
// The running balance is computed from the movements rather than stored, so it
// always agrees with the rows above it — and the collection action here is the
// same whole-balance link the list offers, not a per-order one.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import CreditTermsPanel from '@/components/finance/CreditTermsPanel.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CREDIT } from '@/config';
import { TXN_KIND_TONES } from '@/config/finance';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { useMoneyStore } from '@/stores/money';

const props = defineProps({
    practitioner: { type: Object, required: true },
});

const emit = defineEmits(['close', 'link', 'payment']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();
const router = useRouter();

const rows = computed(() => money.statementOf(props.practitioner.code));

const charges = computed(() =>
    rows.value
        .filter((row) => row.kind === 'charge')
        .reduce((sum, row) => sum + row.amt, 0),
);

const paid = computed(() =>
    rows.value
        .filter((row) => row.kind === 'payment')
        .reduce((sum, row) => sum - row.amt, 0),
);

/** Past the warning window the balance chip goes red; before it, amber. */
const balanceTone = computed(() =>
    props.practitioner.debtDays > CREDIT.warnDays ? 'red' : 'amber',
);

const cols = computed(() => [
    { k: 'when', label: t('labels.date'), nowrap: true },
    { k: 'kind', label: t('finance.txn.kind'), nowrap: true },
    { k: 'note', label: t('finance.txn.note') },
    { k: 'order', label: t('labels.order'), nowrap: true },
    { k: 'doc', label: t('finance.txn.document'), nowrap: true },
    { k: 'amt', label: t('labels.amount'), nowrap: true },
    { k: 'bal', label: t('finance.txn.runningBalance'), nowrap: true },
]);

function openOrder(id) {
    emit('close');
    router.push({ name: 'order', params: { id } });
}

/** The statement, as the practitioner's accountant would want it. */
function exportStatement() {
    const header = [
        t('labels.date'),
        t('finance.txn.kind'),
        t('finance.txn.note'),
        t('labels.order'),
        t('finance.txn.document'),
        t('labels.amount'),
        t('finance.txn.runningBalance'),
    ];
    const n = downloadCsv(
        `statement-${props.practitioner.code}-${isoDaysAgo(0)}.csv`,
        header,
        rows.value.map((row) => [
            row.when.stamp,
            t(`finance.txnKind.${row.kind}`),
            loc(row.note),
            row.order || '',
            row.doc || '',
            row.amt,
            row.bal,
        ]),
    );

    push({
        title: t('finance.toast.exported'),
        body: t('finance.toast.exportedStatement', { n }),
    });
}
</script>

<template>
    <div class="a-dhead a-dhead--line">
        <div class="a-dhead-top f-top">
            <div>
                <div class="a-dhead-t">
                    <h2 class="f-h2">
                        {{
                            t('finance.statement.title', {
                                name: loc(practitioner.name),
                            })
                        }}
                    </h2>
                    <AChip
                        :tone="practitioner.credit ? 'purple' : 'gray'"
                        :dot="false"
                    >
                        {{
                            practitioner.credit
                                ? t('finance.track.creditLong')
                                : t('finance.track.immediate')
                        }}
                    </AChip>
                    <AChip
                        v-if="practitioner.debt > 0"
                        :tone="balanceTone"
                        size="lg"
                    >
                        {{ t('finance.statement.balanceChip') }}
                        <AMoney :value="practitioner.debt" />
                    </AChip>
                </div>
                <div class="a-dhead-m">
                    <span>
                        {{ t('finance.statement.customerNo') }}
                        <ANum>{{ practitioner.code }}</ANum>
                    </span>
                    <span
                        ><ANum>{{ practitioner.phone }}</ANum></span
                    >
                    <span>
                        {{ t('finance.statement.totalCharges') }}
                        <AMoney :value="charges" />
                    </span>
                    <span>
                        {{ t('finance.statement.totalPayments') }}
                        <AMoney :value="paid" />
                    </span>
                    <span v-if="practitioner.debt > 0">
                        {{ t('finance.balances.debtAge') }}
                        {{
                            t('finance.balances.days', {
                                n: practitioner.debtDays,
                            })
                        }}
                    </span>
                </div>
            </div>

            <div class="a-dhead-a">
                <AButton
                    v-if="practitioner.debt > 0"
                    kind="p"
                    icon="copy"
                    @click="emit('link', practitioner.code)"
                >
                    {{ t('finance.action.createLink') }}
                </AButton>
                <AButton
                    v-if="practitioner.debt > 0"
                    icon="card"
                    @click="emit('payment', practitioner.code)"
                >
                    {{ t('finance.action.recordPayment') }}
                </AButton>
                <AButton
                    icon="download"
                    :disabled="!rows.length"
                    @click="exportStatement"
                >
                    {{ t('finance.action.exportStatement') }}
                </AButton>
                <AButton sm icon="x" @click="emit('close')">
                    {{ t('actions.close') }}
                </AButton>
            </div>
        </div>
    </div>

    <div class="a-grid">
        <CreditTermsPanel :practitioner="practitioner" />

        <ACard
            :title="t('finance.statement.movements')"
            icon="list"
            :pad="false"
        >
            <ADataTable :cols="cols" :rows="rows" row-key="id">
                <template #empty>
                    <AEmpty
                        icon="card"
                        :title="t('finance.statement.emptyTitle')"
                        :sub="t('finance.statement.emptySub')"
                    />
                </template>

                <template #cell-when="{ row }">
                    <ANum>{{ row.when.stamp }}</ANum>
                </template>

                <template #cell-kind="{ row }">
                    <AChip :tone="TXN_KIND_TONES[row.kind] || 'gray'" size="sm">
                        {{ t(`finance.txnKind.${row.kind}`) }}
                    </AChip>
                </template>

                <template #cell-note="{ row }">
                    {{ loc(row.note) }}
                    <div v-if="row.method" class="t-sub">
                        {{ t(`paymentMethod.${row.method}`) }}
                    </div>
                </template>

                <template #cell-order="{ row }">
                    <button
                        v-if="row.order"
                        type="button"
                        class="a-linkbtn"
                        @click="openOrder(row.order)"
                    >
                        <ANum>{{ row.order }}</ANum>
                    </button>
                    <span v-else class="f-dash">—</span>
                </template>

                <template #cell-doc="{ row }">
                    <ANum v-if="row.doc">{{ row.doc }}</ANum>
                    <span v-else class="f-dash">—</span>
                </template>

                <template #cell-amt="{ row }">
                    <span class="f-amt" :class="{ 'is-in': row.amt < 0 }">
                        <span v-if="row.amt < 0">−</span>
                        <AMoney :value="Math.abs(row.amt)" />
                    </span>
                </template>

                <template #cell-bal="{ row }">
                    <AMoney :value="row.bal" />
                </template>
            </ADataTable>
        </ACard>
    </div>
</template>

<style scoped>
.f-top {
    padding-bottom: 0;
}

.f-h2 {
    margin: 0;
    font-size: 26px;
}

.f-amt {
    font-weight: 700;
}

.f-amt.is-in {
    color: var(--a-accent);
}

.f-dash {
    color: var(--a-ink-4);
}
</style>
