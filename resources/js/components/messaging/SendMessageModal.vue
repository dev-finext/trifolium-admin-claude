<script setup>
// A one-off send: pick a template, a channel and a practitioner, then send now
// or queue it for a time later today.
//
// The preview substitutes that practitioner's own figures — their balance, their
// customer number, their collection link — so what is shown is what will go out.
// Quiet hours are stated rather than enforced: a send an agent starts by hand
// goes out whatever the hour, and the notice says so.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TemplatePreview from '@/components/messaging/TemplatePreview.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CHANNELS, DEFAULT_QUIET_HOURS } from '@/config';
import { hm, now } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { inQuietHours, useMessagingStore } from '@/stores/messaging';

// Wide enough for the form and the preview side by side.
const WIDTH = 820;

const props = defineProps({
    open: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const messaging = useMessagingStore();

const templateId = ref('');
const channel = ref('');
const recipientCode = ref('');
const mode = ref('now');
const time = ref('');

const templates = computed(() => messaging.templates);
const recipients = computed(() => dataset.practitioners);

const templateOptions = computed(() =>
    templates.value.map((row) => ({ value: row.id, label: loc(row.name) })),
);

const channelOptions = computed(() =>
    CHANNELS.map((row) => ({ value: row.id, label: t(`channel.${row.id}`) })),
);

const recipientOptions = computed(() =>
    recipients.value.map((row) => ({
        value: row.code,
        label: `${loc(row.name)} · ${row.phone}`,
    })),
);

const template = computed(
    () => messaging.templateById[templateId.value] || null,
);

const recipient = computed(
    () =>
        recipients.value.find((row) => row.code === recipientCode.value) ||
        null,
);

const values = computed(() =>
    recipient.value ? messaging.practitionerValues(recipient.value) : {},
);

/** Every opening starts from the current data rather than the last send. */
watch(
    () => props.open,
    (isOpen) => {
        if (!isOpen) {
            return;
        }

        const first = templates.value[0];

        templateId.value = first ? first.id : '';
        channel.value = first ? first.ch : '';
        recipientCode.value = recipients.value[0]?.code || '';
        mode.value = 'now';
        time.value = hm(now());
    },
    { immediate: true },
);

// The channel follows the template unless the agent overrides it afterwards.
watch(template, (next) => {
    if (next) {
        channel.value = next.ch;
    }
});

const sendTime = computed(() =>
    mode.value === 'now' ? hm(now()) : time.value,
);

const quiet = computed(() => inQuietHours(sendTime.value));

const previewMeta = computed(() =>
    channel.value
        ? t('messaging.editor.previewMeta', {
              channel: t(`channel.${channel.value}`),
              time: sendTime.value,
          })
        : '',
);

const canSend = computed(
    () =>
        Boolean(template.value && recipient.value) &&
        (mode.value === 'now' || Boolean(time.value)),
);

function submit() {
    if (!canSend.value) {
        return;
    }

    const name = loc(recipient.value.name);

    if (mode.value === 'later') {
        messaging.scheduleMessage({
            templateId: templateId.value,
            channel: channel.value,
            recipient: { name: recipient.value.name },
            time: time.value,
        });
        push({
            title: t('messaging.send.scheduled'),
            body: t('messaging.send.scheduledBody', {
                template: loc(template.value.name),
                time: time.value,
            }),
        });
        emit('close');

        return;
    }

    messaging.sendNow({
        templateId: templateId.value,
        channel: channel.value,
        recipient: {
            name: recipient.value.name,
            type: 'practitioner',
            phone: recipient.value.phone,
        },
        values: values.value,
    });
    push({
        title: t('messaging.send.sent'),
        body: `${loc(template.value.name)} · ${name}`,
    });
    emit('close');
}
</script>

<template>
    <AModal
        :open="open"
        :width="WIDTH"
        :title="t('messaging.send.title')"
        @close="emit('close')"
    >
        <div class="m-cols">
            <div class="a-grid">
                <div>
                    <label class="a-lbl" for="send-tpl">
                        {{ t('messaging.send.template') }}
                    </label>
                    <ASelect
                        id="send-tpl"
                        v-model="templateId"
                        class="a-w100"
                        :options="templateOptions"
                    />
                    <p v-if="!templates.length" class="m-hint">
                        {{ t('messaging.send.noTemplates') }}
                    </p>
                </div>

                <div>
                    <label class="a-lbl" for="send-ch">
                        {{ t('messaging.send.channel') }}
                    </label>
                    <ASelect
                        id="send-ch"
                        v-model="channel"
                        class="a-w100"
                        :options="channelOptions"
                    />
                </div>

                <div>
                    <label class="a-lbl" for="send-to">
                        {{ t('messaging.send.recipient') }}
                    </label>
                    <ASelect
                        id="send-to"
                        v-model="recipientCode"
                        class="a-w100"
                        :options="recipientOptions"
                    />
                    <p class="m-hint">
                        {{
                            recipients.length
                                ? t('messaging.send.recipientHint')
                                : t('messaging.send.noRecipients')
                        }}
                    </p>
                </div>

                <div>
                    <label class="a-lbl" for="send-when">
                        {{ t('messaging.send.when') }}
                    </label>
                    <div class="m-when">
                        <ASelect id="send-when" v-model="mode">
                            <option value="now">
                                {{ t('messaging.send.nowOption') }}
                            </option>
                            <option value="later">
                                {{ t('messaging.send.laterOption') }}
                            </option>
                        </ASelect>
                        <AInput
                            v-if="mode === 'later'"
                            v-model="time"
                            ltr
                            type="time"
                            :aria-label="t('messaging.send.time')"
                        />
                    </div>
                </div>

                <div v-if="quiet" class="a-note a-note--warn">
                    {{ t('messaging.send.quietWarn', DEFAULT_QUIET_HOURS) }}
                </div>
            </div>

            <div>
                <div class="a-sect-t">{{ t('messaging.editor.preview') }}</div>
                <TemplatePreview
                    v-if="template"
                    :body="template.body"
                    :values="values"
                    :meta="previewMeta"
                />
            </div>
        </div>

        <template #footer>
            <AButton
                kind="p"
                :icon="mode === 'now' ? 'send' : 'calendar'"
                :disabled="!canSend"
                @click="submit"
            >
                {{
                    mode === 'now'
                        ? t('messaging.send.submitNow')
                        : t('messaging.send.submitLater')
                }}
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

@media (max-width: 860px) {
    .m-cols {
        grid-template-columns: 1fr;
    }
}

.m-when {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.m-hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
