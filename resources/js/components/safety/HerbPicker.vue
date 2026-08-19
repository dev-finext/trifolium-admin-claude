<script setup>
// Herb search and single-select, for the interaction editor.
//
// The catalog is 70 herbs long and a herb is known by three names — Hebrew,
// Latin and Chinese — so the picker searches all of them and shows the Latin
// name beside every row: that is the name written on the raw-material label.
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';
import { herbMatches } from '@/stores/safety';

const props = defineProps({
    modelValue: { type: String, default: '' },
    herbs: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();
const uid = useId();

const query = ref('');

const shown = computed(() =>
    props.herbs.filter((herb) => herbMatches(herb, query.value)),
);

const selected = computed(
    () => props.herbs.find((herb) => herb.id === props.modelValue) || null,
);
</script>

<template>
    <div>
        <label class="a-lbl" :for="`${uid}-q`">
            {{ t('safety.editor.herbLabel') }}
        </label>

        <SearchField
            v-model="query"
            :input-id="`${uid}-q`"
            variant="wide"
            :placeholder="t('safety.herbSearch')"
            :label="t('safety.herbSearchAria')"
        />

        <div class="a-scrolly a-pick" role="listbox">
            <div v-if="!shown.length" class="a-pick-none">
                {{ t('safety.herbNotFound', { q: query.trim() }) }}
            </div>

            <button
                v-for="herb in shown"
                :key="herb.id"
                type="button"
                role="option"
                class="a-listrow"
                :class="{ 'is-on': herb.id === modelValue }"
                :aria-selected="herb.id === modelValue"
                @click="emit('update:modelValue', herb.id)"
            >
                <AIcon
                    v-if="herb.id === modelValue"
                    name="check"
                    :size="16"
                    class="a-pick-mark"
                />
                <span>{{ loc(herb.name) }}</span>
                <span class="ltr a-pick-lat">{{ herb.lat }}</span>
            </button>
        </div>

        <div v-if="selected" class="a-hint a-pick-sel">
            {{ t('safety.editor.selected') }}:
            <strong>{{ loc(selected.name) }}</strong> ·
            <span class="ltr">{{ selected.lat }}</span>
        </div>
    </div>
</template>

<style scoped>
.a-pick {
    margin-top: 10px;
    max-height: 208px;
    border: 1px solid var(--a-line-2);
    border-radius: 9px;
}

.a-pick-none {
    padding: 16px;
    color: var(--a-ink-4);
}

.a-pick-mark {
    color: var(--a-accent);
}

.a-pick-lat {
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.a-pick-sel {
    font-size: 13.5px;
    color: var(--a-ink-3);
}
</style>
