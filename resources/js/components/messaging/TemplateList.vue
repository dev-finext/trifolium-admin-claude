<script setup>
// The template library: one card per template, filtered by channel, category,
// how heavily it is used, and free text over the body itself.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ChannelFilter from '@/components/messaging/ChannelFilter.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { TEMPLATE_USE_BANDS, useMessagingStore } from '@/stores/messaging';

const emit = defineEmits(['edit', 'test']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const messaging = useMessagingStore();

const view = useUrlState({ tq: '', tch: '', tcat: '', tuse: '' });

const templates = computed(() => messaging.templates);

/** Categories that actually have a template, each with its count. */
const categories = computed(() => {
    const counts = {};

    for (const template of templates.value) {
        counts[template.cat] = (counts[template.cat] || 0) + 1;
    }

    return counts;
});

const channelCounts = computed(() => {
    const counts = {};

    for (const template of templates.value) {
        counts[template.ch] = (counts[template.ch] || 0) + 1;
    }

    return counts;
});

function inBand(template, id) {
    const band = TEMPLATE_USE_BANDS.find((row) => row.id === id);

    if (!band) {
        return true;
    }

    return template.uses >= band.min && template.uses <= band.max;
}

const rows = computed(() => {
    const query = view.tq.trim().toLowerCase();

    return templates.value.filter((template) => {
        if (view.tch && template.ch !== view.tch) {
            return false;
        }

        if (view.tcat && template.cat !== view.tcat) {
            return false;
        }

        if (view.tuse && !inBand(template, view.tuse)) {
            return false;
        }

        if (
            query &&
            !searchHaystack(
                template.name,
                template.body,
                t(`templateCategory.${template.cat}`),
            ).includes(query)
        ) {
            return false;
        }

        return true;
    });
});

const dirty = computed(() =>
    Boolean(view.tq || view.tch || view.tcat || view.tuse),
);

function clear() {
    view.tq = '';
    view.tch = '';
    view.tcat = '';
    view.tuse = '';
}

/** The band label states its own boundary, so no threshold is written in copy. */
function bandLabel(band) {
    if (band.id === 'none') {
        return t('messaging.use.none');
    }

    return band.id === 'low'
        ? t('messaging.use.low', { n: num(band.max) })
        : t('messaging.use.high', { n: num(band.min - 1) });
}
</script>

<template>
    <div class="a-grid">
        <FilterBar
            :count="rows.length"
            :label="t('messaging.of.templates', { total: templates.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="view.tq"
                class="m-search"
                type="search"
                :placeholder="t('messaging.filter.searchTemplates')"
                :aria-label="t('messaging.filter.searchTemplates')"
            />
            <ChannelFilter v-model="view.tch" :counts="channelCounts" />
            <ASelect
                v-model="view.tcat"
                :aria-label="t('messaging.filter.category')"
            >
                <option value="">
                    {{ t('messaging.filter.categoryAll') }}
                </option>
                <option v-for="(n, cat) in categories" :key="cat" :value="cat">
                    {{
                        t('messaging.filter.withCount', {
                            label: t(`templateCategory.${cat}`),
                            n,
                        })
                    }}
                </option>
            </ASelect>
            <ASelect
                v-model="view.tuse"
                :aria-label="t('messaging.filter.use')"
            >
                <option value="">{{ t('messaging.filter.useAll') }}</option>
                <option
                    v-for="band in TEMPLATE_USE_BANDS"
                    :key="band.id"
                    :value="band.id"
                >
                    {{ bandLabel(band) }}
                </option>
            </ASelect>
        </FilterBar>

        <ACard v-if="!rows.length">
            <AEmpty
                icon="file_text"
                :title="t('messaging.templates.empty.title')"
                :sub="t('messaging.templates.empty.sub')"
            />
        </ACard>

        <div v-else class="a-cards">
            <article v-for="template in rows" :key="template.id" class="a-card">
                <div class="m-head">
                    <strong class="m-name">{{ loc(template.name) }}</strong>
                    <AChip tone="gray" size="sm" :dot="false">
                        {{ t(`channel.${template.ch}`) }}
                    </AChip>
                </div>

                <div class="m-meta">
                    {{
                        t('messaging.templates.category', {
                            name: t(`templateCategory.${template.cat}`),
                        })
                    }}
                    ·
                    <ANum>{{
                        t('messaging.templates.uses', {
                            n: num(template.uses),
                        })
                    }}</ANum>
                </div>

                <p class="m-body">{{ loc(template.body) }}</p>

                <div class="m-acts">
                    <AButton
                        sm
                        icon="edit"
                        @click="emit('edit', template.id)"
                        >{{ t('actions.edit') }}</AButton
                    >
                    <AButton
                        sm
                        icon="send"
                        :disabled="!messaging.actor"
                        @click="emit('test', template.id)"
                        >{{ t('messaging.templates.test') }}</AButton
                    >
                </div>
            </article>
        </div>
    </div>
</template>

<style scoped>
.a-card {
    padding: 20px;
}

.m-search {
    width: 340px;
    max-width: 100%;
}

.m-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.m-name {
    font-size: 17px;
}

.m-meta {
    margin-top: 4px;
    font-size: 13.5px;
    color: var(--a-ink-4);
}

/* The body is the record's own text: it keeps its line breaks and is clipped
   rather than reflowed, so every card in the grid stays the same height. */
.m-body {
    margin: 14px 0 0;
    background: var(--a-sunk);
    border-radius: 9px;
    padding: 13px 15px;
    white-space: pre-wrap;
    font-size: 14.5px;
    line-height: 1.65;
    max-height: 130px;
    overflow: hidden;
}

.m-acts {
    display: flex;
    gap: 8px;
    margin-top: 14px;
}
</style>
