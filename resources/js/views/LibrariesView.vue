<script setup>
// Formula libraries — the three libraries the compounding wizard loads: the
// pharmacy's own house formulas, the classical Chinese prescriptions, and the
// bases a free pour starts from.
//
// The three panels here are read-only: these libraries are maintained in the
// system database and the wizard loads them verbatim, so this page's job is to let
// a content editor find a formula and see exactly what a practitioner will be
// offered. Writing one is the formula editor's job — its own wizard on its own
// screen, which this page links to rather than contains.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ClassicFormulaPanel from '@/components/content/ClassicFormulaPanel.vue';
import FormulaPreview from '@/components/content/FormulaPreview.vue';
import FreePourPanel from '@/components/content/FreePourPanel.vue';
import HouseFormulaPanel from '@/components/content/HouseFormulaPanel.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useContentStore } from '@/stores/content';

const { t } = useI18n();
const content = useContentStore();
const { push } = useToast();

const view = useUrlState({ tab: 'system' });

const tabs = computed(() => [
    {
        id: 'system',
        label: t('libraries.tab.system'),
        icon: 'beaker',
        n: content.houseFormulas.length,
    },
    {
        id: 'preset',
        label: t('libraries.tab.preset'),
        icon: 'book',
        n: content.classicFormulas.length,
    },
    {
        id: 'free',
        label: t('libraries.tab.free'),
        icon: 'package',
        n: content.shelfItems.length,
    },
]);

/** The row the preview is open on — `{ kind, row }`, or null. */
const preview = ref(null);

function newFormula() {
    push({
        title: t('libraries.newFormula.title'),
        body: t('libraries.newFormula.body'),
    });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.knowledge'), t('nav.item.libraries')]"
            :title="t('libraries.title')"
            :sub="t('libraries.sub')"
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="newFormula">
                    {{ t('libraries.newFormula.label') }}
                </AButton>
            </template>
        </PageHead>

        <div class="a-note a-note--info">{{ t('libraries.readOnly') }}</div>

        <ATabs v-model="view.tab" :tabs="tabs" />

        <HouseFormulaPanel
            v-if="view.tab === 'system'"
            :formulas="content.houseFormulas"
            @preview="preview = { kind: 'house', row: $event }"
        />

        <ClassicFormulaPanel
            v-else-if="view.tab === 'preset'"
            :formulas="content.classicFormulas"
            :sources="content.classicSources"
            @preview="preview = { kind: 'classic', row: $event }"
        />

        <FreePourPanel
            v-else
            :bases="content.shelfItems"
            @preview="preview = { kind: 'base', row: $event }"
        />

        <FormulaPreview
            :open="Boolean(preview)"
            :kind="preview?.kind || ''"
            :row="preview?.row || null"
            @close="preview = null"
        />
    </div>
</template>
