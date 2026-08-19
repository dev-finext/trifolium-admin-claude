<script setup>
// Recording money that arrived outside the payment link — a bank transfer, cash
// at the counter.
//
// The amount is the whole open balance and is not editable: collection is all or
// nothing (CREDIT.allowPartial is false), so there is nothing here to type wrong.
// The VAT the document will state is read through lib/money, never written into
// this screen.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AKeyValue from '@/components/ui/AKeyValue.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { DOC_PROVIDER } from '@/config';
import { ils, num, pct } from '@/lib/money';
import {
    MANUAL_PAYMENT_METHODS,
    useMoneyStore,
    vatParts,
} from '@/stores/money';

const props = defineProps({
    /** Customer number of the practitioner paying, or '' while closed. */
    code: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();

const method = ref(MANUAL_PAYMENT_METHODS[0]);

const practitioner = computed(() =>
    props.code ? money.byCode(props.code) : null,
);
const orders = computed(() =>
    props.code ? money.openCreditOrders(props.code) : [],
);
const balance = computed(() => practitioner.value?.debt || 0);
const parts = computed(() => vatParts(balance.value));

const methodOptions = computed(() =>
    MANUAL_PAYMENT_METHODS.map((id) => ({
        value: id,
        label: t(`paymentMethod.${id}`),
    })),
);

// Every opening starts from the first method rather than the last one used.
watch(
    () => props.code,
    () => {
        method.value = MANUAL_PAYMENT_METHODS[0];
    },
);

const rows = computed(() => [
    [t('finance.pay.balance'), ils(balance.value, 0)],
    [
        t('finance.pay.covers'),
        t('finance.pay.coversValue', { n: num(orders.value.length) }),
    ],
    [t('finance.pay.net'), ils(parts.value.net)],
    [
        t('finance.pay.vat', { rate: pct(parts.value.rate * 100) }),
        ils(parts.value.vat),
    ],
    [t('finance.pay.gross'), ils(parts.value.gross)],
]);

const effects = computed(() => [
    t('finance.pay.effect1', { doc: t('docType.invrec_multi.name') }),
    t('finance.pay.effect2', { provider: DOC_PROVIDER.name }),
    t('finance.pay.effect3', { n: orders.value.length }),
    t('finance.pay.effect4'),
]);

function confirm(reason) {
    const code = props.code;
    const name = practitioner.value ? loc(practitioner.value.name) : '';

    emit('close');

    const result = money.recordManualPayment({
        code,
        method: method.value,
        reason,
    });

    if (!result) {
        return;
    }

    push({
        title: t('finance.toast.paymentRecorded'),
        body: t('finance.toast.paymentRecordedBody', {
            name,
            amount: ils(result.amount, 0),
            n: result.orders.length,
        }),
    });
}
</script>

<template>
    <ConfirmDialog
        :open="Boolean(practitioner) && balance > 0"
        :title="
            practitioner
                ? t('finance.pay.title', { name: loc(practitioner.name) })
                : ''
        "
        :effects="effects"
        :confirm-label="t('finance.pay.confirm')"
        reason
        @close="emit('close')"
        @confirm="confirm"
    >
        <div class="a-note a-note--info f-note">
            {{ t('finance.pay.allOrNothing') }}
        </div>

        <AKeyValue :rows="rows" />

        <label class="a-lbl f-lbl" for="f-pay-method">
            {{ t('finance.pay.method') }}
        </label>
        <ASelect
            id="f-pay-method"
            v-model="method"
            :options="methodOptions"
            class="a-w100"
        />
    </ConfirmDialog>
</template>

<style scoped>
.f-note {
    margin-bottom: 16px;
}

.f-lbl {
    margin-top: 18px;
}
</style>
