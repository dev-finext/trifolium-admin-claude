<script setup>
// The print log: every run, what it was for, how many labels, who and when.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { STICKER_TEMPLATE_IDS } from '@/config';
import { useStickersStore } from '@/stores/stickers';

const { t } = useI18n();
const { loc } = useLocalized();
const stickers = useStickersStore();

const view = useUrlState({ ltpl: '' });

const rows = computed(() =>
    stickers.prints.filter((row) => !view.ltpl || row.template === view.ltpl),
);

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
            <ADataTable
                v-if="rows.length"
                :cols="cols"
                :rows="rows"
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
