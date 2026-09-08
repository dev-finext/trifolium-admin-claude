<script setup>
// The notes pool: the short lines that print on a preparation label by type —
// "refrigerate after opening", "shake before use". One text, edited once,
// changes every future print; the template does not have to know.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useItemsStore } from '@/stores/items';
import { useStickersStore } from '@/stores/stickers';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const stickers = useStickersStore();
const items = useItemsStore();

const prepTypes = computed(() => items.prepTypes);

/** Editable copies, keyed by note id. */
const drafts = reactive({});

function draftOf(note) {
    if (!drafts[note.id]) {
        drafts[note.id] = {
            text: loc(note.text) || '',
            all: Boolean(note.all),
            prepTypes: [...(note.prepTypes || [])],
            active: note.active !== false,
        };
    }

    return drafts[note.id];
}

watch(
    () => stickers.notes.map((note) => note.id).join(','),
    () => {
        Object.keys(drafts).forEach((id) => {
            if (!stickers.notes.some((note) => note.id === id)) {
                delete drafts[id];
            }
        });
    },
);

function isDirty(note) {
    const draft = draftOf(note);

    return (
        draft.text !== (loc(note.text) || '') ||
        draft.all !== Boolean(note.all) ||
        draft.active !== (note.active !== false) ||
        [...draft.prepTypes].sort().join(',') !==
            [...(note.prepTypes || [])].sort().join(',')
    );
}

function toggleType(draft, id) {
    draft.prepTypes = draft.prepTypes.includes(id)
        ? draft.prepTypes.filter((row) => row !== id)
        : [...draft.prepTypes, id];
}

async function save(note) {
    const draft = draftOf(note);

    if (!draft.text.trim()) {
        return;
    }

    await stickers.saveNote({ id: note.id, ...draft });
    delete drafts[note.id];
    push({ title: t('stickers.notes.saved'), body: draft.text });
}

const adding = ref(false);
const fresh = reactive({ text: '', all: false, prepTypes: [], active: true });

async function create() {
    if (!fresh.text.trim()) {
        return;
    }

    await stickers.saveNote({ ...fresh });
    push({ title: t('stickers.notes.saved'), body: fresh.text });
    fresh.text = '';
    fresh.all = false;
    fresh.prepTypes = [];
    adding.value = false;
}

const removing = ref(null);

async function confirmRemove() {
    const note = removing.value;

    removing.value = null;

    if (note) {
        await stickers.removeNote(note.id);
        push({ title: t('stickers.notes.removed'), body: loc(note.text) });
    }
}

const typeCount = (draft) =>
    draft.all ? prepTypes.value.length : draft.prepTypes.length;
</script>

<template>
    <ACard :title="t('stickers.notes.title')" icon="edit" :pad="false">
        <template #right>
            <V2Badge id="labels" size="sm" />
            <AButton sm kind="p" icon="plus" @click="adding = !adding">
                {{ t('stickers.notes.add') }}
            </AButton>
        </template>

        <p class="a-hint nt-intro">{{ t('stickers.notes.note') }}</p>

        <div v-if="adding" class="nt-row is-new">
            <label class="a-lbl" for="stk-new-note">{{
                t('stickers.notes.text')
            }}</label>
            <AInput
                id="stk-new-note"
                v-model="fresh.text"
                class="a-w100"
                :placeholder="t('stickers.notes.textPh')"
            />
            <div class="nt-types">
                <div class="nt-sw">
                    <ASwitch
                        v-model="fresh.all"
                        :label="t('stickers.notes.all')"
                    />
                    <span>{{ t('stickers.notes.all') }}</span>
                </div>
                <div v-if="!fresh.all" class="nt-chips">
                    <button
                        v-for="type in prepTypes"
                        :key="type.id"
                        type="button"
                        class="nt-chip"
                        :class="{ 'is-on': fresh.prepTypes.includes(type.id) }"
                        @click="toggleType(fresh, type.id)"
                    >
                        {{ loc(type.name) }}
                    </button>
                </div>
            </div>
            <div class="nt-a">
                <AButton
                    kind="p"
                    icon="save"
                    :disabled="!fresh.text.trim()"
                    @click="create"
                >
                    {{ t('stickers.notes.save') }}
                </AButton>
                <AButton @click="adding = false">{{
                    t('actions.cancel')
                }}</AButton>
            </div>
        </div>

        <div v-if="stickers.notes.length" class="nt-list">
            <div
                v-for="note in stickers.notes"
                :key="note.id"
                class="nt-row"
                :class="{ 'is-off': !draftOf(note).active }"
            >
                <div class="nt-h">
                    <AInput
                        v-model="draftOf(note).text"
                        class="nt-text"
                        :aria-label="t('stickers.notes.text')"
                    />
                    <AChip
                        :tone="draftOf(note).active ? 'green' : 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{
                            draftOf(note).active
                                ? t('stickers.notes.active')
                                : t('stickers.notes.inactive')
                        }}
                    </AChip>
                    <span class="t-sub">{{
                        t('stickers.notes.count', {
                            n: typeCount(draftOf(note)),
                        })
                    }}</span>
                    <div class="a-push nt-a">
                        <AButton
                            sm
                            kind="p"
                            icon="save"
                            :disabled="
                                !isDirty(note) || !draftOf(note).text.trim()
                            "
                            @click="save(note)"
                        >
                            {{ t('stickers.notes.save') }}
                        </AButton>
                        <AButton sm icon="trash" @click="removing = note">
                            {{ t('stickers.notes.remove') }}
                        </AButton>
                    </div>
                </div>
                <div class="nt-types">
                    <div class="nt-sw">
                        <ASwitch
                            v-model="draftOf(note).active"
                            :label="t('stickers.notes.active')"
                        />
                        <span>{{ t('stickers.notes.active') }}</span>
                    </div>
                    <div class="nt-sw">
                        <ASwitch
                            v-model="draftOf(note).all"
                            :label="t('stickers.notes.all')"
                        />
                        <span>{{ t('stickers.notes.all') }}</span>
                    </div>
                    <div v-if="!draftOf(note).all" class="nt-chips">
                        <button
                            v-for="type in prepTypes"
                            :key="type.id"
                            type="button"
                            class="nt-chip"
                            :class="{
                                'is-on': draftOf(note).prepTypes.includes(
                                    type.id,
                                ),
                            }"
                            @click="toggleType(draftOf(note), type.id)"
                        >
                            {{ loc(type.name) }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <AEmpty v-else icon="edit" :title="t('stickers.notes.empty')" />

        <ConfirmDialog
            :open="Boolean(removing)"
            danger
            :title="t('stickers.notes.removeTitle')"
            :body="
                t('stickers.notes.removeBody', {
                    text: removing ? loc(removing.text) : '',
                })
            "
            :confirm-label="t('stickers.notes.remove')"
            @close="removing = null"
            @confirm="confirmRemove"
        />
    </ACard>
</template>

<style scoped>
.nt-intro {
    margin: 0;
    padding: 12px 18px 0;
}

.nt-list {
    display: flex;
    flex-direction: column;
}

.nt-row {
    padding: 14px 18px;
    border-top: 1px solid var(--a-line);
}

.nt-row.is-new {
    background: var(--a-tint);
    display: grid;
    gap: 8px;
}

.nt-row.is-off .nt-text {
    opacity: 0.7;
}

.nt-h {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.nt-text {
    flex: 1;
    min-width: 260px;
}

.nt-a {
    display: flex;
    gap: 8px;
}

.nt-types {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 10px;
}

.nt-sw {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--a-ink-3);
}

.nt-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.nt-chip {
    padding: 3px 9px;
    border: 1px solid var(--a-line-2);
    border-radius: 999px;
    background: var(--a-surface);
    color: var(--a-ink-3);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
}

.nt-chip.is-on {
    border-color: var(--a-accent-2);
    background: var(--a-tint);
    color: var(--a-accent-2);
    font-weight: 600;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
