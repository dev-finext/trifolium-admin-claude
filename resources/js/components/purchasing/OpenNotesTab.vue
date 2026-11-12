<script setup>
// תעודות משלוח פתוחות — every delivery note no tax invoice is attached to yet,
// across suppliers (12.11.2026).
//
// **For production.** A row is a goods receipt that came on "תעודת משלוח" and
// is still open (config/supplierDocs.js `isOpenNote`): its stock is booked in,
// its lines have no price, and it waits for the supplier's tax invoice. One
// invoice may cover several notes of one supplier, which is why "הצמדת
// חשבונית" opens the dialog on the row's supplier with that note ticked and
// his other open notes beside it. A note from a supplier with no card (a
// one-off typed by hand) cannot take an invoice — the invoice has nowhere to be
// recorded — and says so.
//
// The value shown is what the note comes to at the order's quote prices — an
// estimate, until the invoice sets the real one; a note with any line
// unquoted shows none.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import AttachInvoiceModal from '@/components/purchasing/AttachInvoiceModal.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { docRef, lineBuyQty } from '@/config';
import { daysSince, fmtISO } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { ils } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { loc } = useLocalized();
const purchasing = usePurchasingStore();
const buying = useBuyingStore();

const view = useUrlState({ nq: '' });

/** The order a note was received against, by its number. */
const poNumber = (receipt) =>
    buying.listById(receipt.po)?.number || receipt.poNumber || '';

const term = computed(() => view.nq.trim().toLowerCase());

const rows = computed(() =>
    purchasing.openDeliveryNotes.filter(
        (receipt) =>
            !term.value ||
            searchHaystack(
                docRef(receipt),
                receipt.docNum,
                receipt.supplier,
                poNumber(receipt),
            ).includes(term.value),
    ),
);

/** At the order's quote prices — null while any line has none. */
function quoted(receipt) {
    let sum = 0;

    for (const line of receipt.lines) {
        const price = line.general ? line.price : line.quotePrice;

        if (price === null || price === undefined) {
            return null;
        }

        sum += lineBuyQty(line) * Number(price);
    }

    return Math.round(sum * 100) / 100;
}

const cols = computed(() => [
    { k: 'supplier', label: t('supplierDocs.col.supplier') },
    { k: 'ref', label: t('supplierDocs.col.ref'), nowrap: true },
    { k: 'when', label: t('supplierDocs.col.when'), nowrap: true },
    { k: 'po', label: t('supplierDocs.col.po'), nowrap: true },
    { k: 'lines', label: t('supplierDocs.col.lines'), align: 'end' },
    {
        k: 'quoted',
        label: t('supplierDocs.col.quoted'),
        align: 'end',
        nowrap: true,
    },
    { k: 'age', label: t('supplierDocs.col.age'), nowrap: true },
    { k: 'go', label: '', nowrap: true },
]);

// ---- attaching ---------------------------------------------------------------

const attach = ref(null);

function openAttach(receipt) {
    attach.value = {
        supplierCode: receipt?.supplierCode || '',
        preselect: receipt ? [receipt.id] : [],
    };
}
</script>

<template>
    <div class="a-grid on">
        <div class="a-note a-note--info">{{ t('supplierDocs.open.lead') }}</div>

        <FilterBar
            :count="rows.length"
            :label="
                t('supplierDocs.open.count', {
                    total: purchasing.openDeliveryNotes.length,
                })
            "
            :dirty="Boolean(view.nq)"
            @clear="view.nq = ''"
        >
            <SearchBox
                v-model="view.nq"
                :placeholder="t('supplierDocs.open.search')"
                :width="320"
            />
            <AButton
                class="a-push"
                kind="p"
                icon="file_text"
                :disabled="!purchasing.openDeliveryNotes.length"
                @click="openAttach(null)"
            >
                {{ t('buying.attach.open') }}
            </AButton>
        </FilterBar>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #empty>
                <AEmpty
                    icon="file_text"
                    :title="t('supplierDocs.open.empty')"
                    :sub="t('supplierDocs.open.emptySub')"
                />
            </template>

            <template #cell-supplier="{ row }">
                <div class="t-strong">{{ loc(row.supplier) }}</div>
                <div v-if="!row.supplierCode" class="t-sub">
                    {{ t('supplierDocs.noCard') }}
                </div>
            </template>
            <template #cell-ref="{ row }">
                <ANum class="a-code">{{ docRef(row) || '—' }}</ANum>
                <div v-if="row.supplierRef" class="t-sub">
                    {{ t('supplierDocs.sapNum', { num: row.docNum }) }}
                </div>
            </template>
            <template #cell-when="{ row }">
                <ANum>{{ fmtISO(row.when.iso) }}</ANum>
            </template>
            <template #cell-po="{ row }">
                <RouterLink
                    v-if="buying.listById(row.po)"
                    class="a-linkbtn"
                    :to="{
                        name: 'buyingSheet',
                        params: { kind: 'order', id: row.po },
                    }"
                >
                    <ANum>{{ poNumber(row) }}</ANum>
                </RouterLink>
                <ANum v-else-if="poNumber(row)">{{ poNumber(row) }}</ANum>
                <span v-else class="t-sub">{{ t('supplierDocs.noPo') }}</span>
            </template>
            <template #cell-lines="{ row }">
                <ANum>{{ row.lines.length }}</ANum>
            </template>
            <template #cell-quoted="{ row }">
                <ANum v-if="quoted(row) !== null">{{
                    ils(quoted(row), 2)
                }}</ANum>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-age="{ row }">
                {{
                    t(
                        'supplierDocs.age',
                        { n: daysSince(row.when.iso) },
                        daysSince(row.when.iso),
                    )
                }}
            </template>
            <template #cell-go="{ row }">
                <AButton
                    sm
                    icon="file_text"
                    :disabled="!row.supplierCode"
                    :title="
                        row.supplierCode
                            ? ''
                            : t('supplierDocs.open.noCardHint')
                    "
                    @click="openAttach(row)"
                >
                    {{ t('supplierDocs.open.attach') }}
                </AButton>
            </template>
        </ADataTable>

        <AttachInvoiceModal
            :open="Boolean(attach)"
            :supplier-code="attach?.supplierCode || ''"
            :preselect="attach?.preselect || []"
            pick-supplier
            @close="attach = null"
        />
    </div>
</template>

<style scoped>
.on {
    margin-top: 20px;
}

.t-sub {
    font-size: 12.5px;
    color: var(--a-ink-4);
}
</style>
