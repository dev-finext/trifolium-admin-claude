<script setup>
// סוגי הכנה — the managed preparation types: what a label says, how long a
// batch keeps, what the type contains, whether grinding waste may go into it.
// One screen of the "item card" group.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PrepTypeEditor from '@/components/items/PrepTypeEditor.vue';
import PrepTypesTab from '@/components/items/PrepTypesTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import { useToast } from '@/composables/useToast';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { push } = useToast();
const dataset = useDatasetStore();
const store = useItemsStore();

/** The editor is an action, not an address. `{}` opens an empty form. */
const editing = ref(null);

function onSaved(result) {
    push(
        result.created
            ? { title: t('items.prep.toast.created'), body: result.name }
            : { title: t('items.prep.toast.updated'), body: result.name },
    );
    editing.value = null;
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.item_card'), t('nav.item.prepTypes')]"
        :title="t('prepTypes.title')"
        :sub="t('prepTypes.sub', { total: store.prepTypes.length })"
    >
        <template #actions>
            <AButton kind="p" icon="plus" @click="editing = {}">
                {{ t('items.action.addPrep') }}
            </AButton>
        </template>
    </PageHead>

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <PrepTypesTab v-else @edit="editing = $event" />

    <PrepTypeEditor
        v-if="editing"
        :type="editing"
        @close="editing = null"
        @saved="onSaved"
    />
</template>
