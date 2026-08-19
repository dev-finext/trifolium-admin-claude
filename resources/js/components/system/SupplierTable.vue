<script setup>
// The supplier ledger: one row per business the pharmacy buys from. Compliance
// is read straight from the record through the store's own helper — a supplier
// whose bookkeeping or withholding certificate is missing or expired reads red,
// because that is what blocks paying him.
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';
import { supplierDocsOk } from '@/stores/system';

defineProps({
    rows: { type: Array, default: () => [] },
    /** The code of the supplier open in the drawer. */
    selected: { type: String, default: null },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc } = useLocalized();

const cols = [
    {
        k: 'code',
        label: t('systemContacts.suppliers.table.code'),
        nowrap: true,
    },
    { k: 'name', label: t('systemContacts.suppliers.table.name') },
    {
        k: 'kind',
        label: t('systemContacts.suppliers.table.kind'),
        nowrap: true,
    },
    { k: 'contact', label: t('systemContacts.suppliers.table.contact') },
    {
        k: 'terms',
        label: t('systemContacts.suppliers.table.terms'),
        nowrap: true,
    },
    {
        k: 'lead',
        label: t('systemContacts.suppliers.table.lead'),
        nowrap: true,
    },
    {
        k: 'docs',
        label: t('systemContacts.suppliers.table.docs'),
        nowrap: true,
    },
    {
        k: 'spend',
        label: t('systemContacts.suppliers.table.spend'),
        nowrap: true,
    },
    {
        k: 'open',
        label: t('systemContacts.suppliers.table.open'),
        nowrap: true,
    },
    {
        k: 'status',
        label: t('systemContacts.suppliers.table.status'),
        nowrap: true,
    },
];

const docsOk = (supplier) => supplierDocsOk(supplier);
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="code"
        :selected="selected"
        @row="emit('open', $event)"
    >
        <template #empty>
            <AEmpty
                icon="truck"
                :title="t('systemContacts.suppliers.empty.title')"
                :sub="t('systemContacts.suppliers.empty.sub')"
            />
        </template>

        <template #cell-code="{ row }">
            <span class="t-strong"
                ><ANum>{{ row.code }}</ANum></span
            >
        </template>

        <template #cell-name="{ row }">
            <div class="t-strong">{{ loc(row.name) }}</div>
            <div class="t-sub">
                {{ t(`systemContacts.bizType.${row.bizType}`) }} ·
                <ANum>{{ row.biz }}</ANum>
            </div>
        </template>

        <template #cell-kind="{ row }">
            <AChip tone="teal" size="sm" :dot="false">
                {{ t(`systemContacts.kind.${row.kind}`) }}
            </AChip>
        </template>

        <template #cell-contact="{ row }">
            <div>{{ loc(row.contact) }}</div>
            <div class="t-sub">
                <ANum>{{ row.mobile }}</ANum>
            </div>
        </template>

        <template #cell-terms="{ row }">
            {{ t(`systemContacts.terms.${row.terms}`) }}
        </template>

        <template #cell-lead="{ row }">
            <ANum>{{
                t(
                    'systemContacts.suppliers.leadDays',
                    { n: num(row.lead) },
                    row.lead,
                )
            }}</ANum>
        </template>

        <template #cell-docs="{ row }">
            <AChip v-if="docsOk(row)" tone="green" size="sm">
                {{ t('systemContacts.suppliers.docsOk') }}
            </AChip>
            <AChip v-else tone="red" size="sm">
                {{ t('systemContacts.suppliers.docsBad') }}
            </AChip>
        </template>

        <template #cell-spend="{ row }">
            <AMoney :value="row.spend12" />
        </template>

        <template #cell-open="{ row }">
            <span v-if="row.open" class="st-open">
                <AMoney :value="row.open" />
            </span>
            <span v-else class="st-dash">—</span>
        </template>

        <template #cell-status="{ row }">
            <AChip
                :tone="row.status === 'active' ? 'green' : 'red'"
                size="sm"
                :dot="false"
            >
                {{ t(`systemContacts.status.${row.status}`) }}
            </AChip>
        </template>
    </ADataTable>
</template>

<style scoped>
.st-open {
    font-weight: 700;
    color: var(--a-red);
}

.st-dash {
    color: var(--a-ink-4);
}
</style>
