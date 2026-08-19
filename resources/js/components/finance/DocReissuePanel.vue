<script setup>
// Re-issuing a tax document that the provider refused.
//
// The payment cleared but the provider returned an error, so no document number
// and no allocation number exist for it. This asks the provider again — always
// from a confirmation, never silently and never on a timer — and leaves the
// document numberless until the provider answers with one.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { DOC_PROVIDER } from '@/config';
import { ils } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

const props = defineProps({
    /** The failed document, or null while the dialog is closed. */
    doc: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { push } = useToast();
const money = useMoneyStore();

const body = computed(() =>
    props.doc
        ? t('finance.docs.reissueBody', {
              provider: DOC_PROVIDER.name,
              order: props.doc.order || t('labels.none'),
              amount: ils(props.doc.amt, 0),
          })
        : '',
);

const effects = computed(() => [
    t('finance.docs.reissueEffect1', { type: t('docType.invrec.name') }),
    t('finance.docs.reissueEffect2'),
    t('finance.docs.reissueEffect3'),
    t('finance.docs.reissueEffect4', {
        retries: DOC_PROVIDER.retries,
        gap: DOC_PROVIDER.retryGapMinutes,
    }),
]);

function confirm(reason) {
    const doc = props.doc;

    emit('close');

    if (!doc) {
        return;
    }

    money.reissueDocument(doc.id, reason);
    push({
        title: t('finance.toast.reissued'),
        body: t('finance.toast.reissuedBody', {
            order: doc.order || t('labels.none'),
            provider: DOC_PROVIDER.name,
        }),
    });
}
</script>

<template>
    <ConfirmDialog
        :open="Boolean(doc)"
        :title="t('finance.docs.reissueTitle')"
        :body="body"
        :effects="effects"
        :confirm-label="t('finance.docs.reissueConfirm')"
        reason
        @close="emit('close')"
        @confirm="confirm"
    />
</template>
