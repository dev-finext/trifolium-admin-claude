<script setup>
// The template editor.
//
// A template's name and body are bilingual RECORD fields, and this editor works
// on one language at a time: the one the console is currently being read in. The
// other language is shown beside it, read-only and labelled, so it is obvious
// that editing the Hebrew body does not touch the English one a customer in
// English would receive. Saving hands back a whole `{ he, en }` pair with the
// untouched language exactly as it was found.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TemplatePreview from '@/components/messaging/TemplatePreview.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CHANNELS, TEMPLATE_VARS } from '@/config';
import { hm, now } from '@/lib/dates';
import { num } from '@/lib/money';
import { useMessagingStore } from '@/stores/messaging';

// Wide enough to hold the body field and the preview side by side.
const WIDTH = 880;

const props = defineProps({
    /** The template being edited, or null while the modal is closed. */
    template: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const messaging = useMessagingStore();

const name = ref('');
const body = ref('');
const channel = ref('');
const bodyField = ref(null);

/** The language this editor writes, and the one it only displays. */
const editing = computed(() => locale.value);
const other = computed(() => (locale.value === 'he' ? 'en' : 'he'));

const langName = (code) =>
    code === 'he' ? t('locale.hebrew') : t('locale.english');

/** Reset the fields to the record every time a different template opens. */
watch(
    () => props.template,
    (template) => {
        if (!template) {
            return;
        }

        name.value = template.name?.[editing.value] ?? '';
        body.value = template.body?.[editing.value] ?? '';
        channel.value = template.ch;
    },
    { immediate: true },
);

// Switching the console's language mid-edit switches which version is being
// edited, so the fields must be re-read or the reader would type Hebrew into the
// English record.
watch(editing, () => {
    if (props.template) {
        name.value = props.template.name?.[editing.value] ?? '';
        body.value = props.template.body?.[editing.value] ?? '';
    }
});

const otherBody = computed(
    () => props.template?.body?.[other.value]?.trim() || '',
);

const dirty = computed(() => {
    if (!props.template) {
        return false;
    }

    return (
        name.value !== (props.template.name?.[editing.value] ?? '') ||
        body.value !== (props.template.body?.[editing.value] ?? '') ||
        channel.value !== props.template.ch
    );
});

const canSave = computed(
    () => dirty.value && Boolean(name.value.trim() && body.value.trim()),
);

const channelOptions = computed(() =>
    CHANNELS.map((option) => ({
        value: option.id,
        label: t(`channel.${option.id}`),
    })),
);

const previewMeta = computed(() =>
    t('messaging.editor.previewMeta', {
        channel: t(`channel.${channel.value}`),
        time: hm(now()),
    }),
);

/**
 * Insert a placeholder where the caret is. The token is the one written in the
 * language being edited — a Hebrew body carries the Hebrew tokens.
 */
function insert(id) {
    const token = messaging.tokenFor(id, editing.value);
    // ATextarea's root element is the textarea itself, which is what carries
    // the caret.
    const field = bodyField.value?.$el || null;
    const at = field ? field.selectionStart : null;

    if (at === null || at === undefined) {
        body.value += token;

        return;
    }

    const before = body.value.slice(0, at);
    const after = body.value.slice(field.selectionEnd);

    body.value = `${before}${token}${after}`;
    field.focus();
    field.setSelectionRange(at + token.length, at + token.length);
}

function save() {
    if (!canSave.value || !props.template) {
        return;
    }

    const saved = messaging.saveTemplate(props.template.id, {
        name: { ...props.template.name, [editing.value]: name.value.trim() },
        body: { ...props.template.body, [editing.value]: body.value },
        ch: channel.value,
    });

    if (saved) {
        emit('saved', props.template.id);
    }
}
</script>

<template>
    <AModal
        :open="Boolean(template)"
        :width="WIDTH"
        :title="
            t('messaging.editor.title', {
                name: template ? loc(template.name) : '',
            })
        "
        @close="emit('close')"
    >
        <div v-if="template" class="m-cols">
            <div>
                <AChip tone="blue" size="sm" :dot="false">
                    {{
                        t('messaging.editor.editingIn', {
                            lang: langName(editing),
                        })
                    }}
                </AChip>

                <div class="m-fields">
                    <div>
                        <label class="a-lbl" for="tpl-name">
                            {{ t('messaging.editor.name') }}
                        </label>
                        <AInput id="tpl-name" v-model="name" class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl" for="tpl-ch">
                            {{ t('messaging.editor.channel') }}
                        </label>
                        <ASelect
                            id="tpl-ch"
                            v-model="channel"
                            class="a-w100"
                            :options="channelOptions"
                        />
                    </div>
                </div>

                <label class="a-lbl m-lbl" for="tpl-body">
                    {{ t('messaging.editor.body') }}
                </label>
                <ATextarea
                    id="tpl-body"
                    ref="bodyField"
                    v-model="body"
                    :rows="8"
                />

                <div class="m-vars">
                    <div class="a-sect-t">{{ t('messaging.editor.vars') }}</div>
                    <div class="m-varbtns">
                        <AButton
                            v-for="id in TEMPLATE_VARS"
                            :key="id"
                            sm
                            @click="insert(id)"
                        >
                            <span class="num">{{
                                messaging.tokenFor(id, editing)
                            }}</span>
                        </AButton>
                    </div>
                    <p class="m-hint">{{ t('messaging.editor.varsHint') }}</p>
                </div>
            </div>

            <div>
                <div class="a-sect-t">{{ t('messaging.editor.preview') }}</div>
                <TemplatePreview :body="body" :meta="previewMeta" />
                <p class="m-hint">{{ t('messaging.editor.previewNote') }}</p>

                <div class="a-sect-t m-lbl">
                    {{
                        t('messaging.editor.otherVersion', {
                            lang: langName(other),
                        })
                    }}
                </div>
                <p class="m-other" :class="{ 'is-empty': !otherBody }">
                    {{ otherBody || t('messaging.editor.otherVersionEmpty') }}
                </p>

                <div class="a-note a-note--info m-note">
                    {{ t('messaging.editor.uses', { n: num(template.uses) }) }}
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!canSave" @click="save">
                {{ t('messaging.editor.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.m-cols {
    display: grid;
    gap: 22px;
    grid-template-columns: 1fr 320px;
}

@media (max-width: 900px) {
    .m-cols {
        grid-template-columns: 1fr;
    }
}

.m-fields {
    display: grid;
    gap: 14px;
    grid-template-columns: 2fr 1fr;
    margin-top: 14px;
}

.m-lbl {
    margin-top: 16px;
}

.m-vars {
    margin-top: 12px;
}

.m-varbtns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.m-hint {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--a-ink-4);
}

/* The language that is not being edited: readable, clearly not a field. */
.m-other {
    margin: 0;
    background: var(--a-sunk);
    border-radius: 9px;
    padding: 12px 14px;
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.6;
    color: var(--a-ink-3);
}

.m-other.is-empty {
    font-style: italic;
}

.m-note {
    margin-top: 14px;
}
</style>
