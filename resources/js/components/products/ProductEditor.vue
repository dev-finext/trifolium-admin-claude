<script setup>
// Add or edit one shelf product.
//
// Saving publishes: a product the pharmacy has finished describing belongs in
// the practitioner catalogue, so there is no separate publish step and no draft
// state to forget about. Stock is read-only here — it is owned by the stock and
// batches screen — but the minimum that blocks the product for sale is set here.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import LabelMultiSelect from '@/components/products/LabelMultiSelect.vue';
import LabelsManager from '@/components/products/LabelsManager.vue';
import PriceSimulation from '@/components/products/PriceSimulation.vue';
import ProductImageDrop from '@/components/products/ProductImageDrop.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AInput from '@/components/ui/AInput.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { DEFAULT_MIN_STOCK, UNITS } from '@/config';
import { isLocalized, L } from '@/lib/localized';
import { PRODUCT_RULES, normalizeSku, useCatalogStore } from '@/stores/catalog';

const props = defineProps({
    /** The product being edited; `{}` for a new one. */
    product: { type: Object, required: true },
    full: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'save', 'toggle-full']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const catalog = useCatalogStore();
const uid = useId();

const rules = PRODUCT_RULES;
const isNew = computed(() => !props.product.id);

/** Everything the form owns, as strings — the values are parsed on save. */
function blank() {
    const source = props.product;

    return {
        name: source.name ? loc(source.name) : '',
        content: source.content ? loc(source.content) : '',
        net: source.net != null ? String(source.net) : '',
        sku: source.sku || '',
        labels: [...(source.labels || [])],
        wUom: source.wUom || '',
        wVal: source.wVal != null ? String(source.wVal) : '',
        minStock: String(
            source.minStock == null ? DEFAULT_MIN_STOCK : source.minStock,
        ),
        img: source.img || null,
    };
}

const f = ref(blank());
const initial = JSON.stringify(f.value);
const touched = ref({});
const managerOpen = ref(false);
const ask = ref(null);

const dirty = computed(() => JSON.stringify(f.value) !== initial);
const stockNow = computed(() =>
    props.product.stock == null ? 0 : props.product.stock,
);
const minWanted = computed(
    () => Number(f.value.minStock || DEFAULT_MIN_STOCK) || 0,
);
const blocked = computed(() => stockNow.value < minWanted.value);

const unitOptions = computed(() =>
    UNITS.map((unit) => ({ value: unit, label: t(`products.unit.${unit}`) })),
);

const skuNormal = computed(() => normalizeSku(f.value.sku));
const skuTaken = computed(
    () =>
        Boolean(skuNormal.value) &&
        catalog.products.some(
            (row) =>
                row.id !== props.product.id &&
                normalizeSku(row.sku) === skuNormal.value,
        ),
);

const errors = computed(() => {
    const name = f.value.name.trim();
    const content = f.value.content.trim();
    const net = f.value.net.trim();
    const sku = skuNormal.value;
    const min = String(f.value.minStock).trim();
    const weight = f.value.wVal.trim();

    return {
        name:
            name.length < rules.name.min
                ? t('products.editor.fields.name.tooShort')
                : name.length > rules.name.max
                  ? t('products.editor.fields.name.tooLong', {
                        max: rules.name.max,
                    })
                  : '',
        content: !content
            ? t('products.editor.fields.content.required')
            : content.length > rules.content.max
              ? t('products.editor.fields.content.tooLong', {
                    max: rules.content.max,
                })
              : '',
        net: !net
            ? t('products.editor.fields.net.required')
            : !/^\d+(\.\d{1,2})?$/.test(net) || Number(net) <= 0
              ? t('products.editor.fields.net.invalid')
              : '',
        sku: !sku
            ? t('products.editor.fields.sku.required')
            : sku.length < rules.sku.min || sku.length > rules.sku.max
              ? t('products.editor.fields.sku.length', {
                    min: rules.sku.min,
                    max: rules.sku.max,
                })
              : !rules.sku.pattern.test(sku)
                ? t('products.editor.fields.sku.chars')
                : skuTaken.value
                  ? t('products.editor.fields.sku.taken')
                  : '',
        labels:
            f.value.labels.length > rules.maxLabels
                ? t('products.editor.fields.labels.tooMany', {
                      max: rules.maxLabels,
                  })
                : '',
        wUom: !f.value.wUom ? t('products.editor.fields.uom.required') : '',
        wVal:
            f.value.wUom && !(Number(weight) > 0)
                ? t('products.editor.fields.weight.required')
                : '',
        minStock: !min
            ? t('products.editor.fields.minStock.required')
            : !/^\d+$/.test(min)
              ? t('products.editor.fields.minStock.integer')
              : Number(min) > rules.minStock.max
                ? t('products.editor.fields.minStock.tooLarge', {
                      max: rules.minStock.max,
                  })
                : '',
    };
});

/** The short nouns the header lists while the form is not yet saveable. */
const missing = computed(() => {
    const e = errors.value;
    const need = [
        e.name && t('products.editor.need.name'),
        e.content && t('products.editor.need.content'),
        e.net && t('products.editor.need.net'),
        e.sku &&
            (skuTaken.value
                ? t('products.editor.need.skuUnique')
                : t('products.editor.need.sku')),
        e.labels && t('products.editor.need.labels', { max: rules.maxLabels }),
        (e.wUom || e.wVal) && t('products.editor.need.weight'),
        e.minStock && t('products.editor.need.minStock'),
    ];

    return need.filter(Boolean);
});

const valid = computed(() => missing.value.length === 0);

/** An error is only shown once the reader has left the field. */
const shown = (key) => (touched.value[key] ? errors.value[key] : '');
const mark = (key) => {
    touched.value = { ...touched.value, [key]: true };
};

/** Digits, and at most one decimal point. */
function onDecimal(key, event) {
    f.value[key] = event.target.value.replace(/[^\d.]/g, '');
}

function onDigits(key, event) {
    f.value[key] = event.target.value.replace(/\D/g, '');
}

function onSku(event) {
    f.value.sku = event.target.value.toUpperCase();
}

/** Keep the other language's text when only one side is being edited. */
function localized(existing, text) {
    return isLocalized(existing)
        ? { ...existing, [locale.value]: text }
        : L(text, text);
}

function build() {
    return {
        ...props.product,
        name: localized(props.product.name, f.value.name.trim()),
        content: localized(props.product.content, f.value.content.trim()),
        net: Number(f.value.net),
        sku: skuNormal.value,
        labels: [...f.value.labels],
        wUom: f.value.wUom,
        wVal: Number(f.value.wVal),
        minStock: Number(f.value.minStock),
        stock: stockNow.value,
        status: 'published',
        img: f.value.img,
    };
}

function save() {
    if (!valid.value) {
        return;
    }

    emit('save', build(), isNew.value);
}

function requestClose() {
    if (!dirty.value) {
        emit('close');

        return;
    }

    ask.value = {
        title: t('products.confirm.leave.title'),
        body: t('products.confirm.leave.body'),
        confirmLabel: t('products.confirm.leave.confirm'),
        effects: [
            t('products.confirm.leave.effect1'),
            t('products.confirm.leave.effect2'),
        ],
    };
}

function onLabelCreated(label) {
    f.value.labels = [...f.value.labels, label.id];
    managerOpen.value = false;
}

function onImageError(message) {
    push({
        title: t('products.image.loadFailed'),
        body: message,
        bad: true,
    });
}
</script>

<template>
    <div>
        <div class="a-dhead a-dhead--line">
            <div class="a-dhead-top">
                <div>
                    <div class="a-dhead-t">
                        <h2 class="a-ed-title">
                            {{
                                isNew
                                    ? t('products.editor.newTitle')
                                    : f.name.trim() ||
                                      t('products.editor.editTitle')
                            }}
                        </h2>
                        <AChip
                            v-if="!isNew"
                            :tone="catalog.statusTone(product.status)"
                            :dot="false"
                        >
                            {{ t(`products.status.${product.status}`) }}
                        </AChip>
                    </div>
                    <div class="a-dhead-m">
                        <span v-if="!isNew">
                            {{
                                t('products.editor.skuMeta', {
                                    sku: product.sku,
                                })
                            }}
                        </span>
                        <span>{{ t('products.editor.localCatalog') }}</span>
                    </div>
                </div>
                <div class="a-dhead-a">
                    <span v-if="dirty" class="a-ed-dirty">
                        {{ t('products.editor.unsaved') }}
                    </span>
                    <span v-if="!valid" class="a-ed-missing">
                        {{
                            t('products.editor.missing', {
                                list: missing.join(' · '),
                            })
                        }}
                    </span>
                    <AButton
                        kind="p"
                        icon="save"
                        :disabled="!valid"
                        @click="save"
                    >
                        {{
                            isNew
                                ? t('products.editor.saveNew')
                                : t('products.editor.save')
                        }}
                    </AButton>
                    <AButton
                        :icon="full ? 'chevron_left' : 'external'"
                        @click="emit('toggle-full')"
                    >
                        {{
                            full
                                ? t('products.editor.collapse')
                                : t('products.editor.full')
                        }}
                    </AButton>
                    <AButton icon="x" @click="requestClose">
                        {{ t('products.editor.close') }}
                    </AButton>
                </div>
            </div>
        </div>

        <div class="a-prodform">
            <div class="a-grid">
                <ACard
                    :title="t('products.editor.cards.details')"
                    icon="package"
                >
                    <div class="a-grid a-gap-lg">
                        <div>
                            <label class="a-lbl" :for="`${uid}-name`">
                                {{ t('products.editor.fields.name.label') }}
                            </label>
                            <AInput
                                :id="`${uid}-name`"
                                v-model="f.name"
                                class="a-w100"
                                :maxlength="rules.name.max + 10"
                                :placeholder="
                                    t('products.editor.fields.name.placeholder')
                                "
                                @blur="mark('name')"
                            />
                            <div v-if="shown('name')" class="a-inv">
                                {{ shown('name') }}
                            </div>
                            <div v-else class="a-hint">
                                {{
                                    t('products.editor.fields.name.hint', {
                                        min: rules.name.min,
                                        max: rules.name.max,
                                    })
                                }}
                            </div>
                        </div>

                        <div class="a-2col">
                            <div>
                                <label class="a-lbl" :for="`${uid}-content`">
                                    {{
                                        t(
                                            'products.editor.fields.content.label',
                                        )
                                    }}
                                </label>
                                <AInput
                                    :id="`${uid}-content`"
                                    v-model="f.content"
                                    class="a-w100"
                                    :maxlength="rules.content.max + 10"
                                    :placeholder="
                                        t(
                                            'products.editor.fields.content.placeholder',
                                        )
                                    "
                                    @blur="mark('content')"
                                />
                                <div v-if="shown('content')" class="a-inv">
                                    {{ shown('content') }}
                                </div>
                                <div v-else class="a-hint">
                                    {{
                                        t(
                                            'products.editor.fields.content.hint',
                                            { max: rules.content.max },
                                        )
                                    }}
                                </div>
                            </div>

                            <div>
                                <label class="a-lbl" :for="`${uid}-sku`">
                                    {{ t('products.editor.fields.sku.label') }}
                                </label>
                                <input
                                    :id="`${uid}-sku`"
                                    class="a-input a-w100 a-ltr-input"
                                    :value="f.sku"
                                    :maxlength="rules.sku.max"
                                    :placeholder="
                                        t(
                                            'products.editor.fields.sku.placeholder',
                                        )
                                    "
                                    @input="onSku"
                                    @blur="mark('sku')"
                                />
                                <div v-if="shown('sku')" class="a-inv">
                                    {{ shown('sku') }}
                                </div>
                                <div v-else class="a-hint">
                                    {{
                                        t('products.editor.fields.sku.hint', {
                                            min: rules.sku.min,
                                            max: rules.sku.max,
                                        })
                                    }}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="a-lbl">
                                {{ t('products.editor.fields.labels.label') }}
                            </label>
                            <LabelMultiSelect
                                v-model="f.labels"
                                :labels="catalog.labels"
                                :max="rules.maxLabels"
                                @create="managerOpen = true"
                            />
                            <div v-if="errors.labels" class="a-inv">
                                {{ errors.labels }}
                            </div>
                            <div v-else class="a-hint">
                                {{
                                    t('products.editor.fields.labels.hint', {
                                        max: rules.maxLabels,
                                        n: f.labels.length,
                                    })
                                }}
                            </div>
                        </div>

                        <div class="a-2col">
                            <div>
                                <label class="a-lbl" :for="`${uid}-uom`">
                                    {{ t('products.editor.fields.uom.label') }}
                                </label>
                                <ASelect
                                    :id="`${uid}-uom`"
                                    v-model="f.wUom"
                                    class="a-w100"
                                    @change="mark('wUom')"
                                >
                                    <option value="">
                                        {{
                                            t(
                                                'products.editor.fields.uom.choose',
                                            )
                                        }}
                                    </option>
                                    <option
                                        v-for="unit in unitOptions"
                                        :key="unit.value"
                                        :value="unit.value"
                                    >
                                        {{ unit.label }}
                                    </option>
                                </ASelect>
                                <div v-if="shown('wUom')" class="a-inv">
                                    {{ shown('wUom') }}
                                </div>
                            </div>

                            <div>
                                <label class="a-lbl" :for="`${uid}-weight`">
                                    {{
                                        t('products.editor.fields.weight.label')
                                    }}
                                </label>
                                <input
                                    :id="`${uid}-weight`"
                                    class="a-input a-w100"
                                    inputmode="decimal"
                                    :value="f.wVal"
                                    :disabled="!f.wUom"
                                    :placeholder="
                                        f.wUom
                                            ? t(
                                                  'products.editor.fields.weight.placeholderWithUom',
                                                  {
                                                      uom: t(
                                                          `products.unit.${f.wUom}`,
                                                      ),
                                                  },
                                              )
                                            : t(
                                                  'products.editor.fields.weight.placeholderNoUom',
                                              )
                                    "
                                    @input="onDecimal('wVal', $event)"
                                    @blur="mark('wVal')"
                                />
                                <div v-if="shown('wVal')" class="a-inv">
                                    {{ shown('wVal') }}
                                </div>
                                <div v-else class="a-hint">
                                    {{
                                        f.wUom
                                            ? t(
                                                  'products.editor.fields.weight.hintWithUom',
                                                  {
                                                      value: f.wVal || '—',
                                                      uom: t(
                                                          `products.unit.${f.wUom}`,
                                                      ),
                                                  },
                                              )
                                            : t(
                                                  'products.editor.fields.weight.hintNoUom',
                                              )
                                    }}
                                </div>
                            </div>
                        </div>
                    </div>
                </ACard>
            </div>

            <div class="a-grid">
                <ACard :title="t('products.editor.cards.price')" icon="calc">
                    <label class="a-lbl" :for="`${uid}-net`">
                        {{ t('products.editor.fields.net.label') }}
                    </label>
                    <div class="a-money-in">
                        <span>₪</span>
                        <input
                            :id="`${uid}-net`"
                            class="a-input a-w100"
                            inputmode="decimal"
                            :value="f.net"
                            placeholder="0.00"
                            @input="onDecimal('net', $event)"
                            @blur="mark('net')"
                        />
                    </div>
                    <div v-if="shown('net')" class="a-inv">
                        {{ shown('net') }}
                    </div>
                    <div v-else class="a-hint">
                        {{ t('products.editor.fields.net.hint') }}
                    </div>
                    <div class="a-simwrap">
                        <PriceSimulation :net="f.net" />
                    </div>
                </ACard>

                <ACard :title="t('products.editor.cards.image')" icon="image">
                    <ProductImageDrop v-model="f.img" @error="onImageError" />
                </ACard>

                <ACard :title="t('products.editor.cards.stock')" icon="grid">
                    <div class="a-2col">
                        <div>
                            <div class="a-lbl">
                                {{ t('products.editor.stock.available') }}
                            </div>
                            <div
                                class="a-stat-v num"
                                :class="{ 'is-bad': blocked }"
                            >
                                {{ stockNow }}
                            </div>
                            <div class="a-hint">
                                {{ t('products.editor.stock.availableHint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl" :for="`${uid}-min`">
                                {{ t('products.editor.fields.minStock.label') }}
                            </label>
                            <input
                                :id="`${uid}-min`"
                                class="a-input a-w100"
                                inputmode="numeric"
                                :value="f.minStock"
                                :placeholder="String(DEFAULT_MIN_STOCK)"
                                @input="onDigits('minStock', $event)"
                                @blur="mark('minStock')"
                            />
                            <div v-if="shown('minStock')" class="a-inv">
                                {{ shown('minStock') }}
                            </div>
                            <div v-else class="a-hint">
                                {{
                                    t('products.editor.fields.minStock.hint', {
                                        n: DEFAULT_MIN_STOCK,
                                    })
                                }}
                            </div>
                        </div>
                    </div>

                    <div class="a-note a-note--info a-stocknote">
                        {{ t('products.editor.stock.note') }}
                    </div>
                    <div v-if="blocked" class="a-note a-note--warn a-blocknote">
                        {{
                            t('products.editor.stock.blocked', {
                                stock: stockNow,
                                min: minWanted,
                            })
                        }}
                    </div>
                </ACard>
            </div>
        </div>

        <LabelsManager
            :open="managerOpen"
            start-new
            @close="managerOpen = false"
            @created="onLabelCreated"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            danger
            @close="ask = null"
            @confirm="((ask = null), emit('close'))"
        />
    </div>
</template>

<style scoped>
.a-ed-title {
    margin: 0;
    font-size: 25px;
}

.a-ed-dirty {
    align-self: center;
    color: var(--a-amber);
    font-size: 14px;
    font-weight: 600;
}

.a-ed-missing {
    align-self: center;
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.a-gap-lg {
    gap: 18px;
}

.a-simwrap {
    margin-top: 16px;
}

.a-stocknote {
    margin-top: 14px;
}

.a-blocknote {
    margin-top: 12px;
}

.a-stat-v.is-bad {
    color: var(--a-red);
}
</style>
