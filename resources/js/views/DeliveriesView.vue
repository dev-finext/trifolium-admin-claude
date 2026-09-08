<script setup>
// The deliveries desk.
//
// Three panes behind one segmented control: the queue of everything on the desk,
// the powers of attorney that gate courier handover, and the mapping between a
// courier's letter code and the company behind it.
//
// Everything the reader chose — pane, date range, handling stage, every filter,
// the sort, and which power-of-attorney group is open — lives in the query string,
// so a filtered view can be pasted to a colleague and opens the same way.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import CourierAssignModal from '@/components/deliveries/CourierAssignModal.vue';
import CourierMap from '@/components/deliveries/CourierMap.vue';
import DeliveryQueue from '@/components/deliveries/DeliveryQueue.vue';
import PickupPointsPanel from '@/components/deliveries/PickupPointsPanel.vue';
import PowerOfAttorneyPanel from '@/components/deliveries/PowerOfAttorneyPanel.vue';
import { useCourierName } from '@/components/deliveries/useCourierName';
import { useDeliveryActions } from '@/components/deliveries/useDeliveryActions';
import { useDeliveryExport } from '@/components/deliveries/useDeliveryExport';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import APagination from '@/components/ui/APagination.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { COURIER_IDS } from '@/config';
import { hasRange, inRange as insideRange } from '@/lib/dateRange';
import { FALLBACK_LOCALE, loc as resolve } from '@/lib/localized';
import {
    DELIVERY_FILTER_FIELDS,
    DELIVERY_FILTER_GROUPS,
    DELIVERY_STAGES,
    DESK_STATUS_IDS,
    matchesFilters,
    useDeliveriesStore,
} from '@/stores/deliveries';

/** The panes, in the order the segmented control shows them. */
const PANES = [
    { id: 'queue', icon: 'list' },
    { id: 'poa', icon: 'signature' },
    { id: 'points', icon: 'map_pin' },
    { id: 'codes', icon: 'settings' },
];

const { t, locale } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

const SPEC = { fields: DELIVERY_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    view: 'queue',
    preset: 'all',
    from: '',
    to: '',
    stage: 'all',
    q: '',
    sort: '',
    dir: 'asc',
    poa: 'missing',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const range = computed({
    get: () => ({ preset: state.preset, from: state.from, to: state.to }),
    set: (next) => {
        state.preset = next.preset;
        state.from = next.from;
        state.to = next.to;
    },
});

// The date range comes first: every count below it is scoped to it.
const ranged = computed(() =>
    deliveries.deskOrders.filter((order) =>
        insideRange(order.iso, range.value),
    ),
);

const searched = computed(() =>
    ranged.value.filter((order) => matchesFilters(order, state)),
);

const filters = useListFilters(SPEC, state, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const spec = computed(() => ({
    id: 'deliveries',
    ns: 'deliveries',
    noun: t('deliveries.filter.noun'),
    groups: DELIVERY_FILTER_GROUPS,
    fields: DELIVERY_FILTER_FIELDS.map((field) => {
        if (field.key === 'courier') {
            return {
                ...field,
                optionLabel: (id) =>
                    id === 'none'
                        ? t('deliveries.filter.noCourier')
                        : courierName(id),
            };
        }

        if (field.key === 'city') {
            return {
                ...field,
                optionLabel: (he) => {
                    const hit = ranged.value.find(
                        (order) => order.address?.city?.he === he,
                    );

                    return hit ? loc(hit.address.city) : he;
                },
            };
        }

        if (field.key === 'point') {
            return {
                ...field,
                optionLabel: (id) => {
                    if (id === 'none') {
                        return t('deliveries.filter.noPoint');
                    }

                    const point = deliveries.pointById(id);

                    return point ? loc(point.name) : String(id);
                },
            };
        }

        return field;
    }),
}));

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { q: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const cities = computed(() => {
    const seen = new Map();

    deliveries.deskOrders.forEach((order) => {
        const key = resolve(order.address.city, FALLBACK_LOCALE);

        if (key && !seen.has(key)) {
            seen.set(key, loc(order.address.city));
        }
    });

    return [...seen]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, locale.value));
});

const counts = computed(() => {
    const list = ranged.value;
    const tally = (ids, pick) =>
        Object.fromEntries(
            ids.map((id) => [
                id,
                list.filter((row) => pick(row) === id).length,
            ]),
        );

    return {
        inRange: list.length,
        stage: Object.fromEntries(
            DELIVERY_STAGES.map((stage) => [
                stage.id,
                list.filter(stage.match).length,
            ]),
        ),
        status: tally(DESK_STATUS_IDS, (row) => row.status),
        courier: tally(COURIER_IDS, (row) => row.courier),
        city: tally(
            cities.value.map((city) => city.value),
            (row) => resolve(row.address.city, FALLBACK_LOCALE),
        ),
    };
});

const stageTabs = computed(() =>
    DELIVERY_STAGES.map((stage) => ({
        id: stage.id,
        label: t(`deliveries.stage.${stage.id}`),
        n: counts.value.stage[stage.id],
    })),
);

const rangeNote = computed(() => {
    if (!hasRange(range.value)) {
        return t('deliveries.range.hint');
    }

    const open = t('deliveries.range.open');

    return t('deliveries.range.note', {
        n: ranged.value.length,
        from: range.value.from || open,
        to: range.value.to || open,
    });
});

const crumbs = computed(() => [
    t('nav.group.daily_ops'),
    t('nav.item.deliveries'),
]);

const sub = computed(() =>
    t('deliveries.sub', {
        courier: deliveries.courierOrders.length,
        pickup: deliveries.pickupOrders.length,
    }),
);

const sortModel = computed(() => ({ key: state.sort, dir: state.dir }));

const dirty = computed(
    () => state.stage !== 'all' || filters.dirty || Boolean(state.q),
);

function onSort(next) {
    state.sort = next.key;
    state.dir = next.dir;
}

function clear() {
    state.q = '';
    state.stage = 'all';
    filters.clear();
}

function openOrder(order) {
    router.push({ name: 'order', params: { id: order.id } });
}

const {
    assigning,
    saveAssignment,
    shipping,
    shipBody,
    shipEffects,
    confirmShip,
    notifying,
    notifyBody,
    notifyEffects,
    confirmNotify,
} = useDeliveryActions();

const { exportRows } = useDeliveryExport(rows);

/**
 * The panes as a tab strip. The counts are what each pane is responsible for —
 * the desk queue, the powers of attorney still missing, and the courier codes —
 * so the strip reports work outstanding rather than merely naming three views.
 */
const paneTabs = computed(() =>
    PANES.map((pane) => ({
        id: pane.id,
        label: t(`deliveries.view.${pane.id}`),
        icon: pane.icon,
        n:
            pane.id === 'queue'
                ? deliveries.deskOrders.length
                : pane.id === 'poa'
                  ? deliveries.poaPending.length || undefined
                  : pane.id === 'points'
                    ? deliveries.todayAlert.points || undefined
                    : COURIER_IDS.length,
    })),
);
</script>

<template>
    <PageHead :crumbs="crumbs" :title="t('deliveries.title')" :sub="sub">
        <template #actions>
            <AButton
                v-if="state.view === 'queue'"
                icon="download"
                @click="exportRows"
            >
                {{ t('deliveries.export.action') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs
        :tabs="paneTabs"
        :model-value="state.view"
        @update:model-value="state.view = $event"
    />

    <CourierMap v-if="state.view === 'codes'" />

    <PickupPointsPanel
        v-else-if="state.view === 'points'"
        @open="((state.view = 'queue'), (state.type = 'pickup'))"
    />

    <PowerOfAttorneyPanel
        v-else-if="state.view === 'poa'"
        :orders="deliveries.poaOrders"
        :state="state.poa"
        @update:state="state.poa = $event"
        @open="openOrder"
    />

    <template v-else>
        <!-- V2: the daily dispatch alert for the pickup points -->
        <div
            v-if="deliveries.todayAlert.points"
            class="a-note a-note--warn a-note--btn dv-alert"
            role="button"
            tabindex="0"
            @click="state.view = 'points'"
            @keydown.enter.prevent="state.view = 'points'"
        >
            <V2Badge id="pickup-points" size="sm" />
            <strong>{{
                t('deliveries.alert.title', deliveries.todayAlert)
            }}</strong>
            <span class="a-note-a">{{ t('deliveries.alert.open') }}</span>
        </div>

        <DateRangeBar v-model="range" :note="rangeNote" />

        <ATabs
            v-if="hasRange(range)"
            :tabs="stageTabs"
            :model-value="state.stage"
            @update:model-value="state.stage = $event"
        />

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="state"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="t('deliveries.count', { n: counts.inRange || 0 })"
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.q"
                class="dq-search"
                :aria-label="t('deliveries.filter.search')"
                :placeholder="t('deliveries.filter.searchPlaceholder')"
            />
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
            :filters="state"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <DeliveryQueue
            :rows="paged"
            :sort="sortModel"
            @update:sort="onSort"
            @assign="assigning = $event"
            @ship="shipping = $event"
            @notify="notifying = $event"
            @open="openOrder"
        />

        <APagination
            v-model:page="state.pg"
            v-model:size="state.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
            :rows="searched"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />
    </template>

    <CourierAssignModal
        :open="Boolean(assigning)"
        :order="assigning"
        @close="assigning = null"
        @save="saveAssignment"
    />

    <ConfirmDialog
        :open="Boolean(shipping)"
        :title="t('deliveries.ship.title')"
        :body="shipBody"
        :effects="shipEffects"
        :confirm-label="t('deliveries.ship.confirm')"
        @close="shipping = null"
        @confirm="confirmShip"
    />

    <ConfirmDialog
        :open="Boolean(notifying)"
        :title="t('deliveries.notify.title')"
        :body="notifyBody"
        :effects="notifyEffects"
        :confirm-label="t('deliveries.notify.confirm')"
        @close="notifying = null"
        @confirm="confirmNotify"
    />
</template>

<style scoped>
.dv-alert {
    margin-bottom: 14px;
}
</style>
