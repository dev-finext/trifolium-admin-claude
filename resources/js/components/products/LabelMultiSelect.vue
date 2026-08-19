<script setup>
// The label picker inside the product form: chosen labels as removable tokens,
// a search field over the taxonomy, and a way out to create a label that does
// not exist yet without losing the form.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClickOutside } from '@/components/products/useClickOutside';
import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';

const props = defineProps({
    /** Chosen label ids. */
    modelValue: { type: Array, default: () => [] },
    labels: { type: Array, default: () => [] },
    /** How many labels one product may carry. */
    max: { type: Number, required: true },
});

const emit = defineEmits(['update:modelValue', 'create']);

const { t } = useI18n();
const { loc } = useLocalized();

const box = ref(null);
const open = ref(false);
const query = ref('');

useClickOutside(box, () => {
    open.value = false;
});

const nameOf = (id) => {
    const label = props.labels.find((row) => row.id === id);

    return label ? loc(label.name) : id;
};

const term = computed(() => query.value.trim());

const shown = computed(() => {
    if (!term.value) {
        return props.labels;
    }

    const needle = term.value.toLowerCase();

    return props.labels.filter((label) =>
        loc(label.name).toLowerCase().includes(needle),
    );
});

const atMax = computed(() => props.modelValue.length >= props.max);

function toggle(id) {
    if (props.modelValue.includes(id)) {
        emit(
            'update:modelValue',
            props.modelValue.filter((chosen) => chosen !== id),
        );

        return;
    }

    if (atMax.value) {
        return;
    }

    emit('update:modelValue', [...props.modelValue, id]);
}

function requestCreate() {
    open.value = false;
    emit('create');
}
</script>

<template>
    <div ref="box" class="a-multi">
        <div v-if="modelValue.length" class="a-tokens">
            <span v-for="id in modelValue" :key="id" class="a-token">
                {{ nameOf(id) }}
                <button
                    type="button"
                    :aria-label="
                        t('products.picker.remove', { name: nameOf(id) })
                    "
                    @click="toggle(id)"
                >
                    <AIcon name="x" :size="13" />
                </button>
            </span>
        </div>

        <div class="a-search a-w100 a-noflex">
            <span class="lead"><AIcon name="search" :size="18" /></span>
            <input
                v-model="query"
                class="a-tall"
                :placeholder="t('products.picker.searchPlaceholder')"
                :aria-label="t('products.picker.aria')"
                @focus="open = true"
            />
        </div>

        <div v-if="open" class="a-multi-pop">
            <div v-if="!shown.length" class="a-multi-none">
                {{ t('products.picker.none', { term }) }}
            </div>
            <div v-if="atMax" class="a-multi-none">
                {{ t('products.picker.atMax', { n: max }) }}
            </div>
            <button
                v-for="label in shown"
                :key="label.id"
                type="button"
                class="a-multi-row"
                :class="{ 'is-on': modelValue.includes(label.id) }"
                :disabled="atMax && !modelValue.includes(label.id)"
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
            </button>
            <button type="button" class="a-multi-new" @click="requestCreate">
                <AIcon name="plus" :size="15" />
                {{ t('products.picker.createNew') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* The search box sits at its natural height inside the picker rather than
   stretching with the surrounding flex row. */
.a-noflex {
    flex: none;
}

.a-tall {
    height: 44px;
}
</style>
