<script setup>
// The supplier-card editor. The code is immutable — it is printed on every
// goods receipt and every batch — so it is not a field here; everything else can
// change. Saving is a re-confirmation with the approval code, because a change
// to bank details reaches every future payment, and every change is logged.
//
// The field list below is the form's layout, not business data: which fields
// exist and how each is entered. The values, options and labels all come from
// the store and the locale catalog.
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { L } from '@/lib/localized';
import { useSystemStore } from '@/stores/system';

/** How the form lays its fields out. `loc` marks a localized record field. */
const FIELDS = [
    { k: 'name', label: 'field.name', loc: true, req: true },
    { k: 'biz', label: 'field.biz', num: true, req: true, ltr: true },
    { k: 'kind', label: 'field.kind', opts: 'kind' },
    { k: 'bizType', label: 'field.bizType', opts: 'bizType' },
    { k: 'contact', label: 'field.contactName', loc: true, req: true },
    { k: 'role', label: 'field.contactRole', loc: true },
    { k: 'mobile', label: 'field.mobile', ltr: true, req: true },
    { k: 'office', label: 'field.office', ltr: true },
    { k: 'email', label: 'field.email', ltr: true, req: true },
    { k: 'orderMail', label: 'field.orderMail', ltr: true },
    { k: 'site', label: 'field.site', ltr: true },
    { k: 'city', label: 'field.city', loc: true, req: true },
    { k: 'addr', label: 'field.addr', loc: true, full: true },
    { k: 'terms', label: 'field.terms', opts: 'terms' },
    { k: 'pay', label: 'field.pay', opts: 'pay' },
    { k: 'cur', label: 'field.cur', opts: 'cur' },
    { k: 'lead', label: 'field.lead', num: true },
    { k: 'tradeDisc', label: 'field.tradeDisc', num: true },
    { k: 'minOrder', label: 'field.minOrder', num: true },
    { k: 'bank', label: 'field.bank', loc: true },
    { k: 'branch', label: 'field.branch', num: true, ltr: true },
    { k: 'acct', label: 'field.acct', num: true, ltr: true },
    { k: 'payee', label: 'field.payee', loc: true, full: true },
    { k: 'notes', label: 'card.notes', loc: true, area: true, full: true },
];

const props = defineProps({
    open: { type: Boolean, default: false },
    supplier: { type: Object, required: true },
});

const emit = defineEmits(['saved', 'close']);

const { t } = useI18n();
const { loc } = useLocalized();
const system = useSystemStore();
const uid = useId();

const form = ref({});
const confirming = ref(false);

/** The record's current value for a field, as the string an input shows. */
function original(field) {
    const value = props.supplier?.[field.k];

    if (field.loc) {
        return loc(value);
    }

    return value === null || value === undefined ? '' : String(value);
}

// Reseed on every opening so a half-typed edit never carries into the next card.
watch(
    () => [props.open, props.supplier],
    () => {
        if (!props.open) {
            return;
        }

        form.value = Object.fromEntries(
            FIELDS.map((field) => [field.k, original(field)]),
        );
        confirming.value = false;
    },
    { immediate: true, deep: true },
);

const options = computed(() => ({
    kind: system.supplierKindIds.map((id) => ({
        value: id,
        label: t(`systemContacts.kind.${id}`),
    })),
    bizType: system.businessTypeIds.map((id) => ({
        value: id,
        label: t(`systemContacts.bizType.${id}`),
    })),
    terms: system.payTermIds.map((id) => ({
        value: id,
        label: t(`systemContacts.terms.${id}`),
    })),
    pay: system.payMethodIds.map((id) => ({
        value: id,
        label: t(`systemContacts.payMethod.${id}`),
    })),
    cur: system.supplierCurrencies.map((cur) => ({ value: cur, label: cur })),
}));

const missing = computed(() =>
    FIELDS.filter(
        (field) => field.req && !String(form.value[field.k] || '').trim(),
    ),
);

const changed = computed(() =>
    FIELDS.filter(
        (field) => String(form.value[field.k] ?? '') !== original(field),
    ),
);

const canSave = computed(() => !missing.value.length && changed.value.length);

const summary = computed(() => {
    if (!changed.value.length) {
        return t('systemContacts.suppliers.editor.unchanged');
    }

    return t(
        'systemContacts.suppliers.editor.changed',
        { n: changed.value.length },
        changed.value.length,
    );
});

const missingNote = computed(() =>
    missing.value.length
        ? t('systemContacts.suppliers.editor.missing', {
              fields: missing.value
                  .map((field) => t(`systemContacts.suppliers.${field.label}`))
                  .join(' · '),
          })
        : '',
);

function labelOf(field) {
    return t(`systemContacts.suppliers.${field.label}`);
}

function onNum(field, value) {
    form.value[field.k] = value.replace(/[^\d]/g, '');
}

async function save() {
    confirming.value = false;

    const patch = {};

    changed.value.forEach((field) => {
        const value = form.value[field.k];

        if (field.num) {
            patch[field.k] = Number(value);
        } else if (field.loc) {
            patch[field.k] = L(String(value).trim());
        } else {
            patch[field.k] = String(value).trim();
        }
    });

    const labels = changed.value.map((field) => labelOf(field));
    const ok = await system.updateSupplier(props.supplier.code, patch);

    if (ok) {
        emit('saved', labels);
    }
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('systemContacts.suppliers.editor.title')"
        :width="820"
        @close="emit('close')"
    >
        <div class="a-note a-note--info se-note">
            {{ t('systemContacts.suppliers.editor.note') }}
        </div>

        <div class="se-grid">
            <div
                v-for="field in FIELDS"
                :key="field.k"
                :class="{ 'se-full': field.full }"
            >
                <label class="a-lbl" :for="`${uid}-${field.k}`">
                    {{ labelOf(field) }}
                    <span v-if="field.req" class="se-req">*</span>
                </label>

                <ASelect
                    v-if="field.opts"
                    :id="`${uid}-${field.k}`"
                    v-model="form[field.k]"
                    class="a-w100"
                    :options="options[field.opts]"
                />
                <ATextarea
                    v-else-if="field.area"
                    :id="`${uid}-${field.k}`"
                    v-model="form[field.k]"
                    class="a-w100"
                    :rows="3"
                />
                <AInput
                    v-else-if="field.num"
                    :id="`${uid}-${field.k}`"
                    :model-value="form[field.k]"
                    class="a-w100"
                    :ltr="field.ltr"
                    inputmode="numeric"
                    @update:model-value="onNum(field, $event)"
                />
                <AInput
                    v-else
                    :id="`${uid}-${field.k}`"
                    v-model="form[field.k]"
                    class="a-w100"
                    :ltr="field.ltr"
                />
            </div>
        </div>

        <div class="se-foot">
            <span class="se-summary">{{ summary }}</span>
            <span v-if="missingNote" class="se-missing">{{ missingNote }}</span>
        </div>

        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="!canSave"
                @click="confirming = true"
            >
                {{ t('systemContacts.suppliers.editor.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
        </template>
    </AModal>

    <ConfirmDialog
        :open="confirming"
        :title="t('systemContacts.suppliers.editor.confirmTitle')"
        :body="
            t('systemContacts.suppliers.editor.confirmBody', {
                name: loc(supplier.name),
            })
        "
        :confirm-label="t('systemContacts.suppliers.editor.confirm')"
        :effects="[
            t('systemContacts.suppliers.editor.effect1'),
            t('systemContacts.suppliers.editor.effect2'),
        ]"
        :pin="system.approvalPin"
        @close="confirming = false"
        @confirm="save"
    />
</template>

<style scoped>
.se-note {
    margin-bottom: 18px;
}

.se-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.se-full {
    grid-column: 1 / -1;
}

.se-req {
    color: var(--a-red);
}

.se-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 18px;
    font-size: 14px;
}

.se-summary {
    color: var(--a-ink-3);
}

.se-missing {
    color: var(--a-red);
}
</style>
