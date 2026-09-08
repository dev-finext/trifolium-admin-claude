<script setup>
// ניהול שוטף › מוצרי מדף — the finished goods the pharmacy sells from the shelf.
//
// Every filter, the open drawer and the label manager live in the query string,
// so a filtered catalogue can be pasted to a colleague and opens identically.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import LabelsManager from '@/components/products/LabelsManager.vue';
import ProductEditor from '@/components/products/ProductEditor.vue';
import ProductTable from '@/components/products/ProductTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AIcon from '@/components/ui/AIcon.vue';
import APagination from '@/components/ui/APagination.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { ils, priceParts } from '@/lib/money';
import {
    PRODUCT_FILTER_FIELDS,
    PRODUCT_FILTER_GROUPS,
    PRODUCT_PRICE_BANDS,
    useCatalogStore,
} from '@/stores/catalog';
import { useDatasetStore } from '@/stores/dataset';

/** How many skeleton rows stand in for the grid while the dataset loads. */
const SKELETON_ROWS = 7;

/** The drawer's own stable identity for "a product that does not exist yet". */
const NEW = 'new';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const catalog = useCatalogStore();

const SPEC = { fields: PRODUCT_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    q: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
    edit: '',
    full: false,
    manage: false,
});

/** The pending confirmation. Not a view state, so not in the URL. */
const ask = ref(null);

const term = computed(() => view.q.trim().toLowerCase());

const searched = computed(() => {
    if (!term.value) {
        return catalog.products;
    }

    return catalog.products.filter((product) =>
        searchHaystack(product.name, product.sku, product.content).includes(
            term.value,
        ),
    );
});

const filters = useListFilters(SPEC, view, searched);

const shown = computed(() => filters.rows);

const { paged, total } = usePaged(shown, view);

const dirty = computed(() => filters.dirty || Boolean(term.value));

/** How a price band reads, built from the amounts the band itself carries. */
function bandLabel(id) {
    const band = PRODUCT_PRICE_BANDS.find((one) => one.id === id);

    if (!band) {
        return String(id);
    }

    if (band.min === null) {
        return t('products.filters.priceUpTo', { amount: ils(band.max, 0) });
    }

    if (band.max === null) {
        return t('products.filters.priceOver', { amount: ils(band.min, 0) });
    }

    return t('products.filters.priceBetween', {
        from: ils(band.min, 0),
        to: ils(band.max, 0),
    });
}

const spec = computed(() => ({
    id: 'products',
    ns: 'products',
    noun: t('products.filter.noun'),
    groups: PRODUCT_FILTER_GROUPS,
    units: { pstock: t('products.filter.unitsUnit') },
    fields: PRODUCT_FILTER_FIELDS.map((field) => {
        if (field.key === 'pband') {
            return { ...field, optionLabel: bandLabel };
        }

        if (field.key === 'plabel') {
            return {
                ...field,
                optionLabel: (id) =>
                    loc(catalog.labelById(id)?.name) || String(id),
            };
        }

        return field;
    }),
}));

function clearFilters() {
    view.q = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { q: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

// ---- the editor drawer ----------------------------------------------------

const editing = computed(() => {
    if (view.edit === NEW) {
        return {};
    }

    return catalog.products.find((product) => product.id === view.edit) || null;
});

function openNew() {
    view.edit = NEW;
    view.full = false;
}

function openEdit(product) {
    view.edit = product.id;
    view.full = false;
}

function closeEditor() {
    view.edit = '';
    view.full = false;
}

/** A row click edits, except on an archived product, which offers a restore. */
function onRow(product) {
    if (product.status === 'archived') {
        askRestore(product);

        return;
    }

    openEdit(product);
}

function onSave(product, isNew) {
    const stored = catalog.saveProduct(product);

    closeEditor();
    push({
        title: isNew
            ? t('products.toast.created')
            : t('products.toast.updated'),
        body: t('products.toast.savedBody', { name: loc(stored.name) }),
    });
}

// ---- archive / restore ----------------------------------------------------

function askArchive(product) {
    const name = loc(product.name);

    ask.value = {
        title: t('products.confirm.archive.title', { name }),
        body: t('products.confirm.archive.body', { name, sku: product.sku }),
        confirmLabel: t('products.confirm.archive.confirm'),
        effects: [
            t('products.confirm.archive.effect1'),
            t('products.confirm.archive.effect2'),
            t('products.confirm.archive.effect3'),
            t('products.confirm.archive.effect4'),
        ],
        danger: true,
        reason: true,
        pin: catalog.approvalPin,
        done: (why) => {
            catalog.archiveProduct(product, why);
            push({
                title: t('products.toast.archived'),
                body: t('products.toast.archivedBody', { name }),
                bad: true,
            });
        },
    };
}

function askRestore(product) {
    const name = loc(product.name);

    ask.value = {
        title: t('products.confirm.restore.title', { name }),
        body: t('products.confirm.restore.body', { name }),
        confirmLabel: t('products.confirm.restore.confirm'),
        effects: [
            t('products.confirm.restore.effect1'),
            t('products.confirm.restore.effect2', {
                price: ils(priceParts(product.net).display, 0),
            }),
            t('products.confirm.restore.effect3'),
        ],
        danger: false,
        reason: false,
        pin: false,
        done: () => {
            catalog.restoreProduct(product);
            push({
                title: t('products.toast.restored'),
                body: t('products.toast.restoredBody', { name }),
            });
        },
    };
}

function confirmAsk(reason) {
    const pending = ask.value;

    ask.value = null;
    pending.done(reason);
}

// ---- export --------------------------------------------------------------

function exportCatalog() {
    const file = `shelf-products-${isoDaysAgo(0)}.csv`;
    const header = [
        t('products.export.colName'),
        t('products.export.colContent'),
        t('products.export.colSku'),
        t('products.export.colNet'),
        t('products.export.colGross'),
        t('products.export.colWeight'),
        t('products.export.colUom'),
        t('products.export.colStock'),
        t('products.export.colMinStock'),
        t('products.export.colStatus'),
        t('products.export.colLabels'),
    ];
    const body = shown.value.map((product) => [
        loc(product.name),
        loc(product.content),
        product.sku,
        product.net,
        priceParts(product.net).display,
        product.wVal,
        product.wUom ? t(`products.unit.${product.wUom}`) : '',
        product.stock == null ? 0 : product.stock,
        product.minStock,
        t(`products.status.${product.status}`),
        product.labels
            .map((id) => loc(catalog.labelById(id)?.name))
            .filter(Boolean)
            .join(' · '),
    ]);

    downloadCsv(file, header, body);
    catalog.logExport(file, 'products.export.rows', body.length);
    push({
        title: t('products.toast.exported'),
        body: t('products.toast.exportedBody', { n: body.length, file }),
    });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.operations'), t('nav.item.products')]"
            :title="t('products.title')"
            :sub="t('products.sub')"
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="openNew">
                    {{ t('products.actions.newProduct') }}
                </AButton>
                <AButton icon="tag" @click="view.manage = true">
                    {{ t('products.actions.manageLabels') }}
                </AButton>
                <AButton
                    icon="download"
                    :disabled="!shown.length"
                    @click="exportCatalog"
                >
                    {{ t('products.actions.export') }}
                </AButton>
            </template>
        </PageHead>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="shown.length"
            :total="searched.length"
            :label="
                t('products.countLabel', { total: catalog.products.length })
            "
            :dirty="dirty"
            @clear="clearFilters"
        >
            <div class="a-search a-pv-search">
                <span class="lead"><AIcon name="search" :size="18" /></span>
                <input
                    v-model="view.q"
                    :placeholder="t('products.filters.searchPlaceholder')"
                    :aria-label="t('products.filters.searchAria')"
                />
            </div>

            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="view"
            :rows="searched"
            @remove="removeChip"
            @clear="clearFilters"
        />

        <ASkeleton v-if="dataset.isBusy" :rows="SKELETON_ROWS" />
        <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
        <ProductTable
            v-else
            :rows="paged"
            :labels="catalog.labels"
            :selected="editing?.id || null"
            :has-any="catalog.products.length > 0"
            @row="onRow"
            @edit="openEdit"
            @archive="askArchive"
            @restore="askRestore"
            @new="openNew"
            @clear="clearFilters"
        />

        <APagination
            v-model:page="view.pg"
            v-model:size="view.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="view"
            :rows="searched"
            :result-count="shown.length"
            @close="drawerOpen = false"
            @clear="clearFilters"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />

        <ADrawer
            :open="Boolean(editing)"
            :full="view.full"
            @close="closeEditor"
        >
            <ProductEditor
                v-if="editing"
                :key="view.edit"
                :product="editing"
                :full="view.full"
                @save="onSave"
                @close="closeEditor"
                @toggle-full="view.full = !view.full"
            />
        </ADrawer>

        <LabelsManager :open="view.manage" @close="view.manage = false" />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            :reason="ask?.reason || false"
            :pin="ask?.pin || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped>
.a-pv-search {
    width: 320px;
    flex: none;
}

.a-pv-search input {
    height: 44px;
}
</style>
