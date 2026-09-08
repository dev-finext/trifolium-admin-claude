<script setup>
// Add or edit one item — the whole card in one form.
//
// The mandatory-field policy is enforced here and nowhere else: the family says
// which fields it requires, the form lists what is still missing, and the person
// saving either fills the field or ticks a waiver for it. A waiver is recorded on
// the item and shown on its card, so nothing is silently incomplete.
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
    CURRENCY_IDS,
    ITEM_FAMILY_IDS,
    ITEM_FLAG_IDS,
    ITEM_UOM_IDS,
    SAFETY_CONTEXT_IDS,
    SAFETY_LEVEL_IDS,
    SITE_CATEGORY_SLOTS,
} from '@/config';
import { isLocalized, L } from '@/lib/localized';
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

const isNew = computed(() => !props.item.sku);
const touched = reactive({});
const codeTouched = ref(Boolean(props.item.code));

const source = props.item;

/** A note travels as `{ he, en }`; the form edits the Hebrew source and keeps the English. */
function noteText(value) {
    return isLocalized(value) ? value.he : value || '';
}

function noteRecord(text, previous) {
    const typed = text.trim();

    if (!typed) {
        return null;
    }

    return isLocalized(previous) && previous.he !== typed
        ? L(typed, previous.en || typed)
        : isLocalized(previous)
          ? previous
          : L(typed, typed);
}

const form = reactive({
    family: source.family || 'herb',
    sku: source.sku || '',
    code: source.code || store.nextCode(source.family || 'herb'),
    names: {
        he: source.names?.he || '',
        en: source.names?.en || '',
        lat: source.names?.lat || '',
        cn: source.names?.cn || '',
        site: source.names?.site || '',
    },
    uom: {
        purchase: source.uom?.purchase || 'kg',
        sales: source.uom?.sales || 'g',
        factor: source.uom?.factor != null ? String(source.uom.factor) : '1000',
    },
    flags: {
        purchase: source.flags?.purchase ?? true,
        sales: source.flags?.sales ?? true,
        inventory: source.flags?.inventory ?? true,
        batch: source.flags?.batch ?? true,
        consumable: source.flags?.consumable ?? false,
    },
    location: {
        cabinet:
            source.location?.cabinet != null
                ? String(source.location.cabinet)
                : '',
        shelf:
            source.location?.shelf != null ? String(source.location.shelf) : '',
    },
    price: {
        sale: source.price?.sale != null ? String(source.price.sale) : '',
        lastPurchase:
            source.price?.lastPurchase != null
                ? String(source.price.lastPurchase)
                : '',
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
    notes: {
        internal: noteText(source.notes?.internal),
        production: noteText(source.notes?.production),
    },
    site: {
        sync: source.site?.sync ?? false,
        categories: Array.from(
            { length: SITE_CATEGORY_SLOTS },
            (_, i) => source.site?.categories?.[i] || '',
        ),
        promo: source.site?.promo ?? false,
        marketing: noteText(source.site?.marketing),
        qty: source.site?.qty != null ? String(source.site.qty) : '',
        unit: source.site?.unit || '',
    },
    waived: [...(source.waived || [])],
});

// A new item's code follows its family until the code is typed by hand.
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

const normalizedSku = computed(() =>
    form.sku.toUpperCase().replace(/\s+/g, ''),
);

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
        sku: !isNew.value
            ? ''
            : !normalizedSku.value
              ? t('items.validate.skuMissing')
              : !/^[0-9A-Z-]{3,20}$/.test(normalizedSku.value)
                ? t('items.validate.skuFormat')
                : store.skuTaken(normalizedSku.value)
                  ? t('items.validate.skuTaken')
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
        sale:
            form.price.sale !== '' && !(Number(form.price.sale) >= 0)
                ? t('items.validate.number')
                : '',
        lastPurchase:
            form.price.lastPurchase !== '' &&
            !(Number(form.price.lastPurchase) >= 0)
                ? t('items.validate.number')
                : '',
    };
});

const hasErrors = computed(() => Object.values(errors.value).some(Boolean));

function show(field) {
    return touched[field] ? errors.value[field] : '';
}

/** The record the store will receive, built once so the policy check sees it too. */
const draft = computed(() => ({
    sku: isNew.value ? normalizedSku.value : props.item.sku,
    code: form.code.trim(),
    family: form.family,
    names: {
        he: form.names.he.trim(),
        en: form.names.en.trim() || null,
        lat: form.names.lat.trim() || null,
        cn: form.names.cn.trim() || null,
        site: form.names.site.trim() || null,
    },
    uom: {
        purchase: form.uom.purchase,
        sales: form.uom.sales,
        factor: Number(form.uom.factor) || 1,
    },
    flags: { ...form.flags },
    location: form.location.cabinet.trim()
        ? {
              cabinet: form.location.cabinet.trim(),
              shelf: form.location.shelf.trim() || null,
          }
        : null,
    price: {
        sale: form.price.sale === '' ? null : Number(form.price.sale),
        lastPurchase:
            form.price.lastPurchase === ''
                ? null
                : Number(form.price.lastPurchase),
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
    notes: {
        internal: noteRecord(form.notes.internal, source.notes?.internal),
        production: noteRecord(form.notes.production, source.notes?.production),
    },
    site: {
        sync: form.site.sync,
        categories: form.site.categories.filter(Boolean),
        promo: form.site.promo,
        marketing: noteRecord(form.site.marketing, source.site?.marketing),
        qty: form.site.qty === '' ? null : Number(form.site.qty),
        unit: form.site.unit || null,
    },
    waived: [],
}));

/** Mandatory fields of this family still empty — the waiver list. */
const missing = computed(() => store.missingOf(draft.value));

/** Waivers that still matter: a waiver on a field that got filled is dropped on save. */
const liveWaived = computed(() =>
    form.waived.filter((field) => missing.value.includes(field)),
);

const unwaived = computed(() =>
    missing.value.filter((field) => !form.waived.includes(field)),
);

const valid = computed(() => !hasErrors.value && unwaived.value.length === 0);

function toggleWaiver(field) {
    form.waived = form.waived.includes(field)
        ? form.waived.filter((id) => id !== field)
        : [...form.waived, field];
}

function togglePrep(id) {
    form.prepTypes = form.prepTypes.includes(id)
        ? form.prepTypes.filter((type) => type !== id)
        : [...form.prepTypes, id];
}

const familyOptions = computed(() =>
    ITEM_FAMILY_IDS.map((id) => ({
        value: id,
        label: t(`items.family.${id}`),
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

const mandatoryLabels = computed(() =>
    store.mandatoryOf(form.family).map((id) => t(`items.mandatory.${id}`)),
);

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await store.saveItem(
        { ...draft.value, waived: liveWaived.value },
        props.item.sku || null,
    );

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
            <!-- identity -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.identity') }}</div>
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
                        <div class="a-hint">
                            {{
                                t('items.editor.familyHint', {
                                    fields:
                                        mandatoryLabels.join(' · ') ||
                                        t('items.editor.none'),
                                })
                            }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.code') }}
                            <span class="req">*</span></label
                        >
                        <AInput
                            v-model="form.code"
                            ltr
                            class="a-w100"
                            @input="codeTouched = true"
                            @blur="mark('code')"
                        />
                        <div v-if="show('code')" class="a-inv">
                            {{ show('code') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('items.editor.codeHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl"
                            >{{ t('items.editor.sku') }}
                            <span v-if="isNew" class="req">*</span></label
                        >
                        <AInput
                            v-if="isNew"
                            v-model="form.sku"
                            ltr
                            class="a-w100"
                            @blur="mark('sku')"
                        />
                        <div v-else class="a-code a-tag ro">{{ item.sku }}</div>
                        <div v-if="show('sku')" class="a-inv">
                            {{ show('sku') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('items.editor.skuHint') }}
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
                            t('items.editor.nameEn')
                        }}</label>
                        <AInput v-model="form.names.en" ltr class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl">{{ t('items.editor.lat') }}</label>
                        <AInput v-model="form.names.lat" ltr class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl">{{ t('items.editor.cn') }}</label>
                        <AInput v-model="form.names.cn" class="a-w100" />
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
                            t('items.editor.location')
                        }}</label>
                        <div class="pair">
                            <AInput
                                v-model="form.location.cabinet"
                                ltr
                                :placeholder="t('items.editor.cabinet')"
                            />
                            <AInput
                                v-model="form.location.shelf"
                                ltr
                                :placeholder="t('items.editor.shelf')"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <!-- units & flags -->
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
                                    sales: t(`items.uom.${form.uom.sales}`),
                                })
                            }}
                        </div>
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
                    <label class="check switch">
                        <ASwitch
                            v-model="form.flags.consumable"
                            :label="t('items.card.consumable')"
                        />
                        {{ t('items.card.consumable') }}
                        <span class="a-hint inline">{{
                            t('items.editor.consumableHint')
                        }}</span>
                    </label>
                </div>
            </section>

            <!-- pricing & suppliers -->
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
                                {{ t('items.editor.salePriceHint') }}
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
                    </div>
                </ActionGate>
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
                </div>
            </section>

            <!-- notes -->
            <section>
                <div class="a-sect-t">{{ t('items.editor.notes') }}</div>
                <div class="a-2col">
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.internal')
                        }}</label>
                        <ATextarea
                            v-model="form.notes.internal"
                            :rows="3"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('items.editor.internalHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('items.card.production')
                        }}</label>
                        <ATextarea
                            v-model="form.notes.production"
                            :rows="3"
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('items.editor.productionHint') }}
                        </div>
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
                            t('items.card.marketing')
                        }}</label>
                        <ATextarea
                            v-model="form.site.marketing"
                            :rows="2"
                            class="a-w100"
                        />
                    </div>
                </div>
            </section>

            <!-- the policy -->
            <section v-if="missing.length" class="policy">
                <div class="a-sect-t">{{ t('items.editor.policy') }}</div>
                <p class="a-hint">{{ t('items.editor.policyHint') }}</p>
                <div class="waivers">
                    <label v-for="field in missing" :key="field" class="check">
                        <input
                            type="checkbox"
                            class="a-check"
                            :checked="form.waived.includes(field)"
                            @change="toggleWaiver(field)"
                        />
                        <span>
                            <strong>{{ t(`items.mandatory.${field}`) }}</strong>
                            <span class="t-sub">
                                — {{ t('items.editor.waive') }}</span
                            >
                        </span>
                    </label>
                </div>
            </section>
            <p v-else class="a-note a-note--ok">
                {{ t('items.editor.policyOk') }}
            </p>
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
            <span v-else-if="unwaived.length" class="a-rf-need">
                {{
                    t('items.editor.missing', {
                        fields: unwaived
                            .map((f) => t(`items.mandatory.${f}`))
                            .join(' · '),
                    })
                }}
            </span>
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
}

.a-hint.inline {
    margin: 0;
}

.prep-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 16px;
}

.span2 {
    grid-column: span 2;
}

.policy {
    padding: 14px 16px;
    border-radius: var(--a-r);
    background: var(--a-amber-bg);
    border: 1px solid var(--a-amber-line);
}

.waivers {
    display: grid;
    gap: 8px;
}
</style>
