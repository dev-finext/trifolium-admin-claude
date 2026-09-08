<script setup>
// The activities log on a card — every contact with this practitioner, customer
// or supplier, with a managed type and subject and, where there is one, the
// order it was about.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ACTIVITY_SUBJECT_IDS, ACTIVITY_TYPE_IDS } from '@/config';
import { useCrmStore } from '@/stores/crm';

const props = defineProps({
    /** One of ACTIVITY_ENTITY_IDS. */
    entity: { type: String, required: true },
    refId: { type: String, required: true },
    /** Orders an activity may be filed against — the card's own. */
    orders: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const crm = useCrmStore();

const adding = ref(false);
const form = reactive({
    type: 'call',
    subject: 'general',
    order: '',
    text: '',
});

const rows = computed(() => crm.activitiesOf(props.entity, props.refId));

const typeOptions = computed(() =>
    ACTIVITY_TYPE_IDS.map((id) => ({ value: id, label: t(`crm.type.${id}`) })),
);

const subjectOptions = computed(() =>
    ACTIVITY_SUBJECT_IDS.map((id) => ({
        value: id,
        label: t(`crm.subject.${id}`),
    })),
);

const orderOptions = computed(() => [
    { value: '', label: t('crm.form.noOrder') },
    ...props.orders.map((order) => ({ value: order.id, label: order.id })),
]);

const TYPE_ICON = {
    call: 'phone',
    whatsapp: 'whatsapp',
    email: 'mail',
    meeting: 'users',
    note: 'edit',
};

const SUBJECT_TONE = {
    cancellation: 'red',
    complaint: 'red',
    delivery: 'blue',
    no_answer: 'gray',
    stock: 'teal',
    payment: 'amber',
    order_change: 'purple',
    general: 'gray',
};

async function save() {
    if (!form.text.trim()) {
        return;
    }

    await crm.addActivity({
        entity: props.entity,
        ref: props.refId,
        type: form.type,
        subject: form.subject,
        order: form.order || null,
        text: form.text,
    });

    push({
        title: t('crm.form.saved'),
        body: t(`crm.subject.${form.subject}`),
    });
    form.text = '';
    form.order = '';
    adding.value = false;
}
</script>

<template>
    <ACard :title="t('crm.title')" icon="phone" :pad="false">
        <template #right>
            <V2Badge id="crm" size="sm" />
            <span class="t-sub">{{ t('crm.sub', { n: rows.length }) }}</span>
            <AButton sm kind="p" icon="plus" @click="adding = !adding">
                {{ t('crm.add') }}
            </AButton>
        </template>

        <p class="a-hint intro">{{ t('crm.note') }}</p>

        <div v-if="adding" class="form">
            <div class="a-3col">
                <div>
                    <label class="a-lbl">{{ t('crm.form.type') }}</label>
                    <ASelect
                        v-model="form.type"
                        :options="typeOptions"
                        class="a-w100"
                    />
                </div>
                <div>
                    <label class="a-lbl">{{ t('crm.form.subject') }}</label>
                    <ASelect
                        v-model="form.subject"
                        :options="subjectOptions"
                        class="a-w100"
                    />
                </div>
                <div>
                    <label class="a-lbl">{{ t('crm.form.order') }}</label>
                    <ASelect
                        v-model="form.order"
                        :options="orderOptions"
                        class="a-w100"
                        ltr
                    />
                </div>
            </div>
            <label class="a-lbl top">{{ t('crm.form.text') }}</label>
            <ATextarea
                v-model="form.text"
                :rows="3"
                class="a-w100"
                :placeholder="t('crm.form.textPh')"
            />
            <div class="form-a">
                <AButton
                    kind="p"
                    icon="save"
                    :disabled="!form.text.trim()"
                    @click="save"
                >
                    {{ t('crm.form.save') }}
                </AButton>
                <AButton @click="adding = false">{{
                    t('actions.cancel')
                }}</AButton>
            </div>
        </div>

        <div v-if="rows.length" class="list">
            <article v-for="row in rows" :key="row.id" class="row">
                <div class="row-h">
                    <span class="type">
                        <AIcon
                            :name="TYPE_ICON[row.type] || 'edit'"
                            :size="15"
                        />
                        {{ t(`crm.type.${row.type}`) }}
                    </span>
                    <AChip
                        :tone="SUBJECT_TONE[row.subject] || 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{ t(`crm.subject.${row.subject}`) }}
                    </AChip>
                    <RouterLink
                        v-if="row.order"
                        class="a-linkbtn"
                        :to="{ name: 'order', params: { id: row.order } }"
                    >
                        <ANum>{{ row.order }}</ANum>
                    </RouterLink>
                    <AChip v-if="row.auto" tone="gray" size="sm" :dot="false">{{
                        t('crm.auto')
                    }}</AChip>
                    <span class="a-push t-sub">
                        {{ loc(row.by) }} · <ANum>{{ row.when.stamp }}</ANum>
                    </span>
                </div>
                <div class="row-t">{{ loc(row.text) }}</div>
            </article>
        </div>
        <AEmpty
            v-else
            icon="phone"
            :title="t('crm.empty')"
            :sub="t('crm.emptyHint')"
        />
    </ACard>
</template>

<style scoped>
.intro {
    margin: 0;
    padding: 12px 18px 0;
}

.form {
    padding: 14px 18px 16px;
    border-bottom: 1px solid var(--a-line);
    background: var(--a-tint);
}

.top {
    margin-top: 10px;
}

.form-a {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.list {
    display: flex;
    flex-direction: column;
}

.row {
    padding: 12px 18px;
    border-top: 1px solid var(--a-line);
}

.row-h {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.type {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 13.5px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.row-t {
    margin-top: 6px;
    font-size: 14.5px;
    line-height: 1.6;
}
</style>
