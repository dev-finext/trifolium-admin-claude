<script setup>
// The two managed texts every preparation carries — the patient's default
// instructions and the regulatory warning — edited in one place instead of
// injected by a formatted search into every order, as SAP does today. They
// print on the label and on the prep sheet, so they are edited beside the
// notes pool that prints with them.
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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
const orders = useOrdersStore();

const texts = computed(() => orders.printTexts);

const form = reactive({
    instructions: { he: '', en: '' },
    regulatory: { he: '', en: '' },
});

watch(
    texts,
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
        form.instructions.he !== (texts.value?.instructionsDefault?.he || '') ||
        form.instructions.en !== (texts.value?.instructionsDefault?.en || '') ||
        form.regulatory.he !== (texts.value?.regulatoryText?.he || '') ||
        form.regulatory.en !== (texts.value?.regulatoryText?.en || ''),
);

const valid = computed(
    () => form.instructions.he.trim() && form.regulatory.he.trim(),
);

async function save() {
    await orders.updatePrintTexts({
        instructionsDefault: {
            he: form.instructions.he.trim(),
            en: form.instructions.en.trim() || form.instructions.he.trim(),
        },
        regulatoryText: {
            he: form.regulatory.he.trim(),
            en: form.regulatory.en.trim() || form.regulatory.he.trim(),
        },
    });
    push({ title: t('stickers.texts.saved') });
}
</script>

<template>
    <ACard :title="t('stickers.texts.title')" icon="edit">
        <template #right>
            <V2Badge id="labels" size="sm" />
            <span v-if="texts?.updated" class="t-sub">
                {{
                    t('stickers.texts.updated', {
                        when: texts.updated.stamp,
                        by: loc(texts.updatedBy),
                    })
                }}
            </span>
        </template>

        <p class="a-hint">{{ t('stickers.texts.note') }}</p>

        <ActionGate id="label_texts">
            <div class="a-2col">
                <div>
                    <label class="a-lbl"
                        >{{ t('stickers.texts.instructions') }} ·
                        {{ t('stickers.texts.he') }}</label
                    >
                    <AInput v-model="form.instructions.he" class="a-w100" />
                    <div class="a-hint">
                        {{ t('stickers.texts.instructionsHint') }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('stickers.texts.instructions') }} ·
                        {{ t('stickers.texts.en') }}</label
                    >
                    <AInput v-model="form.instructions.en" ltr class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('stickers.texts.regulatory') }} ·
                        {{ t('stickers.texts.he') }}</label
                    >
                    <ATextarea
                        v-model="form.regulatory.he"
                        :rows="4"
                        class="a-w100"
                    />
                    <div class="a-hint">
                        {{ t('stickers.texts.regulatoryHint') }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('stickers.texts.regulatory') }} ·
                        {{ t('stickers.texts.en') }}</label
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
                    {{ t('stickers.texts.save') }}
                </AButton>
            </div>
        </ActionGate>
    </ACard>
</template>

<style scoped>
.actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
}
</style>
