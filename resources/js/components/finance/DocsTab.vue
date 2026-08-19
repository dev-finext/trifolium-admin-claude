<script setup>
// The tax documents the cloud provider issued for us, and the ones it refused.
//
// The pharmacy issues nothing itself: a document appears the moment money
// arrives, carrying the provider's document number and the tax authority's
// allocation number. A refusal is an exception with one action — re-issue — and
// it is never retried behind the reader's back.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import DocReissuePanel from '@/components/finance/DocReissuePanel.vue';
import SearchField from '@/components/finance/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { DOC_PROVIDER, DOC_STATES } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { TIME_WINDOWS, useMoneyStore } from '@/stores/money';

/** How tall the document list grows before it scrolls inside its own pane. */
const MAX_HEIGHT = 560;

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();
const router = useRouter();

const view = useUrlState({ dq: '', dstate: '', dto: '', dwin: '' });
const reissuing = ref(null);

const stateOptions = computed(() => [
    { value: '', label: t('finance.filter.stateAll') },
    ...money.documentStates.map((state) => ({
        value: state,
        label: t(`docState.${state}`),
    })),
]);

const recipientOptions = computed(() => [
    { value: '', label: t('finance.filter.recipientAll') },
    { value: 'patient', label: t('finance.docs.toCustomer') },
    { value: 'practitioner', label: t('finance.docs.toPractitioner') },
]);

const windowOptions = computed(() => [
    { value: '', label: t('finance.filter.windowAll') },
    ...TIME_WINDOWS.map((days) => ({
        value: String(days),
        label: t('finance.filter.windowDays', { days }),
    })),
]);

const countTo = (toType) =>
    money.documents.filter((doc) => doc.toType === toType).length;

const rows = computed(() =>
    money.documents.filter((doc) => {
        if (view.dstate && doc.status !== view.dstate) {
            return false;
        }

        if (view.dto && doc.toType !== view.dto) {
            return false;
        }

        if (view.dwin && doc.when.daysAgo > Number(view.dwin)) {
            return false;
        }

        const q = view.dq.trim().toLowerCase();

        if (
            q &&
            !searchHaystack(doc.num, doc.alloc, doc.to, doc.order).includes(q)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.dq || view.dstate || view.dto || view.dwin),
);

const cols = computed(() => [
    {
        k: 'num',
        label: t('finance.docs.number'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.num || '',
    },
    { k: 'type', label: t('finance.docs.type') },
    { k: 'alloc', label: t('finance.docs.alloc'), nowrap: true },
    {
        k: 'to',
        label: t('finance.docs.to'),
        sortable: true,
        sortValue: (row) => row.to,
    },
    { k: 'order', label: t('labels.order'), nowrap: true },
    {
        k: 'amt',
        label: t('labels.amount'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.amt,
    },
    {
        k: 'when',
        label: t('finance.docs.issuedAt'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => -row.when.daysAgo,
    },
    { k: 'status', label: t('finance.docs.state'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

function clear() {
    view.dq = '';
    view.dstate = '';
    view.dto = '';
    view.dwin = '';
}

function toggle(key, value) {
    view[key] = view[key] === value ? '' : value;
}

function openOrder(id) {
    router.push({ name: 'order', params: { id } });
}

/** Hand the accountant the rows that are on screen, exactly as filtered. */
function exportRows() {
    const header = [
        t('finance.docs.number'),
        t('finance.docs.type'),
        t('finance.docs.alloc'),
        t('finance.docs.to'),
        t('labels.order'),
        t('labels.amount'),
        t('finance.docs.issuedAt'),
        t('finance.docs.state'),
    ];
    const n = downloadCsv(
        `documents-${isoDaysAgo(0)}.csv`,
        header,
        rows.value.map((doc) => [
            doc.num || '',
            t(`docType.${doc.type}.name`),
            doc.alloc || '',
            loc(doc.to),
            doc.order || '',
            doc.amt,
            doc.when.stamp,
            t(`docState.${doc.status}`),
        ]),
    );

    push({
        title: t('finance.toast.exported'),
        body: t('finance.toast.exportedDocs', { n }),
    });
}
</script>

<template>
    <div class="a-grid f-tab">
        <div v-if="money.failedDocuments.length" class="a-note a-note--danger">
            <strong>
                {{
                    t(
                        'finance.docs.failedTitle',
                        { n: money.failedDocuments.length },
                        money.failedDocuments.length,
                    )
                }}
            </strong>
            —
            {{
                t('finance.docs.failedBody', {
                    provider: DOC_PROVIDER.name,
                    retries: DOC_PROVIDER.retries,
                    gap: DOC_PROVIDER.retryGapMinutes,
                })
            }}
        </div>
        <div v-else class="a-note a-note--ok">
            {{ t('finance.docs.allIssued') }}
        </div>

        <div class="a-kpis">
            <FilterKpi
                icon="file_text"
                :label="t('finance.docs.kpiAll')"
                :value="num(money.documents.length)"
                :sub="t('finance.docs.kpiAllSub')"
                :active="!view.dstate && !view.dto"
                @click="
                    view.dstate = '';
                    view.dto = '';
                "
            />

            <FilterKpi
                icon="alert"
                :label="t('docState.failed')"
                :value="num(money.failedDocuments.length)"
                :sub="t('finance.docs.kpiFailedSub')"
                :active="view.dstate === 'failed'"
                @click="toggle('dstate', 'failed')"
            />

            <FilterKpi
                icon="users"
                :label="t('finance.docs.toCustomer')"
                :value="num(countTo('patient'))"
                :sub="t('finance.docs.toCustomerSub')"
                :active="view.dto === 'patient'"
                @click="toggle('dto', 'patient')"
            />

            <FilterKpi
                icon="user"
                :label="t('finance.docs.toPractitioner')"
                :value="num(countTo('practitioner'))"
                :sub="t('finance.docs.toPractitionerSub')"
                :active="view.dto === 'practitioner'"
                @click="toggle('dto', 'practitioner')"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('finance.noun.documents')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.dq"
                :placeholder="t('finance.filter.searchDoc')"
                :width="340"
            />
            <ASelect v-model="view.dstate" :options="stateOptions" />
            <ASelect v-model="view.dto" :options="recipientOptions" />
            <ASelect v-model="view.dwin" :options="windowOptions" />
            <AButton
                sm
                icon="download"
                :disabled="!rows.length"
                @click="exportRows"
            >
                {{ t('finance.action.exportDocs') }}
            </AButton>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :max-height="MAX_HEIGHT"
        >
            <template #empty>
                <AEmpty
                    icon="file_text"
                    :title="t('finance.docs.emptyTitle')"
                    :sub="t('finance.docs.emptySub')"
                />
            </template>

            <template #cell-num="{ row }">
                <span v-if="row.num" class="t-strong num">{{ row.num }}</span>
                <span v-else class="f-dash">{{
                    t('finance.docs.noNumber')
                }}</span>
            </template>

            <template #cell-type="{ row }">
                {{ t(`docType.${row.type}.name`) }}
            </template>

            <template #cell-alloc="{ row }">
                <ANum v-if="row.alloc">{{ row.alloc }}</ANum>
                <span v-else class="f-dash">—</span>
            </template>

            <template #cell-to="{ row }">
                <div>{{ loc(row.to) }}</div>
                <div class="t-sub">{{ t(`payer.${row.toType}`) }}</div>
            </template>

            <template #cell-order="{ row }">
                <button
                    v-if="row.order"
                    type="button"
                    class="a-linkbtn"
                    @click.stop="openOrder(row.order)"
                >
                    <ANum>{{ row.order }}</ANum>
                </button>
                <span v-else class="f-dash">—</span>
            </template>

            <template #cell-amt="{ row }">
                <AMoney :value="row.amt" />
            </template>

            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>

            <template #cell-status="{ row }">
                <AChip
                    :tone="(DOC_STATES[row.status] || DOC_STATES.none).tone"
                    size="sm"
                >
                    {{ t(`docState.${row.status}`) }}
                </AChip>
                <div v-if="row.err" class="t-sub ltr">{{ row.err }}</div>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton
                        v-if="row.status === 'failed'"
                        sm
                        kind="p"
                        icon="refresh"
                        @click="reissuing = row"
                    >
                        {{ t('finance.docs.reissueConfirm') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <DocReissuePanel :doc="reissuing" @close="reissuing = null" />
    </div>
</template>

<style scoped>
.f-tab {
    margin-top: 20px;
}

.f-dash {
    color: var(--a-ink-4);
}
</style>
