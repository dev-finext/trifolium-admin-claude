<script setup>
// The four figures above the health board. Three of them are also the board's
// state filter: click "2 down" and the board shows those two.
//
// Every number is a count of records. Nothing here is a running total and
// nothing moves on its own.
import { useI18n } from 'vue-i18n';

import ServiceLight from '@/components/system/ServiceLight.vue';
import AKpi from '@/components/ui/AKpi.vue';
import ANum from '@/components/ui/ANum.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import { num } from '@/lib/money';

defineProps({
    /** `{ ok, slow, down, endpoints, systems }` from the store. */
    counts: { type: Object, required: true },
    /** The state ids the data layer defines, in its own order. */
    stateIds: { type: Array, default: () => [] },
    /** The state the board is filtered to, or `''`. */
    active: { type: String, default: '' },
});

const emit = defineEmits(['state']);

const { t } = useI18n();
</script>

<template>
    <div class="a-kpis">
        <AKpi icon="db" :label="t('integrations.summary.systems')">
            <template #value>
                <ANum>{{ num(counts.systems) }}</ANum>
            </template>
            <template #sub>
                {{
                    t('integrations.summary.systemsSub', {
                        n: num(counts.endpoints),
                    })
                }}
            </template>
        </AKpi>

        <FilterKpi
            v-for="id in stateIds"
            :key="id"
            :label="t(`integrations.summary.${id}`)"
            :active="active === id"
            @click="emit('state', active === id ? '' : id)"
        >
            <template #value>
                <ANum>{{ num(counts[id] || 0) }}</ANum>
            </template>
            <template #sub>
                <span class="sum-sub">
                    <ServiceLight :state="id" />
                    {{
                        t('integrations.summary.ofTotal', {
                            n: num(counts.endpoints),
                        })
                    }}
                </span>
            </template>
        </FilterKpi>
    </div>
</template>

<style scoped>
.sum-sub {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}
</style>
