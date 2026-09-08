<script setup>
// Renders the toast list. Mounted once, in the shell — screens push through
// useToast() and never render a toast themselves.
//
// The live region exists even while the list is empty, so a screen reader
// announces a toast that arrives later.
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import { useToastStore } from '@/stores/toasts';

const toasts = useToastStore();
const { t } = useI18n();

// The action closes its own toast: whatever it does next will report itself.
function run(toast) {
    toasts.dismiss(toast.id);
    toast.action.run();
}
</script>

<template>
    <div class="a-toasts" role="status" aria-live="polite">
        <div
            v-for="toast in toasts.items"
            :key="toast.id"
            class="a-toast"
            :class="{ 'a-toast--bad': toast.bad }"
        >
            <span class="ic">
                <AIcon :name="toast.bad ? 'alert' : 'check'" :size="20" />
            </span>
            <div class="a-toast-c">
                <div class="tt">{{ toast.title }}</div>
                <div v-if="toast.body" class="tb">{{ toast.body }}</div>
                <button
                    v-if="toast.action"
                    type="button"
                    class="a-toast-act"
                    @click="run(toast)"
                >
                    {{ toast.action.label }}
                </button>
            </div>
            <button
                type="button"
                class="a-toast-x"
                :aria-label="t('ui.close')"
                @click="toasts.dismiss(toast.id)"
            >
                <AIcon name="x" :size="17" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.a-toast-act {
    margin-top: 8px;
    border: 1px solid currentColor;
    background: transparent;
    color: inherit;
    border-radius: 7px;
    padding: 3px 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.a-toast-act:hover {
    background: rgb(255 255 255 / 0.16);
}

.a-toast-c {
    flex: 1;
    min-width: 0;
}
</style>
