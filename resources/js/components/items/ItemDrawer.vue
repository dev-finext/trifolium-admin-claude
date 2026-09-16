<script setup>
// The item card — SAP's item master, laid out the way SAP lays it out.
//
// The cards below are its tabs: general, purchasing, sales, inventory (with the
// warehouse table), planning, production, properties, remarks, and the
// user-defined fields the pharmacy added — the lab percentages, the safety
// limits and the consumer-site block. The price list table is the item's ITM1
// rows; the warehouse table is its OITW rows.
//
// Two blocks are the console's own and say so: the quantity ladder, and the
// batches and recipes underneath. Everything else is the value SAP holds.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemBomPanel from '@/components/items/ItemBomPanel.vue';
import ItemStockPanel from '@/components/items/ItemStockPanel.vue';
import LadderCalculator from '@/components/pricing/LadderCalculator.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ITEM_FLAG_IDS, SAFETY_CONTEXT_IDS, SAFETY_LEVEL } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

const props = defineProps({
    /** The joined row from the items store, or null while the drawer is closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits([
    'close',
    'edit',
    'open-bom',
    'open-item',
    'produce',
    'count',
    'remove',
]);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const production = useProductionStore();

const name = computed(() => props.row?.names?.he || '');

const notSet = () => t('items.card.notSet');
const uomLabel = (id) => (id ? t(`items.uom.${id}`) : notSet());
const orNotSet = (value) =>
    value === null || value === undefined || value === '' ? notSet() : value;
const yesNo = (value) => (value ? t('items.card.yes') : t('items.card.no'));
const qty = (value, unit) =>
    value === null || value === undefined
        ? notSet()
        : `${num(value, 3)} ${uomLabel(unit)}`;

/** The recipe this item is made from, and what the runs of it say. */
const recipe = computed(() =>
    props.row ? store.bomsOfParent(props.row.sku)[0] || null : null,
);
const runs = computed(() =>
    props.row ? production.ordersOf(props.row.sku).slice(0, 4) : [],
);
const canProduce = computed(() =>
    recipe.value ? production.canProduce(recipe.value) : 0,
);
const lastUnitCost = computed(() =>
    props.row ? production.lastUnitCost(props.row.sku) : null,
);

/** The item's rows in `ITM1`, named by their price list. */
const priceRows = computed(() =>
    (props.row?.prices || [])
        .map((row) => {
            const list = store.priceLists.find(
                (entry) => entry.code === row.list,
            );

            return {
                id: String(row.list),
                list: row.list,
                name: list?.name || String(row.list),
                base: list?.baseList ?? null,
                factor: list?.factor ?? null,
                price: row.price,
            };
        })
        .filter((row) => row.price),
);

const priceCols = computed(() => [
    { k: 'name', label: t('items.card.priceList') },
    { k: 'factor', label: t('items.card.priceFactor'), nowrap: true },
    { k: 'price', label: t('items.card.priceValue'), nowrap: true },
]);

/** The item's rows in `OITW`, named by their warehouse. */
const warehouseRows = computed(() =>
    (props.row?.warehouses || []).map((row) => {
        const warehouse = store.sapWarehouses.find(
            (entry) => entry.code === row.warehouse,
        );

        return {
            id: row.warehouse,
            name: warehouse?.name || row.warehouse,
            ...row,
        };
    }),
);

const warehouseCols = computed(() => [
    { k: 'name', label: t('items.card.warehouse') },
    { k: 'onHand', label: t('items.card.onHand'), nowrap: true },
    { k: 'committed', label: t('items.card.committed'), nowrap: true },
    { k: 'onOrder', label: t('items.card.onOrder'), nowrap: true },
    { k: 'min', label: t('items.card.minLevel'), nowrap: true },
    { k: 'max', label: t('items.card.maxLevel'), nowrap: true },
]);

/** The properties that are ticked, by the name `OITG` gives each. */
const properties = computed(() =>
    (props.row?.properties || []).map((code) => ({
        code,
        name:
            store.itemProperties.find((entry) => entry.code === code)?.name ||
            String(code),
    })),
);

const categories = computed(() =>
    (props.row?.site?.categories || []).map((id) => {
        const cat = store.categoryById(id);

        return cat
            ? `${t(`items.siteGroup.${cat.group}`)} · ${loc(cat.name)}`
            : id;
    }),
);
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
                            <AChip v-if="row.groupName" :dot="false">{{
                                row.groupName
                            }}</AChip>
                            <AChip v-if="row.frozen" tone="blue" size="sm">
                                {{ t('items.card.frozenYes') }}
                            </AChip>
                            <AChip
                                v-else-if="!row.active"
                                tone="gray"
                                size="sm"
                            >
                                {{ t('items.card.activeNo') }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span v-if="row.names.en" class="ltr">{{
                                row.names.en
                            }}</span>
                            <span>{{
                                t(`items.itemType.${row.itemType || 'I'}`)
                            }}</span>
                            <span v-if="row.updated">
                                {{
                                    t('items.card.updatedOn', {
                                        when: fmtISO(row.updated),
                                    })
                                }}
                            </span>
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
                        <AButton
                            sm
                            kind="ghost"
                            icon="trash"
                            :title="t('items.card.remove')"
                            :aria-label="t('items.card.remove')"
                            @click="emit('remove', row)"
                        />
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div class="card-grid">
                <!-- general: SAP's header and General tab -->
                <ACard :title="t('items.card.general')" icon="tag">
                    <div class="general">
                        <div class="pic">
                            <div v-if="row.picture" class="pic-box">
                                <img :src="row.picture" :alt="name" />
                            </div>
                            <div v-else class="pic-box is-empty">
                                {{ t('items.card.noPicture') }}
                            </div>
                        </div>
                        <AKeyValue
                            class="general-kv"
                            :rows="[
                                [t('items.card.code'), row.code],
                                [t('items.card.nameHe'), row.names.he],
                                [
                                    t('items.card.nameForeign'),
                                    orNotSet(row.names.en),
                                ],
                                [
                                    t('items.card.group'),
                                    orNotSet(row.groupName),
                                ],
                                [
                                    t('items.card.itemType'),
                                    t(`items.itemType.${row.itemType || 'I'}`),
                                ],
                                [
                                    t('items.card.uomGroup'),
                                    t(`items.uomGroup.${row.uom?.group ?? -1}`),
                                ],
                                [
                                    t('items.card.barcode'),
                                    orNotSet(row.barcode),
                                ],
                                [
                                    t('items.card.additionalId'),
                                    orNotSet(row.additionalId),
                                ],
                                [t('items.card.flags'), ''],
                                [
                                    t('items.card.state'),
                                    row.frozen
                                        ? t('items.card.frozenYes')
                                        : row.active
                                          ? t('items.card.activeYes')
                                          : t('items.card.activeNo'),
                                ],
                                [
                                    t('items.card.created'),
                                    row.created
                                        ? fmtISO(row.created)
                                        : notSet(),
                                ],
                            ]"
                        >
                            <template #value-8>
                                <span class="chips">
                                    <AChip
                                        v-for="id in ITEM_FLAG_IDS"
                                        :key="id"
                                        size="sm"
                                        :tone="
                                            row.flags?.[id] ? 'green' : 'gray'
                                        "
                                        :dot="false"
                                    >
                                        {{ t(`items.flag.${id}`) }}
                                    </AChip>
                                </span>
                            </template>
                        </AKeyValue>
                    </div>
                </ACard>

                <!-- purchasing and sales: SAP's two data tabs -->
                <ACard :title="t('items.card.trade')" icon="truck">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.preferredSupplier'),
                                row.preferred
                                    ? loc(row.preferred.name)
                                    : notSet(),
                            ],
                            [
                                t('items.card.supplierSapCode'),
                                orNotSet(row.suppliers?.sapCode),
                            ],
                            [
                                t('items.card.catalogNum'),
                                orNotSet(row.suppliers?.catalogNum),
                            ],
                            [
                                t('items.card.purchaseUom'),
                                uomLabel(row.uom?.purchase),
                            ],
                            [
                                t('items.card.numInBuy'),
                                t('items.card.numInText', {
                                    n: num(row.uom?.numInBuy ?? 1, 3),
                                    unit: uomLabel(row.uom?.stock),
                                }),
                            ],
                            [
                                t('items.card.packUom'),
                                orNotSet(row.uom?.packUom),
                            ],
                            [
                                t('items.card.packQty'),
                                orNotSet(row.uom?.packQty),
                            ],
                            [
                                t('items.card.salesUom'),
                                uomLabel(row.uom?.sales),
                            ],
                            [
                                t('items.card.numInSale'),
                                t('items.card.numInText', {
                                    n: num(row.uom?.numInSale ?? 1, 3),
                                    unit: uomLabel(row.uom?.stock),
                                }),
                            ],
                            [
                                t('items.card.lastPurchase'),
                                row.price?.lastPurchase
                                    ? `${ils(row.price.lastPurchase, 2)} / ${uomLabel(row.uom?.purchase)}`
                                    : notSet(),
                            ],
                            [
                                t('items.card.lastPurchaseOn'),
                                row.price?.lastPurchaseOn
                                    ? fmtISO(row.price.lastPurchaseOn)
                                    : notSet(),
                            ],
                            [
                                t('items.card.evalPrice'),
                                row.price?.evalPrice
                                    ? ils(row.price.evalPrice, 2)
                                    : notSet(),
                            ],
                        ]"
                    />
                </ACard>

                <!-- the price lists: the item's own ITM1 rows -->
                <ACard :title="t('items.card.prices')" icon="coin" :pad="false">
                    <ADataTable
                        v-if="priceRows.length"
                        :cols="priceCols"
                        :rows="priceRows"
                        row-key="id"
                    >
                        <template #cell-name="{ row: price }">
                            <span class="a-code a-tag">{{ price.list }}</span>
                            {{ price.name }}
                        </template>
                        <template #cell-factor="{ row: price }">
                            <span
                                v-if="price.base && price.base !== price.list"
                            >
                                {{
                                    t('items.card.priceFrom', {
                                        list: price.base,
                                        factor: num(price.factor, 2),
                                    })
                                }}
                            </span>
                            <span v-else class="t-sub">—</span>
                        </template>
                        <template #cell-price="{ row: price }">
                            <span class="num">{{ ils(price.price, 2) }}</span>
                            <div class="t-sub">
                                {{
                                    t('items.card.perUnit', {
                                        unit: uomLabel(row.uom?.price),
                                    })
                                }}
                            </div>
                        </template>
                    </ADataTable>
                    <p v-else class="pad t-sub">
                        {{ t('items.card.noPrices') }}
                    </p>
                    <div class="pad">
                        <div class="a-lbl">{{ t('items.card.ladder') }}</div>
                        <LadderCalculator :item="row" compact />
                    </div>
                </ACard>

                <!-- inventory: the levels and the warehouse table -->
                <ACard
                    :title="t('items.card.inventory')"
                    icon="grid"
                    :pad="false"
                >
                    <div class="pad">
                        <AKeyValue
                            :rows="[
                                [
                                    t('items.card.stockUom'),
                                    uomLabel(row.uom?.stock),
                                ],
                                [
                                    t('items.card.countUom'),
                                    uomLabel(row.uom?.count),
                                ],
                                [
                                    t('items.card.minLevel'),
                                    qty(row.levels?.min, row.uom?.stock),
                                ],
                                [
                                    t('items.card.maxLevel'),
                                    qty(row.levels?.max, row.uom?.stock),
                                ],
                                [
                                    t('items.card.reorderQty'),
                                    qty(row.levels?.reorder, row.uom?.stock),
                                ],
                                [
                                    t('items.card.byWarehouse'),
                                    yesNo(row.accounting?.byWarehouse),
                                ],
                                [
                                    t('items.card.valuation'),
                                    t(
                                        `items.valuation.${row.accounting?.valuation || 'C'}`,
                                    ),
                                ],
                            ]"
                        />
                    </div>
                    <ADataTable
                        v-if="warehouseRows.length"
                        :cols="warehouseCols"
                        :rows="warehouseRows"
                        row-key="id"
                    >
                        <template #cell-onHand="{ row: wh }">
                            <span class="num">{{ num(wh.onHand, 3) }}</span>
                        </template>
                        <template #cell-committed="{ row: wh }">
                            <span class="num">{{ num(wh.committed, 3) }}</span>
                        </template>
                        <template #cell-onOrder="{ row: wh }">
                            <span class="num">{{ num(wh.onOrder, 3) }}</span>
                        </template>
                        <template #cell-min="{ row: wh }">
                            <span class="num">{{ num(wh.min, 3) }}</span>
                        </template>
                        <template #cell-max="{ row: wh }">
                            <span class="num">{{ num(wh.max, 3) }}</span>
                        </template>
                    </ADataTable>
                    <p v-else class="pad t-sub">
                        {{ t('items.card.noWarehouses') }}
                    </p>
                    <div v-if="row.flags?.inventory" class="pad pad-top">
                        <AButton sm icon="check" @click="emit('count', row)">
                            {{ t('items.card.count') }}
                        </AButton>
                    </div>
                </ACard>

                <!-- planning and production -->
                <ACard :title="t('items.card.planning')" icon="layers">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.planningMethod'),
                                t(
                                    `items.planningMethod.${row.planning?.method || 'N'}`,
                                ),
                            ],
                            [
                                t('items.card.procurementMethod'),
                                t(
                                    `items.procurementMethod.${row.planning?.procurement || 'B'}`,
                                ),
                            ],
                            [
                                t('items.card.minOrderQty'),
                                qty(row.levels?.minOrder, row.uom?.purchase),
                            ],
                            [
                                t('items.card.leadTime'),
                                row.levels?.leadTime
                                    ? t('items.card.leadTimeDays', {
                                          n: row.levels.leadTime,
                                      })
                                    : notSet(),
                            ],
                            [
                                t('items.card.treeType'),
                                t(`items.treeType.${row.treeType || 'N'}`),
                            ],
                            [
                                t('items.card.issueMethod'),
                                t(
                                    `items.issueMethod.${row.issueMethod || 'M'}`,
                                ),
                            ],
                            [
                                t('items.card.componentWarehouse'),
                                t(
                                    `items.componentWarehouse.${row.planning?.componentWarehouse || 'B'}`,
                                ),
                            ],
                        ]"
                    />
                </ACard>

                <!-- the properties SAP ticks on the item -->
                <ACard :title="t('items.card.properties')" icon="check">
                    <div v-if="properties.length" class="chips">
                        <AChip
                            v-for="property in properties"
                            :key="property.code"
                            size="sm"
                            tone="teal"
                            :dot="false"
                        >
                            {{ property.name }}
                        </AChip>
                    </div>
                    <div v-else class="t-sub">
                        {{ t('items.card.noProperties') }}
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
                            <span v-else class="t-sub">{{ notSet() }}</span>
                        </div>
                    </div>

                    <AKeyValue
                        class="safety-l"
                        :rows="[
                            [
                                t('items.card.alcoholPct'),
                                row.lab?.alcoholPct
                                    ? `${num(row.lab.alcoholPct)}%`
                                    : notSet(),
                            ],
                            [
                                t('items.card.oilPct'),
                                row.lab?.oilPct
                                    ? `${num(row.lab.oilPct)}%`
                                    : notSet(),
                            ],
                            [
                                t('items.card.extractionRatio'),
                                orNotSet(row.lab?.extractionRatio),
                            ],
                            [
                                t('items.card.packageSize'),
                                orNotSet(row.lab?.packageSize),
                            ],
                        ]"
                    />
                </ACard>

                <!-- the consumer site's own fields -->
                <ACard :title="t('items.card.site')" icon="external">
                    <AKeyValue
                        :rows="[
                            [t('items.card.siteSync'), ''],
                            [
                                t('items.card.siteName'),
                                orNotSet(row.site?.name),
                            ],
                            [
                                t('items.card.siteQty'),
                                row.site?.quantity
                                    ? `${num(row.site.quantity)} ${uomLabel(row.site.uom)}`
                                    : notSet(),
                            ],
                            [t('items.card.categories'), ''],
                            [
                                t('items.card.siteComments'),
                                orNotSet(row.site?.comments),
                            ],
                            [t('items.card.saleText'), orNotSet(row.saleText)],
                        ]"
                    >
                        <template #value-0>
                            <span class="chips">
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
                                <AChip
                                    v-if="row.site?.promo"
                                    tone="amber"
                                    size="sm"
                                    :dot="false"
                                >
                                    {{ t('items.card.promo') }}
                                </AChip>
                                <AChip
                                    v-if="row.site?.therapistDiscount"
                                    tone="blue"
                                    size="sm"
                                    :dot="false"
                                >
                                    {{ t('items.card.therapistDiscount') }}
                                </AChip>
                            </span>
                        </template>
                        <template #value-3>
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

                <!-- SAP's remarks field -->
                <ACard :title="t('items.card.remarks')" icon="edit">
                    <p v-if="row.remarks" class="remarks">{{ row.remarks }}</p>
                    <p v-else class="t-sub">{{ t('items.card.noRemarks') }}</p>

                    <template v-if="row.forTherapist">
                        <div class="a-lbl safety-l">
                            {{ t('items.card.forTherapist') }}
                        </div>
                        <p class="remarks">{{ row.forTherapist }}</p>
                    </template>
                </ACard>

                <!-- what the console adds: the runs that make it -->
                <ACard
                    v-if="recipe"
                    :title="t('items.card.productionRuns')"
                    icon="beaker"
                >
                    <AKeyValue
                        :rows="[
                            [t('items.card.recipe'), loc(recipe.name)],
                            [
                                t('items.card.canProduce'),
                                t('items.card.canProduceValue', {
                                    n: num(canProduce),
                                    qty: num(recipe.yield?.qty || 1),
                                    uom: recipe.yield?.uom || '',
                                }),
                            ],
                            [
                                t('items.card.lastUnitCost'),
                                lastUnitCost != null
                                    ? ils(lastUnitCost, 2)
                                    : notSet(),
                            ],
                        ]"
                    />
                    <div class="a-lbl calc-l">
                        {{ t('items.card.lastRuns') }}
                    </div>
                    <div v-if="runs.length" class="runs">
                        <div v-for="run in runs" :key="run.id" class="run">
                            <span class="a-code a-tag">{{ run.id }}</span>
                            <span>{{
                                t(`production.state.${run.state}`)
                            }}</span>
                            <span class="t-sub">
                                {{
                                    run.completedOn?.stamp ||
                                    run.issuedOn?.stamp ||
                                    run.createdOn?.stamp
                                }}
                            </span>
                        </div>
                    </div>
                    <div v-else class="t-sub">{{ t('items.card.noRuns') }}</div>
                    <AButton
                        sm
                        icon="plus"
                        class="calc-l"
                        @click="emit('produce', row)"
                    >
                        {{ t('items.card.produce') }}
                    </AButton>
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

.general {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
}

.pic-box {
    width: 96px;
    height: 96px;
    border-radius: var(--a-r);
    border: 1px solid var(--a-line);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pic-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pic-box.is-empty {
    background: var(--a-surface-2, transparent);
    color: var(--a-ink-4);
    font-size: 11.5px;
    text-align: center;
    padding: 6px;
}

.pad {
    padding: 14px 16px;
}

.pad-top {
    padding-top: 0;
}

.chips {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}

.safety-l,
.calc-l {
    margin-top: 14px;
}

.remarks {
    margin: 0;
    white-space: pre-wrap;
    font-size: 13.5px;
    line-height: 1.55;
}

.runs {
    display: grid;
    gap: 6px;
}

.run {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
    font-size: 13.5px;
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

/* `.t-sub` is only styled globally inside a table; the cards' own sub-lines
   match the stock and BOM panels sitting in the same grid. */
.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
