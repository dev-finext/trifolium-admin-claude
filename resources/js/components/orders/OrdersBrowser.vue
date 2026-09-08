<script setup>
// The order list screen.
//
// It is a component rather than the view itself because both /orders and
// /orders/:id show it: the detail route draws its drawer over this list, so the
// filtered list a colleague was sent stays behind the order they open.
//
// Every filter, the sort and the date range live in the query string. The date
// range is the outermost filter — the status tabs count inside it — and the
// selection is deliberately NOT in the URL: it is a scratch list for one bulk
// action, not a view worth sending anyone.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import CourierDialog from '@/components/orders/CourierDialog.vue';
import OrderBulkBar from '@/components/orders/OrderBulkBar.vue';
import OrderTable from '@/components/orders/OrderTable.vue';
import AButton from '@/components/ui/AButton.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import AInput from '@/components/ui/AInput.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { COURIERS, DEFAULT_QUIET_HOURS, ORDER_STATUSES } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { hasRange } from '@/lib/dateRange';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { activeKeys, emptyFilters, toggleValue } from '@/lib/facets';
import { num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import {
    filterOrders,
    ORDER_FILTER_FIELDS,
    ORDER_FILTER_GROUPS,
    ordersInRange,
    statusOf,
    useOrdersStore,
} from '@/stores/orders';

/** Filter keys that count towards "the list is filtered". */

const { t, locale } = useI18n();
const { loc } = useLocalized();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const dataset = useDatasetStore();
const orders = useOrdersStore();

const view = useUrlState({
    preset: 'all',
    from: '',
    to: '',
    // Every set field is an array, so multi-select survives a pasted link:
    // ?status=in_production,ready_for_delivery
    ...emptyFilters(ORDER_FILTER_FIELDS),
    q: '',
    sort: '',
    dir: 'asc',
});

/** The filter drawer, and the views strip's exposed "save" action. */
const drawerOpen = ref(false);
const savedViews = ref(null);

const selection = ref([]);
const assigning = ref(null);
const ask = ref(null);

const range = computed({
    get: () => ({ preset: view.preset, from: view.from, to: view.to }),
    set: (next) => {
        view.preset = next.preset;
        view.from = next.from;
        view.to = next.to;
    },
});

const sort = computed({
    get: () => (view.sort ? { key: view.sort, dir: view.dir } : null),
    set: (next) => {
        view.sort = next?.key || '';
        view.dir = next?.dir || 'asc';
    },
});

const inRange = computed(() => ordersInRange(orders.all, range.value));

const rows = computed(() => filterOrders(inRange.value, view));

const shownIds = computed(() => rows.value.map((order) => order.id));

const rangeSet = computed(() => hasRange(range.value));

const rangeNote = computed(() => {
    if (!rangeSet.value) {
        return t('orders.range.hint');
    }

    return t('orders.range.note', {
        n: num(inRange.value.length),
        from: view.from ? fmtISO(view.from) : t('orders.value.none'),
        to: view.to ? fmtISO(view.to) : t('orders.value.none'),
    });
});

/**
 * Status tabs, counted inside the date range that is already in force.
 *
 * The tabs and the drawer write the same `status` array: a tab is the one-click
 * path to a single status, the drawer is where two or more are combined. A tab
 * therefore reads as active only when it is the sole selection — with several
 * chosen, none is lit and the count line says how many.
 */
const tabs = computed(() => [
    { id: 'all', label: t('orders.tab.all'), n: inRange.value.length },
    ...ORDER_STATUSES.map((status) => ({
        id: status.id,
        label: t(`status.${status.id}`),
        n: inRange.value.filter((order) => statusOf(order) === status.id)
            .length,
    })),
    {
        id: 'hold',
        label: t('orders.tab.hold'),
        n: inRange.value.filter((order) => Boolean(order.hold)).length,
    },
]);

/** Which fields are narrowing the list right now. */
const activeFilters = computed(() => activeKeys(ORDER_FILTER_FIELDS, view));

/** The city name in the reader's language, keyed by its Hebrew source text. */
function cityLabel(he) {
    const hit = inRange.value.find((order) => order.address?.city?.he === he);

    return hit ? loc(hit.address.city) : he;
}

function practitionerLabel(code) {
    const hit = inRange.value.find((order) => order.practitioner.code === code);

    return hit
        ? `${loc(hit.practitioner.first)} ${loc(hit.practitioner.last)} · ${code}`
        : String(code);
}

/**
 * Option text for the three fields whose values are not a plain managed list:
 * a status doubles as the hold marker, a flag has an "any" catch-all, and a
 * courier can be unassigned. Everything else reads through its `prefix`.
 */
const LABELLERS = {
    status: (v) => (v === 'hold' ? t('orders.filter.hold') : t(`status.${v}`)),
    flag: (v) =>
        v === 'any'
            ? t('orders.filter.anyException')
            : t(`exception.${v}.short`),
    courier: (v) =>
        v === 'none' ? t('orders.filter.noCourier') : t(`courier.${v}`),
    city: cityLabel,
    practitioner: practitionerLabel,
};

/** What the one filter system needs to know about this list. */
const spec = computed(() => ({
    id: 'orders',
    ns: 'orders',
    noun: t('orders.filter.noun'),
    groups: ORDER_FILTER_GROUPS,
    units: { total: '₪', days: t('orders.filter.daysUnit') },
    fields: ORDER_FILTER_FIELDS.map((field) =>
        LABELLERS[field.key]
            ? { ...field, optionLabel: LABELLERS[field.key] }
            : field,
    ),
}));

/** One chip removed: a value out of its field, or a numeric test cleared. */
function removeChip(chip) {
    const field = ORDER_FILTER_FIELDS.find((one) => one.key === chip.key);

    patch({
        [chip.key]:
            field?.kind === 'num'
                ? { op: 'gt', v: '' }
                : toggleValue(view[chip.key], chip.value),
    });
}

const activeCount = computed(
    () => activeFilters.value.length + (view.q.trim() ? 1 : 0),
);

const dirty = computed(() => activeCount.value > 0 || rangeSet.value);

/** The tab strip's value: a single status, or '' when several are combined. */
const statusTab = computed(() =>
    view.status.length === 1 ? view.status[0] : view.status.length ? '' : 'all',
);

function pickStatusTab(id) {
    patch({ status: id === 'all' ? [] : [id] });
}

/** Apply a saved view: its fields replace the current ones, the range stays. */
function applyView(nextPatch) {
    patch({ ...emptyFilters(ORDER_FILTER_FIELDS), q: '', ...nextPatch });
    selection.value = [];
}

// The standing filter applies only when the screen opens with nothing of its own
// in the URL. A pasted link is somebody showing a colleague a specific view, and
// it must survive whatever that colleague happens to have starred.
onMounted(() => {
    if (activeCount.value || rangeSet.value) {
        return;
    }

    const standing = savedViews.value?.standingPatch?.();

    if (standing) {
        applyView(standing);
    }
});

const subtitle = computed(() =>
    t('orders.sub', {
        total: num(orders.all.length),
        flagged: num(orders.flaggedCount),
    }),
);

/** How many of the ticked orders the lab can actually take. */
const sendableCount = computed(
    () => orders.sendableToLab(selection.value).length,
);
const selectedOrders = computed(() =>
    selection.value.map((id) => orders.byId(id)).filter(Boolean),
);

/** The order the detail route holds open, so its row reads as selected. */
const openId = computed(() =>
    route.name === 'order' ? String(route.params.id) : null,
);

function patch(next) {
    Object.assign(view, next);
}

function clearFilters() {
    patch({
        preset: 'all',
        from: '',
        to: '',
        ...emptyFilters(ORDER_FILTER_FIELDS),
        q: '',
    });
    selection.value = [];
}

function toggle(id) {
    selection.value = selection.value.includes(id)
        ? selection.value.filter((row) => row !== id)
        : [...selection.value, id];
}

function toggleAll() {
    const all = shownIds.value.every((id) => selection.value.includes(id));

    selection.value = all ? [] : [...shownIds.value];
}

/** Opening an order is a navigation, so the filtered list survives in the URL. */
function open(order) {
    router.push({
        name: 'order',
        params: { id: order.id },
        query: route.query,
    });
}

function confirmed(why) {
    const pending = ask.value;

    ask.value = null;
    pending?.done(why);
}

// ---- single-row actions ---------------------------------------------------

function askRemind(order) {
    ask.value = {
        title: t('orders.action.send_pay_link.label'),
        confirmLabel: t('orders.action.send_pay_link.label'),
        body: t('orders.payment.resendBody', {
            name: loc(order.patient.name),
            phone: order.patient.phone,
        }),
        effects: [
            t('orders.effect.msgToCustomer'),
            t('orders.effect.loggedInMessageLog'),
        ],
        done: async () => {
            await orders.recordMessage(order.id, {
                templateId: orders.templateByCategory('pay_reminder')?.id,
                channel: t('channel.whatsapp'),
            });
            toast.push({
                title: t('orders.action.send_pay_link.toast'),
                body: `${loc(order.patient.name)} · ${order.patient.phone}`,
            });
        },
    };
}

async function saveCourier(payload) {
    const order = assigning.value;

    if (!order) {
        return;
    }

    await orders.assignCourier(order.id, payload);

    toast.push({
        title: t('orders.courierDialog.done'),
        body: payload.tracking
            ? t('orders.courierDialog.doneBody', {
                  tracking: payload.tracking,
                  courier: t(`courier.${payload.courier}`),
              })
            : t('orders.courierDialog.doneNoTracking', {
                  courier: t(`courier.${payload.courier}`),
              }),
    });

    assigning.value = null;
}

// ---- bulk actions ---------------------------------------------------------

// Only orders whose money is settled can go to the lab, so the dialog counts them
// before it asks and says plainly how many of the selection it will leave behind.
function askToLab() {
    const sendable = orders.sendableToLab(selection.value);
    const skipped = selection.value.length - sendable.length;

    ask.value = {
        title: t('orders.bulk.toLabTitle'),
        confirmLabel: t('orders.bulk.toLab'),
        reason: true,
        body: t('orders.bulk.toLabBody', { n: sendable.length }),
        effects: [
            t('orders.effect.statusTo', { status: t('status.in_production') }),
            t('orders.effect.itemsToLabQueue'),
            t('orders.effect.msgByTriggers'),
            ...(skipped
                ? [t('orders.bulk.toLabSkipped', { n: skipped }, skipped)]
                : []),
        ],
        done: async (why) => {
            const moved = await orders.sendManyToLab(selection.value, why);

            toast.push(
                moved
                    ? {
                          title: t('orders.bulk.toLabDone'),
                          body: t('orders.bulk.toLabDoneBody', { n: moved }),
                      }
                    : {
                          title: t('orders.bulk.toLabNone'),
                          body: t('orders.bulk.toLabNoneBody'),
                          bad: true,
                      },
            );
            selection.value = [];
        },
    };
}

function askBulkRemind() {
    const n = selection.value.length;

    ask.value = {
        title: t('orders.bulk.remindTitle'),
        confirmLabel: t('orders.bulk.remind'),
        body: t('orders.bulk.remindBody', { n }),
        effects: [
            t('orders.effect.remindersLogged'),
            t('orders.effect.quietHours', DEFAULT_QUIET_HOURS),
        ],
        done: async () => {
            const templateId = orders.templateByCategory('pay_reminder')?.id;

            await Promise.all(
                selection.value.map((id) =>
                    orders.recordMessage(id, {
                        templateId,
                        channel: t('channel.whatsapp'),
                    }),
                ),
            );
            toast.push({
                title: t('orders.bulk.remindDone'),
                body: t('orders.bulk.remindDoneBody', { n }),
            });
            selection.value = [];
        },
    };
}

/**
 * Bulk assignment sets the courier only. Tracking numbers arrive one at a time
 * from the courier's own system, so they are typed in per order afterwards.
 */
function askBulkCourier() {
    const n = selection.value.length;
    const courier = COURIERS[0].id;

    ask.value = {
        title: t('orders.bulk.courierTitle'),
        confirmLabel: t('orders.bulk.assignCourier'),
        body: t('orders.bulk.courierBody', {
            n,
            courier: t(`courier.${courier}`),
        }),
        effects: [
            t('orders.effect.courierOnAll'),
            t('orders.effect.trackingLater'),
        ],
        done: async () => {
            await Promise.all(
                selection.value.map((id) =>
                    orders.assignCourier(id, { courier, tracking: '' }),
                ),
            );
            toast.push({
                title: t('orders.bulk.courierDone'),
                body: t('orders.courierDialog.doneNoTracking', {
                    courier: t(`courier.${courier}`),
                }),
            });
            selection.value = [];
        },
    };
}

// ---- export --------------------------------------------------------------

const EXPORT_HEADERS = () => [
    t('orders.col.id'),
    t('orders.col.date'),
    t('orders.col.customer'),
    t('orders.field.phone'),
    t('orders.col.practitioner'),
    t('orders.field.customerNumber'),
    t('orders.col.status'),
    t('orders.col.payer'),
    t('orders.col.fulfilment'),
    t('orders.col.total'),
    t('orders.field.tracking'),
    t('orders.filter.exception'),
];

// Placing an order by hand is a wizard of its own — a separate screen that this
// console links to rather than contains.
function newOrder() {
    toast.push({
        title: t('orders.manual.title'),
        body: t('orders.manual.body'),
    });
}
function exportOrders(list, suffix = '') {
    const file = `orders${suffix}-${isoDaysAgo(0)}.csv`;

    downloadCsv(file, EXPORT_HEADERS(), orders.exportRows(list, locale.value));
    toast.push({
        title: t('orders.export.done'),
        body: t('orders.export.doneBody', { n: list.length, file }),
    });
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.daily_ops'), t('nav.item.orders')]"
            :title="t('orders.title')"
            :sub="subtitle"
        >
            <template #actions>
                <AButton icon="download" @click="exportOrders(rows)">
                    {{ t('orders.export.label') }}
                </AButton>
                <AButton kind="p" icon="plus" @click="newOrder">
                    {{ t('orders.manual.label') }}
                </AButton>
            </template>
        </PageHead>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="view"
            :rows="inRange"
            @apply="applyView"
        />

        <DateRangeBar v-model="range" :note="rangeNote" />

        <ATabs
            v-if="rangeSet"
            :tabs="tabs"
            :model-value="statusTab"
            @update:model-value="pickStatusTab"
        />

        <FilterBar
            :count="rows.length"
            :total="inRange.length"
            :dirty="dirty"
            @clear="clearFilters"
        >
            <AInput
                v-model="view.q"
                class="ob-search"
                :placeholder="t('orders.search.placeholder')"
                :aria-label="t('orders.search.label')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    activeFilters.length
                        ? t('filters.openWith', { n: activeFilters.length })
                        : t('filters.open')
                }}
            </AButton>
            <span v-if="view.status.length > 1" class="a-count-txt">
                {{ t('orders.filter.multiStatus', { n: view.status.length }) }}
            </span>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="view"
            :rows="inRange"
            @remove="removeChip"
            @clear="clearFilters"
        />

        <ASkeleton v-if="dataset.isBusy" :rows="8" />
        <div v-else-if="dataset.isError" class="a-card">
            <AErrorState @retry="dataset.load(true)" />
        </div>
        <template v-else>
            <OrderBulkBar
                :selection="selection"
                :sendable-count="sendableCount"
                @to-lab="askToLab"
                @assign="askBulkCourier"
                @remind="askBulkRemind"
                @export="exportOrders(selectedOrders, '-selected')"
                @clear="selection = []"
            />

            <OrderTable
                v-model:sort="sort"
                :rows="rows"
                :selection="selection"
                :open-id="openId"
                @open="open"
                @toggle="toggle"
                @toggle-all="toggleAll"
                @remind="askRemind"
                @assign="assigning = $event"
                @clear="clearFilters"
            />
        </template>

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="view"
            :rows="inRange"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clearFilters"
            @patch="patch"
            @save="savedViews?.openSave()"
        />

        <CourierDialog
            :open="Boolean(assigning)"
            :order="assigning"
            @close="assigning = null"
            @save="saveCourier"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="Boolean(ask?.danger)"
            :reason="Boolean(ask?.reason)"
            :pin="ask?.pin ? dataset.session?.pin || true : false"
            @close="ask = null"
            @confirm="confirmed"
        />
    </div>
</template>

<style scoped>
.ob-search {
    width: 330px;
    max-width: 100%;
}
</style>
