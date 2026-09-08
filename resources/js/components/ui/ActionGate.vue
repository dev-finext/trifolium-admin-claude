<script setup>
// A gate in front of one action.
//
// Shut, it says what is behind it and why, and offers the approval-code dialog.
// Open, it renders its content with a way to shut it again. The unlock is
// session-scoped and logged — the same rule the whole-screen gates follow.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { useGatesStore } from '@/stores/gates';

const props = defineProps({
    /** One of GATED_ACTION_IDS. */
    id: { type: String, required: true },
    /** A tighter lock panel, for a gate inside a form. */
    compact: { type: Boolean, default: false },
});

const { t } = useI18n();
const { push } = useToast();
const gates = useGatesStore();

const asking = ref(false);

const open = computed(() => gates.isUnlocked(props.id));
const title = computed(() => t(`gate.action.${props.id}.title`));

async function confirm(reason, code) {
    const ok = await gates.unlock(props.id, code);

    asking.value = false;
    push(
        ok
            ? { title: t('gate.toast'), body: title.value }
            : { title: t('gate.failed'), bad: true },
    );
}
</script>

<template>
    <div v-if="open" class="gate is-open">
        <div class="gate-bar">
            <V2Badge id="gated-actions" size="sm" />
            <AIcon name="lock" :size="14" />
            <span class="t-sub">{{
                t('gate.unlocked', { action: title })
            }}</span>
            <button
                type="button"
                class="a-linkbtn gate-lock"
                @click="gates.lock(id)"
            >
                {{ t('gate.lock') }}
            </button>
        </div>
        <slot />
    </div>

    <div v-else class="gate is-shut" :class="{ 'is-compact': compact }">
        <div class="gate-icon">
            <AIcon name="lock" :size="compact ? 18 : 24" />
        </div>
        <div class="gate-body">
            <div class="gate-t">
                {{ title }}
                <V2Badge id="gated-actions" size="sm" />
            </div>
            <div class="gate-why">{{ t(`gate.action.${id}.why`) }}</div>
        </div>
        <AButton :sm="compact" kind="p" icon="lock" @click="asking = true">
            {{ t('gate.unlock') }}
        </AButton>

        <ConfirmDialog
            :open="asking"
            :title="t('gate.confirmTitle', { action: title })"
            :body="t('gate.confirmBody')"
            :effects="[t('gate.effect1'), t('gate.effect2')]"
            :confirm-label="t('gate.confirm')"
            :pin="gates.pin"
            @close="asking = false"
            @confirm="confirm"
        />
    </div>
</template>

<style scoped>
.gate-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    color: var(--a-ink-3);
}

.gate-lock {
    font-size: 12.5px;
}

.gate.is-shut {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    border: 1px dashed var(--a-line-2);
    border-radius: var(--a-r);
    background: var(--a-sunk);
}

.gate.is-shut.is-compact {
    padding: 12px 14px;
    gap: 12px;
}

.gate-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--a-tint);
    color: var(--a-accent-2);
    flex: none;
}

.is-compact .gate-icon {
    width: 34px;
    height: 34px;
}

.gate-body {
    flex: 1;
    min-width: 0;
}

.gate-t {
    font-weight: 700;
}

.gate-why {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
