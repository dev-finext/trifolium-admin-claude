<script setup>
// One uploaded document, as the reviewer sees it.
//
// Without `reviewable` this is a read-only viewer — the archive copy of a
// document that was already approved — so there are no buttons that look
// actionable and do nothing.
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ScanPlaceholder from '@/components/users/ScanPlaceholder.vue';
import { useToast } from '@/composables/useToast';

/** How tall an A4 scan renders inside the review column. */
const SCAN_HEIGHT = 250;

const props = defineProps({
    title: { type: String, required: true },
    /** `''` not yet checked · `'ok'` valid · `'bad'` rejected. */
    state: { type: String, default: '' },
    /** Off for the archive copy: viewing only, no verdict to give. */
    reviewable: { type: Boolean, default: false },
});

const emit = defineEmits(['review']);

const { t } = useI18n();
const { push } = useToast();
</script>

<template>
    <ACard :title="props.title" icon="file_text">
        <template #right>
            <AButton
                sm
                icon="zoom"
                @click="
                    push({ title: t('users.doc.zoomed'), body: props.title })
                "
            >
                {{ t('users.doc.zoom') }}
            </AButton>
            <AButton
                sm
                icon="download"
                @click="
                    push({
                        title: t('users.doc.downloaded'),
                        body: props.title,
                    })
                "
            >
                {{ t('actions.download') }}
            </AButton>
        </template>

        <ScanPlaceholder
            :height="SCAN_HEIGHT"
            :label="t('users.doc.scan', { title: props.title })"
        />

        <div v-if="reviewable" class="u-verdict">
            <AButton
                sm
                :kind="state === 'ok' ? 'p' : ''"
                icon="check"
                @click="emit('review', 'ok')"
            >
                {{ t('users.doc.ok') }}
            </AButton>
            <AButton
                sm
                :kind="state === 'bad' ? 'danger' : ''"
                icon="x"
                @click="emit('review', 'bad')"
            >
                {{ t('users.doc.bad') }}
            </AButton>
            <AChip v-if="state === 'ok'" tone="green" size="sm">
                {{ t('users.doc.okChip') }}
            </AChip>
            <AChip v-if="state === 'bad'" tone="red" size="sm">
                {{ t('users.doc.badChip') }}
            </AChip>
        </div>
        <div v-else class="u-verdict">
            <AChip tone="green" size="sm">{{ t('users.doc.archived') }}</AChip>
        </div>
    </ACard>
</template>

<style scoped>
.u-verdict {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
}
</style>
