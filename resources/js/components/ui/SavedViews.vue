<script setup>
// A person's own saved filters, and the one they work from every day — on any
// list in the console.
//
// Nothing is shipped here: an agent's useful filters are theirs, and a row of
// guesses made by whoever built the screen only takes up space. The strip is
// empty until someone saves something, and says so.
//
// One saved filter can be starred as the standing filter. That one is applied
// when the screen is opened cold — which is the point: whoever spends the shift
// on "waiting shipments to Haifa" should not rebuild it every morning. A link
// carrying its own filter always beats the star, so a pasted view still opens as
// its sender saw it.
//
// Storage is this browser, keyed by the spec's id. A real deployment would keep
// these on the account so they follow the person between machines, and would let
// a supervisor publish one to the team; the record shape here is already what
// that needs.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import { activeKeys, applyFilters, emptyFilters } from '@/lib/facets';
import { num } from '@/lib/money';

const props = defineProps({
    /** The screen's filter spec — see composables/useListFilters.js. */
    spec: { type: Object, required: true },
    /** The live filter state. */
    filters: { type: Object, required: true },
    /** Rows the date range left — the basis every view counts against. */
    rows: { type: Array, default: () => [] },
});

const emit = defineEmits(['apply']);

const { t } = useI18n();

const storageKey = computed(() => `trifolium-admin-views-${props.spec.id}`);
const pinnedKey = computed(() => `${storageKey.value}-pinned`);

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);

        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private-mode browsers refuse; the filter still works for this session.
    }
}

const own = ref(read(storageKey.value, []));
const pinnedId = ref(read(pinnedKey.value, null));
const naming = ref(false);
const draftName = ref('');

// One strip can serve several lists on one screen (a tabbed screen changes its
// spec), so the store follows the id.
watch(storageKey, (key) => {
    own.value = read(key, []);
    pinnedId.value = read(`${key}-pinned`, null);
});

/** The filter half of the state — the date range is never part of a view. */
function filterPatch() {
    const patch = {};

    activeKeys(props.spec.fields, props.filters).forEach((key) => {
        const value = props.filters[key];

        patch[key] = Array.isArray(value) ? [...value] : { ...value };
    });

    const q = props.spec.queryKey || 'q';

    if (props.filters[q]?.trim?.()) {
        patch[q] = props.filters[q];
    }

    return patch;
}

/** How many rows a saved filter would leave, against the date range only. */
function countFor(patch) {
    const fields = { ...patch };

    delete fields[props.spec.queryKey || 'q'];

    return applyFilters(props.rows, props.spec.fields, {
        ...emptyFilters(props.spec.fields),
        ...fields,
    }).length;
}

function samePatch(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of keys) {
        if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)) {
            return false;
        }
    }

    return true;
}

const currentPatch = computed(() => filterPatch());

const views = computed(() =>
    own.value.map((view) => ({
        ...view,
        n: countFor(view.patch),
        active: samePatch(view.patch, currentPatch.value),
        pinned: view.id === pinnedId.value,
    })),
);

const canSave = computed(() => Object.keys(currentPatch.value).length > 0);

function openSave() {
    draftName.value = '';
    naming.value = true;
}

/** The next free "View N" — used when someone saves without naming. */
function autoName() {
    const used = new Set(own.value.map((view) => view.name));
    let n = own.value.length + 1;

    while (used.has(t('filters.savedViews.autoName', { n }))) {
        n += 1;
    }

    return t('filters.savedViews.autoName', { n });
}

// The name is a convenience, not a requirement: someone who just wants this
// filter kept should not have to invent a label for it first.
function confirmSave() {
    const name = draftName.value.trim() || autoName();

    own.value = [
        ...own.value,
        { id: `own-${Date.now()}`, name, patch: currentPatch.value },
    ];
    write(storageKey.value, own.value);
    naming.value = false;
}

function remove(id) {
    own.value = own.value.filter((view) => view.id !== id);
    write(storageKey.value, own.value);

    if (pinnedId.value === id) {
        pinnedId.value = null;
        write(pinnedKey.value, null);
    }
}

function togglePin(id) {
    pinnedId.value = pinnedId.value === id ? null : id;
    write(pinnedKey.value, pinnedId.value);
}

/** The standing filter, for the screen to apply when it opens cold. */
function standingPatch() {
    const hit = own.value.find((view) => view.id === pinnedId.value);

    return hit ? hit.patch : null;
}

defineExpose({ openSave, standingPatch });
</script>

<template>
    <div class="sv">
        <div
            class="sv-strip"
            role="group"
            :aria-label="t('filters.savedViews.label')"
        >
            <button
                v-for="view in views"
                :key="view.id"
                type="button"
                class="sv-view"
                :class="{ 'is-pinned': view.pinned }"
                :aria-pressed="view.active"
                @click="emit('apply', view.patch)"
            >
                <span class="sv-name">{{ view.name }}</span>
                <span class="sv-n num">{{ num(view.n) }}</span>
                <span
                    class="sv-act"
                    :class="{ 'is-on': view.pinned }"
                    role="button"
                    tabindex="0"
                    :title="
                        view.pinned
                            ? t('filters.savedViews.unpin')
                            : t('filters.savedViews.pin')
                    "
                    :aria-label="
                        view.pinned
                            ? t('filters.savedViews.unpin')
                            : t('filters.savedViews.pin')
                    "
                    @click.stop="togglePin(view.id)"
                    @keydown.enter.stop.prevent="togglePin(view.id)"
                >
                    ★
                </span>
                <span
                    class="sv-act sv-x"
                    role="button"
                    tabindex="0"
                    :aria-label="
                        t('filters.savedViews.remove', { name: view.name })
                    "
                    @click.stop="remove(view.id)"
                    @keydown.enter.stop.prevent="remove(view.id)"
                >
                    ×
                </span>
            </button>

            <AButton sm icon="plus" :disabled="!canSave" @click="openSave">
                {{ t('filters.savedViews.save') }}
            </AButton>

            <span v-if="!views.length" class="sv-empty">
                {{ t('filters.savedViews.empty') }}
            </span>
        </div>

        <AModal
            :open="naming"
            :title="t('filters.savedViews.saveTitle')"
            :width="480"
            @close="naming = false"
        >
            <label class="a-lbl" for="sv-name">
                {{ t('filters.savedViews.nameLabel') }}
                <span class="sv-optional">
                    {{ t('filters.savedViews.optional') }}
                </span>
            </label>
            <AInput
                id="sv-name"
                v-model="draftName"
                class="a-w100"
                :placeholder="t('filters.savedViews.namePlaceholder')"
                @keydown.enter="confirmSave"
            />
            <p class="a-hint">{{ t('filters.savedViews.saveHint') }}</p>
            <p class="a-hint">{{ t('filters.savedViews.defaultHint') }}</p>

            <template #footer>
                <AButton kind="p" icon="save" @click="confirmSave">
                    {{ t('filters.savedViews.saveConfirm') }}
                </AButton>
                <AButton @click="naming = false">
                    {{ t('actions.cancel') }}
                </AButton>
            </template>
        </AModal>
    </div>
</template>

<style scoped>
.sv-strip {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.sv-view {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    font: inherit;
    background: var(--a-surface);
    border: 1px solid var(--a-line-2);
    border-radius: 999px;
    padding: 6px 8px 6px 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--a-ink-2);
    transition:
        background 0.13s,
        border-color 0.13s;
}

.sv-view:hover {
    background: var(--a-tint);
    border-color: var(--a-accent);
}

/* The standing filter is legible as such even when it is not the active one. */
.sv-view.is-pinned {
    border-color: var(--a-accent);
}

.sv-view[aria-pressed='true'] {
    background: var(--a-accent);
    border-color: var(--a-accent);
    color: #fff;
}

.sv-n {
    font-size: 12.5px;
    background: var(--a-sunk);
    color: var(--a-ink-3);
    border-radius: 999px;
    padding: 1px 8px;
}

.sv-view[aria-pressed='true'] .sv-n {
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
}

.sv-act {
    display: grid;
    place-items: center;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
    color: var(--a-line-2);
}

.sv-act.is-on {
    color: var(--a-accent);
}

.sv-act:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--a-accent-2);
}

.sv-x {
    font-size: 15px;
}

.sv-x:hover {
    color: var(--a-red);
}

.sv-view[aria-pressed='true'] .sv-act {
    color: rgba(255, 255, 255, 0.55);
}

.sv-view[aria-pressed='true'] .sv-act.is-on {
    color: #fff;
}

.sv-optional {
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: var(--a-ink-4);
}

.sv-empty {
    font-size: 13.5px;
    color: var(--a-ink-4);
    line-height: 1.5;
}
</style>
