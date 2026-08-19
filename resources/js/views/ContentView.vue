<script setup>
// Content — the article library the practitioner app and the site read from, and
// the what's-new feed that runs beside it.
//
// The open editor is part of the URL (`?article=a3`, or `?article=new`), so a
// half-written article can be handed to a colleague as a link.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleEditor from '@/components/content/ArticleEditor.vue';
import ArticlePreview from '@/components/content/ArticlePreview.vue';
import ArticleTable from '@/components/content/ArticleTable.vue';
import EventFeed from '@/components/content/EventFeed.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { useContentStore } from '@/stores/content';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const content = useContentStore();

const view = useUrlState({ tab: 'articles', article: '', preview: '' });

const tabs = computed(() => [
    {
        id: 'articles',
        label: t('content.tab.articles'),
        icon: 'file_text',
        n: content.articles.length,
    },
    {
        id: 'events',
        label: t('content.tab.events'),
        icon: 'calendar',
        n: content.events.length,
    },
]);

const editingRow = computed(() =>
    view.article && view.article !== 'new'
        ? content.articles.find((article) => article.id === view.article) ||
          null
        : null,
);

const editorOpen = computed(
    () => view.article === 'new' || Boolean(editingRow.value),
);

/** The row the read-only preview is open on, when it was opened from the table. */
const previewRow = computed(
    () =>
        content.articles.find((article) => article.id === view.preview) || null,
);

/** A saved row in the shape ArticlePreview reads: text resolved, blocks flat. */
const previewDraft = computed(() => {
    const row = previewRow.value;

    if (!row) {
        return { blocks: [] };
    }

    return {
        title: loc(row.title),
        excerpt: loc(row.excerpt),
        cat: row.cat,
        author: row.author,
        readMin: row.readMin,
        tradition: row.system || 'west',
        blocks: (row.blocks || []).map((block) => ({
            kind: block.kind,
            text: loc(block.text),
        })),
    };
});

function openNew() {
    view.preview = '';
    view.article = 'new';
}

function openEditor(row) {
    view.preview = '';
    view.article = row.id;
}

function openPreview(row) {
    view.preview = row.id;
}

function onSave(article) {
    const isNew = !article.id;
    const saved = content.saveArticle(article);

    view.article = '';
    push({
        title: isNew ? t('content.toast.saved') : t('content.toast.updated'),
        body: t('content.toast.savedBody', {
            title: loc(saved.title),
            state: saved.published
                ? t('content.state.published')
                : t('content.state.draft'),
        }),
    });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.knowledge'), t('nav.item.content')]"
            :title="t('content.title')"
            :sub="t('content.sub')"
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="openNew">
                    {{ t('content.newArticle') }}
                </AButton>
            </template>
        </PageHead>

        <ATabs v-model="view.tab" :tabs="tabs" />

        <ArticleTable
            v-if="view.tab === 'articles'"
            :articles="content.articles"
            :categories="content.articleCategories"
            :authors="content.articleAuthors"
            :selected="view.article"
            @edit="openEditor"
            @preview="openPreview"
        />

        <EventFeed
            v-else
            :events="content.events"
            :kinds="content.eventKinds"
        />

        <ArticleEditor
            v-if="editorOpen"
            :key="view.article"
            :article="editingRow"
            :categories="content.articleCategories"
            :authors="content.articleAuthors"
            :today="fmtISO(isoDaysAgo(0))"
            @close="view.article = ''"
            @save="onSave"
        />

        <ArticlePreview
            :open="Boolean(previewRow)"
            :draft="previewDraft"
            @close="view.preview = ''"
        />
    </div>
</template>
