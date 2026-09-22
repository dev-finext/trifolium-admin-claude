<script setup>
// The parameters of a formula ladder: the kind (steps or a curve) and the
// three or two numbers that drive it. Each field carries its own label and a
// plain-language hint, because "k" means nothing to a buyer until it is
// explained.
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';

import { LADDER_FORMULA_KIND_IDS } from '@/config';

const props = defineProps({
    /** `{ kind, stepQty, stepPct, k, floorPct }` as typed strings. */
    formula: { type: Object, required: true },
    /** The unit name for the step hint. */
    uomName: { type: String, default: '' },
});

const emit = defineEmits(['update']);

const { t } = useI18n();
const uid = useId();

function set(patch) {
    emit('update', { ...props.formula, ...patch });
}

function onNumber(key, event) {
    set({ [key]: event.target.value.replace(/[^\d.]/g, '') });
}
</script>

<template>
    <div class="ff">
        <div
            class="ff-kind"
            role="radiogroup"
            :aria-label="t('pricing.editor.formula.kind')"
        >
            <span class="a-lbl">{{ t('pricing.editor.formula.kind') }}</span>
            <label
                v-for="id in LADDER_FORMULA_KIND_IDS"
                :key="id"
                class="a-checkrow ff-radio"
            >
                <input
                    type="radio"
                    :name="`${uid}-kind`"
                    :value="id"
                    :checked="formula.kind === id"
                    @change="set({ kind: id })"
                />
                <span>{{ t(`pricing.formulaKind.${id}`) }}</span>
            </label>
        </div>

        <div class="ff-grid">
            <template v-if="formula.kind === 'step'">
                <div>
                    <label class="a-lbl" :for="`${uid}-stepQty`">
                        {{ t('pricing.editor.formula.stepQty') }}
                    </label>
                    <input
                        :id="`${uid}-stepQty`"
                        class="a-input a-w100"
                        inputmode="decimal"
                        :value="formula.stepQty"
                        @input="onNumber('stepQty', $event)"
                    />
                    <div class="a-hint">
                        {{
                            t('pricing.editor.formula.stepQtyHint', {
                                uom: uomName,
                            })
                        }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl" :for="`${uid}-stepPct`">
                        {{ t('pricing.editor.formula.stepPct') }}
                    </label>
                    <input
                        :id="`${uid}-stepPct`"
                        class="a-input a-w100"
                        inputmode="decimal"
                        :value="formula.stepPct"
                        @input="onNumber('stepPct', $event)"
                    />
                    <div class="a-hint">
                        {{ t('pricing.editor.formula.stepPctHint') }}
                    </div>
                </div>
            </template>
            <div v-else>
                <label class="a-lbl" :for="`${uid}-k`">
                    {{ t('pricing.editor.formula.k') }}
                </label>
                <input
                    :id="`${uid}-k`"
                    class="a-input a-w100"
                    inputmode="decimal"
                    :value="formula.k"
                    @input="onNumber('k', $event)"
                />
                <div class="a-hint">
                    {{ t('pricing.editor.formula.kHint') }}
                </div>
            </div>
            <div>
                <label class="a-lbl" :for="`${uid}-floor`">
                    {{ t('pricing.editor.formula.floorPct') }}
                </label>
                <input
                    :id="`${uid}-floor`"
                    class="a-input a-w100"
                    inputmode="decimal"
                    :value="formula.floorPct"
                    @input="onNumber('floorPct', $event)"
                />
                <div class="a-hint">
                    {{ t('pricing.editor.formula.floorPctHint') }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ff {
    display: grid;
    gap: 16px;
}

.ff-kind {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 22px;
}

.ff-radio {
    display: inline-flex;
}

.ff-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px 16px;
}
</style>
