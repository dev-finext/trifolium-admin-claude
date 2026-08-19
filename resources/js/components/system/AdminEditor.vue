<script setup>
// The "new admin user" form. It collects the three account fields and hands them
// up — the confirmation step (with its approval code) belongs to the screen, and
// the initial password is set by the server and sent by SMS, so nothing
// password-shaped exists here at all.
//
// There is no role to pick: every admin holds the same full permissions, and the
// note in the form says so rather than leaving the reader to wonder.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';

/** The lightest sanity checks a form can hold — the server validates for real. */
const MIN_NAME_LENGTH = 2;
const MIN_PHONE_LENGTH = 9;

const props = defineProps({
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['next', 'close']);

const { t } = useI18n();
const uid = useId();

const name = ref('');
const email = ref('');
const phone = ref('');

// Every opening starts clean — a half-typed user must not leak into the next.
watch(
    () => props.open,
    () => {
        name.value = '';
        email.value = '';
        phone.value = '';
    },
);

const valid = computed(
    () =>
        name.value.trim().length >= MIN_NAME_LENGTH &&
        email.value.includes('@') &&
        phone.value.trim().length >= MIN_PHONE_LENGTH,
);

function next() {
    if (!valid.value) {
        return;
    }

    emit('next', {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
    });
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('admins.editor.title')"
        :width="620"
        @close="emit('close')"
    >
        <div class="a-grid ae-grid">
            <div>
                <label class="a-lbl" :for="`${uid}-name`">
                    {{ t('admins.editor.name') }}
                </label>
                <AInput
                    :id="`${uid}-name`"
                    v-model="name"
                    class="a-w100"
                    :placeholder="t('admins.editor.namePh')"
                />
            </div>

            <div class="a-2col">
                <div>
                    <label class="a-lbl" :for="`${uid}-email`">
                        {{ t('admins.editor.email') }}
                    </label>
                    <AInput
                        :id="`${uid}-email`"
                        v-model="email"
                        class="a-w100"
                        ltr
                        :placeholder="t('admins.editor.emailPh')"
                    />
                </div>
                <div>
                    <label class="a-lbl" :for="`${uid}-phone`">
                        {{ t('admins.editor.phone') }}
                    </label>
                    <AInput
                        :id="`${uid}-phone`"
                        v-model="phone"
                        class="a-w100"
                        ltr
                        :placeholder="t('admins.editor.phonePh')"
                    />
                </div>
            </div>

            <div class="a-note a-note--info">
                {{ t('admins.editor.note') }}
            </div>

            <div v-if="!valid" class="ae-invalid">
                {{ t('admins.editor.invalid') }}
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!valid" @click="next">
                {{ t('admins.editor.next') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.ae-grid {
    gap: 16px;
}

.ae-invalid {
    font-size: 13.5px;
    color: var(--a-ink-4);
}
</style>
