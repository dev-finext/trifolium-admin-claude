<script setup>
// One practitioner's card, as the drawer body over the directory.
//
// The header states who he is and how he pays; the tabs hold his profile with
// the credit-terms toggle, his signed safety declarations, his order history,
// his points wallet and his documentation trail. Credit terms and points both
// move money, so both are gated behind the approval code.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AKpi from '@/components/ui/AKpi.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { formatAddress } from '@/components/users/address';
import { practitionerFields } from '@/components/users/personFields';
import PointsLedger from '@/components/users/PointsLedger.vue';
import PractitionerEdit from '@/components/users/PractitionerEdit.vue';
import ScanPlaceholder from '@/components/users/ScanPlaceholder.vue';
import SearchField from '@/components/users/SearchField.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { CREDIT, ORDER_STATUS_IDS, SETTINGS } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { shelfItems, statusOf, trackedItems } from '@/stores/orders';
import { usePeopleStore } from '@/stores/people';

/** How tall a signature scan renders inside its cell. */
const SIG_HEIGHT = 46;

const props = defineProps({
    practitioner: { type: Object, required: true },
});

const emit = defineEmits(['close', 'open-order']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const people = usePeopleStore();
const dataset = useDatasetStore();

const view = useUrlState({ ctab: 'profile' });

const editing = ref(false);
const creditIntent = ref(null);

// In-drawer order and documentation filters stay local, like the wallet ledger
// panel — the screen's own tab and selected row are what the URL carries.
const oQuery = ref('');
const oStatus = ref('');
const oType = ref('');
const docKind = ref('');
const docQuery = ref('');
const fixTarget = ref(null);
const noteText = ref('');

const editFields = computed(() => practitionerFields(t));

const orders = computed(() => people.ordersOf(props.practitioner.code));
const signedOrders = computed(() =>
    people.signedOrdersOf(props.practitioner.code),
);

const isLate = computed(
    () =>
        props.practitioner.debt > 0 &&
        props.practitioner.debtDays > CREDIT.warnDays,
);

const tabs = computed(() => [
    { id: 'profile', label: t('users.card.tab.profile'), icon: 'user' },
    {
        id: 'signatures',
        label: t('users.card.tab.signatures'),
        icon: 'signature',
        n: signedOrders.value.length || undefined,
    },
    {
        id: 'orders',
        label: t('users.card.tab.orders'),
        icon: 'clipboard_list',
        n: orders.value.length,
    },
    { id: 'points', label: t('users.card.tab.points'), icon: 'coin' },
    {
        id: 'documentation',
        label: t('users.card.tab.documentation'),
        icon: 'file_text',
    },
]);

const cardName = computed(
    () =>
        `${loc(props.practitioner.name)} — ${t(
            `therapy.${props.practitioner.therapy}`,
        )}`,
);

const clinicAddress = computed(() => formatAddress(props.practitioner, t, loc));

// ---- orders tab ----------------------------------------------------------

function itemSummary(order) {
    const formulas = trackedItems(order).length;
    const shelf = shelfItems(order).length;
    const parts = [];

    if (formulas > 0) {
        parts.push(t('orders.items.formulaCount', formulas));
    }

    if (shelf > 0) {
        parts.push(t('orders.items.shelfCount', shelf));
    }

    return parts.join(' · ');
}

const statusIds = computed(() =>
    ORDER_STATUS_IDS.filter((id) =>
        orders.value.some((order) => statusOf(order) === id),
    ),
);

const orderStatusCount = (id) =>
    orders.value.filter((order) => statusOf(order) === id).length;

const orderTypeCount = (type) =>
    orders.value.filter((order) =>
        type === 'formula'
            ? order.type === 'formula'
            : order.type !== 'formula',
    ).length;

const shownOrders = computed(() =>
    orders.value.filter((order) => {
        if (oStatus.value && statusOf(order) !== oStatus.value) {
            return false;
        }

        if (oType.value === 'formula' && order.type !== 'formula') {
            return false;
        }

        if (oType.value === 'shelf' && order.type === 'formula') {
            return false;
        }

        const query = oQuery.value.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(order.id, order.patient.name, order.items).includes(
                query,
            )
        ) {
            return false;
        }

        return true;
    }),
);

const ordersDirty = computed(() =>
    Boolean(oQuery.value || oStatus.value || oType.value),
);

const orderCols = computed(() => [
    { k: 'id', label: t('users.card.ordersCol.id'), nowrap: true },
    { k: 'patient', label: t('users.card.ordersCol.customer') },
    { k: 'items', label: t('users.card.ordersCol.items') },
    { k: 'total', label: t('users.card.ordersCol.total'), nowrap: true },
    { k: 'status', label: t('users.card.ordersCol.status'), nowrap: true },
    { k: 'date', label: t('users.card.ordersCol.date'), nowrap: true },
]);

function clearOrders() {
    oQuery.value = '';
    oStatus.value = '';
    oType.value = '';
}

// ---- signatures tab ------------------------------------------------------

const sigCols = computed(() => [
    { k: 'sig', label: t('users.signatures.col.sig'), w: '170px' },
    { k: 'who', label: t('users.signatures.col.who') },
    { k: 'form', label: t('users.signatures.col.form') },
    { k: 'order', label: t('users.signatures.col.order'), nowrap: true },
    { k: 'date', label: t('users.signatures.col.date'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

function signatory(order) {
    return order.payer === 'patient'
        ? { name: order.patient.name, tz: order.patient.tz }
        : { name: props.practitioner.name, tz: props.practitioner.tz };
}

// ---- documentation tab ---------------------------------------------------

const docRecords = computed(() => {
    const base = props.practitioner.documentation || [];
    const extra = props.practitioner.docsExtra || [];

    return [...base, ...extra].sort((a, b) => a.when.daysAgo - b.when.daysAgo);
});

const docById = computed(() =>
    Object.fromEntries(docRecords.value.map((record) => [record.id, record])),
);

const docCountOf = (kind) =>
    docRecords.value.filter((record) => record.kind === kind).length;

const shownDocs = computed(() =>
    docRecords.value.filter((record) => {
        if (docKind.value && record.kind !== docKind.value) {
            return false;
        }

        const query = docQuery.value.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(
                record.actor,
                record.act,
                record.det,
                record.text,
                record.from,
                record.to,
            ).includes(query)
        ) {
            return false;
        }

        return true;
    }),
);

const docsDirty = computed(() => Boolean(docKind.value || docQuery.value));

const notePlaceholder = computed(() =>
    fixTarget.value
        ? t('users.documentation.fixPlaceholder')
        : t('users.documentation.placeholder'),
);

function fixReference(record) {
    const original = docById.value[record.fixOf];

    if (!original) {
        return '';
    }

    return t('users.documentation.fixOf', {
        when: original.when.stamp,
        actor: loc(original.actor),
    });
}

function startFix(record) {
    fixTarget.value = record;
    noteText.value = '';
}

function cancelFix() {
    fixTarget.value = null;
    noteText.value = '';
}

function addNote() {
    const text = noteText.value.trim();

    if (!text) {
        return;
    }

    const fixing = fixTarget.value;

    people.addPractitionerNote(
        props.practitioner,
        text,
        fixing ? fixing.id : null,
    );
    push({
        title: fixing
            ? t('users.documentation.addedFixTitle')
            : t('users.documentation.addedTitle'),
        body: t('users.documentation.addedBody', {
            actor: loc(dataset.me?.name),
        }),
    });
    noteText.value = '';
    fixTarget.value = null;
}

// ---- account actions -----------------------------------------------------

const creditEffects = computed(() =>
    creditIntent.value === 'off'
        ? [
              t('users.credit.revokeEffect.pay'),
              t('users.credit.revokeEffect.open'),
              t('users.credit.revokeEffect.log'),
          ]
        : [
              t('users.credit.approveEffect.status'),
              t('users.credit.approveEffect.noCeiling'),
              t('users.credit.approveEffect.collect'),
              t('users.credit.approveEffect.log'),
          ],
);

function requestCredit(next) {
    creditIntent.value = next ? 'on' : 'off';
}

function applyCredit(reason) {
    const approving = creditIntent.value === 'on';

    people.setCreditTerms(
        props.practitioner,
        approving,
        approving ? null : reason,
    );

    if (approving) {
        push({
            title: t('users.credit.approvedToastTitle'),
            body: t('users.credit.approvedToastBody'),
        });
    } else {
        push({
            title: t('users.credit.revokedToastTitle'),
            body: t('users.credit.revokedToastBody', { reason }),
            bad: true,
        });
    }

    creditIntent.value = null;
}

function sendMessage() {
    push({
        title: t('users.card.composerTitle'),
        body: t('users.card.composerBody', {
            name: loc(props.practitioner.name),
        }),
    });
}

function onSave(changes, labels) {
    people.savePractitioner(props.practitioner, changes);
    push({
        title: t('users.edit.savedTitle'),
        body: labels.length ? labels.join(' · ') : t('users.edit.unchanged'),
    });
}

function onUpload(doc) {
    push({
        title: t('users.edit.uploadTitle'),
        body: t('users.edit.uploadBody', { doc }),
    });
}

function onReset() {
    people.resetPractitionerPassword(props.practitioner);
    push({
        title: t('users.edit.resetTitle'),
        body: props.practitioner.email,
    });
}
</script>

<template>
    <div class="a-dhead">
        <div class="a-dhead-top u-top">
            <div>
                <div class="a-dhead-t">
                    <h2 class="u-name">{{ loc(practitioner.name) }}</h2>
                    <AChip tone="gray" :dot="false">
                        {{
                            t('users.card.codeChip', {
                                code: practitioner.code,
                            })
                        }}
                    </AChip>
                    <AChip
                        :tone="practitioner.credit ? 'purple' : 'gray'"
                        size="lg"
                        :dot="false"
                    >
                        {{
                            practitioner.credit
                                ? t('users.card.creditOn')
                                : t('users.card.creditOff')
                        }}
                    </AChip>
                    <AChip
                        v-if="practitioner.debt > 0"
                        :tone="isLate ? 'red' : 'amber'"
                        :dot="false"
                    >
                        {{
                            t('users.card.debtChip', {
                                amount: ils(practitioner.debt, 0),
                                days: practitioner.debtDays,
                            })
                        }}
                    </AChip>
                </div>
                <div class="a-dhead-m">
                    <span>
                        {{ t(`therapy.${practitioner.therapy}`) }} ·
                        {{ loc(practitioner.spec) }}
                    </span>
                    <span
                        ><ANum>{{ practitioner.phone }}</ANum></span
                    >
                    <span class="ltr">{{ practitioner.email }}</span>
                    <span>
                        {{
                            t('users.card.since', { date: practitioner.since })
                        }}
                    </span>
                </div>
            </div>
            <div class="a-dhead-a">
                <AButton icon="whatsapp" @click="sendMessage">
                    {{ t('users.card.message') }}
                </AButton>
                <AButton
                    kind="p"
                    icon="edit"
                    :title="t('users.card.editHint')"
                    @click="editing = true"
                >
                    {{ t('users.card.edit') }}
                </AButton>
                <AButton sm icon="x" @click="emit('close')">
                    {{ t('actions.close') }}
                </AButton>
            </div>
        </div>
        <ATabs
            :tabs="tabs"
            :model-value="view.ctab"
            @update:model-value="view.ctab = $event"
        />
    </div>

    <!-- Profile -->
    <div v-if="view.ctab === 'profile'" class="a-2col">
        <ACard :title="t('users.card.title')" icon="user">
            <AKeyValue>
                <dt>{{ t('users.field.code') }}</dt>
                <dd>
                    <ANum>{{ practitioner.code }}</ANum>
                    <span v-if="practitioner.legacyNum" class="u-aside">
                        · {{ t('users.card.legacyNum') }}
                    </span>
                </dd>
                <dt>{{ t('users.field.cardName') }}</dt>
                <dd>{{ cardName }}</dd>
                <dt>{{ t('users.field.tz') }}</dt>
                <dd>
                    <ANum>{{ practitioner.tz }}</ANum>
                </dd>
                <dt>{{ t('users.field.baseDiscount') }}</dt>
                <dd>
                    <ANum>{{ practitioner.disc }}</ANum
                    >%
                    <span
                        v-if="practitioner.disc !== SETTINGS.defaultDiscountPct"
                        class="u-aside"
                    >
                        ·
                        {{
                            t('users.card.defaultDisc', {
                                n: SETTINGS.defaultDiscountPct,
                            })
                        }}
                    </span>
                </dd>
                <dt>{{ t('users.field.points') }}</dt>
                <dd>
                    {{
                        t('users.card.pointsUnit', {
                            n: num(practitioner.points),
                        })
                    }}
                </dd>
                <dt>{{ t('users.field.spec') }}</dt>
                <dd>{{ loc(practitioner.spec) }}</dd>
                <dt>{{ t('users.card.clinic') }}</dt>
                <dd>{{ loc(practitioner.clinic) || '—' }}</dd>
                <dt>{{ t('users.field.since') }}</dt>
                <dd>
                    <ANum>{{ practitioner.since }}</ANum>
                </dd>
            </AKeyValue>
        </ACard>

        <div class="a-grid">
            <ACard :title="t('users.card.account')" icon="card">
                <div class="u-stats">
                    <AKpi
                        :label="t('users.field.points')"
                        :value="num(practitioner.points)"
                        :sub="
                            t('users.card.pointsValue', {
                                amount: ils(practitioner.points, 0),
                            })
                        "
                    />
                    <AKpi
                        :label="t('users.field.debt')"
                        :sub="
                            practitioner.debt
                                ? t('users.card.debtAge', {
                                      n: practitioner.debtDays,
                                  })
                                : t('users.card.noDebt')
                        "
                    >
                        <template #value>
                            <span :class="{ 'u-debt': practitioner.debt }">
                                <AMoney :value="practitioner.debt" />
                            </span>
                        </template>
                    </AKpi>
                    <AKpi
                        :label="t('users.field.orders')"
                        :value="num(practitioner.orders)"
                    />
                    <AKpi :label="t('users.field.baseDiscount')">
                        <template #value>
                            <ANum>{{ practitioner.disc }}</ANum
                            >%
                        </template>
                    </AKpi>
                </div>
            </ACard>

            <ACard :title="t('users.credit.title')" icon="coin">
                <template #right>
                    <AChip
                        :tone="practitioner.credit ? 'purple' : 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{
                            practitioner.credit
                                ? t('users.credit.approved')
                                : t('users.credit.notApproved')
                        }}
                    </AChip>
                </template>
                <div class="u-credit">
                    <ASwitch
                        :model-value="practitioner.credit"
                        :label="t('users.credit.switchLabel')"
                        @update:model-value="requestCredit"
                    />
                    <div>
                        <div class="u-credit-state">
                            {{
                                practitioner.credit
                                    ? t('users.credit.stateOn')
                                    : t('users.credit.stateOff')
                            }}
                        </div>
                        <div class="u-credit-lock">
                            {{ t('users.credit.pinNote') }}
                        </div>
                        <div class="u-credit-explain">
                            {{
                                practitioner.credit
                                    ? t('users.credit.explainOn')
                                    : t('users.credit.explainOff')
                            }}
                        </div>
                    </div>
                </div>
                <AKeyValue>
                    <dt>{{ t('users.credit.approvedOn') }}</dt>
                    <dd>
                        <ANum v-if="practitioner.creditSince">
                            {{ practitioner.creditSince }}
                        </ANum>
                        <template v-else>—</template>
                    </dd>
                    <dt>{{ t('users.credit.approvedBy') }}</dt>
                    <dd>{{ loc(practitioner.creditBy) || '—' }}</dd>
                    <template v-if="practitioner.creditRevoked">
                        <dt>{{ t('users.credit.revokedOn') }}</dt>
                        <dd>
                            <ANum>{{ practitioner.creditRevoked }}</ANum>
                        </dd>
                    </template>
                    <dt>{{ t('users.credit.ceiling') }}</dt>
                    <dd>{{ t('users.credit.noCeiling') }}</dd>
                    <dt>{{ t('users.credit.collection') }}</dt>
                    <dd>{{ t('users.credit.collectionHow') }}</dd>
                </AKeyValue>
                <div v-if="practitioner.debt > 0" class="a-hint u-credit-hint">
                    {{ t('users.credit.financeHint') }}
                </div>
            </ACard>

            <ACard :title="t('users.card.addresses')" icon="map_pin">
                <AKeyValue>
                    <dt>{{ t('users.card.clinic') }}</dt>
                    <dd>{{ loc(practitioner.clinic) || '—' }}</dd>
                    <dt>{{ t('users.field.address') }}</dt>
                    <dd>{{ clinicAddress || loc(practitioner.city) }}</dd>
                    <dt>{{ t('users.card.defaultShip') }}</dt>
                    <dd>{{ t('users.card.clinicAddress') }}</dd>
                </AKeyValue>
            </ACard>
        </div>
    </div>

    <!-- Signatures -->
    <template v-else-if="view.ctab === 'signatures'">
        <ACard
            v-if="signedOrders.length"
            :title="t('users.signatures.title')"
            icon="signature"
            :pad="false"
        >
            <ADataTable :cols="sigCols" :rows="signedOrders" row-key="id">
                <template #cell-sig>
                    <div class="u-sig">
                        <ScanPlaceholder
                            :height="SIG_HEIGHT"
                            :label="t('users.doc.signatureScan')"
                        />
                    </div>
                </template>
                <template #cell-who="{ row }">
                    <div class="t-strong">{{ loc(signatory(row).name) }}</div>
                    <div class="t-sub">
                        {{ t('users.signatures.tz', { n: signatory(row).tz }) }}
                    </div>
                </template>
                <template #cell-form="{ row }">
                    {{
                        row.patient.meds.length
                            ? t('users.signatures.formMeds')
                            : t('users.signatures.formPlain')
                    }}
                </template>
                <template #cell-order="{ row }">
                    <ANum>{{ row.id }}</ANum>
                </template>
                <template #cell-date="{ row }">
                    <ANum>{{ fmtISO(row.iso) }}</ANum>
                </template>
                <template #cell-act="{ row }">
                    <div class="a-rowbtns">
                        <AButton
                            sm
                            icon="zoom"
                            @click="
                                push({
                                    title: t('users.signatures.viewToast'),
                                    body: row.id,
                                })
                            "
                        >
                            {{ t('users.signatures.view') }}
                        </AButton>
                        <AButton
                            sm
                            icon="download"
                            @click="
                                push({
                                    title: t('users.signatures.pdfToast'),
                                    body: row.id,
                                })
                            "
                        >
                            {{ t('users.signatures.pdf') }}
                        </AButton>
                    </div>
                </template>
            </ADataTable>
        </ACard>
        <ACard v-else>
            <AEmpty
                icon="signature"
                :title="t('users.signatures.emptyTitle')"
                :sub="t('users.signatures.emptySub')"
            />
        </ACard>
    </template>

    <!-- Order history -->
    <ACard
        v-else-if="view.ctab === 'orders'"
        :title="t('users.card.ordersHistory')"
        icon="clipboard_list"
        :pad="false"
    >
        <div class="u-bar">
            <FilterBar
                :count="shownOrders.length"
                :label="t('users.card.ordersCount', { n: orders.length })"
                :dirty="ordersDirty"
                @clear="clearOrders"
            >
                <SearchField
                    v-model="oQuery"
                    :placeholder="t('users.card.ordersSearch')"
                />
                <ASelect
                    v-model="oStatus"
                    :aria-label="t('users.card.statusAria')"
                >
                    <option value="">{{ t('users.card.allStatuses') }}</option>
                    <option v-for="id in statusIds" :key="id" :value="id">
                        {{
                            t('users.card.option', {
                                label: t(`status.${id}`),
                                n: orderStatusCount(id),
                            })
                        }}
                    </option>
                </ASelect>
                <ASelect v-model="oType" :aria-label="t('users.card.typeAria')">
                    <option value="">{{ t('users.card.allTypes') }}</option>
                    <option value="formula">
                        {{
                            t('users.card.typeFormula', {
                                n: orderTypeCount('formula'),
                            })
                        }}
                    </option>
                    <option value="shelf">
                        {{
                            t('users.card.typeShelf', {
                                n: orderTypeCount('shelf'),
                            })
                        }}
                    </option>
                </ASelect>
            </FilterBar>
        </div>
        <ADataTable :cols="orderCols" :rows="shownOrders" row-key="id">
            <template #empty>
                <AEmpty
                    icon="clipboard_list"
                    :title="
                        orders.length
                            ? t('users.card.ordersNoMatchTitle')
                            : t('users.card.ordersEmptyTitle')
                    "
                    :sub="orders.length ? t('users.card.ordersNoMatchSub') : ''"
                />
            </template>
            <template #cell-id="{ row }">
                <span class="t-strong"
                    ><ANum>{{ row.id }}</ANum></span
                >
            </template>
            <template #cell-patient="{ row }">
                {{ loc(row.patient.name) }}
            </template>
            <template #cell-items="{ row }">
                <div>
                    {{ loc(row.items[0]?.name) }}
                    <template v-if="row.items.length > 1">
                        {{
                            t('orders.items.more', { n: row.items.length - 1 })
                        }}
                    </template>
                </div>
                <div class="t-sub">{{ itemSummary(row) }}</div>
            </template>
            <template #cell-total="{ row }">
                <AMoney :value="row.pricing.total" />
            </template>
            <template #cell-status="{ row }">
                <StatusChip :status="statusOf(row)" />
            </template>
            <template #cell-date="{ row }">
                <ANum>{{ fmtISO(row.iso) }}</ANum>
            </template>
        </ADataTable>
    </ACard>

    <!-- Points -->
    <PointsLedger
        v-else-if="view.ctab === 'points'"
        :practitioner="practitioner"
    />

    <!-- Documentation -->
    <template v-else-if="view.ctab === 'documentation'">
        <div class="a-note a-note--info u-doc-note">
            {{ t('users.documentation.note') }}
        </div>

        <ACard :title="t('users.documentation.addTitle')" icon="edit">
            <template #right>
                <span class="u-doc-by">
                    {{
                        t('users.documentation.addBy', {
                            actor: loc(dataset.me?.name),
                        })
                    }}
                </span>
            </template>
            <div v-if="fixTarget" class="a-note a-note--warn u-doc-fixing">
                <span>{{ fixReference({ fixOf: fixTarget.id }) }}</span>
                <AButton sm icon="x" @click="cancelFix">
                    {{ t('users.documentation.cancelFix') }}
                </AButton>
            </div>
            <ATextarea
                v-model="noteText"
                :rows="3"
                class="a-w100"
                :placeholder="notePlaceholder"
            />
            <div class="u-doc-add">
                <AButton
                    kind="p"
                    icon="plus"
                    :disabled="!noteText.trim()"
                    @click="addNote"
                >
                    {{
                        fixTarget
                            ? t('users.documentation.addFix')
                            : t('users.documentation.add')
                    }}
                </AButton>
                <span class="u-doc-hint">{{
                    t('users.documentation.hint')
                }}</span>
            </div>
        </ACard>

        <ACard
            :title="t('users.documentation.listTitle')"
            icon="file_text"
            :pad="false"
        >
            <div class="u-bar">
                <FilterBar
                    :count="shownDocs.length"
                    :label="
                        t('users.documentation.shown', { n: shownDocs.length })
                    "
                    :dirty="docsDirty"
                    @clear="
                        docKind = '';
                        docQuery = '';
                    "
                >
                    <SearchField
                        v-model="docQuery"
                        :placeholder="t('users.documentation.search')"
                    />
                    <ASelect
                        v-model="docKind"
                        :aria-label="t('users.documentation.actorAria')"
                    >
                        <option value="">
                            {{ t('users.documentation.filter.all') }}
                        </option>
                        <option
                            v-for="kind in ['system', 'agent', 'manual']"
                            :key="kind"
                            :value="kind"
                        >
                            {{
                                t('users.documentation.option', {
                                    label: t(
                                        `users.documentation.filter.${kind}`,
                                    ),
                                    n: docCountOf(kind),
                                })
                            }}
                        </option>
                    </ASelect>
                </FilterBar>
            </div>

            <div v-if="shownDocs.length" class="u-doc-list">
                <article
                    v-for="record in shownDocs"
                    :key="record.id"
                    class="u-doc-row"
                >
                    <div class="u-doc-head">
                        <AChip
                            :tone="
                                record.kind === 'manual'
                                    ? 'blue'
                                    : record.kind === 'agent'
                                      ? 'teal'
                                      : 'gray'
                            "
                            size="sm"
                        >
                            {{ t(`users.documentation.kind.${record.kind}`) }}
                        </AChip>
                        <span class="u-doc-actor">{{ loc(record.actor) }}</span>
                        <span class="u-doc-when">
                            <ANum>{{ record.when.stamp }}</ANum>
                        </span>
                        <AButton
                            v-if="record.kind === 'manual' && !record.fixOf"
                            sm
                            icon="edit"
                            @click="startFix(record)"
                        >
                            {{ t('users.documentation.addFix') }}
                        </AButton>
                    </div>
                    <div v-if="record.text" class="u-doc-text">
                        {{ loc(record.text) }}
                    </div>
                    <template v-else>
                        <div class="u-doc-act">{{ loc(record.act) }}</div>
                        <div v-if="record.det" class="u-doc-det">
                            {{ loc(record.det) }}
                        </div>
                        <div
                            v-if="record.from || record.to"
                            class="u-doc-delta"
                        >
                            <span class="u-doc-label">
                                {{ t('users.documentation.before') }}
                            </span>
                            {{ loc(record.from) || '—' }}
                            <span class="u-doc-label">
                                {{ t('users.documentation.after') }}
                            </span>
                            {{ loc(record.to) || '—' }}
                        </div>
                    </template>
                    <div v-if="record.fixOf" class="u-doc-fixref">
                        {{ fixReference(record) }}
                    </div>
                </article>
            </div>
            <AEmpty
                v-else
                icon="file_text"
                :title="t('users.documentation.emptyTitle')"
                :sub="t('users.documentation.emptySub')"
            />
        </ACard>
    </template>

    <PractitionerEdit
        :open="editing"
        :title="
            t('users.edit.practitionerTitle', { name: loc(practitioner.name) })
        "
        :note="t('users.edit.practitionerNote', { code: practitioner.code })"
        :fields="editFields"
        :entity="practitioner"
        show-documents
        @close="editing = false"
        @save="onSave"
        @upload="onUpload"
        @reset="onReset"
    />

    <ConfirmDialog
        :open="creditIntent !== null"
        :title="
            creditIntent === 'off'
                ? t('users.credit.revokeTitle')
                : t('users.credit.approveTitle')
        "
        :confirm-label="
            creditIntent === 'off'
                ? t('users.credit.revokeLabel')
                : t('users.credit.approveLabel')
        "
        :body="
            creditIntent === 'off'
                ? t('users.credit.revokeBody', {
                      name: loc(practitioner.name),
                  })
                : t('users.credit.approveBody', {
                      name: loc(practitioner.name),
                  })
        "
        :effects="creditEffects"
        :danger="creditIntent === 'off'"
        :reason="creditIntent === 'off'"
        :pin="dataset.session?.pin || true"
        @close="creditIntent = null"
        @confirm="applyCredit"
    />
</template>

<style scoped>
.u-top {
    padding-bottom: 14px;
}

.u-name {
    margin: 0;
    font-size: 26px;
}

.u-aside {
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.u-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.u-debt {
    color: var(--a-red);
}

.u-credit {
    display: flex;
    gap: 14px;
    align-items: center;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--a-line);
}

.u-credit-state {
    font-weight: 700;
    font-size: 16.5px;
}

.u-credit-lock,
.u-credit-explain {
    margin-top: 2px;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.u-credit-hint {
    margin-top: 14px;
}

.u-bar {
    padding: 14px 18px 0;
}

.u-sig {
    width: 150px;
}

.u-doc-note {
    margin-bottom: 16px;
}

.u-doc-by {
    font-size: 13px;
    color: var(--a-ink-4);
}

.u-doc-fixing {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.u-doc-add {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 12px;
}

.u-doc-hint {
    font-size: 13px;
    color: var(--a-ink-4);
}

.u-doc-list {
    display: flex;
    flex-direction: column;
}

.u-doc-row {
    padding: 14px 18px;
    border-top: 1px solid var(--a-line);
}

.u-doc-row:first-child {
    border-top: none;
}

.u-doc-head {
    display: flex;
    align-items: center;
    gap: 10px;
}

.u-doc-actor {
    font-weight: 600;
}

.u-doc-when {
    color: var(--a-ink-4);
    font-size: 13px;
}

.u-doc-text,
.u-doc-act {
    margin-top: 8px;
}

.u-doc-act {
    font-weight: 600;
}

.u-doc-det {
    margin-top: 3px;
    color: var(--a-ink-3);
    font-size: 14px;
}

.u-doc-delta {
    margin-top: 6px;
    font-size: 14px;
}

.u-doc-label {
    color: var(--a-ink-4);
    font-size: 12.5px;
    margin: 0 4px;
}

.u-doc-fixref {
    margin-top: 6px;
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
