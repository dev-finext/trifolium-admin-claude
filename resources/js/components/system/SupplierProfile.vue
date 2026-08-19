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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SupplierEditor from '@/components/system/SupplierEditor.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { supplierDocsOk, useSystemStore } from '@/stores/system';

const props = defineProps({
    supplier: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const system = useSystemStore();

const tab = ref('profile');
const editing = ref(false);
const ask = ref(null);

const supplier = computed(() => props.supplier);
const isActive = computed(() => supplier.value.status === 'active');
const docsOk = computed(() => supplierDocsOk(supplier.value));
const receipts = computed(() => system.supplierReceipts(supplier.value.code));

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
        id: 'receipts',
        label: t('systemContacts.suppliers.tab.receipts'),
        icon: 'package',
        n: receipts.value.length,
    },
]);

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
        [
            t('systemContacts.suppliers.field.skus'),
            s.skus
                ? t(
                      'systemContacts.suppliers.value.skus',
                      { n: num(s.skus) },
                      s.skus,
                  )
                : t('systemContacts.suppliers.value.serviceNoStock'),
        ],
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
            t('systemContacts.suppliers.leadDays', { n: num(s.lead) }, s.lead),
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
            extra: s.tax?.ok
                ? t('systemContacts.suppliers.docs.exemptUntil', {
                      date: fmtISO(s.tax.valid),
                  })
                : t('systemContacts.suppliers.docs.withholdRate', {
                      rate: num(s.tax?.rate ?? 0),
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

const receiptCols = [
    { k: 'id', label: t('systemContacts.suppliers.receipts.id'), nowrap: true },
    {
        k: 'doc',
        label: t('systemContacts.suppliers.receipts.doc'),
        nowrap: true,
    },
    {
        k: 'when',
        label: t('systemContacts.suppliers.receipts.when'),
        nowrap: true,
    },
    { k: 'lines', label: t('systemContacts.suppliers.receipts.lines') },
    { k: 'by', label: t('systemContacts.suppliers.receipts.by'), nowrap: true },
    { k: 'note', label: t('systemContacts.suppliers.receipts.note') },
];

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
            <ACard
                :title="t('systemContacts.suppliers.card.scans')"
                icon="file_text"
            >
                <AEmpty
                    icon="file"
                    :title="t('systemContacts.suppliers.docs.noScans')"
                    :sub="t('systemContacts.suppliers.docs.noScansSub')"
                />
            </ACard>
        </div>

        <template v-else>
            <ACard
                v-if="receipts.length"
                :title="t('systemContacts.suppliers.card.receipts')"
                icon="package"
                :pad="false"
            >
                <ADataTable :cols="receiptCols" :rows="receipts" row-key="id">
                    <template #cell-id="{ row }">
                        <span class="t-strong"
                            ><ANum>{{ row.id }}</ANum></span
                        >
                    </template>
                    <template #cell-doc="{ row }">
                        <ANum>{{ row.docNum }}</ANum>
                    </template>
                    <template #cell-when="{ row }">
                        <ANum>{{ fmtISO(row.when.iso) }}</ANum>
                    </template>
                    <template #cell-lines="{ row }">
                        <ANum>{{
                            t(
                                'systemContacts.suppliers.receipts.lineCount',
                                { n: num(row.lines.length) },
                                row.lines.length,
                            )
                        }}</ANum>
                        <span class="t-sub">
                            ·
                            {{
                                row.lines
                                    .slice(0, 2)
                                    .map((line) => loc(line.name))
                                    .join(', ')
                            }}
                        </span>
                    </template>
                    <template #cell-by="{ row }">
                        {{ loc(row.by) }}
                    </template>
                    <template #cell-note="{ row }">
                        <span v-if="loc(row.note)">{{ loc(row.note) }}</span>
                        <span v-else class="sp-dash">—</span>
                    </template>
                </ADataTable>
            </ACard>
            <ACard v-else>
                <AEmpty
                    icon="package"
                    :title="t('systemContacts.suppliers.receipts.empty')"
                    :sub="
                        supplier.skus
                            ? t('systemContacts.suppliers.receipts.emptyNone')
                            : t(
                                  'systemContacts.suppliers.receipts.emptyService',
                              )
                    "
                />
            </ACard>
        </template>

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

.sp-doc-x {
    font-size: 13px;
    color: var(--a-ink-4);
}

.sp-dash {
    color: var(--a-ink-4);
}
</style>
