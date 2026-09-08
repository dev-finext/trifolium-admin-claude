<script setup>
// The action bar in the order-detail header.
//
// It carries the two state changes an agent drives from the header: sending the
// order to the lab, and cancelling it.
//
// There is deliberately no "next status" control. Every other step reports
// itself — the clearing provider marks an order paid, the lab moves it through
// the compounding stages, the courier marks it shipped and delivered — so a
// button that walked the status forward by hand would be an agent overwriting
// what those systems are about to say. Starting the compounding is the one step
// nothing else can report, and it is the one button here.
//
// Everything goes through the orders store — the bar never mutates a record
// itself — and each change is confirmed first. A cancellation is irreversible, so
// it forces a written reason and an approval code before it runs.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useSaveGuard } from '@/composables/useSaveGuard';
import { useToast } from '@/composables/useToast';
import { CANCEL_REASON_IDS, isSettled, paymentStateOf } from '@/config';
import { useCrmStore } from '@/stores/crm';
import { useDatasetStore } from '@/stores/dataset';
import {
    canSendToLab,
    isCancellable,
    statusOf,
    trackedItems,
    useOrdersStore,
} from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const toast = useToast();
const dataset = useDatasetStore();
const orders = useOrdersStore();
const crm = useCrmStore();
const { guard } = useSaveGuard();

// V2 — the structured cancellation reason offered in the dialog
const cancelCauses = computed(() =>
    CANCEL_REASON_IDS.map((id) => ({
        value: id,
        label: t(`orders.cancelCause.${id}`),
    })),
);

const status = computed(() => statusOf(props.order));
const toLab = computed(() => canSendToLab(props.order));

/** Only the compounded formulas go to the lab; shelf lines are picked, not made. */
const labItems = computed(
    () =>
        trackedItems(props.order).filter((item) => !item.cancelled)
            .length,
);
const cancellable = computed(() => isCancellable(props.order));

/** V2: urgency can be flagged on any order still in the pharmacy's hands. */
const urgentToggle = computed(
    () => !['cancelled', 'closed'].includes(status.value),
);

async function toggleUrgent() {
    const on = !props.order.urgent;

    // Through the save guard: a refused write clears the flag again and offers
    // the action back, instead of leaving the lab a priority nobody recorded.
    await guard({
        label: t(
            on
                ? 'orders.actions.urgentOnToast'
                : 'orders.actions.urgentOffToast',
        ),
        run: () => orders.setUrgent(props.order.id, on),
    });
}

const patientName = computed(() => loc(props.order.patient.name));

/** Which confirmation is open: 'lab', 'cancel', or none. */
const ask = ref('');

/**
 * What cancelling this order settles on the money side, worded for the order it
 * is actually in: an unpaid link is voided, an unpaid credit balance is removed,
 * anything already paid is refunded by a credit note.
 */
const cancelMoneyEffect = computed(() => {
    if (!isSettled(props.order)) {
        return t('orders.effect.payLinkVoided');
    }

    if (props.order.credit && !props.order.creditPaid) {
        return t('orders.effect.debtRemoves');
    }

    return t('orders.effect.creditNoteIssued');
});

const cancelEffects = computed(() => [
    t('orders.effect.statusTo', { status: t('status.cancelled') }),
    t('orders.effect.releaseStock'),
    cancelMoneyEffect.value,
    t('orders.effect.reasonLogged'),
]);

// A credit order goes to the lab against an approved balance rather than a
// payment, so the dialog says which of the two cleared it.
const labEffects = computed(() => [
    t('orders.effect.statusTo', { status: t('status.lab') }),
    t('orders.effect.itemsToLabQueue'),
    t('orders.effect.msgByTriggers'),
    paymentStateOf(props.order) === 'credit'
        ? t('orders.effect.collectedOnCredit')
        : t('orders.effect.alreadyPaid'),
]);

async function confirmToLab() {
    ask.value = '';

    const moved = await orders.sendToLab(props.order.id);

    if (!moved) {
        return;
    }

    toast.push({
        title: t('orders.actions.toLabToast'),
        body: t('orders.effect.statusTo', {
            status: t(`status.${statusOf(props.order)}`),
        }),
    });
}

async function confirmCancel(reason, code, cause) {
    ask.value = '';
    await orders.cancelOrder(props.order.id, reason, cause || null);

    // V2 — the cancellation is filed as a CRM activity on the practitioner
    await crm.addActivity({
        entity: 'practitioner',
        ref: props.order.practitioner.code,
        type: 'note',
        subject: 'cancellation',
        order: props.order.id,
        text: cause
            ? `${t(`orders.cancelCause.${cause}`)} · ${reason}`
            : reason,
        auto: true,
    });

    toast.push({
        title: t('orders.action.cancel_order.toast'),
        body: t('orders.action.cancel_order.toastBody', { reason }),
        bad: true,
    });
}
</script>

<template>
    <div class="a-oactions">
        <AButton v-if="toLab" kind="p" icon="beaker" @click="ask = 'lab'">
            {{ t('orders.actions.toLab') }}
        </AButton>

        <AButton
            v-if="urgentToggle"
            :kind="order.urgent ? 'ghost' : ''"
            icon="alert"
            @click="toggleUrgent"
        >
            {{
                order.urgent
                    ? t('orders.actions.urgentOff')
                    : t('orders.actions.urgentOn')
            }}
        </AButton>
        <V2Badge v-if="urgentToggle" id="order-flags" size="sm" />

        <AButton
            v-if="cancellable"
            kind="danger"
            icon="x"
            class="a-push"
            @click="ask = 'cancel'"
        >
            {{ t('orders.action.cancel_order.label') }}
        </AButton>

        <ConfirmDialog
            :open="ask === 'lab'"
            :title="t('orders.actions.toLabTitle')"
            :body="
                t(
                    'orders.actions.toLabBody',
                    { id: order.id, n: labItems },
                    labItems,
                )
            "
            :effects="labEffects"
            :confirm-label="t('orders.actions.toLab')"
            @close="ask = ''"
            @confirm="confirmToLab"
        />

        <ConfirmDialog
            :open="ask === 'cancel'"
            danger
            reason
            :pin="dataset.session?.pin || true"
            :title="t('orders.action.cancel_order.title')"
            :body="
                t('orders.action.cancel_order.body', {
                    id: order.id,
                    name: patientName,
                })
            "
            :effects="cancelEffects"
            :confirm-label="t('orders.action.cancel_order.confirm')"
            :choices="cancelCauses"
            :choice-label="t('orders.action.cancel_order.cause')"
            :choice-hint="t('orders.action.cancel_order.causeHint')"
            @close="ask = ''"
            @confirm="confirmCancel"
        >
            <template #choice-badge><V2Badge id="crm" size="sm" /></template>
        </ConfirmDialog>
    </div>
</template>

<style scoped>
.a-oactions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--a-line);
}
</style>
