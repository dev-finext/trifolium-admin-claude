// Production: the orders that turn a bill of materials into a batch of the
// parent item. Second-version material.
//
// The four moves of a run and what each does to stock:
//   create   — the recipe is scaled to the planned quantity and a FEFO plan
//              is drawn for every component; nothing moves yet.
//   issue    — the plan is reserved: each component's stock row shows the
//              quantity as committed, so the buyer sees it before it leaves.
//   complete — the components leave their batches, the parent gets a new
//              `P-` batch with the recipe's shelf life, what came out as waste
//              gets a `W-` batch beside it, and the cost of the run is the
//              cost of what went in.
//   cancel   — the reservation is released.
//
// Every mutation is optimistic and calls persist(), a no-op against the fixture.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    PRODUCTION_MOVE_KINDS,
    PRODUCTION_OPEN_STATE_IDS,
    PRODUCTION_SERIES,
    resolveExpiryMonths,
} from '@/config/production';
import { persist } from '@/data/source';
import { componentUnitCost, toStockUnits } from '@/demo/production';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const round2 = (value) => Math.round(value * 100) / 100;

/** This moment, in the shape every record's `when` field carries. */
function moment(iso = null) {
    const at = iso || isoDaysAgo(0);
    const time = hm(now());

    return {
        daysAgo: daysSince(at),
        iso: at,
        time,
        stamp: iso ? `${fmtISO(iso)} ${time}` : stamp(0),
    };
}

/** The highest trailing number in a set of ids, plus one. */
function nextSerial(ids, series) {
    const highest = ids.reduce((top, id) => {
        const digits = String(id).match(/(\d+)\s*$/);

        return digits ? Math.max(top, Number(digits[1])) : top;
    }, 0);

    return `${series}${highest + 1}`;
}

export const useProductionStore = defineStore('production', () => {
    const dataset = useDatasetStore();
    const inventory = useInventoryStore();
    const items = useItemsStore();

    const orders = computed(() =>
        Array.isArray(dataset.data.productionOrders)
            ? dataset.data.productionOrders
            : [],
    );

    const openOrders = computed(() =>
        orders.value.filter((order) =>
            PRODUCTION_OPEN_STATE_IDS.includes(order.state),
        ),
    );

    const orderById = (id) =>
        orders.value.find((order) => order.id === id) || null;

    /** Runs of one parent item, newest first. */
    const ordersOf = (sku) =>
        orders.value.filter((order) => order.parentSku === sku);

    /** Runs a batch of a component went into — the forward trace. */
    const ordersUsingBatch = (batchId) =>
        orders.value.filter((order) =>
            order.components.some((component) =>
                component.picks.some((pick) => pick.batch === batchId),
            ),
        );

    /** The last unit cost a run of this item came out at. */
    const lastUnitCost = (sku) =>
        ordersOf(sku).find((order) => order.state === 'completed')?.cost
            ?.perUnit ?? null;

    /**
     * How many full runs of a recipe the components on hand allow — the
     * smallest ratio of available stock to what one run needs.
     */
    const canProduce = (bom) => {
        if (!bom?.components?.length) {
            return 0;
        }

        return Math.floor(
            Math.min(
                ...bom.components.map((component) => {
                    const row = inventory.itemBySku(component.sku);

                    if (!row || !component.qty) {
                        return 0;
                    }

                    const need = toStockUnits(
                        component.qty,
                        component.uom,
                        row.unit,
                    );

                    return need > 0 ? row.avail / need : 0;
                }),
            ),
        );
    };

    /**
     * Scale a recipe to a planned quantity and draw the FEFO plan for each
     * component. Waste batches are drawn only when the recipe's preparation
     * type accepts waste.
     */
    function planComponents(bom, plannedQty) {
        const runs = plannedQty / (bom.yield?.qty || 1);
        const prepType = items.prepTypeById(bom.prepType);
        const allowWaste = Boolean(prepType?.acceptsWaste);

        return bom.components.map((component) => {
            const row = inventory.itemBySku(component.sku);
            const planned = round2(component.qty * runs);
            const inStock = toStockUnits(planned, component.uom, row?.unit);
            const picks = [];
            let left = inStock;

            inventory
                .openBatchesOf(component.sku, { allowWaste })
                .forEach((batch) => {
                    if (left <= 0) {
                        return;
                    }

                    const take = Math.min(batch.remaining, left);

                    picks.push({ batch: batch.id, qty: round2(take) });
                    left = round2(left - take);
                });

            return {
                sku: component.sku,
                name: row ? row.name : component.sku,
                plannedQty: planned,
                uom: component.uom,
                stockUnit: row?.unit || component.uom,
                issue: component.issue,
                picks,
                short: left > 0 ? round2(left) : 0,
                actualQty: null,
            };
        });
    }

    function bag(name) {
        if (!Array.isArray(dataset.data[name])) {
            dataset.data[name] = [];
        }

        return dataset.data[name];
    }

    function writeLog(row) {
        const log = bag('log');

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    /** Move a component's reservation on or off its stock row. */
    function reserve(order, sign) {
        order.components.forEach((component) => {
            const row = inventory.itemBySku(component.sku);

            if (row) {
                row.alloc = Math.max(
                    0,
                    round2(
                        row.alloc +
                            sign *
                                toStockUnits(
                                    component.plannedQty,
                                    component.uom,
                                    row.unit,
                                ),
                    ),
                );
                inventory.syncRow(row);
            }
        });
    }

    // ---- mutations -----------------------------------------------------------

    /**
     * Open a production order on a recipe.
     *
     * @param {{ bomId: string, plannedQty: number, notes?: string }} form
     */
    async function createOrder(form) {
        const bom = items.bomById(form.bomId);
        const plannedQty = Number(form.plannedQty) || 0;

        if (!bom || plannedQty <= 0) {
            throw new Error('A production order needs a recipe and a quantity');
        }

        const rows = bag('productionOrders');
        const order = {
            id: nextSerial(
                rows.map((row) => row.id),
                PRODUCTION_SERIES,
            ),
            bomId: bom.id,
            bomVersion: bom.version || 1,
            parentSku: bom.parentSku,
            name: bom.name,
            prepType: bom.prepType,
            plannedQty,
            uom: bom.yield?.uom || 'unit',
            state: 'planned',
            components: planComponents(bom, plannedQty),
            yieldQty: null,
            wasteQty: null,
            outputBatch: null,
            wasteBatch: null,
            expiresOn: null,
            cost: null,
            by: dataset.me?.name || null,
            createdOn: moment(),
            issuedOn: null,
            completedOn: null,
            cancelledOn: null,
            reason: null,
            notes: form.notes?.trim() || null,
        };

        rows.unshift(order);
        writeLog({
            act: 'production_create',
            entType: 'production_order',
            ent: order.id,
            to: `${plannedQty} ${order.uom}`,
        });
        await persist('production-orders', order);

        return order;
    }

    /** Re-draw the FEFO plan of a planned order, or override one pick. */
    function setPick(orderId, sku, picks) {
        const order = orderById(orderId);
        const component = order?.components.find((row) => row.sku === sku);

        if (!component || order.state !== 'planned') {
            return;
        }

        component.picks = picks.map((pick) => ({
            batch: pick.batch,
            qty: round2(Number(pick.qty) || 0),
        }));
        component.short = round2(
            Math.max(
                0,
                toStockUnits(
                    component.plannedQty,
                    component.uom,
                    component.stockUnit,
                ) - component.picks.reduce((sum, pick) => sum + pick.qty, 0),
            ),
        );
    }

    /** Issue: the components are reserved and the sheet goes to the bench. */
    async function issueOrder(id) {
        const order = orderById(id);

        if (!order || order.state !== 'planned') {
            return null;
        }

        order.state = 'issued';
        order.issuedOn = moment();
        reserve(order, 1);
        writeLog({
            act: 'production_issue',
            entType: 'production_order',
            ent: order.id,
        });
        await persist(`production-orders/${id}/issue`, {});

        return order;
    }

    /**
     * Complete: what came out, what went to waste, when it expires.
     *
     * @param {{ yieldQty: number, wasteQty?: number, expiresOn?: string,
     *          actual?: Record<string, number>, note?: string }} form
     */
    async function completeOrder(id, form) {
        const order = orderById(id);

        if (!order || order.state !== 'issued') {
            return null;
        }

        const bom = items.bomById(order.bomId);
        const item = items.itemBySku(order.parentSku);
        const parent = inventory.itemBySku(order.parentSku);
        const yieldQty = round2(Number(form.yieldQty) || 0);
        const wasteQty = round2(Math.max(0, Number(form.wasteQty) || 0));
        const when = moment();
        const by = dataset.me?.name || null;
        const months = resolveExpiryMonths({
            item,
            prepType: items.prepTypeById(order.prepType),
            settings: dataset.data.inventorySettings,
        });
        const expiresOn = form.expiresOn || isoDaysAgo(-(months || 24) * 30);

        // Release the reservation, then take the real quantities out.
        reserve(order, -1);

        let cost = 0;

        order.components.forEach((component) => {
            const row = inventory.itemBySku(component.sku);
            const actual =
                component.issue === 'manual' && form.actual?.[component.sku]
                    ? round2(Number(form.actual[component.sku]))
                    : component.plannedQty;
            const unitCost = componentUnitCost(items.itemBySku(component.sku));

            component.actualQty = actual;

            component.picks.forEach((pick) => {
                const batch = inventory.batchById(pick.batch);

                if (!batch) {
                    return;
                }

                batch.remaining = Math.max(
                    0,
                    round2(batch.remaining - pick.qty),
                );
                inventory.syncBatch(batch);
                inventory.writeMovement({
                    id: `mv-prod-out-${order.id}-${batch.id}`,
                    kind: PRODUCTION_MOVE_KINDS.consume,
                    sku: component.sku,
                    name: batch.name,
                    unit: batch.unit,
                    wh: batch.wh,
                    qty: -pick.qty,
                    batch: batch.id,
                    ref: order.id,
                    when,
                    by,
                });
                cost += unitCost * pick.qty;
            });

            if (row) {
                row.onHand = Math.max(
                    0,
                    round2(
                        row.onHand -
                            toStockUnits(actual, component.uom, row.unit),
                    ),
                );
                inventory.syncRow(row);
            }
        });

        const stockUnit = parent?.unit || order.uom;
        const outputQty = round2(toStockUnits(yieldQty, order.uom, stockUnit));
        const output = inventory.openBatch({
            id: inventory.nextBatchIn('production'),
            sku: order.parentSku,
            name: parent ? parent.name : order.name,
            unit: stockUnit,
            wh: parent?.wh || 'raw',
            source: 'production',
            production: order.id,
            received: when,
            qty: outputQty,
            expiry: expiresOn,
            unitCost: outputQty ? round2(cost / outputQty) : null,
            components: order.components.flatMap((component) =>
                component.picks.map((pick) => ({
                    sku: component.sku,
                    batch: pick.batch,
                    qty: pick.qty,
                })),
            ),
            by,
        });

        inventory.writeMovement({
            id: `mv-prod-in-${output.id}`,
            kind: PRODUCTION_MOVE_KINDS.output,
            sku: order.parentSku,
            name: output.name,
            unit: stockUnit,
            wh: output.wh,
            qty: outputQty,
            batch: output.id,
            ref: order.id,
            when,
            by,
        });

        let waste = null;

        if (wasteQty > 0) {
            const wasteStock = round2(
                toStockUnits(wasteQty, order.uom, stockUnit),
            );

            waste = inventory.openBatch({
                id: inventory.nextBatchIn('waste'),
                sku: order.parentSku,
                name: output.name,
                unit: stockUnit,
                wh: output.wh,
                source: 'waste',
                production: order.id,
                received: when,
                qty: wasteStock,
                expiry: expiresOn,
                waste: true,
                by,
            });
            inventory.writeMovement({
                id: `mv-waste-in-${waste.id}`,
                kind: PRODUCTION_MOVE_KINDS.waste,
                sku: order.parentSku,
                name: output.name,
                unit: stockUnit,
                wh: output.wh,
                qty: wasteStock,
                batch: waste.id,
                ref: order.id,
                when,
                by,
            });
        }

        if (parent) {
            parent.onHand = round2(
                parent.onHand + outputQty + (waste ? waste.qty : 0),
            );
            inventory.syncRow(parent);
        }

        Object.assign(order, {
            state: 'completed',
            yieldQty,
            wasteQty,
            outputBatch: output.id,
            wasteBatch: waste ? waste.id : null,
            expiresOn,
            cost: {
                components: round2(cost),
                perUnit: yieldQty ? round2(cost / yieldQty) : null,
            },
            completedOn: when,
            notes: form.note?.trim() || order.notes,
        });

        writeLog({
            act: 'production_complete',
            entType: 'production_order',
            ent: order.id,
            to: `${output.id} · ${yieldQty} ${order.uom}`,
            note: bom ? null : 'recipe missing',
        });
        await persist(`production-orders/${id}/complete`, {
            yieldQty,
            wasteQty,
            expiresOn,
        });

        return order;
    }

    /** Cancel a planned or issued run; a reservation is released. */
    async function cancelOrder(id, reason = '') {
        const order = orderById(id);

        if (!order || !PRODUCTION_OPEN_STATE_IDS.includes(order.state)) {
            return null;
        }

        if (order.state === 'issued') {
            reserve(order, -1);
        }

        order.state = 'cancelled';
        order.cancelledOn = moment();
        order.reason = reason.trim() || null;
        writeLog({
            act: 'production_cancel',
            entType: 'production_order',
            ent: order.id,
            to: order.reason,
        });
        await persist(`production-orders/${id}/cancel`, { reason });

        return order;
    }

    return {
        orders,
        openOrders,
        orderById,
        ordersOf,
        ordersUsingBatch,
        lastUnitCost,
        canProduce,
        planComponents,
        createOrder,
        setPick,
        issueOrder,
        completeOrder,
        cancelOrder,
    };
});
