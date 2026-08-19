<script setup>
// One external-system contact, in a drawer. It opens read-only — the details
// and the internal notes — and turns into a form when the contact is edited or
// a new one is added. The internal notes are shown to admins only; the note on
// the form says so.
//
// A contact's text fields are localized records. A single input cannot hold two
// languages, so a typed value is stored with L() as the value in both — the
// honest thing a form without a translation service can do.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { L } from '@/lib/localized';

/** The lightest sanity checks a form can hold — the server validates for real. */
const MIN_LENGTH = 2;
const MIN_PHONE_LENGTH = 9;

const props = defineProps({
    contact: { type: Object, default: null },
    /** Open straight into the form — true for a brand-new contact. */
    startEdit: { type: Boolean, default: false },
});

const emit = defineEmits(['save', 'remove', 'close']);

const { t } = useI18n();
const { loc } = useLocalized();
const uid = useId();

const editing = ref(false);
const form = ref({ system: '', contact: '', role: '', phone: '', notes: '' });

const isNew = computed(() => !props.contact?.id);

// Reset both the mode and the form every time a different contact is opened, so
// a half-typed edit never leaks from one drawer into the next.
watch(
    () => [props.contact, props.startEdit],
    ([contact]) => {
        editing.value = props.startEdit || !contact?.id;
        form.value = {
            system: loc(contact?.system) || '',
            contact: loc(contact?.contact) || '',
            role: loc(contact?.role) || '',
            phone: contact?.phone || '',
            notes: loc(contact?.notes) || '',
        };
    },
    { immediate: true },
);

const valid = computed(
    () =>
        form.value.system.trim().length >= MIN_LENGTH &&
        form.value.contact.trim().length >= MIN_LENGTH &&
        form.value.phone.trim().length >= MIN_PHONE_LENGTH,
);

const detailRows = computed(() => [
    [t('systemContacts.contacts.table.system'), loc(props.contact?.system)],
    [t('systemContacts.contacts.table.contact'), loc(props.contact?.contact)],
    loc(props.contact?.role) && [
        t('systemContacts.contacts.table.role'),
        loc(props.contact?.role),
    ],
    [t('systemContacts.contacts.table.phone'), props.contact?.phone],
]);

function save() {
    if (!valid.value) {
        return;
    }

    const value = form.value;

    emit('save', {
        ...props.contact,
        system: L(value.system.trim()),
        contact: L(value.contact.trim()),
        role: value.role.trim() ? L(value.role.trim()) : L(''),
        phone: value.phone.trim(),
        notes: value.notes.trim() ? L(value.notes.trim()) : L(''),
    });
}

function cancel() {
    if (isNew.value) {
        emit('close');

        return;
    }

    editing.value = false;
}
</script>

<template>
    <div class="vp">
        <div class="a-dhead a-dhead--line">
            <div class="a-dhead-top">
                <div class="a-dhead-t">
                    <h2 class="vp-title">
                        {{
                            editing
                                ? isNew
                                    ? t(
                                          'systemContacts.contacts.editor.newTitle',
                                      )
                                    : t(
                                          'systemContacts.contacts.editor.editTitle',
                                      )
                                : t('systemContacts.contacts.profile.title')
                        }}
                    </h2>
                </div>
                <div class="a-dhead-a">
                    <AButton
                        v-if="!editing"
                        kind="p"
                        icon="edit"
                        @click="editing = true"
                    >
                        {{ t('systemContacts.contacts.editor.editTitle') }}
                    </AButton>
                    <AButton
                        v-if="!editing"
                        kind="danger"
                        icon="trash"
                        @click="emit('remove', contact)"
                    >
                        {{ t('systemContacts.contacts.remove.confirm') }}
                    </AButton>
                    <AButton sm icon="x" @click="emit('close')">
                        {{ t('ui.close') }}
                    </AButton>
                </div>
            </div>
        </div>

        <template v-if="!editing">
            <ACard
                :title="t('systemContacts.contacts.profile.details')"
                icon="phone"
            >
                <AKeyValue :rows="detailRows" />
            </ACard>

            <ACard
                :title="t('systemContacts.contacts.profile.notes')"
                icon="file_text"
            >
                <div v-if="loc(contact?.notes)" class="vp-notes">
                    {{ loc(contact?.notes) }}
                </div>
                <div v-else class="vp-empty">
                    {{ t('systemContacts.contacts.profile.noNotes') }}
                </div>
            </ACard>
        </template>

        <template v-else>
            <div class="a-grid vp-form">
                <div>
                    <label class="a-lbl" :for="`${uid}-system`">
                        {{ t('systemContacts.contacts.editor.system') }}
                    </label>
                    <AInput
                        :id="`${uid}-system`"
                        v-model="form.system"
                        class="a-w100"
                        :placeholder="
                            t('systemContacts.contacts.editor.systemPh')
                        "
                    />
                </div>

                <div class="a-2col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-contact`">
                            {{ t('systemContacts.contacts.editor.contact') }}
                        </label>
                        <AInput
                            :id="`${uid}-contact`"
                            v-model="form.contact"
                            class="a-w100"
                            :placeholder="
                                t('systemContacts.contacts.editor.contactPh')
                            "
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-role`">
                            {{ t('systemContacts.contacts.editor.role') }}
                        </label>
                        <AInput
                            :id="`${uid}-role`"
                            v-model="form.role"
                            class="a-w100"
                            :placeholder="
                                t('systemContacts.contacts.editor.rolePh')
                            "
                        />
                    </div>
                </div>

                <div>
                    <label class="a-lbl" :for="`${uid}-phone`">
                        {{ t('systemContacts.contacts.editor.phone') }}
                    </label>
                    <AInput
                        :id="`${uid}-phone`"
                        v-model="form.phone"
                        class="a-w100"
                        ltr
                        :placeholder="
                            t('systemContacts.contacts.editor.phonePh')
                        "
                    />
                </div>

                <div>
                    <label class="a-lbl" :for="`${uid}-notes`">
                        {{ t('systemContacts.contacts.editor.notes') }}
                    </label>
                    <ATextarea
                        :id="`${uid}-notes`"
                        v-model="form.notes"
                        class="a-w100"
                        :rows="3"
                        :placeholder="
                            t('systemContacts.contacts.editor.notesPh')
                        "
                    />
                </div>

                <div class="a-note a-note--info">
                    {{ t('systemContacts.contacts.editor.note') }}
                </div>

                <div v-if="!valid" class="vp-invalid">
                    {{ t('systemContacts.contacts.editor.invalid') }}
                </div>

                <div class="vp-actions">
                    <AButton
                        kind="p"
                        icon="save"
                        :disabled="!valid"
                        @click="save"
                    >
                        {{
                            isNew
                                ? t('systemContacts.contacts.editor.add')
                                : t('systemContacts.contacts.editor.save')
                        }}
                    </AButton>
                    <AButton @click="cancel">{{ t('ui.cancel') }}</AButton>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.vp {
    display: grid;
    gap: 18px;
}

.vp-title {
    margin: 0;
    font-size: 24px;
}

.vp-notes {
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--a-ink-2);
}

.vp-empty {
    color: var(--a-ink-4);
}

.vp-form {
    gap: 16px;
}

.vp-invalid {
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.vp-actions {
    display: flex;
    gap: 8px;
}
</style>
