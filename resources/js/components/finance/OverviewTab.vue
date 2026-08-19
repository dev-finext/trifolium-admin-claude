<script setup>
// The finance overview: the four figures the desk opens on, the aging table, and
// the rules that decide how money moves through the pharmacy.
//
// Every tile is a jump into the tab that resolves it, carrying the filter with
// it — the URL that opens is the filtered view, so it can be pasted to whoever
// has to act on it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AgingTable from '@/components/finance/AgingTable.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AMoney from '@/components/ui/AMoney.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { CREDIT, DOC_PROVIDER, PAY_LINK, SETTINGS } from '@/config';
import { ils, num, pct } from '@/lib/money';
import { COLLECTED_WINDOW_DAYS, useMoneyStore, vatParts } from '@/stores/money';

const emit = defineEmits(['goto']);

const { t } = useI18n();
const money = useMoneyStore();

const collected = computed(() => money.collectedWithin(COLLECTED_WINDOW_DAYS));
const failedCount = computed(() => money.failedDocuments.length);

/**
 * How money works, as the desk needs to know it. Every figure is read from
 * config — the VAT rate through lib/money, so the one setting moves this row and
 * every price in the console together.
 */
const rules = computed(() => [
    [
        t('finance.how.immediate'),
        t('finance.how.immediateValue', { days: PAY_LINK.days }),
    ],
    [t('finance.how.expired'), t('finance.how.expiredValue')],
    [
        t('finance.how.reminder'),
        t('finance.how.reminderValue', { day: PAY_LINK.reminderDay }),
    ],
    [t('finance.how.credit'), t('finance.how.creditValue')],
    [
        t('finance.how.collection'),
        t('finance.how.collectionValue', {
            mode: CREDIT.allowPartial
                ? t('finance.how.partialAllowed')
                : t('finance.how.allOrNothing'),
        }),
    ],
    [
        t('finance.how.docs'),
        t('finance.how.docsValue', {
            provider: DOC_PROVIDER.name,
            retries: DOC_PROVIDER.retries,
            gap: DOC_PROVIDER.retryGapMinutes,
        }),
    ],
    [
        t('finance.how.vat'),
        t('finance.how.vatValue', { rate: pct(vatParts(0).rate * 100) }),
    ],
    [
        t('finance.how.ceiling'),
        t('finance.how.ceilingValue', {
            amount: ils(CREDIT.warnDebt, 0),
            days: CREDIT.warnDays,
        }),
    ],
    [
        t('finance.how.rounding'),
        t(`finance.rounding.${SETTINGS.priceRounding}`),
    ],
]);
</script>

<template>
    <div class="a-grid f-tab">
        <div class="a-kpis">
            <FilterKpi
                icon="coin"
                :label="t('finance.kpi.openDebt')"
                :sub="t('finance.kpi.openDebtSub', { n: money.debtors.length })"
                @click="
                    emit('goto', {
                        tab: 'balances',
                        patch: { bq: '', bucket: '', track: '' },
                    })
                "
            >
                <template #value>
                    <AMoney :value="money.totalDebt" big />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="users"
                :label="t('finance.kpi.creditTrack')"
                :value="num(money.creditPractitioners.length)"
                :sub="
                    t('finance.kpi.creditTrackSub', {
                        n: money.practitioners.length,
                    })
                "
                @click="
                    emit('goto', {
                        tab: 'balances',
                        patch: { bq: '', bucket: '', track: 'credit' },
                    })
                "
            />

            <FilterKpi
                icon="card"
                :label="
                    t('finance.kpi.collected', { days: COLLECTED_WINDOW_DAYS })
                "
                :sub="t('finance.kpi.collectedSub')"
                @click="
                    emit('goto', {
                        tab: 'payments',
                        patch: {
                            tq: '',
                            tcode: '',
                            tkind: 'payment',
                            twin: String(COLLECTED_WINDOW_DAYS),
                        },
                    })
                "
            >
                <template #value>
                    <AMoney :value="collected" />
                </template>
            </FilterKpi>

            <FilterKpi
                icon="file_text"
                :label="t('finance.kpi.failedDocs')"
                :value="num(failedCount)"
                :sub="
                    failedCount
                        ? t('finance.kpi.failedDocsFix')
                        : t('finance.kpi.failedDocsNone')
                "
                @click="
                    emit('goto', {
                        tab: 'docs',
                        patch: { dq: '', dto: '', dwin: '', dstate: 'failed' },
                    })
                "
            />
        </div>

        <ACard :title="t('finance.overview.aging')" icon="clock" :pad="false">
            <template #right>
                <span class="f-hint">{{
                    t('finance.overview.agingHint')
                }}</span>
            </template>

            <AgingTable
                :rows="money.agingRows"
                @pick="
                    (bucket) =>
                        emit('goto', {
                            tab: 'balances',
                            patch: { bq: '', track: '', bucket },
                        })
                "
            >
                <template #empty>
                    <AEmpty
                        icon="check"
                        :title="t('finance.overview.noDebtTitle')"
                        :sub="t('finance.overview.noDebtSub')"
                    />
                </template>
            </AgingTable>
        </ACard>

        <ACard :title="t('finance.overview.how')" icon="db">
            <AKeyValue :rows="rules" />
        </ACard>
    </div>
</template>

<style scoped>
.f-tab {
    margin-top: 20px;
}

.f-hint {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
