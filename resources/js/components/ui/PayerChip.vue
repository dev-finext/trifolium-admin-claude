<script setup>
// Who pays for this order: the practitioner (who then bills the patient) or the
// patient directly. It changes which document is issued and who the payment link
// is sent to, so it is stated on every order, never inferred.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';

const props = defineProps({
    /** `'practitioner'` | `'patient'`. */
    payer: { type: String, default: 'practitioner' },
    size: { type: String, default: '' },
});

const { t } = useI18n();

const isPatient = computed(() => props.payer === 'patient');
const tone = computed(() => (isPatient.value ? 'purple' : 'teal'));
const label = computed(() =>
    t(`ui.payer.${isPatient.value ? 'patient' : 'practitioner'}`),
);
</script>

<template>
    <AChip :tone="tone" :size="size" :dot="false">{{ label }}</AChip>
</template>
