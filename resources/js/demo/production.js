// Production orders — the runs that turn a bill of materials into a batch of
// the parent item. Second-version fixture content.
//
// The fixture is self-consistent: a completed run has really consumed its
// components' batches, really opened a `P-` batch (and a `W-` waste batch)
// on the parent, and left the movements behind; an issued run has really
// reserved its components. What the screens add up is what happened.
import { PRODUCTION_SERIES } from '@/config/production';
import { at, fraction, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { daysSince, isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

const FIRST_ORDER_NUMBER = 2601;
const FIRST_BATCH_NUMBER = 2610;

/** The state mix the screens were designed against, one run per slot. */
const STATE_MIX = [
    'completed',
    'completed',
    'completed',
    'issued',
    'issued',
    'planned',
    'planned',
    'cancelled',
];

const OPERATORS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.hadarMizrahi,
    DEMO_ACTORS.amit,
];

const round2 = (value) => Math.round(value * 100) / 100;

/** A recipe quantity (g, ml) in the unit the stock row is counted in (kg, l). */
export function toStockUnits(qty, fromUom, stockUnit) {
    if (
        (fromUom === 'g' && stockUnit === 'kg') ||
        (fromUom === 'ml' && stockUnit === 'l')
    ) {
        return qty / 1000;
    }

    if (
        (fromUom === 'kg' && stockUnit === 'g') ||
        (fromUom === 'l' && stockUnit === 'ml')
    ) {
        return qty * 1000;
    }

    return qty;
}

/** Shekels per stock unit of a component, from what the pharmacy last paid. */
export function componentUnitCost(item) {
    const price = item?.price?.lastPurchase;

    if (price === null || price === undefined) {
        return 0;
    }

    const rate = { ILS: 1, EUR: 4, USD: 3.7 }[item.price.currency] || 1;

    return (price * rate) / (item.uom?.factor || 1);
}

/**
 * The FEFO plan for one component: which open, non-waste batches a quantity
 * (in stock units) is drawn from, nearest expiry first.
 */
function planPicks(batches, sku, qty) {
    const picks = [];
    let left = qty;

    batches
        .filter(
            (batch) =>
                batch.sku === sku &&
                batch.remaining > 0 &&
                !batch.waste &&
                batch.state !== 'rejected',
        )
        .sort((a, b) => a.daysToExp - b.daysToExp)
        .forEach((batch) => {
            if (left <= 0) {
                return;
            }

            const take = Math.min(batch.remaining, left);

            picks.push({ batch: batch.id, qty: round2(take) });
            left = round2(left - take);
        });

    return { picks, short: left > 0 ? round2(left) : 0 };
}

function syncRow(row) {
    row.avail = round2(row.onHand - row.alloc);
    row.low = row.avail < row.min;
}

/**
 * Build the production orders over the internal recipes, applying what the
 * completed and issued ones did to stock, batches and the ledger.
 *
 * @returns {{ orders: object[], movements: object[] }}
 */
export function buildProductionOrders({
    boms,
    items,
    stock,
    batches,
    prepTypes,
    settings,
}) {
    // The recipes that yield a production run rather than a single unit.
    const recipes = boms.filter((bom) => (bom.yield?.qty || 1) > 1);

    if (!recipes.length) {
        return { orders: [], movements: [] };
    }

    const itemBySku = new Map(items.map((item) => [item.sku, item]));
    const stockBySku = new Map(stock.map((row) => [row.sku, row]));
    const prepById = new Map(prepTypes.map((type) => [type.id, type]));
    const movements = [];
    let batchNo = FIRST_BATCH_NUMBER;

    const orders = STATE_MIX.map((state, i) => {
        const bom = recipes[i % recipes.length];
        const slot = `pr:${i}`;
        const id = `${PRODUCTION_SERIES}${FIRST_ORDER_NUMBER + i}`;
        const parent = stockBySku.get(bom.parentSku) || null;
        const item = itemBySku.get(bom.parentSku) || null;
        const runs = pickFrom(`${slot}:runs`, [1, 1, 2]);
        const plannedQty = bom.yield.qty * runs;
        const createdDays =
            state === 'completed'
                ? spread(`${slot}:d`, 20, 60)
                : state === 'cancelled'
                  ? spread(`${slot}:d`, 30, 50)
                  : spread(`${slot}:d`, 1, 9);
        const by = pickFrom(`${slot}:by`, OPERATORS);
        const stamp = (days) =>
            at(
                days,
                spread(`${slot}:hh:${days}`, 8, 15),
                spread(`${slot}:mm:${days}`, 0, 59),
            );

        const components = bom.components.map((component) => {
            const row = stockBySku.get(component.sku) || null;
            const planned = round2(component.qty * runs);
            const inStock = toStockUnits(planned, component.uom, row?.unit);
            const { picks, short } =
                state === 'planned' || state === 'cancelled'
                    ? { picks: [], short: 0 }
                    : planPicks(batches, component.sku, inStock);

            return {
                sku: component.sku,
                name: row ? row.name : L(component.sku, component.sku),
                plannedQty: planned,
                uom: component.uom,
                stockUnit: row?.unit || component.uom,
                issue: component.issue,
                picks,
                short,
                actualQty: state === 'completed' ? planned : null,
            };
        });

        const order = {
            id,
            bomId: bom.id,
            bomVersion: bom.version || 1,
            parentSku: bom.parentSku,
            name: bom.name,
            prepType: bom.prepType,
            plannedQty,
            uom: bom.yield.uom,
            state,
            components,
            yieldQty: null,
            wasteQty: null,
            outputBatch: null,
            wasteBatch: null,
            expiresOn: null,
            cost: null,
            by,
            createdOn: stamp(createdDays),
            issuedOn: null,
            completedOn: null,
            cancelledOn: null,
            reason: null,
            notes: bom.notes || null,
        };

        if (state === 'planned') {
            return order;
        }

        order.issuedOn = stamp(Math.max(1, createdDays - 1));

        if (state === 'cancelled') {
            order.cancelledOn = stamp(Math.max(1, createdDays - 3));
            order.reason = L(
                'הרכיב הראשי נגמר לפני הייצור',
                'The main component ran out before the run',
            );

            return order;
        }

        if (state === 'issued') {
            // Reserved: the components are spoken for until the run completes.
            components.forEach((component) => {
                const row = stockBySku.get(component.sku);

                if (row) {
                    row.alloc = round2(
                        row.alloc +
                            toStockUnits(
                                component.plannedQty,
                                component.uom,
                                row.unit,
                            ),
                    );
                    syncRow(row);
                }
            });

            return order;
        }

        // Completed: components out, the parent's batch in, waste beside it.
        const completedDays = Math.max(
            1,
            createdDays - spread(`${slot}:dur`, 2, 14),
        );
        const completedOn = stamp(completedDays);
        const wastePct = bom.expectedWastePct || 0;
        const yieldQty = round2(
            plannedQty *
                (1 - wastePct / 100) *
                (0.97 + fraction(`${slot}:yield`) * 0.03),
        );
        const wasteQty = wastePct ? round2(plannedQty - yieldQty) : 0;
        const months =
            item?.expiryMonths ||
            prepById.get(bom.prepType)?.expiryMonths ||
            settings?.defaultExpiryMonths?.[item?.family] ||
            24;
        const expiresOn = isoDaysAgo(completedDays - months * 30);
        let cost = 0;

        components.forEach((component) => {
            const row = stockBySku.get(component.sku);
            const unitCost = componentUnitCost(itemBySku.get(component.sku));

            component.picks.forEach((pick) => {
                const batch = batches.find((row) => row.id === pick.batch);

                if (!batch) {
                    return;
                }

                batch.remaining = round2(batch.remaining - pick.qty);

                if (batch.remaining <= 0) {
                    batch.remaining = 0;
                    batch.state = 'depleted';
                }

                movements.push({
                    id: `mv-prod-out-${id}-${batch.id}`,
                    kind: 'production_out',
                    sku: component.sku,
                    name: batch.name,
                    unit: batch.unit,
                    wh: batch.wh,
                    qty: -pick.qty,
                    batch: batch.id,
                    ref: id,
                    when: completedOn,
                    by,
                });
                cost += unitCost * pick.qty;
            });

            if (row) {
                row.onHand = Math.max(
                    0,
                    round2(
                        row.onHand -
                            toStockUnits(
                                component.actualQty,
                                component.uom,
                                row.unit,
                            ),
                    ),
                );
                syncRow(row);
            }
        });

        const stockUnit = parent?.unit || bom.yield.uom;
        const outputQty = round2(
            toStockUnits(yieldQty, bom.yield.uom, stockUnit),
        );
        const outputId = `${settings.batchSeries.production}${batchNo}`;
        const wasteId = wasteQty
            ? `${settings.batchSeries.waste}${batchNo}`
            : null;

        batchNo += 1;

        const opened = {
            id: outputId,
            sku: bom.parentSku,
            name: parent ? parent.name : bom.name,
            unit: stockUnit,
            wh: parent?.wh || 'raw',
            source: 'production',
            receipt: null,
            production: id,
            supplier: null,
            supplierBatch: null,
            received: completedOn,
            qty: outputQty,
            remaining: outputQty,
            expiry: expiresOn,
            daysToExp: -daysSince(expiresOn),
            state: 'active',
            waste: false,
            unitCost: outputQty ? round2(cost / outputQty) : null,
            components: components.flatMap((component) =>
                component.picks.map((pick) => ({
                    sku: component.sku,
                    batch: pick.batch,
                    qty: pick.qty,
                })),
            ),
            by,
        };

        batches.unshift(opened);
        movements.push({
            id: `mv-prod-in-${outputId}`,
            kind: 'production_in',
            sku: bom.parentSku,
            name: opened.name,
            unit: stockUnit,
            wh: opened.wh,
            qty: outputQty,
            batch: outputId,
            ref: id,
            when: completedOn,
            by,
        });

        if (wasteId) {
            const wasteStock = round2(
                toStockUnits(wasteQty, bom.yield.uom, stockUnit),
            );

            batches.unshift({
                ...opened,
                id: wasteId,
                source: 'waste',
                qty: wasteStock,
                remaining: wasteStock,
                waste: true,
                unitCost: null,
                components: null,
            });
            movements.push({
                id: `mv-waste-in-${wasteId}`,
                kind: 'waste_in',
                sku: bom.parentSku,
                name: opened.name,
                unit: stockUnit,
                wh: opened.wh,
                qty: wasteStock,
                batch: wasteId,
                ref: id,
                when: completedOn,
                by,
            });

            if (parent) {
                parent.onHand = round2(parent.onHand + wasteStock);
            }
        }

        if (parent) {
            parent.onHand = round2(parent.onHand + outputQty);
            syncRow(parent);
        }

        Object.assign(order, {
            yieldQty,
            wasteQty,
            outputBatch: outputId,
            wasteBatch: wasteId,
            expiresOn,
            cost: {
                components: round2(cost),
                perUnit: yieldQty ? round2(cost / yieldQty) : null,
            },
            completedOn,
        });

        return order;
    });

    return { orders, movements };
}
