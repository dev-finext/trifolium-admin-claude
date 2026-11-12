<script setup>
// עמדת משלוחים — the shipping station (SHIPPING_STATION_SPEC.md,
// DEMO_SHIPPING_STATION_PROMPT.md, DEMO_SHIPPING_STATION_ADDENDUM.md). One
// page: the worker never leaves it. The scan bar marks containers; each tab is
// the one list that status needs, with the console's own list standard
// (search, field filters, saved views — addendum §2.1); the order card
// (StationOrderCard) is a drawer over the page, never a navigation.
//
// 12.11.2026: there is no "באריזה" stage. Containers are marked — scanned, or
// "סימון ידני" — while the order is "בהכנה"; a fully marked order turns green
// and moves straight on, to a courier company or to "ממתין לאיסוף עצמי". The
// "באריזה" tab stays on the strip, grey, so the flow still reads in order.
//
// New locale keys this addendum pass adds, on top of what the first pass
// already authored in locales/{he,en}/deliveries.js:
//   deliveries.filter.noun, deliveries.filterGroup.{state,where}
//   deliveries.filter.field.{gate,problem,shipTo,city,courier}
//   deliveries.filter.gate.{ok,blocked}
// Two keys from the first pass are now dead and should be removed, not
// reauthored: deliveries.card.urgent, deliveries.export.*.
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import CollectModal from '@/components/deliveries/CollectModal.vue';
import CourierSettingsTab from '@/components/deliveries/CourierSettingsTab.vue';
import PickupListModal from '@/components/deliveries/PickupListModal.vue';
import StationOrderCard from '@/components/deliveries/StationOrderCard.vue';
import { useCourierName } from '@/components/deliveries/useCourierName';
import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import DateRangeBar from '@/components/ui/DateRangeBar.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import { filterDefaults, useListFilters } from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { ACTIVE_COURIER_IDS } from '@/config';
import { totalContainers } from '@/lib/containers';
import { inRange, presetRange } from '@/lib/dateRange';
import { durationParts, now } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import {
    STATION_FILTER_FIELDS,
    STATION_FILTER_GROUPS,
    useDeliveriesStore,
} from '@/stores/deliveries';
import { useOrdersStore } from '@/stores/orders';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const { courierName } = useCourierName();
const dataset = useDatasetStore();
const orders = useOrdersStore();
const store = useDeliveriesStore();

/** One shared field set for every list tab (addendum §2.1) — the "list
 * standard" this console's other screens already follow: filters in the URL,
 * and saved views, scoped to this screen alone (`shipping`). */
const SPEC = { fields: STATION_FILTER_FIELDS };

const state = useUrlState({
    tab: 'in_production',
    order: '',
    q: '',
    ...filterDefaults(SPEC),
    shippedFrom: presetRange('7').from,
    shippedTo: presetRange('7').to,
    shippedPreset: '7',
    shippedCourier: '',
});

/** The filter drawer, and the saved-views strip's exposed "save" action. */
const drawerOpen = ref(false);
const savedViews = ref(null);

const spec = computed(() => ({
    id: 'shipping',
    ns: 'deliveries',
    noun: t('deliveries.filter.noun'),
    groups: STATION_FILTER_GROUPS,
    fields: STATION_FILTER_FIELDS,
}));

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const TABS = [
    { id: 'in_production', icon: 'clipboard_list' },
    // Not a stage any more: shown, greyed out, never opened.
    { id: 'packing', icon: 'package', disabled: true },
    { id: 'awaiting_courier', icon: 'truck' },
    { id: 'pickup', icon: 'map_pin' },
    { id: 'shipped', icon: 'check' },
    { id: 'couriers', icon: 'phone' },
];

const tabs = computed(() =>
    TABS.map((tab) => ({
        id: tab.id,
        icon: tab.icon,
        label: t(`deliveries.tab.${tab.id}`),
        n: tab.disabled ? undefined : countFor(tab.id),
        disabled: Boolean(tab.disabled),
    })),
);

// An old link to the "באריזה" tab opens "בהכנה", where that work now happens.
watch(
    () => state.tab,
    (tab) => {
        if (tab === 'packing') {
            state.tab = 'in_production';
        }
    },
    { immediate: true },
);

function countFor(id) {
    switch (id) {
        case 'in_production':
            return store.inProduction.length;
        case 'awaiting_courier':
            return store.awaitingCourier.length;
        case 'pickup':
            return store.pickupOrders.length;
        default:
            return undefined;
    }
}

const openOrder = computed(() =>
    state.order ? orders.byId(state.order) : null,
);

// ---- the search box every tab's table shares ------------------------------

function matchesSearch(order) {
    const q = state.q.trim().toLowerCase();

    if (!q) {
        return true;
    }

    const haystack = [
        order.id,
        loc(order.patient?.name),
        order.patient?.phone,
        loc(order.address?.city),
        order.tracking,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return haystack.includes(q);
}

// ---- the shared field filter + saved views, over whichever tab is open -----
//
// One filter engine, one saved-views scope, for the whole station — the same
// shape the console's other screens use (useListFilters.js), with "which tab"
// standing in for the stage selector the old single-list desk had. A field
// that does not vary within a tab (e.g. "courier" before anything is linked)
// is simply inactive there, not broken.

const TAB_SOURCE = {
    in_production: () => store.inProduction,
    packing: () => store.packing,
    awaiting_courier: () => store.awaitingCourier,
    pickup: () => store.pickupOrders,
    shipped: () => store.shippedAndDone,
};

const currentTabRows = computed(() => {
    const source = TAB_SOURCE[state.tab];

    return source ? source().filter(matchesSearch) : [];
});

const filters = useListFilters(SPEC, state, currentTabRows);

// ---- age -------------------------------------------------------------------

/**
 * How long ago the order came in. An order from today is counted from its own
 * hour — "3 hours", not "less than a minute" — since the day alone says
 * nothing about it.
 */
function ageText(order) {
    let ms = Math.max(0, order.daysAgo || 0) * 86400000;

    if (!ms && order.time) {
        const [h, m] = String(order.time).split(':').map(Number);
        const clock = now();

        ms = Math.max(
            0,
            (clock.getHours() * 60 + clock.getMinutes() - (h * 60 + m)) * 60000,
        );
    }

    const parts = durationParts(ms);

    return t(
        `duration.${parts.unit}`,
        { a: parts.a, b: parts.b },
        parts.a || 1,
    );
}

// ---- tab 1: בהכנה ------------------------------------------------------------

const inProductionRows = computed(() =>
    state.tab === 'in_production' ? filters.rows : [],
);

/** The columns every station tab's table shares. */
const sharedCols = computed(() => [
    { k: 'order', label: t('deliveries.col.order'), nowrap: true },
    { k: 'sentToLab', label: t('deliveries.col.sentToLab'), nowrap: true },
    { k: 'practitioner', label: t('deliveries.col.practitioner') },
    { k: 'recipient', label: t('deliveries.col.recipient') },
    { k: 'city', label: t('deliveries.col.city') },
]);

const inProductionCols = computed(() => [
    ...sharedCols.value,
    { k: 'ship', label: t('deliveries.col.ship'), nowrap: true },
    { k: 'marked', label: t('deliveries.col.marked'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

/** A fully marked order is green: it is ready to move on. */
const readyRowClass = (order) => (store.allPacked(order) ? 'dv-ready' : null);

// ---- ממתין לשליח, grouped by company ----------------------------------

const awaitingGroups = computed(() => {
    if (state.tab !== 'awaiting_courier') {
        return [];
    }

    const byCompany = new Map();

    filters.rows.forEach((order) => {
        const code = store.activeShipmentOf(order)?.courierCode || 'tapuz';

        if (!byCompany.has(code)) {
            byCompany.set(code, []);
        }

        byCompany.get(code).push(order);
    });

    return [...byCompany.entries()].map(([code, list]) => ({
        code,
        orders: list,
    }));
});

const awaitingCols = computed(() => [
    { k: 'order', label: t('deliveries.col.order'), nowrap: true },
    { k: 'recipient', label: t('deliveries.col.recipient') },
    { k: 'city', label: t('deliveries.col.city') },
    { k: 'packages', label: t('deliveries.col.packages'), nowrap: true },
    { k: 'tracking', label: t('deliveries.col.trackingNumber'), nowrap: true },
    { k: 'linkedAt', label: t('deliveries.col.linkedAt'), nowrap: true },
    { k: 'manual', label: '', nowrap: true },
]);

const pickupListModal = ref({ open: false, code: '', orders: [] });

function openPickupList(group) {
    pickupListModal.value = {
        open: true,
        code: group.code,
        orders: group.orders,
    };
}

// ---- ממתין לאיסוף עצמי ---------------------------------------------------------

const pickupRows = computed(() => (state.tab === 'pickup' ? filters.rows : []));

const pickupCols = computed(() => [
    { k: 'order', label: t('deliveries.col.order'), nowrap: true },
    { k: 'payer', label: t('deliveries.col.payer') },
    { k: 'phone', label: t('deliveries.col.phone'), nowrap: true },
    { k: 'readySince', label: t('deliveries.col.readySince'), nowrap: true },
    { k: 'act', label: '', nowrap: true },
]);

const collectModal = ref({ open: false, order: null });

async function onMarkReady(order) {
    await store.markReadyForPickup(order);
    push({ title: t('deliveries.toast.readyForPickup'), body: order.id });
}

function onMarkCollected(order) {
    collectModal.value = { open: true, order };
}

// ---- נשלחו --------------------------------------------------------------------

const shippedRange = computed({
    get: () => ({
        preset: state.shippedPreset,
        from: state.shippedFrom,
        to: state.shippedTo,
    }),
    set: (next) => {
        state.shippedPreset = next.preset;
        state.shippedFrom = next.from;
        state.shippedTo = next.to;
    },
});

const shippedRows = computed(() => {
    if (state.tab !== 'shipped') {
        return [];
    }

    return filters.rows
        .filter((order) => {
            const at =
                order.collectedAt?.iso || order.shippedAt?.iso || order.iso;

            return inRange(at, shippedRange.value);
        })
        .filter(
            (order) =>
                !state.shippedCourier || order.courier === state.shippedCourier,
        );
});

const shippedCols = computed(() => [
    { k: 'order', label: t('deliveries.col.order'), nowrap: true },
    { k: 'recipient', label: t('deliveries.col.recipient') },
    { k: 'city', label: t('deliveries.col.city') },
    { k: 'courier', label: t('deliveries.col.courier'), nowrap: true },
    { k: 'tracking', label: t('deliveries.col.trackingNumber'), nowrap: true },
    { k: 'packages', label: t('deliveries.col.packages'), nowrap: true },
    { k: 'handedAt', label: t('deliveries.col.handedAt'), nowrap: true },
    { k: 'by', label: t('deliveries.col.by'), nowrap: true },
]);

const courierFilterOptions = computed(() => [
    { value: '', label: t('ui.all') },
    ...ACTIVE_COURIER_IDS.map((id) => ({
        value: id,
        label: t(`courier.${id}`),
    })),
]);

// ---- the scan bar --------------------------------------------------------------

const scanValue = ref('');
const scanResult = ref(null);
const scanInput = ref(null);

function focusScan() {
    if (document.activeElement === scanInput.value) {
        return;
    }

    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
    }

    scanInput.value?.focus();
}

onMounted(() => {
    focusScan();
    document.addEventListener('click', focusScan);
});

/** `scanResult.params` carries bilingual `name`/`city` as-is; resolve them to
 * the reader's language before they reach the interpolated message. */
const scanParams = computed(() => {
    const params = scanResult.value?.params || {};

    return {
        ...params,
        name: params.name ? loc(params.name) : params.name,
        city: params.city ? loc(params.city) : params.city,
        status: params.status ? t(`status.${params.status}`) : params.status,
    };
});

async function onScanEnter() {
    const code = scanValue.value;

    scanValue.value = '';

    if (!code.trim()) {
        return;
    }

    const result = await store.scanBarcode(code, state.order || null);

    scanResult.value = result;

    if (result.order && result.ok !== false) {
        state.order = result.order.id;
    } else if (result.order && result.message === 'alreadyScanned') {
        state.order = result.order.id;
    }

    await nextTick();
    focusScan();
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.daily_ops'), t('nav.item.deliveries')]"
            :title="t('deliveries.title')"
        />

        <ASkeleton v-if="dataset.isBusy" :rows="6" />

        <template v-else>
            <div class="dv-scan">
                <label class="a-lbl" for="dv-scan-input">
                    {{ t('deliveries.scanLabel') }}
                </label>
                <input
                    id="dv-scan-input"
                    ref="scanInput"
                    v-model="scanValue"
                    class="a-input a-ltr-input dv-scan-input"
                    :placeholder="t('deliveries.scanPlaceholder')"
                    autocomplete="off"
                    @keydown.enter="onScanEnter"
                />
                <span
                    v-if="scanResult"
                    class="dv-scan-result"
                    :class="`is-${scanResult.sound}`"
                >
                    {{ t(`deliveries.scan.${scanResult.message}`, scanParams) }}
                </span>
            </div>

            <ATabs v-model="state.tab" :tabs="tabs" />

            <template v-if="state.tab !== 'couriers'">
                <SavedViews
                    ref="savedViews"
                    :spec="spec"
                    :filters="state"
                    :rows="currentTabRows"
                    @apply="applyView"
                />

                <FilterBar
                    :count="filters.rows.length"
                    :total="currentTabRows.length"
                    :label="t('deliveries.filter.noun')"
                    :dirty="filters.dirty"
                    @clear="filters.clear"
                >
                    <AInput
                        v-model="state.q"
                        class="dv-search"
                        :placeholder="t('deliveries.search')"
                    />
                    <AButton icon="layers" @click="drawerOpen = true">
                        {{
                            filters.active.length
                                ? t('filters.openWith', {
                                      n: filters.active.length,
                                  })
                                : t('filters.open')
                        }}
                    </AButton>
                </FilterBar>

                <FilterChips
                    :spec="spec"
                    :filters="state"
                    :rows="currentTabRows"
                    @remove="removeChip"
                    @clear="filters.clear"
                />
            </template>

            <!-- in preparation: marking happens here, and a fully marked order
                 turns green and moves straight on -->
            <ADataTable
                v-if="state.tab === 'in_production'"
                :cols="inProductionCols"
                :rows="inProductionRows"
                row-key="id"
                :selected="state.order"
                :row-class="readyRowClass"
                @row="state.order = $event.id"
            >
                <template #head-act>
                    <span class="a-sr">{{ t('deliveries.col.actions') }}</span>
                </template>
                <template #cell-order="{ row }">
                    <div class="t-strong">{{ row.id }}</div>
                </template>
                <template #cell-sentToLab="{ row }"
                    ><ANum>{{ ageText(row) }}</ANum></template
                >
                <template #cell-practitioner="{ row }">{{
                    loc(row.practitioner.name)
                }}</template>
                <template #cell-recipient="{ row }">{{
                    loc(row.patient.name)
                }}</template>
                <template #cell-city="{ row }">{{
                    row.shipTo === 'pickup' ? '—' : loc(row.address?.city)
                }}</template>
                <template #cell-ship="{ row }">
                    <AChip
                        :tone="row.shipTo === 'pickup' ? 'blue' : 'gray'"
                        size="sm"
                        :dot="false"
                    >
                        {{
                            row.shipTo === 'pickup'
                                ? t('deliveries.ship.pickup')
                                : t('deliveries.ship.delivery')
                        }}
                    </AChip>
                </template>
                <template #cell-marked="{ row }">
                    <ANum :class="{ 'dv-done': store.allPacked(row) }"
                        >{{ store.packedCount(row) }}/{{
                            totalContainers(row)
                        }}</ANum
                    >
                </template>
                <template #cell-act="{ row }">
                    <div class="a-rowbtns" @click.stop>
                        <AButton
                            v-if="
                                row.shipTo === 'pickup' && store.allPacked(row)
                            "
                            sm
                            kind="p"
                            icon="map_pin"
                            @click="onMarkReady(row)"
                        >
                            {{ t('deliveries.action.markReady') }}
                        </AButton>
                        <AButton
                            v-else-if="store.allPacked(row)"
                            sm
                            kind="p"
                            icon="truck"
                            @click="state.order = row.id"
                        >
                            {{ t('deliveries.action.linkCourier') }}
                        </AButton>
                    </div>
                </template>
                <template #empty>
                    <AEmpty
                        icon="clipboard_list"
                        :title="t('deliveries.empty.title')"
                    />
                </template>
            </ADataTable>

            <!-- awaiting courier -->
            <template v-else-if="state.tab === 'awaiting_courier'">
                <AEmpty
                    v-if="!awaitingGroups.length"
                    icon="truck"
                    :title="t('deliveries.empty.title')"
                />
                <div
                    v-for="group in awaitingGroups"
                    :key="group.code"
                    class="dv-group"
                >
                    <div class="dv-group-h">
                        <span class="t-strong">{{
                            courierName(group.code)
                        }}</span>
                        <span class="t-sub">{{ group.orders.length }}</span>
                        <div class="dv-group-a">
                            <AButton
                                sm
                                icon="printer"
                                @click="openPickupList(group)"
                            >
                                {{ t('deliveries.action.printPickupList') }}
                            </AButton>
                        </div>
                    </div>
                    <ADataTable
                        :cols="awaitingCols"
                        :rows="group.orders"
                        row-key="id"
                        :selected="state.order"
                        @row="state.order = $event.id"
                    >
                        <template #cell-order="{ row }">{{ row.id }}</template>
                        <template #cell-recipient="{ row }">{{
                            loc(row.patient.name)
                        }}</template>
                        <template #cell-city="{ row }">{{
                            loc(row.address?.city)
                        }}</template>
                        <template #cell-packages="{ row }"
                            ><ANum>{{ row.packagesCount || 1 }}</ANum></template
                        >
                        <template #cell-tracking="{ row }"
                            ><ANum>{{ row.tracking }}</ANum></template
                        >
                        <template #cell-linkedAt="{ row }">
                            <ANum>{{
                                store.activeShipmentOf(row)?.linkedAt?.stamp
                            }}</ANum>
                        </template>
                        <template #cell-manual="{ row }">
                            <AChip
                                v-if="store.activeShipmentOf(row)?.isManual"
                                tone="gray"
                                size="sm"
                                :dot="false"
                            >
                                {{ t('deliveries.manual') }}
                            </AChip>
                        </template>
                    </ADataTable>
                </div>
            </template>

            <!-- self pickup -->
            <ADataTable
                v-else-if="state.tab === 'pickup'"
                :cols="pickupCols"
                :rows="pickupRows"
                row-key="id"
                :selected="state.order"
                @row="state.order = $event.id"
            >
                <template #cell-order="{ row }">{{ row.id }}</template>
                <template #cell-payer="{ row }">
                    {{
                        loc(
                            row.payer === 'patient'
                                ? row.patient.name
                                : row.practitioner.name,
                        )
                    }}
                </template>
                <template #cell-phone="{ row }"
                    ><ANum>{{ row.recipientPhone }}</ANum></template
                >
                <template #cell-readySince="{ row }">
                    <ANum>{{ ageText(row) }}</ANum>
                </template>
                <template #cell-act="{ row }">
                    <div class="a-rowbtns" @click.stop>
                        <AButton
                            sm
                            kind="p"
                            icon="check"
                            @click="onMarkCollected(row)"
                        >
                            {{ t('deliveries.action.markCollected') }}
                        </AButton>
                    </div>
                </template>
                <template #empty>
                    <AEmpty
                        icon="map_pin"
                        :title="t('deliveries.empty.title')"
                    />
                </template>
            </ADataTable>

            <!-- shipped -->
            <template v-else-if="state.tab === 'shipped'">
                <div class="dv-shipped-filters">
                    <DateRangeBar v-model="shippedRange" />
                    <ASelect
                        v-model="state.shippedCourier"
                        :options="courierFilterOptions"
                        class="dv-courier-filter"
                    />
                </div>
                <ADataTable
                    :cols="shippedCols"
                    :rows="shippedRows"
                    row-key="id"
                    :selected="state.order"
                    @row="state.order = $event.id"
                >
                    <template #cell-order="{ row }">{{ row.id }}</template>
                    <template #cell-recipient="{ row }">{{
                        loc(row.patient.name)
                    }}</template>
                    <template #cell-city="{ row }">{{
                        loc(row.address?.city)
                    }}</template>
                    <template #cell-courier="{ row }">
                        {{
                            row.courier
                                ? courierName(row.courier)
                                : t('deliveries.ship.pickup')
                        }}
                    </template>
                    <template #cell-tracking="{ row }"
                        ><ANum>{{ row.tracking }}</ANum></template
                    >
                    <template #cell-packages="{ row }"
                        ><ANum>{{ row.packagesCount || 1 }}</ANum></template
                    >
                    <template #cell-handedAt="{ row }">
                        <ANum>{{
                            (row.shippedAt || row.collectedAt)?.stamp
                        }}</ANum>
                    </template>
                    <template #cell-by="{ row }">
                        {{
                            loc(
                                store.handedShipmentOf(row)?.handedBy ||
                                    row.collectedBy,
                            )
                        }}
                    </template>
                    <template #empty>
                        <AEmpty
                            icon="check"
                            :title="t('deliveries.empty.title')"
                        />
                    </template>
                </ADataTable>
            </template>

            <!-- courier companies -->
            <CourierSettingsTab v-else-if="state.tab === 'couriers'" />
        </template>

        <!-- StationOrderCard owns its own ADrawer (header, win-bar, scrim). -->
        <StationOrderCard :order="openOrder" @close="state.order = ''" />

        <PickupListModal
            :open="pickupListModal.open"
            :courier-code="pickupListModal.code"
            :orders="pickupListModal.orders"
            @close="pickupListModal.open = false"
        />

        <CollectModal
            :open="collectModal.open"
            :order="collectModal.order"
            @close="collectModal.open = false"
        />

        <FilterDrawer
            v-if="state.tab !== 'couriers'"
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
            :rows="currentTabRows"
            :result-count="filters.rows.length"
            @close="drawerOpen = false"
            @clear="filters.clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />
    </div>
</template>

<style scoped>
.dv-kpis {
    margin-bottom: 14px;
}

.dv-kpi-sub {
    margin-inline-end: 10px;
}

.dv-scan {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
}

.dv-scan-input {
    max-width: 320px;
    font-size: 17px;
}

.dv-scan-result {
    font-weight: 600;
}

.dv-scan-result.is-ok {
    color: var(--a-green, #1f8a4c);
}

.dv-scan-result.is-warn {
    color: var(--a-amber, #b9770e);
}

.dv-scan-result.is-error {
    color: var(--a-red);
}

.dv-search {
    width: 320px;
    flex: none;
}

.dv-group {
    margin-bottom: 20px;
}

.dv-group-h {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.dv-group-a {
    margin-inline-start: auto;
}

.dv-shipped-filters {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
}

.dv-courier-filter {
    max-width: 220px;
}

/* Every container marked: the order is ready to move on. */
.dv-done {
    color: var(--a-green);
    font-weight: 700;
}

:deep(tr.dv-ready > td) {
    background: var(--a-green-bg, #e8f5ec);
}
</style>
