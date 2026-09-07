<script setup>
// פריטים — the unified item card, the managed preparation types and the bills
// of materials. Second-version material, built alongside the three first-version
// catalogue screens (ingredients, shelf products, price lists) so the two can be
// compared before one replaces the other.
//
// The active tab, the open item and the open tree live in the query string; the
// editors are actions and stay local.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BomDrawer from '@/components/items/BomDrawer.vue';
import BomEditor from '@/components/items/BomEditor.vue';
import BomsTab from '@/components/items/BomsTab.vue';
import ItemDrawer from '@/components/items/ItemDrawer.vue';
import ItemEditor from '@/components/items/ItemEditor.vue';
import ItemsTab from '@/components/items/ItemsTab.vue';
import PrepTypeEditor from '@/components/items/PrepTypeEditor.vue';
import PrepTypesTab from '@/components/items/PrepTypesTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const store = useItemsStore();

const view = useUrlState({ tab: 'items', item: '', bom: '' });

/** Editors are actions, not addresses. `{}` opens an empty form. */
const editingItem = ref(null);
const editingPrep = ref(null);
const editingBom = ref(null);

const missingCount = computed(
    () => store.rows.filter((row) => row.missing.length).length,
);

const tabs = computed(() => [
    {
        id: 'items',
        label: t('items.tab.items'),
        icon: 'tag',
        n: store.items.length,
    },
    {
        id: 'prep',
        label: t('items.tab.prep'),
        icon: 'beaker',
        n: store.prepTypes.length,
    },
    {
        id: 'boms',
        label: t('items.tab.boms'),
        icon: 'layers',
        n: store.boms.length,
    },
]);

const openItem = computed(() => (view.item ? store.rowBySku(view.item) : null));
const openBom = computed(() => (view.bom ? store.bomById(view.bom) : null));

/** One drawer at a time. */
function showItem(sku) {
    view.bom = '';
    view.item = sku;
}

function showBom(id) {
    view.item = '';
    view.bom = id;
}

function onItemSaved(result) {
    push(
        result.created
            ? {
                  title: t('items.toast.created'),
                  body: t('items.toast.createdBody', result),
              }
            : {
                  title: t('items.toast.updated'),
                  body: t('items.toast.updatedBody', result),
              },
    );
    editingItem.value = null;

    if (result.created) {
        showItem(result.sku);
    }
}

function onPrepSaved(result) {
    push(
        result.created
            ? { title: t('items.prep.toast.created'), body: result.name }
            : { title: t('items.prep.toast.updated'), body: result.name },
    );
    editingPrep.value = null;
}

function onBomSaved(result) {
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
    editingBom.value = null;
    showBom(result.bom.id);
}

function onBomRemoved(bom) {
    push({
        title: t('items.bom.toast.removed'),
        body: loc(bom.name),
        bad: true,
    });
    view.bom = '';
}

function primaryAction() {
    if (view.tab === 'prep') {
        editingPrep.value = {};
    } else if (view.tab === 'boms') {
        editingBom.value = {};
    } else {
        editingItem.value = {};
    }
}

const primaryLabel = computed(() => {
    if (view.tab === 'prep') {
        return t('items.action.addPrep');
    }

    if (view.tab === 'boms') {
        return t('items.action.addBom');
    }

    return t('items.action.add');
});
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.items')]"
        :title="t('items.title')"
        :sub="
            t('items.sub', { total: store.items.length, missing: missingCount })
        "
    >
        <template #badge>
            <V2Badge id="item-card" />
        </template>
        <template #actions>
            <AButton kind="p" icon="plus" @click="primaryAction">
                {{ primaryLabel }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <template v-else>
        <ItemsTab
            v-if="view.tab === 'items'"
            :selected="view.item"
            @open="showItem"
            @edit="editingItem = $event"
        />
        <PrepTypesTab
            v-else-if="view.tab === 'prep'"
            @edit="editingPrep = $event"
        />
        <BomsTab
            v-else-if="view.tab === 'boms'"
            :selected="view.bom"
            @open="showBom"
            @open-item="showItem"
        />
    </template>

    <ItemDrawer
        :row="openItem"
        @close="view.item = ''"
        @edit="editingItem = $event"
        @open-bom="showBom"
        @open-item="showItem"
    />
    <BomDrawer
        :bom="openBom"
        @close="view.bom = ''"
        @edit="editingBom = $event"
        @open-item="showItem"
        @removed="onBomRemoved"
    />

    <ItemEditor
        v-if="editingItem"
        :item="editingItem"
        @close="editingItem = null"
        @saved="onItemSaved"
    />
    <PrepTypeEditor
        v-if="editingPrep"
        :type="editingPrep"
        @close="editingPrep = null"
        @saved="onPrepSaved"
    />
    <BomEditor
        v-if="editingBom"
        :bom="editingBom"
        @close="editingBom = null"
        @saved="onBomSaved"
    />
</template>
