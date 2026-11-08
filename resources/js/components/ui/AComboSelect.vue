<script setup>
// A dropdown the app owns end to end, for the one place a native `<select>`
// caused a real bug: its OS-drawn popup could close on its own the moment the
// pointer left it, before a company was ever picked. This one only closes on
// an outside click, Escape, or a choice — never on `mouseleave` — the same
// idiom `GlobalSearch.vue` already uses for its own results popover.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    modelValue: { type: [String, Number], default: '' },
    /** `['a', 'b']` or `[{ value, label }]` — labels arrive translated. */
    options: { type: Array, default: () => [] },
    ltr: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const items = computed(() =>
    props.options.map((option) =>
        option !== null && typeof option === 'object'
            ? option
            : { value: option, label: option },
    ),
);

const open = ref(false);
const box = ref(null);

const current = computed(
    () => items.value.find((item) => item.value === props.modelValue) || null,
);

function toggle() {
    open.value = !open.value;
}

function pick(item) {
    emit('update:modelValue', item.value);
    open.value = false;
}

function onDocumentMousedown(event) {
    if (box.value && !box.value.contains(event.target)) {
        open.value = false;
    }
}

function onKeydown(event) {
    if (event.key === 'Escape') {
        open.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() =>
    document.removeEventListener('mousedown', onDocumentMousedown),
);
</script>

<template>
    <div ref="box" class="a-combo" :class="{ 'a-ltr-input': ltr }">
        <button
            type="button"
            class="a-select a-combo-btn"
            :aria-expanded="open"
            @click="toggle"
            @keydown="onKeydown"
        >
            <span class="a-combo-val">{{ current ? current.label : '—' }}</span>
            <AIcon name="chevron_down" :size="16" />
        </button>

        <div v-if="open" class="a-card a-combo-pop" role="listbox">
            <button
                v-for="item in items"
                :key="item.value"
                type="button"
                class="a-search-row"
                :class="{ 'is-on': item.value === modelValue }"
                role="option"
                :aria-selected="item.value === modelValue"
                @click="pick(item)"
            >
                {{ item.label }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.a-combo {
    position: relative;
}

.a-combo-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    cursor: pointer;
}

.a-combo-val {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.a-combo-pop {
    position: absolute;
    top: calc(100% + 6px);
    inset-inline: 0;
    z-index: 40;
    box-shadow: 0 20px 44px rgba(24, 32, 22, 0.16);
    max-height: 280px;
    overflow: auto;
    padding: 6px 0;
}
</style>
