<script setup>
// One file, picked for a form whose record does not exist yet — the scan of a
// supplier's document on a goods receipt, or of a tax invoice being attached.
//
// The file is checked against the attachment rules (config/items.js
// `ATTACHMENT_RULES`) the moment it is picked, so a form never carries a file
// it could not keep; the store files it once the record exists
// (stores/purchasing.js `receiveDocument`, `attachInvoice`). Anything added
// later goes through the record's own AttachmentsPanel.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import { useToast } from '@/composables/useToast';
import { ATTACHMENT_RULES } from '@/config';

defineProps({
    /** The picked File, or null. */
    modelValue: { type: Object, default: null },
    /** For the label above it. */
    inputId: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { push } = useToast();
const input = ref(null);

const ACCEPT = ATTACHMENT_RULES.extensions.map((ext) => `.${ext}`).join(',');

function extensionOf(name) {
    const match = String(name)
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/);

    return match ? match[1] : '';
}

function onPicked(event) {
    const [file] = event.target.files || [];

    event.target.value = '';

    if (!file) {
        return;
    }

    if (!ATTACHMENT_RULES.extensions.includes(extensionOf(file.name))) {
        push({
            title: t('attachments.toast.badType'),
            body: t('attachments.toast.badTypeBody', {
                name: file.name,
                types: ATTACHMENT_RULES.extensions.join(', '),
            }),
            bad: true,
        });

        return;
    }

    if (file.size > ATTACHMENT_RULES.maxMb * 1024 * 1024) {
        push({
            title: t('attachments.toast.tooBig'),
            body: t('attachments.toast.tooBigBody', {
                name: file.name,
                mb: ATTACHMENT_RULES.maxMb,
            }),
            bad: true,
        });

        return;
    }

    emit('update:modelValue', file);
}
</script>

<template>
    <div class="fp">
        <input
            :id="inputId || undefined"
            ref="input"
            class="fp-input"
            type="file"
            :accept="ACCEPT"
            @change="onPicked"
        />
        <AButton sm icon="upload" @click="input?.click()">
            {{ modelValue ? t('attachments.replace') : t('attachments.add') }}
        </AButton>
        <span v-if="modelValue" class="fp-name" :title="modelValue.name">{{
            modelValue.name
        }}</span>
        <AButton
            v-if="modelValue"
            sm
            kind="ghost"
            icon="x"
            :aria-label="t('attachments.clear')"
            :title="t('attachments.clear')"
            @click="emit('update:modelValue', null)"
        />
    </div>
</template>

<style scoped>
.fp {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

/* The native control stays in the page for the label and the keyboard, and out
   of sight: the button beside it is what a person presses. */
.fp-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
}

.fp-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
}
</style>
