<script setup>
// Debt notices: practitioners carrying an open credit-terms balance, and the one
// message this screen sends them.
//
// The balances themselves are derived by the finance layer and are exact — this
// screen only reads them. The two filters are stated in business terms rather
// than in figures: the warning amount and the ageing buckets both come from
// config/finance.js, so changing the policy there changes this list.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { AGING_BUCKETS, CREDIT, agingBucket } from '@/config';
import { ils, num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useMessagingStore } from '@/stores/messaging';

/** The template category a debt notice is sent from. */
const DEBT_CATEGORY = 'debt_notice';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const messaging = useMessagingStore();

const view = useUrlState({ dq: '', dsize: '', dage: '' });

/** The practitioner a confirmation is open for, or null. */
const ask = ref(null);

const debtors = computed(() =>
    dataset.practitioners.filter((practitioner) => practitioner.debt > 0),
);

const template = computed(() => messaging.templateForCategory(DEBT_CATEGORY));

const cols = computed(() => [
    { k: 'name', label: t('messaging.debt.col.practitioner'), sortable: true },
    {
        k: 'debt',
        label: t('messaging.debt.col.debt'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'age',
        label: t('messaging.debt.col.age'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.debtDays,
    },
    { k: 'act', label: '' },
]);

const sizeCounts = computed(() => ({
    over: debtors.value.filter((row) => row.debt > CREDIT.warnDebt).length,
    under: debtors.value.filter((row) => row.debt <= CREDIT.warnDebt).length,
}));

const ageCounts = computed(() => {
    const counts = {};

    for (const row of debtors.value) {
        const bucket = agingBucket(row.debtDays).id;

        counts[bucket] = (counts[bucket] || 0) + 1;
    }

    return counts;
});

const rows = computed(() => {
    const query = view.dq.trim().toLowerCase();

    return debtors.value.filter((row) => {
        if (view.dsize === 'over' && row.debt <= CREDIT.warnDebt) {
            return false;
        }

        if (view.dsize === 'under' && row.debt > CREDIT.warnDebt) {
            return false;
        }

        if (view.dage && agingBucket(row.debtDays).id !== view.dage) {
            return false;
        }

        if (
            query &&
            !searchHaystack(row.name, row.code, row.phone).includes(query)
        ) {
            return false;
        }

        return true;
    });
});

const dirty = computed(() => Boolean(view.dq || view.dsize || view.dage));

function clear() {
    view.dq = '';
    view.dsize = '';
    view.dage = '';
}

const dialog = computed(() => {
    if (!ask.value || !template.value) {
        return null;
    }

    return {
        body: t('messaging.debt.sendBody', {
            name: loc(ask.value.name),
            amount: ils(ask.value.debt, 0),
        }),
        effects: [
            t('messaging.debt.effectTemplate', {
                template: loc(template.value.name),
                channel: t(`channel.${template.value.ch}`),
            }),
            t('messaging.debt.effectAmount'),
            t('messaging.debt.effectLog'),
        ],
    };
});

function open(practitioner) {
    if (!template.value) {
        push({ title: t('messaging.debt.missingTemplate'), bad: true });

        return;
    }

    ask.value = practitioner;
}

function confirm() {
    const practitioner = ask.value;

    ask.value = null;

    if (!practitioner || !template.value) {
        return;
    }

    messaging.sendNow({
        templateId: template.value.id,
        recipient: {
            name: practitioner.name,
            type: 'practitioner',
            phone: practitioner.phone,
        },
        values: messaging.practitionerValues(practitioner),
    });

    push({
        title: t('messaging.debt.sent'),
        body: `${loc(practitioner.name)} · ${ils(practitioner.debt, 0)}`,
    });
}
</script>

<template>
    <ACard :title="t('messaging.debt.title')" icon="alert">
        <div class="a-note a-note--info m-note">
            {{ t('messaging.debt.note') }}
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('messaging.of.debtors', { total: debtors.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="view.dq"
                class="m-search"
                type="search"
                :placeholder="t('messaging.filter.searchDebtors')"
                :aria-label="t('messaging.filter.searchDebtors')"
            />
            <ASelect
                v-model="view.dsize"
                :aria-label="t('messaging.filter.debtSize')"
            >
                <option value="">
                    {{ t('messaging.filter.debtSizeAll') }}
                </option>
                <option value="over">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.debtOver', {
                                amount: ils(CREDIT.warnDebt, 0),
                            }),
                            n: sizeCounts.over,
                        })
                    }}
                </option>
                <option value="under">
                    {{
                        t('messaging.filter.withCount', {
                            label: t('messaging.filter.debtUnder', {
                                amount: ils(CREDIT.warnDebt, 0),
                            }),
                            n: sizeCounts.under,
                        })
                    }}
                </option>
            </ASelect>
            <ASelect
                v-model="view.dage"
                :aria-label="t('messaging.filter.debtAge')"
            >
                <option value="">
                    {{ t('messaging.filter.debtAgeAll') }}
                </option>
                <option
                    v-for="bucket in AGING_BUCKETS"
                    :key="bucket.id"
                    :value="bucket.id"
                >
                    {{
                        t('messaging.filter.withCount', {
                            label: t(`agingBucket.${bucket.id}`),
                            n: ageCounts[bucket.id] || 0,
                        })
                    }}
                </option>
            </ASelect>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="code">
            <template #empty>
                <AEmpty
                    icon="coin"
                    :title="t('messaging.debt.empty.title')"
                    :sub="t('messaging.debt.empty.sub')"
                />
            </template>

            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">
                    <ANum>{{ row.code }}</ANum>
                </div>
            </template>

            <template #cell-debt="{ row }">
                <span class="m-debt"><AMoney :value="row.debt" /></span>
            </template>

            <template #cell-age="{ row }">
                <ANum>{{
                    t('messaging.debt.days', { n: num(row.debtDays) })
                }}</ANum>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <AButton sm icon="whatsapp" @click="open(row)">
                        {{ t('messaging.debt.send') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <ConfirmDialog
            :open="Boolean(dialog)"
            :title="t('messaging.debt.sendTitle')"
            :body="dialog?.body || ''"
            :effects="dialog?.effects || []"
            :confirm-label="t('messaging.debt.sendConfirm')"
            @confirm="confirm"
            @close="ask = null"
        />
    </ACard>
</template>

<style scoped>
.m-note {
    margin-bottom: 16px;
}

.m-search {
    width: 300px;
    max-width: 100%;
}

.m-debt {
    color: var(--a-red);
}
</style>
