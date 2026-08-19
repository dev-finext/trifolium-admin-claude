<script setup>
// The channel dropdown, shared by all four tabs of the messaging screen: the
// options are the configured channels, and each carries how many rows on the
// current tab go out on it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ASelect from '@/components/ui/ASelect.vue';
import { CHANNELS } from '@/config';

const props = defineProps({
    modelValue: { type: String, default: '' },
    /** `{ [channelId]: n }` — omit to show the channels without counts. */
    counts: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

/**
 * Only channels the tab actually has rows for are offered: a filter that can
 * only ever return nothing is not a filter.
 */
const options = computed(() =>
    CHANNELS.filter(
        (channel) => !props.counts || props.counts[channel.id] > 0,
    ).map((channel) => {
        const label = t(`channel.${channel.id}`);

        return {
            value: channel.id,
            label: props.counts
                ? t('messaging.filter.withCount', {
                      label,
                      n: props.counts[channel.id],
                  })
                : label,
        };
    }),
);
</script>

<template>
    <ASelect
        :model-value="modelValue"
        :aria-label="t('messaging.filter.channel')"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <option value="">{{ t('messaging.filter.channelAll') }}</option>
        <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
        >
            {{ option.label }}
        </option>
    </ASelect>
</template>
