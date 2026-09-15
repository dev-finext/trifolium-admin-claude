<script setup>
// One attached file, opened in place. A PDF renders in the browser's own
// viewer inside an iframe, an image in an <img>; Word and Excel have no viewer
// in a browser, so those get a notice and the download button does the work.
//
// The download is a real anchor with the `download` attribute — the browser
// saves under the file's own name, whether the URL is a sample under public/
// or an object URL for a file picked this session.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AModal from '@/components/ui/AModal.vue';

/** Wide enough for an A4 page at a readable zoom. */
const WIDTH = 900;

const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

const props = defineProps({
    open: { type: Boolean, default: false },
    /** The attachment record; null while the modal is closed. */
    file: { type: Object, default: null },
    /** Resolved URL of the file's bytes; empty when the demo has none behind the record. */
    url: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const { t } = useI18n();

const type = computed(() => String(props.file?.type || '').toLowerCase());

const mode = computed(() => {
    if (!props.url) {
        return 'none';
    }

    if (type.value === 'pdf') {
        return 'pdf';
    }

    return IMAGE_TYPES.includes(type.value) ? 'image' : 'other';
});
</script>

<template>
    <AModal
        :open="open && Boolean(file)"
        :title="file?.name || ''"
        :width="WIDTH"
        @close="emit('close')"
    >
        <iframe
            v-if="mode === 'pdf'"
            class="fv-frame"
            :src="url"
            :title="file.name"
        />

        <div v-else-if="mode === 'image'" class="fv-image">
            <img :src="url" :alt="file.name" />
        </div>

        <div v-else class="fv-notice">
            <AIcon name="file" :size="34" />
            <strong>{{
                mode === 'none'
                    ? t('attachments.viewer.noFile')
                    : t('attachments.viewer.noPreview', {
                          type: type.toUpperCase(),
                      })
            }}</strong>
            <p class="a-hint">
                {{
                    mode === 'none'
                        ? t('attachments.viewer.noFileBody')
                        : t('attachments.viewer.noPreviewBody')
                }}
            </p>
        </div>

        <template #footer>
            <a
                v-if="url"
                class="a-btn"
                :class="mode === 'other' ? 'a-btn--p' : ''"
                :href="url"
                :download="file.name"
            >
                <AIcon name="download" :size="17" />
                {{ t('attachments.viewer.download') }}
            </a>
            <AButton kind="ghost" @click="emit('close')">
                {{ t('attachments.viewer.close') }}
            </AButton>
        </template>
    </AModal>
</template>

<style scoped>
.fv-frame {
    display: block;
    width: 100%;
    height: min(72vh, 1000px);
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-sunk);
}

.fv-image {
    display: grid;
    place-items: center;
    min-height: 240px;
    padding: 12px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-sunk);
}

.fv-image img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
}

.fv-notice {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 36px 20px;
    text-align: center;
    color: var(--a-ink-3);
}

.fv-notice strong {
    color: var(--a-ink);
    font-size: 16px;
}

.fv-notice p {
    margin: 0;
    max-width: 44ch;
}
</style>
