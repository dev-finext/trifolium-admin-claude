<script setup>
// The queue's filter row: free-text search and the six selects that narrow the
// table. Every option carries a live count, scoped to the date range the screen
// holds, so the reader can see where the work is before clicking.
//
// The screen owns the filter state, because it lives in the URL. This component
// never writes to the object it was handed — it reports what the reader changed
// through `update:filters` and lets the screen put it in the query string.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AInput from '@/components/ui/AInput.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { COURIERS, FULFILMENT_IDS, ORDER_STATUSES } from '@/config';
import { DELIVERY_STAGES, DESK_STATUS_IDS } from '@/stores/deliveries';

const props = defineProps({
    /** The screen's filter state: stage, status, type, courier, city, tracking, q. */
    filters: { type: Object, required: true },
    /** How many rows survived the filters — the count the bar reports. */
    shown: { type: Number, default: 0 },
    /** `{ inRange, stage, status, courier, city }` — counted inside the date range. */
    counts: { type: Object, default: () => ({}) },
    /** `[{ value, label }]` destination cities present in the data. */
    cities: { type: Array, default: () => [] },
    dirty: { type: Boolean, default: false },
});

const emit = defineEmits(['update:filters', 'clear']);

const { t } = useI18n();
const { courierName } = useCourierName();

/** One filter changed: hand the screen a patch, never a mutation. */
function set(key, value) {
    emit('update:filters', { [key]: value });
}

const count = (group, key) => props.counts[group]?.[key] || 0;

const withCount = (label, n) => t('deliveries.filter.option', { label, n });

const stageOptions = computed(() =>
    DELIVERY_STAGES.filter((stage) => stage.id !== 'all').map((stage) => ({
        id: stage.id,
        label: withCount(
            t(`deliveries.stage.${stage.id}`),
            count('stage', stage.id),
        ),
    })),
);

const statusOptions = computed(() =>
    ORDER_STATUSES.filter((status) => DESK_STATUS_IDS.includes(status.id)).map(
        (status) => ({
            id: status.id,
            label: withCount(
                t(`status.${status.id}`),
                count('status', status.id),
            ),
        }),
    ),
);

const typeOptions = computed(() =>
    FULFILMENT_IDS.map((id) => ({ id, label: t(`fulfilment.${id}`) })),
);

const courierOptions = computed(() =>
    COURIERS.map((courier) => ({
        id: courier.id,
        label: withCount(courierName(courier.id), count('courier', courier.id)),
    })),
);

const cityOptions = computed(() =>
    props.cities.map((city) => ({
        value: city.value,
        label: withCount(city.label, count('city', city.value)),
    })),
);
</script>

<template>
    <FilterBar
        :count="shown"
        :label="t('deliveries.count', { n: counts.inRange || 0 })"
        :dirty="dirty"
        @clear="emit('clear')"
    >
        <AInput
            class="q"
            :model-value="filters.q"
            :aria-label="t('deliveries.filter.search')"
            :placeholder="t('deliveries.filter.searchPlaceholder')"
            @update:model-value="set('q', $event)"
        />
        <ASelect
            :model-value="filters.stage"
            :aria-label="t('deliveries.filter.stage')"
            @update:model-value="set('stage', $event)"
        >
            <option value="all">{{ t('deliveries.filter.stageAll') }}</option>
            <option
                v-for="option in stageOptions"
                :key="option.id"
                :value="option.id"
            >
                {{ option.label }}
            </option>
        </ASelect>
        <ASelect
            :model-value="filters.status"
            :aria-label="t('deliveries.filter.status')"
            @update:model-value="set('status', $event)"
        >
            <option value="">{{ t('deliveries.filter.statusAll') }}</option>
            <option
                v-for="option in statusOptions"
                :key="option.id"
                :value="option.id"
            >
                {{ option.label }}
            </option>
        </ASelect>
        <ASelect
            :model-value="filters.type"
            :aria-label="t('deliveries.filter.type')"
            @update:model-value="set('type', $event)"
        >
            <option value="">{{ t('deliveries.filter.typeAll') }}</option>
            <option
                v-for="option in typeOptions"
                :key="option.id"
                :value="option.id"
            >
                {{ option.label }}
            </option>
        </ASelect>
        <ASelect
            :model-value="filters.courier"
            :aria-label="t('deliveries.filter.courier')"
            @update:model-value="set('courier', $event)"
        >
            <option value="">{{ t('deliveries.filter.courierAll') }}</option>
            <option
                v-for="option in courierOptions"
                :key="option.id"
                :value="option.id"
            >
                {{ option.label }}
            </option>
        </ASelect>
        <ASelect
            :model-value="filters.tracking"
            :aria-label="t('deliveries.filter.tracking')"
            @update:model-value="set('tracking', $event)"
        >
            <option value="">{{ t('deliveries.filter.trackingAll') }}</option>
            <option value="yes">
                {{ t('deliveries.filter.trackingYes') }}
            </option>
            <option value="no">{{ t('deliveries.filter.trackingNo') }}</option>
        </ASelect>
        <ASelect
            :model-value="filters.city"
            :aria-label="t('deliveries.filter.city')"
            @update:model-value="set('city', $event)"
        >
            <option value="">{{ t('deliveries.filter.cityAll') }}</option>
            <option
                v-for="option in cityOptions"
                :key="option.value"
                :value="option.value"
            >
                {{ option.label }}
            </option>
        </ASelect>
    </FilterBar>
</template>

<style scoped>
.q {
    width: 320px;
    max-width: 100%;
}
</style>
