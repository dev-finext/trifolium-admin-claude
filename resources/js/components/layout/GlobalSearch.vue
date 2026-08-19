<script setup>
// Global search over the two things an agent looks up by hand: an order and a
// practitioner.
//
// The haystack is built with `searchHaystack`, so a Hebrew query finds a record
// while the console is in English and the other way round — the same typed name
// matches whichever language the console happens to be showing.
//
// Fully keyboard driven: arrows move the selection, Enter opens it, Escape closes
// the panel and clears the field.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { searchHaystack } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/** How many hits of each kind the panel lists before it stops. */
const ORDER_LIMIT = 6;
const PRACTITIONER_LIMIT = 4;

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const dataset = useDatasetStore();

const query = ref('');
const open = ref(false);
const active = ref(0);
const box = ref(null);
const field = ref(null);

const term = computed(() => query.value.trim());
const needle = computed(() => term.value.toLowerCase());

const orderHits = computed(() => {
    if (!needle.value) {
        return [];
    }

    return dataset.orders
        .filter((order) =>
            searchHaystack(
                order.id,
                order.patient?.name,
                order.patient?.phone,
                order.practitioner?.name,
                order.tracking,
            ).includes(needle.value),
        )
        .slice(0, ORDER_LIMIT);
});

const practitionerHits = computed(() => {
    if (!needle.value) {
        return [];
    }

    return dataset.practitioners
        .filter((practitioner) =>
            searchHaystack(
                practitioner.code,
                practitioner.name,
                practitioner.phone,
            ).includes(needle.value),
        )
        .slice(0, PRACTITIONER_LIMIT);
});

/** Both lists as one keyboard sequence: orders first, practitioners after. */
const hits = computed(() => [
    ...orderHits.value.map((order) => ({
        to: { name: 'order', params: { id: order.id } },
    })),
    ...practitionerHits.value.map((practitioner) => ({
        to: {
            name: 'users',
            query: { tab: 'directory', practitioner: practitioner.code },
        },
    })),
]);

const isOpen = computed(() => open.value && term.value.length > 0);

/** Index of a row within the combined keyboard sequence. */
const orderIndex = (i) => i;
const practitionerIndex = (i) => orderHits.value.length + i;

function close() {
    open.value = false;
    query.value = '';
    active.value = 0;
}

function onInput() {
    open.value = true;
    active.value = 0;
}

function go(to) {
    router.push(to);
    close();
}

/** Enter opens the selected hit, which is the first one until arrows move it. */
function openActive() {
    const hit = hits.value[active.value] || hits.value[0];

    if (hit) {
        go(hit.to);
    }
}

function move(step) {
    if (!hits.value.length) {
        return;
    }

    open.value = true;

    const next = active.value + step;

    active.value = (next + hits.value.length) % hits.value.length;
}

function onKeydown(event) {
    if (event.key === 'Escape') {
        close();
        field.value?.blur();

        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        openActive();

        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(1);

        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(-1);
    }
}

function onDocumentMousedown(event) {
    if (box.value && !box.value.contains(event.target)) {
        open.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() =>
    document.removeEventListener('mousedown', onDocumentMousedown),
);
</script>

<template>
    <div ref="box" class="a-search">
        <span class="lead"><AIcon name="search" :size="19" /></span>
        <input
            ref="field"
            v-model="query"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="a-search-list"
            :aria-expanded="isOpen"
            :aria-activedescendant="
                isOpen && hits.length ? `a-search-hit-${active}` : undefined
            "
            :aria-label="t('shell.search.label')"
            :placeholder="t('shell.search.placeholder')"
            @input="onInput"
            @focus="open = true"
            @keydown="onKeydown"
        />

        <div
            v-if="isOpen"
            id="a-search-list"
            class="a-card a-search-pop"
            role="listbox"
            :aria-label="t('shell.search.label')"
        >
            <div v-if="!hits.length" class="a-search-empty">
                {{ t('shell.search.empty', { term }) }}
            </div>

            <template v-if="orderHits.length">
                <div class="a-sect-t a-search-sect">
                    {{ t('shell.search.orders') }}
                </div>
                <button
                    v-for="(order, i) in orderHits"
                    :id="`a-search-hit-${orderIndex(i)}`"
                    :key="order.id"
                    type="button"
                    class="a-search-row"
                    :class="{ 'is-on': active === orderIndex(i) }"
                    role="option"
                    :aria-selected="active === orderIndex(i)"
                    @mouseenter="active = orderIndex(i)"
                    @click="go({ name: 'order', params: { id: order.id } })"
                >
                    <ANum>{{ order.id }}</ANum>
                    <span class="a-search-n">{{
                        loc(order.patient.name)
                    }}</span>
                    <span class="a-search-s">
                        {{ loc(order.practitioner.name) }}
                    </span>
                    <span class="a-push">
                        <StatusChip :status="order.status" size="sm" />
                    </span>
                </button>
            </template>

            <template v-if="practitionerHits.length">
                <div class="a-sect-t a-search-sect is-divided">
                    {{ t('shell.search.practitioners') }}
                </div>
                <button
                    v-for="(practitioner, i) in practitionerHits"
                    :id="`a-search-hit-${practitionerIndex(i)}`"
                    :key="practitioner.code"
                    type="button"
                    class="a-search-row"
                    :class="{ 'is-on': active === practitionerIndex(i) }"
                    role="option"
                    :aria-selected="active === practitionerIndex(i)"
                    @mouseenter="active = practitionerIndex(i)"
                    @click="
                        go({
                            name: 'users',
                            query: {
                                tab: 'directory',
                                practitioner: practitioner.code,
                            },
                        })
                    "
                >
                    <ANum>{{ practitioner.code }}</ANum>
                    <span class="a-search-n">{{ loc(practitioner.name) }}</span>
                    <span class="a-search-s">
                        {{ t(`therapy.${practitioner.therapy}`) }}
                    </span>
                </button>
            </template>

            <div v-if="hits.length" class="a-search-hint">
                {{ t('shell.search.hint') }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.a-search-empty {
    padding: 22px;
    color: var(--a-ink-4);
}

.a-search-sect {
    padding: 12px 18px 6px;
    margin: 0;
}

.a-search-sect.is-divided {
    border-top: 1px solid var(--a-line);
}

.a-search-n {
    font-weight: 600;
}

.a-search-s {
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.a-search-hint {
    padding: 10px 18px 12px;
    border-top: 1px solid var(--a-line);
    color: var(--a-ink-4);
    font-size: 12.5px;
}
</style>
