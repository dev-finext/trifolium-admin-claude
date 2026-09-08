<script setup>
// מדבקות — the stickers module, second version.
//
// The template editor Natalie asked for, the print run with its count logic,
// the notes pool, and the print log. Physical output is the browser's print
// dialog; the TSC printer driver is not in scope.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import StickerEditorTab from '@/components/stickers/StickerEditorTab.vue';
import StickerLogTab from '@/components/stickers/StickerLogTab.vue';
import StickerNotesTab from '@/components/stickers/StickerNotesTab.vue';
import StickerPrintTab from '@/components/stickers/StickerPrintTab.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { useStickersStore } from '@/stores/stickers';

const { t } = useI18n();
const dataset = useDatasetStore();
const stickers = useStickersStore();

const view = useUrlState({ tab: 'templates' });

const tabs = computed(() => [
    { id: 'templates', label: t('stickers.tab.templates'), icon: 'edit' },
    { id: 'print', label: t('stickers.tab.print'), icon: 'printer' },
    {
        id: 'notes',
        label: t('stickers.tab.notes'),
        icon: 'list',
        n: stickers.notes.length || undefined,
    },
    {
        id: 'log',
        label: t('stickers.tab.log'),
        icon: 'clock',
        n: stickers.prints.length || undefined,
    },
]);
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.stickers')]"
        :title="t('stickers.title')"
        :sub="
            t('stickers.sub', {
                templates: stickers.templates.length,
                notes: stickers.notes.length,
                prints: stickers.prints.length,
            })
        "
    >
        <template #badge>
            <V2Badge id="labels" />
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <template v-else>
        <StickerEditorTab v-if="view.tab === 'templates'" />
        <StickerPrintTab v-else-if="view.tab === 'print'" />
        <StickerNotesTab v-else-if="view.tab === 'notes'" />
        <StickerLogTab v-else-if="view.tab === 'log'" />
    </template>
</template>
