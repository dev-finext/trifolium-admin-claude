<script setup>
// Courier assignment for one order: which company takes it, the tracking number
// off the label, and the date it left the pharmacy.
//
// It deliberately does not mark the order shipped. Handing a parcel to a courier
// and dispatching it are two separate acts, and only the second one changes the
// order's status — the queue has its own action for that, and that action is the
// one the power of attorney gates.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TrackingEditor from '@/components/deliveries/TrackingEditor.vue';
import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { ACTIVE_COURIERS, COURIER } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { isTracking, useDeliveriesStore } from '@/stores/deliveries';

/** Wide enough for the tracking field and the dispatch date side by side. */
const WIDTH = 640;

const props = defineProps({
    open: { type: Boolean, default: false },
    /** The order being assigned; null while the modal is closed. */
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const uid = useId();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

const courier = ref('');
const tracking = ref('');
const sentOn = ref('');

// Every opening reads the order again: a number typed for one order must never
// be carried into the next.
watch(
    () => [props.open, props.order?.id],
    () => {
        if (!props.open || !props.order) {
            return;
        }

        courier.value = props.order.courier || '';
        tracking.value = props.order.tracking || '';
        sentOn.value = props.order.sentOn || isoDaysAgo(0);
    },
    { immediate: true },
);

const courierCode = computed(() => COURIER[courier.value]?.code || '');

const phone = computed(() => deliveries.courierPhone(courier.value));

const blocked = computed(
    () =>
        !courier.value ||
        (Boolean(tracking.value) && !isTracking(tracking.value)),
);

const title = computed(() =>
    t('deliveries.assign.title', { id: props.order?.id || '' }),
);

function save() {
    if (blocked.value) {
        return;
    }

    emit('save', {
        courier: courier.value,
        tracking: tracking.value,
        sentOn: sentOn.value,
    });
}
</script>

<template>
    <AModal
        :open="open && Boolean(order)"
        :title="title"
        :width="WIDTH"
        @close="emit('close')"
    >
        <div v-if="order" class="a-grid body">
            <div class="a-2col">
                <div>
                    <label class="a-lbl" :for="`${uid}-courier`">
                        {{ t('deliveries.assign.courier') }}
                    </label>
                    <ASelect
                        :id="`${uid}-courier`"
                        v-model="courier"
                        class="a-w100"
                    >
                        <option value="">
                            {{ t('deliveries.assign.courierPick') }}
                        </option>
                        <option
                            v-for="item in ACTIVE_COURIERS"
                            :key="item.id"
                            :value="item.id"
                        >
                            {{
                                t('deliveries.assign.courierOption', {
                                    code: item.code,
                                    name: courierName(item.id),
                                })
                            }}
                        </option>
                    </ASelect>
                    <div v-if="phone" class="a-hint">
                        {{ t('deliveries.assign.courierPhone', { phone }) }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl" :for="`${uid}-sent`">
                        {{ t('deliveries.assign.sentOn') }}
                    </label>
                    <AInput
                        :id="`${uid}-sent`"
                        v-model="sentOn"
                        type="date"
                        class="a-w100"
                    />
                </div>
            </div>

            <TrackingEditor v-model="tracking" :courier-code="courierCode" />

            <div v-if="!order.addressProvided" class="a-note a-note--warn">
                {{ t('deliveries.assign.addressMissing') }}
            </div>
            <div v-if="!order.poaSigned" class="a-note a-note--danger">
                {{ t('deliveries.assign.poaMissing') }}
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="truck" :disabled="blocked" @click="save">
                {{ t('deliveries.assign.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.body {
    gap: 16px;
}
</style>
