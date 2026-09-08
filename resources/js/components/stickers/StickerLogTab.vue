<script setup>
// The print log: every run, what it was for, how many labels, who and when.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchBox from '@/components/inventory/SearchBox.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { PAGE_DEFAULTS, usePaged } from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { STICKER_TEMPLATE_IDS } from '@/config';
import { useStickersStore } from '@/stores/stickers';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const stickers = useStickersStore();

// A print log is read by "what was printed for order 2640634", so it needs a
// search and a pager — nothing more. There is no SAP counterpart to filter by.
const view = useUrlState({ lq: '', ltpl: '', ...PAGE_DEFAULTS });

const rows = computed(() => {
    const query = view.lq.trim().toLowerCase();

    return stickers.prints.filter((row) => {
        if (view.ltpl && row.template !== view.ltpl) {
            return false;
        }

        return (
            !query ||
            searchHaystack(row.ref, row.detail, row.by).includes(query)
        );
    });
});

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => Boolean(view.lq) || Boolean(view.ltpl));

function clear() {
    view.lq = '';
    view.ltpl = '';
}

const tally = (id) =>
    stickers.prints.filter((row) => row.template === id).length;

const cols = computed(() => [
    { k: 'when', label: t('stickers.log.col.when') },
    { k: 'template', label: t('stickers.log.col.template') },
    { k: 'ref', label: t('stickers.log.col.ref') },
    { k: 'count', label: t('stickers.log.col.count') },
    { k: 'by', label: t('stickers.log.col.by') },
]);
</script>

<template>
    <div class="lg">
        <div class="a-kpis">
            <FilterKpi
                :label="t('stickers.log.all')"
                :value="stickers.prints.length"
                :active="!view.ltpl"
                @click="view.ltpl = ''"
            />
            <FilterKpi
                v-for="id in STICKER_TEMPLATE_IDS"
                :key="id"
                :label="t(`stickers.template.${id}`)"
                :value="tally(id)"
                :active="view.ltpl === id"
                @click="view.ltpl = view.ltpl === id ? '' : id"
            />
        </div>

        <ACard :title="t('stickers.log.title')" icon="list" :pad="false">
            <template #right>
                <V2Badge id="labels" size="sm" />
            </template>
            <p class="a-hint lg-intro">{{ t('stickers.log.note') }}</p>

            <FilterBar
                :count="rows.length"
                :total="stickers.prints.length"
                :label="t('stickers.log.noun')"
                :dirty="dirty"
                @clear="clear"
            >
                <SearchBox
                    v-model="view.lq"
                    :placeholder="t('stickers.log.search')"
                    :width="320"
                />
            </FilterBar>

            <ADataTable
                v-if="rows.length"
                :cols="cols"
                :rows="paged"
                row-key="id"
            >
                <template #cell-when="{ row }"
                    ><ANum>{{ row.when.stamp }}</ANum></template
                >
                <template #cell-template="{ row }">{{
                    t(`stickers.template.${row.template}`)
                }}</template>
                <template #cell-ref="{ row }">
                    <RouterLink
                        v-if="row.template !== 'item'"
                        class="a-linkbtn"
                        :to="{ name: 'order', params: { id: row.ref } }"
                    >
                        <ANum>{{ row.ref }}</ANum>
                    </RouterLink>
                    <RouterLink
                        v-else
                        class="a-linkbtn"
                        :to="{
                            name: 'inventory',
                            query: { tab: 'receipts', receipt: row.ref },
                        }"
                    >
                        <ANum>{{ row.ref }}</ANum>
                    </RouterLink>
                </template>
                <template #cell-count="{ row }"
                    ><ANum>{{ row.count }}</ANum></template
                >
                <template #cell-by="{ row }">{{ loc(row.by) || '—' }}</template>
            </ADataTable>
            <AEmpty v-else icon="printer" :title="t('stickers.log.empty')" />

            <APagination
                v-model:page="view.pg"
                v-model:size="view.ps"
                :total="total"
            />
        </ACard>
    </div>
</template>

<style scoped>
.lg {
    display: grid;
    gap: 16px;
}

.lg-intro {
    margin: 0;
    padding: 12px 18px 4px;
}
</style>
