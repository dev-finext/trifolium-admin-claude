<script setup>
// The item card. Everything the pharmacy knows about one item, on one panel —
// what SAP shows on one screen and the first version spread over three.
//
// The stock block is where the card drills down: "committed" opens to the orders
// holding the quantity, "on order" to the purchase orders bringing it in, and
// every batch still open is listed with its expiry.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
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
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined row from the items store, or null while the drawer is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit', 'open-bom', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const inventory = useInventoryStore();
const catalog = useCatalogStore();

/** Which of the three stock lists is expanded. */
const stockPanel = ref('committed');

const name = computed(() =>
    props.row
        ? loc({
              he: props.row.names.he,
              en: props.row.names.en || props.row.names.he,
          })
        : '',
);

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

const committed = computed(() =>
    props.row ? store.committedOf(props.row.sku) : [],
);
const onOrder = computed(() =>
    props.row ? store.onOrderOf(props.row.sku) : [],
);
const onOrderQty = computed(() =>
    onOrder.value.reduce((sum, line) => sum + (line.qtySales ?? line.qty), 0),
);
const batches = computed(() =>
    props.row ? inventory.openBatchesOf(props.row.sku) : [],
);
const parentOf = computed(() =>
    props.row ? store.bomsOfParent(props.row.sku) : [],
);
const usedIn = computed(() =>
    props.row ? store.bomsUsing(props.row.sku) : [],
);

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

const committedCols = computed(() => [
    { k: 'order', label: t('items.card.colOrder'), nowrap: true },
    { k: 'item', label: t('items.card.colItem') },
    { k: 'practitioner', label: t('items.card.colPractitioner') },
    { k: 'qty', label: t('items.card.colQty'), nowrap: true },
]);

const onOrderCols = computed(() => [
    { k: 'po', label: t('items.card.colPo'), nowrap: true },
    { k: 'supplier', label: t('items.card.colSupplier') },
    { k: 'qty', label: t('items.card.colQty'), nowrap: true },
    { k: 'eta', label: t('items.card.colEta'), nowrap: true },
]);

const batchCols = computed(() => [
    { k: 'id', label: t('items.card.colBatch'), nowrap: true },
    { k: 'remaining', label: t('items.card.colRemaining'), nowrap: true },
    { k: 'expiry', label: t('items.card.colExpiry'), nowrap: true },
]);

function parentName(bom) {
    const parent = store.itemBySku(bom.parentSku);

    return parent
        ? loc({ he: parent.names.he, en: parent.names.en || parent.names.he })
        : bom.parentSku;
}
</script>

<template>
    <ADrawer :open="Boolean(row)" full @close="emit('close')">
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

                <ACard :title="t('items.card.stock')" icon="grid" class="span2">
                    <template v-if="row.tracked">
                        <div class="stock-tiles">
                            <div class="tile">
                                <div class="tile-l">
                                    {{ t('items.card.onHand') }}
                                </div>
                                <div class="tile-v num">
                                    {{ num(row.onHand) }}
                                </div>
                            </div>
                            <button
                                type="button"
                                class="tile is-btn"
                                :class="{ 'is-on': stockPanel === 'committed' }"
                                @click="stockPanel = 'committed'"
                            >
                                <div class="tile-l">
                                    {{ t('items.card.committed') }}
                                </div>
                                <div class="tile-v num">
                                    {{ num(row.alloc) }}
                                </div>
                                <div class="tile-s">
                                    {{
                                        t('items.card.drill', {
                                            n: committed.length,
                                        })
                                    }}
                                </div>
                            </button>
                            <button
                                type="button"
                                class="tile is-btn"
                                :class="{ 'is-on': stockPanel === 'onOrder' }"
                                @click="stockPanel = 'onOrder'"
                            >
                                <div class="tile-l">
                                    {{ t('items.card.onOrder') }}
                                </div>
                                <div class="tile-v num">
                                    {{ num(onOrderQty) }}
                                </div>
                                <div class="tile-s">
                                    {{
                                        t('items.card.drill', {
                                            n: onOrder.length,
                                        })
                                    }}
                                </div>
                            </button>
                            <div class="tile">
                                <div class="tile-l">
                                    {{ t('items.card.avail') }}
                                </div>
                                <div
                                    class="tile-v num"
                                    :class="{ 'is-low': row.low }"
                                >
                                    {{ num(row.avail) }}
                                </div>
                                <div class="tile-s">
                                    {{
                                        t('items.card.minText', {
                                            n: num(row.min ?? 0),
                                        })
                                    }}
                                </div>
                            </div>
                            <button
                                type="button"
                                class="tile is-btn"
                                :class="{ 'is-on': stockPanel === 'batches' }"
                                @click="stockPanel = 'batches'"
                            >
                                <div class="tile-l">
                                    {{ t('items.card.batches') }}
                                </div>
                                <div class="tile-v num">
                                    {{ batches.length }}
                                </div>
                                <div class="tile-s">
                                    {{ uomLabel(row.uom?.sales) }}
                                </div>
                            </button>
                        </div>

                        <ADataTable
                            v-if="stockPanel === 'committed'"
                            :cols="committedCols"
                            :rows="committed"
                            row-key="id"
                            :max-height="260"
                        >
                            <template #empty>
                                <p class="t-sub inset">
                                    {{ t('items.card.noCommitted') }}
                                </p>
                            </template>
                            <template #cell-order="{ row: line }">
                                <RouterLink
                                    class="a-linkbtn"
                                    :to="{
                                        name: 'order',
                                        params: { id: line.order },
                                    }"
                                >
                                    <ANum>{{ line.order }}</ANum>
                                </RouterLink>
                            </template>
                            <template #cell-item="{ row: line }">
                                <div>{{ loc(line.itemName) }}</div>
                                <div v-if="line.stage" class="t-sub">
                                    {{ t(`itemStage.${line.stage}`) }}
                                </div>
                            </template>
                            <template #cell-practitioner="{ row: line }">{{
                                loc(line.practitioner)
                            }}</template>
                            <template #cell-qty="{ row: line }">
                                <ANum>{{ num(line.qty) }}</ANum>
                                {{ uomLabel(line.unit) }}
                            </template>
                        </ADataTable>

                        <ADataTable
                            v-else-if="stockPanel === 'onOrder'"
                            :cols="onOrderCols"
                            :rows="onOrder"
                            row-key="id"
                            :max-height="260"
                        >
                            <template #empty>
                                <p class="t-sub inset">
                                    {{ t('items.card.noOnOrder') }}
                                </p>
                            </template>
                            <template #cell-po="{ row: line }"
                                ><ANum>{{ line.po }}</ANum></template
                            >
                            <template #cell-supplier="{ row: line }">{{
                                loc(line.supplier)
                            }}</template>
                            <template #cell-qty="{ row: line }">
                                <ANum>{{ num(line.qty) }}</ANum>
                                {{ uomLabel(line.uom) }}
                            </template>
                            <template #cell-eta="{ row: line }">
                                <ANum>{{
                                    line.eta ? fmtISO(line.eta) : '—'
                                }}</ANum>
                            </template>
                        </ADataTable>

                        <ADataTable
                            v-else
                            :cols="batchCols"
                            :rows="batches"
                            row-key="id"
                            :max-height="260"
                        >
                            <template #empty>
                                <p class="t-sub inset">
                                    {{ t('items.card.noBatches') }}
                                </p>
                            </template>
                            <template #cell-id="{ row: batch }"
                                ><ANum>{{ batch.id }}</ANum></template
                            >
                            <template #cell-remaining="{ row: batch }">
                                <ANum>{{ num(batch.remaining) }}</ANum>
                                {{ t(`inventory.unit.${batch.unit}`) }}
                            </template>
                            <template #cell-expiry="{ row: batch }">
                                <ANum>{{ fmtISO(batch.expiry) }}</ANum>
                                <AChip
                                    v-if="batch.state !== 'active'"
                                    size="sm"
                                    tone="amber"
                                >
                                    {{ t(`batchState.${batch.state}`) }}
                                </AChip>
                            </template>
                        </ADataTable>
                    </template>
                    <p v-else class="t-sub">{{ t('items.card.notTracked') }}</p>
                </ACard>

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

                    <div class="a-lbl safety-l">
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
                                            bom.components.find(
                                                (c) => c.sku === row.sku,
                                            )?.qty || 0,
                                        ),
                                        uom: uomLabel(
                                            bom.components.find(
                                                (c) => c.sku === row.sku,
                                            )?.uom,
                                        ),
                                    })
                                }}
                            </span>
                        </li>
                    </ul>
                    <div v-else class="t-sub">{{ t('items.card.noBoms') }}</div>
                </ACard>

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
