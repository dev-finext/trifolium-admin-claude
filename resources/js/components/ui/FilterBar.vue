<script setup>
// The one bar that holds a screen's filter controls. It always reports how many
// rows survived the filter and offers exactly one way to clear it, so no screen
// invents its own count line.
//
// `label` is the noun being counted, already translated and pluralised by the
// caller ("orders", "הזמנות"). Pass `total` instead when the screen counts
// against a known whole — the bar then reads "showing 5 of 5".
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ANum from '@/components/ui/ANum.vue';
import { num } from '@/lib/money';

const props = defineProps({
    count: { type: Number, default: 0 },
    label: { type: String, default: '' },
    /** The unfiltered row count. When given, the bar reads "N of TOTAL". */
    total: { type: Number, default: null },
    /** True while any filter differs from its default — shows "clear". */
    dirty: { type: Boolean, default: false },
});

const emit = defineEmits(['clear']);

const { t } = useI18n();

const keypath = computed(() =>
    props.total === null ? 'ui.showing' : 'ui.showingOf',
);
</script>

<template>
    <div class="a-filters">
        <slot />
        <I18nT
            :keypath="keypath"
            tag="span"
            scope="global"
            class="a-count-txt a-push"
        >
            <template #n>
                <strong
                    ><ANum>{{ num(count) }}</ANum></strong
                >
            </template>
            <template #label>{{ label }}</template>
            <template #total
                ><ANum>{{ num(total || 0) }}</ANum></template
            >
        </I18nT>
        <AButton v-if="dirty" sm icon="x" @click="emit('clear')">
            {{ t('ui.clearFilter') }}
        </AButton>
    </div>
</template>
