<script setup>
// One tiered pricing group, edited in three numbered steps: what the group is
// (name, prefixes, unit, base quantity), how it states its ladder (a percent
// per band, or a formula), and the ladder itself.
//
// A group never holds a price. Every item priced by it has its own unit price;
// the group only says how much comes off as the quantity grows. The example
// price the agent types here is for reading the table as money — it is not
// saved.
//
// The rules this drawer exists to enforce:
// - Prefix overlap between groups is refused as it is typed, because the
//   longest-matching-prefix resolution cannot tolerate two claims on one SKU.
// - The ladder must be sound before the group can be saved — a missing band,
//   a percent outside 0–100 or one that shrinks would silently misprice an
//   order. The store re-checks the same rules (lib/ladder).
// - Switching mode throws the other mode's work away, so it is confirmed.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import FormulaFields from '@/components/pricing/FormulaFields.vue';
import LadderPreview from '@/components/pricing/LadderPreview.vue';
import PrefixChipInput from '@/components/pricing/PrefixChipInput.vue';
import PricePreview from '@/components/pricing/PricePreview.vue';
import ScaleModePicker from '@/components/pricing/ScaleModePicker.vue';
import TierStep from '@/components/pricing/TierStep.vue';
import TierTable from '@/components/pricing/TierTable.vue';
import { fixed1, useTierRows } from '@/components/pricing/useTierRows';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { PRICE_LADDER_MODE_IDS, SETTINGS } from '@/config';
import { isLocalized, L } from '@/lib/localized';
import { bandText, useCatalogStore } from '@/stores/catalog';
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

/** What a brand-new formula starts from: gentle steps, a common floor. */
const BLANK_FORMULA = {
    kind: 'step',
    stepQty: '',
    stepPct: '',
    k: '',
    floorPct: '30',
};

// ---- the form -------------------------------------------------------------

const name = ref(props.group ? loc(props.group.name) : '');
const prefixes = ref(props.group ? [...props.group.prefixes] : []);
const uom = ref(props.group?.uom || '');
const baseQty = ref(
    props.group?.baseQty != null ? String(props.group.baseQty) : '1',
);
const mode = ref(props.group?.mode || 'percent');
const custom = ref(
    props.group && props.group.mode === 'percent'
        ? catalog.isCustomScale(props.group)
        : false,
);
const rows = ref(initialRows());
const formula = ref(initialFormula());

/** For reading the table as money — never saved. */
const previewPrice = ref('1.00');

function initialRows() {
    if (props.group && props.group.mode === 'percent') {
        const bands = props.group.breaks.length
            ? props.group.breaks
            : catalog.defaultBreaks;

        return bands.map((lo, i) => ({
            lo: String(lo),
            pct:
                props.group.percents[i] == null
                    ? ''
                    : fixed1(props.group.percents[i]),
        }));
    }

    return catalog.defaultBreaks.map((lo) => ({ lo: String(lo), pct: '' }));
}

function initialFormula() {
    const source = props.group?.formula;

    if (!source) {
        return { ...BLANK_FORMULA };
    }

    return {
        kind: source.kind || 'step',
        stepQty: source.stepQty == null ? '' : String(source.stepQty),
        stepPct: source.stepPct == null ? '' : String(source.stepPct),
        k: source.k == null ? '' : String(source.k),
        floorPct: source.floorPct == null ? '' : String(source.floorPct),
    };
}

const baseQtyNumber = computed(() => parseFloat(baseQty.value) || 0);
const previewNumber = computed(() => parseFloat(previewPrice.value) || 0);

const { los, pcts, filled, rangesOk, complete } = useTierRows(
    rows,
    custom,
    baseQtyNumber,
);

const matched = computed(() => catalog.skusForPrefixes(prefixes.value, selfId));

const uomName = computed(() =>
    uom.value ? t(`pricing.uom.${uom.value}`) : '',
);

/** A `1–5 · 5–10 · 10–20 … 1000+` taste of the fixed scale. */
const sample = computed(() => {
    const breaks = catalog.defaultBreaks;

    if (breaks.length <= 3) {
        return breaks.map((_, i) => bandText(breaks, i)).join(' · ');
    }

    const head = [0, 1, 2].map((i) => bandText(breaks, i)).join(' · ');

    return `${head} … ${breaks[breaks.length - 1]}+`;
});

/** The record the store would receive — also what the preview is drawn from. */
const draft = computed(() => ({
    ...(props.group || {}),
    id: selfId,
    prefixes: [...prefixes.value],
    uom: uom.value,
    baseQty: baseQtyNumber.value,
    mode: mode.value,
    breaks:
        mode.value === 'percent'
            ? custom.value
                ? [...los.value]
                : [...catalog.defaultBreaks]
            : [],
    percents: mode.value === 'percent' ? [...pcts.value] : [],
    formula:
        mode.value === 'formula'
            ? {
                  kind: formula.value.kind,
                  stepQty: parseFloat(formula.value.stepQty),
                  stepPct: parseFloat(formula.value.stepPct),
                  k: parseFloat(formula.value.k),
                  floorPct: parseFloat(formula.value.floorPct),
              }
            : null,
}));

const ladderErrors = computed(() => catalog.groupErrors(draft.value));

/** The preview only makes sense once the ladder is sound. */
const previewable = computed(
    () =>
        Boolean(uom.value) &&
        previewNumber.value > 0 &&
        ladderErrors.value.filter((id) => id !== 'prefix_conflict').length ===
            0,
);

// ---- dirtiness and saveability ---------------------------------------------

function snapshot() {
    return JSON.stringify({
        name: name.value,
        prefixes: prefixes.value,
        uom: uom.value,
        baseQty: baseQty.value,
        mode: mode.value,
        custom: custom.value,
        rows: rows.value,
        formula: formula.value,
    });
}

const initial = snapshot();
const dirty = computed(() => snapshot() !== initial);

const ok = computed(() =>
    Boolean(
        name.value.trim() &&
        prefixes.value.length &&
        uom.value &&
        !ladderErrors.value.length,
    ),
);

/** Why the save is blocked, worst problem first. */
const okMsg = computed(() => {
    if (!name.value.trim() || !prefixes.value.length) {
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
const askScale = ref(null);
const askMode = ref(null);
const askLeave = ref(false);

const meName = computed(() => loc(dataset.me?.name) || '');

function validatePrefix(prefix) {
    const clash = catalog.conflictsFor([prefix], selfId)[0];

    if (!clash) {
        return null;
    }

    return t('pricing.editor.prefixes.conflict', {
        prefix,
        other: clash.theirs,
        group: loc(clash.group.name),
    });
}

/** Whether the mode not currently shown still holds work worth confirming. */
function otherModeHasWork(next) {
    if (next === 'formula') {
        return filled.value > 0 || (custom.value && rows.value.length > 1);
    }

    return Boolean(
        formula.value.stepQty || formula.value.stepPct || formula.value.k,
    );
}

function pickMode(next) {
    if (next === mode.value) {
        return;
    }

    if (otherModeHasWork(next)) {
        askMode.value = next;

        return;
    }

    mode.value = next;
}

function confirmMode() {
    const next = askMode.value;

    askMode.value = null;

    if (next === 'formula') {
        rows.value = catalog.defaultBreaks.map((lo) => ({
            lo: String(lo),
            pct: '',
        }));
        custom.value = false;
    } else {
        formula.value = { ...BLANK_FORMULA };
    }

    mode.value = next;
}

/** Switching scale clears the percent table — confirm unless nothing is lost. */
function switchScale(toCustom) {
    if (toCustom === custom.value) {
        return;
    }

    if (filled.value > 0 || (custom.value && rows.value.length > 1)) {
        askScale.value = toCustom;

        return;
    }

    applyScale(toCustom);
}

function applyScale(toCustom) {
    custom.value = toCustom;
    rows.value = toCustom
        ? [{ lo: '1', pct: '' }]
        : catalog.defaultBreaks.map((lo) => ({ lo: String(lo), pct: '' }));
}

function confirmScale() {
    const toCustom = askScale.value;

    askScale.value = null;
    applyScale(toCustom);
}

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

/** Digits and a decimal point — what a quantity or a price is made of. */
const cleanNumber = (event) => event.target.value.replace(/[^\d.]/g, '');

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
                                {{ t('pricing.editor.prefixes.label') }}
                            </label>
                            <PrefixChipInput
                                v-model="prefixes"
                                :validate="validatePrefix"
                            />
                            <div class="a-hint">
                                {{ t('pricing.editor.prefixes.hint') }}
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
                        <div>
                            <label class="a-lbl" :for="`${uid}-preview`">
                                {{ t('pricing.editor.previewPrice.label') }}
                            </label>
                            <input
                                :id="`${uid}-preview`"
                                class="a-input a-w100"
                                inputmode="decimal"
                                :value="previewPrice"
                                @input="previewPrice = cleanNumber($event)"
                            />
                            <div class="a-hint">
                                {{ t('pricing.editor.previewPrice.hint') }}
                            </div>
                        </div>
                    </div>
                    <PricePreview
                        :matched="matched"
                        :total="catalog.ingredientSkus.length"
                        :has-prefixes="prefixes.length > 0"
                    />
                </div>
            </ACard>

            <TierStep
                n="2"
                :title="t('pricing.editor.step2.title')"
                :sub="t('pricing.editor.step2.sub')"
            />
            <ACard>
                <div
                    class="tp-mode"
                    role="radiogroup"
                    :aria-label="t('pricing.editor.modePick.aria')"
                >
                    <button
                        v-for="id in PRICE_LADDER_MODE_IDS"
                        :key="id"
                        type="button"
                        class="tp-modecard"
                        :class="{ 'is-on': mode === id }"
                        role="radio"
                        :aria-checked="mode === id"
                        @click="pickMode(id)"
                    >
                        <span v-if="mode === id" class="tp-mode-check">
                            <AIcon name="check" :size="19" />
                        </span>
                        <div class="tp-mode-t">
                            {{ t(`pricing.editor.modePick.${id}Title`) }}
                        </div>
                        <div class="tp-mode-s">
                            {{ t(`pricing.editor.modePick.${id}Sub`) }}
                        </div>
                    </button>
                </div>
            </ACard>

            <TierStep
                n="3"
                :title="
                    mode === 'formula'
                        ? t('pricing.editor.formula.title')
                        : t('pricing.editor.step3.title')
                "
                :sub="
                    !uom
                        ? t('pricing.editor.step3.subLocked')
                        : mode === 'formula'
                          ? t('pricing.editor.formula.sub')
                          : t('pricing.editor.step3.sub', { uom: uomName })
                "
            >
                <template v-if="uom && mode === 'percent'" #right>
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
                <template v-else-if="mode === 'percent'">
                    <div class="tp-scalepad">
                        <ScaleModePicker
                            :custom="custom"
                            :band-count="catalog.defaultBreaks.length"
                            :sample="sample"
                            @select="switchScale"
                        />
                    </div>
                    <TierTable
                        :rows="rows"
                        :custom="custom"
                        :uom="uom"
                        :base-qty="baseQtyNumber"
                        :preview-price="previewNumber"
                        :vat-rate="SETTINGS.vatRate"
                        @set-row="setRow"
                        @add-row="addRow"
                        @remove-row="removeRow"
                    />
                    <LadderPreview
                        v-if="previewable && rangesOk"
                        :group="draft"
                        :unit-price="previewNumber"
                        :vat-rate="SETTINGS.vatRate"
                        :scale="catalog.defaultBreaks"
                        class="tp-chartonly"
                    />
                </template>
                <template v-else>
                    <div class="tp-formulapad">
                        <FormulaFields
                            :formula="formula"
                            :uom-name="uomName"
                            @update="formula = $event"
                        />
                    </div>
                    <div class="tp-previewhead">
                        <div class="tp-step-t">
                            {{ t('pricing.editor.formula.preview') }}
                        </div>
                        <div class="tp-step-s">
                            {{ t('pricing.editor.formula.previewSub') }}
                        </div>
                    </div>
                    <LadderPreview
                        v-if="previewable"
                        :group="draft"
                        :unit-price="previewNumber"
                        :vat-rate="SETTINGS.vatRate"
                        :scale="catalog.defaultBreaks"
                    />
                    <div v-else class="tp-lockpad tp-dim">
                        {{
                            ladderErrors.length
                                ? t(`pricing.ladderError.${ladderErrors[0]}`)
                                : t('pricing.editor.previewPrice.hint')
                        }}
                    </div>
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
                    ranges: mode === 'percent' ? rows.length : 0,
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
            :open="askMode !== null"
            :title="t('pricing.editor.modePick.confirmTitle')"
            :body="
                askMode === 'formula'
                    ? t('pricing.editor.modePick.confirmToFormula')
                    : t('pricing.editor.modePick.confirmToPercent')
            "
            :confirm-label="t('pricing.editor.modePick.confirm')"
            danger
            @close="askMode = null"
            @confirm="confirmMode"
        />
        <ConfirmDialog
            :open="askScale !== null"
            :title="
                askScale
                    ? t('pricing.editor.confirmMode.titleCustom')
                    : t('pricing.editor.confirmMode.titleDefault')
            "
            :body="
                askScale
                    ? t('pricing.editor.confirmMode.bodyCustom')
                    : t('pricing.editor.confirmMode.bodyDefault', {
                          n: catalog.defaultBreaks.length,
                      })
            "
            :effects="[
                t('pricing.editor.confirmMode.effect1'),
                t('pricing.editor.confirmMode.effect2'),
            ]"
            :confirm-label="
                askScale
                    ? t('pricing.editor.confirmMode.confirmCustom')
                    : t('pricing.editor.confirmMode.confirmDefault')
            "
            danger
            @close="askScale = null"
            @confirm="confirmScale"
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

.tp-lockpad,
.tp-scalepad,
.tp-formulapad {
    padding: 22px;
}

.tp-scalepad {
    border-bottom: 1px solid var(--a-line);
}

.tp-previewhead {
    padding: 14px 22px 6px;
    border-top: 1px solid var(--a-line);
}

.tp-chartonly :deep(table),
.tp-chartonly :deep(.lp-foot) {
    display: none;
}

.tp-lock-ic {
    color: var(--a-line-2);
    margin-bottom: 4px;
}

.tp-dim {
    color: var(--a-ink-4);
    font-size: 13.5px;
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
