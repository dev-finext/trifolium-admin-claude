<script setup>
// A supplier card, in a drawer. The whole suppliers tab is already behind the
// re-confirmation gate, so the bank details and trade terms below are visible —
// but the card still says, on the bank block, that changing an account is itself
// a re-confirmation and a phone check, because that is the fraud everyone warns
// about.
//
// The card owns its own confirmations and its own editor: suspending a supplier
// or saving a change to his card is a logged action, and this component reports
// each one rather than handing it up.
//
// "תעודות וחשבוניות" (12.11.2026, for production) — every document this
// supplier's goods came on (stores/purchasing.js `documentsOf`): each goods
// receipt as the delivery note or tax invoice it was, and each tax invoice
// attached to notes afterwards. A row says its type, number, date, order,
// value before VAT and where it stands — an open note, a note attached to
// invoice X (ours, or SAP's for a migrated one), an invoice and what it covers.
// Clicking a row opens it underneath: its lines with their prices, and its
// scans — added at receipt or here, any time later. Open notes can take their
// invoice from here too ("הצמדת חשבונית מס").
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AttachInvoiceModal from '@/components/purchasing/AttachInvoiceModal.vue';
import SupplierEditor from '@/components/system/SupplierEditor.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ActivitiesPanel from '@/components/ui/ActivitiesPanel.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ATabs from '@/components/ui/ATabs.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import {
    buyingStateTone,
    CURRENCY_SYMBOL,
    docRef,
    isOpenNote,
    lineBuyQty,
    lineNet,
    liveOnly,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num, qtyText } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useCrmStore } from '@/stores/crm';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';
import { supplierDocsOk, useSystemStore } from '@/stores/system';

const props = defineProps({
    supplier: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const system = useSystemStore();
const items = useItemsStore();
const buying = useBuyingStore();
const purchasing = usePurchasingStore();
const crm = useCrmStore();
const router = useRouter();

const tab = ref('profile');
const editing = ref(false);
const ask = ref(null);

const supplier = computed(() => props.supplier);
const isActive = computed(() => supplier.value.status === 'active');
const docsOk = computed(() => supplierDocsOk(supplier.value));

// ---- תעודות וחשבוניות — the supplier's documents (12.11.2026) ----------------

const documents = computed(() => purchasing.documentsOf(supplier.value.code));
const openNotes = computed(() =>
    documents.value.filter((row) => isOpenNote(row.receipt)),
);
const docKey = ref('');
const openDoc = computed(
    () => documents.value.find((row) => row.key === docKey.value) || null,
);
const attaching = ref(false);

const documentCols = computed(() => [
    { k: 'kind', label: t('supplierDocs.col.kind'), nowrap: true },
    { k: 'ref', label: t('supplierDocs.col.ref'), nowrap: true },
    { k: 'when', label: t('supplierDocs.col.when'), nowrap: true },
    { k: 'po', label: t('supplierDocs.col.po'), nowrap: true },
    { k: 'net', label: t('supplierDocs.col.net'), align: 'end', nowrap: true },
    { k: 'status', label: t('supplierDocs.col.status') },
    { k: 'files', label: t('supplierDocs.col.files'), nowrap: true },
]);

/** The order a receipt was booked against, by its number. */
const poNumberOf = (receipt) =>
    receipt
        ? buying.listById(receipt.po)?.number || receipt.poNumber || ''
        : '';

/** Where a document stands, in a sentence. */
function documentStatus(row) {
    if (row.kind === 'tax_invoice') {
        return row.receipt
            ? t('supplierDocs.status.invoice')
            : t('supplierDocs.status.covers', {
                  refs: row.notes.map(docRef).join(', '),
              });
    }

    if (row.invoice) {
        return t('supplierDocs.status.attached', { num: row.invoice.num });
    }

    if (row.receipt?.sapInvoice) {
        const sap = row.receipt.sapInvoice;

        return sap.ref || sap.docNum
            ? t('supplierDocs.status.sap', { num: sap.ref || sap.docNum })
            : t('supplierDocs.status.sapUnknown');
    }

    return t('supplierDocs.status.open');
}

/** The scans on a document: the receipt's own, or the attached invoice's. */
const scansOf = (row) =>
    row.receipt
        ? items.attachmentsOf('receipt', row.receipt.id)
        : items.attachmentsOf('supplier_invoice', row.invoice?.id);

/** A document's lines, for the panel under the table. */
const docLines = computed(() => {
    const row = openDoc.value;

    if (!row) {
        return [];
    }

    const receipts = row.receipt ? [row.receipt] : row.notes;

    return receipts.flatMap((receipt) =>
        receipt.lines.map((line, index) => ({
            key: `${receipt.id}-${index}`,
            ref: docRef(receipt),
            sku: line.sku,
            name: line.name,
            general: Boolean(line.general),
            qty: lineBuyQty(line),
            unit: line.unit,
            price: line.price ?? null,
            net: lineNet(line),
        })),
    );
});

const docLineCols = computed(() => [
    ...(openDoc.value?.notes.length
        ? [{ k: 'ref', label: t('supplierDocs.col.ref'), nowrap: true }]
        : []),
    {
        k: 'sku',
        label: t('systemContacts.suppliers.items.col.code'),
        nowrap: true,
    },
    { k: 'name', label: t('systemContacts.suppliers.items.col.name') },
    {
        k: 'qty',
        label: t('supplierDocs.col.qty'),
        align: 'end',
        nowrap: true,
    },
    {
        k: 'price',
        label: t('supplierDocs.attach.price'),
        align: 'end',
        nowrap: true,
    },
    {
        k: 'net',
        label: t('supplierDocs.attach.net'),
        align: 'end',
        nowrap: true,
    },
]);

// V2 — what the item cards and the purchase orders say about this supplier
const linkedItems = computed(() =>
    // SAP names one vendor on an item — `OITM.CardCode`. An archived item is
    // nobody's item any more, and is not counted here.
    liveOnly(items.rows).filter(
        (row) => row.suppliers?.preferred === supplier.value.code,
    ),
);
// The orders the purchasing screen writes — its own sheets, the same records it
// lists — not the legacy purchase-order fixture, which nothing writes to any
// more. An order is still open while it is a draft or on its way; received
// and failed are where it ends.
const OPEN_ORDER_STATES = ['draft', 'sent', 'awaiting_invoice'];
const supplierPos = computed(() =>
    buying
        .listsOf('order')
        .filter((list) => list.supplierCode === supplier.value.code),
);
const openPos = computed(() =>
    supplierPos.value.filter((list) => OPEN_ORDER_STATES.includes(list.state)),
);
const closedPos = computed(() =>
    supplierPos.value.filter((list) => !OPEN_ORDER_STATES.includes(list.state)),
);
const activities = computed(() =>
    crm.activitiesOf('supplier', supplier.value.code),
);

const itemCols = computed(() => [
    {
        k: 'sku',
        label: t('systemContacts.suppliers.items.col.code'),
    },
    { k: 'name', label: t('systemContacts.suppliers.items.col.name') },
    { k: 'group', label: t('systemContacts.suppliers.items.col.family') },
    {
        k: 'price',
        label: t('systemContacts.suppliers.items.col.price'),
    },
]);
const poCols = computed(() => [
    {
        k: 'number',
        label: t('systemContacts.suppliers.purchasing.col.id'),
        nowrap: true,
    },
    {
        k: 'state',
        label: t('systemContacts.suppliers.purchasing.col.state'),
        nowrap: true,
    },
    {
        k: 'created',
        label: t('systemContacts.suppliers.purchasing.col.created'),
        nowrap: true,
    },
    {
        k: 'sent',
        label: t('systemContacts.suppliers.purchasing.col.sent'),
        nowrap: true,
    },
    {
        k: 'received',
        label: t('systemContacts.suppliers.purchasing.col.received'),
        nowrap: true,
    },
    {
        k: 'lines',
        label: t('systemContacts.suppliers.purchasing.col.lines'),
        align: 'end',
    },
    { k: 'go', label: '' },
]);

/**
 * Open the order on its own page, the one the purchasing screen opens. The
 * drawer is not closed first: its address change would race the navigation,
 * and leaving the screen takes the drawer with it anyway.
 */
function openPo(list) {
    router.push({
        name: 'buyingSheet',
        params: { kind: 'order', id: list.id },
    });
}

const tabs = computed(() => [
    {
        id: 'profile',
        label: t('systemContacts.suppliers.tab.profile'),
        icon: 'user',
    },
    {
        id: 'terms',
        label: t('systemContacts.suppliers.tab.terms'),
        icon: 'card',
    },
    {
        id: 'docs',
        label: t('systemContacts.suppliers.tab.docs'),
        icon: 'file_text',
    },
    {
        // The supplier's documents — the goods receipts, as the delivery notes
        // and tax invoices they came on, and the invoices attached to notes.
        id: 'receipts',
        label: t('supplierDocs.tab.title'),
        icon: 'package',
        n: documents.value.length,
    },
    // V2
    {
        id: 'items',
        label: t('systemContacts.suppliers.tab.items'),
        icon: 'tag',
        n: linkedItems.value.length || undefined,
    },
    {
        id: 'purchasing',
        label: t('systemContacts.suppliers.tab.purchasing'),
        icon: 'inbox',
        n: supplierPos.value.length || undefined,
    },
    {
        id: 'activities',
        label: t('systemContacts.suppliers.tab.activities'),
        icon: 'phone',
        n: activities.value.length || undefined,
    },
]);

/**
 * How many items this supplier supplies. SAP counts every item card that names
 * him (`skus`); the items tab lists the ones in this console's catalog. The two
 * differ for a fifth of the cards, so where they do the card says both rather
 * than one figure the tab beside it contradicts.
 */
const skusText = computed(() => {
    const sap = Number(supplier.value.skus) || 0;
    const here = linkedItems.value.length;

    if (!sap && !here) {
        return t('systemContacts.suppliers.value.serviceNoStock');
    }

    if (sap === here) {
        return t('systemContacts.suppliers.value.skus', { n: num(sap) }, sap);
    }

    return t('systemContacts.suppliers.value.skusSplit', {
        here: num(here),
        sap: num(sap),
    });
});

const profileRows = computed(() => {
    const s = supplier.value;

    return [
        [t('systemContacts.suppliers.field.code'), s.code],
        [t('systemContacts.suppliers.field.name'), loc(s.name)],
        [
            t('systemContacts.suppliers.field.bizType'),
            t(`systemContacts.bizType.${s.bizType}`),
        ],
        [t('systemContacts.suppliers.field.biz'), s.biz],
        [
            t('systemContacts.suppliers.field.kind'),
            t(`systemContacts.kind.${s.kind}`),
        ],
        [t('systemContacts.suppliers.field.skus'), skusText.value],
        [t('systemContacts.suppliers.field.since'), s.since],
    ];
});

const contactRows = computed(() => {
    const s = supplier.value;

    return [
        [t('systemContacts.suppliers.field.contactName'), loc(s.contact)],
        loc(s.role) && [
            t('systemContacts.suppliers.field.contactRole'),
            loc(s.role),
        ],
        [t('systemContacts.suppliers.field.mobile'), s.mobile],
        s.office && [t('systemContacts.suppliers.field.office'), s.office],
        [t('systemContacts.suppliers.field.email'), s.email],
        [t('systemContacts.suppliers.field.orderMail'), s.orderMail || s.email],
        s.site && [t('systemContacts.suppliers.field.site'), s.site],
    ];
});

const addressRows = computed(() => {
    const s = supplier.value;

    return [
        s.addr && [t('systemContacts.suppliers.field.addr'), loc(s.addr)],
        [t('systemContacts.suppliers.field.city'), loc(s.city)],
    ];
});

const tradeRows = computed(() => {
    const s = supplier.value;

    return [
        [
            t('systemContacts.suppliers.field.terms'),
            t(`systemContacts.terms.${s.terms}`),
        ],
        [
            t('systemContacts.suppliers.field.pay'),
            t(`systemContacts.payMethod.${s.pay}`),
        ],
        [t('systemContacts.suppliers.field.cur'), s.cur],
        [t('systemContacts.suppliers.field.tradeDisc'), `${num(s.tradeDisc)}%`],
        [
            t('systemContacts.suppliers.field.minOrder'),
            s.minOrder || t('systemContacts.suppliers.value.noMinOrder'),
        ],
        [
            t('systemContacts.suppliers.field.lead'),
            s.lead
                ? t(
                      `items.lead.unit.${s.leadUnit || 'day'}`,
                      { n: s.lead },
                      s.lead,
                  )
                : '—',
        ],
    ];
});

const bankRows = computed(() => {
    const s = supplier.value;

    return [
        [t('systemContacts.suppliers.field.bank'), loc(s.bank)],
        [t('systemContacts.suppliers.field.branch'), s.branch],
        [t('systemContacts.suppliers.field.acct'), s.acct],
        [t('systemContacts.suppliers.field.payee'), loc(s.payee)],
    ];
});

/** The certificate lines the card shows, each already resolved to a status. */
const docRows = computed(() => {
    const s = supplier.value;
    const rows = [
        {
            key: 'bookkeeping_cert',
            ok: Boolean(s.books?.ok),
            has: Boolean(s.books?.valid),
            extra: s.books?.valid
                ? t('systemContacts.suppliers.docs.validUntil', {
                      date: fmtISO(s.books.valid),
                  })
                : t('systemContacts.suppliers.docs.notPresented'),
        },
        {
            key: 'withholding_tax',
            ok: Boolean(s.tax?.ok),
            has: Boolean(s.tax?.valid),
            // A valid certificate states a rate; only a rate of zero is an
            // exemption. A 30% certificate is valid and still withholds 30%.
            extra: !s.tax?.ok
                ? t('systemContacts.suppliers.docs.withholdRate', {
                      rate: num(s.tax?.rate ?? 0),
                  })
                : Number(s.tax.rate) > 0
                  ? t('systemContacts.suppliers.docs.rateUntil', {
                        rate: num(s.tax.rate),
                        date: fmtISO(s.tax.valid),
                    })
                  : t('systemContacts.suppliers.docs.exemptUntil', {
                        date: fmtISO(s.tax.valid),
                    }),
        },
    ];

    if (s.coa) {
        rows.push({
            key: 'coa',
            ok: true,
            has: true,
            extra: t('systemContacts.suppliers.docs.coaEveryReceipt'),
        });
    }

    return rows;
});

function docStatus(row) {
    if (row.ok) {
        return { tone: 'green', label: t('systemContacts.suppliers.docs.ok') };
    }

    return row.has
        ? { tone: 'red', label: t('systemContacts.suppliers.docs.expired') }
        : { tone: 'red', label: t('systemContacts.suppliers.docs.missing') };
}

function report(ok, title, body, bad = false) {
    if (!ok) {
        push({
            title: t('systemContacts.toast.failed'),
            body: t('systemContacts.toast.failedBody'),
            bad: true,
        });

        return;
    }

    push({ title, body, bad });
}

function mailOrder() {
    const s = supplier.value;

    push({
        title: t('systemContacts.suppliers.toast.mail'),
        body: t('systemContacts.suppliers.toast.mailBody', {
            address: s.orderMail || s.email,
        }),
    });
}

function askSuspend() {
    const name = loc(supplier.value.name);

    ask.value = {
        title: t('systemContacts.suppliers.suspend.title'),
        body: t('systemContacts.suppliers.suspend.body', { name }),
        confirmLabel: t('systemContacts.suppliers.suspend.confirm'),
        effects: [
            t('systemContacts.suppliers.suspend.effect1'),
            t('systemContacts.suppliers.suspend.effect2'),
            t('systemContacts.suppliers.suspend.effect3'),
        ],
        danger: true,
        reason: true,
        pin: system.approvalPin,
        done: async (why) => {
            const ok = await system.suspendSupplier(supplier.value.code, why);

            report(
                ok,
                t('systemContacts.suppliers.toast.suspended'),
                why,
                true,
            );
        },
    };
}

function askReactivate() {
    const name = loc(supplier.value.name);

    ask.value = {
        title: t('systemContacts.suppliers.reactivate.title'),
        body: t('systemContacts.suppliers.reactivate.body', { name }),
        confirmLabel: t('systemContacts.suppliers.reactivate.confirm'),
        effects: [
            t('systemContacts.suppliers.reactivate.effect1'),
            t('systemContacts.suppliers.reactivate.effect2'),
            t('systemContacts.suppliers.reactivate.effect3'),
        ],
        pin: system.approvalPin,
        done: async () => {
            const ok = await system.reactivateSupplier(supplier.value.code);

            report(ok, t('systemContacts.suppliers.toast.reactivated'), name);
        },
    };
}

function confirmAsk(reason) {
    const pending = ask.value;

    ask.value = null;
    pending.done(reason);
}

function onSaved(changed) {
    editing.value = false;
    push({
        title: t('systemContacts.suppliers.toast.updated'),
        body: changed.length
            ? changed.join(' · ')
            : t('systemContacts.suppliers.editor.unchanged'),
    });
}
</script>

<template>
    <div class="sp">
        <div class="a-dhead a-dhead--line">
            <div class="a-dhead-top">
                <div>
                    <div class="a-dhead-t">
                        <h2 class="sp-title">{{ loc(supplier.name) }}</h2>
                        <AChip tone="gray" :dot="false">
                            {{ t('systemContacts.suppliers.supplierCode') }}
                            <ANum>{{ supplier.code }}</ANum>
                        </AChip>
                        <AChip
                            :tone="isActive ? 'green' : 'red'"
                            size="lg"
                            :dot="false"
                        >
                            {{ t(`systemContacts.status.${supplier.status}`) }}
                        </AChip>
                        <AChip tone="teal" :dot="false">
                            {{ t(`systemContacts.kind.${supplier.kind}`) }}
                        </AChip>
                        <AChip v-if="!docsOk" tone="amber" :dot="false">
                            {{ t('systemContacts.suppliers.docsMissingChip') }}
                        </AChip>
                    </div>
                    <div class="a-dhead-m">
                        <span>
                            {{
                                t(`systemContacts.bizType.${supplier.bizType}`)
                            }}
                            ·
                            <ANum>{{ supplier.biz }}</ANum>
                        </span>
                        <span>
                            {{ loc(supplier.contact) }} ·
                            {{ loc(supplier.role) }}
                        </span>
                        <span
                            ><ANum>{{ supplier.mobile }}</ANum></span
                        >
                        <span class="ltr">{{ supplier.email }}</span>
                        <span>
                            {{ t('systemContacts.suppliers.since') }}
                            <ANum>{{ supplier.since }}</ANum>
                        </span>
                    </div>
                </div>
                <div class="a-dhead-a">
                    <AButton icon="mail" @click="mailOrder">
                        {{ t('systemContacts.suppliers.action.orderMail') }}
                    </AButton>
                    <AButton kind="p" icon="edit" @click="editing = true">
                        {{ t('systemContacts.suppliers.action.edit') }}
                    </AButton>
                    <AButton
                        v-if="isActive"
                        kind="danger"
                        icon="x"
                        @click="askSuspend"
                    >
                        {{ t('systemContacts.suppliers.action.suspend') }}
                    </AButton>
                    <AButton v-else icon="check" @click="askReactivate">
                        {{ t('systemContacts.suppliers.action.reactivate') }}
                    </AButton>
                    <AButton sm icon="x" @click="emit('close')">
                        {{ t('ui.close') }}
                    </AButton>
                </div>
            </div>

            <div v-if="!isActive" class="a-note a-note--warn sp-suspended">
                {{
                    t('systemContacts.suppliers.suspendedNote', {
                        date: fmtISO(supplier.suspendedWhen),
                        reason: loc(supplier.suspendedWhy),
                    })
                }}
            </div>

            <ATabs v-model="tab" :tabs="tabs" />
        </div>

        <div v-if="tab === 'profile'" class="a-2col">
            <ACard
                :title="t('systemContacts.suppliers.card.supplier')"
                icon="db"
            >
                <AKeyValue :rows="profileRows">
                    <template #value-0>
                        <ANum>{{ supplier.code }}</ANum>
                    </template>
                    <template #value-3>
                        <ANum>{{ supplier.biz }}</ANum>
                    </template>
                    <template #value-6>
                        <ANum>{{ supplier.since }}</ANum>
                    </template>
                </AKeyValue>
            </ACard>
            <div class="a-grid">
                <ACard
                    :title="t('systemContacts.suppliers.card.contact')"
                    icon="phone"
                >
                    <AKeyValue :rows="contactRows" />
                </ACard>
                <ACard
                    :title="t('systemContacts.suppliers.card.address')"
                    icon="map_pin"
                >
                    <AKeyValue :rows="addressRows" />
                </ACard>
                <ACard
                    v-if="loc(supplier.notes)"
                    :title="t('systemContacts.suppliers.card.notes')"
                    icon="file_text"
                >
                    <div class="sp-notes">{{ loc(supplier.notes) }}</div>
                </ACard>
            </div>
        </div>

        <div v-else-if="tab === 'terms'" class="a-2col">
            <ACard :title="t('systemContacts.suppliers.card.trade')" icon="tag">
                <AKeyValue :rows="tradeRows">
                    <template #value-0>
                        <AChip tone="purple" size="sm" :dot="false">
                            {{ t(`systemContacts.terms.${supplier.terms}`) }}
                        </AChip>
                    </template>
                    <template #value-4>
                        <AMoney
                            v-if="supplier.minOrder"
                            :value="supplier.minOrder"
                        />
                        <span v-else>{{
                            t('systemContacts.suppliers.value.noMinOrder')
                        }}</span>
                    </template>
                </AKeyValue>
            </ACard>
            <div class="a-grid">
                <ACard
                    :title="t('systemContacts.suppliers.card.bank')"
                    icon="card"
                >
                    <template #right>
                        <AChip tone="amber" size="sm" :dot="false">
                            {{
                                t(
                                    'systemContacts.suppliers.value.bankProtected',
                                )
                            }}
                        </AChip>
                    </template>
                    <AKeyValue :rows="bankRows">
                        <template #value-1>
                            <ANum>{{ supplier.branch }}</ANum>
                        </template>
                        <template #value-2>
                            <ANum>{{ supplier.acct }}</ANum>
                        </template>
                    </AKeyValue>
                    <div class="a-note a-note--warn sp-inner-note">
                        {{ t('systemContacts.suppliers.value.bankWarning') }}
                    </div>
                </ACard>
                <ACard
                    :title="t('systemContacts.suppliers.card.money')"
                    icon="coin"
                >
                    <div class="a-2col">
                        <div>
                            <div class="a-stat">
                                {{
                                    t('systemContacts.suppliers.field.spend12')
                                }}
                            </div>
                            <div class="a-stat-v">
                                <AMoney :value="supplier.spend12" />
                            </div>
                        </div>
                        <div>
                            <div class="a-stat">
                                {{ t('systemContacts.suppliers.field.open') }}
                            </div>
                            <div
                                class="a-stat-v"
                                :class="{ 'sp-debt': supplier.open }"
                            >
                                <AMoney :value="supplier.open" />
                            </div>
                            <div class="sp-stat-sub">
                                {{
                                    supplier.open
                                        ? t(
                                              `systemContacts.terms.${supplier.terms}`,
                                          )
                                        : t(
                                              'systemContacts.suppliers.value.noOpenDebt',
                                          )
                                }}
                            </div>
                        </div>
                    </div>
                    <div
                        v-if="!supplier.books?.ok"
                        class="a-note a-note--warn sp-inner-note"
                    >
                        {{ t('systemContacts.suppliers.value.paymentBlocked') }}
                    </div>
                </ACard>
            </div>
        </div>

        <div v-else-if="tab === 'docs'" class="a-2col">
            <ACard
                :title="t('systemContacts.suppliers.card.docs')"
                icon="shield"
            >
                <div v-for="row in docRows" :key="row.key" class="sp-doc">
                    <div>
                        <div class="sp-doc-l">
                            {{ t(`systemContacts.suppliers.docs.${row.key}`) }}
                        </div>
                        <div class="sp-doc-x">{{ row.extra }}</div>
                    </div>
                    <AChip :tone="docStatus(row).tone" size="sm">
                        {{ docStatus(row).label }}
                    </AChip>
                </div>
            </ACard>
            <AttachmentsPanel
                entity="supplier"
                :ref-id="supplier.code"
                :title="t('systemContacts.suppliers.docs.files')"
            />
        </div>

        <!-- V2: linked items -->
        <div v-else-if="tab === 'items'" class="sp-stack">
            <ACard
                :title="t('systemContacts.suppliers.tab.items')"
                icon="tag"
                :pad="false"
            >
                <p class="a-hint sp-pad">
                    {{ t('systemContacts.suppliers.items.note') }}
                </p>
                <ADataTable
                    v-if="linkedItems.length"
                    :cols="itemCols"
                    :rows="linkedItems"
                    row-key="sku"
                >
                    <template #cell-sku="{ row }"
                        ><ANum>{{ row.sku }}</ANum></template
                    >
                    <template #cell-name="{ row }">{{
                        loc({ he: row.names?.he, en: row.names?.en })
                    }}</template>
                    <template #cell-group="{ row }">{{
                        row.groupName || '—'
                    }}</template>
                    <template #cell-price="{ row }">
                        <template v-if="row.price?.lastPurchase">
                            <ANum>{{ num(row.price.lastPurchase) }}</ANum>
                            {{ CURRENCY_SYMBOL[row.price.currency] || '' }}
                        </template>
                        <template v-else>—</template>
                    </template>
                </ADataTable>
                <AEmpty
                    v-else
                    icon="tag"
                    :title="t('systemContacts.suppliers.items.empty')"
                />
            </ACard>
        </div>

        <!-- V2: purchase orders -->
        <div v-else-if="tab === 'purchasing'" class="sp-stack">
            <ACard
                v-for="group in [
                    { id: 'open', rows: openPos },
                    { id: 'closed', rows: closedPos },
                ]"
                :key="group.id"
                :title="t(`systemContacts.suppliers.purchasing.${group.id}`)"
                icon="inbox"
                :pad="false"
            >
                <template #right>
                    <span class="t-sub">{{ group.rows.length }}</span>
                </template>
                <ADataTable
                    v-if="group.rows.length"
                    :cols="poCols"
                    :rows="group.rows"
                    row-key="id"
                >
                    <template #cell-number="{ row }"
                        ><ANum class="a-code">{{ row.number }}</ANum></template
                    >
                    <template #cell-state="{ row }">
                        <AChip :tone="buyingStateTone(row.state)" size="sm">
                            {{ t(`buying.state.${row.state}`) }}
                        </AChip>
                    </template>
                    <template #cell-created="{ row }">
                        <ANum v-if="row.created?.iso">{{
                            fmtISO(row.created.iso)
                        }}</ANum>
                        <span v-else class="sp-dash">—</span>
                    </template>
                    <template #cell-sent="{ row }">
                        <ANum v-if="row.sent?.iso">{{
                            fmtISO(row.sent.iso)
                        }}</ANum>
                        <span v-else class="sp-dash">—</span>
                    </template>
                    <template #cell-received="{ row }">
                        <ANum v-if="row.received?.iso">{{
                            fmtISO(row.received.iso)
                        }}</ANum>
                        <span v-else class="sp-dash">—</span>
                    </template>
                    <template #cell-lines="{ row }"
                        ><ANum>{{ row.lines.length }}</ANum></template
                    >
                    <template #cell-go="{ row }">
                        <AButton sm icon="external" @click="openPo(row)">
                            {{
                                t('systemContacts.suppliers.purchasing.openIt')
                            }}
                        </AButton>
                    </template>
                </ADataTable>
                <AEmpty
                    v-else
                    icon="inbox"
                    :title="t('systemContacts.suppliers.purchasing.empty')"
                />
            </ACard>
        </div>

        <!-- V2: activities -->
        <ActivitiesPanel
            v-else-if="tab === 'activities'"
            entity="supplier"
            :ref-id="supplier.code"
        />

        <div v-else class="sp-stack">
            <ACard
                :title="t('supplierDocs.tab.title')"
                icon="package"
                :pad="false"
            >
                <template #right>
                    <span v-if="openNotes.length" class="t-sub">{{
                        t(
                            'supplierDocs.tab.openNotes',
                            { n: openNotes.length },
                            openNotes.length,
                        )
                    }}</span>
                    <AButton
                        v-if="openNotes.length"
                        sm
                        kind="p"
                        icon="file_text"
                        @click="attaching = true"
                    >
                        {{ t('buying.attach.open') }}
                    </AButton>
                </template>
                <p class="a-hint sp-pad">{{ t('supplierDocs.tab.lead') }}</p>
                <ADataTable
                    v-if="documents.length"
                    :cols="documentCols"
                    :rows="documents"
                    row-key="key"
                    :selected="docKey"
                    @row="docKey = docKey === $event.key ? '' : $event.key"
                >
                    <template #cell-kind="{ row }">
                        <AChip
                            size="sm"
                            :dot="false"
                            :tone="
                                row.kind === 'tax_invoice' ? 'blue' : 'slate'
                            "
                        >
                            {{ t(`supplierDocs.type.${row.kind}`) }}
                        </AChip>
                    </template>
                    <template #cell-ref="{ row }">
                        <ANum class="a-code">{{ row.ref || '—' }}</ANum>
                        <div v-if="row.receipt?.supplierRef" class="t-sub">
                            {{
                                t('supplierDocs.sapNum', {
                                    num: row.receipt.docNum,
                                })
                            }}
                        </div>
                    </template>
                    <template #cell-when="{ row }">
                        <ANum>{{ fmtISO(row.when?.iso) }}</ANum>
                    </template>
                    <template #cell-po="{ row }">
                        <ANum v-if="poNumberOf(row.receipt)">{{
                            poNumberOf(row.receipt)
                        }}</ANum>
                        <span v-else class="sp-dash">—</span>
                    </template>
                    <template #cell-net="{ row }">
                        <ANum v-if="row.net !== null">{{
                            ils(row.net, 2)
                        }}</ANum>
                        <span
                            v-else-if="isOpenNote(row.receipt)"
                            class="t-sub"
                            >{{ t('supplierDocs.netPending') }}</span
                        >
                        <span v-else class="sp-dash">—</span>
                    </template>
                    <template #cell-status="{ row }">
                        <span
                            :class="{
                                'sp-open': isOpenNote(row.receipt),
                            }"
                            >{{ documentStatus(row) }}</span
                        >
                    </template>
                    <template #cell-files="{ row }">
                        <span class="t-sub">{{
                            t(
                                'supplierDocs.files',
                                { n: scansOf(row).length },
                                scansOf(row).length,
                            )
                        }}</span>
                    </template>
                </ADataTable>
                <AEmpty
                    v-else
                    icon="package"
                    :title="t('supplierDocs.tab.empty')"
                    :sub="t('supplierDocs.tab.emptySub')"
                />
                <p v-if="documents.length && !openDoc" class="a-hint sp-pad">
                    {{ t('supplierDocs.tab.pick') }}
                </p>
            </ACard>

            <template v-if="openDoc">
                <ACard
                    :title="
                        t('supplierDocs.tab.detail', {
                            kind: t(`supplierDocs.type.${openDoc.kind}`),
                            ref: openDoc.ref,
                        })
                    "
                    icon="file_text"
                    :pad="false"
                >
                    <template #right>
                        <span class="t-sub">{{ documentStatus(openDoc) }}</span>
                    </template>
                    <ADataTable
                        :cols="docLineCols"
                        :rows="docLines"
                        row-key="key"
                    >
                        <template #cell-ref="{ row }">
                            <ANum>{{ row.ref }}</ANum>
                        </template>
                        <template #cell-sku="{ row }">
                            <ANum v-if="row.sku" class="a-code">{{
                                row.sku
                            }}</ANum>
                            <span v-else class="t-sub">{{
                                t('supplierDocs.general')
                            }}</span>
                        </template>
                        <template #cell-name="{ row }">{{
                            loc(row.name)
                        }}</template>
                        <template #cell-qty="{ row }">
                            <ANum>{{ qtyText(row.qty, 3) }}</ANum>
                        </template>
                        <template #cell-price="{ row }">
                            <ANum v-if="row.price !== null">{{
                                ils(row.price, 2)
                            }}</ANum>
                            <span v-else class="sp-dash">—</span>
                        </template>
                        <template #cell-net="{ row }">
                            <ANum v-if="row.net !== null">{{
                                ils(row.net, 2)
                            }}</ANum>
                            <span v-else class="sp-dash">—</span>
                        </template>
                    </ADataTable>
                </ACard>
                <AttachmentsPanel
                    :key="openDoc.key"
                    :entity="openDoc.receipt ? 'receipt' : 'supplier_invoice'"
                    :ref-id="
                        openDoc.receipt
                            ? openDoc.receipt.id
                            : openDoc.invoice.id
                    "
                    :title="t('supplierDocs.tab.scans')"
                />
            </template>

            <AttachInvoiceModal
                :open="attaching"
                :supplier-code="supplier.code"
                @close="attaching = false"
            />
        </div>

        <SupplierEditor
            :open="editing"
            :supplier="supplier"
            @saved="onSaved"
            @close="editing = false"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            :reason="ask?.reason || false"
            :pin="ask?.pin || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped>
.sp {
    display: grid;
    gap: 18px;
}

.sp-title {
    margin: 0;
    font-size: 26px;
}

.sp-suspended {
    margin: 0 0 14px;
}

.sp-notes {
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--a-ink-2);
}

.sp-inner-note {
    margin-top: 14px;
}

.sp-debt {
    color: var(--a-red);
}

.sp-stat-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.sp-doc {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--a-line);
}

.sp-doc-l {
    font-weight: 600;
}

.sp-stack {
    display: grid;
    gap: 18px;
}

.sp-pad {
    margin: 0;
    padding: 12px 18px 0;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.sp-doc-x {
    font-size: 13px;
    color: var(--a-ink-4);
}

.sp-dash {
    color: var(--a-ink-4);
}

/* A delivery note still waiting for its invoice. */
.sp-open {
    color: var(--a-amber, var(--a-ink));
    font-weight: 600;
}
</style>
