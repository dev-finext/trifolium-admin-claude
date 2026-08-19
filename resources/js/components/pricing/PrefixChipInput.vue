<script setup>
// SKU prefixes as chips inside one focusable field.
//
// A prefix that overlaps another group's is refused right here, at the moment
// it is typed — not at save time — because the longest-matching-prefix rule
// cannot tolerate two groups claiming the same SKU. The `validate` prop returns
// the (already translated) refusal, so this component decides nothing itself.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import { PRICE_PREFIX_MAX_DIGITS } from '@/stores/catalog';

const props = defineProps({
    /** The committed prefixes. */
    modelValue: { type: Array, default: () => [] },
    /** `(prefix) => refusal message | null`. */
    validate: { type: Function, default: null },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const field = ref(null);
const draft = ref('');
const error = ref('');

function commit() {
    const value = draft.value.trim();

    if (!value || props.modelValue.includes(value)) {
        draft.value = '';

        return;
    }

    const refusal = props.validate ? props.validate(value) : null;

    if (refusal) {
        error.value = refusal;

        return;
    }

    emit('update:modelValue', [...props.modelValue, value]);
    draft.value = '';
    error.value = '';
}

function remove(prefix) {
    emit(
        'update:modelValue',
        props.modelValue.filter((item) => item !== prefix),
    );
}

/** A prefix is digits only, capped at the system's prefix length. */
function onInput(event) {
    draft.value = event.target.value
        .replace(/\D/g, '')
        .slice(0, PRICE_PREFIX_MAX_DIGITS);
    error.value = '';
}

function onKeydown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
        event.preventDefault();
        commit();

        return;
    }

    if (event.key === 'Backspace' && !draft.value && props.modelValue.length) {
        emit('update:modelValue', props.modelValue.slice(0, -1));
    }
}
</script>

<template>
    <div>
        <div class="tp-chipin" @click="field.focus()">
            <span v-for="prefix in modelValue" :key="prefix" class="tp-chip">
                {{ prefix }}
                <button
                    type="button"
                    :aria-label="
                        t('pricing.editor.prefixes.removeAria', { prefix })
                    "
                    @click.stop="remove(prefix)"
                >
                    <AIcon name="x" :size="13" />
                </button>
            </span>
            <input
                ref="field"
                :value="draft"
                inputmode="numeric"
                :aria-label="t('pricing.editor.prefixes.aria')"
                :placeholder="
                    modelValue.length
                        ? t('pricing.editor.prefixes.placeholderMore')
                        : t('pricing.editor.prefixes.placeholderFirst')
                "
                @input="onInput"
                @keydown="onKeydown"
                @blur="commit"
            />
        </div>
        <div v-if="error" class="a-note a-note--danger tp-refused" role="alert">
            <AIcon name="alert" :size="17" class="tp-refused-ic" />
            <span>{{ error }}</span>
        </div>
    </div>
</template>

<style scoped>
.tp-refused {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    margin-top: 8px;
    padding: 10px 13px;
    font-size: 14px;
}

.tp-refused-ic {
    flex-shrink: 0;
    margin-top: 1px;
}
</style>
