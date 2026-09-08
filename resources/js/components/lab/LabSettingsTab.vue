<script setup>
// The lab's managed texts — the default patient instructions and the regulatory
// warning every label carries — edited in one place instead of injected by a
// formatted search into every order, as SAP does today. Plus the way to the
// preparation types, and an honest note about what phase B still holds.
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ActionGate from '@/components/ui/ActionGate.vue';
import AInput from '@/components/ui/AInput.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useOrdersStore } from '@/stores/orders';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const router = useRouter();
const orders = useOrdersStore();

const settings = computed(() => orders.labSettings);

const form = reactive({
    instructions: { he: '', en: '' },
    regulatory: { he: '', en: '' },
});

watch(
    settings,
    (value) => {
        form.instructions.he = value?.instructionsDefault?.he || '';
        form.instructions.en = value?.instructionsDefault?.en || '';
        form.regulatory.he = value?.regulatoryText?.he || '';
        form.regulatory.en = value?.regulatoryText?.en || '';
    },
    { immediate: true },
);

const dirty = computed(
    () =>
        form.instructions.he !==
            (settings.value?.instructionsDefault?.he || '') ||
        form.instructions.en !==
            (settings.value?.instructionsDefault?.en || '') ||
        form.regulatory.he !== (settings.value?.regulatoryText?.he || '') ||
        form.regulatory.en !== (settings.value?.regulatoryText?.en || ''),
);

const valid = computed(
    () => form.instructions.he.trim() && form.regulatory.he.trim(),
);

async function save() {
    await orders.updateLabSettings({
        instructionsDefault: {
            he: form.instructions.he.trim(),
            en: form.instructions.en.trim() || form.instructions.he.trim(),
        },
        regulatoryText: {
            he: form.regulatory.he.trim(),
            en: form.regulatory.en.trim() || form.regulatory.he.trim(),
        },
    });
    push({ title: t('lab.settings.saved') });
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <ACard :title="t('lab.settings.title')" icon="edit">
            <template #right>
                <V2Badge id="order-fields" size="sm" />
                <span v-if="settings?.updated" class="t-sub">
                    {{
                        t('lab.settings.updated', {
                            when: settings.updated.stamp,
                            by: loc(settings.updatedBy),
                        })
                    }}
                </span>
            </template>

            <p class="a-hint">{{ t('lab.settings.note') }}</p>

            <ActionGate id="lab_texts">
                <div class="a-2col">
                    <div>
                        <label class="a-lbl"
                            >{{ t('lab.settings.instructions') }} ·
                            {{ t('lab.settings.he') }}</label
                        >
                        <AInput v-model="form.instructions.he" class="a-w100" />
                        <div class="a-hint">
                            {{ t('lab.settings.instructionsHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('lab.settings.instructions') }} ·
                            {{ t('lab.settings.en') }}</label
                        >
                        <AInput
                            v-model="form.instructions.en"
                            ltr
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('lab.settings.regulatory') }} ·
                            {{ t('lab.settings.he') }}</label
                        >
                        <ATextarea
                            v-model="form.regulatory.he"
                            :rows="4"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('lab.settings.regulatoryHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('lab.settings.regulatory') }} ·
                            {{ t('lab.settings.en') }}</label
                        >
                        <ATextarea
                            v-model="form.regulatory.en"
                            :rows="4"
                            ltr
                            class="a-w100"
                        />
                    </div>
                </div>

                <div class="actions">
                    <AButton
                        kind="p"
                        icon="save"
                        :disabled="!dirty || !valid"
                        @click="save"
                    >
                        {{ t('lab.settings.save') }}
                    </AButton>
                </div>
            </ActionGate>
        </ACard>

        <div class="a-2col">
            <ACard :title="t('lab.settings.prepTypes')" icon="beaker">
                <p class="a-hint">{{ t('lab.settings.prepTypesNote') }}</p>
                <AButton
                    icon="external"
                    @click="
                        router.push({ name: 'items', query: { tab: 'prep' } })
                    "
                >
                    {{ t('lab.settings.prepTypesOpen') }}
                </AButton>
            </ACard>
            <ACard :title="t('lab.settings.phaseB')" icon="zoom">
                <p class="a-hint">{{ t('lab.settings.phaseBNote') }}</p>
            </ACard>
        </div>
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
}
</style>
