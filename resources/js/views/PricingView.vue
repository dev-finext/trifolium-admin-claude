<script setup>
// ניהול שוטף › מחירונים מדורגים — formula ingredients priced by quantity.
//
// A pricing group owns SKU prefixes, a unit of measure and one price per
// quantity band; a SKU is priced by the group holding the longest matching
// prefix. Typing a full SKU into the search answers "who prices this?" on the
// spot.
//
// Filters and the open editor live in the query string, so a filtered view or
// an open group can be pasted to a colleague and opens identically.
import { computed, ref } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import PriceGroupEditor from '@/components/pricing/PriceGroupEditor.vue';
import PriceGroupList from '@/components/pricing/PriceGroupList.vue';
import AButton from '@/components/ui/AButton.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import {
    bandText,
    PRICE_SKU_QUERY_MIN_DIGITS,
    useCatalogStore,
} from '@/stores/catalog';
import { useDatasetStore } from '@/stores/dataset';

/** How many skeleton rows stand in for the grid while the dataset loads. */
const SKELETON_ROWS = 7;

/** The editor's stable identity for "a group that does not exist yet". */
const NEW = 'new';

/** A free-text query that is all digits from this length on is a SKU lookup. */
const SKU_QUERY_RE = new RegExp(`^\\d{${PRICE_SKU_QUERY_MIN_DIGITS},}$`);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const catalog = useCatalogStore();

const view = useUrlState({
    q: '',
    uom: '',
    scale: '',
    fill: '',
    edit: '',
});

/** The pending delete confirmation. Not a view state, so not in the URL. */
const ask = ref(null);

const term = computed(() => view.q.trim());
const skuQuery = computed(() => SKU_QUERY_RE.test(term.value));
const skuHit = computed(() =>
    skuQuery.value ? catalog.resolveSku(term.value) : null,
);
const skuItem = computed(() =>
    skuQuery.value
        ? catalog.ingredientSkus.find((item) => item.sku === term.value) || null
        : null,
);

const shown = computed(() =>
    catalog.priceGroups.filter((group) => {
        if (view.uom && group.uom !== view.uom) {
            return false;
        }

        if (view.scale === 'custom' && !catalog.isCustomScale(group)) {
            return false;
        }

        if (view.scale === 'default' && catalog.isCustomScale(group)) {
            return false;
        }

        const matched = catalog.skusOfGroup(group.id).length;

        if (view.fill === 'none' && matched) {
            return false;
        }

        if (view.fill === 'has' && !matched) {
            return false;
        }

        if (view.fill === 'noprice' && group.uom && group.prices[0] != null) {
            return false;
        }

        if (!term.value) {
            return true;
        }

        return (
            searchHaystack(group.name).includes(term.value.toLowerCase()) ||
            group.prefixes.some(
                (prefix) =>
                    prefix.startsWith(term.value) ||
                    term.value.startsWith(prefix),
            )
        );
    }),
);

const dirty = computed(() =>
    Boolean(term.value || view.uom || view.scale || view.fill),
);

function clearFilters() {
    view.q = '';
    view.uom = '';
    view.scale = '';
    view.fill = '';
}

// ---- filter options ---------------------------------------------------------

const option = (label, n) => t('pricing.filters.option', { label, n });

const uomOptions = computed(() => {
    const inUse = [
        ...new Set(catalog.priceGroups.map((group) => group.uom)),
    ].filter(Boolean);

    return [
        { value: '', label: t('pricing.filters.uomAll') },
        ...inUse.map((id) => ({
            value: id,
            label: option(
                t(`pricing.uom.${id}`),
                catalog.priceGroups.filter((group) => group.uom === id).length,
            ),
        })),
    ];
});

const scaleOptions = computed(() => [
    { value: '', label: t('pricing.filters.scaleAll') },
    {
        value: 'custom',
        label: option(
            t('pricing.filters.scaleCustom'),
            catalog.priceGroups.filter((group) => catalog.isCustomScale(group))
                .length,
        ),
    },
    {
        value: 'default',
        label: option(
            t('pricing.filters.scaleDefault'),
            catalog.priceGroups.filter((group) => !catalog.isCustomScale(group))
                .length,
        ),
    },
]);

const fillOptions = computed(() => [
    { value: '', label: t('pricing.filters.fillAll') },
    {
        value: 'none',
        label: option(
            t('pricing.filters.fillNone'),
            catalog.priceGroups.filter(
                (group) => !catalog.skusOfGroup(group.id).length,
            ).length,
        ),
    },
    { value: 'has', label: t('pricing.filters.fillHas') },
    { value: 'noprice', label: t('pricing.filters.fillNoPrice') },
]);

// ---- the editor drawer --------------------------------------------------------

const editing = computed(() => {
    if (view.edit === NEW) {
        return { group: null };
    }

    if (!view.edit) {
        return null;
    }

    const group = catalog.priceGroups.find((row) => row.id === view.edit);

    return group ? { group } : null;
});

function openEdit(group) {
    view.edit = group.id;
}

function onSave(draft) {
    const stored = catalog.savePriceGroup(draft);

    view.edit = '';
    push({
        title: t('pricing.toast.saved'),
        body: t('pricing.toast.savedBody', { name: loc(stored.name) }),
    });
}

// ---- delete -------------------------------------------------------------------

function askRemove(group) {
    const matched = catalog.skusOfGroup(group.id).length;

    ask.value = {
        title: t('pricing.confirmDelete.title'),
        body: t('pricing.confirmDelete.body', { name: loc(group.name) }),
        confirmLabel: t('pricing.confirmDelete.confirm'),
        effects: [
            t('pricing.confirmDelete.effect1', { n: matched }),
            t('pricing.confirmDelete.effect2'),
            t('pricing.confirmDelete.effect3'),
        ],
        done: () => {
            catalog.deletePriceGroup(group);
            push({
                title: t('pricing.toast.deleted'),
                body: loc(group.name),
                bad: true,
            });
        },
    };
}

function confirmAsk() {
    const pending = ask.value;

    ask.value = null;
    pending.done();
}

// ---- export ---------------------------------------------------------------------

/** One CSV row per quantity band of one group. */
function groupRows(group) {
    return group.breaks.map((lo, index) => [
        loc(group.name),
        group.prefixes.join(' '),
        group.uom ? t(`pricing.uom.${group.uom}`) : '',
        bandText(group.breaks, index),
        group.prices[index] == null ? '' : group.prices[index],
    ]);
}

function header() {
    return [
        t('pricing.export.colGroup'),
        t('pricing.export.colPrefixes'),
        t('pricing.export.colUom'),
        t('pricing.export.colRange'),
        t('pricing.export.colPrice'),
    ];
}

function exportRows(file, body) {
    downloadCsv(file, header(), body);
    catalog.logExport(file, 'pricing.export.rows', body.length);
    push({
        title: t('pricing.toast.exported'),
        body: t('pricing.toast.exportedBody', { n: body.length, file }),
    });
}

function exportAll() {
    exportRows(
        `price-groups-${isoDaysAgo(0)}.csv`,
        catalog.priceGroups.flatMap(groupRows),
    );
}

function exportGroup(group) {
    exportRows(
        `price-group-${group.id}-${isoDaysAgo(0)}.csv`,
        groupRows(group),
    );
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.operations'), t('nav.item.pricing')]"
            :title="t('pricing.title')"
            :sub="t('pricing.sub')"
        >
            <template #actions>
                <AButton
                    icon="download"
                    :disabled="!catalog.priceGroups.length"
                    @click="exportAll"
                >
                    {{ t('pricing.actions.export') }}
                </AButton>
                <AButton kind="p" icon="plus" @click="view.edit = NEW">
                    {{ t('pricing.actions.newGroup') }}
                </AButton>
            </template>
        </PageHead>

        <ASkeleton v-if="dataset.isBusy" :rows="SKELETON_ROWS" />
        <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
        <AEmpty
            v-else-if="!catalog.priceGroups.length"
            icon="layers"
            :title="t('pricing.empty.noneTitle')"
            :sub="t('pricing.empty.noneSub')"
        >
            <template #action>
                <AButton kind="p" icon="plus" @click="view.edit = NEW">
                    {{ t('pricing.actions.createFirst') }}
                </AButton>
            </template>
        </AEmpty>
        <template v-else>
            <FilterBar
                :count="shown.length"
                :label="
                    t('pricing.countLabel', {
                        total: catalog.priceGroups.length,
                    })
                "
                :dirty="dirty"
                @clear="clearFilters"
            >
                <div class="a-search tp-search">
                    <span class="lead"><AIcon name="search" :size="18" /></span>
                    <input
                        v-model="view.q"
                        :placeholder="t('pricing.filters.searchPlaceholder')"
                        :aria-label="t('pricing.filters.searchAria')"
                    />
                </div>
                <ASelect
                    v-model="view.uom"
                    :options="uomOptions"
                    :aria-label="t('pricing.filters.uomAria')"
                />
                <ASelect
                    v-model="view.scale"
                    :options="scaleOptions"
                    :aria-label="t('pricing.filters.scaleAria')"
                />
                <ASelect
                    v-model="view.fill"
                    :options="fillOptions"
                    :aria-label="t('pricing.filters.fillAria')"
                />
            </FilterBar>

            <div v-if="skuQuery && skuHit" class="a-note a-note--ok tp-lookup">
                <I18nT
                    :keypath="
                        skuItem
                            ? 'pricing.lookup.resolvedNamed'
                            : 'pricing.lookup.resolved'
                    "
                    tag="span"
                    scope="global"
                >
                    <template #sku>
                        <ANum>{{ term }}</ANum>
                    </template>
                    <template v-if="skuItem" #name>
                        {{ loc(skuItem.name) }}
                    </template>
                    <template #group>
                        <b>{{ loc(skuHit.group.name) }}</b>
                    </template>
                    <template #prefix>
                        <span class="tp-chip">{{ skuHit.prefix }}</span>
                    </template>
                </I18nT>
                <button
                    type="button"
                    class="a-linkbtn"
                    @click="openEdit(skuHit.group)"
                >
                    {{ t('pricing.lookup.open') }}
                </button>
            </div>
            <div v-else-if="skuQuery" class="a-note a-note--warn tp-lookup">
                <I18nT
                    keypath="pricing.lookup.unresolved"
                    tag="span"
                    scope="global"
                >
                    <template #sku>
                        <ANum>{{ term }}</ANum>
                    </template>
                </I18nT>
            </div>

            <PriceGroupList
                :rows="shown"
                :selected="editing?.group?.id || null"
                @row="openEdit"
                @edit="openEdit"
                @export="exportGroup"
                @remove="askRemove"
            />
        </template>

        <PriceGroupEditor
            v-if="editing"
            :key="view.edit"
            :group="editing.group"
            @close="view.edit = ''"
            @save="onSave"
            @export="editing.group && exportGroup(editing.group)"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            danger
            :pin="catalog.approvalPin"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped>
.tp-search {
    width: 400px;
    flex: none;
}

.tp-search input {
    height: 44px;
}

.tp-lookup {
    margin-bottom: 14px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}
</style>
