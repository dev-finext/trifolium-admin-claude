<script setup>
// The what's-new feed: the conferences, webinars, system updates and article
// announcements that sit alongside the article library on the practitioner site.
//
// Read-only here — the feed is compiled from the records the console already
// holds, so there is nothing on this tab to edit. Owns `eq` and `kind` in the
// query string.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { fmtISO } from '@/lib/dates';

const props = defineProps({
    events: { type: Array, default: () => [] },
    /** The kinds of entry the feed can carry. */
    kinds: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

const filters = useUrlState({ eq: '', kind: '' });

const dirty = computed(() => Boolean(filters.eq || filters.kind));

function clear() {
    filters.eq = '';
    filters.kind = '';
}

const kindOptions = computed(() =>
    props.kinds
        .filter((id) => props.events.some((event) => event.kind === id))
        .map((id) => ({
            value: id,
            label: t('content.filter.optionCount', {
                label: t(`content.eventKind.${id}`),
                n: props.events.filter((event) => event.kind === id).length,
            }),
        })),
);

const rows = computed(() =>
    props.events.filter((event) => {
        if (filters.kind && event.kind !== filters.kind) {
            return false;
        }

        const q = filters.eq.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            event.title,
            event.desc,
            event.date,
            fmtISO(event.date),
            t(`content.eventKind.${event.kind}`),
        ).includes(q);
    }),
);
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('content.count.events', { n: events.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.eq"
                :placeholder="t('content.search.events')"
            />
            <ASelect
                v-model="filters.kind"
                :aria-label="t('content.filter.kind')"
            >
                <option value="">{{ t('content.filter.kindAll') }}</option>
                <option
                    v-for="option in kindOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
        </FilterBar>

        <ACard v-if="!rows.length" :pad="false">
            <AEmpty
                icon="calendar"
                :title="t('content.empty.events.title')"
                :sub="t('content.empty.events.sub')"
            />
        </ACard>

        <div v-else class="a-cards ef-grid">
            <article v-for="event in rows" :key="event.id" class="a-card ef">
                <div class="ef-meta">
                    <AChip tone="gray" size="sm" :dot="false">
                        {{ t(`content.eventKind.${event.kind}`) }}
                    </AChip>
                    <span class="num ef-date">{{ fmtISO(event.date) }}</span>
                </div>
                <h3 class="ef-title">{{ loc(event.title) }}</h3>
                <p class="ef-desc">{{ loc(event.desc) }}</p>
            </article>
        </div>
    </div>
</template>

<style scoped>
.ef-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

.ef {
    padding: 20px;
}

.ef-meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ef-date {
    font-size: 13px;
    color: var(--a-ink-4);
}

.ef-title {
    font-size: 17.5px;
    font-weight: 700;
    margin: 10px 0 0;
}

.ef-desc {
    color: var(--a-ink-3);
    margin: 6px 0 0;
    line-height: 1.6;
    font-size: 14.5px;
}
</style>
