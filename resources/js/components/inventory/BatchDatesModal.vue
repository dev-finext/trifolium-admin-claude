<script setup>
// Correcting a batch's two dates. V3.
//
// Both are single fields, as the specification insists — the expiry that FEFO
// and the label work from, and the production date the supplier's certificate
// gives. Changing either is written to the change log with its old value.
//
// One dialog, opened from wherever a batch is looked at: its trace drawer, a
// row of the batches table, a batch on the item card.
import { computed, reactive, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The batch being corrected, or null while the dialog is closed. */
    batch: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const inventory = useInventoryStore();
const uid = useId();

const saving = ref(false);
const form = reactive({ expiry: '', madeOn: '', reason: '' });

watch(
    () => props.batch,
    (batch) => {
        if (batch) {
            form.expiry = batch.expiry || '';
            form.madeOn = batch.madeOn || '';
            form.reason = '';
        }
    },
    { immediate: true },
);

const dirty = computed(
    () =>
        Boolean(props.batch) &&
        (form.expiry !== (props.batch.expiry || '') ||
            (form.madeOn || '') !== (props.batch.madeOn || '')),
);

/**
 * A batch always has an expiry: FEFO orders by it and the label prints it.
 * Clearing the field used to leave Save enabled and quietly keep the old date;
 * now the dialog says why it will not save.
 */
const expiryMissing = computed(() => Boolean(props.batch) && !form.expiry);

async function save() {
    if (expiryMissing.value || !dirty.value) {
        return;
    }

    saving.value = true;

    try {
        const batch = await inventory.editBatchDates(props.batch.id, {
            ...form,
        });

        emit('saved', batch);
        emit('close');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        :open="Boolean(batch)"
        :title="
            t('inventory.batches.dates.title', {
                batch: batch ? inventory.batchNo(batch) : '',
            })
        "
        :width="480"
        @close="emit('close')"
    >
        <div v-if="batch" class="bd-form">
            <div>
                <label class="a-lbl" :for="`${uid}-exp`">{{
                    t('inventory.batches.trace.expiry')
                }}</label>
                <AInput
                    :id="`${uid}-exp`"
                    v-model="form.expiry"
                    type="date"
                    class="a-w100"
                />
                <div v-if="expiryMissing" class="a-hint bd-need">
                    {{ t('inventory.batches.dates.expiryRequired') }}
                </div>
                <div class="a-hint">
                    {{ t('inventory.batches.dates.expiryHint') }}
                </div>
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-made`">{{
                    t('inventory.batches.trace.madeOn')
                }}</label>
                <AInput
                    :id="`${uid}-made`"
                    v-model="form.madeOn"
                    type="date"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t('inventory.batches.dates.madeOnHint') }}
                </div>
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-why`">{{
                    t('inventory.batches.dates.reason')
                }}</label>
                <ATextarea
                    :id="`${uid}-why`"
                    v-model="form.reason"
                    :rows="2"
                    class="a-w100"
                />
                <div class="a-hint">
                    {{ t('inventory.batches.dates.reasonHint') }}
                </div>
            </div>
        </div>
        <template #footer>
            <AButton
                kind="p"
                icon="save"
                :disabled="!dirty || expiryMissing || saving"
                @click="save"
                >{{ t('inventory.batches.dates.save') }}</AButton
            >
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.bd-form {
    display: grid;
    gap: 14px;
}

.bd-need {
    color: var(--a-red);
    font-weight: 600;
}
</style>
