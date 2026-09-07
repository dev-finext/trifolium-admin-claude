<script setup>
// Bulk actions for the order list.
//
// The bar appears only once something is selected: with nothing ticked it has
// nothing to act on, and a permanent strip above a dense table costs a row of
// height every hour of the shift. Select-all lives in the table's own header
// cell, which is where a reader looks for it.
//
// Every action here operates on the selection, never on the whole list.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ANum from '@/components/ui/ANum.vue';
import { num } from '@/lib/money';

const props = defineProps({
    /** Ids currently ticked. */
    selection: { type: Array, default: () => [] },
    /**
     * How many of them are cleared for the lab. The button locks at zero rather
     * than opening a dialog that would move nothing, and its tooltip says why.
     */
    sendableCount: { type: Number, default: 0 },
});

const emit = defineEmits(['to-lab', 'assign', 'remind', 'export', 'clear']);

const { t } = useI18n();

const count = computed(() => props.selection.length);
</script>

<template>
    <div v-if="count > 0" class="a-card a-bulkbar">
        <I18nT
            keypath="orders.bulk.selected"
            tag="strong"
            scope="global"
            :plural="count"
        >
            <template #n
                ><ANum>{{ num(count) }}</ANum></template
            >
        </I18nT>

        <AButton
            sm
            icon="beaker"
            :disabled="sendableCount === 0"
            :title="
                sendableCount === 0 ? t('orders.bulk.toLabNoneBody') : undefined
            "
            @click="emit('to-lab')"
        >
            {{ t('orders.bulk.toLab') }}
        </AButton>
        <AButton sm icon="truck" @click="emit('assign')">
            {{ t('orders.bulk.assignCourier') }}
        </AButton>
        <AButton sm icon="whatsapp" @click="emit('remind')">
            {{ t('orders.bulk.remind') }}
        </AButton>
        <AButton sm icon="download" @click="emit('export')">
            {{ t('orders.bulk.export') }}
        </AButton>
        <AButton sm kind="ghost" @click="emit('clear')">
            {{ t('orders.bulk.clear') }}
        </AButton>
    </div>
</template>

<style scoped>
.a-bulkbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
    padding: 14px 18px;
    background: var(--a-tint);
    border-color: var(--a-tint-2);
}

.a-bulkbar > strong {
    margin-inline-end: 6px;
}
</style>
