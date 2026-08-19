<script setup>
// A named exception on an order: a debt, a failed document, an expiring payment
// link. Each one is individually resolvable and carries its own next action —
// there is no generic "needs attention" chip on purpose.
//
// An unknown id renders nothing, so a record that carries a retired exception
// type does not paint a chip with no meaning.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AChip from '@/components/ui/AChip.vue';
import { EXCEPTION } from '@/config';

const props = defineProps({
    id: { type: String, required: true },
    size: { type: String, default: '' },
});

const { t } = useI18n();

const meta = computed(() => EXCEPTION[props.id] || null);
</script>

<template>
    <AChip v-if="meta" :tone="meta.tone" :size="size">
        {{ t(`exception.${id}.short`) }}
    </AChip>
</template>
