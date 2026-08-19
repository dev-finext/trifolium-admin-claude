<script setup>
// The article library: everything the practitioner app and the site show as
// reading material, with the six filters an editor actually works by.
//
// Owns `aq`, `cat`, `state`, `tradition`, `author` and `read` in the query
// string. A row opens the editor.
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/content/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { inBand, READ_TIME_BANDS } from '@/stores/content';

const props = defineProps({
    articles: { type: Array, default: () => [] },
    /** Categories the library files articles under. */
    categories: { type: Array, default: () => [] },
    /** `[{ key, name }]` — everyone who has written for the library. */
    authors: { type: Array, default: () => [] },
    /** The id of the article whose editor is open. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['edit', 'preview']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();

/** The two traditions an article can be written within. */
const TRADITIONS = ['west', 'chinese'];

/** An article with no tradition recorded is western — that is the house default. */
const traditionOf = (article) => article.system || TRADITIONS[0];

/** Authors are keyed by their Hebrew name so the choice fits in a query string. */
function authorKey(article) {
    const author = article.author;

    if (!author) {
        return '';
    }

    return typeof author === 'object' ? author.he : String(author);
}

const filters = useUrlState({
    aq: '',
    cat: '',
    state: '',
    tradition: '',
    author: '',
    read: '',
});

const dirty = computed(() =>
    Boolean(
        filters.aq ||
        filters.cat ||
        filters.state ||
        filters.tradition ||
        filters.author ||
        filters.read,
    ),
);

function clear() {
    filters.aq = '';
    filters.cat = '';
    filters.state = '';
    filters.tradition = '';
    filters.author = '';
    filters.read = '';
}

function optionLabel(label, n) {
    return t('content.filter.optionCount', { label, n });
}

/** Only categories the library has articles in — an empty one filters to nothing. */
const catOptions = computed(() =>
    props.categories
        .filter((id) => props.articles.some((article) => article.cat === id))
        .map((id) => ({
            value: id,
            label: optionLabel(
                t(`content.cat.${id}`),
                props.articles.filter((article) => article.cat === id).length,
            ),
        })),
);

const stateOptions = computed(() => [
    {
        value: 'published',
        label: optionLabel(
            t('content.state.published'),
            props.articles.filter((article) => article.published).length,
        ),
    },
    {
        value: 'draft',
        label: optionLabel(
            t('content.state.draft'),
            props.articles.filter((article) => !article.published).length,
        ),
    },
]);

const readOptions = computed(() =>
    READ_TIME_BANDS.map((band) => ({
        value: band.id,
        label: optionLabel(
            t(`content.band.read.${band.id}`),
            props.articles.filter((article) =>
                band.matches(Number(article.readMin) || 0),
            ).length,
        ),
    })),
);

const rows = computed(() =>
    props.articles.filter((article) => {
        if (filters.cat && article.cat !== filters.cat) {
            return false;
        }

        if (filters.tradition && traditionOf(article) !== filters.tradition) {
            return false;
        }

        if (filters.state === 'published' && !article.published) {
            return false;
        }

        if (filters.state === 'draft' && article.published) {
            return false;
        }

        if (filters.author && authorKey(article) !== filters.author) {
            return false;
        }

        if (
            !inBand(READ_TIME_BANDS, filters.read, Number(article.readMin) || 0)
        ) {
            return false;
        }

        const q = filters.aq.trim().toLowerCase();

        if (!q) {
            return true;
        }

        return searchHaystack(
            article.title,
            article.excerpt,
            article.author,
            t(`content.cat.${article.cat}`),
        ).includes(q);
    }),
);

const cols = computed(() => [
    {
        k: 'title',
        label: t('content.col.title'),
        w: '360px',
        sortable: true,
    },
    { k: 'cat', label: t('content.col.category'), nowrap: true },
    {
        k: 'author',
        label: t('content.col.author'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'readMin',
        label: t('content.col.readTime'),
        nowrap: true,
        sortable: true,
    },
    { k: 'system', label: t('content.col.system'), nowrap: true },
    { k: 'state', label: t('content.col.state'), nowrap: true },
    { k: 'act', label: t('content.col.actions') },
]);
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('content.count.articles', { n: articles.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="filters.aq"
                :placeholder="t('content.search.articles')"
            />
            <ASelect
                v-model="filters.cat"
                :aria-label="t('content.filter.category')"
            >
                <option value="">{{ t('content.filter.categoryAll') }}</option>
                <option
                    v-for="option in catOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.state"
                :aria-label="t('content.filter.state')"
            >
                <option value="">{{ t('content.filter.stateAll') }}</option>
                <option
                    v-for="option in stateOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.tradition"
                :aria-label="t('content.filter.system')"
            >
                <option value="">{{ t('content.filter.systemAll') }}</option>
                <option v-for="id in TRADITIONS" :key="id" :value="id">
                    {{ t(`content.system.${id}`) }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.author"
                :aria-label="t('content.filter.author')"
            >
                <option value="">{{ t('content.filter.authorAll') }}</option>
                <option
                    v-for="author in authors"
                    :key="author.key"
                    :value="author.key"
                >
                    {{ loc(author.name) }}
                </option>
            </ASelect>
            <ASelect
                v-model="filters.read"
                :aria-label="t('content.filter.readTime')"
            >
                <option value="">{{ t('content.filter.readTimeAll') }}</option>
                <option
                    v-for="option in readOptions"
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
                    icon="file_text"
                    :title="t('content.empty.articles.title')"
                    :sub="t('content.empty.articles.sub')"
                />
            </template>

            <template #cell-title="{ row }">
                <div class="t-strong">{{ loc(row.title) }}</div>
                <div class="t-sub">{{ loc(row.excerpt) }}</div>
            </template>

            <template #cell-cat="{ row }">
                <AChip tone="gray" size="sm" :dot="false">
                    {{ t(`content.cat.${row.cat}`) }}
                </AChip>
            </template>

            <template #cell-author="{ row }">
                {{ loc(row.author) || t('labels.none') }}
            </template>

            <template #cell-readMin="{ row }">
                <I18nT keypath="content.readMinutes" tag="span" scope="global">
                    <template #n>
                        <ANum>{{ row.readMin }}</ANum>
                    </template>
                </I18nT>
            </template>

            <template #cell-system="{ row }">
                <AChip
                    :tone="traditionOf(row) === 'chinese' ? 'purple' : 'teal'"
                    size="sm"
                    :dot="false"
                >
                    {{ t(`content.system.${traditionOf(row)}`) }}
                </AChip>
            </template>

            <template #cell-state="{ row }">
                <AChip :tone="row.published ? 'green' : 'amber'" size="sm">
                    {{
                        row.published
                            ? t('content.state.published')
                            : t('content.state.draft')
                    }}
                </AChip>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton sm icon="edit" @click="emit('edit', row)">
                        {{ t('actions.edit') }}
                    </AButton>
                    <AButton sm icon="eye" @click="emit('preview', row)">
                        {{ t('content.preview.open') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>
    </div>
</template>
