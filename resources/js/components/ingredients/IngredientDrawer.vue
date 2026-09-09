<script setup>
// One formula ingredient, as the buyer and the lab need to see it.
//
// The record underneath is the same one the Items screen extends — an item and
// an ingredient are one thing read by two people — but the questions differ.
// A buyer opens this to answer "who supplies it, what did we last pay, how much
// is on its way". A pharmacist opens it to answer "what may it be compounded
// into, and who may not take it". So purchasing and preparation lead, and the
// consumer-site fields that dominate a shelf product are not here at all.
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
import { CURRENCY_SYMBOL, ITEM_FLAG_IDS } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The ingredient row from the screen's own list, or null when closed. */
    row: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();
const catalog = useCatalogStore();

/** The item record that extends this stock row — the source of everything new. */
const item = computed(() => (props.row ? store.rowBySku(props.row.sku) : null));

const name = computed(() => (props.row ? loc(props.row.name) : ''));

const uomLabel = (id) => (id ? t(`items.uom.${id}`) : t('items.card.notSet'));

const prepNames = computed(() =>
    (item.value?.prepTypes || [])
        .map((id) => store.prepTypeById(id))
        .filter(Boolean)
        .map((type) => loc(type.name)),
);

/** The quantity bands this ingredient is priced by, if a group claims it. */
const priceGroup = computed(() =>
    props.row?.priceSku
        ? catalog.resolveSku(props.row.priceSku)?.group || null
        : null,
);

const purchaseText = computed(() => {
    const price = item.value?.price;

    if (price?.lastPurchase === null || price?.lastPurchase === undefined) {
        return t('items.card.notSet');
    }

    return `${CURRENCY_SYMBOL[price.currency] || ''}${num(price.lastPurchase, 2)} / ${uomLabel(item.value?.uom?.purchase)}`;
});

const fieldLabel = (id) => t(`items.mandatory.${id}`);

const safetyRows = computed(() => {
    const safety = item.value?.safety || {};

    return ['pregnancy', 'lactation', 'under2'].map((context) => [
        t(`items.safetyContext.${context}`),
        safety[context]
            ? t(`items.safetyLevel.${safety[context]}`)
            : t('items.card.notSet'),
    ]);
});
</script>

<template>
    <ADrawer :open="Boolean(row)" @close="emit('close')">
        <template v-if="row">
            <div class="a-dhead">
                <div class="a-dhead-r">
                    <div class="a-dhead-c">
                        <div class="a-dhead-t">
                            <h2>{{ name }}</h2>
                            <AChip size="sm" :dot="false">
                                {{ t(`ingredients.kind.${row.kind}`) }}
                            </AChip>
                            <AChip tone="slate" size="sm" :dot="false">
                                {{
                                    t(
                                        `ingredients.system.${row.system || 'west'}`,
                                    )
                                }}
                            </AChip>
                            <AChip
                                v-if="item?.missing?.length"
                                tone="amber"
                                size="sm"
                                :dot="false"
                            >
                                {{
                                    t('items.card.missing', {
                                        n: item.missing.length,
                                    })
                                }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span class="ltr">{{ row.sku }}</span>
                            <span v-if="row.lat" class="ltr">{{
                                row.lat
                            }}</span>
                            <span v-if="row.cn">{{ row.cn }}</span>
                            <span>{{ t(`warehouse.${row.wh}.name`) }}</span>
                            <span v-if="item?.location">
                                {{
                                    t('items.card.locationText', item.location)
                                }}
                            </span>
                        </div>
                        <div
                            v-if="item?.missing?.length"
                            class="a-note a-note--warn ing-note"
                        >
                            {{
                                t('items.card.missingList', {
                                    fields: item.missing
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
                            {{ t('ingredients.action.edit') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">
                            {{ t('ui.close') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div class="card-grid">
                <ACard :title="t('ingredients.card.buying')" icon="truck">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.purchaseUom'),
                                uomLabel(item?.uom?.purchase),
                            ],
                            [
                                t('items.card.salesUom'),
                                uomLabel(item?.uom?.sales),
                            ],
                            [
                                t('items.card.factor'),
                                t('items.card.factorText', {
                                    purchase: uomLabel(item?.uom?.purchase),
                                    factor: num(item?.uom?.factor || 1),
                                    sales: uomLabel(item?.uom?.sales),
                                }),
                            ],
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
                                    : t('items.card.notSet'),
                            ],
                            [
                                t('items.card.lastSupplier'),
                                item?.last
                                    ? loc(item.last.name)
                                    : t('items.card.notSet'),
                            ],
                            [t('items.card.flags'), ''],
                        ]"
                    >
                        <template #value-7>
                            <span class="chips">
                                <AChip
                                    v-for="id in ITEM_FLAG_IDS"
                                    :key="id"
                                    size="sm"
                                    :tone="item?.flags?.[id] ? 'green' : 'gray'"
                                    :dot="false"
                                >
                                    {{ t(`items.flag.${id}`) }}
                                </AChip>
                            </span>
                        </template>
                    </AKeyValue>
                </ACard>

                <ACard :title="t('ingredients.card.prep')" icon="beaker">
                    <div class="a-lbl">{{ t('items.card.prepTypes') }}</div>
                    <div v-if="prepNames.length" class="chips ing-chips">
                        <AChip
                            v-for="prep in prepNames"
                            :key="prep"
                            size="sm"
                            :dot="false"
                        >
                            {{ prep }}
                        </AChip>
                    </div>
                    <p v-else class="a-hint">
                        {{ t('items.card.noPrepTypes') }}
                    </p>

                    <div class="a-lbl ing-lbl">
                        {{ t('items.card.safety') }}
                    </div>
                    <AKeyValue :rows="safetyRows" />

                    <div class="a-lbl ing-lbl">
                        {{ t('items.card.production') }}
                    </div>
                    <p class="ing-note-text">
                        {{
                            item?.notes?.production
                                ? loc(item.notes.production)
                                : t('items.card.noNote')
                        }}
                    </p>
                </ACard>

                <ACard :title="t('ingredients.card.pricing')" icon="coin">
                    <AKeyValue
                        :rows="[
                            [
                                t('items.card.priceGroup'),
                                priceGroup
                                    ? loc(priceGroup.name)
                                    : t('items.card.noPriceGroup'),
                            ],
                            [
                                t('ingredients.card.priceSku'),
                                row.priceSku || t('items.card.notSet'),
                            ],
                            [
                                t('ingredients.card.listPrice'),
                                row.price === null || row.price === undefined
                                    ? t('items.card.byTiers')
                                    : ils(row.price),
                            ],
                        ]"
                    />
                    <p v-if="priceGroup" class="a-hint ing-tiers">
                        {{
                            t('ingredients.card.tiersHint', {
                                group: loc(priceGroup.name),
                            })
                        }}
                    </p>
                </ACard>

                <ItemStockPanel :row="item" class="span2" />

                <ItemBomPanel :row="item" />

                <AttachmentsPanel
                    entity="item"
                    :ref-id="row.sku"
                    :title="t('ingredients.card.files')"
                />
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 20px 24px 28px;
}

.span2 {
    grid-column: 1 / -1;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.ing-chips {
    margin-top: 6px;
}

.ing-lbl {
    margin-top: 18px;
}

.ing-note-text {
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--a-ink-2);
}

.ing-note {
    margin-top: 10px;
}

.ing-tiers {
    margin-top: 10px;
}

@media (max-width: 900px) {
    .card-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
