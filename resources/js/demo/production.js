// Production orders — the runs that turn a bill of materials into a batch of
// the parent item. Second-version fixture content.
//
// The fixture is self-consistent: a completed run has really consumed its
// components' batches, really opened a `P-` batch (and a `W-` waste batch)
// on the parent, and left the movements behind; an issued run has really
// reserved its components. What the screens add up is what happened.
import { HOUSE_SERIES_NEXT, labelCount, labelPackOf } from '@/config/batches';
import { DEFAULT_WAREHOUSE } from '@/config/inventory';
import { familyOfCode, ITEM_FAMILY } from '@/config/items';
import { PRODUCTION_SERIES, productionDueDays } from '@/config/production';
import { at, fraction, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { addDays, addMonths, daysSince } from '@/lib/dates';
import { L } from '@/lib/localized';
import { convertQty } from '@/lib/units';

const FIRST_ORDER_NUMBER = 2601;
// Production batches number in each family's own series, above the serials
// the goods receipts have reached.
const FIRST_BATCH_NUMBER = 3001;

/**
 * The state mix the screens were designed against, one run per slot.
 *
 * `partial` is an issued run of which a first part has already come back into
 * stock and the rest is still at the bench — the internal-production note's
 * "קליטה חלקית למלאי ... ושאר ההוראה נשארת פתוחה".
 */
const STATE_MIX = [
    'completed',
    'completed',
    'completed',
    'partial',
    'issued',
    'issued',
    'planned',
    'planned',
    'cancelled',
];

/**
 * A note for one run only, in the shape the lab's own notes take — SAP order
 * 2601298 says "לסיים את הצמח, יש בערך 470 גרם" — keyed by the slot it is on.
 */
const LAB_NOTES = {
    4: (component) =>
        `לסיים את כל הצמח ${component.sku} — נשארו כ-470 גרם על המדף`,
    6: () => 'לא לסנן לפני שבועיים, גם אם נראה מוכן',
};

/**
 * Where a run with no target figure of its own got its date: typed by the
 * person who opened it, two weeks out. Only open runs carry one.
 */
const MANUAL_DUE_DAYS = 14;

const OPERATORS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.hadarMizrahi,
    DEMO_ACTORS.amit,
];

const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;

/**
 * A recipe quantity (g, ml) in the unit the stock row is counted in (kg, l).
 *
 * The ladder itself lives in `@/lib/units`. Units with no fixed ratio between
 * them — a jar and a millilitre — come back unchanged here, which is what the
 * production screens have always done with them.
 */
export function toStockUnits(qty, fromUom, stockUnit) {
    const converted = convertQty(qty, fromUom, stockUnit);

    return converted === null ? qty : converted;
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
 * Take a share of a run's components off their batches, in the order the plan
 * listed them, writing the movements and returning what was drawn. A share of
 * 1 empties whatever the plan set aside.
 */
function drawComponents({
    components,
    share,
    batches,
    stockBySku,
    unitCostOf,
    id,
    n,
    when,
    by,
    movements,
}) {
    const drew = [];
    let cost = 0;

    components.forEach((component) => {
        const row = stockBySku.get(component.sku) || null;
        const take = round2(component.plannedQty * share);
        let fromBatches =
            share >= 1
                ? Infinity
                : toStockUnits(take, component.uom, component.stockUnit);

        component.picks.forEach((pick) => {
            const open = round2(pick.qty - (pick.taken || 0));
            const qty = round2(Math.min(open, fromBatches));

            if (qty <= 0) {
                return;
            }

            fromBatches = round2(fromBatches - qty);
            pick.taken = round2((pick.taken || 0) + qty);

            const batch = batches.find((one) => one.id === pick.batch);

            if (!batch) {
                return;
            }

            batch.remaining = round2(batch.remaining - qty);

            if (batch.remaining <= 0) {
                batch.remaining = 0;
                batch.state = 'depleted';
            }

            movements.push({
                id: `mv-prod-out-${id}-${n}-${batch.id}`,
                kind: 'production_out',
                sku: component.sku,
                name: batch.name,
                unit: batch.unit,
                wh: batch.wh,
                qty: -qty,
                batch: batch.id,
                ref: id,
                when,
                by,
            });
            drew.push({ sku: component.sku, batch: batch.id, qty });
            cost += unitCostOf(component.sku) * qty;
        });

        component.consumedQty = round2((component.consumedQty || 0) + take);

        if (row) {
            row.onHand = Math.max(
                0,
                round2(
                    row.onHand - toStockUnits(take, component.uom, row.unit),
                ),
            );
            syncRow(row);
        }
    });

    return { drew, cost };
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
    const unitCostOf = (sku) => componentUnitCost(itemBySku.get(sku));
    const movements = [];
    let batchNo = FIRST_BATCH_NUMBER;
    let houseNo = 0;

    const orders = STATE_MIX.map((state, i) => {
        const bom = recipes[i % recipes.length];
        const slot = `pr:${i}`;
        const id = `${PRODUCTION_SERIES}${FIRST_ORDER_NUMBER + i}`;
        const parent = stockBySku.get(bom.parentSku) || null;
        const item = itemBySku.get(bom.parentSku) || null;
        const prepType = prepById.get(bom.prepType) || null;
        const runs = pickFrom(`${slot}:runs`, [1, 1, 2]);
        const plannedQty = bom.yield.qty * runs;
        const createdDays =
            state === 'completed'
                ? spread(`${slot}:d`, 20, 60)
                : state === 'cancelled'
                  ? spread(`${slot}:d`, 30, 50)
                  : state === 'partial'
                    ? spread(`${slot}:d`, 10, 18)
                    : spread(`${slot}:d`, 1, 9);
        const by = pickFrom(`${slot}:by`, OPERATORS);
        const stamp = (days) =>
            at(
                days,
                spread(`${slot}:hh:${days}`, 8, 15),
                spread(`${slot}:mm:${days}`, 0, 59),
            );
        const drawsStock = !['planned', 'cancelled'].includes(state);

        const components = bom.components.map((component) => {
            const row = stockBySku.get(component.sku) || null;
            const planned = round2(component.qty * runs);
            const inStock = toStockUnits(planned, component.uom, row?.unit);
            const { picks, short } = drawsStock
                ? planPicks(batches, component.sku, inStock)
                : { picks: [], short: 0 };

            return {
                sku: component.sku,
                name: row ? row.name : L(component.sku, component.sku),
                plannedQty: planned,
                uom: component.uom,
                stockUnit: row?.unit || component.uom,
                issue: component.issue,
                picks,
                short,
                actualQty: null,
                consumedQty: 0,
            };
        });

        const createdOn = stamp(createdDays);
        const dueDays = productionDueDays(prepType);
        const note = LAB_NOTES[i];

        const order = {
            id,
            bomId: bom.id,
            bomVersion: bom.version || 1,
            parentSku: bom.parentSku,
            name: bom.name,
            prepType: bom.prepType,
            plannedQty,
            uom: bom.yield.uom,
            state: state === 'partial' ? 'issued' : state,
            components,
            // The preparation's own figure where it has one; otherwise a run
            // that went to the bench carries the date its opener typed.
            dueOn: dueDays
                ? addDays(createdOn.iso, dueDays)
                : drawsStock
                  ? addDays(createdOn.iso, MANUAL_DUE_DAYS)
                  : null,
            dueDays,
            labNote: note ? note(components[0]) : null,
            standing: {
                item: String(item?.remarks ?? '').trim() || null,
                recipe: bom.notes?.he ? { ...bom.notes } : null,
            },
            receipts: [],
            drawn: 0,
            yieldQty: null,
            wasteQty: null,
            outputBatch: null,
            wasteBatch: null,
            expiresOn: null,
            cost: null,
            by,
            createdOn,
            issuedOn: null,
            completedOn: null,
            cancelledOn: null,
            reason: null,
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

        // Issued: the components are spoken for until the run comes back.
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

        if (state === 'issued') {
            return order;
        }

        // Completed, or a first half back: components out, the parent's batch
        // in, waste beside it.
        const share = state === 'partial' ? 0.5 : 1;
        const receivedDays =
            state === 'partial'
                ? spread(`${slot}:part`, 2, 4)
                : Math.max(1, createdDays - spread(`${slot}:dur`, 2, 14));
        const when = stamp(receivedDays);
        const wastePct = bom.expectedWastePct || 0;
        const yieldQty = round2(
            plannedQty *
                share *
                (1 - wastePct / 100) *
                (0.97 + fraction(`${slot}:yield`) * 0.03),
        );
        const wasteQty = wastePct ? round2(plannedQty * share - yieldQty) : 0;
        const months =
            item?.expiryMonths ||
            prepType?.expiryMonths ||
            settings?.defaultExpiryMonths?.[item?.family] ||
            24;
        // Calendar months, as the store counts them on a live receipt.
        const expiresOn = addMonths(when.iso, months);

        // Release this share of the reservation.
        components.forEach((component) => {
            const row = stockBySku.get(component.sku);

            if (row) {
                row.alloc = Math.max(
                    0,
                    round2(
                        row.alloc -
                            share *
                                toStockUnits(
                                    component.plannedQty,
                                    component.uom,
                                    row.unit,
                                ),
                    ),
                );
                syncRow(row);
            }
        });

        const { drew, cost } = drawComponents({
            components,
            share,
            batches,
            stockBySku,
            unitCostOf,
            id,
            n: 1,
            when,
            by,
            movements,
        });
        const final = share >= 1;

        if (final) {
            components.forEach((component) => {
                component.actualQty = component.consumedQty;
            });
        }

        const stockUnit = parent?.unit || bom.yield.uom;
        const outputQty = round3(
            toStockUnits(yieldQty, bom.yield.uom, stockUnit),
        );
        // V3 — the number a run's output takes is the next one in the
        // pharmacy's own running series, which the console carries on from the
        // workbook and from SAP rather than restarting. Waste takes the
        // production order's number instead, which is how the pharmacy tells
        // ground waste from whole herb today.
        const prefix = ITEM_FAMILY[familyOfCode(bom.parentSku)]?.prefix || '00';
        const serial = String(batchNo).padStart(5, '0');
        const outputId = `${prefix}-${serial}`;
        const outputNumber = String(HOUSE_SERIES_NEXT + houseNo);
        // Only a preparation that accepts waste turns it into a batch — a
        // tincture's extraction loss is recorded on the order and nothing
        // more, the same rule the store's receiveOrder() keeps.
        const wasteId =
            wasteQty && prepType?.acceptsWaste ? `${prefix}-${serial}W` : null;

        batchNo += 1;
        houseNo += 1;

        const opened = {
            id: outputId,
            number: outputNumber,
            // V3 — a batch the pharmacy made was made the day it came back.
            madeOn: when.iso,
            sku: bom.parentSku,
            name: parent ? parent.name : bom.name,
            unit: stockUnit,
            wh: parent?.wh || DEFAULT_WAREHOUSE,
            source: 'production',
            receipt: null,
            production: id,
            supplier: null,
            supplierBatch: null,
            received: when,
            qty: outputQty,
            remaining: outputQty,
            expiry: expiresOn,
            daysToExp: -daysSince(expiresOn),
            state: 'active',
            waste: false,
            unitCost: outputQty ? round2(cost / outputQty) : null,
            components: drew,
            by,
        };

        batches.unshift(opened);
        movements.push({
            id: `mv-prod-in-${id}-1-${outputId}`,
            kind: 'production_in',
            sku: bom.parentSku,
            name: opened.name,
            unit: stockUnit,
            wh: opened.wh,
            qty: outputQty,
            batch: outputId,
            ref: id,
            when,
            by,
        });

        let wasteStock = 0;

        if (wasteId) {
            wasteStock = round3(
                toStockUnits(wasteQty, bom.yield.uom, stockUnit),
            );

            batches.unshift({
                ...opened,
                id: wasteId,
                number: id,
                source: 'waste',
                qty: wasteStock,
                remaining: wasteStock,
                waste: true,
                unitCost: null,
                components: null,
            });
            movements.push({
                id: `mv-waste-in-${id}-1-${wasteId}`,
                kind: 'waste_in',
                sku: bom.parentSku,
                name: opened.name,
                unit: stockUnit,
                wh: opened.wh,
                qty: wasteStock,
                batch: wasteId,
                ref: id,
                when,
                by,
            });
        }

        if (parent) {
            parent.onHand = round3(parent.onHand + outputQty + wasteStock);
            syncRow(parent);
        }

        order.receipts.push({
            n: 1,
            qty: yieldQty,
            stockQty: outputQty,
            wasteQty,
            wasteStock,
            batch: outputId,
            added: false,
            wasteBatch: wasteId,
            expiresOn,
            labels: labelCount(
                outputQty,
                stockUnit,
                labelPackOf({ item, settings }),
            ),
            drew,
            cost: round2(cost),
            final,
            note: null,
            when,
            by,
        });

        Object.assign(order, {
            drawn: share,
            yieldQty,
            wasteQty,
            outputBatch: outputId,
            wasteBatch: wasteId,
            expiresOn,
            cost: {
                components: round2(cost),
                perUnit: yieldQty ? round2(cost / yieldQty) : null,
            },
        });

        if (final) {
            order.completedOn = when;
        }

        return order;
    });

    return { orders, movements };
}
