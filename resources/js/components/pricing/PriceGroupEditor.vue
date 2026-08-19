<script setup>
// One tiered pricing group, edited in three numbered steps: what the group is
// (name, prefixes, unit), which quantity scale it uses, and the price table.
//
// The rules this drawer exists to enforce:
// - Prefix overlap between groups is refused as it is typed, because the
//   longest-matching-prefix resolution cannot tolerate two claims on one SKU.
// - The table must be complete before the group can be saved — a band without
//   a price would silently fail to price an order.
// - Changing the unit keeps the prices but changes what they mean; switching
//   scale mode clears the table. Both are therefore confirmed.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import PrefixChipInput from '@/components/pricing/PrefixChipInput.vue';
import PricePreview from '@/components/pricing/PricePreview.vue';
import ScaleModePicker from '@/components/pricing/ScaleModePicker.vue';
import TierStep from '@/components/pricing/TierStep.vue';
import TierTable from '@/components/pricing/TierTable.vue';
import { fixed2, useTierRows } from '@/components/pricing/useTierRows';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
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

// ---- the form -------------------------------------------------------------

const name = ref(props.group ? loc(props.group.name) : '');
const prefixes = ref(props.group ? [...props.group.prefixes] : []);
const uom = ref(props.group?.uom || '');
const custom = ref(props.group ? catalog.isCustomScale(props.group) : false);
const rows = ref(initialRows());

function initialRows() {
    if (props.group) {
        const bands = props.group.breaks.length
            ? props.group.breaks
            : catalog.defaultBreaks;

        return bands.map((lo, i) => ({
            lo: String(lo),
            price:
                props.group.prices[i] == null
                    ? ''
                    : fixed2(props.group.prices[i]),
        }));
    }

    return catalog.defaultBreaks.map((lo) => ({ lo: String(lo), price: '' }));
}

const { los, prices, filled, rangesOk, complete } = useTierRows(rows, custom);

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

// ---- dirtiness and saveability ---------------------------------------------

function snapshot() {
    return JSON.stringify({
        name: name.value,
        prefixes: prefixes.value,
        uom: uom.value,
        custom: custom.value,
        rows: rows.value,
    });
}

const initial = snapshot();
const dirty = computed(() => snapshot() !== initial);

const ok = computed(() =>
    Boolean(
        name.value.trim() &&
        prefixes.value.length &&
        uom.value &&
        rangesOk.value &&
        complete.value,
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

    if (!rangesOk.value) {
        return t('pricing.editor.save.blockedRanges');
    }

    return t('pricing.editor.save.blockedTable');
});

// ---- confirmations ---------------------------------------------------------

const askSave = ref(false);
const askUom = ref(null);
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

/** Changing the unit under filled prices changes their meaning — confirm it. */
function uomPick(next) {
    if (!next) {
        if (!filled.value) {
            uom.value = '';
        }

        return;
    }

    if (uom.value && next !== uom.value && filled.value > 0) {
        askUom.value = next;

        return;
    }

    uom.value = next;
}

function applyUom() {
    uom.value = askUom.value;
    askUom.value = null;
}

/** Switching scale mode clears the table — confirm unless nothing is lost. */
function switchMode(toCustom) {
    if (toCustom === custom.value) {
        return;
    }

    if (filled.value > 0 || (custom.value && rows.value.length > 1)) {
        askMode.value = toCustom;

        return;
    }

    applyMode(toCustom);
}

function applyMode(toCustom) {
    custom.value = toCustom;
    rows.value = toCustom
        ? [{ lo: '1', price: '' }]
        : catalog.defaultBreaks.map((lo) => ({ lo: String(lo), price: '' }));
}

function confirmMode() {
    const toCustom = askMode.value;

    askMode.value = null;
    applyMode(toCustom);
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
    rows.value = [...rows.value, { lo: '', price: '' }];
}

function removeRow(index) {
    rows.value = rows.value.filter((_, i) => i !== index);
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
        ...(props.group || {}),
        name: localized(props.group?.name, name.value.trim()),
        prefixes: [...prefixes.value],
        uom: uom.value,
        prices: [...prices.value],
        breaks: custom.value ? [...los.value] : [...catalog.defaultBreaks],
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
                        <span v-if="uom">
                            {{
                                t('pricing.editor.meta.filled', {
                                    filled,
                                    total: rows.length,
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
                    <div class="a-grid tp-gap">
                        <div>
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
                        <div>
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
                        <div class="tp-uomcol">
                            <label class="a-lbl" :for="`${uid}-uom`">
                                {{ t('pricing.editor.uomField.label') }}
                            </label>
                            <ASelect
                                :id="`${uid}-uom`"
                                :model-value="uom"
                                class="a-w100"
                                @update:model-value="uomPick"
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
                <ScaleModePicker
                    :custom="custom"
                    :band-count="catalog.defaultBreaks.length"
                    :sample="sample"
                    @select="switchMode"
                />
            </ACard>

            <TierStep
                n="3"
                :title="t('pricing.editor.step3.title')"
                :sub="
                    uom
                        ? t('pricing.editor.step3.sub', { uom: uomName })
                        : t('pricing.editor.step3.subLocked')
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
                <TierTable
                    v-else
                    :rows="rows"
                    :custom="custom"
                    :uom="uom"
                    @set-row="setRow"
                    @add-row="addRow"
                    @remove-row="removeRow"
                />
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
                <span v-if="uom" class="a-count-txt">
                    {{
                        t('pricing.editor.table.filled', {
                            filled,
                            total: rows.length,
                        })
                    }}
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
            :open="askUom !== null"
            :title="t('pricing.editor.confirmUom.title')"
            :body="
                t('pricing.editor.confirmUom.body', {
                    next: askUom ? t(`pricing.uom.${askUom}`) : '',
                    current: uomName,
                })
            "
            :effects="[
                t('pricing.editor.confirmUom.effect1', { n: filled }),
                t('pricing.editor.confirmUom.effect2', {
                    next: askUom ? t(`pricing.uom.${askUom}`) : '',
                }),
            ]"
            :confirm-label="t('pricing.editor.confirmUom.confirm')"
            danger
            @close="askUom = null"
            @confirm="applyUom"
        />
        <ConfirmDialog
            :open="askMode !== null"
            :title="
                askMode
                    ? t('pricing.editor.confirmMode.titleCustom')
                    : t('pricing.editor.confirmMode.titleDefault')
            "
            :body="
                askMode
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
                askMode
                    ? t('pricing.editor.confirmMode.confirmCustom')
                    : t('pricing.editor.confirmMode.confirmDefault')
            "
            danger
            @close="askMode = null"
            @confirm="confirmMode"
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

.tp-gap {
    gap: 18px;
}

.tp-uomcol {
    max-width: 340px;
}

.tp-lockpad {
    padding: 22px;
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
