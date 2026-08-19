<script setup>
// Courier assignment and tracking number.
//
// There is no courier API yet: the shipment is created in the courier's own
// system by hand and only the tracking number comes back here. The note says so
// rather than implying the console booked anything.
import { ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { COURIERS } from '@/config';
import { isoDaysAgo } from '@/lib/dates';

const props = defineProps({
    open: { type: Boolean, default: false },
    /** The order being assigned, or null while the dialog is closed. */
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const uid = useId();

const courier = ref('');
const tracking = ref('');
const shipDate = ref(isoDaysAgo(0));

// Every opening starts from what the order actually holds, so re-opening the
// dialog never offers the previous order's tracking number.
watch(
    () => [props.open, props.order?.id],
    () => {
        if (!props.open) {
            return;
        }

        courier.value = props.order?.courier || '';
        tracking.value = props.order?.tracking || '';
        shipDate.value = isoDaysAgo(0);
    },
    { immediate: true },
);

function save() {
    if (!courier.value) {
        return;
    }

    emit('save', {
        courier: courier.value,
        tracking: tracking.value.trim(),
        shipDate: shipDate.value,
    });
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('orders.courierDialog.title', { id: order?.id || '' })"
        :width="640"
        @close="emit('close')"
    >
        <div class="a-grid">
            <div>
                <label class="a-lbl" :for="`${uid}-courier`">
                    {{ t('orders.courierDialog.company') }}
                </label>
                <ASelect
                    :id="`${uid}-courier`"
                    v-model="courier"
                    class="a-w100"
                >
                    <option value="">
                        {{ t('orders.courierDialog.companyPlaceholder') }}
                    </option>
                    <option
                        v-for="row in COURIERS"
                        :key="row.id"
                        :value="row.id"
                    >
                        {{ row.code }} — {{ t(`courier.${row.id}`) }}
                    </option>
                </ASelect>
            </div>

            <div class="a-2col">
                <div>
                    <label class="a-lbl" :for="`${uid}-tracking`">
                        {{ t('orders.courierDialog.tracking') }}
                    </label>
                    <AInput
                        :id="`${uid}-tracking`"
                        v-model="tracking"
                        ltr
                        class="a-w100"
                        :placeholder="
                            t('orders.courierDialog.trackingPlaceholder')
                        "
                    />
                </div>
                <div>
                    <label class="a-lbl" :for="`${uid}-date`">
                        {{ t('orders.courierDialog.shipDate') }}
                    </label>
                    <AInput
                        :id="`${uid}-date`"
                        v-model="shipDate"
                        type="date"
                        class="a-w100"
                    />
                </div>
            </div>

            <div v-if="!courier" class="a-note a-note--warn">
                {{ t('orders.courierDialog.needCompany') }}
            </div>
            <div v-else class="a-note a-note--info">
                {{ t('orders.courierDialog.apiNote') }}
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="truck" :disabled="!courier" @click="save">
                {{ t('orders.courierDialog.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
        </template>
    </AModal>
</template>
