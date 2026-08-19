<script setup>
// The orders that reached the lab unpaid and have not been collected yet, oldest
// debt first.
//
// They are listed and not actioned: an order in here is never collected on its
// own, because a collection link always covers the whole balance. A row opens the
// order itself.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SearchField from '@/components/finance/SearchField.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ExceptionChip from '@/components/ui/ExceptionChip.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { useMoneyStore } from '@/stores/money';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const money = useMoneyStore();
const router = useRouter();

const view = useUrlState({ oq: '', ostatus: '' });

const statusOptions = computed(() => [
    { value: '', label: t('finance.filter.statusAll') },
    ...money.openCreditStatuses.map((status) => ({
        value: status,
        label: t(`status.${status}`),
    })),
]);

const rows = computed(() =>
    money.openCreditAll.filter((order) => {
        if (view.ostatus && order.status !== view.ostatus) {
            return false;
        }

        const q = view.oq.trim().toLowerCase();

        if (
            q &&
            !searchHaystack(
                order.id,
                order.patient.name,
                order.practitioner.name,
            ).includes(q)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() => Boolean(view.oq) || Boolean(view.ostatus));

const cols = computed(() => [
    {
        k: 'id',
        label: t('labels.order'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'practitioner',
        label: t('labels.practitioner'),
        sortable: true,
        sortValue: (row) => row.practitioner.name,
    },
    {
        k: 'patient',
        label: t('labels.customer'),
        sortValue: (row) => row.patient.name,
    },
    { k: 'status', label: t('labels.status'), nowrap: true },
    {
        k: 'age',
        label: t('finance.openCredit.age'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.daysAgo,
    },
    {
        k: 'amt',
        label: t('labels.amount'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.pricing.total,
    },
    { k: 'flags', label: t('finance.openCredit.flags') },
]);

function clear() {
    view.oq = '';
    view.ostatus = '';
}

function openOrder(id) {
    router.push({ name: 'order', params: { id } });
}
</script>

<template>
    <FilterBar
        :count="rows.length"
        :label="t('finance.noun.openCreditOrders')"
        :dirty="dirty"
        @clear="clear"
    >
        <SearchField
            v-model="view.oq"
            :placeholder="t('finance.filter.searchOrder')"
            :width="320"
        />
        <ASelect v-model="view.ostatus" :options="statusOptions" />
    </FilterBar>

    <ACard
        :title="t('finance.openCredit.title')"
        icon="clipboard_list"
        :pad="false"
    >
        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            @row="(row) => openOrder(row.id)"
        >
            <template #empty>
                <AEmpty
                    icon="check"
                    :title="t('finance.openCredit.emptyTitle')"
                    :sub="t('finance.openCredit.emptySub')"
                />
            </template>

            <template #cell-id="{ row }">
                <span class="t-strong num">{{ row.id }}</span>
            </template>

            <template #cell-practitioner="{ row }">
                {{ loc(row.practitioner.name) }}
            </template>

            <template #cell-patient="{ row }">
                {{ loc(row.patient.name) }}
            </template>

            <template #cell-status="{ row }">
                <StatusChip :status="row.status" size="sm" />
            </template>

            <template #cell-age="{ row }">
                {{ t('finance.balances.days', { n: row.daysAgo }) }}
            </template>

            <template #cell-amt="{ row }">
                <AMoney :value="row.pricing.total" />
            </template>

            <template #cell-flags="{ row }">
                <span v-if="row.flags.length" class="f-flags">
                    <ExceptionChip
                        v-for="flag in row.flags"
                        :key="flag"
                        :id="flag"
                        size="sm"
                    />
                </span>
                <span v-else class="f-dash">—</span>
            </template>
        </ADataTable>
    </ACard>
</template>

<style scoped>
.f-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.f-dash {
    color: var(--a-ink-4);
}
</style>
