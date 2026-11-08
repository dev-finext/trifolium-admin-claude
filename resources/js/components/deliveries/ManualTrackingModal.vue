<script setup>
// "הזנת מספר מעקב ידנית" — for when the courier's API is down or the shipment
// was made by phone (SHIPPING_STATION_SPEC.md §7.3). Up to 30 characters, no
// pattern, until Tapuz confirms a real format.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useDatasetStore } from '@/stores/dataset';
import { useDeliveriesStore } from '@/stores/deliveries';

const props = defineProps({
    open: { type: Boolean, default: false },
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'done']);

const { t } = useI18n();
const dataset = useDatasetStore();
const store = useDeliveriesStore();

const courierCode = ref('');
const tracking = ref('');
const reason = ref('');
const code = ref('');
const wrong = ref(false);

watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        courierCode.value = store.defaultCourier?.code || '';
        tracking.value = '';
        reason.value = '';
        code.value = '';
        wrong.value = false;
    },
);

const companies = computed(() =>
    store.activeCouriers.map((row) => ({
        value: row.code,
        label: t(`courier.${row.code}`),
    })),
);

const expected = computed(() => dataset.session?.pin || '');

const blocked = computed(
    () =>
        !courierCode.value ||
        !tracking.value.trim() ||
        !reason.value.trim() ||
        !code.value,
);

async function submit() {
    if (blocked.value || !props.order) {
        return;
    }

    if (expected.value && code.value !== expected.value) {
        wrong.value = true;
        code.value = '';

        return;
    }

    await store.enterManualTracking(props.order, {
        courierCode: courierCode.value,
        trackingNumber: tracking.value.trim().slice(0, 30),
        reason: reason.value.trim(),
    });

    emit('done');
    emit('close');
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('deliveries.manualTracking.title')"
        :width="480"
        @close="emit('close')"
    >
        <div class="a-grid">
            <div>
                <label class="a-lbl" for="mt-courier">
                    {{ t('deliveries.manualTracking.courier') }}
                </label>
                <ASelect
                    id="mt-courier"
                    v-model="courierCode"
                    :options="companies"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="mt-tracking">
                    {{ t('deliveries.manualTracking.tracking') }}
                </label>
                <AInput
                    id="mt-tracking"
                    v-model="tracking"
                    ltr
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="mt-reason">
                    {{ t('ui.reasonLabel') }}
                </label>
                <textarea
                    id="mt-reason"
                    v-model="reason"
                    class="a-textarea"
                    rows="2"
                />
            </div>
            <div>
                <label class="a-lbl" for="mt-pin">{{ t('ui.pinLabel') }}</label>
                <input
                    id="mt-pin"
                    class="a-input a-pin"
                    :class="{ 'is-wrong': wrong }"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    :value="code"
                    @input="
                        ((code = $event.target.value.replace(/\\D/g, '')),
                        (wrong = false))
                    "
                />
                <div class="a-pinhint" :class="{ 'is-wrong': wrong }">
                    {{ wrong ? t('ui.pinWrong') : t('ui.pinHint') }}
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="blocked" @click="submit">
                {{ t('deliveries.manualTracking.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.a-grid {
    display: grid;
    gap: 14px;
}
</style>
