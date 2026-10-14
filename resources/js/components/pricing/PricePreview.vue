<script setup>
// The live answer to "which items would this group price?".
//
// It re-renders as prefixes are typed, against the same resolution the store
// uses everywhere else, so what the agent sees here is exactly what the saved
// group will price.
//
// A prefix as broad as `10` captures hundreds of herbs, which is a list nobody
// reads by scrolling. The search box narrows it by code or name — it narrows
// only what is shown, never what the group covers, and the count line says both
// numbers so the two can never be confused.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';

const props = defineProps({
    /** The SKUs the prefixes currently capture. */
    matched: { type: Array, default: () => [] },
    /** How many SKUs the whole ingredient catalogue holds. */
    total: { type: Number, default: 0 },
    hasPrefixes: { type: Boolean, default: false },
});

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const uid = useId();

const term = ref('');

const needle = computed(() => term.value.trim().toLowerCase());

const shown = computed(() =>
    needle.value
        ? props.matched.filter((item) =>
              searchHaystack(item.sku, item.name).includes(needle.value),
          )
        : props.matched,
);
</script>

<template>
    <div>
        <label class="a-lbl" :for="`${uid}-q`">
            {{ t('pricing.editor.preview.label') }}
        </label>
        <div class="tp-preview">
            <div class="tp-preview-h">
                <AIcon name="search" :size="15" />
                <span>
                    {{
                        needle
                            ? t('pricing.editor.preview.headFound', {
                                  n: shown.length,
                                  matched: matched.length,
                              })
                            : t('pricing.editor.preview.head', {
                                  n: matched.length,
                                  total,
                              })
                    }}
                </span>
            </div>
            <div v-if="matched.length" class="tp-preview-q">
                <input
                    :id="`${uid}-q`"
                    v-model="term"
                    type="search"
                    class="a-input a-w100"
                    :placeholder="t('pricing.editor.preview.search')"
                />
            </div>
            <div class="tp-preview-l">
                <div v-if="!hasPrefixes" class="tp-preview-none">
                    {{ t('pricing.editor.preview.noPrefix') }}
                </div>
                <div v-else-if="!matched.length" class="tp-preview-none">
                    {{ t('pricing.editor.preview.noMatch') }}
                </div>
                <div v-else-if="!shown.length" class="tp-preview-none">
                    {{ t('pricing.editor.preview.noSearchMatch') }}
                </div>
                <template v-else>
                    <div
                        v-for="item in shown"
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
.tp-preview-q {
    padding: 8px 10px;
    border-bottom: 1px solid var(--a-line-3);
}

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
