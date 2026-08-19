<script setup>
// The coloured dot for a monitored endpoint's state.
//
// Three states, and only three: what the last recorded check returned. There is
// deliberately no "checking" light — nothing in this console probes a provider,
// so no state exists between one stored reading and the next.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    /** `ok` | `slow` | `down`, from the record. */
    state: { type: String, required: true },
    lg: { type: Boolean, default: false },
});

const { t } = useI18n();

const label = computed(() => t(`integrations.state.${props.state}`));
</script>

<template>
    <span
        class="a-light"
        :class="[`is-${state}`, { 'is-lg': lg }]"
        role="img"
        :aria-label="label"
    />
</template>
