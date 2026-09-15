<script setup>
// The item card. Everything SAP holds on one item, on one panel — the item
// master's own fields, then what this console adds around them: the stock with
// its batches, the recipes the item is made from or goes into, the runs, the
// files.
//
// The stock block is where the card drills down: "committed" opens to the orders
// holding the quantity, "on order" to the purchase orders bringing it in, and
// every batch still open is listed with its expiry.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ItemBomPanel from '@/components/items/ItemBomPanel.vue';
import ItemStockPanel from '@/components/items/ItemStockPanel.vue';
import LadderCalculator from '@/components/pricing/LadderCalculator.vue';
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
import { useInventoryStore } from '@/stores/inventory';
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
const inventory = useInventoryStore();
const production = useProductionStore();

const name = computed(() =>
    props.row
        ? loc({
              he: props.row.names.he,
              en: props.row.names.en || props.row.names.he,
          })
        : '',
);

const notSet = () => t('items.card.notSet');
const uomLabel = (id) => (id ? t(`items.uom.${id}`) : notSet());
const orNotSet = (value) =>
    value === null || value === undefined || value === '' ? notSet() : value;

/** The recipe an internal item is made from, and what the runs of it say. */
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

/** When time-consumed stock runs out at the current pace. */
const runOut = computed(() =>
    props.row?.consumption
        ? inventory.runOutOn(props.row.sku, props.row.consumption)
        : null,
);

const salePrice = computed(() => {
    const sale = props.row?.price?.sale;

    return sale === null || sale === undefined ? null : priceParts(sale);
});

function purchaseText(row) {
    if (
        row.price?.lastPurchase === null ||
        row.price?.lastPurchase === undefined
    ) {
        return notSet();
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
                                v-if="row.active === false"
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
                <ACard :title="t('items.card.identity')" icon="tag">
                    <AKeyValue
                        :rows="[
                            [t('items.card.nameHe'), row.names.he],
                            [t('items.card.nameEn'), orNotSet(row.names.en)],
                            [
                                t('items.card.siteName'),
                                orNotSet(row.names.site),
                            ],
                            [
                                t('items.card.itemType'),
                                t(`items.itemType.${row.itemType || 'I'}`),
                            ],
                            [
                                t('items.card.treeType'),
                                t(`items.treeType.${row.treeType || 'N'}`),
                            ],
                            [
                                t('items.card.active'),
                                row.active === false
                                    ? t('items.card.activeNo')
                                    : t('items.card.activeYes'),
                            ],
                            [
                                t('items.card.created'),
                                row.created ? fmtISO(row.created) : notSet(),
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
                                t('items.card.stockUom'),
                                uomLabel(row.uom?.stock || row.uom?.sales),
                            ],
                            [
                                t('items.card.factor'),
                                t('items.card.factorText', {
                                    purchase: uomLabel(row.uom?.purchase),
                                    factor: num(row.uom?.factor || 1),
                                    stock: uomLabel(
                                        row.uom?.stock || row.uom?.sales,
                                    ),
                                }),
                            ],
                            [
                                t('items.card.minLevel'),
                                row.levels?.min != null
                                    ? `${num(row.levels.min)} ${uomLabel(row.uom?.stock || row.uom?.sales)}`
                                    : notSet(),
                            ],
                            [
                                t('items.card.maxLevel'),
                                row.levels?.max != null
                                    ? `${num(row.levels.max)} ${uomLabel(row.uom?.stock || row.uom?.sales)}`
                                    : notSet(),
                            ],
                            [t('items.card.flags'), ''],
                        ]"
                    >
                        <template #value-6>
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
                                    ? `${ils(salePrice.net)} / ${uomLabel(row.uom?.sales)}`
                                    : notSet(),
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
                                    : notSet(),
                            ],
                            [
                                t('items.card.preferredSupplier'),
                                row.preferred
                                    ? loc(row.preferred.name)
                                    : notSet(),
                            ],
                            [
                                t('items.card.lastSupplier'),
                                row.last ? loc(row.last.name) : notSet(),
                            ],
                            [
                                t('items.card.catalogNum'),
                                orNotSet(row.catalogNum),
                            ],
                            [t('items.card.barcode'), orNotSet(row.barcode)],
                            [
                                t('items.card.packageSize'),
                                orNotSet(row.packageSize),
                            ],
                        ]"
                    />
                    <div class="a-lbl calc-l">{{ t('items.card.ladder') }}</div>
                    <LadderCalculator :item="row" compact />
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
                            <span v-else class="t-sub">{{ notSet() }}</span>
                        </div>
                    </div>

                    <AKeyValue
                        class="safety-l"
                        :rows="[
                            [
                                t('items.card.alcoholPct'),
                                row.lab?.alcoholPct != null
                                    ? `${num(row.lab.alcoholPct)}%`
                                    : notSet(),
                            ],
                            [
                                t('items.card.extractionRatio'),
                                orNotSet(row.lab?.extractionRatio),
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
                                    : notSet(),
                            ],
                            [
                                t('items.card.siteComments'),
                                orNotSet(row.site?.comments),
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

                <ACard
                    v-if="row.flags?.internal"
                    :title="t('items.card.productionRuns')"
                    icon="beaker"
                >
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.recipe'),
                                recipe
                                    ? loc(recipe.name)
                                    : t('items.card.noRecipe'),
                            ],
                            [
                                t('items.card.canProduce'),
                                recipe
                                    ? t('items.card.canProduceValue', {
                                          n: num(canProduce),
                                          qty: num(recipe.yield?.qty || 1),
                                          uom: recipe.yield?.uom || '',
                                      })
                                    : '—',
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

                <ACard
                    v-if="row.consumption"
                    :title="t('items.card.consumption')"
                    icon="grid"
                >
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.consumptionRule'),
                                t('items.card.consumptionRuleValue', {
                                    qty: num(row.consumption.qty),
                                    uom: uomLabel(
                                        row.uom?.stock || row.uom?.sales,
                                    ),
                                    days: num(row.consumption.periodDays),
                                }),
                            ],
                            [
                                t('items.card.countedOn'),
                                row.consumption.countedOn
                                    ? t('items.card.countedOnValue', {
                                          when: fmtISO(
                                              row.consumption.countedOn,
                                          ),
                                          qty: num(row.consumption.countedQty),
                                      })
                                    : notSet(),
                            ],
                            [
                                t('items.card.runOut'),
                                runOut
                                    ? fmtISO(runOut)
                                    : t('items.card.runOutNever'),
                            ],
                        ]"
                    />
                    <AButton
                        sm
                        icon="check"
                        class="calc-l"
                        @click="emit('count', row)"
                    >
                        {{ t('items.card.count') }}
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

.chips {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}

.safety-l,
.calc-l {
    margin-top: 14px;
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
