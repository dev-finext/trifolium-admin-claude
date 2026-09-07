<script setup>
// Create or edit a purchase order: one supplier, lines in the supplier's units,
// a price per unit and an expected date. The item list defaults to the items
// that name this supplier as preferred — the buyer can widen it.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_IDS, ITEM_UOM_IDS, PO_RULES } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';

const props = defineProps({
    /** The order being edited; `{}` for a new one. */
    po: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const items = useItemsStore();
const store = usePurchasingStore();

const isNew = computed(() => !props.po.id);
const allItems = ref(false);

const form = reactive({
    supplierCode: props.po.supplierCode || '',
    currency: props.po.currency || 'ILS',
    eta: props.po.eta || isoDaysAgo(-7),
    notes: props.po.notes ? loc(props.po.notes) : '',
    lines: (props.po.lines || []).map((line) => ({
        sku: line.sku,
        qty: String(line.qty),
        uom: line.uom,
        price: line.price != null ? String(line.price) : '',
        received: line.received || 0,
    })),
});

const supplierOptions = computed(() => [
    { value: '', label: t('purchasing.editor.pickSupplier') },
    ...dataset.suppliers
        .filter(
            (supplier) =>
                supplier.status === 'active' ||
                supplier.code === form.supplierCode,
        )
        .map((supplier) => ({
            value: supplier.code,
            label: `${loc(supplier.name)} · ${supplier.code}`,
        })),
]);

const currencyOptions = computed(() =>
    CURRENCY_IDS.map((id) => ({ value: id, label: t(`items.currency.${id}`) })),
);

const uomOptions = computed(() =>
    ITEM_UOM_IDS.map((id) => ({ value: id, label: t(`items.uom.${id}`) })),
);

/** Purchasable items — the supplier's own unless the buyer asks for every item. */
const pool = computed(() =>
    items.items.filter(
        (item) =>
            item.flags?.purchase &&
            (allItems.value ||
                !form.supplierCode ||
                item.suppliers?.preferred === form.supplierCode),
    ),
);

const itemOptions = computed(() => [
    { value: '', label: t('purchasing.editor.pickItem') },
    ...pool.value.map((item) => ({
        value: item.sku,
        label: `${loc({ he: item.names.he, en: item.names.en || item.names.he })} · ${item.code}`,
    })),
]);

function addLine() {
    if (form.lines.length >= PO_RULES.maxLines) {
        return;
    }

    form.lines.push({ sku: '', qty: '', uom: 'kg', price: '', received: 0 });
}

function removeLine(i) {
    form.lines.splice(i, 1);
}

/** Picking an item fills its purchase unit and last price. */
function onItem(line, sku) {
    line.sku = sku;

    const item = items.itemBySku(sku);

    if (item) {
        line.uom = item.uom?.purchase || line.uom;
        line.price =
            item.price?.lastPurchase != null
                ? String(item.price.lastPurchase)
                : line.price;
    }
}

const errors = computed(() => ({
    supplier: !form.supplierCode
        ? t('purchasing.editor.validate.supplier')
        : '',
    lines:
        !form.lines.length ||
        form.lines.some((line) => !line.sku || !(Number(line.qty) > 0))
            ? t('purchasing.editor.validate.lines')
            : new Set(form.lines.map((line) => line.sku)).size !==
                form.lines.length
              ? t('purchasing.editor.validate.duplicate')
              : '',
}));

const valid = computed(() => !Object.values(errors.value).some(Boolean));

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await store.savePo(
        {
            supplierCode: form.supplierCode,
            currency: form.currency,
            eta: form.eta,
            notes: form.notes,
            lines: form.lines,
        },
        props.po.id || null,
    );

    emit('saved', result);
}

const title = computed(() =>
    isNew.value
        ? t('purchasing.editor.newTitle')
        : t('purchasing.editor.editTitle', { id: props.po.id }),
);
</script>

<template>
    <AModal open :title="title" :width="960" @close="emit('close')">
        <div class="pe">
            <div class="a-3col">
                <div>
                    <label class="a-lbl"
                        >{{ t('purchasing.editor.supplier') }}
                        <span class="req">*</span></label
                    >
                    <ASelect
                        v-model="form.supplierCode"
                        :options="supplierOptions"
                        class="a-w100"
                    />
                    <div v-if="errors.supplier" class="a-inv">
                        {{ errors.supplier }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('purchasing.editor.eta')
                    }}</label>
                    <AInput v-model="form.eta" type="date" class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('purchasing.editor.currency')
                    }}</label>
                    <ASelect
                        v-model="form.currency"
                        :options="currencyOptions"
                        class="a-w100"
                    />
                </div>
            </div>
            <div>
                <label class="a-lbl">{{ t('purchasing.editor.notes') }}</label>
                <AInput v-model="form.notes" class="a-w100" />
            </div>

            <div>
                <div class="lines-head">
                    <div class="a-sect-t">
                        {{ t('purchasing.editor.lines') }}
                    </div>
                    <label class="check">
                        <input
                            v-model="allItems"
                            type="checkbox"
                            class="a-check"
                        />
                        {{ t('purchasing.editor.allItems') }}
                    </label>
                </div>
                <div class="row row--h">
                    <span>{{ t('purchasing.editor.col.item') }}</span>
                    <span>{{ t('purchasing.editor.col.qty') }}</span>
                    <span>{{ t('purchasing.editor.col.uom') }}</span>
                    <span>{{ t('purchasing.editor.col.price') }}</span>
                    <span></span>
                </div>
                <div v-for="(line, i) in form.lines" :key="i" class="row">
                    <ASelect
                        :model-value="line.sku"
                        :options="itemOptions"
                        class="a-w100"
                        @update:model-value="onItem(line, $event)"
                    />
                    <AInput v-model="line.qty" type="number" ltr />
                    <ASelect v-model="line.uom" :options="uomOptions" />
                    <AInput v-model="line.price" type="number" ltr />
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        :disabled="line.received > 0"
                        @click="removeLine(i)"
                    />
                </div>
                <div v-if="errors.lines" class="a-inv">{{ errors.lines }}</div>
                <AButton
                    sm
                    icon="plus"
                    :disabled="form.lines.length >= PO_RULES.maxLines"
                    @click="addLine"
                >
                    {{ t('purchasing.editor.addLine') }}
                </AButton>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('purchasing.editor.createConfirm')
                        : t('purchasing.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.pe {
    display: grid;
    gap: 18px;
}

.req {
    color: var(--a-red);
}

.lines-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    cursor: pointer;
}

.row {
    display: grid;
    grid-template-columns: 1fr 110px 130px 130px 40px;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
}

.row--h {
    font-size: 12px;
    color: var(--a-ink-3);
    margin-bottom: 4px;
}
</style>
