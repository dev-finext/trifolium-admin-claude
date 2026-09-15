<script setup>
// The two directions of a bill of materials: what this item is the parent of,
// and which other items are built out of it. The second is the question a
// recall asks, which is why it is on the ingredient card too.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined item row, or null while the card is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['open-bom', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

const parentOf = computed(() =>
    props.row ? store.bomsOfParent(props.row.sku) : [],
);

const usedIn = computed(() =>
    props.row ? store.bomsUsing(props.row.sku) : [],
);

function parentName(bom) {
    const parent = store.itemBySku(bom.parentSku);

    return parent
        ? loc({ he: parent.names.he, en: parent.names.en || parent.names.he })
        : bom.parentSku;
}
</script>

<template>
    <ACard :title="t('items.card.boms')" icon="layers">
        <div class="a-lbl">{{ t('items.card.parentOf') }}</div>
        <ul v-if="parentOf.length" class="bom-list">
            <li v-for="bom in parentOf" :key="bom.id">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click="emit('open-bom', bom.id)"
                >
                    {{ loc(bom.name) }}
                </button>
                <span class="t-sub">{{
                    t('items.bom.n', { n: bom.components.length })
                }}</span>
            </li>
        </ul>
        <div v-else class="t-sub">{{ t('items.card.noBoms') }}</div>

        <div class="a-lbl bom-l">
            {{ t('items.card.usedIn') }}
        </div>
        <ul v-if="usedIn.length" class="bom-list">
            <li v-for="bom in usedIn" :key="bom.id">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click="emit('open-bom', bom.id)"
                >
                    {{ parentName(bom) }}
                </button>
                <span class="t-sub">
                    {{
                        t('items.card.usedQty', {
                            qty: num(
                                bom.components.find((c) => c.sku === row.sku)
                                    ?.qty || 0,
                            ),
                            uom: uomLabel(
                                bom.components.find((c) => c.sku === row.sku)
                                    ?.uom,
                            ),
                        })
                    }}
                </span>
            </li>
        </ul>
        <div v-else class="t-sub">{{ t('items.card.noBoms') }}</div>
    </ACard>
</template>

<style scoped>
.bom-l {
    margin-top: 14px;
}

.bom-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
}

.bom-list li {
    display: flex;
    gap: 8px;
    align-items: baseline;
}

/* `.t-sub` is only styled globally inside a table; the card's own sub-lines
   carry the same copy the other panels do. */
.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
