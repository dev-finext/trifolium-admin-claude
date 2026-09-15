<script setup>
// Supplier invoices — what the suppliers billed for the deliveries, what is
// still owed, what is overdue, and what has been handed to the accountant.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CaptureInvoiceModal from '@/components/purchasing/CaptureInvoiceModal.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FileViewerModal from '@/components/ui/FileViewerModal.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    invoiceDueState,
    SUPPLIER_INVOICE_STATE,
    SUPPLIER_INVOICE_STATE_IDS,
    supplierInvoiceOpen,
    supplierInvoiceState,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils } from '@/lib/money';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';

const emit = defineEmits(['open-po']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const store = usePurchasingStore();
const items = useItemsStore();

const state = useUrlState({ iq: '', istate: '', idue: '' });

const capturing = ref(false);
const disputing = ref(null);
const viewing = ref(null);

const DUE_TONE = {
    overdue: 'red',
    week: 'amber',
    later: 'gray',
    settled: 'green',
};

const rows = computed(() => {
    const term = state.iq.trim().toLowerCase();

    return store.supplierInvoices.filter((invoice) => {
        if (state.istate && supplierInvoiceState(invoice) !== state.istate) {
            return false;
        }

        if (state.idue && invoiceDueState(invoice) !== state.idue) {
            return false;
        }

        return (
            !term ||
            searchHaystack(
                invoice.id,
                invoice.num,
                invoice.supplier,
                invoice.notes.join(' '),
            )
                .toLowerCase()
                .includes(term)
        );
    });
});

const dirty = computed(() => Boolean(state.iq || state.istate || state.idue));

function clear() {
    state.iq = '';
    state.istate = '';
    state.idue = '';
}

const stateOptions = computed(() => [
    { value: '', label: t('purchasing.invoices.stateAll') },
    ...SUPPLIER_INVOICE_STATE_IDS.map((id) => ({
        value: id,
        label: t(`purchasing.invoiceState.${id}`),
    })),
]);

const cols = computed(() => [
    { k: 'id', label: t('purchasing.invoices.col.id'), nowrap: true },
    { k: 'supplier', label: t('purchasing.invoices.col.supplier') },
    { k: 'date', label: t('purchasing.invoices.col.date'), nowrap: true },
    { k: 'due', label: t('purchasing.invoices.col.due'), nowrap: true },
    { k: 'notes', label: t('purchasing.invoices.col.notes') },
    {
        k: 'category',
        label: t('purchasing.invoices.col.category'),
        nowrap: true,
    },
    { k: 'total', label: t('purchasing.invoices.col.total'), nowrap: true },
    { k: 'state', label: t('purchasing.invoices.col.state'), nowrap: true },
    { k: 'acct', label: t('purchasing.invoices.col.accounting'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

const fileOf = (invoice) =>
    items.attachmentsOf('supplier_invoice', invoice.id)[0] || null;

function openPo(invoice) {
    const note = store.noteById(invoice.notes[0]);

    if (note) {
        emit('open-po', note.po);
    }
}

async function markSent(invoice) {
    await store.markInvoicesSent([invoice.id]);
    push({ title: t('purchasing.invoices.toast.sent'), body: invoice.num });
}

async function confirmDispute(reason) {
    const invoice = disputing.value;

    disputing.value = null;
    await store.disputeInvoice(
        invoice.id,
        reason,
        invoice.state !== 'disputed',
    );
    push({ title: t('purchasing.invoices.toast.disputed'), body: invoice.num });
}

function onCaptured(invoice) {
    capturing.value = false;
    push({
        title: t('purchasing.invoices.toast.captured'),
        body: t('purchasing.invoices.toast.capturedBody', {
            num: invoice.num,
            total: ils(invoice.total, 2),
        }),
    });
}
</script>

<template>
    <div>
        <div class="a-kpis kpi-row">
            <FilterKpi
                icon="coin"
                :label="t('purchasing.invoices.kpi.open')"
                :value="ils(store.payableKpis.open, 0)"
                :sub="
                    t('purchasing.invoices.kpi.openSub', {
                        n: store.payableKpis.openCount,
                    })
                "
                :active="!dirty"
                @click="clear"
            />
            <FilterKpi
                icon="alert"
                :label="t('purchasing.invoices.kpi.overdue')"
                :value="ils(store.payableKpis.overdue, 0)"
                :sub="
                    t('purchasing.invoices.kpi.overdueSub', {
                        n: store.payableKpis.overdueCount,
                    })
                "
                :active="state.idue === 'overdue'"
                @click="state.idue = state.idue === 'overdue' ? '' : 'overdue'"
            />
            <FilterKpi
                icon="clipboard_list"
                :label="t('purchasing.invoices.kpi.week')"
                :value="ils(store.payableKpis.dueWeek, 0)"
                :sub="t('purchasing.invoices.kpi.weekSub')"
                :active="state.idue === 'week'"
                @click="state.idue = state.idue === 'week' ? '' : 'week'"
            />
            <FilterKpi
                icon="check"
                :label="t('purchasing.invoices.kpi.paidMonth')"
                :value="ils(store.payableKpis.paidThisMonth, 0)"
                :sub="t('purchasing.invoices.kpi.paidMonthSub')"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="
                t('purchasing.invoices.count', {
                    total: store.supplierInvoices.length,
                })
            "
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.iq"
                class="search"
                :placeholder="t('purchasing.invoices.search')"
            />
            <ASelect v-model="state.istate" :options="stateOptions" />
            <AButton kind="p" sm icon="plus" @click="capturing = true">
                {{ t('purchasing.invoices.capture') }}
            </AButton>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="id" @row="openPo">
            <template #cell-id="{ row }">
                <span class="a-code a-tag">{{ row.id }}</span>
                <div class="t-sub num">{{ row.num }}</div>
            </template>
            <template #cell-supplier="{ row }">{{
                loc(row.supplier)
            }}</template>
            <template #cell-date="{ row }"
                ><ANum>{{ row.date.stamp }}</ANum></template
            >
            <template #cell-due="{ row }">
                <AChip :tone="DUE_TONE[invoiceDueState(row)]" size="sm">
                    {{ t(`purchasing.invoiceDue.${invoiceDueState(row)}`) }}
                </AChip>
                <div class="t-sub">
                    <ANum>{{ fmtISO(row.dueOn) }}</ANum>
                </div>
            </template>
            <template #cell-notes="{ row }">
                <span v-if="row.notes.length" class="a-code a-tag">{{
                    row.notes.join(' · ')
                }}</span>
                <span v-else class="t-sub">{{
                    t('purchasing.invoices.noNotes')
                }}</span>
            </template>
            <template #cell-category="{ row }">
                {{ t(`purchasing.expenseCategory.${row.category}`) }}
            </template>
            <template #cell-total="{ row }">
                <ANum>{{ ils(row.total, 2) }}</ANum>
                <div v-if="supplierInvoiceOpen(row) && row.paid" class="t-sub">
                    {{
                        t('purchasing.invoices.openOf', {
                            open: ils(supplierInvoiceOpen(row), 2),
                        })
                    }}
                </div>
            </template>
            <template #cell-state="{ row }">
                <AChip
                    :tone="SUPPLIER_INVOICE_STATE[row.state]?.tone || 'gray'"
                >
                    {{ t(`purchasing.invoiceState.${row.state}`) }}
                </AChip>
            </template>
            <template #cell-acct="{ row }">
                <AChip
                    v-if="row.accounting?.sent"
                    tone="green"
                    size="sm"
                    :dot="false"
                >
                    {{ t('purchasing.invoices.sent') }}
                </AChip>
                <AButton v-else sm kind="ghost" @click.stop="markSent(row)">
                    {{ t('purchasing.invoices.markSent') }}
                </AButton>
            </template>
            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton
                        v-if="fileOf(row)"
                        sm
                        kind="ghost"
                        icon="file_text"
                        :title="t('purchasing.invoices.file')"
                        :aria-label="t('purchasing.invoices.file')"
                        @click="viewing = fileOf(row)"
                    />
                    <AButton
                        sm
                        kind="ghost"
                        icon="alert"
                        @click="disputing = row"
                    >
                        {{
                            row.state === 'disputed'
                                ? t('purchasing.invoices.undispute')
                                : t('purchasing.invoices.dispute')
                        }}
                    </AButton>
                </div>
            </template>
            <template #empty>
                <AEmpty
                    icon="file_text"
                    :title="t('purchasing.invoices.empty')"
                    :sub="t('purchasing.invoices.emptySub')"
                />
            </template>
        </ADataTable>

        <CaptureInvoiceModal
            v-if="capturing"
            @close="capturing = false"
            @captured="onCaptured"
        />

        <FileViewerModal
            :open="Boolean(viewing)"
            :file="viewing"
            :url="viewing ? items.attachmentUrl(viewing) : ''"
            @close="viewing = null"
        />

        <ConfirmDialog
            :open="Boolean(disputing)"
            :title="t('purchasing.invoices.disputeTitle')"
            :body="
                disputing
                    ? t('purchasing.invoices.disputeBody', {
                          num: disputing.num,
                          supplier: loc(disputing.supplier),
                      })
                    : ''
            "
            :confirm-label="
                disputing?.state === 'disputed'
                    ? t('purchasing.invoices.undispute')
                    : t('purchasing.invoices.dispute')
            "
            :reason="disputing?.state !== 'disputed'"
            danger
            @close="disputing = null"
            @confirm="confirmDispute"
        />
    </div>
</template>

<style scoped>
.kpi-row {
    margin: 14px 0;
}

.search {
    width: 320px;
    flex: none;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
