<script setup>
// One patient's card, as the drawer body over the patient directory.
//
// A patient is local-only data: he never signs in, he never orders by himself,
// and he is always bound to exactly one practitioner. The link cannot be removed,
// only moved — a documented transfer with a reason — so there is no "unlink"
// anywhere on this card.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ActivitiesPanel from '@/components/ui/ActivitiesPanel.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AKpi from '@/components/ui/AKpi.vue';
import AModal from '@/components/ui/AModal.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PayerChip from '@/components/ui/PayerChip.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { formatAddress } from '@/components/users/address';
import { patientFields } from '@/components/users/personFields';
import PractitionerEdit from '@/components/users/PractitionerEdit.vue';
import ScanPh from '@/components/users/ScanPlaceholder.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { fmtISO } from '@/lib/dates';
import { useCrmStore } from '@/stores/crm';
import { useDatasetStore } from '@/stores/dataset';
import { shelfItems, statusOf, trackedItems } from '@/stores/orders';
import { usePeopleStore } from '@/stores/people';

/** How tall a declaration signature scan renders inside its cell. */
const SIG_HEIGHT = 44;

const props = defineProps({
    patient: { type: Object, required: true },
});

const emit = defineEmits(['close', 'open-practitioner']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const people = usePeopleStore();
const dataset = useDatasetStore();

const view = useUrlState({ ptab: 'profile' });

const editing = ref(false);
const moving = ref(false);
const movingConfirm = ref(false);
const target = ref('');
const reason = ref('');

const editFields = computed(() => patientFields(t));
const crm = useCrmStore();
const activities = computed(() =>
    crm.activitiesOf('customer', props.patient.code),
);

const orders = computed(() => people.ordersForPatient(props.patient.tz));
const declarations = computed(() =>
    orders.value.filter((order) => order.poaSigned),
);
const transfers = computed(() => props.patient.transfers || []);

const address = computed(() => formatAddress(props.patient, t, loc));

const targets = computed(() =>
    people.practitioners.filter((one) => one.code !== props.patient.prCode),
);
const targetCard = computed(() => people.practitionerByCode(target.value));

const tabs = computed(() => [
    { id: 'profile', label: t('users.customer.tab.profile'), icon: 'user' },
    {
        id: 'link',
        label: t('users.customer.tab.link'),
        icon: 'users',
        n: transfers.value.length || undefined,
    },
    {
        id: 'orders',
        label: t('users.customer.tab.orders'),
        icon: 'clipboard_list',
        n: orders.value.length,
    },
    {
        id: 'safety',
        label: t('users.customer.tab.safety'),
        icon: 'shield',
        n: declarations.value.length || undefined,
    },
    // V2
    {
        id: 'activities',
        label: t('users.customer.tab.activities'),
        icon: 'phone',
        n: activities.value.length || undefined,
    },
]);

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

const orderCols = computed(() => [
    { k: 'id', label: t('users.customer.ordersCol.id'), nowrap: true },
    { k: 'pract', label: t('users.customer.ordersCol.practitioner') },
    { k: 'items', label: t('users.customer.ordersCol.items') },
    { k: 'payer', label: t('users.customer.ordersCol.payer'), nowrap: true },
    { k: 'total', label: t('users.customer.ordersCol.total'), nowrap: true },
    { k: 'status', label: t('users.customer.ordersCol.status'), nowrap: true },
    { k: 'date', label: t('users.customer.ordersCol.date'), nowrap: true },
]);

const transferCols = computed(() => [
    { k: 'when', label: t('users.customer.transferCol.when'), nowrap: true },
    { k: 'from', label: t('users.customer.transferCol.from') },
    { k: 'to', label: t('users.customer.transferCol.to') },
    { k: 'by', label: t('users.customer.transferCol.by') },
    { k: 'why', label: t('users.customer.transferCol.why') },
]);

const declCols = computed(() => [
    { k: 'sig', label: t('users.signatures.col.sig'), w: '160px' },
    { k: 'form', label: t('users.signatures.col.form') },
    { k: 'order', label: t('users.signatures.col.order'), nowrap: true },
    { k: 'date', label: t('users.signatures.col.date'), nowrap: true },
]);

watch(
    () => moving.value,
    (open) => {
        if (open) {
            target.value = '';
            reason.value = '';
            movingConfirm.value = false;
        }
    },
);

function onSave(changes, labels) {
    people.savePatient(props.patient, changes);
    push({
        title: t('users.edit.savedCustomerTitle'),
        body: labels.length ? labels.join(' · ') : t('users.edit.unchanged'),
    });
}

function applyTransfer() {
    const to = targetCard.value;

    people.transferPatient(props.patient, to, reason.value.trim());
    moving.value = false;
    movingConfirm.value = false;
    push({
        title: t('users.transfer.doneTitle'),
        body: t('users.transfer.doneBody', {
            name: loc(props.patient.name),
            to: loc(to.name),
        }),
    });
}
</script>

<template>
    <div class="a-dhead">
        <div class="a-dhead-top u-top">
            <div>
                <div class="a-dhead-t">
                    <h2 class="u-name">{{ loc(patient.name) }}</h2>
                    <AChip tone="gray" :dot="false">
                        {{
                            t('users.customer.codeChip', { code: patient.code })
                        }}
                    </AChip>
                    <AChip tone="teal" size="lg" :dot="false">
                        {{
                            t('users.customer.practitionerChip', {
                                name: loc(patient.prName),
                            })
                        }}
                    </AChip>
                    <AChip
                        v-if="patient.status !== 'active'"
                        tone="gray"
                        :dot="false"
                    >
                        {{ t('users.customer.inactive') }}
                    </AChip>
                    <AChip v-if="!patient.consent" tone="amber" :dot="false">
                        {{ t('users.customer.noConsent') }}
                    </AChip>
                </div>
                <div class="a-dhead-m">
                    <span>{{ t('users.customer.tz', { n: patient.tz }) }}</span>
                    <span
                        ><ANum>{{ patient.phone }}</ANum></span
                    >
                    <span v-if="patient.email" class="ltr">
                        {{ patient.email }}
                    </span>
                    <span>
                        {{
                            t('users.customer.ageSex', {
                                age: patient.age,
                                sex: t(`users.sexLabel.${patient.sex}`),
                            })
                        }}
                    </span>
                    <span>{{ loc(patient.city) }}</span>
                </div>
            </div>
            <div class="a-dhead-a">
                <AButton
                    icon="user"
                    @click="emit('open-practitioner', patient.prCode)"
                >
                    {{ t('users.customer.openPractitioner') }}
                </AButton>
                <AButton icon="refresh" @click="moving = true">
                    {{ t('users.customer.transfer') }}
                </AButton>
                <AButton
                    kind="p"
                    icon="edit"
                    :title="t('users.customer.editHint')"
                    @click="editing = true"
                >
                    {{ t('users.customer.edit') }}
                </AButton>
                <AButton sm icon="x" @click="emit('close')">
                    {{ t('actions.close') }}
                </AButton>
            </div>
        </div>
        <ATabs
            :tabs="tabs"
            :model-value="view.ptab"
            @update:model-value="view.ptab = $event"
        />
    </div>

    <!-- Profile -->
    <div v-if="view.ptab === 'profile'" class="a-2col">
        <ACard :title="t('users.customer.details')" icon="user">
            <AKeyValue>
                <dt>{{ t('users.field.customerCode') }}</dt>
                <dd>
                    <ANum>{{ patient.code }}</ANum>
                    <span class="u-aside"
                        >· {{ t('users.customer.codeNote') }}</span
                    >
                </dd>
                <dt>{{ t('users.field.fullName') }}</dt>
                <dd>{{ loc(patient.name) }}</dd>
                <dt>{{ t('users.field.tz') }}</dt>
                <dd>
                    <ANum>{{ patient.tz }}</ANum>
                </dd>
                <dt>{{ t('users.field.birth') }}</dt>
                <dd>
                    {{
                        t('users.customer.birthAge', {
                            date: patient.birth,
                            age: patient.age,
                        })
                    }}
                </dd>
                <dt>{{ t('users.field.sex') }}</dt>
                <dd>{{ t(`users.sexLabel.${patient.sex}`) }}</dd>
                <dt>{{ t('users.field.phone') }}</dt>
                <dd>
                    <ANum>{{ patient.phone }}</ANum>
                </dd>
                <dt>{{ t('users.field.email') }}</dt>
                <dd>
                    <span v-if="patient.email" class="ltr">
                        {{ patient.email }}
                    </span>
                    <template v-else>—</template>
                </dd>
                <dt>{{ t('users.field.createdAt') }}</dt>
                <dd>
                    {{
                        t('users.customer.createdSource', {
                            date: patient.created,
                            source: t(`users.source.${patient.source}`),
                        })
                    }}
                </dd>
            </AKeyValue>
            <div class="a-note a-note--info u-local">
                {{ t('users.customer.localOnly') }}
            </div>
        </ACard>

        <div class="a-grid">
            <ACard :title="t('users.customer.shipping')" icon="map_pin">
                <AKeyValue>
                    <dt>{{ t('users.field.address') }}</dt>
                    <dd>{{ address || loc(patient.city) }}</dd>
                    <dt>{{ t('users.field.city') }}</dt>
                    <dd>{{ loc(patient.city) }}</dd>
                    <dt>{{ t('users.customer.shipDefault') }}</dt>
                    <dd>{{ t('users.customer.shipDefaultValue') }}</dd>
                </AKeyValue>
            </ACard>

            <ACard :title="t('users.customer.activity')" icon="chart">
                <div class="u-stats">
                    <AKpi
                        :label="t('users.field.orders')"
                        :value="patient.orders"
                    />
                    <AKpi :label="t('users.field.spent')">
                        <template #value>
                            <AMoney :value="patient.spent" />
                        </template>
                    </AKpi>
                    <AKpi :label="t('users.field.lastOrder')" small>
                        <template #value>
                            <ANum v-if="patient.lastOrder">
                                {{ fmtISO(patient.lastOrder) }}
                            </ANum>
                            <template v-else>—</template>
                        </template>
                    </AKpi>
                    <AKpi :label="t('users.field.status')" small>
                        <template #value>
                            {{
                                patient.status === 'active'
                                    ? t('users.customers.active')
                                    : t('users.customers.inactive')
                            }}
                        </template>
                    </AKpi>
                </div>
            </ACard>

            <ACard :title="t('users.customer.consents')" icon="shield">
                <AKeyValue>
                    <dt>{{ t('users.field.consent') }}</dt>
                    <dd>
                        <AChip v-if="patient.consent" tone="green" size="sm">
                            {{ t('users.customer.consentSigned') }}
                        </AChip>
                        <AChip v-else tone="amber" size="sm">
                            {{ t('users.customer.consentMissing') }}
                        </AChip>
                    </dd>
                    <dt>{{ t('users.field.marketing') }}</dt>
                    <dd>
                        {{
                            patient.mkt
                                ? t('users.customer.mktOn')
                                : t('users.customer.mktOff')
                        }}
                    </dd>
                    <dt>{{ t('users.field.shippingMsgs') }}</dt>
                    <dd>{{ t('users.customer.shipMsgs') }}</dd>
                </AKeyValue>
            </ACard>

            <ACard :title="t('users.customer.site')" icon="external">
                <template #right>
                    <V2Badge id="site-fields" size="sm" />
                </template>
                <AKeyValue>
                    <dt>{{ t('users.customer.siteAccount') }}</dt>
                    <dd>
                        {{
                            patient.siteAccount
                                ? t('users.customer.siteAccountOn')
                                : t('users.customer.siteAccountOff')
                        }}
                    </dd>
                    <dt>{{ t('users.customer.clubSince') }}</dt>
                    <dd>
                        <ANum v-if="patient.clubSince">{{
                            fmtISO(patient.clubSince)
                        }}</ANum>
                        <template v-else>—</template>
                    </dd>
                    <dt>{{ t('users.customer.sitePoints') }}</dt>
                    <dd>
                        <ANum>{{ patient.sitePoints || 0 }}</ANum>
                    </dd>
                    <dt>{{ t('users.customer.birthday') }}</dt>
                    <dd>
                        <ANum v-if="patient.birth">{{
                            fmtISO(patient.birth)
                        }}</ANum>
                        <template v-else>—</template>
                    </dd>
                </AKeyValue>
                <p class="a-hint">{{ t('users.customer.siteNote') }}</p>
            </ACard>
        </div>
    </div>

    <!-- V2: activities -->
    <ActivitiesPanel
        v-else-if="view.ptab === 'activities'"
        entity="customer"
        :ref-id="patient.code"
        :orders="orders"
    />

    <!-- Practitioner link -->
    <div v-else-if="view.ptab === 'link'" class="a-2col">
        <ACard :title="t('users.customer.linked')" icon="users">
            <template #right>
                <AButton sm icon="refresh" @click="moving = true">
                    {{ t('users.customer.transfer') }}
                </AButton>
            </template>
            <AKeyValue>
                <dt>{{ t('users.field.practitioner') }}</dt>
                <dd>
                    {{
                        t('users.customer.linkValue', {
                            code: patient.prCode,
                            name: loc(patient.prName),
                        })
                    }}
                </dd>
                <dt>{{ t('users.field.therapy') }}</dt>
                <dd>{{ t(`therapy.${patient.prTherapy}`) }}</dd>
                <dt>{{ t('users.field.linkedSince') }}</dt>
                <dd>
                    <ANum>{{ patient.linkedOn }}</ANum>
                </dd>
                <dt>{{ t('users.field.linkedBy') }}</dt>
                <dd>{{ loc(patient.linkedBy) }}</dd>
                <dt>{{ t('users.field.recordSource') }}</dt>
                <dd>{{ t(`users.source.${patient.source}`) }}</dd>
            </AKeyValue>
            <div class="a-note a-note--info u-local">
                {{ t('users.customer.linkNote') }}
            </div>
        </ACard>

        <ACard
            :title="t('users.customer.transfersTitle')"
            icon="clipboard_list"
            :pad="transfers.length ? false : true"
        >
            <ADataTable
                v-if="transfers.length"
                :cols="transferCols"
                :rows="transfers"
                :row-key="(row, i) => `${row.when}-${i}`"
            >
                <template #cell-when="{ row }">
                    <ANum>{{ row.when }}</ANum>
                </template>
                <template #cell-from="{ row }">
                    {{
                        t('users.customer.transferParty', {
                            code: row.fromCode,
                            name: loc(row.fromName),
                        })
                    }}
                </template>
                <template #cell-to="{ row }">
                    {{
                        t('users.customer.transferParty', {
                            code: row.toCode,
                            name: loc(row.toName),
                        })
                    }}
                </template>
                <template #cell-by="{ row }">{{ loc(row.by) }}</template>
                <template #cell-why="{ row }">{{ loc(row.why) }}</template>
            </ADataTable>
            <AEmpty
                v-else
                icon="users"
                :title="t('users.customer.noTransfersTitle')"
                :sub="t('users.customer.noTransfersSub')"
            />
        </ACard>
    </div>

    <!-- Orders -->
    <ACard
        v-else-if="view.ptab === 'orders'"
        :title="t('users.customer.ordersTitle')"
        icon="clipboard_list"
        :pad="orders.length ? false : true"
    >
        <ADataTable
            v-if="orders.length"
            :cols="orderCols"
            :rows="orders"
            row-key="id"
        >
            <template #cell-id="{ row }">
                <span class="t-strong"
                    ><ANum>{{ row.id }}</ANum></span
                >
            </template>
            <template #cell-pract="{ row }">
                {{ loc(row.practitioner.name) }}
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
            <template #cell-payer="{ row }">
                <PayerChip :payer="row.payer" size="sm" />
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
        <AEmpty
            v-else
            icon="clipboard_list"
            :title="t('users.customer.noOrdersTitle')"
            :sub="t('users.customer.noOrdersSub')"
        />
    </ACard>

    <!-- Safety & declarations -->
    <div v-else-if="view.ptab === 'safety'" class="a-2col">
        <ACard :title="t('users.customer.health')" icon="shield">
            <AKeyValue>
                <dt>{{ t('users.field.preg') }}</dt>
                <dd>
                    <AChip v-if="patient.preg" tone="amber" size="sm">
                        {{ t('labels.yes') }}
                    </AChip>
                    <template v-else>{{ t('labels.no') }}</template>
                </dd>
                <dt>{{ t('users.field.bf') }}</dt>
                <dd>
                    <AChip v-if="patient.bf" tone="amber" size="sm">
                        {{ t('labels.yes') }}
                    </AChip>
                    <template v-else>{{ t('labels.no') }}</template>
                </dd>
                <dt>{{ t('users.field.meds') }}</dt>
                <dd>
                    <span v-if="patient.meds.length" class="ltr">
                        {{ patient.meds.join(', ') }}
                    </span>
                    <template v-else>{{
                        t('users.customer.medsNone')
                    }}</template>
                </dd>
                <dt>{{ t('users.field.allerg') }}</dt>
                <dd>
                    {{ loc(patient.allerg) || t('users.customer.allergNone') }}
                </dd>
            </AKeyValue>
            <div class="a-note a-note--info u-local">
                {{ t('users.customer.healthNote') }}
            </div>
        </ACard>

        <ACard
            :title="t('users.customer.declarations')"
            icon="signature"
            :pad="declarations.length ? false : true"
        >
            <ADataTable
                v-if="declarations.length"
                :cols="declCols"
                :rows="declarations"
                row-key="id"
            >
                <template #cell-sig>
                    <div class="u-sig">
                        <ScanPh
                            :height="SIG_HEIGHT"
                            :label="t('users.doc.signatureScan')"
                        />
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
            </ADataTable>
            <AEmpty
                v-else
                icon="signature"
                :title="t('users.customer.noDeclTitle')"
                :sub="t('users.customer.noDeclSub')"
            />
        </ACard>
    </div>

    <PractitionerEdit
        :open="editing"
        :title="t('users.edit.customerTitle', { name: loc(patient.name) })"
        :note="t('users.edit.customerNote', { code: patient.code })"
        :fields="editFields"
        :entity="patient"
        @close="editing = false"
        @save="onSave"
    />

    <AModal
        :open="moving && !movingConfirm"
        :title="t('users.transfer.title', { name: loc(patient.name) })"
        :width="560"
        @close="moving = false"
    >
        <div class="a-note a-note--info u-local">
            {{ t('users.transfer.note') }}
        </div>
        <AKeyValue>
            <dt>{{ t('users.transfer.current') }}</dt>
            <dd>
                {{
                    t('users.transfer.currentValue', {
                        code: patient.prCode,
                        name: loc(patient.prName),
                        therapy: t(`therapy.${patient.prTherapy}`),
                    })
                }}
            </dd>
        </AKeyValue>
        <label class="a-lbl u-lbl" for="pt-to">
            {{ t('users.transfer.target') }}
            <span class="u-req">*</span>
        </label>
        <ASelect id="pt-to" v-model="target" class="a-w100">
            <option value="">{{ t('users.transfer.choose') }}</option>
            <option v-for="one in targets" :key="one.code" :value="one.code">
                {{
                    t('users.transfer.option', {
                        code: one.code,
                        name: loc(one.name),
                        therapy: t(`therapy.${one.therapy}`),
                    })
                }}
            </option>
        </ASelect>
        <label class="a-lbl u-lbl" for="pt-why">
            {{ t('users.transfer.reason') }}
            <span class="u-req">*</span>
        </label>
        <ATextarea
            id="pt-why"
            v-model="reason"
            :rows="3"
            class="a-w100"
            :placeholder="t('users.transfer.reasonPlaceholder')"
        />

        <template #footer>
            <AButton
                kind="p"
                icon="lock"
                :disabled="!target || !reason.trim()"
                @click="movingConfirm = true"
            >
                {{ t('users.transfer.continue') }}
            </AButton>
            <AButton @click="moving = false">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>

    <ConfirmDialog
        :open="movingConfirm"
        :title="t('users.transfer.confirmTitle')"
        :confirm-label="t('users.transfer.confirmLabel')"
        :body="
            targetCard
                ? t('users.transfer.confirmBody', {
                      name: loc(patient.name),
                      code: patient.code,
                      from: loc(patient.prName),
                      to: loc(targetCard.name),
                  })
                : ''
        "
        :effects="[
            t('users.transfer.effect.history'),
            t('users.transfer.effect.future'),
            t('users.transfer.effect.record'),
        ]"
        :pin="dataset.session?.pin || true"
        @close="movingConfirm = false"
        @confirm="applyTransfer"
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

.u-local {
    margin-top: 14px;
}

.u-lbl {
    margin-top: 16px;
}

.u-req {
    color: var(--a-red);
}

.u-sig {
    width: 140px;
}
</style>
