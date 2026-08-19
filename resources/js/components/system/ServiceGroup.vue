<script setup>
// One external system on the health board: its header, then one row per endpoint
// it serves.
//
// Every cell is a stored field. The response time is the figure the last recorded
// check returned — an endpoint that did not answer shows that it did not answer
// rather than a number, and the outage length is measured from the `downAt`
// stamp on the record, not from a timer in the browser.
import { useI18n } from 'vue-i18n';

import ServiceState from '@/components/system/ServiceState.vue';
import AChip from '@/components/ui/AChip.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { durationParts, now } from '@/lib/dates';
import { num, pct } from '@/lib/money';

const props = defineProps({
    /** `{ key, sys, icon, services, state }` from groupServices(). */
    group: { type: Object, required: true },
    /** `{ ok: { tone }, … }` — the tone per state, from the data layer. */
    states: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
const { loc } = useLocalized();

const tone = (state) => props.states[state]?.tone || 'gray';

/** How long an endpoint has been down, from the stamp on its record. */
function downFor(service) {
    if (!service.downAt) {
        return '';
    }

    const parts = durationParts(now().getTime() - service.downAt.getTime());

    return t('integrations.row.downFor', {
        duration: t(`duration.${parts.unit}`, { a: parts.a, b: parts.b }),
    });
}
</script>

<template>
    <div class="a-svcgrp">
        <div class="a-svcgrp-t">
            <AIcon :name="group.icon" :size="18" />
            <span class="a-svcgrp-n">{{ loc(group.sys) }}</span>
            <AChip :tone="tone(group.state)" size="sm">
                {{ t(`integrations.state.${group.state}`) }}
            </AChip>
            <span class="a-svcgrp-s">
                {{ t('integrations.row.endpoints', group.services.length) }}
            </span>
        </div>

        <div
            v-for="service in group.services"
            :key="service.id"
            class="a-svc"
            :class="{ 'is-down': service.state === 'down' }"
        >
            <div>
                <div class="t-strong">{{ loc(service.label) }}</div>
                <div class="t-sub ltr">{{ service.ep }}</div>
                <div v-if="service.err" class="a-svc-err">
                    {{ loc(service.err) }}
                </div>
            </div>

            <div>
                <ServiceState :state="service.state" />
                <div v-if="service.downAt" class="t-sub svc-down">
                    {{ downFor(service) }}
                </div>
            </div>

            <div>
                <span v-if="service.ms == null" class="svc-none">
                    {{ t('integrations.row.noResponse') }}
                </span>
                <span
                    v-else
                    class="a-svc-ms"
                    :class="{ 'is-slow': service.state === 'slow' }"
                >
                    <ANum>{{ num(service.ms) }} ms</ANum>
                </span>
            </div>

            <div>
                <ANum v-if="service.last">{{ service.last }}</ANum>
                <span v-else class="svc-dim">
                    {{ t('integrations.row.noReading') }}
                </span>
            </div>

            <div>
                <ANum v-if="service.uptime != null">
                    {{ pct(service.uptime, 2) }}
                </ANum>
                <span v-else class="svc-dim">—</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.svc-down {
    margin-top: 4px;
    color: var(--a-red);
}

.svc-none {
    color: var(--a-red);
    font-weight: 600;
}

.svc-dim {
    color: var(--a-ink-4);
}
</style>
