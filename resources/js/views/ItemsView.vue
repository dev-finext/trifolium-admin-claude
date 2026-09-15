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

const view = useUrlState({ item: '' });

/** Editors and dialogs are actions, not addresses. `{}` opens an empty form. */
const editing = ref(null);
const counting = ref(null);
const removing = ref(null);

const missingCount = computed(
    () => store.rows.filter((row) => row.missing.length).length,
);

const openItem = computed(() => (view.item ? store.rowBySku(view.item) : null));

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

function openBom(id) {
    router.push({ name: 'boms', query: { bom: id } });
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
        :crumbs="[t('nav.group.item_card'), t('nav.item.items')]"
        :title="t('items.title')"
        :sub="
            t('items.sub', { total: store.items.length, missing: missingCount })
        "
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

    <ItemEditor
        v-if="editing"
        :item="editing"
        @close="editing = null"
        @saved="onSaved"
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
