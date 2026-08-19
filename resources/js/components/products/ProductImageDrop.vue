<script setup>
// The product image field.
//
// It uploads nothing. A dropped or chosen file is previewed straight from the
// reader's own disk through an object URL, and the panel says so — the preview
// lives exactly as long as the page does. Wiring a real upload means replacing
// `take()` with a request and keeping everything else.
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { PRODUCT_RULES } from '@/stores/catalog';

defineProps({
    /** `{ src, name, local }`, or null. */
    modelValue: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'error']);

const { t } = useI18n();
const uid = useId();

const rules = PRODUCT_RULES.image;
const maxBytes = rules.maxMb * 1024 * 1024;

const over = ref(false);
const field = ref(null);

/** The URL this component minted, so it can be released again. */
const ownUrl = ref(null);

/** `JPG · PNG · WebP`, derived from the accepted MIME types. */
const typeList = computed(() =>
    rules.types
        .map((type) => type.replace('image/', '').toUpperCase())
        .map((name) => (name === 'JPEG' ? 'JPG' : name))
        .join(' · '),
);

const accept = rules.types.join(',');

function release() {
    if (ownUrl.value) {
        URL.revokeObjectURL(ownUrl.value);
        ownUrl.value = null;
    }
}

function take(file) {
    if (!file) {
        return;
    }

    if (!rules.types.includes(file.type)) {
        emit('error', t('products.image.typeError', { types: typeList.value }));

        return;
    }

    if (file.size > maxBytes) {
        emit('error', t('products.image.sizeError', { size: rules.maxMb }));

        return;
    }

    release();
    ownUrl.value = URL.createObjectURL(file);
    emit('update:modelValue', {
        src: ownUrl.value,
        name: file.name,
        local: true,
    });
}

function remove() {
    release();
    emit('update:modelValue', null);
}

function onDrop(event) {
    over.value = false;
    take(event.dataTransfer.files[0]);
}

function onPick(event) {
    take(event.target.files[0]);
    event.target.value = '';
}

onBeforeUnmount(release);
</script>

<template>
    <div v-if="modelValue" class="a-imgbox">
        <img :src="modelValue.src" :alt="t('products.image.previewAlt')" />
        <div class="a-imgbox-m">
            <div class="t-strong a-break">{{ modelValue.name }}</div>
            <div v-if="modelValue.local" class="a-hint">
                {{ t('products.image.localOnly') }}
            </div>
            <AButton sm icon="trash" @click="remove">
                {{ t('products.image.remove') }}
            </AButton>
        </div>
    </div>

    <div
        v-else
        class="a-drop"
        :class="{ 'is-over': over }"
        role="button"
        tabindex="0"
        :aria-label="t('products.image.chooseAria')"
        @click="field.click()"
        @keydown.enter.prevent="field.click()"
        @keydown.space.prevent="field.click()"
        @dragover.prevent="over = true"
        @dragleave="over = false"
        @drop.prevent="onDrop"
    >
        <AIcon name="image" :size="30" class="a-drop-ic" />
        <div class="t">{{ t('products.image.dropTitle') }}</div>
        <div class="s">
            {{
                t('products.image.dropHint', {
                    types: typeList,
                    size: rules.maxMb,
                    px: rules.recommendedPx,
                })
            }}
        </div>
        <div class="s">{{ t('products.image.localOnly') }}</div>
        <input
            :id="uid"
            ref="field"
            type="file"
            :accept="accept"
            hidden
            @change="onPick"
        />
    </div>
</template>

<style scoped>
.a-drop-ic {
    color: var(--a-ink-4);
}

.a-break {
    word-break: break-all;
}
</style>
