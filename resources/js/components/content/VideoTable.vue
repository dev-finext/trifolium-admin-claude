<script setup>
// The tutorial video slots, keyed by the id the site defines.
//
// Owns `vq`, `len` and `pts` in the query string. A row opens the editor; the
// YouTube link opens the video itself and deliberately does not open the editor.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import {
    inBand,
    VIDEO_LENGTH_BANDS,
    VIDEO_POINT_BANDS,
    videoMinutes,
} from '@/stores/content';

const props = defineProps({
    videos: { type: Array, default: () => [] },
    /** The id of the video whose editor is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['edit']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

const filters = useUrlState({ vq: '', len: '', pts: '' });

const dirty = computed(() => Boolean(filters.vq || filters.len || filters.pts));

function clear() {
    filters.vq = '';
    filters.len = '';
    filters.pts = '';
}

const pointCount = (video) => (video.points || []).length;

const lengthOptions = computed(() =>
    VIDEO_LENGTH_BANDS.map((band) => ({
        value: band.id,
        label: t(`videos.band.length.${band.id}`),
    })),
);

const pointOptions = computed(() =>
    VIDEO_POINT_BANDS.map((band) => ({
        value: band.id,
        label: t(`videos.band.points.${band.id}`),
    })),
);

const rows = computed(() =>
    props.videos.filter((video) => {
        if (!inBand(VIDEO_LENGTH_BANDS, filters.len, videoMinutes(video))) {
            return false;
        }

        if (!inBand(VIDEO_POINT_BANDS, filters.pts, pointCount(video))) {
            return false;
        }

        const q = filters.vq.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            video.slug,
            video.title,
            video.youtube,
            video.points,
        ).includes(q);
    }),
);

const cols = computed(() => [
    { k: 'slug', label: t('videos.col.slug'), nowrap: true, sortable: true },
    { k: 'title', label: t('videos.col.title'), w: '340px', sortable: true },
    { k: 'youtube', label: t('videos.col.youtube'), nowrap: true },
    {
        k: 'duration',
        label: t('videos.col.duration'),
        nowrap: true,
        sortable: true,
    },
    { k: 'act', label: t('videos.col.actions') },
]);

/** The link as it reads on screen — the scheme adds nothing for a reader. */
function linkText(url) {
    return String(url || '').replace(/^https?:\/\//, '');
}
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('videos.count', { n: videos.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.vq"
                width="340px"
                :placeholder="t('videos.search')"
            />
            <ASelect
                v-model="filters.len"
                :aria-label="t('videos.filter.length')"
            >
                <option value="">{{ t('videos.filter.lengthAll') }}</option>
                <option
                    v-for="option in lengthOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.pts"
                :aria-label="t('videos.filter.points')"
            >
                <option value="">{{ t('videos.filter.pointsAll') }}</option>
                <option
                    v-for="option in pointOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="selected || null"
            @row="emit('edit', $event)"
        >
            <template #empty>
                <AEmpty
                    icon="play"
                    :title="
                        videos.length
                            ? t('videos.empty.filtered.title')
                            : t('videos.empty.none.title')
                    "
                    :sub="
                        videos.length
                            ? t('videos.empty.filtered.sub')
                            : t('videos.empty.none.sub')
                    "
                />
            </template>

            <template #cell-slug="{ row }">
                <span class="ltr num vt-slug">{{ row.slug }}</span>
            </template>

            <template #cell-title="{ row }">
                <div class="t-strong">{{ loc(row.title) }}</div>
                <div class="t-sub">
                    <I18nT
                        v-if="pointCount(row)"
                        keypath="videos.pointSummary"
                        tag="span"
                        scope="global"
                    >
                        <template #n>
                            <ANum>{{ pointCount(row) }}</ANum>
                        </template>
                        <template #first>{{ loc(row.points[0]) }}</template>
                    </I18nT>
                    <I18nT
                        v-else
                        keypath="videos.pointCount"
                        tag="span"
                        scope="global"
                    >
                        <template #n>
                            <ANum>{{ pointCount(row) }}</ANum>
                        </template>
                    </I18nT>
                </div>
            </template>

            <template #cell-youtube="{ row }">
                <a
                    class="ltr vt-link"
                    :href="row.youtube"
                    target="_blank"
                    rel="noreferrer"
                    @click.stop
                >
                    {{ linkText(row.youtube) }}
                    <AIcon name="external" :size="13" />
                </a>
            </template>

            <template #cell-duration="{ row }">
                <ANum>{{ row.duration || t('videos.noDuration') }}</ANum>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton sm icon="edit" @click="emit('edit', row)">
                        {{ t('actions.edit') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
/* The slot id is a literal the site owns — shown as a code token, not as prose. */
.vt-slug {
    background: var(--a-bg);
    border: 1px solid var(--a-line);
    border-radius: 6px;
    padding: 3px 9px;
    font-size: 13px;
}

.vt-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13.5px;
}
</style>
