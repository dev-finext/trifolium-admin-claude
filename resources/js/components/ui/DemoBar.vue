<script setup>
// A visibly fenced-off strip for controls that only make sense against the demo
// fixture — reset the data, jump the scenario forward. It renders only while the
// console is showing fabricated records, so nothing in it can be mistaken for a
// production control.
import { useI18n } from 'vue-i18n';

import { isDemoData } from '@/data/source';

defineProps({
    /** One line explaining what these controls do to the fixture. */
    note: { type: String, default: '' },
});

const { t } = useI18n();
</script>

<template>
    <div v-if="isDemoData" class="a-demobar">
        <span class="a-demobar-t">{{ t('ui.demo') }}</span>
        <span v-if="note" class="a-demobar-n">{{ note }}</span>
        <slot />
    </div>
</template>
