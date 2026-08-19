<script setup>
// The system log: every state-changing action, by an agent, by the system
// itself or by an external interface, in one immutable stream. Read-only by
// design — there is no edit and no delete control on this screen, and there is
// nothing in the store that would let one exist.
//
// The date range, the free text and the three list filters all live in the query
// string, so a filtered slice of the log can be pasted to a colleague and opens
// the same way. "Load more" reveals the log a page at a time and is view state,
// not a filter, so it stays local.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import LogFilters from '@/components/system/LogFilters.vue';
import LogTable from '@/components/system/LogTable.vue';
import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { LOG_ACTION_IDS, LOG_SOURCE_IDS } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { inRange as insideRange } from '@/lib/dateRange';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useSystemStore } from '@/stores/system';

/** How many rows one page reveals. */
const PAGE = 80;

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const system = useSystemStore();
const { push } = useToast();

const state = useUrlState({
    preset: 'all',
    from: '',
    to: '',
    q: '',
    actor: '',
    action: '',
    source: '',
});

const limit = ref(PAGE);

const range = computed({
    get: () => ({ preset: state.preset, from: state.from, to: state.to }),
    set: (next) => {
        state.preset = next.preset;
        state.from = next.from;
        state.to = next.to;
    },
});

const term = computed(() => state.q.trim().toLowerCase());

// The date range comes first: the option counts below it are scoped to it.
const ranged = computed(() =>
    system.log.filter((row) => insideRange(row.when.iso, range.value)),
);

const rows = computed(() =>
    ranged.value.filter((row) => {
        const actorId = row.actor?.he ?? String(row.actor);

        if (state.actor && actorId !== state.actor) {
            return false;
        }

        if (state.action && row.act !== state.action) {
            return false;
        }

        if (state.source && row.src !== state.source) {
            return false;
        }

        if (
            term.value &&
            !searchHaystack(
                row.actor,
                row.from,
                row.to,
                row.ent,
                row.ip,
            ).includes(term.value)
        ) {
            return false;
        }

        return true;
    }),
);

const shown = computed(() => rows.value.slice(0, limit.value));

const counts = computed(() => {
    const tally = (ids, pick) =>
        Object.fromEntries(
            ids.map((id) => [
                id,
                ranged.value.filter((row) => pick(row) === id).length,
            ]),
        );

    return {
        action: tally(LOG_ACTION_IDS, (row) => row.act),
        source: tally(LOG_SOURCE_IDS, (row) => row.src),
    };
});

const dirty = computed(() =>
    Boolean(state.q || state.actor || state.action || state.source),
);

const rangeNote = computed(() =>
    t('log.inRange', { n: num(ranged.value.length) }, ranged.value.length),
);

const sub = computed(() => t('log.sub', { n: num(system.log.length) }));

const remaining = computed(() =>
    Math.min(PAGE, rows.value.length - shown.value.length),
);

// A narrower filter should show its first page, not leave the reader deep in a
// list that no longer has that many rows.
watch(
    () => [state.q, state.actor, state.action, state.source, range.value],
    () => {
        limit.value = PAGE;
    },
    { deep: true },
);

// The rows the reader is looking at, in the language they are reading. A status
// or message-state value is an id in the record and a word on screen, so it is
// translated on the way out rather than exported raw.
function exportLog() {
    if (!rows.value.length) {
        push({
            title: t('log.export.empty'),
            body: t('log.export.emptyBody'),
        });

        return;
    }

    const file = `system-log-${isoDaysAgo(0)}.csv`;
    const header = [
        t('log.table.when'),
        t('log.table.actor'),
        t('log.table.action'),
        t('log.table.entity'),
        t('log.table.change'),
        t('log.table.source'),
        t('log.table.ip'),
    ];
    const value = (row, side) => {
        if (!row[side]) {
            return '';
        }

        if (row.valueType === 'status') {
            return t(`status.${row[side]}`);
        }

        if (row.valueType === 'message_state') {
            return t(`msgState.${row[side]}`);
        }

        return loc(row[side]);
    };
    const n = downloadCsv(
        file,
        header,
        rows.value.map((row) => [
            `${fmtISO(row.when.iso)} ${row.when.time}`,
            loc(row.actor),
            t(`logAction.${row.act}`),
            row.ent,
            [value(row, 'from'), value(row, 'to')].filter(Boolean).join(' → '),
            t(`logSource.${row.src}`),
            row.ip || '',
        ]),
    );

    push({
        title: t('log.export.done'),
        body: t('log.export.doneBody', { n: num(n), file }, n),
    });
}

function applyFilters(patch) {
    Object.assign(state, patch);
}

function clear() {
    state.q = '';
    state.actor = '';
    state.action = '';
    state.source = '';
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.system'), t('nav.item.log')]"
            :title="t('log.title')"
            :sub="sub"
        >
            <template #actions>
                <AButton icon="download" @click="exportLog">
                    {{ t('log.export.action') }}
                </AButton>
            </template>
        </PageHead>

        <div class="a-note a-note--info lv-readonly">
            <AIcon name="lock" :size="18" />
            <span>
                <strong>{{ t('log.readOnly.title') }}</strong>
                {{ t('log.readOnly.body') }}
            </span>
        </div>

        <DateRangeBar v-model="range" :note="rangeNote" />

        <LogFilters
            :filters="state"
            :actors="system.logActors"
            :counts="counts"
            :shown="rows.length"
            :dirty="dirty"
            @update:filters="applyFilters"
            @clear="clear"
        />

        <LogTable :rows="shown" />

        <div v-if="rows.length > shown.length" class="lv-more">
            <AButton icon="chevron_down" @click="limit += PAGE">
                {{ t('log.loadMore', { n: num(remaining) }) }}
            </AButton>
            <span class="lv-shown">
                {{
                    t('log.shownOf', {
                        shown: num(shown.length),
                        total: num(rows.length),
                    })
                }}
            </span>
        </div>
    </div>
</template>

<style scoped>
.lv-readonly {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
}

.lv-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 18px 0;
}

.lv-shown {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
