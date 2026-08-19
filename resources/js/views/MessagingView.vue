<script setup>
// Messaging & WhatsApp — everything the pharmacy sends out, on four desks:
// the template library, the automatic triggers, the send queue (with the debt
// notices next to it, since that is where one-off sends start), and the log of
// what actually went.
//
// The active tab and the open template editor live in the URL; the compose
// modal and the test-send confirmation are actions, not addresses, so they
// stay in local refs.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import DebtNoticeList from '@/components/messaging/DebtNoticeList.vue';
import MessageLog from '@/components/messaging/MessageLog.vue';
import ScheduleList from '@/components/messaging/ScheduleList.vue';
import SendMessageModal from '@/components/messaging/SendMessageModal.vue';
import TemplateEditor from '@/components/messaging/TemplateEditor.vue';
import TemplateList from '@/components/messaging/TemplateList.vue';
import TriggerList from '@/components/messaging/TriggerList.vue';
import AChip from '@/components/ui/AChip.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { CHANNELS } from '@/config';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useMessagingStore } from '@/stores/messaging';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const messaging = useMessagingStore();

const view = useUrlState({ tab: 'templates', edit: '' });

const composeOpen = ref(false);

/** The template a test send is being confirmed for, or empty. */
const testId = ref('');

const tabs = computed(() => [
    {
        id: 'templates',
        label: t('messaging.tab.templates'),
        icon: 'file_text',
        n: messaging.templates.length,
    },
    {
        id: 'triggers',
        label: t('messaging.tab.triggers'),
        icon: 'refresh',
        n: messaging.activeTriggerCount,
    },
    {
        id: 'scheduled',
        label: t('messaging.tab.scheduled'),
        icon: 'calendar',
        n: messaging.scheduled.length,
    },
    {
        id: 'log',
        label: t('messaging.tab.log'),
        icon: 'list',
        n: messaging.messages.length,
    },
]);

const sub = computed(() =>
    t('messaging.sub', {
        n: num(messaging.messages.length),
        days: num(messaging.logDays),
        failed: num(messaging.failedMessages.length),
    }),
);

/** One health chip per channel, stating what the service board last reported. */
const health = computed(() =>
    CHANNELS.map((channel) => {
        const state = messaging.channelHealth[channel.id];

        return {
            id: channel.id,
            tone: messaging.healthTone(state),
            label: t('messaging.health.chip', {
                channel: t(`channel.${channel.id}`),
                state: t(`messaging.health.${state || 'unknown'}`),
            }),
        };
    }),
);

const editing = computed(() => messaging.templateById[view.edit] || null);

const testTemplate = computed(
    () => messaging.templateById[testId.value] || null,
);

const me = computed(() => dataset.me);

function askTest(id) {
    if (!me.value) {
        push({ title: t('messaging.templates.testNoActor'), bad: true });

        return;
    }

    testId.value = id;
}

/** A test goes to the signed-in admin's own number, through the same log. */
function confirmTest() {
    const template = testTemplate.value;

    testId.value = '';

    if (!template || !me.value) {
        return;
    }

    messaging.sendNow({
        templateId: template.id,
        recipient: {
            name: me.value.name,
            type: 'agent',
            phone: me.value.phone,
        },
        values: messaging.previewValues,
    });
    push({
        title: t('messaging.templates.testSent'),
        body: `${loc(template.name)} · ${me.value.phone}`,
    });
}

function onSaved(id) {
    const template = messaging.templateById[id];

    view.edit = '';
    push({
        title: t('messaging.editor.saved'),
        body: template ? loc(template.name) : '',
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.daily_ops'), t('nav.item.messaging')]"
        :title="t('nav.item.messaging')"
        :sub="sub"
    >
        <template #actions>
            <AChip v-for="chip in health" :key="chip.id" :tone="chip.tone">
                {{ chip.label }}
            </AChip>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <TemplateList
        v-if="view.tab === 'templates'"
        @edit="view.edit = $event"
        @test="askTest"
    />

    <TriggerList
        v-else-if="view.tab === 'triggers'"
        @edit="view.edit = $event"
    />

    <div v-else-if="view.tab === 'scheduled'" class="a-grid">
        <ScheduleList @compose="composeOpen = true" />
        <DebtNoticeList />
    </div>

    <MessageLog v-else-if="view.tab === 'log'" />

    <TemplateEditor
        :template="editing"
        @close="view.edit = ''"
        @saved="onSaved"
    />

    <SendMessageModal :open="composeOpen" @close="composeOpen = false" />

    <ConfirmDialog
        :open="Boolean(testTemplate)"
        :title="t('messaging.templates.testTitle')"
        :body="
            testTemplate
                ? t('messaging.templates.testBody', {
                      name: loc(testTemplate.name),
                      phone: me?.phone || '',
                  })
                : ''
        "
        :effects="
            testTemplate
                ? [
                      t('messaging.templates.testEffectChannel', {
                          channel: t(`channel.${testTemplate.ch}`),
                      }),
                      t('messaging.templates.testEffectValues'),
                      t('messaging.templates.testEffectLog'),
                  ]
                : []
        "
        :confirm-label="t('messaging.templates.testConfirm')"
        @confirm="confirmTest"
        @close="testId = ''"
    />
</template>
