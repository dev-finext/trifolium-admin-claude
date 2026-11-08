<script setup>
// "חברות משלוחים" — every courier the pharmacy could ship with, and the
// operational settings the station itself edits: active, default, contact
// details, last pickup time (SHIPPING_STATION_SPEC.md §5.6). The connection
// itself ("מחובר" / "אין חיבור") is not editable here — it follows whether a
// real driver exists for the company (config/org.js COURIERS `hasApi`), which
// is a developer's job to add, not an agent's to toggle.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import { useToast } from '@/composables/useToast';
import { COURIER } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';

const { t } = useI18n();
const { push } = useToast();
const store = useDeliveriesStore();

const rows = computed(() => store.courierSettings);

const connected = (code) => Boolean(COURIER[code]?.hasApi);

async function setActive(row, on) {
    if (on && !connected(row.code)) {
        push({
            title: t('deliveries.courierTab.noConnection'),
            body: t(`courier.${row.code}`),
            bad: true,
        });

        return;
    }

    try {
        await store.updateCourierSettings(row.code, { isActive: on });
    } catch {
        push({
            title: t('deliveries.courierTab.hasWaiting', {
                n: store.awaitingCountFor(row.code),
            }),
            body: t(`courier.${row.code}`),
            bad: true,
        });
    }
}

function setDefault(row) {
    if (!row.isActive) {
        return;
    }

    store.updateCourierSettings(row.code, { isDefault: true });
}

function setField(row, field, value) {
    store.updateCourierSettings(row.code, { [field]: value });
}
</script>

<template>
    <ACard :title="t('deliveries.courierTab.title')" icon="truck" :pad="false">
        <table class="a-table ct-table">
            <thead>
                <tr>
                    <th scope="col">
                        {{ t('deliveries.courierTab.col.name') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('deliveries.courierTab.col.connection') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('deliveries.courierTab.col.active') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('deliveries.courierTab.col.default') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.courierTab.col.phone') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.courierTab.col.contact') }}
                    </th>
                    <th scope="col" class="nowrap">
                        {{ t('deliveries.courierTab.col.lastPickup') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.courierTab.col.notes') }}
                    </th>
                    <th scope="col">
                        {{ t('deliveries.courierTab.col.lastResult') }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows" :key="row.code">
                    <td class="t-strong">{{ t(`courier.${row.code}`) }}</td>
                    <td class="nowrap">
                        <AChip
                            :tone="connected(row.code) ? 'green' : 'gray'"
                            size="sm"
                            :dot="false"
                        >
                            {{
                                connected(row.code)
                                    ? t('deliveries.courierTab.connected')
                                    : t('deliveries.courierTab.notConnected')
                            }}
                        </AChip>
                    </td>
                    <td class="nowrap">
                        <input
                            type="checkbox"
                            :checked="row.isActive"
                            :disabled="!connected(row.code) && !row.isActive"
                            @change="setActive(row, $event.target.checked)"
                        />
                    </td>
                    <td class="nowrap">
                        <input
                            type="radio"
                            name="ct-default"
                            :checked="row.isDefault"
                            :disabled="!row.isActive"
                            @change="setDefault(row)"
                        />
                    </td>
                    <td>
                        <input
                            class="a-input ct-input"
                            :value="row.phone"
                            @change="
                                setField(row, 'phone', $event.target.value)
                            "
                        />
                    </td>
                    <td>
                        <input
                            class="a-input ct-input"
                            :value="row.contactName"
                            @change="
                                setField(
                                    row,
                                    'contactName',
                                    $event.target.value,
                                )
                            "
                        />
                    </td>
                    <td class="nowrap">
                        <input
                            class="a-input a-ltr-input ct-time"
                            type="time"
                            :value="row.lastPickupTime"
                            @change="
                                setField(
                                    row,
                                    'lastPickupTime',
                                    $event.target.value,
                                )
                            "
                        />
                    </td>
                    <td>
                        <input
                            class="a-input ct-input"
                            :value="row.notes"
                            @change="
                                setField(row, 'notes', $event.target.value)
                            "
                        />
                    </td>
                    <td class="nowrap">
                        <span v-if="row.lastSuccessAt" class="t-sub">
                            {{
                                t('deliveries.courierTab.lastSuccess', {
                                    stamp: row.lastSuccessAt.stamp,
                                })
                            }}
                        </span>
                        <span v-if="row.lastError" class="t-sub ct-err">
                            {{ row.lastError }}
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </ACard>
</template>

<style scoped>
.ct-table {
    min-width: 960px;
}

.ct-input {
    width: 100%;
    min-width: 110px;
}

.ct-time {
    width: 90px;
}

.ct-err {
    display: block;
    color: var(--a-red);
}
</style>
