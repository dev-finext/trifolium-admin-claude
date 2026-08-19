<script setup>
// The payment tab: how the money was taken, which tax document came back, and
// the customer link that carries the two.
//
// Nothing here recomputes a price — the order already holds its totals, and the
// link window and credit rules come from config so this screen never restates
// them. An order on credit terms has no customer link at all: it is collected
// through one consolidated link over the practitioner's whole open balance.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import PayerChip from '@/components/ui/PayerChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CREDIT, DOC_PROVIDER, DOC_STATES, PAY_LINK } from '@/config';
import { ils } from '@/lib/money';
import { payLink, payLinkExpired, statusOf } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const emit = defineEmits(['ask']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();

const link = computed(() => payLink(props.order));
const expired = computed(() => payLinkExpired(props.order));
const status = computed(() => statusOf(props.order));

const docState = computed(
    () => DOC_STATES[props.order.docStatus] || DOC_STATES.none,
);

const hasDoc = computed(() => props.order.docNum && props.order.docNum !== '—');

/** On credit terms and not yet settled — the consolidated-collection case. */
const onOpenCredit = computed(
    () => props.order.credit && !props.order.creditPaid,
);

const paymentState = computed(() => {
    if (status.value === 'pending_payment') {
        return { tone: 'amber', label: t('orders.payment.state.awaiting') };
    }

    if (onOpenCredit.value) {
        return { tone: 'purple', label: t('orders.payment.state.credit') };
    }

    return { tone: 'green', label: t('orders.payment.state.paid') };
});

/** The link's validity line: absent on credit, a warning once expired. */
const linkWindow = computed(() => {
    if (props.order.credit) {
        return { kind: 'credit' };
    }

    if (expired.value) {
        return { kind: 'expired' };
    }

    return {
        kind: 'open',
        text: t('orders.payment.linkWindow', {
            date: String(props.order.stamp || '').split(' ')[0],
            days: PAY_LINK.days,
        }),
        remaining:
            props.order.linkExpires !== null &&
            props.order.linkExpires !== undefined
                ? t('orders.payment.linkRemaining', {
                      n: props.order.linkExpires,
                  })
                : '',
    };
});

const practitionerName = computed(
    () =>
        `${loc(props.order.practitioner.first)} ${loc(props.order.practitioner.last)}`,
);

function copyLink() {
    // The clipboard is best-effort: when it is unavailable the agent still has
    // the link visible in the read-only field beside the button.
    navigator.clipboard?.writeText(link.value).catch(() => {});
    push({
        title: t('orders.payment.copied'),
        body: t('orders.payment.copiedBody'),
    });
}

function askResend() {
    emit('ask', {
        title: t('orders.payment.resendTitle'),
        confirmLabel: t('orders.payment.resendConfirm'),
        body: t('orders.payment.resendBody', {
            name: loc(props.order.patient.name),
            phone: props.order.patient.phone,
        }),
        effects: [
            t('orders.payment.resendEffectTemplate'),
            expired.value
                ? t('orders.payment.resendEffectNewLink')
                : t('orders.payment.resendEffectNoExtend'),
        ],
        done: () =>
            push({
                title: t('orders.payment.resendDone'),
                body: `${loc(props.order.patient.name)} · ${props.order.patient.phone}`,
            }),
    });
}

function askReissue() {
    emit('ask', {
        title: t('orders.payment.reissueTitle'),
        confirmLabel: t('orders.payment.reissueConfirm'),
        body: t('orders.payment.reissueBody', {
            provider: DOC_PROVIDER.name,
            amount: ils(props.order.pricing.total, 0),
        }),
        effects: [
            t('orders.payment.reissueEffectRequest'),
            t('orders.payment.reissueEffectNumbers'),
            t('orders.payment.reissueEffectEmail'),
        ],
        done: () =>
            push({
                title: t('orders.payment.reissueDone'),
                body: t('orders.payment.reissueDoneBody', {
                    provider: DOC_PROVIDER.name,
                }),
            }),
    });
}

function askCollectionLink() {
    emit('ask', {
        title: t('orders.payment.collectTitle'),
        confirmLabel: t('orders.payment.collectConfirm'),
        body: t('orders.payment.collectBody', {
            name: practitionerName.value,
            amount: ils(props.order.practitioner.debt, 0),
        }),
        effects: [
            t('orders.payment.collectEffectAll'),
            t('orders.payment.collectEffectAllOrNothing'),
            t('orders.payment.collectEffectDoc'),
            t('orders.payment.collectEffectDays', { days: CREDIT.linkDays }),
        ],
        done: () =>
            push({
                title: t('orders.payment.collectDone'),
                body: t('orders.payment.collectDoneBody', {
                    amount: ils(props.order.practitioner.debt, 0),
                }),
            }),
    });
}

function downloadDoc() {
    push({
        title: t('orders.payment.downloaded'),
        body: `${loc(props.order.docType) || ''} ${props.order.docNum}.pdf`.trim(),
    });
}
</script>

<template>
    <div class="a-grid">
        <div class="a-2col">
            <ACard :title="t('orders.payment.card')" icon="card">
                <AKeyValue
                    :rows="[
                        [t('orders.payment.method'), loc(order.payMethod)],
                        [t('orders.payment.payer'), null],
                        [t('orders.payment.status'), null],
                        [t('orders.payment.amount'), null],
                        [t('orders.payment.linkValidity'), null],
                    ]"
                >
                    <template #value-1>
                        <PayerChip :payer="order.payer" />
                    </template>
                    <template #value-2>
                        <AChip :tone="paymentState.tone">
                            {{ paymentState.label }}
                        </AChip>
                    </template>
                    <template #value-3>
                        <AMoney :value="order.pricing.total" big />
                    </template>
                    <template #value-4>
                        <span
                            v-if="linkWindow.kind === 'credit'"
                            class="op-muted"
                        >
                            {{ t('orders.payment.linkCredit') }}
                        </span>
                        <span v-else-if="linkWindow.kind === 'expired'">
                            <AChip tone="red" size="sm">
                                {{ t('orders.payment.linkExpiredChip') }}
                            </AChip>
                            <span class="op-muted op-inline">
                                {{ t('orders.payment.linkExpiredNote') }}
                            </span>
                        </span>
                        <span v-else>
                            {{ linkWindow.text }}
                            <span v-if="linkWindow.remaining" class="op-muted">
                                {{ linkWindow.remaining }}
                            </span>
                        </span>
                    </template>
                </AKeyValue>
            </ACard>

            <ACard :title="t('orders.payment.docCard')" icon="file_text">
                <template #right>
                    <AChip :tone="docState.tone" size="sm">
                        {{ t(`docState.${order.docStatus || 'none'}`) }}
                    </AChip>
                </template>

                <AKeyValue
                    :rows="[
                        [
                            t('orders.payment.docType'),
                            hasDoc
                                ? loc(order.docType)
                                : t('orders.payment.docNotIssued'),
                        ],
                        [t('orders.payment.docNumber'), null],
                        [t('orders.payment.docAllocation'), null],
                        [t('orders.payment.docProvider'), null],
                        [t('orders.payment.clearing'), null],
                    ]"
                >
                    <template #value-1>
                        <ANum>{{ order.docNum }}</ANum>
                    </template>
                    <template #value-2>
                        <ANum>{{ order.docAlloc }}</ANum>
                    </template>
                    <template #value-3>
                        {{ DOC_PROVIDER.name }}
                        <span class="op-muted">
                            · {{ t('orders.payment.docProviderMode') }}
                        </span>
                    </template>
                    <template #value-4>
                        <span class="ltr">{{
                            order.gcTxn || order.gcSession
                        }}</span>
                    </template>
                </AKeyValue>

                <div
                    v-if="order.docStatus === 'failed'"
                    class="a-note a-note--danger op-note"
                >
                    {{ t('orders.payment.docFailedNote') }}
                </div>
                <div
                    v-else-if="order.docStatus === 'awaiting_credit'"
                    class="a-note a-note--info op-note"
                >
                    {{ t('orders.payment.docAwaitingCreditNote') }}
                </div>
                <div
                    v-else-if="order.docStatus === 'queued'"
                    class="a-note a-note--info op-note"
                >
                    {{ t('orders.payment.docQueuedNote') }}
                </div>

                <div class="op-actions">
                    <AButton
                        v-if="hasDoc"
                        sm
                        icon="download"
                        @click="downloadDoc"
                    >
                        {{ t('orders.payment.downloadPdf') }}
                    </AButton>
                    <AButton
                        v-if="order.docStatus === 'failed'"
                        sm
                        kind="p"
                        icon="refresh"
                        @click="askReissue"
                    >
                        {{ t('orders.payment.reissue') }}
                    </AButton>
                </div>
            </ACard>
        </div>

        <ACard
            v-if="!order.credit"
            :title="t('orders.payment.linkCard')"
            icon="send"
        >
            <div class="op-link">
                <AInput
                    :model-value="link"
                    readonly
                    ltr
                    class="op-link-field"
                    :aria-label="t('orders.payment.linkLabel')"
                />
                <AButton icon="copy" @click="copyLink">
                    {{ t('orders.payment.copy') }}
                </AButton>
                <AButton kind="p" icon="whatsapp" @click="askResend">
                    {{ t('orders.payment.resend') }}
                </AButton>
            </div>
            <div class="a-note a-note--info op-note">
                {{
                    t('orders.payment.linkNote', {
                        days: PAY_LINK.days,
                        reminderDay: PAY_LINK.reminderDay,
                    })
                }}
            </div>
        </ACard>

        <ACard
            v-if="onOpenCredit"
            :title="t('orders.payment.creditCard')"
            icon="coin"
        >
            <template #right>
                <AChip tone="purple" size="sm" :dot="false">
                    {{ practitionerName }}
                </AChip>
            </template>

            <AKeyValue
                :rows="[
                    [t('orders.payment.orderAmount'), null],
                    [t('orders.payment.openDebt'), null],
                    [t('orders.payment.debtAge'), null],
                    [t('orders.payment.creditApproved'), null],
                ]"
            >
                <template #value-0>
                    <AMoney :value="order.pricing.total" />
                </template>
                <template #value-1>
                    <span class="op-debt">
                        <AMoney :value="order.practitioner.debt" />
                    </span>
                </template>
                <template #value-2>
                    <ANum>{{ order.practitioner.debtDays }}</ANum>
                    {{ t('orders.payment.days') }}
                </template>
                <template #value-3>
                    <ANum>{{ order.practitioner.creditSince || '—' }}</ANum>
                    · {{ loc(order.practitioner.creditBy) || '—' }}
                </template>
            </AKeyValue>

            <div class="a-note a-note--info op-note">
                {{
                    t('orders.payment.creditNote', {
                        partial: CREDIT.allowPartial
                            ? t('orders.payment.partialAllowed')
                            : t('orders.payment.partialNotAllowed'),
                    })
                }}
            </div>

            <div class="op-actions">
                <AButton kind="p" icon="copy" @click="askCollectionLink">
                    {{ t('orders.payment.issueCollection') }}
                </AButton>
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.op-muted {
    color: var(--a-ink-4);
    font-size: 13.5px;
    font-weight: 500;
}

.op-inline {
    margin-inline-start: 6px;
}

.op-note {
    margin-top: 14px;
}

.op-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    flex-wrap: wrap;
}

.op-link {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.op-link-field {
    flex: 1;
    min-width: 320px;
    font-size: 13.5px;
}

.op-debt {
    color: var(--a-red);
    font-weight: 600;
}
</style>
