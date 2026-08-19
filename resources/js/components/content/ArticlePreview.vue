<script setup>
// The article as a practitioner reads it: byline, category, summary, then the
// body blocks in order.
//
// It renders the draft that is on screen, not the saved row, so an editor can
// check the wording before publishing.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AModal from '@/components/ui/AModal.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';

const props = defineProps({
    open: { type: Boolean, default: false },
    /**
     * `{ title, excerpt, cat, author, readMin, tradition, blocks }` — text
     * already resolved to the active locale, blocks as `{ kind, text }`.
     */
    draft: { type: Object, default: () => ({ blocks: [] }) },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();

const heading = computed(
    () => props.draft.title || t('content.preview.untitled'),
);

const byline = computed(() =>
    t('content.preview.byline', {
        author: loc(props.draft.author) || t('labels.none'),
        n: num(props.draft.readMin || 0),
    }),
);
</script>

<template>
    <AModal
        :open="open"
        :title="t('content.preview.title')"
        :width="720"
        @close="emit('close')"
    >
        <article class="ap">
            <div class="ap-meta">
                <AChip v-if="draft.cat" tone="gray" size="sm" :dot="false">
                    {{ t(`content.cat.${draft.cat}`) }}
                </AChip>
                <AChip
                    :tone="draft.tradition === 'chinese' ? 'purple' : 'teal'"
                    size="sm"
                    :dot="false"
                >
                    {{ t(`content.system.${draft.tradition}`) }}
                </AChip>
            </div>

            <h2 class="ap-title">{{ heading }}</h2>
            <div class="ap-byline">{{ byline }}</div>

            <p v-if="draft.excerpt" class="ap-excerpt">{{ draft.excerpt }}</p>

            <template v-for="(block, i) in draft.blocks" :key="i">
                <h3 v-if="block.kind === 'h'" class="ap-h">
                    {{ block.text }}
                </h3>
                <p v-else class="ap-p">{{ block.text }}</p>
            </template>
        </article>

        <template #footer>
            <AButton @click="emit('close')">{{ t('ui.close') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.ap-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.ap-title {
    margin: 12px 0 0;
    font-size: 25px;
    line-height: 1.3;
}

.ap-byline {
    margin-top: 6px;
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.ap-excerpt {
    margin: 16px 0 0;
    color: var(--a-ink-2);
    font-size: 16px;
    line-height: 1.7;
    font-weight: 600;
}

.ap-h {
    margin: 22px 0 0;
    font-size: 18px;
}

.ap-p {
    margin: 10px 0 0;
    color: var(--a-ink-2);
    line-height: 1.8;
    font-size: 15.5px;
    white-space: pre-wrap;
}
</style>
