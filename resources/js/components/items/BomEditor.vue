<script setup>
// Create or edit a bill of materials on the SAP model: one parent, its
// components with a quantity per unit of parent and how each leaves stock, plus
// alcohol %, oil % and the extraction ratio a tincture is described by.
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import {
    BOM_ISSUE_IDS,
    BOM_RULES,
    EXTRACTION_RATIOS,
    ITEM_UOM_IDS,
} from '@/config';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The tree being edited; `{}` for a new one. */
    bom: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const isNew = computed(() => !props.bom.id);

const form = reactive({
    parentSku: props.bom.parentSku || '',
    name: { he: props.bom.name?.he || '', en: props.bom.name?.en || '' },
    cn: props.bom.cn || '',
    ratio: props.bom.ratio || '',
    alcoholPct:
        props.bom.alcoholPct != null ? String(props.bom.alcoholPct) : '',
    oilPct: props.bom.oilPct != null ? String(props.bom.oilPct) : '',
    yield: {
        qty: props.bom.yield?.qty != null ? String(props.bom.yield.qty) : '1',
        uom: props.bom.yield?.uom || 'unit',
    },
    components: (props.bom.components || []).map((component) => ({
        sku: component.sku,
        qty: String(component.qty),
        uom: component.uom,
        issue: component.issue,
    })),
    notes: { he: props.bom.notes?.he || '', en: props.bom.notes?.en || '' },
});

const itemLabel = (item) =>
    `${loc({ he: item.names.he, en: item.names.en || item.names.he })} · ${item.code}`;

const itemOptions = computed(() => [
    { value: '', label: t('items.bom.editor.pickItem') },
    ...store.items.map((item) => ({ value: item.sku, label: itemLabel(item) })),
]);

const uomOptions = computed(() =>
    ITEM_UOM_IDS.map((id) => ({ value: id, label: t(`items.uom.${id}`) })),
);
const issueOptions = computed(() =>
    BOM_ISSUE_IDS.map((id) => ({
        value: id,
        label: t(`items.bom.issue.${id}`),
    })),
);
const ratioOptions = computed(() => [
    { value: '', label: t('items.bom.editor.noRatio') },
    ...EXTRACTION_RATIOS.map((ratio) => ({ value: ratio, label: ratio })),
]);

/** A new tree takes its parent's name until one is typed. */
function onParent(sku) {
    form.parentSku = sku;

    const item = store.itemBySku(sku);

    if (item && !form.name.he.trim()) {
        form.name.he = item.names.he;
        form.name.en = item.names.en || '';
    }

    if (item && form.components.length === 0) {
        addComponent();
    }
}

function addComponent() {
    if (form.components.length >= BOM_RULES.maxComponents) {
        return;
    }

    form.components.push({ sku: '', qty: '', uom: 'g', issue: 'backflush' });
}

function removeComponent(i) {
    form.components.splice(i, 1);
}

/** The component's unit follows the item's sales unit when the item is picked. */
function onComponentItem(component, sku) {
    component.sku = sku;

    const item = store.itemBySku(sku);

    if (item?.uom?.sales) {
        component.uom = item.uom.sales;
    }
}

const errors = computed(() => {
    const pct = (value) =>
        value !== '' && !(Number(value) >= 0 && Number(value) <= 100);

    return {
        parent: !form.parentSku ? t('items.bom.validate.parent') : '',
        name:
            form.name.he.trim().length < 2 ? t('items.bom.validate.name') : '',
        components: !form.components.length
            ? t('items.bom.validate.noComponents')
            : form.components.some((c) => !c.sku || !(Number(c.qty) > 0))
              ? t('items.bom.validate.component')
              : form.components.some((c) => c.sku === form.parentSku)
                ? t('items.bom.validate.self')
                : new Set(form.components.map((c) => c.sku)).size !==
                    form.components.length
                  ? t('items.bom.validate.duplicate')
                  : '',
        alcohol: pct(form.alcoholPct) ? t('items.bom.validate.pct') : '',
        oil: pct(form.oilPct) ? t('items.bom.validate.pct') : '',
    };
});

const valid = computed(() => !Object.values(errors.value).some(Boolean));

async function save() {
    if (!valid.value) {
        return;
    }

    const he = form.name.he.trim();
    const result = await store.saveBom(
        {
            parentSku: form.parentSku,
            name: { he, en: form.name.en.trim() || he },
            cn: form.cn.trim() || null,
            ratio: form.ratio || null,
            alcoholPct: form.alcoholPct,
            oilPct: form.oilPct,
            yield: { qty: form.yield.qty, uom: form.yield.uom },
            components: form.components,
            notes: form.notes.he.trim()
                ? {
                      he: form.notes.he.trim(),
                      en: form.notes.en.trim() || form.notes.he.trim(),
                  }
                : null,
        },
        props.bom.id || null,
    );

    emit('saved', { created: result.created, bom: result.bom });
}

const title = computed(() =>
    isNew.value
        ? t('items.bom.editor.newTitle')
        : t('items.bom.editor.editTitle', { name: loc(props.bom.name) }),
);
</script>

<template>
    <AModal open :title="title" :width="960" @close="emit('close')">
        <div class="be">
            <div class="a-3col">
                <div>
                    <label class="a-lbl"
                        >{{ t('items.bom.editor.parent') }}
                        <span class="req">*</span></label
                    >
                    <ASelect
                        :model-value="form.parentSku"
                        :options="itemOptions"
                        class="a-w100"
                        @update:model-value="onParent"
                    />
                    <div v-if="errors.parent" class="a-inv">
                        {{ errors.parent }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('items.bom.editor.nameHe') }}
                        <span class="req">*</span></label
                    >
                    <AInput v-model="form.name.he" class="a-w100" />
                    <div v-if="errors.name" class="a-inv">
                        {{ errors.name }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.bom.editor.nameEn')
                    }}</label>
                    <AInput v-model="form.name.en" ltr class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl">{{ t('items.bom.editor.cn') }}</label>
                    <AInput v-model="form.cn" class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl">{{ t('items.bom.col.ratio') }}</label>
                    <ASelect
                        v-model="form.ratio"
                        :options="ratioOptions"
                        class="a-w100"
                    />
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.bom.editor.yield')
                    }}</label>
                    <div class="pair">
                        <AInput v-model="form.yield.qty" type="number" ltr />
                        <ASelect
                            v-model="form.yield.uom"
                            :options="uomOptions"
                        />
                    </div>
                    <div class="a-hint">
                        {{ t('items.bom.editor.yieldHint') }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.bom.col.alcohol')
                    }}</label>
                    <AInput
                        v-model="form.alcoholPct"
                        type="number"
                        ltr
                        class="a-w100"
                    />
                    <div v-if="errors.alcohol" class="a-inv">
                        {{ errors.alcohol }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl">{{ t('items.bom.col.oil') }}</label>
                    <AInput
                        v-model="form.oilPct"
                        type="number"
                        ltr
                        class="a-w100"
                    />
                    <div v-if="errors.oil" class="a-inv">{{ errors.oil }}</div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.bom.drawer.notes')
                    }}</label>
                    <AInput v-model="form.notes.he" class="a-w100" />
                </div>
            </div>

            <div>
                <div class="a-sect-t">
                    {{ t('items.bom.drawer.components') }}
                </div>
                <div class="comp-head">
                    <span>{{ t('items.bom.drawer.colItem') }}</span>
                    <span>{{ t('items.bom.drawer.colQty') }}</span>
                    <span>{{ t('items.bom.col.uomShort') }}</span>
                    <span>{{ t('items.bom.drawer.colIssue') }}</span>
                    <span></span>
                </div>
                <div
                    v-for="(component, i) in form.components"
                    :key="i"
                    class="comp"
                >
                    <ASelect
                        :model-value="component.sku"
                        :options="itemOptions"
                        class="a-w100"
                        @update:model-value="onComponentItem(component, $event)"
                    />
                    <AInput v-model="component.qty" type="number" ltr />
                    <ASelect v-model="component.uom" :options="uomOptions" />
                    <ASelect
                        v-model="component.issue"
                        :options="issueOptions"
                    />
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        @click="removeComponent(i)"
                    />
                </div>
                <div v-if="errors.components" class="a-inv">
                    {{ errors.components }}
                </div>
                <AButton
                    sm
                    icon="plus"
                    :disabled="
                        form.components.length >= BOM_RULES.maxComponents
                    "
                    @click="addComponent"
                >
                    {{ t('items.bom.editor.addComponent') }}
                </AButton>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('items.bom.editor.createConfirm')
                        : t('items.bom.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.be {
    display: grid;
    gap: 20px;
}

.req {
    color: var(--a-red);
}

.pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.comp-head,
.comp {
    display: grid;
    grid-template-columns: 1fr 110px 120px 170px 40px;
    gap: 8px;
    align-items: center;
}

.comp-head {
    font-size: 12px;
    color: var(--a-ink-3);
    margin-bottom: 4px;
}

.comp {
    margin-bottom: 8px;
}
</style>
