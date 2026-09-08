<script setup>
// ניהול שוטף › מוצרי מדף — the finished goods the pharmacy sells from the shelf.
//
// Every filter, the open drawer and the label manager live in the query string,
// so a filtered catalogue can be pasted to a colleague and opens identically.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import LabelFilterSelect from '@/components/products/LabelFilterSelect.vue';
import LabelsManager from '@/components/products/LabelsManager.vue';
import ProductEditor from '@/components/products/ProductEditor.vue';
import ProductTable from '@/components/products/ProductTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { PRODUCT_STATUSES, UNITS } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { ils, priceParts } from '@/lib/money';
import {
    PRODUCT_PRICE_BANDS,
    isBlockedForSale,
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

const view = useUrlState({
    q: '',
    labels: [],
    status: 'all',
    stock: '',
    price: '',
    uom: '',
    img: '',
    tags: '',
    edit: '',
    full: false,
    manage: false,
});

/** The pending confirmation. Not a view state, so not in the URL. */
const ask = ref(null);

const term = computed(() => view.q.trim().toLowerCase());

const priceBand = computed(() =>
    PRODUCT_PRICE_BANDS.find((band) => band.id === view.price),
);

function inBand(product, band) {
    if (band.min !== null && product.net <= band.min) {
        return false;
    }

    return !(band.max !== null && product.net > band.max);
}

const shown = computed(() =>
    catalog.products.filter((product) => {
        if (
            term.value &&
            !searchHaystack(
                product.name,
                product.sku,
                product.content,
            ).includes(term.value)
        ) {
            return false;
        }

        // Every chosen label must be present: the filter narrows, it never widens.
        if (
            view.labels.length &&
            !view.labels.every((id) => product.labels.includes(id))
        ) {
            return false;
        }

        if (view.status !== 'all' && product.status !== view.status) {
            return false;
        }

        if (priceBand.value && !inBand(product, priceBand.value)) {
            return false;
        }

        if (view.uom && product.wUom !== view.uom) {
            return false;
        }

        if (view.img === 'has' && !product.img) {
            return false;
        }

        if (view.img === 'none' && product.img) {
            return false;
        }

        if (view.tags === 'none' && product.labels.length) {
            return false;
        }

        if (view.tags === 'has' && !product.labels.length) {
            return false;
        }

        if (view.stock === 'low' && !isBlockedForSale(product)) {
            return false;
        }

        if (view.stock === 'zero' && (product.stock || 0) > 0) {
            return false;
        }

        if (view.stock === 'ok' && isBlockedForSale(product)) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(
        term.value ||
        view.labels.length ||
        view.status !== 'all' ||
        view.price ||
        view.uom ||
        view.img ||
        view.tags ||
        view.stock,
    ),
);

function clearFilters() {
    view.q = '';
    view.labels = [];
    view.status = 'all';
    view.price = '';
    view.uom = '';
    view.img = '';
    view.tags = '';
    view.stock = '';
}

// ---- filter options -------------------------------------------------------

const option = (label, n) => t('products.filters.option', { label, n });

const statusOptions = computed(() => [
    {
        value: 'all',
        label: option(t('products.filters.statusAll'), catalog.products.length),
    },
    ...PRODUCT_STATUSES.map((status) => ({
        value: status.id,
        label: option(
            t(`products.status.${status.id}`),
            catalog.products.filter((product) => product.status === status.id)
                .length,
        ),
    })),
]);

const stockOptions = computed(() => [
    { value: '', label: t('products.filters.stockAll') },
    {
        value: 'low',
        label: option(
            t('products.filters.stockLow'),
            catalog.blockedProducts.length,
        ),
    },
    {
        value: 'zero',
        label: option(
            t('products.filters.stockZero'),
            catalog.products.filter((product) => !(product.stock > 0)).length,
        ),
    },
    {
        value: 'ok',
        label: option(
            t('products.filters.stockOk'),
            catalog.products.filter((product) => !isBlockedForSale(product))
                .length,
        ),
    },
]);

const priceOptions = computed(() => [
    { value: '', label: t('products.filters.priceAll') },
    ...PRODUCT_PRICE_BANDS.map((band) => ({
        value: band.id,
        label:
            band.min === null
                ? t('products.filters.priceUpTo', { amount: ils(band.max, 0) })
                : band.max === null
                  ? t('products.filters.priceOver', {
                        amount: ils(band.min, 0),
                    })
                  : t('products.filters.priceBetween', {
                        from: ils(band.min, 0),
                        to: ils(band.max, 0),
                    }),
    })),
]);

const uomOptions = computed(() => [
    { value: '', label: t('products.filters.uomAll') },
    ...UNITS.filter((unit) => catalog.weightUnitsInUse.includes(unit)).map(
        (unit) => ({
            value: unit,
            label: option(
                t(`products.unit.${unit}`),
                catalog.products.filter((product) => product.wUom === unit)
                    .length,
            ),
        }),
    ),
]);

const imgOptions = computed(() => [
    { value: '', label: t('products.filters.imageAll') },
    {
        value: 'has',
        label: option(
            t('products.filters.imageHas'),
            catalog.products.filter((product) => product.img).length,
        ),
    },
    {
        value: 'none',
        label: option(
            t('products.filters.imageNone'),
            catalog.products.filter((product) => !product.img).length,
        ),
    },
]);

const tagOptions = computed(() => [
    { value: '', label: t('products.filters.tagsAll') },
    {
        value: 'none',
        label: option(
            t('products.filters.tagsNone'),
            catalog.products.filter((product) => !product.labels.length).length,
        ),
    },
    {
        value: 'has',
        label: option(
            t('products.filters.tagsHas'),
            catalog.products.filter((product) => product.labels.length).length,
        ),
    },
]);

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

        <FilterBar
            :count="shown.length"
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

            <LabelFilterSelect
                v-model="view.labels"
                :labels="catalog.labels"
                :usage="catalog.labelUsage"
            />

            <ASelect
                v-model="view.status"
                :options="statusOptions"
                :aria-label="t('products.filters.statusAria')"
            />
            <ASelect
                v-model="view.stock"
                :options="stockOptions"
                :aria-label="t('products.filters.stockAria')"
            />
            <ASelect
                v-model="view.price"
                :options="priceOptions"
                :aria-label="t('products.filters.priceAria')"
            />
            <ASelect
                v-model="view.uom"
                :options="uomOptions"
                :aria-label="t('products.filters.uomAria')"
            />
            <ASelect
                v-model="view.img"
                :options="imgOptions"
                :aria-label="t('products.filters.imageAria')"
            />
            <ASelect
                v-model="view.tags"
                :options="tagOptions"
                :aria-label="t('products.filters.tagsAria')"
            />
        </FilterBar>

        <ASkeleton v-if="dataset.isBusy" :rows="SKELETON_ROWS" />
        <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
        <ProductTable
            v-else
            :rows="shown"
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
