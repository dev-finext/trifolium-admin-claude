<script setup>
// Add or edit one item — SAP's item master, field for field.
//
// The card asks only what SAP asks: the item number, the names, the units and
// flags, the levels, the prices and supplier fields, the safety limits and the
// consumer-site fields. Nothing here is mandatory beyond a name and a valid
// number; SAP does not stop a buyer either.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import LadderCalculator from '@/components/pricing/LadderCalculator.vue';
import AButton from '@/components/ui/AButton.vue';
import ActionGate from '@/components/ui/ActionGate.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import {
    CURRENCY_IDS,
    ITEM_FAMILY_IDS,
    ITEM_FLAG_IDS,
    ITEM_TYPE_IDS,
    ITEM_UOM_IDS,
    SAFETY_CONTEXT_IDS,
    SAFETY_LEVEL_IDS,
    SITE_CATEGORY_SLOTS,
    TREE_TYPE_IDS,
} from '@/config';
import { useCatalogStore } from '@/stores/catalog';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The item (or joined row) being edited; `{}` for a new one. */
    item: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const store = useItemsStore();
const catalog = useCatalogStore();

const isNew = computed(() => !props.item.sku);
const touched = reactive({});
const codeTouched = ref(Boolean(props.item.code));

const source = props.item;

const text = (value) =>
    value === null || value === undefined ? '' : String(value);

const form = reactive({
    family: source.family || 'herb',
    // The item number: minted in the family's block until typed by hand.
    code: source.code || store.nextCode(source.family || 'herb'),
    active: source.active ?? true,
    itemType: source.itemType || 'I',
    treeType: source.treeType || 'N',
    names: {
        he: source.names?.he || '',
        en: source.names?.en || '',
        site: source.names?.site || '',
    },
    uom: {
        purchase: source.uom?.purchase || 'kg',
        sales: source.uom?.sales || 'g',
        stock: source.uom?.stock || source.uom?.sales || 'kg',
        factor: source.uom?.factor != null ? String(source.uom.factor) : '1',
    },
    flags: {
        purchase: source.flags?.purchase ?? true,
        sales: source.flags?.sales ?? true,
        inventory: source.flags?.inventory ?? true,
        batch: source.flags?.batch ?? true,
        internal: source.flags?.internal ?? false,
        therapistDiscount: source.flags?.therapistDiscount ?? false,
    },
    levels: {
        min: text(source.levels?.min),
        max: text(source.levels?.max),
    },
    barcode: source.barcode || '',
    catalogNum: source.catalogNum || '',
    packageSize: source.packageSize || '',
    // Which ladder prices it: '' inherits by code prefix, 'none' is a fixed
    // price, an id names a group.
    priceGroup: source.priceGroup || '',
    // Supplies consumed by the calendar — only when not batch-managed.
    consumption: {
        on: Boolean(source.consumption),
        qty: text(source.consumption?.qty),
        periodDays:
            source.consumption?.periodDays != null
                ? String(source.consumption.periodDays)
                : '7',
    },
    price: {
        sale: text(source.price?.sale),
        lastPurchase: text(source.price?.lastPurchase),
        currency: source.price?.currency || 'ILS',
        lastPurchaseOn: source.price?.lastPurchaseOn || null,
    },
    suppliers: {
        preferred: source.suppliers?.preferred || '',
        last: source.suppliers?.last || '',
    },
    prepTypes: [...(source.prepTypes || [])],
    safety: {
        pregnancy: source.safety?.pregnancy || '',
        lactation: source.safety?.lactation || '',
        under2: source.safety?.under2 || '',
    },
    lab: {
        alcoholPct: text(source.lab?.alcoholPct),
        extractionRatio: source.lab?.extractionRatio || '',
    },
    site: {
        sync: source.site?.sync ?? false,
        categories: Array.from(
            { length: SITE_CATEGORY_SLOTS },
            (_, i) => source.site?.categories?.[i] || '',
        ),
        promo: source.site?.promo ?? false,
        comments: source.site?.comments || '',
        qty: text(source.site?.qty),
        unit: source.site?.unit || '',
    },
});

// What the pharmacy makes itself is always batch-managed, and batch-managed
// stock is stock.
watch(
    () => form.flags.internal,
    (internal) => {
        if (internal) {
            form.flags.batch = true;
        }
    },
);
watch(
    () => form.flags.batch,
    (batch) => {
        if (batch) {
            form.flags.inventory = true;
        }
    },
);

// A new item's number follows its family until it is typed by hand.
watch(
    () => form.family,
    (family) => {
        if (isNew.value && !codeTouched.value) {
            form.code = store.nextCode(family);
        }
    },
);

function mark(field) {
    touched[field] = true;
}

const nonNegative = (value) => value === '' || Number(value) >= 0;

const errors = computed(() => {
    const he = form.names.he.trim();
    const code = form.code.trim();
    const factor = Number(form.uom.factor);

    return {
        he:
            he.length < 2
                ? t('items.validate.nameShort')
                : he.length > 120
                  ? t('items.validate.nameLong')
                  : '',
        code: !/^\d{6}$/.test(code)
            ? t('items.validate.codeFormat')
            : store.codeTaken(code, props.item.sku || null)
              ? t('items.validate.codeTaken')
              : '',
        factor:
            !Number.isFinite(factor) || factor < 1
                ? t('items.validate.factor')
                : '',
        sale: nonNegative(form.price.sale) ? '' : t('items.validate.number'),
        lastPurchase: nonNegative(form.price.lastPurchase)
            ? ''
            : t('items.validate.number'),
        levels:
            nonNegative(form.levels.min) && nonNegative(form.levels.max)
                ? ''
                : t('items.validate.number'),
    };
});

const hasErrors = computed(() => Object.values(errors.value).some(Boolean));
const valid = computed(() => !hasErrors.value);

function show(field) {
    return touched[field] ? errors.value[field] : '';
}

const numberOrNull = (value) => (value === '' ? null : Number(value));

/** The record the store will receive — also what the calculator prices. */
const draft = computed(() => ({
    sku: isNew.value ? form.code.trim() : props.item.sku,
    code: form.code.trim(),
    family: form.family,
    active: form.active,
    itemType: form.itemType,
    treeType: form.treeType,
    names: {
        he: form.names.he.trim(),
        en: form.names.en.trim() || null,
        site: form.names.site.trim() || null,
    },
    uom: {
        purchase: form.uom.purchase,
        sales: form.uom.sales,
        stock: form.uom.stock,
        factor: Number(form.uom.factor) || 1,
    },
    flags: { ...form.flags },
    levels: {
        min: numberOrNull(form.levels.min),
        max: numberOrNull(form.levels.max),
    },
    barcode: form.barcode.trim() || null,
    catalogNum: form.catalogNum.trim() || null,
    packageSize: form.packageSize.trim() || null,
    price: {
        sale: numberOrNull(form.price.sale),
        lastPurchase: numberOrNull(form.price.lastPurchase),
        currency: form.price.currency,
        lastPurchaseOn: form.price.lastPurchaseOn,
    },
    suppliers: {
        preferred: form.suppliers.preferred || null,
        last: form.suppliers.last || null,
    },
    prepTypes: [...form.prepTypes],
    safety: {
        pregnancy: form.safety.pregnancy || null,
        lactation: form.safety.lactation || null,
        under2: form.safety.under2 || null,
    },
    lab: {
        alcoholPct: numberOrNull(form.lab.alcoholPct),
        extractionRatio: form.lab.extractionRatio.trim() || null,
    },
    site: {
        sync: form.site.sync,
        categories: form.site.categories.filter(Boolean),
        promo: form.site.promo,
        comments: form.site.comments.trim() || null,
        qty: numberOrNull(form.site.qty),
        unit: form.site.unit || null,
    },
    priceGroup: form.priceGroup || null,
    consumption:
        form.flags.inventory && !form.flags.batch && form.consumption.on
            ? {
                  mode: 'time',
                  qty: form.consumption.qty,
                  periodDays: form.consumption.periodDays,
                  countedOn: source.consumption?.countedOn || null,
                  countedQty: source.consumption?.countedQty ?? null,
              }
            : null,
}));

function togglePrep(id) {
    form.prepTypes = form.prepTypes.includes(id)
        ? form.prepTypes.filter((type) => type !== id)
        : [...form.prepTypes, id];
}

const familyOptions = computed(() =>
    ITEM_FAMILY_IDS.map((id) => ({
        value: id,
        label: `${t(`items.family.${id}`)} · ${store.nextCode(id).slice(0, 2)}`,
    })),
);

const itemTypeOptions = computed(() =>
    ITEM_TYPE_IDS.map((id) => ({
        value: id,
        label: t(`items.itemType.${id}`),
    })),
);

const treeTypeOptions = computed(() =>
    TREE_TYPE_IDS.map((id) => ({
        value: id,
        label: t(`items.treeType.${id}`),
    })),
);

const uomOptions = computed(() =>
    ITEM_UOM_IDS.map((id) => ({ value: id, label: t(`items.uom.${id}`) })),
);

const uomOptionsBlank = computed(() => [
    { value: '', label: t('items.editor.none') },
    ...uomOptions.value,
]);

const currencyOptions = computed(() =>
    CURRENCY_IDS.map((id) => ({ value: id, label: t(`items.currency.${id}`) })),
);

const supplierOptions = computed(() => [
    { value: '', label: t('items.editor.noSupplier') },
    ...dataset.suppliers.map((supplier) => ({
        value: supplier.code,
        label: `${loc(supplier.name)} · ${supplier.code}`,
    })),
]);

const safetyOptions = computed(() => [
    { value: '', label: t('items.editor.notSet') },
    ...SAFETY_LEVEL_IDS.map((id) => ({
        value: id,
        label: t(`items.safetyLevel.${id}`),
    })),
]);

const categoryOptions = computed(() => [
    { value: '', label: t('items.editor.noCategory') },
    ...store.siteCategories.map((cat) => ({
        value: cat.id,
        label: `${t(`items.siteGroup.${cat.group}`)} · ${loc(cat.name)}`,
    })),
]);

const priceGroupOptions = computed(() => [
    { value: '', label: t('items.editor.priceGroupInherit') },
    { value: 'none', label: t('items.editor.priceGroupFixed') },
    ...catalog.priceGroups.map((group) => ({
        value: group.id,
        label: loc(group.name),
    })),
]);

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await store.saveItem(draft.value, props.item.sku || null);

    emit('saved', {
        created: result.created,
        name: draft.value.names.he,
        sku: result.item.sku,
        code: result.item.code,
    });
}

const title = computed(() =>
    isNew.value
        ? t('items.editor.newTitle')
        : t('items.editor.editTitle', {
              name: loc({
                  he: props.item.names.he,
                  en: props.item.names.en || props.item.names.he,
              }),
          }),
);
</script>

<template>
    <AModal open :title="title" :width="960" @close="emit('close')">
        <div class="ie">
            <!-- general -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.general') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.family') }}
                            <span class="req">*</span></label
                        >
                        <ASelect
                            v-model="form.family"
                            :options="familyOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.code') }}
                            <span class="req">*</span></label
                        >
                        <AInput
                            v-if="isNew"
                            v-model="form.code"
                            ltr
                            class="a-w100"
                            @input="codeTouched = true"
                            @blur="mark('code')"
                        />
                        <div v-else class="a-code a-tag ro">
                            {{ item.code }}
                        </div>
                        <div v-if="show('code')" class="a-inv">
                            {{ show('code') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('items.editor.codeHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.active')
                        }}</label>
                        <label class="check switch">
                            <ASwitch v-model="form.active" />
                            {{
                                form.active
                                    ? t('items.card.activeYes')
                                    : t('items.card.activeNo')
                            }}
                        </label>
                    </div>
                </div>

                <div class="a-3col">
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.nameHe') }}
                            <span class="req">*</span></label
                        >
                        <AInput
                            v-model="form.names.he"
                            class="a-w100"
                            @blur="mark('he')"
                        />
                        <div v-if="show('he')" class="a-inv">
                            {{ show('he') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.nameEn')
                        }}</label>
                        <AInput v-model="form.names.en" ltr class="a-w100" />
                        <div class="a-hint">
                            {{ t('items.editor.nameEnHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.siteName')
                        }}</label>
                        <AInput v-model="form.names.site" class="a-w100" />
                        <div class="a-hint">
                            {{ t('items.editor.siteNameHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.itemType')
                        }}</label>
                        <ASelect
                            v-model="form.itemType"
                            :options="itemTypeOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.treeType')
                        }}</label>
                        <ASelect
                            v-model="form.treeType"
                            :options="treeTypeOptions"
                            class="a-w100"
                        />
                    </div>
                </div>
            </section>

            <!-- units, flags & levels -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.units') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.purchaseUom')
                        }}</label>
                        <ASelect
                            v-model="form.uom.purchase"
                            :options="uomOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.salesUom')
                        }}</label>
                        <ASelect
                            v-model="form.uom.sales"
                            :options="uomOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.stockUom')
                        }}</label>
                        <ASelect
                            v-model="form.uom.stock"
                            :options="uomOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.factor')
                        }}</label>
                        <AInput
                            v-model="form.uom.factor"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('factor')"
                        />
                        <div v-if="show('factor')" class="a-inv">
                            {{ show('factor') }}
                        </div>
                        <div v-else class="a-hint">
                            {{
                                t('items.card.factorText', {
                                    purchase: t(
                                        `items.uom.${form.uom.purchase}`,
                                    ),
                                    factor: form.uom.factor || 1,
                                    stock: t(`items.uom.${form.uom.stock}`),
                                })
                            }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.minLevel')
                        }}</label>
                        <AInput
                            v-model="form.levels.min"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('levels')"
                        />
                        <div v-if="show('levels')" class="a-inv">
                            {{ show('levels') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('items.editor.minLevelHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.maxLevel')
                        }}</label>
                        <AInput
                            v-model="form.levels.max"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('levels')"
                        />
                    </div>
                </div>
                <div class="flags">
                    <label v-for="id in ITEM_FLAG_IDS" :key="id" class="check">
                        <input
                            v-model="form.flags[id]"
                            type="checkbox"
                            class="a-check"
                        />
                        {{ t(`items.flag.${id}`) }}
                    </label>
                </div>
                <div v-if="form.flags.internal" class="a-note a-note--info top">
                    {{ t('items.editor.internalFlagHint') }}
                </div>
                <div
                    v-if="form.flags.inventory && !form.flags.batch"
                    class="a-3col top"
                >
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.consumption')
                        }}</label>
                        <label class="check switch">
                            <ASwitch v-model="form.consumption.on" />
                            {{ t('items.editor.consumptionOn') }}
                        </label>
                        <div class="a-hint">
                            {{ t('items.editor.consumptionHint') }}
                        </div>
                    </div>
                    <template v-if="form.consumption.on">
                        <div>
                            <label class="a-lbl">{{
                                t('items.editor.consumptionQty')
                            }}</label>
                            <AInput
                                v-model="form.consumption.qty"
                                type="number"
                                ltr
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.editor.consumptionPeriod')
                            }}</label>
                            <AInput
                                v-model="form.consumption.periodDays"
                                type="number"
                                ltr
                                class="a-w100"
                            />
                        </div>
                    </template>
                </div>
            </section>

            <!-- purchasing & pricing -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.pricing') }}</div>
                <ActionGate id="item_price" compact>
                    <div class="a-3col">
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.salePrice')
                            }}</label>
                            <AInput
                                v-model="form.price.sale"
                                type="number"
                                ltr
                                class="a-w100"
                                @blur="mark('sale')"
                            />
                            <div v-if="show('sale')" class="a-inv">
                                {{ show('sale') }}
                            </div>
                            <div v-else class="a-hint">
                                {{
                                    t('items.editor.salePriceHint', {
                                        uom: t(`items.uom.${form.uom.sales}`),
                                    })
                                }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.lastPurchase')
                            }}</label>
                            <div class="pair">
                                <AInput
                                    v-model="form.price.lastPurchase"
                                    type="number"
                                    ltr
                                    @blur="mark('lastPurchase')"
                                />
                                <ASelect
                                    v-model="form.price.currency"
                                    :options="currencyOptions"
                                />
                            </div>
                            <div v-if="show('lastPurchase')" class="a-inv">
                                {{ show('lastPurchase') }}
                            </div>
                            <div v-else class="a-hint">
                                {{ t('items.editor.lastPurchaseHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.editor.priceGroup')
                            }}</label>
                            <ASelect
                                v-model="form.priceGroup"
                                :options="priceGroupOptions"
                                class="a-w100"
                            />
                            <div class="a-hint">
                                {{ t('items.editor.priceGroupHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.preferredSupplier')
                            }}</label>
                            <ASelect
                                v-model="form.suppliers.preferred"
                                :options="supplierOptions"
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.lastSupplier')
                            }}</label>
                            <ASelect
                                v-model="form.suppliers.last"
                                :options="supplierOptions"
                                class="a-w100"
                            />
                            <div class="a-hint">
                                {{ t('items.editor.lastSupplierHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.catalogNum')
                            }}</label>
                            <AInput
                                v-model="form.catalogNum"
                                ltr
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.barcode')
                            }}</label>
                            <AInput v-model="form.barcode" ltr class="a-w100" />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.packageSize')
                            }}</label>
                            <AInput v-model="form.packageSize" class="a-w100" />
                        </div>
                    </div>
                </ActionGate>
                <div class="top">
                    <label class="a-lbl">{{
                        t('items.editor.calculator')
                    }}</label>
                    <LadderCalculator :item="draft" compact />
                </div>
            </section>

            <!-- preparation & safety -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.prep') }}</div>
                <div class="a-lbl">{{ t('items.card.prepTypes') }}</div>
                <div class="prep-grid">
                    <label
                        v-for="type in store.prepTypes"
                        :key="type.id"
                        class="check"
                    >
                        <input
                            type="checkbox"
                            class="a-check"
                            :checked="form.prepTypes.includes(type.id)"
                            @change="togglePrep(type.id)"
                        />
                        {{ loc(type.name) }}
                    </label>
                </div>
                <div class="a-3col top">
                    <div v-for="ctx in SAFETY_CONTEXT_IDS" :key="ctx">
                        <label class="a-lbl">{{
                            t(`items.safetyContext.${ctx}`)
                        }}</label>
                        <ASelect
                            v-model="form.safety[ctx]"
                            :options="safetyOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.alcoholPct')
                        }}</label>
                        <AInput
                            v-model="form.lab.alcoholPct"
                            type="number"
                            ltr
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.extractionRatio')
                        }}</label>
                        <AInput
                            v-model="form.lab.extractionRatio"
                            ltr
                            class="a-w100"
                            placeholder="1:5"
                        />
                    </div>
                </div>
            </section>

            <!-- consumer site -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.site') }}</div>
                <div class="flags">
                    <label class="check switch">
                        <ASwitch
                            v-model="form.site.sync"
                            :label="t('items.card.sync')"
                        />
                        {{ t('items.card.sync') }}
                    </label>
                    <label class="check switch">
                        <ASwitch
                            v-model="form.site.promo"
                            :label="t('items.card.promo')"
                        />
                        {{ t('items.card.promo') }}
                    </label>
                </div>
                <div class="a-lbl">{{ t('items.card.categories') }}</div>
                <div class="a-2col">
                    <ASelect
                        v-for="(cat, i) in form.site.categories"
                        :key="i"
                        v-model="form.site.categories[i]"
                        :options="categoryOptions"
                        class="a-w100"
                    />
                </div>
                <div class="a-3col top">
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.siteQty')
                        }}</label>
                        <div class="pair">
                            <AInput v-model="form.site.qty" type="number" ltr />
                            <ASelect
                                v-model="form.site.unit"
                                :options="uomOptionsBlank"
                            />
                        </div>
                    </div>
                    <div class="span2">
                        <label class="a-lbl">{{
                            t('items.card.siteComments')
                        }}</label>
                        <ATextarea
                            v-model="form.site.comments"
                            :rows="2"
                            class="a-w100"
                        />
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('items.editor.createConfirm')
                        : t('items.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
            <span v-if="hasErrors" class="a-rf-need">{{
                t('items.editor.fixErrors')
            }}</span>
        </template>
    </AModal>
</template>

<style scoped>
.ie {
    display: grid;
    gap: 22px;
}

.ie section > .a-3col + .a-3col,
.top {
    margin-top: 12px;
}

.req {
    color: var(--a-red);
}

.ro {
    display: inline-block;
    margin-top: 6px;
}

.pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.flags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 22px;
    margin-top: 12px;
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
}

.check.switch {
    gap: 10px;
    margin-top: 6px;
}

.prep-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 16px;
}

.span2 {
    grid-column: span 2;
}
</style>
