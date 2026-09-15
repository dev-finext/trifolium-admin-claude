<script setup>
// פריטים — every item the pharmacy buys, makes, stocks or sells, one card each.
// The first of the "item card" screens: the buyer and the pharmacist work here;
// the site works on shelf products, pricing on the ladders, recipes and
// preparation types have pages of their own. One record underneath them all.
//
// The open item lives in the query string; the editor and the two small
// dialogs are actions and stay local.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BomDrawer from '@/components/items/BomDrawer.vue';
import BomEditor from '@/components/items/BomEditor.vue';
import CountModal from '@/components/items/CountModal.vue';
import ItemDrawer from '@/components/items/ItemDrawer.vue';
import ItemEditor from '@/components/items/ItemEditor.vue';
import ItemsTab from '@/components/items/ItemsTab.vue';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const router = useRouter();
const dataset = useDatasetStore();
const store = useItemsStore();

const view = useUrlState({ item: '', bom: '' });

/** Editors and dialogs are actions, not addresses. `{}` opens an empty form. */
const editing = ref(null);
const editingBom = ref(null);
const counting = ref(null);
const removing = ref(null);

const openItem = computed(() => (view.item ? store.rowBySku(view.item) : null));
const openBomRecord = computed(() =>
    view.bom ? store.bomById(view.bom) : null,
);

const itemName = (row) =>
    loc({ he: row.names.he, en: row.names.en || row.names.he });

function onSaved(result) {
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
    editing.value = null;

    if (result.created) {
        view.item = result.sku;
    }
}

/** A recipe opens over the card; the card stays where it was. */
function openBom(id) {
    view.bom = id;
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
    view.bom = result.bom.id;
}

function onBomRemoved(bom) {
    push({
        title: t('items.bom.toast.removed'),
        body: loc(bom.name),
        bad: true,
    });
    view.bom = '';
}

/** "Make more of this": the production page opens its create form on the recipe. */
function produce(row) {
    const bom = store.bomsOfParent(row.sku)[0];

    router.push({
        name: 'production',
        query: bom ? { order: 'new', bom: bom.id } : { order: 'new' },
    });
}

function onCounted(result) {
    counting.value = null;
    push({
        title: t('items.toast.counted'),
        body: t('items.toast.countedBody', {
            qty: num(result.counted),
            delta: num(result.delta),
        }),
    });
}

// ---- delete ---------------------------------------------------------------

const removeBlock = computed(() =>
    removing.value ? store.itemBlock(removing.value.sku) : null,
);

const removeEffects = computed(() => {
    const block = removeBlock.value;

    if (!block) {
        return [
            t('items.card.removeEffectStock'),
            t('items.card.removeEffectLog'),
        ];
    }

    const parts = [];

    if (block.onHand > 0) {
        parts.push(t('items.card.removeDepStock', { qty: num(block.onHand) }));
    }

    if (block.batches) {
        parts.push(t('items.card.removeDepBatches', { n: block.batches }));
    }

    if (block.boms) {
        parts.push(t('items.card.removeDepBoms', { n: block.boms }));
    }

    if (block.onOrder) {
        parts.push(t('items.card.removeDepOrders', { n: block.onOrder }));
    }

    if (block.formulas) {
        parts.push(t('items.card.removeDepFormulas', { n: block.formulas }));
    }

    return parts;
});

async function confirmRemove(reason) {
    const row = removing.value;

    removing.value = null;
    await store.removeItem(row.sku, reason);
    view.item = '';
    push({
        title: t('items.toast.removed'),
        body: t('items.toast.removedBody', { name: itemName(row), reason }),
        bad: true,
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.operations'), t('nav.item.items')]"
        :title="t('items.title')"
        :sub="t('items.sub', { total: store.items.length })"
    >
        <template #actions>
            <AButton kind="p" icon="plus" @click="editing = {}">
                {{ t('items.action.add') }}
            </AButton>
        </template>
    </PageHead>

    <ASkeleton v-if="dataset.isBusy" />
    <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
    <ItemsTab
        v-else
        :selected="view.item"
        @open="view.item = $event"
        @edit="editing = $event"
    />

    <ItemDrawer
        :row="openItem"
        @close="view.item = ''"
        @edit="editing = $event"
        @open-bom="openBom"
        @open-item="view.item = $event"
        @produce="produce"
        @count="counting = $event"
        @remove="removing = $event"
    />

    <BomDrawer
        :bom="openBomRecord"
        @close="view.bom = ''"
        @edit="editingBom = $event"
        @open-item="((view.bom = ''), (view.item = $event))"
        @produce="produce({ sku: $event.parentSku })"
        @removed="onBomRemoved"
    />

    <ItemEditor
        v-if="editing"
        :item="editing"
        @close="editing = null"
        @saved="onSaved"
    />

    <BomEditor
        v-if="editingBom"
        :bom="editingBom"
        @close="editingBom = null"
        @saved="onBomSaved"
    />

    <CountModal
        v-if="counting"
        :row="counting"
        @close="counting = null"
        @counted="onCounted"
    />

    <ConfirmDialog
        :open="Boolean(removing)"
        :title="t('items.card.removeTitle')"
        :body="
            removing
                ? removeBlock
                    ? t('items.card.removeBlocked', {
                          name: itemName(removing),
                      })
                    : t('items.card.removeBody', { name: itemName(removing) })
                : ''
        "
        :effects="removeEffects"
        :confirm-label="t('items.card.removeConfirm')"
        danger
        reason
        @close="removing = null"
        @confirm="removeBlock ? (removing = null) : confirmRemove($event)"
    />
</template>
