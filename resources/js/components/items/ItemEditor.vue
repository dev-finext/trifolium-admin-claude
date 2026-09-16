<script setup>
// Add or edit one item — SAP's item master, field for field.
//
// The sections are SAP's tabs: general, purchasing and sales, inventory,
// planning and production, properties, remarks, and the user-defined fields the
// pharmacy added. Nothing is required beyond a description and a free item
// number, which is what SAP itself insists on.
//
// The price list table and the warehouse table are shown on the card; they are
// not edited here, because in SAP both are maintained from their own windows.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ActionGate from '@/components/ui/ActionGate.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import {
    COMPONENT_WAREHOUSE_IDS,
    ISSUE_METHOD_IDS,
    ITEM_FAMILY,
    ITEM_FLAG_IDS,
    ITEM_TYPE_IDS,
    ITEM_UOM_IDS,
    PLANNING_METHOD_IDS,
    PROCUREMENT_METHOD_IDS,
    SAFETY_CONTEXT_IDS,
    SAFETY_LEVEL_IDS,
    SITE_CATEGORY_SLOTS,
    TREE_TYPE_IDS,
    UOM_GROUP_IDS,
    VALUATION_METHOD_IDS,
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

/**
 * The group as a number: a native select hands back the option's value as a
 * string, and the item master keys its group by `ItmsGrpCod`.
 */
const groupCode = (value) =>
    value === null || value === undefined || value === ''
        ? null
        : Number(value);

/** The numbering block a group's items are usually numbered in. */
const familyOfGroup = (group) =>
    store.items.find((item) => item.group === groupCode(group))?.family ||
    'herb';

const form = reactive({
    // SAP's item number is the key; the numbering block is the console's own.
    code: source.code || '',
    group: source.group ?? null,
    family: source.family || 'herb',
    names: {
        he: source.names?.he || '',
        en: source.names?.en || '',
        site: source.names?.site || '',
    },
    itemType: source.itemType || 'I',
    treeType: source.treeType || 'N',
    issueMethod: source.issueMethod || 'M',
    active: source.active ?? true,
    frozen: source.frozen ?? false,
    frozenFrom: source.frozenFrom || null,
    frozenTo: source.frozenTo || null,
    activeComment: source.activeComment || '',
    frozenComment: source.frozenComment || '',
    flags: {
        inventory: source.flags?.inventory ?? true,
        sales: source.flags?.sales ?? true,
        purchase: source.flags?.purchase ?? true,
        batch: source.flags?.batch ?? true,
    },
    barcode: source.barcode || '',
    additionalId: source.additionalId || '',
    picture: source.picture || '',
    suppliers: {
        preferred: source.suppliers?.preferred || '',
        sapCode: source.suppliers?.sapCode || '',
        catalogNum: source.suppliers?.catalogNum || '',
    },
    uom: {
        stock: source.uom?.stock || 'kg',
        purchase: source.uom?.purchase || 'kg',
        sales: source.uom?.sales || 'g',
        count: source.uom?.count || source.uom?.stock || 'kg',
        price: source.uom?.price || source.uom?.sales || 'kg',
        numInBuy: text(source.uom?.numInBuy ?? 1),
        numInSale: text(source.uom?.numInSale ?? 1),
        group: source.uom?.group ?? -1,
        packUom: source.uom?.packUom || '',
        packQty: text(source.uom?.packQty),
    },
    levels: {
        min: text(source.levels?.min),
        max: text(source.levels?.max),
        reorder: text(source.levels?.reorder),
        minOrder: text(source.levels?.minOrder),
        leadTime: text(source.levels?.leadTime),
    },
    planning: {
        method: source.planning?.method || 'N',
        procurement: source.planning?.procurement || 'B',
        productSource: source.planning?.productSource || null,
        componentWarehouse: source.planning?.componentWarehouse || 'B',
    },
    price: {
        sale: text(source.price?.sale),
        lastPurchase: text(source.price?.lastPurchase),
        evalPrice: text(source.price?.evalPrice),
    },
    accounting: {
        valuation: source.accounting?.valuation || 'C',
        byWarehouse: source.accounting?.byWarehouse ?? false,
        noDiscount: source.accounting?.noDiscount ?? false,
        inCostRoll: source.accounting?.inCostRoll ?? true,
    },
    lab: {
        alcoholPct: text(source.lab?.alcoholPct),
        oilPct: text(source.lab?.oilPct),
        extractionRatio: source.lab?.extractionRatio || '',
        packageSize: text(source.lab?.packageSize),
    },
    safety: {
        pregnancy: source.safety?.pregnancy || '',
        lactation: source.safety?.lactation || '',
        under2: source.safety?.under2 || '',
    },
    site: {
        name: source.site?.name || '',
        uom: source.site?.uom || '',
        quantity: text(source.site?.quantity),
        comments: source.site?.comments || '',
        categories: Array.from(
            { length: SITE_CATEGORY_SLOTS },
            (_, i) => source.site?.categories?.[i] || '',
        ),
    },
    properties: [...(source.properties || [])],
    remarks: source.remarks || '',
    saleText: source.saleText || '',
    priceGroup: source.priceGroup || '',
});

// SAP's own rule: a batch-managed item is an inventory item.
watch(
    () => form.flags.batch,
    (batch) => {
        if (batch) {
            form.flags.inventory = true;
        }
    },
);

// A new item is numbered in the block its group is usually numbered in, until
// the number is typed by hand.
watch(
    () => form.group,
    (group) => {
        if (!isNew.value || codeTouched.value || groupCode(group) === null) {
            return;
        }

        form.family = familyOfGroup(group);
        form.code = store.nextCode(form.family);
    },
);

function mark(field) {
    touched[field] = true;
}

const nonNegative = (value) => value === '' || Number(value) >= 0;

const errors = computed(() => {
    const he = form.names.he.trim();
    const code = form.code.trim();

    return {
        he:
            he.length < 2
                ? t('items.validate.nameShort')
                : he.length > 200
                  ? t('items.validate.nameLong')
                  : '',
        code: !/^\d{6}$/.test(code)
            ? t('items.validate.codeFormat')
            : store.codeTaken(code, props.item.sku || null)
              ? t('items.validate.codeTaken')
              : '',
        group: groupCode(form.group) === null ? t('items.validate.group') : '',
        numIn:
            Number(form.uom.numInBuy) > 0 && Number(form.uom.numInSale) > 0
                ? ''
                : t('items.validate.positive'),
        levels:
            nonNegative(form.levels.min) &&
            nonNegative(form.levels.max) &&
            nonNegative(form.levels.reorder) &&
            nonNegative(form.levels.minOrder)
                ? ''
                : t('items.validate.number'),
        price:
            nonNegative(form.price.sale) && nonNegative(form.price.lastPurchase)
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

/** The record the store will receive. */
const draft = computed(() => ({
    sku: isNew.value ? form.code.trim() : props.item.sku,
    code: form.code.trim(),
    group: groupCode(form.group),
    family: form.family,
    names: {
        he: form.names.he.trim(),
        en: form.names.en.trim() || null,
        site: form.site.name.trim() || null,
    },
    itemType: form.itemType,
    treeType: form.treeType,
    issueMethod: form.issueMethod,
    active: form.active,
    frozen: form.frozen,
    frozenFrom: form.frozenFrom,
    frozenTo: form.frozenTo,
    activeComment: form.activeComment.trim() || null,
    frozenComment: form.frozenComment.trim() || null,
    flags: { ...form.flags },
    barcode: form.barcode.trim() || null,
    additionalId: form.additionalId.trim() || null,
    picture: form.picture || null,
    suppliers: {
        preferred: form.suppliers.preferred || null,
        sapCode: form.suppliers.sapCode || null,
        catalogNum: form.suppliers.catalogNum.trim() || null,
    },
    uom: {
        stock: form.uom.stock,
        purchase: form.uom.purchase,
        sales: form.uom.sales,
        count: form.uom.count,
        price: form.uom.price,
        numInBuy: Number(form.uom.numInBuy) || 1,
        numInSale: Number(form.uom.numInSale) || 1,
        factor:
            Number(form.uom.numInSale) > 0
                ? Number(form.uom.numInBuy) / Number(form.uom.numInSale)
                : 1,
        group: form.uom.group,
        priceUnit: form.uom.price,
        packUom: form.uom.packUom.trim() || null,
        packQty: numberOrNull(form.uom.packQty),
    },
    levels: {
        min: numberOrNull(form.levels.min),
        max: numberOrNull(form.levels.max),
        reorder: numberOrNull(form.levels.reorder),
        minOrder: numberOrNull(form.levels.minOrder),
        leadTime: numberOrNull(form.levels.leadTime),
    },
    planning: { ...form.planning },
    price: {
        sale: numberOrNull(form.price.sale),
        saleUom: form.uom.sales,
        lastPurchase: numberOrNull(form.price.lastPurchase),
        currency: 'ILS',
        lastPurchaseOn: source.price?.lastPurchaseOn || null,
        evalPrice: numberOrNull(form.price.evalPrice),
        evalOn: source.price?.evalOn || null,
        avgPrice: source.price?.avgPrice ?? null,
    },
    accounting: { ...form.accounting },
    lab: {
        alcoholPct: numberOrNull(form.lab.alcoholPct),
        oilPct: numberOrNull(form.lab.oilPct),
        extractionRatio: form.lab.extractionRatio.trim() || null,
        packageSize: numberOrNull(form.lab.packageSize),
    },
    safety: {
        pregnancy: form.safety.pregnancy || null,
        lactation: form.safety.lactation || null,
        under2: form.safety.under2 || null,
    },
    site: {
        name: form.site.name.trim() || null,
        uom: form.site.uom || null,
        quantity: numberOrNull(form.site.quantity),
        comments: form.site.comments.trim() || null,
        categories: form.site.categories.filter(Boolean),
        sync: form.properties.includes(40),
        promo: form.properties.includes(20),
        therapistDiscount: form.properties.includes(19),
    },
    properties: [...form.properties].sort((a, b) => a - b),
    prepTypes: form.properties
        .map((code) => store.prepTypeBySap(code))
        .filter(Boolean),
    prices: source.prices || [],
    warehouses: source.warehouses || [],
    remarks: form.remarks.trim() || null,
    saleText: form.saleText.trim() || null,
    priceGroup: form.priceGroup || null,
}));

function toggleProperty(code) {
    form.properties = form.properties.includes(code)
        ? form.properties.filter((one) => one !== code)
        : [...form.properties, code];
}

/** A picture the creator picks is held as a data URL — the demo stores no files. */
function onPicture(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        form.picture = String(reader.result);
    };
    reader.readAsDataURL(file);
}

const groupOptions = computed(() =>
    store.itemGroups.map((group) => ({
        value: group.code,
        label: `${group.name} · ${group.code}`,
    })),
);

const familyOptions = computed(() =>
    Object.entries(ITEM_FAMILY).map(([id, family]) => ({
        value: id,
        label: `${t(`items.family.${id}`)} · ${family.prefix}`,
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

const issueMethodOptions = computed(() =>
    ISSUE_METHOD_IDS.map((id) => ({
        value: id,
        label: t(`items.issueMethod.${id}`),
    })),
);

const planningOptions = computed(() =>
    PLANNING_METHOD_IDS.map((id) => ({
        value: id,
        label: t(`items.planningMethod.${id}`),
    })),
);

const procurementOptions = computed(() =>
    PROCUREMENT_METHOD_IDS.map((id) => ({
        value: id,
        label: t(`items.procurementMethod.${id}`),
    })),
);

const componentWarehouseOptions = computed(() =>
    COMPONENT_WAREHOUSE_IDS.map((id) => ({
        value: id,
        label: t(`items.componentWarehouse.${id}`),
    })),
);

const valuationOptions = computed(() =>
    VALUATION_METHOD_IDS.map((id) => ({
        value: id,
        label: t(`items.valuation.${id}`),
    })),
);

const uomOptions = computed(() =>
    ITEM_UOM_IDS.map((id) => ({ value: id, label: t(`items.uom.${id}`) })),
);

const uomOptionsBlank = computed(() => [
    { value: '', label: t('items.editor.none') },
    ...uomOptions.value,
]);

const uomGroupOptions = computed(() =>
    UOM_GROUP_IDS.map((id) => ({
        value: id,
        label: t(`items.uomGroup.${id}`),
    })),
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

/** Only the properties SAP actually named are offered; the rest are blanks. */
const propertyOptions = computed(() =>
    store.itemProperties.filter(
        (property) =>
            property.items > 0 || form.properties.includes(property.code),
    ),
);

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
        : t('items.editor.editTitle', { name: props.item.names.he }),
);
</script>

<template>
    <AModal open :title="title" :width="1040" @close="emit('close')">
        <div class="ie">
            <!-- general: SAP's header and General tab -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.general') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.group') }}
                            <span class="req">*</span></label
                        >
                        <ASelect
                            v-model="form.group"
                            :options="groupOptions"
                            class="a-w100"
                            @blur="mark('group')"
                        />
                        <div v-if="show('group')" class="a-inv">
                            {{ show('group') }}
                        </div>
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
                            t('items.editor.family')
                        }}</label>
                        <ASelect
                            v-model="form.family"
                            :options="familyOptions"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('items.editor.familyHint') }}
                        </div>
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
                            t('items.editor.nameForeign')
                        }}</label>
                        <AInput v-model="form.names.en" ltr class="a-w100" />
                        <div class="a-hint">
                            {{ t('items.editor.nameForeignHint') }}
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
                            t('items.editor.uomGroup')
                        }}</label>
                        <ASelect
                            v-model="form.uom.group"
                            :options="uomGroupOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.barcode')
                        }}</label>
                        <AInput v-model="form.barcode" ltr class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.additionalId')
                        }}</label>
                        <AInput
                            v-model="form.additionalId"
                            ltr
                            class="a-w100"
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

                <div class="a-3col top">
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
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.frozen')
                        }}</label>
                        <label class="check switch">
                            <ASwitch v-model="form.frozen" />
                            {{
                                form.frozen
                                    ? t('items.card.frozenYes')
                                    : t('items.card.frozenNo')
                            }}
                        </label>
                    </div>
                    <div v-if="form.frozen">
                        <label class="a-lbl">{{
                            t('items.editor.frozenComment')
                        }}</label>
                        <AInput
                            v-model="form.frozenComment"
                            class="a-w100"
                            :maxlength="30"
                        />
                    </div>
                </div>

                <div class="a-3col top">
                    <div>
                        <label class="a-lbl">{{
                            t('items.editor.picture')
                        }}</label>
                        <div class="pic-row">
                            <div v-if="form.picture" class="pic-box">
                                <img :src="form.picture" :alt="form.names.he" />
                            </div>
                            <div v-else class="pic-box is-empty">
                                {{ t('items.card.noPicture') }}
                            </div>
                            <div class="pic-acts">
                                <input
                                    id="item-picture"
                                    type="file"
                                    accept="image/*"
                                    class="file"
                                    @change="onPicture"
                                />
                                <label
                                    class="a-btn a-btn--sm"
                                    for="item-picture"
                                >
                                    {{ t('items.editor.picturePick') }}
                                </label>
                                <AButton
                                    v-if="form.picture"
                                    sm
                                    kind="ghost"
                                    @click="form.picture = ''"
                                >
                                    {{ t('items.editor.pictureClear') }}
                                </AButton>
                            </div>
                        </div>
                        <div class="a-hint">
                            {{ t('items.editor.pictureHint') }}
                        </div>
                    </div>
                </div>
            </section>

            <!-- purchasing and sales -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.trade') }}</div>
                <ActionGate id="item_price" compact>
                    <div class="a-3col">
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
                                t('items.card.catalogNum')
                            }}</label>
                            <AInput
                                v-model="form.suppliers.catalogNum"
                                ltr
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.lastPurchase')
                            }}</label>
                            <AInput
                                v-model="form.price.lastPurchase"
                                type="number"
                                ltr
                                class="a-w100"
                                @blur="mark('price')"
                            />
                            <div v-if="show('price')" class="a-inv">
                                {{ show('price') }}
                            </div>
                            <div v-else class="a-hint">
                                {{ t('items.editor.lastPurchaseHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.purchaseUom')
                            }}</label>
                            <ASelect
                                v-model="form.uom.purchase"
                                :options="uomOptions"
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.numInBuy')
                            }}</label>
                            <AInput
                                v-model="form.uom.numInBuy"
                                type="number"
                                step="0.001"
                                ltr
                                class="a-w100"
                                @blur="mark('numIn')"
                            />
                            <div class="a-hint">
                                {{
                                    t('items.editor.numInHint', {
                                        unit: t(`items.uom.${form.uom.stock}`),
                                    })
                                }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.packUom')
                            }}</label>
                            <div class="pair">
                                <AInput v-model="form.uom.packUom" ltr />
                                <AInput
                                    v-model="form.uom.packQty"
                                    type="number"
                                    ltr
                                />
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.salesUom')
                            }}</label>
                            <ASelect
                                v-model="form.uom.sales"
                                :options="uomOptions"
                                class="a-w100"
                            />
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.numInSale')
                            }}</label>
                            <AInput
                                v-model="form.uom.numInSale"
                                type="number"
                                step="0.001"
                                ltr
                                class="a-w100"
                                @blur="mark('numIn')"
                            />
                            <div v-if="show('numIn')" class="a-inv">
                                {{ show('numIn') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.editor.priceUom')
                            }}</label>
                            <ASelect
                                v-model="form.uom.price"
                                :options="uomOptions"
                                class="a-w100"
                            />
                            <div class="a-hint">
                                {{ t('items.editor.priceUomHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl">{{
                                t('items.card.salePrice')
                            }}</label>
                            <AInput
                                v-model="form.price.sale"
                                type="number"
                                ltr
                                class="a-w100"
                            />
                            <div class="a-hint">
                                {{
                                    t('items.editor.salePriceHint', {
                                        uom: t(`items.uom.${form.uom.sales}`),
                                    })
                                }}
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
                    </div>
                </ActionGate>
            </section>

            <!-- inventory -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.inventory') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.stockUom')
                        }}</label>
                        <ASelect
                            v-model="form.uom.stock"
                            :options="uomOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.countUom')
                        }}</label>
                        <ASelect
                            v-model="form.uom.count"
                            :options="uomOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.valuation')
                        }}</label>
                        <ASelect
                            v-model="form.accounting.valuation"
                            :options="valuationOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.minLevel')
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
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.maxLevel')
                        }}</label>
                        <AInput
                            v-model="form.levels.max"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('levels')"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.reorderQty')
                        }}</label>
                        <AInput
                            v-model="form.levels.reorder"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('levels')"
                        />
                    </div>
                </div>
                <div class="flags">
                    <label class="check">
                        <input
                            v-model="form.accounting.byWarehouse"
                            type="checkbox"
                            class="a-check"
                        />
                        {{ t('items.card.byWarehouse') }}
                    </label>
                    <label class="check">
                        <input
                            v-model="form.accounting.noDiscount"
                            type="checkbox"
                            class="a-check"
                        />
                        {{ t('items.card.noDiscount') }}
                    </label>
                    <label class="check">
                        <input
                            v-model="form.accounting.inCostRoll"
                            type="checkbox"
                            class="a-check"
                        />
                        {{ t('items.card.inCostRoll') }}
                    </label>
                </div>
            </section>

            <!-- planning and production -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.planning') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.planningMethod')
                        }}</label>
                        <ASelect
                            v-model="form.planning.method"
                            :options="planningOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.procurementMethod')
                        }}</label>
                        <ASelect
                            v-model="form.planning.procurement"
                            :options="procurementOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.minOrderQty')
                        }}</label>
                        <AInput
                            v-model="form.levels.minOrder"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('levels')"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.leadTime')
                        }}</label>
                        <AInput
                            v-model="form.levels.leadTime"
                            type="number"
                            ltr
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.treeType')
                        }}</label>
                        <ASelect
                            v-model="form.treeType"
                            :options="treeTypeOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.issueMethod')
                        }}</label>
                        <ASelect
                            v-model="form.issueMethod"
                            :options="issueMethodOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.componentWarehouse')
                        }}</label>
                        <ASelect
                            v-model="form.planning.componentWarehouse"
                            :options="componentWarehouseOptions"
                            class="a-w100"
                        />
                    </div>
                </div>
            </section>

            <!-- the sixty-four properties, and the lab's own numbers -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.properties') }}</div>
                <p class="a-hint">{{ t('items.editor.propertiesHint') }}</p>
                <div class="prop-grid">
                    <label
                        v-for="property in propertyOptions"
                        :key="property.code"
                        class="check"
                    >
                        <input
                            type="checkbox"
                            class="a-check"
                            :checked="form.properties.includes(property.code)"
                            @change="toggleProperty(property.code)"
                        />
                        {{ property.name }}
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
                            t('items.card.oilPct')
                        }}</label>
                        <AInput
                            v-model="form.lab.oilPct"
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
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.packageSize')
                        }}</label>
                        <AInput
                            v-model="form.lab.packageSize"
                            type="number"
                            ltr
                            class="a-w100"
                        />
                    </div>
                </div>
            </section>

            <!-- the consumer site's own fields -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.site') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.siteName')
                        }}</label>
                        <AInput v-model="form.site.name" class="a-w100" />
                        <div class="a-hint">
                            {{ t('items.editor.siteNameHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.siteQty')
                        }}</label>
                        <div class="pair">
                            <AInput
                                v-model="form.site.quantity"
                                type="number"
                                ltr
                            />
                            <ASelect
                                v-model="form.site.uom"
                                :options="uomOptionsBlank"
                            />
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.siteComments')
                        }}</label>
                        <AInput
                            v-model="form.site.comments"
                            class="a-w100"
                            :maxlength="150"
                        />
                    </div>
                </div>
                <div class="a-lbl top">{{ t('items.card.categories') }}</div>
                <div class="a-2col">
                    <ASelect
                        v-for="(cat, i) in form.site.categories"
                        :key="i"
                        v-model="form.site.categories[i]"
                        :options="categoryOptions"
                        class="a-w100"
                    />
                </div>
                <div class="top">
                    <label class="a-lbl">{{ t('items.card.saleText') }}</label>
                    <ATextarea
                        v-model="form.saleText"
                        :rows="3"
                        class="a-w100"
                    />
                    <div class="a-hint">
                        {{ t('items.editor.saleTextHint') }}
                    </div>
                </div>
            </section>

            <!-- SAP's remarks field -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.remarks') }}</div>
                <ATextarea v-model="form.remarks" :rows="4" class="a-w100" />
                <div class="a-hint">{{ t('items.editor.remarksHint') }}</div>
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

.prop-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 16px;
    margin-top: 8px;
}

.pic-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 6px;
}

.pic-box {
    width: 84px;
    height: 84px;
    border-radius: var(--a-r);
    border: 1px solid var(--a-line);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
}

.pic-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pic-box.is-empty {
    color: var(--a-ink-4);
    font-size: 11px;
    text-align: center;
    padding: 6px;
}

.pic-acts {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.file {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
}
</style>
