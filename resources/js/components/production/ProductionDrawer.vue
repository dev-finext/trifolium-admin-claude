<script setup>
// One production order: where it stands, what it makes, what it draws from
// which batches, and what came out. The buttons follow the state — a planned
// run can be issued or cancelled, an issued run completed or cancelled, a
// finished one only read and printed.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { PRODUCTION_STATE } from '@/config';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The order, or null while the drawer is closed. */
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'issue', 'complete', 'cancel']);

const { t } = useI18n();
const { loc } = useLocalized();
const items = useItemsStore();
const inventory = useInventoryStore();

/** The three states a run passes through, in order, for the rail. */
const RAIL = ['planned', 'issued', 'completed'];

const prepName = computed(() => {
    const type = props.order ? items.prepTypeById(props.order.prepType) : null;

    return type ? loc(type.name) : props.order?.prepType || '';
});

const railIndex = computed(() => RAIL.indexOf(props.order?.state));

const batchExpiry = (id) => inventory.batchById(id)?.expiry || null;

const details = computed(() => {
    if (!props.order) {
        return [];
    }

    const order = props.order;
    const rows = [
        [
            t('production.drawer.planned'),
            `${num(order.plannedQty)} ${order.uom}`,
        ],
        [
            t('production.drawer.recipe'),
            `${order.bomId} · v${order.bomVersion}`,
        ],
        [t('production.drawer.created'), order.createdOn?.stamp],
    ];

    if (order.issuedOn) {
        rows.push([t('production.drawer.issuedOn'), order.issuedOn.stamp]);
    }

    if (order.state === 'completed') {
        rows.push(
            [t('production.drawer.completedOn'), order.completedOn?.stamp],
            [
                t('production.drawer.yield'),
                `${num(order.yieldQty)} ${order.uom}`,
            ],
            [
                t('production.drawer.waste'),
                order.wasteQty
                    ? `${num(order.wasteQty)} ${order.uom}`
                    : t('production.drawer.noWaste'),
            ],
            [t('production.drawer.expiry'), fmtISO(order.expiresOn)],
            [
                t('production.drawer.cost'),
                order.cost
                    ? t('production.drawer.costValue', {
                          total: ils(order.cost.components, 2),
                          unit: ils(order.cost.perUnit ?? 0, 2),
                          uom: order.uom,
                      })
                    : '—',
            ],
        );
    }

    if (order.state === 'cancelled') {
        rows.push(
            [t('production.drawer.cancelledOn'), order.cancelledOn?.stamp],
            [t('production.drawer.reason'), loc(order.reason) || '—'],
        );
    }

    return rows;
});

function print() {
    window.print();
}
</script>

<template>
    <ADrawer :open="Boolean(order)" @close="emit('close')">
        <template v-if="order">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                <span class="a-code a-tag">{{ order.id }}</span>
                                {{ loc(order.name) }}
                            </h2>
                            <AChip
                                :tone="
                                    PRODUCTION_STATE[order.state]?.tone ||
                                    'gray'
                                "
                            >
                                {{ t(`production.state.${order.state}`) }}
                            </AChip>
                            <AChip tone="gray" :dot="false">{{
                                prepName
                            }}</AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span class="num">{{ order.parentSku }}</span>
                            <span>{{
                                t('production.drawer.by', {
                                    name: loc(order.by),
                                })
                            }}</span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            v-if="order.state === 'planned'"
                            kind="p"
                            sm
                            icon="check"
                            @click="emit('issue', order)"
                        >
                            {{ t('production.action.issue') }}
                        </AButton>
                        <AButton
                            v-if="order.state === 'issued'"
                            kind="p"
                            sm
                            icon="check"
                            @click="emit('complete', order)"
                        >
                            {{ t('production.action.complete') }}
                        </AButton>
                        <AButton sm icon="printer" @click="print">
                            {{ t('production.action.print') }}
                        </AButton>
                        <AButton
                            v-if="['planned', 'issued'].includes(order.state)"
                            sm
                            kind="ghost"
                            icon="x"
                            @click="emit('cancel', order)"
                        >
                            {{ t('production.action.cancel') }}
                        </AButton>
                    </div>
                </div>

                <ol
                    v-if="order.state !== 'cancelled'"
                    class="pd-rail"
                    :aria-label="t('production.drawer.railAria')"
                >
                    <li
                        v-for="(step, i) in RAIL"
                        :key="step"
                        class="pd-step"
                        :class="{
                            'is-done': i < railIndex,
                            'is-on': i === railIndex,
                        }"
                    >
                        <span class="pd-dot" />
                        <span>{{ t(`production.state.${step}`) }}</span>
                    </li>
                </ol>
            </div>

            <div class="a-dbody pd-grid">
                <ACard :title="t('production.drawer.details')" icon="file_text">
                    <AKeyValue :rows="details" />
                    <div v-if="order.notes" class="a-note a-note--info pd-note">
                        {{ loc(order.notes) }}
                    </div>
                </ACard>

                <ACard
                    :title="t('production.drawer.components')"
                    icon="layers"
                    class="span2"
                    :pad="false"
                >
                    <table class="a-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    {{ t('production.drawer.compItem') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.compPlanned') }}
                                </th>
                                <th scope="col">
                                    {{ t('production.drawer.compPicks') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.compActual') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="component in order.components"
                                :key="component.sku"
                            >
                                <td>
                                    <div class="t-strong">
                                        {{ loc(component.name) }}
                                    </div>
                                    <div class="t-sub num">
                                        {{ component.sku }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <ANum>{{ num(component.plannedQty) }}</ANum>
                                    {{ component.uom }}
                                    <AChip
                                        v-if="component.issue === 'manual'"
                                        tone="gray"
                                        size="sm"
                                        :dot="false"
                                        class="pd-gap"
                                    >
                                        {{ t('items.bom.issue.manual') }}
                                    </AChip>
                                </td>
                                <td>
                                    <div
                                        v-for="pick in component.picks"
                                        :key="pick.batch"
                                        class="pd-pick"
                                    >
                                        <span class="a-code a-tag">{{
                                            inventory.batchNo(pick.batch)
                                        }}</span>
                                        <ANum>{{ num(pick.qty, 2) }}</ANum>
                                        {{ component.stockUnit }}
                                        <span
                                            v-if="batchExpiry(pick.batch)"
                                            class="t-sub"
                                        >
                                            ·
                                            {{
                                                fmtISO(batchExpiry(pick.batch))
                                            }}
                                        </span>
                                    </div>
                                    <div
                                        v-if="!component.picks.length"
                                        class="t-sub"
                                    >
                                        {{ t('production.drawer.noBatch') }}
                                    </div>
                                    <div
                                        v-if="component.short"
                                        class="pd-short"
                                    >
                                        {{
                                            t('production.drawer.short', {
                                                qty: num(component.short, 2),
                                                uom: component.stockUnit,
                                            })
                                        }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <template
                                        v-if="component.actualQty != null"
                                    >
                                        <ANum>{{
                                            num(component.actualQty)
                                        }}</ANum>
                                        {{ component.uom }}
                                    </template>
                                    <span v-else class="t-sub">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ACard>

                <ACard
                    v-if="order.state === 'completed'"
                    :title="t('production.drawer.output')"
                    icon="package"
                >
                    <AKeyValue
                        :rows="[
                            [
                                t('production.drawer.outputBatch'),
                                order.outputBatch,
                            ],
                            [
                                t('production.drawer.wasteBatch'),
                                order.wasteBatch ||
                                    t('production.drawer.noWaste'),
                            ],
                            [
                                t('production.drawer.expiry'),
                                fmtISO(order.expiresOn),
                            ],
                        ]"
                    />
                </ACard>
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.pd-rail {
    display: flex;
    gap: 22px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--a-ink-4);
}

.pd-step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.pd-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--a-line-2);
    background: transparent;
}

.pd-step.is-done .pd-dot {
    background: var(--a-line-2);
    border-color: var(--a-line-2);
}

.pd-step.is-on {
    color: var(--a-ink);
    font-weight: 600;
}

.pd-step.is-on .pd-dot {
    background: var(--a-green, var(--a-ink-2));
    border-color: var(--a-green, var(--a-ink-2));
}

.pd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
}

.span2 {
    grid-column: 1 / -1;
}

.pd-note {
    margin-top: 10px;
}

.pd-pick {
    display: flex;
    gap: 6px;
    align-items: baseline;
    flex-wrap: wrap;
}

.pd-pick + .pd-pick {
    margin-top: 4px;
}

.pd-short {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--a-red);
}

.pd-gap {
    margin-inline-start: 6px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
