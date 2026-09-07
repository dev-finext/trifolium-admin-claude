<script setup>
// The preparation fields on one formula that SAP kept as user fields and the
// first version did not have: the extraction concentration, and the patient's
// instructions — free text that falls back to the managed default.
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { EXTRACTION_RATIOS } from '@/config';
import { useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
    item: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const orders = useOrdersStore();

const form = reactive({
    concentration: props.item.concentration || '',
    instructions: props.item.patientInstructions
        ? loc(props.item.patientInstructions)
        : '',
});

const options = computed(() => [
    { value: '', label: t('orders.fieldsEditor.noConcentration') },
    ...EXTRACTION_RATIOS.map((ratio) => ({ value: ratio, label: ratio })),
]);

const defaultText = computed(() =>
    orders.labSettings ? loc(orders.labSettings.instructionsDefault) : '',
);

async function save() {
    await orders.setItemFields(props.order.id, props.item.id, {
        concentration: form.concentration,
        patientInstructions: form.instructions,
    });

    emit('saved', props.item);
}
</script>

<template>
    <AModal
        open
        :title="t('orders.fieldsEditor.title', { name: loc(item.name) })"
        :width="640"
        @close="emit('close')"
    >
        <div class="a-grid">
            <div>
                <label class="a-lbl">{{
                    t('orders.field.concentration')
                }}</label>
                <ASelect
                    v-model="form.concentration"
                    :options="options"
                    class="a-w100"
                    ltr
                />
            </div>
            <div>
                <label class="a-lbl">{{
                    t('orders.field.instructions')
                }}</label>
                <ATextarea
                    v-model="form.instructions"
                    :rows="3"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('orders.fieldsEditor.instructionsHint', {
                            text: defaultText,
                        })
                    }}
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" @click="save">
                {{ t('orders.fieldsEditor.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>
