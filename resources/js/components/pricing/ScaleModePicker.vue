<script setup>
// The two-card choice between the system's fixed quantity scale and a scale the
// group defines for itself.
//
// It only reports the click; the editor decides whether switching needs a
// confirmation (it does whenever prices or custom bands would be thrown away).
import { I18nT, useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';

defineProps({
    /** True while the group owns its bands. */
    custom: { type: Boolean, default: false },
    /** How many bands the fixed scale carries. */
    bandCount: { type: Number, default: 0 },
    /** A short `1–5 · 5–10 … 1000+` taste of the fixed scale. */
    sample: { type: String, default: '' },
});

const emit = defineEmits(['select']);

const { t } = useI18n();
</script>

<template>
    <div>
        <div
            class="tp-mode"
            role="radiogroup"
            :aria-label="t('pricing.editor.mode.aria')"
        >
            <button
                type="button"
                class="tp-modecard"
                :class="{ 'is-on': !custom }"
                role="radio"
                :aria-checked="!custom"
                @click="emit('select', false)"
            >
                <span v-if="!custom" class="tp-mode-check">
                    <AIcon name="check" :size="19" />
                </span>
                <div class="tp-mode-t">
                    {{ t('pricing.editor.mode.defaultTitle') }}
                </div>
                <I18nT
                    keypath="pricing.editor.mode.defaultSub"
                    tag="div"
                    scope="global"
                    class="tp-mode-s"
                >
                    <template #n>
                        <ANum>{{ bandCount }}</ANum>
                    </template>
                    <template #sample>
                        <ANum>{{ sample }}</ANum>
                    </template>
                </I18nT>
            </button>
            <button
                type="button"
                class="tp-modecard"
                :class="{ 'is-on': custom }"
                role="radio"
                :aria-checked="custom"
                @click="emit('select', true)"
            >
                <span v-if="custom" class="tp-mode-check">
                    <AIcon name="check" :size="19" />
                </span>
                <div class="tp-mode-t">
                    {{ t('pricing.editor.mode.customTitle') }}
                </div>
                <div class="tp-mode-s">
                    {{ t('pricing.editor.mode.customSub') }}
                </div>
            </button>
        </div>
        <div v-if="custom" class="a-note a-note--info tp-mode-note">
            {{ t('pricing.editor.mode.customNote') }}
        </div>
    </div>
</template>

<style scoped>
.tp-mode-note {
    margin-top: 14px;
}
</style>
