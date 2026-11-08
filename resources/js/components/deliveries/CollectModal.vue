<script setup>
// "נאסף" — self-pickup collection. No password: the customer is standing at
// the counter. "נאסף על ידי" is free text, for when someone collects on the
// patient's behalf (SHIPPING_STATION_SPEC.md §10).
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import { useDeliveriesStore } from '@/stores/deliveries';

const props = defineProps({
    open: { type: Boolean, default: false },
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'done']);

const { t } = useI18n();
const store = useDeliveriesStore();

const collectedByName = ref('');

watch(
    () => props.open,
    (open) => {
        if (open) {
            collectedByName.value = '';
        }
    },
);

async function submit() {
    if (!props.order) {
        return;
    }

    await store.markCollected(props.order, {
        collectedByName: collectedByName.value.trim(),
    });
    emit('done');
    emit('close');
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('deliveries.collect.title', { id: order?.id })"
        :width="420"
        @close="emit('close')"
    >
        <label class="a-lbl" for="collect-by">
            {{ t('deliveries.collect.byLabel') }}
        </label>
        <AInput id="collect-by" v-model="collectedByName" class="a-w100" />
        <div class="a-hint">{{ t('deliveries.collect.byHint') }}</div>

        <template #footer>
            <AButton kind="p" icon="check" @click="submit">
                {{ t('deliveries.collect.confirm') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>
