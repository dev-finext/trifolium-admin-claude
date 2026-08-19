<script setup>
// One message, read back: who it went to, the body that was actually sent, and
// how far it got.
//
// The delivery block states only what the gateway reported. A channel that has
// no read receipts says so rather than showing an empty "read" row, and a
// message that has not been acknowledged says that too — neither is dressed up
// as a delivery that happened.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ABubble from '@/components/ui/ABubble.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import { useLocalized } from '@/composables/useLocalized';
import { MESSAGE_STATES } from '@/config';
import { useMessagingStore } from '@/stores/messaging';

// Wide enough for the body and the delivery block without an inner scroll.
const WIDTH = 720;

const props = defineProps({
    /** The message being read, or null while the modal is closed. */
    message: { type: Object, default: null },
});

const emit = defineEmits(['close', 'resend']);

const { t } = useI18n();
const { loc } = useLocalized();
const messaging = useMessagingStore();

const templateName = computed(() => {
    const message = props.message;

    if (!message) {
        return '';
    }

    const template = messaging.templateById[message.tpl];

    return template ? loc(template.name) : message.tpl;
});

const rows = computed(() => {
    const message = props.message;

    if (!message) {
        return [];
    }

    return [
        [
            t('messaging.detail.recipient'),
            `${loc(message.to)} · ${t(`logActor.${message.toType}`)}`,
        ],
        message.phone && [t('messaging.detail.phone'), message.phone],
        [t('messaging.detail.channel'), t(`channel.${message.ch}`)],
        [t('messaging.detail.template'), templateName.value],
        [t('messaging.detail.category'), t(`templateCategory.${message.cat}`)],
        message.order && [t('messaging.detail.order'), message.order],
        [
            t('messaging.detail.source'),
            message.manual
                ? message.actor
                    ? t('messaging.log.manualBy', { actor: loc(message.actor) })
                    : t('messaging.log.manual')
                : t('messaging.log.automatic'),
        ],
    ];
});

const tone = computed(
    () => MESSAGE_STATES[props.message?.state]?.tone || 'gray',
);

/** The receipts the gateway actually returned, in the order they arrive. */
const timeline = computed(() => {
    const message = props.message;

    if (!message) {
        return [];
    }

    return [
        message.sentAt && [t('messaging.detail.sentAt'), message.sentAt],
        message.delAt && [t('messaging.detail.deliveredAt'), message.delAt],
        message.readAt && [t('messaging.detail.readAt'), message.readAt],
    ].filter(Boolean);
});
</script>

<template>
    <AModal
        :open="Boolean(message)"
        :width="WIDTH"
        :title="t('messaging.detail.title', { id: message ? message.id : '' })"
        @close="emit('close')"
    >
        <template v-if="message">
            <AKeyValue :rows="rows" />

            <div class="m-block">
                <div class="a-sect-t">{{ t('messaging.detail.state') }}</div>
                <div class="m-state">
                    <AChip :tone="tone" size="sm">
                        {{ t(`msgState.${message.state}`) }}
                    </AChip>
                    <span v-if="message.retried" class="t-sub num">
                        {{
                            t('messaging.log.resentAt', {
                                time: message.retried.at.time,
                            })
                        }}
                    </span>
                </div>
            </div>

            <div class="m-block">
                <div class="a-sect-t">{{ t('messaging.detail.timeline') }}</div>
                <AKeyValue :rows="timeline" />
                <p v-if="!message.delAt && !message.err" class="m-hint">
                    {{ t('messaging.detail.notDelivered') }}
                </p>
                <p v-if="!messaging.hasReadReceipts(message.ch)" class="m-hint">
                    {{ t('messaging.detail.noReadReceipt') }}
                </p>
            </div>

            <div class="m-block">
                <div class="a-sect-t">{{ t('messaging.detail.body') }}</div>
                <ABubble :meta="message.when.stamp">
                    <span class="m-body">{{ loc(message.body) }}</span>
                </ABubble>
            </div>

            <div v-if="message.err" class="m-block">
                <div class="a-sect-t">{{ t('messaging.detail.error') }}</div>
                <div class="a-code">{{ message.err }}</div>
            </div>
        </template>

        <template v-if="message && message.status === 'failed'" #footer>
            <AButton
                kind="p"
                icon="refresh"
                @click="emit('resend', message.id)"
            >
                {{ t('messaging.log.resend') }}
            </AButton>
        </template>
    </AModal>
</template>

<style scoped>
.m-block {
    margin-top: 18px;
}

.m-state {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* The sent body is record content and keeps the line breaks it went out with. */
.m-body {
    white-space: pre-wrap;
}

.m-hint {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
