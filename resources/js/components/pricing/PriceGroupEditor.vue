<script setup>
// One price scale, edited in two numbered steps: what the scale is (name, the
// item groups it covers, unit, base quantity), and the ladder itself — a
// percentage per quantity band, every band written by this scale.
//
// A group never holds a price. Every item priced by it has its own unit price;
// the group only says how much comes off as the quantity grows. The example
// price above the table is a reading aid for seeing the percentages as money,
// and it is never saved — which is why it sits with the table it drives rather
// than among the fields that are.
//
// The rules this drawer exists to enforce:
// - An item group already covered by another scale cannot be picked, because
//   one item must not end up with two prices.
// - The ladder must be sound before the group can be saved — a missing band,
//   a percent outside 0–100 or one that shrinks would silently misprice an
//   order. The store re-checks the same rules (lib/ladder).
import { computed, ref, useId } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import ItemGroupPicker from '@/components/pricing/ItemGroupPicker.vue';
import LadderPreview from '@/components/pricing/LadderPreview.vue';
import PricePreview from '@/components/pricing/PricePreview.vue';
import TierStep from '@/components/pricing/TierStep.vue';
import TierTable from '@/components/pricing/TierTable.vue';
import { useTierRows } from '@/components/pricing/useTierRows';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { SETTINGS } from '@/config';
import { LADDER_DECIMALS } from '@/lib/ladder';
import { isLocalized, L } from '@/lib/localized';
import { useCatalogStore } from '@/stores/catalog';
import { useDatasetStore } from '@/stores/dataset';

const props = defineProps({
    /** The group being edited, or null for a new one. */
    group: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save', 'export']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();
const dataset = useDatasetStore();
const uid = useId();

const isNew = computed(() => !props.group);
const selfId = props.group?.id || null;

// ---- the form -------------------------------------------------------------

const name = ref(props.group ? loc(props.group.name) : '');
const itemGroups = ref([...(props.group?.itemGroups || [])]);
const uom = ref(props.group?.uom || '');
const baseQty = ref(
    props.group?.baseQty != null ? String(props.group.baseQty) : '1',
);
const rows = ref(initialRows());

/** For reading the table as money — never saved. */
const previewPrice = ref('1.00');

function initialRows() {
    const bands = props.group?.breaks || [];

    if (!bands.length) {
        return [{ lo: '1', pct: '' }];
    }

    return bands.map((lo, i) => ({
        lo: String(lo),
        pct:
            props.group.percents[i] == null
                ? ''
                : String(props.group.percents[i]),
    }));
}

const baseQtyNumber = computed(() => parseFloat(baseQty.value) || 0);
const previewNumber = computed(() => parseFloat(previewPrice.value) || 0);

const { los, pcts, filled, rangesOk, complete } = useTierRows(
    rows,
    baseQtyNumber,
);

const matched = computed(() => catalog.skusForItemGroups(itemGroups.value));

/** The scale that already holds an item group, or null while it is free. */
function heldBy(code) {
    return catalog.conflictsFor([code], selfId)[0]?.group || null;
}

const uomName = computed(() =>
    uom.value ? t(`pricing.uom.${uom.value}`) : '',
);

/** The record the store would receive — also what the preview is drawn from. */
const draft = computed(() => ({
    ...(props.group || {}),
    id: selfId,
    itemGroups: [...itemGroups.value],
    uom: uom.value,
    baseQty: baseQtyNumber.value,
    breaks: [...los.value],
    percents: [...pcts.value],
}));

const ladderErrors = computed(() => catalog.groupErrors(draft.value));

/** The preview only makes sense once the ladder is sound. */
const previewable = computed(
    () =>
        Boolean(uom.value) &&
        previewNumber.value > 0 &&
        rangesOk.value &&
        ladderErrors.value.filter((id) => id !== 'group_conflict').length === 0,
);

// ---- dirtiness and saveability ---------------------------------------------

function snapshot() {
    return JSON.stringify({
        name: name.value,
        itemGroups: itemGroups.value,
        uom: uom.value,
        baseQty: baseQty.value,
        rows: rows.value,
    });
}

const initial = snapshot();
const dirty = computed(() => snapshot() !== initial);

const ok = computed(() =>
    Boolean(
        name.value.trim() &&
        itemGroups.value.length &&
        uom.value &&
        !ladderErrors.value.length,
    ),
);

/** Why the save is blocked, worst problem first. */
const okMsg = computed(() => {
    if (!name.value.trim() || !itemGroups.value.length) {
        return t('pricing.editor.save.blockedName');
    }

    if (!uom.value) {
        return t('pricing.editor.save.blockedUom');
    }

    if (ladderErrors.value.length) {
        return t(`pricing.ladderError.${ladderErrors.value[0]}`);
    }

    return '';
});

// ---- confirmations ---------------------------------------------------------

const askSave = ref(false);
const askLeave = ref(false);

const meName = computed(() => loc(dataset.me?.name) || '');

function requestClose() {
    if (!dirty.value) {
        emit('close');

        return;
    }

    askLeave.value = true;
}

// ---- rows and save ----------------------------------------------------------

function setRow(index, patch) {
    rows.value = rows.value.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
    );
}

function addRow() {
    rows.value = [...rows.value, { lo: '', pct: '' }];
}

function removeRow(index) {
    rows.value = rows.value.filter((_, i) => i !== index);
}

/** Digits, one decimal point, and no more decimals than a ladder holds. */
function cleanNumber(event) {
    const [whole, ...rest] = event.target.value
        .replace(/[^\d.]/g, '')
        .split('.');

    return rest.length
        ? `${whole}.${rest.join('').slice(0, LADDER_DECIMALS)}`
        : whole;
}

/** Keep the other language's name when only one side is being edited. */
function localized(existing, text) {
    return isLocalized(existing)
        ? { ...existing, [locale.value]: text }
        : L(text, text);
}

function doSave() {
    askSave.value = false;
    emit('save', {
        ...draft.value,
        name: localized(props.group?.name, name.value.trim()),
    });
}
</script>

<template>
    <ADrawer open @close="requestClose">
        <template #header>
            <div class="a-dhead-top tp-head">
                <div>
                    <div class="a-dhead-t">
                        <h2 class="tp-title">
                            {{
                                isNew
                                    ? t('pricing.editor.newTitle')
                                    : t('pricing.editor.editTitle', {
                                          name: loc(group.name),
                                      })
                            }}
                        </h2>
                    </div>
                    <div class="a-dhead-m">
                        <span>
                            {{
                                uom
                                    ? t('pricing.editor.meta.uom', {
                                          uom: uomName,
                                      })
                                    : t('pricing.editor.meta.noUom')
                            }}
                        </span>
                        <span>
                            {{
                                t('pricing.editor.meta.matched', {
                                    n: matched.length,
                                })
                            }}
                        </span>
                        <span v-if="!isNew && group.updatedBy">
                            {{
                                t('pricing.editor.meta.lastUpdate', {
                                    stamp: group.updated?.stamp || '',
                                    name: loc(group.updatedBy),
                                })
                            }}
                        </span>
                    </div>
                </div>
                <div class="a-dhead-a">
                    <AButton
                        v-if="!isNew"
                        icon="download"
                        @click="emit('export')"
                    >
                        {{ t('pricing.editor.export') }}
                    </AButton>
                    <AButton kind="ghost" icon="x" @click="requestClose">
                        {{ t('pricing.editor.close') }}
                    </AButton>
                </div>
            </div>
        </template>

        <div class="tp-ed tp-ed-pad">
            <TierStep
                n="1"
                :title="t('pricing.editor.step1.title')"
                :sub="t('pricing.editor.step1.sub')"
            />
            <ACard>
                <div class="tp-defcols">
                    <div class="tp-fields">
                        <div class="tp-wide">
                            <label class="a-lbl" :for="`${uid}-name`">
                                {{ t('pricing.editor.name.label') }}
                            </label>
                            <input
                                :id="`${uid}-name`"
                                v-model="name"
                                class="a-input a-w100"
                                :placeholder="
                                    t('pricing.editor.name.placeholder')
                                "
                            />
                        </div>
                        <div class="tp-wide">
                            <label class="a-lbl">
                                {{ t('pricing.editor.itemGroups.label') }}
                            </label>
                            <ItemGroupPicker
                                v-model="itemGroups"
                                :options="catalog.itemGroupOptions"
                                :held-by="heldBy"
                            />
                            <div class="a-hint">
                                {{ t('pricing.editor.itemGroups.hint') }}
                            </div>
                        </div>
                        <div>
                            <label class="a-lbl" :for="`${uid}-uom`">
                                {{ t('pricing.editor.uomField.label') }}
                            </label>
                            <ASelect
                                :id="`${uid}-uom`"
                                v-model="uom"
                                class="a-w100"
                            >
                                <option value="">
                                    {{ t('pricing.editor.uomField.choose') }}
                                </option>
                                <option
                                    v-for="id in catalog.priceUoms"
                                    :key="id"
                                    :value="id"
                                >
                                    {{ t(`pricing.uom.${id}`) }}
                                </option>
                            </ASelect>
                        </div>
                        <div>
                            <label class="a-lbl" :for="`${uid}-base`">
                                {{ t('pricing.editor.baseQty.label') }}
                            </label>
                            <input
                                :id="`${uid}-base`"
                                class="a-input a-w100"
                                inputmode="decimal"
                                :value="baseQty"
                                @input="baseQty = cleanNumber($event)"
                            />
                            <div
                                class="a-hint"
                                :class="{ 'a-inv': baseQtyNumber <= 0 }"
                            >
                                {{
                                    baseQtyNumber > 0
                                        ? t('pricing.editor.baseQty.hint')
                                        : t('pricing.editor.baseQty.required')
                                }}
                            </div>
                        </div>
                    </div>
                    <PricePreview
                        :matched="matched"
                        :total="catalog.ingredientSkus.length"
                        :has-groups="itemGroups.length > 0"
                    />
                </div>
            </ACard>

            <TierStep
                n="2"
                :title="t('pricing.editor.step2.title')"
                :sub="
                    !uom
                        ? t('pricing.editor.step2.subLocked')
                        : t('pricing.editor.step2.sub', { uom: uomName })
                "
            >
                <template v-if="uom" #right>
                    <AChip :tone="complete ? 'green' : 'amber'" size="sm">
                        {{
                            t('pricing.editor.table.filled', {
                                filled,
                                total: rows.length,
                            })
                        }}
                    </AChip>
                </template>
            </TierStep>
            <ACard :pad="false">
                <div v-if="!uom" class="tp-lockpad">
                    <div class="tp-locked">
                        <AIcon name="lock" :size="30" class="tp-lock-ic" />
                        <div>{{ t('pricing.editor.table.locked') }}</div>
                    </div>
                </div>
                <template v-else>
                    <!-- Not a field of the group: a reading aid for the table
                         below, phrased as the sentence it is so nobody mistakes
                         it for something the group has to be given. -->
                    <div class="tp-assume">
                        <AIcon name="calc" :size="17" class="tp-assume-ic" />
                        <I18nT
                            keypath="pricing.editor.previewPrice.line"
                            tag="p"
                            scope="global"
                            class="tp-assume-t"
                        >
                            <template #price>
                                <input
                                    class="a-input tp-assume-in"
                                    inputmode="decimal"
                                    :value="previewPrice"
                                    :aria-label="
                                        t('pricing.editor.previewPrice.aria')
                                    "
                                    @input="previewPrice = cleanNumber($event)"
                                />
                            </template>
                            <template #uom>{{ uomName }}</template>
                        </I18nT>
                        <span class="tp-assume-note">
                            {{ t('pricing.editor.previewPrice.note') }}
                        </span>
                    </div>
                    <TierTable
                        :rows="rows"
                        :uom="uom"
                        :base-qty="baseQtyNumber"
                        :preview-price="previewNumber"
                        :vat-rate="SETTINGS.vatRate"
                        @set-row="setRow"
                        @add-row="addRow"
                        @remove-row="removeRow"
                    />
                    <LadderPreview
                        v-if="previewable"
                        :group="draft"
                        :unit-price="previewNumber"
                        :vat-rate="SETTINGS.vatRate"
                        class="tp-chartonly"
                    />
                </template>
            </ACard>
        </div>

        <div class="tp-savebar">
            <AButton
                kind="p"
                icon="save"
                :disabled="!ok"
                @click="askSave = true"
            >
                {{ t('pricing.editor.save.label') }}
            </AButton>
            <AButton @click="requestClose">
                {{ t('pricing.editor.save.cancel') }}
            </AButton>
            <span v-if="!ok" class="tp-blocked">{{ okMsg }}</span>
            <span class="a-push tp-side">
                <span v-if="dirty" class="tp-dirty">
                    {{ t('pricing.editor.save.unsaved') }}
                </span>
            </span>
        </div>

        <ConfirmDialog
            :open="askSave"
            :title="
                isNew
                    ? t('pricing.editor.confirmSave.titleNew')
                    : t('pricing.editor.confirmSave.titleEdit')
            "
            :body="
                isNew
                    ? t('pricing.editor.confirmSave.bodyNew', {
                          name: name.trim(),
                      })
                    : t('pricing.editor.confirmSave.bodyEdit', {
                          name: name.trim(),
                      })
            "
            :effects="[
                t('pricing.editor.confirmSave.effect1', {
                    matched: matched.length,
                    ranges: rows.length,
                }),
                t('pricing.editor.confirmSave.effect2', { name: meName }),
            ]"
            :confirm-label="
                isNew
                    ? t('pricing.editor.confirmSave.confirmNew')
                    : t('pricing.editor.confirmSave.confirmEdit')
            "
            :pin="catalog.approvalPin"
            @close="askSave = false"
            @confirm="doSave"
        />
        <ConfirmDialog
            :open="askLeave"
            :title="t('pricing.editor.confirmLeave.title')"
            :body="t('pricing.editor.confirmLeave.body')"
            :effects="[t('pricing.editor.confirmLeave.effect1')]"
            :confirm-label="t('pricing.editor.confirmLeave.confirm')"
            danger
            @close="askLeave = false"
            @confirm="((askLeave = false), emit('close'))"
        />
    </ADrawer>
</template>

<style scoped>
.tp-head {
    padding-bottom: 16px;
}

.tp-title {
    margin: 0;
    font-size: 23px;
    font-weight: 700;
}

.tp-ed-pad {
    padding-bottom: 84px;
}

.tp-fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 14px 18px;
}

.tp-wide {
    grid-column: 1 / -1;
}

.tp-lockpad {
    padding: 22px;
}

/* The assumption the table is read under — a sentence with a number in it,
   deliberately unlike the labelled fields of step 1. */
.tp-assume {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    padding: 13px 18px;
    background: var(--a-bg-2, var(--a-line-4, transparent));
    border-bottom: 1px solid var(--a-line);
}

.tp-assume-ic {
    color: var(--a-ink-4);
}

.tp-assume-t {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 13.5px;
    color: var(--a-ink-2);
}

.tp-assume-in {
    width: 110px;
    text-align: center;
}

.tp-assume-note {
    flex-basis: 100%;
    padding-inline-start: 27px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

/* The rows are already in the table above; only the chart is new here. */
.tp-chartonly :deep(table) {
    display: none;
}

.tp-lock-ic {
    color: var(--a-line-2);
    margin-bottom: 4px;
}

.tp-blocked {
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.tp-side {
    display: flex;
    gap: 16px;
    align-items: center;
}

.tp-dirty {
    color: var(--a-amber);
    font-weight: 600;
    font-size: 14px;
}
</style>
