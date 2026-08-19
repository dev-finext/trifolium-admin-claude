<script setup>
// Credit terms (הקפה) on one practitioner's card.
//
// Two rules the UI must not soften: credit terms are approved per practitioner
// and nowhere else, and there is no credit limit — the system warns past
// CREDIT.warnDebt or CREDIT.warnDays and never blocks an order. So the warning
// below is a warning, and the buttons approve or revoke the track itself.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CREDIT } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

const props = defineProps({
    practitioner: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();

/** `''` while closed, otherwise the change being confirmed. */
const asking = ref('');

const approved = computed(() => Boolean(props.practitioner.credit));

/** True once the balance has aged or grown past the warning thresholds. */
const warned = computed(
    () =>
        props.practitioner.debt > CREDIT.warnDebt ||
        props.practitioner.debtDays > CREDIT.warnDays,
);

const rows = computed(() => {
    const card = props.practitioner;

    return [
        [
            t('finance.credit.track'),
            approved.value
                ? t('finance.track.creditLong')
                : t('finance.track.immediate'),
        ],
        card.creditSince && [
            t('finance.credit.since'),
            fmtISO(card.creditSince),
        ],
        card.creditBy && [t('finance.credit.by'), loc(card.creditBy)],
        card.creditRevoked && [
            t('finance.credit.revoked'),
            fmtISO(card.creditRevoked),
        ],
        [t('finance.credit.limit'), t('finance.credit.limitValue')],
        [
            t('finance.credit.warn'),
            t('finance.credit.warnValue', {
                amount: ils(CREDIT.warnDebt, 0),
                days: CREDIT.warnDays,
            }),
        ],
        [t('finance.credit.scope'), t('finance.credit.scopeValue')],
    ];
});

const dialog = computed(() => {
    if (asking.value === 'approve') {
        return {
            title: t('finance.credit.approveTitle'),
            body: t('finance.credit.approveBody', {
                name: loc(props.practitioner.name),
            }),
            confirmLabel: t('finance.credit.approveConfirm'),
            danger: false,
            effects: [
                t('finance.credit.approveEffect1'),
                t('finance.credit.approveEffect2'),
                t('finance.credit.approveEffect3', {
                    amount: ils(CREDIT.warnDebt, 0),
                    days: CREDIT.warnDays,
                }),
                t('finance.credit.effectLogged'),
            ],
        };
    }

    if (asking.value === 'revoke') {
        return {
            title: t('finance.credit.revokeTitle'),
            body: t('finance.credit.revokeBody', {
                name: loc(props.practitioner.name),
                amount: ils(props.practitioner.debt, 0),
            }),
            confirmLabel: t('finance.credit.revokeConfirm'),
            danger: true,
            effects: [
                t('finance.credit.revokeEffect1'),
                t('finance.credit.revokeEffect2'),
                t('finance.credit.revokeEffect3'),
                t('finance.credit.effectLogged'),
            ],
        };
    }

    return null;
});

function confirm(reason) {
    const wanted = asking.value === 'approve';

    asking.value = '';
    money.setCreditTerms({
        code: props.practitioner.code,
        approved: wanted,
        reason,
    });
    push({
        title: wanted
            ? t('finance.toast.creditApproved')
            : t('finance.toast.creditRevoked'),
        body: loc(props.practitioner.name),
        bad: !wanted,
    });
}
</script>

<template>
    <ACard :title="t('finance.credit.title')" icon="lock">
        <template #right>
            <AChip :tone="approved ? 'purple' : 'gray'" :dot="false">
                {{
                    approved
                        ? t('finance.track.credit')
                        : t('finance.track.immediate')
                }}
            </AChip>
            <AButton
                v-if="approved"
                sm
                kind="danger"
                icon="lock"
                @click="asking = 'revoke'"
            >
                {{ t('finance.credit.revokeConfirm') }}
            </AButton>
            <AButton
                v-else
                sm
                kind="p"
                icon="check"
                @click="asking = 'approve'"
            >
                {{ t('finance.credit.approveConfirm') }}
            </AButton>
        </template>

        <div v-if="warned" class="a-note a-note--warn f-warn">
            {{
                t('finance.credit.warnNote', {
                    days: practitioner.debtDays,
                    amount: ils(practitioner.debt, 0),
                })
            }}
        </div>

        <AKeyValue :rows="rows" />

        <ConfirmDialog
            :open="Boolean(dialog)"
            :title="dialog?.title || ''"
            :body="dialog?.body || ''"
            :effects="dialog?.effects || []"
            :confirm-label="dialog?.confirmLabel || ''"
            :danger="dialog?.danger || false"
            reason
            @close="asking = ''"
            @confirm="confirm"
        />
    </ACard>
</template>

<style scoped>
.f-warn {
    margin-bottom: 16px;
}
</style>
