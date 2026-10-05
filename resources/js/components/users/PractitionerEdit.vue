<script setup>
// The card editor, shared by the practitioner card and the patient card.
//
// Three things are deliberately never editable here — the customer number (it is
// the identity a practitioner signs in with and it sits on every historical
// order and tax document), the points balance (derived from the points ledger),
// and open debt (managed on the Finance screen) — so they are simply not in the
// field list. Changing anything else needs the admin password: the changed
// fields, the actor and the time are written to the system log.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { isDemoData } from '@/data/source';
import { applyDraft, recordMoved, snapshot, stampOf } from '@/lib/draft';
import { isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/** Wide enough for the two-column field grid without the card scrolling. */
const WIDTH = 820;

const props = defineProps({
    open: { type: Boolean, default: false },
    /** Already-translated modal title. */
    title: { type: String, default: '' },
    /** Already-translated note explaining what cannot be changed. */
    note: { type: String, default: '' },
    /** Field descriptors from personFields.js. */
    fields: { type: Array, default: () => [] },
    /** The record being edited. */
    entity: { type: Object, default: null },
    /** The practitioner card also keeps documents; the patient card does not. */
    showDocuments: { type: Boolean, default: false },
    /**
     * V3 — which card this is, so a parked form goes back to the card it came
     * from: `'practitioner'` or `'patient'`. Omitted, and the form cannot be
     * minimised at all.
     */
    kind: { type: String, default: '' },
    /**
     * V3 — typing that was parked in the window tray and is coming back:
     * `{ data, stamp }`. Null on an ordinary open.
     */
    draft: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save', 'upload', 'reset']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();

const values = reactive({});
const password = ref('');
const pwError = ref(false);

/** The stored value of a field, as the text the form edits. */
function display(field) {
    const raw = props.entity ? props.entity[field.k] : null;

    if (field.localized) {
        return loc(raw) || '';
    }

    return raw === null || raw === undefined ? '' : String(raw);
}

function reset() {
    for (const key of Object.keys(values)) {
        delete values[key];
    }

    props.fields.forEach((field) => {
        values[field.k] = display(field);
    });
    password.value = '';
    pwError.value = false;
}

watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        reset();

        // V3 — typing that was parked comes back after the fields have been
        // filled from the record, so the current field list decides what exists
        // and the draft only supplies values for it. A field that has since
        // been removed from the list cannot come back with it.
        if (props.draft?.data) {
            applyDraft(values, props.draft.data);
        }
    },
    // Immediate, because a form coming back from the tray is mounted already
    // open: the card claims its draft during setup and renders the editor with
    // `open` true from the first frame, so there is no false-to-true edge to
    // wait for and the fields would never be filled at all.
    { immediate: true },
);

/**
 * The record moved while the draft sat in the tray.
 *
 * Said and not blocked: the typing is the reader's. Where the record carries no
 * last-changed stamp of its own there is nothing to compare, and nothing is
 * claimed.
 */
const draftStale = computed(
    () => Boolean(props.draft) && recordMoved(props.entity, props.draft.stamp),
);

/** Replace the reader's-language half of a `{ he, en }` value, keep the other. */
function mergeLocalized(original, text) {
    const lang = locale.value;
    const other = lang === 'he' ? 'en' : 'he';
    const base = isLocalized(original) ? { ...original } : { he: '', en: '' };

    base[lang] = text;

    if (!base[other]) {
        base[other] = text;
    }

    return base;
}

const changes = computed(() =>
    props.fields
        .map((field) => {
            const next = String(values[field.k] ?? '').trim();

            if (next === display(field)) {
                return null;
            }

            let to = next;

            if (field.numeric) {
                to = Number(next);
            } else if (field.localized) {
                to = mergeLocalized(props.entity[field.k], next);
            }

            const from = field.localized
                ? loc(props.entity[field.k]) || null
                : (props.entity[field.k] ?? null);

            return { key: field.k, label: field.label, from, to };
        })
        .filter(Boolean),
);

const missing = computed(() =>
    props.fields.filter(
        (field) => field.req && !String(values[field.k] ?? '').trim(),
    ),
);

const canSave = computed(
    () =>
        !missing.value.length &&
        changes.value.length > 0 &&
        Boolean(password.value.trim()),
);

const demoHint = computed(() =>
    isDemoData
        ? t('users.edit.demoHint', {
              password: dataset.session?.adminPassword || '',
          })
        : '',
);

/**
 * V3 — what this form is called when it waits in the tray, and what it keeps.
 *
 * The admin password is not in it, and cannot be: it lives in its own ref
 * beside the field values, so what is parked is the typing and never the
 * credential that authorises it. A restored form asks for the password again,
 * which is the right way round — the approval belongs to the moment of saving.
 */
const win = computed(() =>
    props.kind && props.entity
        ? {
              id: `form:${props.kind}:${props.entity.code}`,
              title: loc(props.entity.name) || String(props.entity.code),
              subtitle: String(props.entity.code || ''),
              icon: 'edit',
              form: () => ({
                  view: props.kind,
                  record: props.entity.code,
                  data: snapshot(values),
                  stamp: stampOf(props.entity),
              }),
          }
        : null,
);

function onInput(field, value) {
    values[field.k] =
        field.digits || field.numeric ? value.replace(/\D/g, '') : value;
}

function optionsOf(field) {
    if (field.allowEmpty) {
        return [{ value: '', label: '—' }, ...field.options];
    }

    return field.options;
}

function save() {
    if (!canSave.value) {
        return;
    }

    if (password.value !== dataset.session?.adminPassword) {
        pwError.value = true;

        return;
    }

    const payload = changes.value.map(({ key, from, to }) => ({
        key,
        from,
        to,
    }));
    const labels = changes.value.map((change) => change.label);

    emit('save', payload, labels);
    emit('close');
}
</script>

<template>
    <AModal
        :open="open"
        :title="title"
        :width="WIDTH"
        :win="win"
        @close="emit('close')"
    >
        <p v-if="draftStale" class="a-warn">
            {{ t('items.editor.draftStale') }}
        </p>

        <div v-if="note" class="a-note a-note--info u-note">{{ note }}</div>

        <div class="u-grid">
            <div
                v-for="field in fields"
                :key="field.k"
                :class="{ 'u-full': field.full }"
            >
                <label class="a-lbl" :for="`pe-${field.k}`">
                    {{ field.label }}
                    <span v-if="field.req" class="u-req">*</span>
                </label>
                <ASelect
                    v-if="field.options"
                    :id="`pe-${field.k}`"
                    :model-value="values[field.k]"
                    class="a-w100"
                    :options="optionsOf(field)"
                    @update:model-value="values[field.k] = $event"
                />
                <AInput
                    v-else
                    :id="`pe-${field.k}`"
                    :model-value="values[field.k]"
                    class="a-w100"
                    :ltr="field.ltr"
                    :inputmode="
                        field.digits || field.numeric ? 'numeric' : undefined
                    "
                    @update:model-value="onInput(field, $event)"
                />
                <div v-if="field.hint" class="u-fhint">{{ field.hint }}</div>
            </div>
        </div>

        <div class="a-sect-t u-sect">{{ t('users.edit.adminSection') }}</div>
        <div class="u-admin">
            <div class="u-pw">
                <label class="a-lbl" for="pe-pw">
                    {{ t('users.edit.password') }}
                    <span class="u-req">*</span>
                </label>
                <AInput
                    id="pe-pw"
                    v-model="password"
                    ltr
                    type="password"
                    class="a-w100"
                    autocomplete="off"
                    @update:model-value="pwError = false"
                    @keydown.enter="save"
                />
                <div v-if="pwError" class="a-inv">
                    {{ t('users.edit.passwordWrong') }}
                </div>
            </div>
            <div class="u-why">
                {{ t('users.edit.passwordWhy') }}
                <div v-if="demoHint" class="u-demo">{{ demoHint }}</div>
            </div>
        </div>

        <template v-if="showDocuments">
            <div class="a-sect-t u-sect">{{ t('users.edit.documents') }}</div>
            <div class="u-docs">
                <AButton
                    sm
                    icon="upload"
                    @click="emit('upload', t('users.doc.cert'))"
                >
                    {{ t('users.edit.uploadCert') }}
                </AButton>
                <AButton
                    sm
                    icon="upload"
                    @click="emit('upload', t('users.doc.clinicImage'))"
                >
                    {{ t('users.edit.uploadClinic') }}
                </AButton>
                <AButton sm icon="lock" @click="emit('reset')">
                    {{ t('users.edit.resetPassword') }}
                </AButton>
                <span class="u-vault">{{ t('users.edit.vaultNote') }}</span>
            </div>
        </template>

        <div class="u-summary">
            <span class="u-changed">
                {{
                    changes.length
                        ? t('users.edit.changed', {
                              n: changes.length,
                              fields: changes
                                  .map((change) => change.label)
                                  .join(' · '),
                          })
                        : t('users.edit.unchanged')
                }}
            </span>
            <span v-if="missing.length" class="u-missing">
                {{
                    t('users.edit.missing', {
                        fields: missing.map((field) => field.label).join(' · '),
                    })
                }}
            </span>
        </div>

        <template #footer>
            <AButton kind="p" icon="check" :disabled="!canSave" @click="save">
                {{ t('users.edit.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.u-note {
    margin-bottom: 18px;
}

.u-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.u-full {
    grid-column: 1 / -1;
}

.u-req {
    color: var(--a-red);
}

.u-fhint {
    margin-top: 5px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.u-sect {
    margin-top: 22px;
}

.u-admin {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    flex-wrap: wrap;
}

.u-pw {
    min-width: 260px;
}

.u-why {
    max-width: 430px;
    padding-top: 26px;
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.u-demo {
    margin-top: 4px;
    color: var(--a-ink-4);
}

.u-docs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
}

.u-vault {
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.u-summary {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-top: 18px;
    font-size: 14px;
}

.u-changed {
    color: var(--a-ink-3);
}

.u-missing {
    color: var(--a-red);
}
</style>
