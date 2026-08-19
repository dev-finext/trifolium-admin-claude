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
.a-toast-c {
    flex: 1;
    min-width: 0;
}
</style>
