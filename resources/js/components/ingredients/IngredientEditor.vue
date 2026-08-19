<script setup>
// Add or edit one formula ingredient.
//
// This is the only place an ingredient is created. Stock is not shown: quantity
// enters through a goods receipt and this form owns identity, codes, unit,
// default warehouse and the minimum that blocks the ingredient in the wizard.
//
// The name is a localized record. Editing changes the text for the language the
// console is in and leaves the other language untouched; a new ingredient takes
// the typed name in both, so it reads in either language until translated.
import { computed, reactive, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { INGREDIENT_KINDS, WAREHOUSE_IDS } from '@/config';
import { isLocalized, L, loc as resolve } from '@/lib/localized';
import { useCatalogStore } from '@/stores/catalog';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The ingredient being edited; `{}` for a new one. */
    item: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();
const inventory = useInventoryStore();
const uid = useId();

const UNITS = ['g', 'ml', 'unit'];
const SYSTEMS = ['west', 'chinese'];

const isNew = computed(() => !props.item.sku);
const touched = reactive({});

const form = reactive({
    kind: props.item.kind || 'raw',
    name: props.item.name ? loc(props.item.name) : '',
    lat: props.item.lat || '',
    cn: props.item.cn || '',
    sku: props.item.sku || '',
    priceSku: props.item.priceSku || '',
    unit: props.item.unit || 'g',
    wh: props.item.wh || 'raw',
    min: props.item.min != null ? String(props.item.min) : '',
    system: props.item.system || 'west',
});

function mark(field) {
    touched[field] = true;
}

const normalizedSku = computed(() =>
    form.sku.toUpperCase().replace(/\s+/g, ''),
);

const errors = computed(() => {
    const name = form.name.trim();
    const sku = normalizedSku.value;
    const price = form.priceSku.trim();
    const min = form.min.trim();

    return {
        name:
            name.length < 2
                ? t('ingredients.validate.nameShort')
                : name.length > 80
                  ? t('ingredients.validate.nameLong')
                  : '',
        sku: !sku
            ? t('ingredients.validate.skuMissing')
            : sku.length < 3 || sku.length > 20
              ? t('ingredients.validate.skuLength')
              : !/^[0-9A-Z-]+$/.test(sku)
                ? t('ingredients.validate.skuChars')
                : inventory.skuTaken(sku, 'sku', props.item.sku)
                  ? t('ingredients.validate.skuTaken')
                  : '',
        priceSku: !price
            ? ''
            : !/^\d{3,8}$/.test(price)
              ? t('ingredients.validate.priceFormat')
              : inventory.skuTaken(price, 'priceSku', props.item.sku)
                ? t('ingredients.validate.priceTaken')
                : '',
        min: !min
            ? t('ingredients.validate.minMissing')
            : !/^\d+$/.test(min)
              ? t('ingredients.validate.minInteger')
              : Number(min) > 999999
                ? t('ingredients.validate.minHigh')
                : '',
    };
});

const missing = computed(() =>
    ['name', 'sku', 'priceSku', 'min']
        .filter((field) => errors.value[field])
        .map((field) => t(`ingredients.field.${field}`)),
);

const valid = computed(() => missing.value.length === 0);

function show(field) {
    return touched[field] ? errors.value[field] : '';
}

/** The pricing group the code resolves to, shown live under the field. */
const resolvedGroup = computed(() => {
    const price = form.priceSku.trim();

    if (!price || errors.value.priceSku) {
        return null;
    }

    return catalog.resolveSku(price);
});

const kindOptions = computed(() =>
    INGREDIENT_KINDS.map((id) => ({
        value: id,
        label: t(`ingredients.kind.${id}`),
    })),
);

const unitOptions = computed(() =>
    UNITS.map((id) => ({ value: id, label: t(`ingredients.unit.${id}`) })),
);

const warehouseOptions = computed(() =>
    WAREHOUSE_IDS.map((id) => ({
        value: id,
        label: t(`warehouse.${id}.name`),
    })),
);

const systemOptions = computed(() =>
    SYSTEMS.map((id) => ({ value: id, label: t(`ingredients.system.${id}`) })),
);

function onKind(next) {
    form.kind = next;

    if (next === 'pack') {
        form.unit = 'unit';
    }
}

/** Build the localized name: keep the other language on an edit, mirror on new. */
function nameRecord() {
    const typed = form.name.trim();

    if (isNew.value || !isLocalized(props.item.name)) {
        return L(typed, typed);
    }

    const other = locale.value === 'he' ? 'en' : 'he';

    return locale.value === 'he'
        ? L(typed, resolve(props.item.name, other) || typed)
        : L(resolve(props.item.name, other) || typed, typed);
}

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await inventory.saveIngredient(
        {
            kind: form.kind,
            name: nameRecord(),
            lat: form.lat.trim(),
            cn: form.cn.trim(),
            sku: normalizedSku.value,
            priceSku: form.priceSku.trim(),
            unit: form.unit,
            wh: form.wh,
            min: Number(form.min),
            system: form.system,
        },
        props.item.sku || null,
    );

    emit('saved', {
        created: result.created,
        name: form.name.trim(),
        sku: normalizedSku.value,
    });
}

const title = computed(() =>
    isNew.value
        ? t('ingredients.editor.newTitle')
        : t('ingredients.editor.editTitle', { name: loc(props.item.name) }),
);
</script>

<template>
    <AModal open :title="title" :width="880" @close="emit('close')">
        <div class="a-ing-form">
            <div>
                <div class="a-sect-t">
                    {{ t('ingredients.editor.identity') }}
                </div>
                <div class="a-2col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-name`">
                            {{ t('ingredients.editor.name') }}
                            <span class="req-star">*</span>
                        </label>
                        <AInput
                            :id="`${uid}-name`"
                            v-model="form.name"
                            class="a-w100"
                            @blur="mark('name')"
                        />
                        <div v-if="show('name')" class="a-inv">
                            {{ show('name') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('ingredients.editor.nameHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-kind`">
                            {{ t('ingredients.editor.kind') }}
                            <span class="req-star">*</span>
                        </label>
                        <ASelect
                            :id="`${uid}-kind`"
                            :model-value="form.kind"
                            :options="kindOptions"
                            class="a-w100"
                            @update:model-value="onKind"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-lat`">
                            {{ t('ingredients.editor.lat') }}
                        </label>
                        <AInput
                            :id="`${uid}-lat`"
                            v-model="form.lat"
                            ltr
                            class="a-w100"
                        />
                        <div class="a-hint">
                            {{ t('ingredients.editor.latHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-cn`">
                            {{ t('ingredients.editor.cn') }}
                        </label>
                        <AInput
                            :id="`${uid}-cn`"
                            v-model="form.cn"
                            class="a-w100"
                        />
                    </div>
                </div>
            </div>

            <div>
                <div class="a-sect-t">{{ t('ingredients.editor.codes') }}</div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-sku`">
                            {{ t('ingredients.editor.sku') }}
                            <span class="req-star">*</span>
                        </label>
                        <AInput
                            :id="`${uid}-sku`"
                            v-model="form.sku"
                            ltr
                            class="a-w100"
                            @blur="mark('sku')"
                        />
                        <div v-if="show('sku')" class="a-inv">
                            {{ show('sku') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('ingredients.editor.skuHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-price`">
                            {{ t('ingredients.editor.priceSku') }}
                        </label>
                        <AInput
                            :id="`${uid}-price`"
                            v-model="form.priceSku"
                            ltr
                            class="a-w100"
                            @blur="mark('priceSku')"
                        />
                        <div v-if="show('priceSku')" class="a-inv">
                            {{ show('priceSku') }}
                        </div>
                        <div
                            v-else-if="resolvedGroup"
                            class="a-hint a-hint--ok"
                        >
                            {{
                                t('ingredients.editor.priceGroupResolved', {
                                    group: loc(resolvedGroup.name),
                                })
                            }}
                        </div>
                        <div v-else-if="form.priceSku.trim()" class="a-hint">
                            {{ t('ingredients.editor.priceGroupNone') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('ingredients.editor.priceHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-wh`">
                            {{ t('ingredients.editor.warehouse') }}
                        </label>
                        <ASelect
                            :id="`${uid}-wh`"
                            v-model="form.wh"
                            :options="warehouseOptions"
                            class="a-w100"
                        />
                    </div>
                </div>
            </div>

            <div>
                <div class="a-sect-t">
                    {{ t('ingredients.editor.availability') }}
                </div>
                <div class="a-3col">
                    <div>
                        <label class="a-lbl" :for="`${uid}-unit`">
                            {{ t('ingredients.editor.unit') }}
                        </label>
                        <ASelect
                            :id="`${uid}-unit`"
                            v-model="form.unit"
                            :options="unitOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-system`">
                            {{ t('ingredients.editor.system') }}
                        </label>
                        <ASelect
                            :id="`${uid}-system`"
                            v-model="form.system"
                            :options="systemOptions"
                            class="a-w100"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-min`">
                            {{ t('ingredients.editor.min') }}
                            <span class="req-star">*</span>
                        </label>
                        <AInput
                            :id="`${uid}-min`"
                            v-model="form.min"
                            type="number"
                            ltr
                            class="a-w100"
                            @blur="mark('min')"
                        />
                        <div v-if="show('min')" class="a-inv">
                            {{ show('min') }}
                        </div>
                        <div v-else class="a-hint">
                            {{ t('ingredients.editor.minHint') }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('ingredients.editor.createConfirm')
                        : t('ingredients.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
            <span v-if="!valid" class="a-rf-need">
                {{
                    t('ingredients.editor.missing', {
                        fields: missing.join(' · '),
                    })
                }}
            </span>
        </template>
    </AModal>
</template>

<style scoped>
.req-star {
    color: var(--a-red);
}

.a-hint--ok {
    color: var(--a-accent);
}
</style>
