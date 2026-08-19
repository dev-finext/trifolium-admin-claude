<script setup>
// התוויות נגד לפי צמח — the conditions under which a herb needs a second look
// before it is compounded: pregnancy, an anticoagulant, an autoimmune condition.
//
// Unlike an interaction, a contraindication is not tied to a named drug — it is a
// state the patient is in. The catalog carries the tags, this screen decides which
// herb carries which, and every practitioner who picks the herb in the compounding
// wizard sees the result.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { herbMatches, useSafetyStore } from '@/stores/safety';

const emit = defineEmits(['saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useSafetyStore();

const view = useUrlState({ hq: '', tag: '', hstate: '', sel: '' });

const withTags = computed(() =>
    store.herbs.filter((herb) => store.warningsFor(herb.id).length),
);

const tagCount = (tag) =>
    store.herbs.filter((herb) =>
        store.warningsFor(herb.id).some((row) => row.he === tag.he),
    ).length;

const shown = computed(() =>
    store.herbs.filter((herb) => {
        if (!herbMatches(herb, view.hq)) {
            return false;
        }

        const tags = store.warningsFor(herb.id);

        if (view.tag && !tags.some((row) => row.he === view.tag)) {
            return false;
        }

        if (view.hstate === 'has' && !tags.length) {
            return false;
        }

        if (view.hstate === 'none' && tags.length) {
            return false;
        }

        return true;
    }),
);

// The selection falls back to the first herb the filter left standing, so the
// right-hand pane is never blank and no herb id is baked into the screen.
const selectedId = computed(() => view.sel || shown.value[0]?.id || '');
const selected = computed(() => store.herb(selectedId.value));

/** The tags being toggled, saved only when the reader says so. */
const draft = ref([]);

watch(
    selectedId,
    (id) => {
        draft.value = [...store.warningsFor(id)];
    },
    { immediate: true },
);

const keysOf = (tags) =>
    tags
        .map((tag) => tag.he)
        .sort()
        .join('|');

const changed = computed(
    () => keysOf(draft.value) !== keysOf(store.warningsFor(selectedId.value)),
);

const isOn = (tag) => draft.value.some((row) => row.he === tag.he);

function toggle(tag) {
    draft.value = isOn(tag)
        ? draft.value.filter((row) => row.he !== tag.he)
        : [...draft.value, tag];
}

const dirty = computed(() =>
    Boolean(view.hq || view.tag || view.hstate || view.sel),
);

function clear() {
    view.hq = '';
    view.tag = '';
    view.hstate = '';
    view.sel = '';
}

async function save() {
    await store.setHerbWarnings(selectedId.value, draft.value);
    emit('saved', {
        herb: loc(selected.value?.name),
        n: draft.value.length,
    });
}
</script>

<template>
    <div class="a-warn">
        <ACard :title="t('safety.warn.herbsCard')" icon="leaf" :pad="false">
            <div class="a-warn-f">
                <SearchField
                    v-model="view.hq"
                    variant="wide"
                    :placeholder="t('safety.herbSearchAria')"
                    :label="t('safety.herbSearchAria')"
                />

                <ASelect
                    v-model="view.hstate"
                    class="a-w100"
                    :aria-label="t('safety.warn.stateAria')"
                >
                    <option value="">
                        {{
                            t('safety.warn.stateAll', { n: store.herbs.length })
                        }}
                    </option>
                    <option value="has">
                        {{ t('safety.warn.stateHas', { n: withTags.length }) }}
                    </option>
                    <option value="none">
                        {{
                            t('safety.warn.stateNone', {
                                n: store.herbs.length - withTags.length,
                            })
                        }}
                    </option>
                </ASelect>

                <ASelect
                    v-model="view.tag"
                    class="a-w100"
                    :aria-label="t('safety.warn.tagAria')"
                >
                    <option value="">{{ t('safety.warn.tagAll') }}</option>
                    <option
                        v-for="tag in store.warningTags"
                        :key="tag.he"
                        :value="tag.he"
                    >
                        {{
                            t('safety.warn.option', {
                                name: loc(tag),
                                n: tagCount(tag),
                            })
                        }}
                    </option>
                </ASelect>

                <AButton v-if="dirty" sm icon="x" @click="clear">
                    {{ t('ui.clearFilter') }}
                </AButton>

                <div class="a-warn-count">
                    {{
                        t('safety.warn.count', {
                            n: shown.length,
                            total: store.herbs.length,
                        })
                    }}
                </div>
            </div>

            <div class="a-scrolly a-warn-list">
                <div v-if="!shown.length" class="a-warn-none">
                    {{ t('safety.noHerbMatch') }}
                </div>

                <button
                    v-for="herb in shown"
                    :key="herb.id"
                    type="button"
                    class="a-listrow"
                    :class="{ 'is-on': herb.id === selectedId }"
                    @click="view.sel = herb.id"
                >
                    <span>{{ loc(herb.name) }}</span>
                    <span
                        v-if="store.warningsFor(herb.id).length"
                        class="a-push"
                    >
                        <AChip tone="amber" size="sm" :dot="false">
                            {{ store.warningsFor(herb.id).length }}
                        </AChip>
                    </span>
                </button>
            </div>
        </ACard>

        <div v-if="selected" class="a-grid">
            <ACard
                :title="t('safety.warn.title', { herb: loc(selected.name) })"
                icon="shield"
            >
                <template #right>
                    <span v-if="changed" class="a-warn-dirty">
                        {{ t('safety.warn.dirty') }}
                    </span>
                    <AButton
                        sm
                        kind="p"
                        icon="save"
                        :disabled="!changed"
                        @click="save"
                    >
                        {{ t('actions.save') }}
                    </AButton>
                </template>

                <div class="a-warn-tags">
                    <AButton
                        v-for="tag in store.warningTags"
                        :key="tag.he"
                        sm
                        :kind="isOn(tag) ? 'p' : ''"
                        :icon="isOn(tag) ? 'check' : ''"
                        @click="toggle(tag)"
                    >
                        {{ loc(tag) }}
                    </AButton>
                </div>
            </ACard>

            <ACard :title="t('safety.warn.impactCard')" icon="chart">
                <AKeyValue
                    :rows="[
                        [t('safety.warn.impact.orders'), ''],
                        [t('safety.warn.impact.rows'), ''],
                        [t('safety.warn.impact.tags'), ''],
                    ]"
                >
                    <template #value-0>
                        <ANum>{{ store.impact(selectedId) }}</ANum>
                        {{ t('safety.list.orders') }}
                    </template>
                    <template #value-1>
                        <ANum>{{ store.rowsForHerb(selectedId).length }}</ANum>
                    </template>
                    <template #value-2>
                        <ANum>{{ draft.length }}</ANum>
                    </template>
                </AKeyValue>

                <div class="a-note a-note--info a-warn-note">
                    {{ t('safety.warn.note') }}
                </div>
            </ACard>
        </div>
    </div>
</template>

<style scoped>
.a-warn {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 18px;
    margin-top: 20px;
    align-items: start;
}

@media (max-width: 1100px) {
    .a-warn {
        grid-template-columns: 1fr;
    }
}

.a-warn-f {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-bottom: 1px solid var(--a-line);
}

.a-warn-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-warn-list {
    max-height: 520px;
}

.a-warn-none {
    padding: 16px;
    color: var(--a-ink-4);
}

.a-warn-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.a-warn-dirty {
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-warn-note {
    margin-top: 14px;
}
</style>
