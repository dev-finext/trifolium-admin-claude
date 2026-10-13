<script setup>
// The one editor behind both halves of the address book.
//
// A town and a street are the same record on this screen — a name in Hebrew and
// the same name in English — so they share one dialog rather than two that would
// have to be kept identical by hand. What differs is the title, the hints and
// where the save goes, and all three come from the caller.
//
// The English side is optional: left empty, the store stores the Hebrew name on
// both, which is what the pharmacy does when a street has no settled English
// spelling. The dialog says so rather than letting it be a surprise.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';

/** Two short fields; wider than this and the form reads emptier than it is. */
const WIDTH = 460;

const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** The record being renamed, or null for a new one. */
    place: { type: Object, default: null },
    hePlaceholder: { type: String, default: '' },
    enPlaceholder: { type: String, default: '' },
    /** `(name) => boolean` — true while another row already carries this name. */
    taken: { type: Function, default: () => false },
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const uid = useId();

const he = ref('');
const en = ref('');

// Every opening reads the record again, so a name typed for one row is never
// carried into the next.
watch(
    () => [props.open, props.place?.id],
    () => {
        if (!props.open) {
            return;
        }

        const name = props.place?.name;

        he.value = name?.he || '';
        // An English name equal to the Hebrew one was never typed — it is the
        // fallback the store wrote. The field shows what somebody typed, so it
        // opens empty and the hint below it stays true a second time round.
        en.value = name?.en && name.en !== name.he ? name.en : '';
    },
    { immediate: true },
);

const clash = computed(
    () => Boolean(he.value.trim()) && props.taken(he.value.trim()),
);

const blocked = computed(() => !he.value.trim() || clash.value);

function save() {
    if (blocked.value) {
        return;
    }

    emit('save', { he: he.value.trim(), en: en.value.trim() });
}
</script>

<template>
    <AModal :open="open" :title="title" :width="WIDTH" @close="emit('close')">
        <div class="a-grid body">
            <div>
                <label class="a-lbl" :for="`${uid}-he`">
                    {{ t('addresses.editor.he') }}
                </label>
                <AInput
                    :id="`${uid}-he`"
                    v-model="he"
                    class="a-w100"
                    :placeholder="hePlaceholder"
                    @keyup.enter="save"
                />
            </div>

            <div>
                <label class="a-lbl" :for="`${uid}-en`">
                    {{ t('addresses.editor.en') }}
                </label>
                <AInput
                    :id="`${uid}-en`"
                    v-model="en"
                    ltr
                    class="a-w100"
                    :placeholder="enPlaceholder"
                    @keyup.enter="save"
                />
                <div class="a-hint">{{ t('addresses.editor.enHint') }}</div>
            </div>

            <div v-if="clash" class="a-note a-note--warn">
                {{ t('addresses.editor.taken') }}
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="blocked" @click="save">
                {{ t('addresses.editor.save') }}
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
