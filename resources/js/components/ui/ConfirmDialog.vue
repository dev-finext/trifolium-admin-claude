<script setup>
// The dialog in front of any action that changes state, moves money or sends a
// message to a person.
//
// Three things make it worth its own component: `effects` spells out what the
// action will actually do before it is taken, `reason` forces a written reason
// that goes to the log, and `pin` puts an approval code in front of the
// irreversible ones.
//
// The code itself never lives here. Pass `pin="<code>"` and the dialog checks
// it; pass `pin` (true) and the dialog only requires one, handing it to the
// parent as the second argument of `confirm` so the parent can validate it
// against whatever it trusts.
import { computed, nextTick, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AModal from '@/components/ui/AModal.vue';

// Wide enough for a sentence of body copy plus the effects list without the card
// scrolling inside itself.
const WIDTH = 560;

const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** Plain body copy; use the default slot for anything richer. */
    body: { type: String, default: '' },
    /** What the action will actually do — one line per consequence. */
    effects: { type: Array, default: () => [] },
    confirmLabel: { type: String, default: '' },
    danger: { type: Boolean, default: false },
    /** Require a written reason, which travels with `confirm`. */
    reason: { type: Boolean, default: false },
    /** The expected code, or `true` to require one the parent validates. */
    pin: { type: [Boolean, String], default: false },
});

const emit = defineEmits(['confirm', 'close']);

const { t } = useI18n();
const uid = useId();

const why = ref('');
const code = ref('');
const wrong = ref(false);
const pinInput = ref(null);

const needsPin = computed(
    () =>
        props.pin === true ||
        (typeof props.pin === 'string' && props.pin !== ''),
);
const expected = computed(() =>
    typeof props.pin === 'string' ? props.pin : '',
);
const steps = computed(() => (props.effects || []).filter(Boolean));
const blocked = computed(
    () =>
        (props.reason && !why.value.trim()) || (needsPin.value && !code.value),
);

// Every opening starts clean — a reason typed for one action must never be
// carried into the next.
watch(
    () => props.open,
    async (open) => {
        why.value = '';
        code.value = '';
        wrong.value = false;

        if (open && needsPin.value) {
            await nextTick();
            pinInput.value?.focus();
        }
    },
);

function onCode(event) {
    wrong.value = false;
    code.value = event.target.value.replace(/\D/g, '');
}

function submit() {
    if (blocked.value) {
        return;
    }

    if (expected.value && code.value !== expected.value) {
        wrong.value = true;
        code.value = '';

        return;
    }

    emit('confirm', why.value.trim(), code.value);
}
</script>

<template>
    <AModal :open="open" :title="title" :width="WIDTH" @close="emit('close')">
        <div v-if="body || $slots.default" class="a-confirm-b">
            <slot>{{ body }}</slot>
        </div>

        <div
            v-if="steps.length"
            class="a-note a-confirm-n"
            :class="danger ? 'a-note--danger' : 'a-note--info'"
        >
            <div class="a-confirm-nt">{{ t('ui.whatHappens') }}</div>
            <ul class="a-ul">
                <li v-for="(step, i) in steps" :key="i">{{ step }}</li>
            </ul>
        </div>

        <div v-if="reason" class="a-confirm-r">
            <label class="a-lbl" :for="`${uid}-why`">
                {{ t('ui.reasonLabel') }}
            </label>
            <textarea
                :id="`${uid}-why`"
                v-model="why"
                class="a-textarea"
                rows="3"
                :placeholder="t('ui.reasonPlaceholder')"
            />
        </div>

        <div v-if="needsPin" class="a-pinbox">
            <label class="a-lbl" :for="`${uid}-pin`">
                {{ t('ui.pinLabel') }}
            </label>
            <input
                :id="`${uid}-pin`"
                ref="pinInput"
                class="a-input a-pin"
                :class="{ 'is-wrong': wrong }"
                inputmode="numeric"
                autocomplete="one-time-code"
                :maxlength="expected.length || undefined"
                :value="code"
                @input="onCode"
                @keydown.enter.prevent="submit"
            />
            <div class="a-pinhint" :class="{ 'is-wrong': wrong }">
                {{ wrong ? t('ui.pinWrong') : t('ui.pinHint') }}
            </div>
        </div>

        <template #footer>
            <AButton
                :kind="danger ? 'danger' : 'p'"
                :icon="danger ? 'alert' : 'check'"
                :disabled="blocked"
                @click="submit"
            >
                {{ confirmLabel || t('ui.confirm') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('ui.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.a-confirm-b {
    font-size: 16.5px;
    line-height: 1.65;
}

.a-confirm-n,
.a-confirm-r {
    margin-top: 16px;
}

.a-confirm-nt {
    margin-bottom: 6px;
    font-weight: 700;
}

.a-pin.is-wrong {
    border-color: var(--a-red);
}

.a-pinhint.is-wrong {
    color: var(--a-red);
}
</style>
