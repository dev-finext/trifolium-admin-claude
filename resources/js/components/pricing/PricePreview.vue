<script setup>
// The live answer to "which items would this group price?".
//
// It re-renders as prefixes are typed, against the same resolution the store
// uses everywhere else, so what the agent sees here is exactly what the saved
// group will price.
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';

defineProps({
    /** The SKUs the prefixes currently capture. */
    matched: { type: Array, default: () => [] },
    /** How many SKUs the whole ingredient catalogue holds. */
    total: { type: Number, default: 0 },
    hasPrefixes: { type: Boolean, default: false },
});

const { t } = useI18n();
const { loc } = useLocalized();
</script>

<template>
    <div>
        <label class="a-lbl">{{ t('pricing.editor.preview.label') }}</label>
        <div class="tp-preview">
            <div class="tp-preview-h">
                <AIcon name="search" :size="15" />
                <span>
                    {{
                        t('pricing.editor.preview.head', {
                            n: matched.length,
                            total,
                        })
                    }}
                </span>
            </div>
            <div class="tp-preview-l">
                <div v-if="!hasPrefixes" class="tp-preview-none">
                    {{ t('pricing.editor.preview.noPrefix') }}
                </div>
                <div v-else-if="!matched.length" class="tp-preview-none">
                    {{ t('pricing.editor.preview.noMatch') }}
                </div>
                <template v-else>
                    <div
                        v-for="item in matched"
                        :key="item.sku"
                        class="tp-preview-r"
                    >
                        <ANum>{{ item.sku }}</ANum>
                        <span class="tp-preview-name">
                            {{ loc(item.name) }}
                        </span>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tp-preview-none {
    padding: 24px 14px;
    color: var(--a-ink-4);
    font-size: 13.5px;
    text-align: center;
}

.tp-preview-name {
    color: var(--a-ink-2);
}
</style>
