<script setup>
// The catalogue's label filter. A product must carry every chosen label to
// survive it, so the counts next to each label are how many products hold that
// label at all, not how many the current combination would leave.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClickOutside } from '@/components/products/useClickOutside';
import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';

const props = defineProps({
    /** Chosen label ids. */
    modelValue: { type: Array, default: () => [] },
    labels: { type: Array, default: () => [] },
    /** `(labelId) => number` — how many products carry it. */
    usage: { type: Function, required: true },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();

const box = ref(null);
const open = ref(false);

useClickOutside(box, () => {
    open.value = false;
});

const caption = computed(() =>
    props.modelValue.length
        ? t('products.filters.labelsChosen', { n: props.modelValue.length })
        : t('products.filters.labelsAll'),
);

function toggle(id) {
    emit(
        'update:modelValue',
        props.modelValue.includes(id)
            ? props.modelValue.filter((chosen) => chosen !== id)
            : [...props.modelValue, id],
    );
}
</script>

<template>
    <div ref="box" class="a-multi a-labelfilter">
        <button
            type="button"
            class="a-select a-w100 a-multi-btn"
            :class="{ 'is-on': modelValue.length }"
            :aria-expanded="open"
            :aria-label="t('products.filters.labelsAria')"
            @click="open = !open"
        >
            <AIcon name="tag" :size="16" />
            <span>{{ caption }}</span>
            <AIcon name="chevron_down" :size="15" class="a-chev" />
        </button>

        <div v-if="open" class="a-multi-pop">
            <button
                v-for="label in labels"
                :key="label.id"
                type="button"
                class="a-multi-row"
                :class="{ 'is-on': modelValue.includes(label.id) }"
                @click="toggle(label.id)"
            >
                <i class="a-tick">
                    <AIcon
                        v-if="modelValue.includes(label.id)"
                        name="check"
                        :size="13"
                    />
                </i>
                <span>{{ loc(label.name) }}</span>
                <span class="a-multi-n">{{ usage(label.id) }}</span>
            </button>
            <button
                v-if="modelValue.length"
                type="button"
                class="a-multi-new"
                @click="emit('update:modelValue', [])"
            >
                <AIcon name="x" :size="15" />
                {{ t('products.filters.labelsClear') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.a-labelfilter {
    width: 240px;
}

/* The chevron is pushed to the trailing edge, whichever edge that is. */
.a-chev {
    margin-inline-start: auto;
}
</style>
