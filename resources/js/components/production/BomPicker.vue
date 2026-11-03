<script setup>
// Choosing which product a production order makes.
//
// A plain `<select>` here only jump-scrolls by the first letters of its visible
// label, which is the name — so typing the item code to find "Acorus calamus
// rd T · 200005" does nothing, because the code sits at the end of the label,
// not the start. Natalie, trying exactly that: "כשאני מנסה להקליד מספר שאני
// רוצה לייצר זה לא נותן לי. רק בחירה מתוך גלילה של רשימה — זה לא נוח".
//
// This is the same search-first picker the inventory screens use
// (components/inventory/ItemPicker.vue), trimmed to what a recipe list needs:
// no warehouse or stock-kind filters, because a BOM has neither — only a name
// and the item code it produces.
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';
import { searchHaystack } from '@/lib/localized';

/** How many rows the popover renders before it asks for a narrower search. */
const PICK_CAP = 50;

const props = defineProps({
    modelValue: { type: String, default: '' },
    /** `[{ value: bomId, label, sku, name }]` — every recipe to pick from. */
    options: { type: Array, default: () => [] },
    inputId: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();

const open = ref(false);
const q = ref('');
const cursor = ref(0);
const box = ref(null);
const listBox = ref(null);
const field = ref(null);

const selected = computed(() =>
    props.options.find((row) => row.value === props.modelValue),
);

const term = computed(() => q.value.trim().toLowerCase());

const matched = computed(() =>
    props.options.filter(
        (row) =>
            !term.value ||
            searchHaystack(row.name, row.sku).includes(term.value),
    ),
);

const list = computed(() => matched.value.slice(0, PICK_CAP));

async function toggle() {
    open.value = !open.value;

    if (open.value) {
        await nextTick();
        field.value?.focus();
    }
}

function pick(row) {
    emit('update:modelValue', row.value);
    open.value = false;
    q.value = '';
}

function onKey(event) {
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        cursor.value = Math.min(list.value.length - 1, cursor.value + 1);

        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        cursor.value = Math.max(0, cursor.value - 1);

        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();

        if (list.value[cursor.value]) {
            pick(list.value[cursor.value]);
        }

        return;
    }

    if (event.key === 'Escape') {
        open.value = false;
    }
}

function onOutside(event) {
    if (box.value && !box.value.contains(event.target)) {
        open.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside));

watch(q, () => {
    cursor.value = 0;
});

// Keep the highlighted row inside the scroll port without scrollIntoView,
// which would also scroll the page the popover sits on.
watch([cursor, open], async () => {
    await nextTick();

    const port = listBox.value;

    if (!port || !open.value) {
        return;
    }

    const row = port.children[cursor.value];

    if (!row) {
        return;
    }

    if (row.offsetTop < port.scrollTop) {
        port.scrollTop = row.offsetTop;
    } else if (
        row.offsetTop + row.offsetHeight >
        port.scrollTop + port.clientHeight
    ) {
        port.scrollTop = row.offsetTop + row.offsetHeight - port.clientHeight;
    }
});
</script>

<template>
    <div ref="box" class="a-multi">
        <button
            :id="inputId || undefined"
            type="button"
            class="a-select a-w100 a-multi-btn"
            :class="{ 'is-on': selected }"
            :aria-expanded="open"
            aria-haspopup="listbox"
            @click="toggle"
        >
            <AIcon :name="selected ? 'beaker' : 'search'" :size="16" />
            <span class="a-pick-v">
                <template v-if="selected">
                    {{ loc(selected.name) }}
                    <span class="num a-pick-sku">· {{ selected.sku }}</span>
                </template>
                <template v-else>
                    {{ t('production.create.productChoose') }}
                </template>
            </span>
            <AIcon name="chevron_down" :size="15" class="a-pick-caret" />
        </button>

        <div v-if="open" class="a-multi-pop a-pick-pop" role="listbox">
            <div class="a-pick-top">
                <div class="a-search a-w100">
                    <span class="lead"><AIcon name="search" :size="17" /></span>
                    <input
                        ref="field"
                        v-model="q"
                        type="search"
                        :placeholder="t('production.create.productSearch')"
                        :aria-label="t('production.create.productSearchAria')"
                        @keydown="onKey"
                    />
                </div>
            </div>

            <div ref="listBox" class="a-pick-list a-scrolly">
                <div v-if="!list.length" class="a-multi-none">
                    {{ t('production.create.productNone') }}
                </div>
                <button
                    v-for="(row, i) in list"
                    :key="row.value"
                    type="button"
                    role="option"
                    :aria-selected="row.value === modelValue"
                    class="a-pick-r"
                    :class="{
                        'is-sel': row.value === modelValue,
                        'is-cur': i === cursor,
                    }"
                    @mouseenter="cursor = i"
                    @click="pick(row)"
                >
                    <span class="a-pick-main">
                        <span class="t-strong">{{ loc(row.name) }}</span>
                        <span class="t-sub ltr">{{ row.sku }}</span>
                    </span>
                </button>
            </div>

            <div class="a-pick-foot">
                {{
                    t('production.create.productFound', {
                        n: matched.length,
                        total: options.length,
                    })
                }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.a-pick-sku {
    color: var(--a-ink-4);
}

.a-pick-caret {
    margin-inline-start: auto;
    flex: none;
}

.a-pick-top .a-search input {
    height: 40px;
}
</style>
