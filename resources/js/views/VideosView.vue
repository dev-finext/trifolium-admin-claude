<script setup>
// System videos — the tutorial slots the practitioner site renders. The site
// defines each slot's id; this screen records what plays in it.
//
// The open editor is part of the URL (`?video=v3`, or `?video=new`), so a
// half-filled slot can be handed to a colleague as a link.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import VideoEditor from '@/components/content/VideoEditor.vue';
import VideoTable from '@/components/content/VideoTable.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useContentStore } from '@/stores/content';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const content = useContentStore();

const view = useUrlState({ video: '' });

const editingRow = computed(() =>
    view.video && view.video !== 'new'
        ? content.videos.find((video) => video.id === view.video) || null
        : null,
);

const editorOpen = computed(
    () => view.video === 'new' || Boolean(editingRow.value),
);

function onSave(video) {
    const isNew = !video.id;
    const saved = content.saveVideo(video);

    view.video = '';
    push({
        title: isNew ? t('videos.toast.added') : t('videos.toast.updated'),
        body: t('videos.toast.body', {
            title: loc(saved.title),
            slug: saved.slug,
        }),
    });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.knowledge'), t('nav.item.videos')]"
            :title="t('videos.title')"
            :sub="t('videos.sub')"
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="view.video = 'new'">
                    {{ t('videos.newVideo') }}
                </AButton>
            </template>
        </PageHead>

        <VideoTable
            :videos="content.videos"
            :selected="view.video"
            @edit="view.video = $event.id"
        />

        <VideoEditor
            v-if="editorOpen"
            :key="view.video"
            :video="editingRow"
            @close="view.video = ''"
            @save="onSave"
        />
    </div>
</template>
