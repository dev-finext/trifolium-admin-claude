<script setup>
// The item picker.
//
// A real catalog holds thousands of rows, so picking one is search-first: free
// text over name / item code / latin name, plus kind, warehouse and a
// below-minimum switch. The list is capped and says so, which is what keeps the
// popover from rendering the whole catalog, and every row carries its available
// quantity — the picker is also where you notice an item is short.
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { useLocalized } from '@/composables/useLocalized';
import { STOCK_KIND, STOCK_KINDS, WAREHOUSES } from '@/config';
import { searchHaystack } from '@/lib/localized';
import { num } from '@/lib/money';

/** How many rows the popover renders at once before it asks for a narrower search. */
const PICK_CAP = 50;

const props = defineProps({
    modelValue: { type: String, default: '' },
    /** The stock rows to pick from. */
    items: { type: Array, default: () => [] },
    inputId: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();

const open = ref(false);
const q = ref('');
const kind = ref('');
const wh = ref('');
const low = ref(false);
const cursor = ref(0);
const box = ref(null);
const listBox = ref(null);
const field = ref(null);

const selected = computed(() =>
    props.items.find((item) => item.sku === props.modelValue),
);

const term = computed(() => q.value.trim().toLowerCase());

const matched = computed(() =>
    props.items.filter(
        (item) =>
            (!kind.value || item.kind === kind.value) &&
            (!wh.value || item.wh === wh.value) &&
            (!low.value || item.low) &&
            (!term.value ||
                searchHaystack(item.name, item.sku, item.lat).includes(
                    term.value,
                )),
    ),
);

const list = computed(() => matched.value.slice(0, PICK_CAP));
const dirty = computed(
    () =>
        Boolean(term.value) ||
        Boolean(kind.value) ||
        Boolean(wh.value) ||
        low.value,
);
const lowCount = computed(() => props.items.filter((item) => item.low).length);

const kinds = computed(() =>
    STOCK_KINDS.map((entry) => ({
        ...entry,
        label: t(`inventory.stockKind.${entry.id}`),
        n: props.items.filter((item) => item.kind === entry.id).length,
    })),
);

const warehouses = computed(() =>
    WAREHOUSES.map((warehouse) => ({
        id: warehouse.id,
        label: t('inventory.picker.whOption', {
            name: t(`warehouse.${warehouse.id}.name`),
            n: props.items.filter((item) => item.wh === warehouse.id).length,
        }),
    })),
);

/** The chip tone a stock kind is always shown in — config/catalog.js. */
const kindTone = (id) => STOCK_KIND[id]?.tone;

function reset() {
    q.value = '';
    kind.value = '';
    wh.value = '';
    low.value = false;
}

async function toggle() {
    open.value = !open.value;

    if (open.value) {
        await nextTick();
        field.value?.focus();
    }
}

function pick(item) {
    emit('update:modelValue', item.sku);
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

watch([q, kind, wh, low], () => {
    cursor.value = 0;
});

// Keep the highlighted row inside the scroll port without scrollIntoView, which
// would also scroll the page the popover sits on.
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
            <AIcon :name="selected ? 'package' : 'search'" :size="16" />
            <span class="a-pick-v">
                <template v-if="selected">
                    {{ loc(selected.name) }}
                    <span class="num a-pick-sku">· {{ selected.sku }}</span>
                </template>
                <template v-else>
                    {{ t('inventory.picker.placeholder') }}
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
                        :placeholder="t('inventory.picker.search')"
                        :aria-label="t('inventory.picker.aria.search')"
                        @keydown="onKey"
                    />
                </div>

                <div class="a-pick-chips">
                    <button
                        type="button"
                        :class="{ 'is-on': kind === '' }"
                        @click="kind = ''"
                    >
                        {{ t('inventory.picker.all') }}
                        <span class="num">{{ items.length }}</span>
                    </button>
                    <button
                        v-for="entry in kinds"
                        :key="entry.id"
                        type="button"
                        :class="{ 'is-on': kind === entry.id }"
                        @click="kind = kind === entry.id ? '' : entry.id"
                    >
                        {{ entry.label }}
                        <span class="num">{{ entry.n }}</span>
                    </button>
                </div>

                <div class="a-pick-row2">
                    <select
                        v-model="wh"
                        class="a-select"
                        :aria-label="t('inventory.picker.aria.wh')"
                    >
                        <option value="">{{ t('inventory.picker.wh') }}</option>
                        <option
                            v-for="warehouse in warehouses"
                            :key="warehouse.id"
                            :value="warehouse.id"
                        >
                            {{ warehouse.label }}
                        </option>
                    </select>
                    <button
                        type="button"
                        class="a-pick-tgl"
                        :class="{ 'is-on': low }"
                        :aria-pressed="low"
                        @click="low = !low"
                    >
                        <AIcon name="alert" :size="15" />
                        {{ t('inventory.picker.low') }}
                        <span class="num">{{ lowCount }}</span>
                    </button>
                    <AButton v-if="dirty" sm icon="x" @click="reset">
                        {{ t('inventory.picker.clear') }}
                    </AButton>
                </div>
            </div>

            <div ref="listBox" class="a-pick-list a-scrolly">
                <div v-if="!list.length" class="a-multi-none">
                    {{ t('inventory.picker.none') }}
                </div>
                <button
                    v-for="(item, i) in list"
                    :key="item.sku"
                    type="button"
                    role="option"
                    :aria-selected="item.sku === modelValue"
                    class="a-pick-r"
                    :class="{
                        'is-sel': item.sku === modelValue,
                        'is-cur': i === cursor,
                    }"
                    @mouseenter="cursor = i"
                    @click="pick(item)"
                >
                    <span class="a-pick-main">
                        <span class="t-strong">{{ loc(item.name) }}</span>
                        <span class="t-sub ltr">
                            {{ item.sku }}{{ item.lat ? ` · ${item.lat}` : '' }}
                        </span>
                    </span>
                    <AChip :tone="kindTone(item.kind)" size="sm" :dot="false">
                        {{ t(`inventory.stockKind.${item.kind}`) }}
                    </AChip>
                    <span class="a-pick-q">
                        <span
                            class="num a-pick-n"
                            :class="{ 'is-low': item.low }"
                        >
                            {{ num(item.avail) }}
                        </span>
                        {{ t(`inventory.unit.${item.unit}`) }}
                        <span v-if="item.low" class="a-pick-low">
                            {{ t('inventory.picker.low') }}
                        </span>
                    </span>
                </button>
            </div>

            <div class="a-pick-foot">
                <template v-if="matched.length > PICK_CAP">
                    {{
                        t('inventory.picker.capped', {
                            shown: PICK_CAP,
                            total: matched.length,
                        })
                    }}
                </template>
                <template v-else>
                    {{
                        t('inventory.picker.found', {
                            n: matched.length,
                            total: items.length,
                        })
                    }}
                </template>
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

.a-pick-n {
    font-weight: 700;
}

.a-pick-n.is-low {
    color: var(--a-red);
}

.a-pick-top .a-search input {
    height: 40px;
}

.a-pick-row2 .a-select {
    height: 38px;
}
</style>
