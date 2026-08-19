<script setup>
// The correspondence tab: every message that went out on this order, newest to
// oldest, each with its own delivery state.
//
// A message carries the state the provider actually reported — sent, delivered,
// read — with a timestamp per step, and channels that give no read receipt say
// so rather than showing a blank. A message that failed to send offers a resend,
// which records a fresh send on the order through the store.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const toast = useToast();
const orders = useOrdersStore();

const messages = computed(() => orders.messagesFor(props.order.id));

function templateName(message) {
    const template = orders.templateById(message.tpl);

    return template ? loc(template.name) : message.tpl;
}

async function resend(message) {
    await orders.recordMessage(props.order.id, {
        templateId: message.tpl,
        channel: t(`channel.${message.ch}`),
    });

    toast.push({
        title: t('orders.messaging.resendDone'),
        body: t('orders.messaging.sendDoneBody', {
            template: templateName(message),
            name: loc(message.to),
        }),
    });
}
</script>

<template>
    <div class="a-grid">
        <ACard
            :title="t('orders.messaging.thread')"
            icon="whatsapp"
            :pad="false"
        >
            <template #right>
                <span class="od-msgnote">
                    {{ t('orders.messaging.threadNote') }}
                </span>
            </template>

            <AEmpty
                v-if="!messages.length"
                icon="whatsapp"
                :title="t('orders.messaging.empty')"
                :sub="t('orders.messaging.emptySub')"
            />

            <div v-else class="a-msgs">
                <div
                    v-for="message in messages"
                    :key="message.id"
                    class="a-msg"
                    :class="{ 'is-manual': message.manual }"
                >
                    <div class="a-msg-h">
                        <span class="t-strong">{{
                            templateName(message)
                        }}</span>
                        <AChip tone="gray" size="sm" :dot="false">
                            {{ t(`channel.${message.ch}`) }}
                        </AChip>
                        <AChip
                            :tone="message.manual ? 'teal' : 'gray'"
                            size="sm"
                            :dot="false"
                        >
                            {{
                                message.manual
                                    ? t('orders.messaging.manualBy', {
                                          actor: loc(message.actor),
                                      })
                                    : t('orders.messaging.automatic')
                            }}
                        </AChip>
                        <span class="a-push">
                            {{ loc(message.to) }} ·
                            <ANum>{{ message.phone }}</ANum>
                        </span>
                        <span>
                            <ANum>{{
                                message.when?.stamp || message.sentAt
                            }}</ANum>
                        </span>
                    </div>

                    <div class="a-msg-b">{{ loc(message.body) }}</div>

                    <div
                        v-if="message.state === 'failed'"
                        class="a-msg-s is-fail"
                    >
                        <span>
                            <AIcon name="alert" :size="15" />
                            <b>{{ t('orders.messaging.stateFailed') }}</b> ·
                            <ANum>{{ message.sentAt }}</ANum>
                        </span>
                        <span v-if="message.err" class="ltr">
                            {{ message.err }}
                        </span>
                        <AButton
                            sm
                            icon="refresh"
                            class="a-push"
                            @click="resend(message)"
                        >
                            {{ t('orders.messaging.resend') }}
                        </AButton>
                    </div>

                    <div v-else class="a-msg-s">
                        <span>
                            <AIcon name="check" :size="14" />
                            <b>{{ t('orders.messaging.stateSent') }}</b>
                            <ANum>{{ message.sentAt }}</ANum>
                        </span>
                        <span :class="{ 'is-wait': !message.delAt }">
                            <AIcon name="check" :size="14" />
                            <b>{{ t('orders.messaging.stateDelivered') }}</b>
                            <ANum v-if="message.delAt">{{
                                message.delAt
                            }}</ANum>
                            <template v-else>
                                {{ t('orders.value.none') }}
                            </template>
                        </span>
                        <span
                            v-if="message.readSupport"
                            :class="{ 'is-wait': !message.readAt }"
                        >
                            <AIcon name="eye" :size="14" />
                            <b>{{ t('orders.messaging.stateRead') }}</b>
                            <ANum v-if="message.readAt">
                                {{ message.readAt }}
                            </ANum>
                            <template v-else>
                                {{ t('orders.value.none') }}
                            </template>
                        </span>
                        <span v-else class="a-msg-nr">
                            {{
                                t('orders.messaging.noReadReceipt', {
                                    channel: t(`channel.${message.ch}`),
                                })
                            }}
                        </span>
                    </div>
                </div>
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.od-msgnote {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
