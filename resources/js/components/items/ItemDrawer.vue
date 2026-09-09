<script setup>
// The item card. Everything the pharmacy knows about one item, on one panel —
// what SAP shows on one screen and the first version spread over three.
//
// The stock block is where the card drills down: "committed" opens to the orders
// holding the quantity, "on order" to the purchase orders bringing it in, and
// every batch still open is listed with its expiry.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemBomPanel from '@/components/items/ItemBomPanel.vue';
import ItemStockPanel from '@/components/items/ItemStockPanel.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import {
    CURRENCY_SYMBOL,
    ITEM_FLAG_IDS,
    SAFETY_CONTEXT_IDS,
    SAFETY_LEVEL,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num, priceParts } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined row from the items store, or null while the drawer is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit', 'open-bom', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const catalog = useCatalogStore();

const name = computed(() =>
    props.row
        ? loc({
              he: props.row.names.he,
              en: props.row.names.en || props.row.names.he,
          })
        : '',
);

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

const priceGroup = computed(() => {
    const priceSku = props.row?.stock?.priceSku;

    return priceSku ? catalog.resolveSku(priceSku)?.group || null : null;
});

const salePrice = computed(() => {
    const sale = props.row?.price?.sale;

    return sale === null || sale === undefined ? null : priceParts(sale);
});

function purchaseText(row) {
    if (
        row.price?.lastPurchase === null ||
        row.price?.lastPurchase === undefined
    ) {
        return t('items.card.notSet');
    }

    return `${CURRENCY_SYMBOL[row.price.currency] || ''}${num(row.price.lastPurchase, 2)} / ${uomLabel(row.uom?.purchase)}`;
}

const prepNames = computed(() =>
    (props.row?.prepTypes || []).map((id) => {
        const type = store.prepTypeById(id);

        return { id, name: type ? loc(type.name) : id };
    }),
);

const categories = computed(() =>
    (props.row?.site?.categories || []).map((id) => {
        const cat = store.categoryById(id);

        return cat
            ? `${t(`items.siteGroup.${cat.group}`)} · ${loc(cat.name)}`
            : id;
    }),
);

const fieldLabel = (id) => t(`items.mandatory.${id}`);
</script>

<template>
    <ADrawer :open="Boolean(row)" @close="emit('close')">
        <template v-if="row">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">{{ name }}</h2>
                            <span class="a-code a-tag">{{ row.code }}</span>
                            <AChip :dot="false">{{
                                t(`items.family.${row.family}`)
                            }}</AChip>
                            <AChip
                                v-if="row.missing.length"
                                tone="amber"
                                size="sm"
                            >
                                {{
                                    t('items.card.missing', {
                                        n: row.missing.length,
                                    })
                                }}
                            </AChip>
                            <AChip v-else tone="green" size="sm" :dot="false">
                                {{ t('items.card.complete') }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span class="ltr">{{ row.sku }}</span>
                            <span v-if="row.names.lat" class="ltr">{{
                                row.names.lat
                            }}</span>
                            <span v-if="row.names.cn">{{ row.names.cn }}</span>
                            <span v-if="row.location">
                                {{ t('items.card.locationText', row.location) }}
                            </span>
                        </div>
                        <div
                            v-if="row.missing.length"
                            class="a-note a-note--warn card-note"
                        >
                            {{
                                t('items.card.missingList', {
                                    fields: row.missing
                                        .map(fieldLabel)
                                        .join(' · '),
                                })
                            }}
                        </div>
                        <div
                            v-if="row.waivedMissing.length"
                            class="a-note a-note--info card-note"
                        >
                            {{
                                t('items.card.waivedNote', {
                                    fields: row.waivedMissing
                                        .map(fieldLabel)
                                        .join(' · '),
                                })
                            }}
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            kind="p"
                            sm
                            icon="edit"
                            @click="emit('edit', row)"
                        >
                            {{ t('items.action.edit') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div class="card-grid">
                <ACard :title="t('items.card.identity')" icon="tag">
                    <AKeyValue
                        :rows="[
                            [t('items.card.nameHe'), row.names.he],
                            [
                                t('items.card.nameEn'),
                                row.names.en || t('items.card.notSet'),
                            ],
                            [
                                t('items.card.lat'),
                                row.names.lat || t('items.card.notSet'),
                            ],
                            [
                                t('items.card.cn'),
                                row.names.cn || t('items.card.notSet'),
                            ],
                            [
                                t('items.card.siteName'),
                                row.names.site || t('items.card.notSet'),
                            ],
                            [
                                t('items.card.sourceLabel'),
                                t(`items.card.source.${row.source}`),
                            ],
                            [
                                t('items.card.location'),
                                row.location
                                    ? t('items.card.locationText', row.location)
                                    : t('items.card.notSet'),
                            ],
                        ]"
                    />
                </ACard>

                <ACard :title="t('items.card.units')" icon="layers">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.purchaseUom'),
                                uomLabel(row.uom?.purchase),
                            ],
                            [
                                t('items.card.salesUom'),
                                uomLabel(row.uom?.sales),
                            ],
                            [
                                t('items.card.factor'),
                                t('items.card.factorText', {
                                    purchase: uomLabel(row.uom?.purchase),
                                    factor: num(row.uom?.factor || 1),
                                    sales: uomLabel(row.uom?.sales),
                                }),
                            ],
                            [t('items.card.flags'), ''],
                            [
                                t('items.card.consumable'),
                                row.flags?.consumable
                                    ? t('items.card.consumableYes')
                                    : t('items.card.no'),
                            ],
                        ]"
                    >
                        <template #value-3>
                            <span class="chips">
                                <AChip
                                    v-for="id in ITEM_FLAG_IDS"
                                    :key="id"
                                    size="sm"
                                    :tone="row.flags?.[id] ? 'green' : 'gray'"
                                    :dot="false"
                                >
                                    {{ t(`items.flag.${id}`) }}
                                </AChip>
                            </span>
                        </template>
                    </AKeyValue>
                </ACard>

                <ACard :title="t('items.card.pricing')" icon="coin">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.salePrice'),
                                salePrice
                                    ? ils(salePrice.net)
                                    : t('items.card.byTiers'),
                            ],
                            salePrice && [
                                t('items.card.salePriceInc'),
                                ils(salePrice.display, 0),
                            ],
                            [t('items.card.lastPurchase'), purchaseText(row)],
                            [
                                t('items.card.lastPurchaseOn'),
                                row.price?.lastPurchaseOn
                                    ? fmtISO(row.price.lastPurchaseOn)
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.preferredSupplier'),
                                row.preferred
                                    ? loc(row.preferred.name)
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.lastSupplier'),
                                row.last
                                    ? loc(row.last.name)
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.priceGroup'),
                                priceGroup
                                    ? loc(priceGroup.name)
                                    : t('items.card.noPriceGroup'),
                            ],
                        ]"
                    />
                </ACard>

                <ACard :title="t('items.card.prep')" icon="beaker">
                    <div class="a-lbl">{{ t('items.card.prepTypes') }}</div>
                    <div v-if="prepNames.length" class="chips">
                        <AChip
                            v-for="type in prepNames"
                            :key="type.id"
                            size="sm"
                            tone="teal"
                            :dot="false"
                        >
                            {{ type.name }}
                        </AChip>
                    </div>
                    <div v-else class="t-sub">
                        {{ t('items.card.noPrepTypes') }}
                    </div>

                    <div class="a-lbl safety-l">
                        {{ t('items.card.safety') }}
                    </div>
                    <div class="safety">
                        <div
                            v-for="ctx in SAFETY_CONTEXT_IDS"
                            :key="ctx"
                            class="safety-row"
                        >
                            <span>{{ t(`items.safetyContext.${ctx}`) }}</span>
                            <AChip
                                v-if="row.safety?.[ctx]"
                                size="sm"
                                :tone="SAFETY_LEVEL[row.safety[ctx]]?.tone"
                            >
                                {{ t(`items.safetyLevel.${row.safety[ctx]}`) }}
                            </AChip>
                            <span v-else class="t-sub">{{
                                t('items.card.notSet')
                            }}</span>
                        </div>
                    </div>
                </ACard>

                <ACard :title="t('items.card.notes')" icon="edit">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.internal'),
                                row.notes?.internal
                                    ? loc(row.notes.internal)
                                    : t('items.card.noNote'),
                            ],
                            [
                                t('items.card.production'),
                                row.notes?.production
                                    ? loc(row.notes.production)
                                    : t('items.card.noNote'),
                            ],
                        ]"
                    />
                </ACard>

                <ACard :title="t('items.card.site')" icon="external">
                    <AKeyValue
                        :rows="[
                            [t('items.card.sync'), ''],
                            [t('items.card.categories'), ''],
                            [
                                t('items.card.promo'),
                                row.site?.promo
                                    ? t('items.card.yes')
                                    : t('items.card.no'),
                            ],
                            [
                                t('items.card.siteQty'),
                                row.site?.qty
                                    ? `${num(row.site.qty)} ${uomLabel(row.site.unit)}`
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.marketing'),
                                row.site?.marketing
                                    ? loc(row.site.marketing)
                                    : t('items.card.notSet'),
                            ],
                        ]"
                    >
                        <template #value-0>
                            <AChip
                                :tone="row.site?.sync ? 'teal' : 'gray'"
                                size="sm"
                            >
                                {{
                                    row.site?.sync
                                        ? t('items.card.syncOn')
                                        : t('items.card.syncOff')
                                }}
                            </AChip>
                        </template>
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

                <ItemStockPanel :row="row" class="span2" />

                <ItemBomPanel
                    :row="row"
                    @open-bom="(id) => emit('open-bom', id)"
                    @open-item="(sku) => emit('open-item', sku)"
                />

                <AttachmentsPanel
                    entity="item"
                    :ref-id="row.sku"
                    :title="t('items.card.files')"
                />
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.card-note {
    margin-top: 10px;
    font-size: 13.5px;
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

.safety-l {
    margin-top: 14px;
}

.safety {
    display: grid;
    gap: 6px;
}

.safety-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 14px;
}

.stock-tiles {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

.tile {
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    background: var(--a-surface);
    text-align: start;
    font: inherit;
    color: inherit;
}

.tile.is-btn {
    cursor: pointer;
}

.tile.is-btn:hover {
    border-color: var(--a-ink-4);
}

.tile.is-on {
    border-color: var(--a-accent);
    background: var(--a-tint);
}

.tile-l {
    font-size: 12px;
    color: var(--a-ink-3);
}

.tile-v {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
}

.tile-v.is-low {
    color: var(--a-red);
}

.tile-s {
    font-size: 12px;
    color: var(--a-ink-4);
}

.inset {
    padding: 12px 14px;
    margin: 0;
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
</style>
