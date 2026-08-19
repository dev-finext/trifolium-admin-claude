<script setup>
// New / edit interaction.
//
// An interaction is deliberately thin: one herb, one comma-separated drug list,
// nothing else. No severity grading and no clinical note — the pharmacist reads
// the pair and decides. Each name in the list is matched on its own, which is why
// the field previews the names it parsed out before anything is saved.
//
// The same herb with the same drug list may only be documented once, and the
// duplicate check runs against the live table rather than the seeded rows.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import HerbPicker from '@/components/safety/HerbPicker.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import { drugList, useSafetyStore } from '@/stores/safety';

/** Wide enough for the herb list and the drug field side by side. */
const WIDTH = 680;

const props = defineProps({
    /** The row being edited, or an empty object for a new one. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const store = useSafetyStore();
const uid = useId();

const herbId = ref('');
const drug = ref('');

watch(
    () => props.row,
    (row) => {
        herbId.value = row?.herbId || store.herbs[0]?.id || '';
        drug.value = row?.drug || '';
    },
    { immediate: true },
);

const parsed = computed(() => drugList(drug.value));

const duplicate = computed(() =>
    store.isDuplicate(herbId.value, drug.value, props.row?.id || null),
);

const blocked = computed(() => !parsed.value.length || duplicate.value);

function save() {
    if (blocked.value) {
        return;
    }

    emit('save', {
        id: props.row?.id || null,
        herbId: herbId.value,
        drug: parsed.value.join(', '),
    });
}
</script>

<template>
    <AModal
        :open="Boolean(row)"
        :title="row?.id ? t('safety.editor.edit') : t('safety.editor.new')"
        :width="WIDTH"
        @close="emit('close')"
    >
        <div v-if="duplicate" class="a-note a-note--danger a-ed-dup">
            {{ t('safety.editor.duplicate') }}
        </div>

        <div class="a-grid">
            <HerbPicker v-model="herbId" :herbs="store.herbs" />

            <div>
                <label class="a-lbl" :for="`${uid}-drugs`">
                    {{ t('safety.editor.drugsLabel') }}
                </label>
                <AInput
                    :id="`${uid}-drugs`"
                    v-model="drug"
                    class="a-w100"
                    ltr
                    :placeholder="t('safety.editor.drugsPlaceholder')"
                />

                <div v-if="parsed.length" class="a-ed-chips">
                    <AChip
                        v-for="name in parsed"
                        :key="name"
                        tone="blue"
                        size="sm"
                        :dot="false"
                    >
                        <span class="ltr">{{ name }}</span>
                    </AChip>
                </div>

                <div class="a-hint">{{ t('safety.editor.drugsHint') }}</div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="blocked" @click="save">
                {{ t('actions.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.a-ed-dup {
    margin-bottom: 16px;
}

.a-ed-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
}
</style>
