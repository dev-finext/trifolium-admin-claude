<script setup>
// עצי מוצר — the bills of materials: what the pharmacy makes and what it is
// made of. One screen of the "item card" group; the open tree lives in the
// query string so a colleague can be sent straight to it.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BomDrawer from '@/components/items/BomDrawer.vue';
import BomEditor from '@/components/items/BomEditor.vue';
import BomsTab from '@/components/items/BomsTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const router = useRouter();
const dataset = useDatasetStore();
const store = useItemsStore();

const view = useUrlState({ bom: '' });

/** The editor is an action, not an address. `{}` opens an empty form. */
const editing = ref(null);

const openBom = computed(() => (view.bom ? store.bomById(view.bom) : null));

const internalCount = computed(
    () => store.boms.filter((bom) => (bom.yield?.qty || 1) > 1).length,
);

function openItem(sku) {
    router.push({ name: 'items', query: { item: sku } });
}

function produce(bom) {
    router.push({ name: 'production', query: { order: 'new', bom: bom.id } });
}

function onSaved(result) {
    push(
        result.created
            ? {
                  title: t('items.bom.toast.created'),
                  body: loc(result.bom.name),
              }
            : {
                  title: t('items.bom.toast.updated'),
                  body: loc(result.bom.name),
              },
    );
    editing.value = null;
    view.bom = result.bom.id;
}

function onRemoved(bom) {
    push({
        title: t('items.bom.toast.removed'),
        body: loc(bom.name),
        bad: true,
    });
    view.bom = '';
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.item_card'), t('nav.item.boms')]"
        :title="t('boms.title')"
        :sub="
            t('boms.sub', { total: store.boms.length, internal: internalCount })
        "
    >
        <template #actions>
            <AButton kind="p" icon="plus" @click="editing = {}">
                {{ t('items.action.addBom') }}
            </AButton>
        </template>
    </PageHead>

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <BomsTab
        v-else
        :selected="view.bom"
        @open="view.bom = $event"
        @open-item="openItem"
    />

    <BomDrawer
        :bom="openBom"
        @close="view.bom = ''"
        @edit="editing = $event"
        @open-item="openItem"
        @produce="produce"
        @removed="onRemoved"
    />

    <BomEditor
        v-if="editing"
        :bom="editing"
        @close="editing = null"
        @saved="onSaved"
    />
</template>
