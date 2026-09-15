<script setup>
// One shelf product as the site manager reads it: what the consumer site
// shows (name, categories, promo, marketing text, sync), what it costs and
// what it sells for, who supplies it or what it is made of, and how much is
// on the shelf — committed and on its way. The record underneath is the same
// item card the buyer reads on the Items page.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemBomPanel from '@/components/items/ItemBomPanel.vue';
import ItemStockPanel from '@/components/items/ItemStockPanel.vue';
import LadderCalculator from '@/components/pricing/LadderCalculator.vue';
import ProductThumb from '@/components/products/ProductThumb.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num, priceParts } from '@/lib/money';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The product record, or null while the drawer is closed. */
    product: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit', 'open-bom']);

const { t } = useI18n();
const { loc } = useLocalized();
const items = useItemsStore();

/** The item card behind the product — the site fields, supplier, stock. */
const item = computed(() =>
    props.product ? items.rowBySku(props.product.sku) : null,
);

const categories = computed(() =>
    (item.value?.site?.categories || []).map((id) => {
        const cat = items.categoryById(id);

        return cat
            ? `${t(`items.siteGroup.${cat.group}`)} · ${loc(cat.name)}`
            : id;
    }),
);

const gross = computed(() =>
    props.product ? priceParts(props.product.net).display : 0,
);

const purchaseText = computed(() => {
    const price = item.value?.price;

    if (price?.lastPurchase === null || price?.lastPurchase === undefined) {
        return t('items.card.notSet');
    }

    return `${CURRENCY_SYMBOL[price.currency] || ''}${num(price.lastPurchase, 2)}`;
});

const yesNo = (value) => (value ? t('items.card.yes') : t('items.card.no'));
</script>

<template>
    <ADrawer :open="Boolean(product)" @close="emit('close')">
        <template v-if="product">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div class="pd-head">
                        <ProductThumb :img="product.img" />
                        <div>
                            <div class="a-dhead-t">
                                <h2 class="a-dhead-h">
                                    {{ loc(product.name) }}
                                </h2>
                                <span class="a-code a-tag">{{
                                    product.sku
                                }}</span>
                                <AChip
                                    :tone="
                                        product.status === 'archived'
                                            ? 'gray'
                                            : 'green'
                                    "
                                    size="sm"
                                >
                                    {{ t(`products.status.${product.status}`) }}
                                </AChip>
                                <AChip
                                    :tone="item?.site?.sync ? 'teal' : 'gray'"
                                    size="sm"
                                >
                                    {{
                                        item?.site?.sync
                                            ? t('items.card.syncOn')
                                            : t('items.card.syncOff')
                                    }}
                                </AChip>
                            </div>
                            <div class="a-dhead-m">
                                <span v-if="product.content">{{
                                    loc(product.content)
                                }}</span>
                                <span v-if="item?.flags?.internal">{{
                                    t('items.flag.internal')
                                }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            v-if="product.status !== 'archived'"
                            kind="p"
                            sm
                            icon="edit"
                            @click="emit('edit', product)"
                        >
                            {{ t('products.table.edit') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div class="card-grid">
                <ACard :title="t('products.drawer.site')" icon="external">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.siteName'),
                                item?.names?.site || loc(product.name),
                            ],
                            [t('items.card.categories'), ''],
                            [t('items.card.promo'), yesNo(item?.site?.promo)],
                            [
                                t('products.drawer.therapistDiscount'),
                                yesNo(item?.flags?.therapistDiscount),
                            ],
                            [
                                t('items.card.marketing'),
                                item?.site?.marketing
                                    ? loc(item.site.marketing)
                                    : t('items.card.notSet'),
                            ],
                        ]"
                    >
                        <template #value-1>
                            <span v-if="categories.length" class="chips">
                                <AChip
                                    v-for="cat in categories"
                                    :key="cat"
                                    size="sm"
                                    :dot="false"
                                >
                                    {{ cat }}
                                </AChip>
                            </span>
                            <span v-else class="t-sub">{{
                                t('items.card.noCategories')
                            }}</span>
                        </template>
                    </AKeyValue>
                </ACard>

                <ACard :title="t('products.drawer.pricing')" icon="coin">
                    <AKeyValue
                        :rows="[
                            [t('products.table.net'), ils(product.net)],
                            [t('products.table.gross'), ils(gross, 0)],
                            [t('items.card.lastPurchase'), purchaseText],
                            [
                                t('items.card.lastPurchaseOn'),
                                item?.price?.lastPurchaseOn
                                    ? fmtISO(item.price.lastPurchaseOn)
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.preferredSupplier'),
                                item?.preferred
                                    ? loc(item.preferred.name)
                                    : t('products.drawer.madeHere'),
                            ],
                        ]"
                    />
                    <div class="a-lbl calc-l">{{ t('items.card.ladder') }}</div>
                    <LadderCalculator v-if="item" :item="item" compact />
                </ACard>

                <ItemStockPanel v-if="item" :row="item" class="span2" />
                <ItemBomPanel
                    v-if="item"
                    :row="item"
                    @open-bom="(id) => emit('open-bom', id)"
                />
                <AttachmentsPanel
                    entity="item"
                    :ref-id="product.sku"
                    :title="t('items.card.files')"
                />
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 22px;
}

.pd-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
}

.span2 {
    grid-column: 1 / -1;
}

@media (max-width: 980px) {
    .card-grid {
        grid-template-columns: 1fr;
    }
}

.chips {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}

.calc-l {
    margin-top: 14px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
