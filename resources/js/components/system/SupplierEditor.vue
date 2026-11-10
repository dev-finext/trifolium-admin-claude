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
import { LEAD_UNIT_IDS } from '@/config';
import { L } from '@/lib/localized';
import { useSystemStore } from '@/stores/system';

/**
 * How the form lays its fields out. `loc` marks a localized record field.
 *
 * Two kinds of figure, kept apart on purpose:
 *   `digits` an identifier written in digits — a company number, a bank
 *            branch, an account. It stays a string, leading zeros and all.
 *   `num`    a quantity. It is saved as a number; `int` refuses a fraction,
 *            and `blank` is what an emptied field saves as.
 *
 * City is not required: SAP does not require it, and most of the real cards
 * have none — a required city would make those cards impossible to save.
 */
const FIELDS = [
    { k: 'name', label: 'field.name', loc: true, req: true },
    { k: 'biz', label: 'field.biz', digits: true, req: true, ltr: true },
    { k: 'kind', label: 'field.kind', opts: 'kind' },
    { k: 'bizType', label: 'field.bizType', opts: 'bizType' },
    { k: 'contact', label: 'field.contactName', loc: true, req: true },
    { k: 'role', label: 'field.contactRole', loc: true },
    { k: 'mobile', label: 'field.mobile', ltr: true, req: true },
    { k: 'office', label: 'field.office', ltr: true },
    { k: 'email', label: 'field.email', ltr: true, req: true },
    { k: 'orderMail', label: 'field.orderMail', ltr: true },
    { k: 'site', label: 'field.site', ltr: true },
    { k: 'city', label: 'field.city', loc: true },
    { k: 'addr', label: 'field.addr', loc: true, full: true },
    { k: 'terms', label: 'field.terms', opts: 'terms' },
    { k: 'pay', label: 'field.pay', opts: 'pay' },
    { k: 'cur', label: 'field.cur', opts: 'cur' },
    { k: 'lead', label: 'field.lead', num: true, int: true, blank: null },
    { k: 'leadUnit', label: 'field.leadUnit', opts: 'leadUnit' },
    { k: 'tradeDisc', label: 'field.tradeDisc', num: true, blank: 0 },
    { k: 'minOrder', label: 'field.minOrder', num: true, blank: 0 },
    { k: 'bank', label: 'field.bank', loc: true },
    { k: 'branch', label: 'field.branch', digits: true, ltr: true },
    { k: 'acct', label: 'field.acct', digits: true, ltr: true },
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

/**
 * The record's current value for a field, as the string an input shows. Always
 * a string: an empty localized field resolves to null, and a null that the
 * input then shows as '' would read as a change nobody made.
 */
function original(field) {
    const value = field.loc
        ? loc(props.supplier?.[field.k])
        : props.supplier?.[field.k];

    return value === null || value === undefined ? '' : String(value);
}

/** What the form holds for a field, compared the way it will be saved. */
const typed = (field) => String(form.value[field.k] ?? '').trim();

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
    // V3 — "two weeks" is how the pharmacy states a lead time, so the card
    // takes the unit alongside the number rather than converting to days.
    leadUnit: LEAD_UNIT_IDS.map((id) => ({
        value: id,
        label: t(`items.lead.unitName.${id}`),
    })),
}));

const missing = computed(() =>
    FIELDS.filter(
        (field) => field.req && !String(form.value[field.k] || '').trim(),
    ),
);

/**
 * A quantity as it will be saved. Text that is not a number (a lone ".") saves
 * as the field's blank rather than as NaN.
 */
function numberOf(field, text) {
    const value = Number(text);

    return text === '' || !Number.isFinite(value) ? field.blank : value;
}

/**
 * Whether a field moved. A quantity is compared as a number, so "2.50" over a
 * stored 2.5 — or an emptied field whose blank is what was there — is not an
 * edit; everything else as trimmed text, the way it is saved.
 */
function moved(field) {
    if (field.num) {
        return (
            numberOf(field, typed(field)) !==
            numberOf(field, original(field).trim())
        );
    }

    return typed(field) !== original(field).trim();
}

const changed = computed(() => FIELDS.filter(moved));

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

/**
 * Keep a figure to what it can be. An identifier and a whole number take
 * digits only; a quantity also takes one decimal point (a comma is read as
 * one), so a 2.5% discount is 2.5 and not 25.
 */
function onNum(field, value) {
    const text = String(value ?? '');

    if (field.digits || field.int) {
        form.value[field.k] = text.replace(/\D/g, '');

        return;
    }

    const [whole, ...rest] = text
        .replace(/,/g, '.')
        .replace(/[^\d.]/g, '')
        .split('.');

    form.value[field.k] = rest.length ? `${whole}.${rest.join('')}` : whole;
}

/** A value as the log shows it: an option by its label, empty as nothing. */
function shown(field, text) {
    if (!text) {
        return null;
    }

    if (field.opts) {
        return (
            options.value[field.opts].find((option) => option.value === text)
                ?.label ?? text
        );
    }

    return text;
}

async function save() {
    confirming.value = false;

    const patch = {};

    changed.value.forEach((field) => {
        const text = typed(field);

        if (field.num) {
            patch[field.k] = numberOf(field, text);
        } else if (field.loc) {
            patch[field.k] = text ? L(text) : null;
        } else {
            // An identifier stays a string — a branch of 012 is not 12.
            patch[field.k] = text || null;
        }
    });

    const labels = changed.value.map((field) => labelOf(field));
    const changes = changed.value.map((field) => ({
        field: `systemContacts.suppliers.${field.label}`,
        from: shown(field, original(field).trim()),
        to: shown(field, typed(field)),
    }));
    const ok = await system.updateSupplier(props.supplier.code, patch, changes);

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
                    v-else-if="field.num || field.digits"
                    :id="`${uid}-${field.k}`"
                    :model-value="form[field.k]"
                    class="a-w100"
                    :ltr="field.ltr"
                    :inputmode="field.num && !field.int ? 'decimal' : 'numeric'"
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
