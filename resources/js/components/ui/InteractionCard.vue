<script setup>
// A documented herb/drug interaction, shown identically wherever it appears —
// on the formula, in the safety screen, on the order. Drug names stay LTR
// because that is how they are written on the packaging.
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';

defineProps({
    /** The herb, in the reader's language. */
    herb: { type: String, default: '' },
    /** The medicine it interacts with. */
    med: { type: String, default: '' },
    /** The other drugs in the same family, when the record lists them. */
    drugs: { type: String, default: '' },
});

const { t } = useI18n();
</script>

<template>
    <div class="a-inter">
        <AChip tone="amber" size="sm">{{
            t('ui.interaction.documented')
        }}</AChip>
        <strong>{{ herb }}</strong>
        <span class="a-inter-x" aria-hidden="true">&times;</span>
        <span class="ltr a-inter-m">{{ med }}</span>
        <span v-if="drugs" class="ltr a-inter-all">{{ drugs }}</span>
    </div>
</template>

<style scoped>
.a-inter-x {
    color: var(--a-ink-4);
}

.a-inter-m {
    font-weight: 600;
}
</style>
