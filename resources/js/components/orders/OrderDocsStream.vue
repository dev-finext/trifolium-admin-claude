<script setup>
// The documentation tab: the automatic action log and the agents' manual
// entries in one stream, newest first.
//
// Entries are never edited and never deleted — a correction is a new manual
// entry that points back at the one it fixes, which is why "add correction"
// pre-loads the composer rather than opening the original for editing. The
// segmented control, the free-text search and the actor filter narrow the
// stream without touching it. The store owns the stream and every write to it.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const toast = useToast();
const orders = useOrdersStore();

/** The segmented filter, by entry kind. */
const KINDS = ['all', 'system', 'agent', 'manual'];
const FILTER_LABEL = {
    all: 'filterAll',
    system: 'filterSystem',
    agent: 'filterAgent',
    manual: 'filterManual',
};
const KIND_LABEL = {
    system: 'kindSystem',
    agent: 'kindAgent',
    manual: 'kindManual',
};
const KIND_TONE = { system: 'gray', agent: 'teal', manual: 'purple' };

const kind = ref('all');
const query = ref('');
const who = ref('');
const text = ref('');
const fixOf = ref('');

const actorName = computed(() => loc(orders.actor));

/** A status id renders through the status catalog; any other value is literal. */
function formatValue(value, valueType) {
    if (!value) {
        return t('orders.value.none');
    }

    return valueType === 'status' ? t(`status.${value}`) : value;
}

/**
 * Flatten every entry to what the row needs, resolving the two shapes the stream
 * carries: seed entries author their text with `act`/`det` pairs, entries this
 * console writes carry an `actionId` and a locale key with its parameters.
 */
const rows = computed(() =>
    orders.documentationFor(props.order).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        stamp: entry.when?.stamp || '',
        actor: loc(entry.actor),
        isManual: entry.kind === 'manual',
        text: entry.text ? loc(entry.text) : '',
        title: entry.act
            ? loc(entry.act)
            : entry.actionId
              ? t(`logAction.${entry.actionId}`)
              : '',
        detail: entry.det
            ? loc(entry.det)
            : entry.detail
              ? t(entry.detail.key, entry.detail.params || {})
              : '',
        bad: Boolean(entry.bad),
        fixOf: entry.fixOf || '',
        hasChange: Boolean(entry.from || entry.to),
        from: formatValue(entry.from, entry.valueType),
        to: formatValue(entry.to, entry.valueType),
    })),
);

const byId = computed(() =>
    Object.fromEntries(rows.value.map((row) => [row.id, row])),
);

const counts = computed(() => ({
    all: rows.value.length,
    system: rows.value.filter((row) => row.kind === 'system').length,
    agent: rows.value.filter((row) => row.kind === 'agent').length,
    manual: rows.value.filter((row) => row.kind === 'manual').length,
}));

const actors = computed(() => [
    ...new Set(rows.value.map((row) => row.actor).filter(Boolean)),
]);

const filtered = computed(() => {
    const q = query.value.trim().toLowerCase();

    return rows.value.filter((row) => {
        if (kind.value !== 'all' && row.kind !== kind.value) {
            return false;
        }

        if (who.value && row.actor !== who.value) {
            return false;
        }

        if (!q) {
            return true;
        }

        const hay = [
            row.title,
            row.detail,
            row.text,
            row.actor,
            row.from,
            row.to,
        ]
            .join(' ')
            .toLowerCase();

        return hay.includes(q);
    });
});

const dirty = computed(
    () => Boolean(query.value) || Boolean(who.value) || kind.value !== 'all',
);

function startFix(id) {
    fixOf.value = id;
}

function clearFilters() {
    query.value = '';
    who.value = '';
    kind.value = 'all';
}

async function submit() {
    const body = text.value.trim();

    if (!body) {
        return;
    }

    const fixing = Boolean(fixOf.value);

    await orders.addDocumentation(props.order.id, body, fixOf.value);

    toast.push({
        title: fixing ? t('orders.docs.fixAdded') : t('orders.docs.added'),
        body: t('orders.docs.addedBody', { actor: actorName }),
    });

    text.value = '';
    fixOf.value = '';
}
</script>

<template>
    <div class="a-grid">
        <ACard :title="t('orders.docs.manualCard')" icon="edit">
            <template #right>
                <span class="od-docnote">
                    {{ t('orders.docs.manualNote', { actor: actorName }) }}
                </span>
            </template>

            <div
                v-if="fixOf && byId[fixOf]"
                class="a-note a-note--warn od-fixbanner"
            >
                <span>
                    {{
                        t('orders.docs.fixingOf', {
                            stamp: byId[fixOf].stamp,
                            actor: byId[fixOf].actor,
                        })
                    }}
                </span>
                <AButton sm class="a-push" icon="x" @click="fixOf = ''">
                    {{ t('orders.docs.cancelFix') }}
                </AButton>
            </div>

            <ATextarea
                v-model="text"
                :rows="3"
                :placeholder="
                    fixOf
                        ? t('orders.docs.fixPlaceholder')
                        : t('orders.docs.placeholder')
                "
                :aria-label="t('orders.docs.newLabel')"
            />

            <div class="od-docsubmit">
                <AButton
                    kind="p"
                    icon="save"
                    :disabled="!text.trim()"
                    @click="submit"
                >
                    {{ fixOf ? t('orders.docs.addFix') : t('orders.docs.add') }}
                </AButton>
                <span class="od-hint">{{ t('orders.docs.hint') }}</span>
            </div>
        </ACard>

        <ACard :title="t('orders.docs.streamCard')" icon="list" :pad="false">
            <div class="a-docbar">
                <div class="a-docseg">
                    <button
                        v-for="option in KINDS"
                        :key="option"
                        type="button"
                        :class="{ 'is-on': kind === option }"
                        @click="kind = option"
                    >
                        {{ t(`orders.docs.${FILTER_LABEL[option]}`) }}
                        <span class="num">{{ counts[option] }}</span>
                    </button>
                </div>

                <div class="a-search od-search">
                    <span class="lead"><AIcon name="search" :size="17" /></span>
                    <input
                        v-model="query"
                        :placeholder="t('orders.docs.searchPlaceholder')"
                        :aria-label="t('orders.docs.searchLabel')"
                    />
                </div>

                <ASelect v-model="who" class="od-who">
                    <option value="">{{ t('orders.docs.actorAll') }}</option>
                    <option v-for="actor in actors" :key="actor" :value="actor">
                        {{ actor }}
                    </option>
                </ASelect>

                <AButton v-if="dirty" sm icon="x" @click="clearFilters">
                    {{ t('ui.clear') }}
                </AButton>

                <span class="a-push od-showing">
                    {{ t('orders.docs.showing', { n: filtered.length }) }}
                </span>
            </div>

            <div v-if="!filtered.length" class="od-docempty">
                <AEmpty
                    icon="file_text"
                    :title="t('orders.docs.empty')"
                    :sub="t('orders.docs.emptySub')"
                />
            </div>

            <div v-else class="a-doc">
                <div
                    v-for="entry in filtered"
                    :key="entry.id"
                    class="a-doc-r"
                    :class="{ 'is-fix': entry.fixOf }"
                >
                    <div>
                        <div class="a-doc-w">
                            <ANum>{{ entry.stamp }}</ANum>
                        </div>
                        <div class="od-kind">
                            <AChip
                                :tone="KIND_TONE[entry.kind]"
                                size="sm"
                                :dot="false"
                            >
                                {{ t(`orders.docs.${KIND_LABEL[entry.kind]}`) }}
                            </AChip>
                        </div>
                    </div>
                    <div>
                        <div
                            v-if="entry.fixOf && byId[entry.fixOf]"
                            class="a-doc-link"
                        >
                            <AIcon name="refresh" :size="14" />
                            {{
                                t('orders.docs.fixingOf', {
                                    stamp: byId[entry.fixOf].stamp,
                                    actor: byId[entry.fixOf].actor,
                                })
                            }}
                        </div>

                        <template v-if="entry.isManual">
                            <div class="od-doctext">{{ entry.text }}</div>
                            <div class="a-doc-w od-docfoot">
                                {{ entry.actor }}
                                <button
                                    v-if="!entry.fixOf"
                                    type="button"
                                    class="a-linkbtn"
                                    @click="startFix(entry.id)"
                                >
                                    {{ t('orders.docs.fixLink') }}
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <div
                                class="t-strong"
                                :class="{ 'od-bad': entry.bad }"
                            >
                                {{ entry.title }}
                            </div>
                            <div class="od-docdet">{{ entry.detail }}</div>
                            <div class="a-doc-w od-docfoot">
                                {{ entry.actor }}
                                <span v-if="entry.hasChange">
                                    ·
                                    {{
                                        t('orders.docs.beforeAfter', {
                                            from: entry.from,
                                            to: entry.to,
                                        })
                                    }}
                                </span>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.od-docnote {
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.od-docsubmit {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 10px;
}

.od-hint {
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.od-fixbanner {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.od-search {
    width: 260px;
    flex: none;
}

.od-showing {
    font-size: 13.5px;
    color: var(--a-ink-3);
}

.od-docempty {
    padding: 26px 18px;
}

.od-doctext {
    font-size: 15.5px;
    line-height: 1.6;
}

.od-docdet {
    margin-top: 3px;
    color: var(--a-ink-3);
}

.od-docfoot {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
}

.od-bad {
    color: var(--a-red);
}
</style>
