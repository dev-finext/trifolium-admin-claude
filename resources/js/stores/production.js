// Production: the orders that turn a bill of materials into a batch of the
// parent item. Second-version material.
//
// The moves of a run and what each does to stock:
//   create   — the recipe is scaled to the quantity, in the unit of measure
//              of the item being made, and a FEFO plan is drawn for every
//              component. The order goes to the lab as it is written — there
//              is no planned stage — so the plan is reserved at once: each
//              component's stock row shows the quantity as committed, so the
//              buyer sees it before it leaves. The order takes its target date
//              and the standing lab notes of the item it makes.
//   receive  — what came back from the lab goes into stock, all of it or a
//              part ("לפעמים מוצר רק חלק מכמות המוצר שהזמנתי ואני מכניסה למלאי
//              רק את החלק הזה ושאר ההוראה נשארת פתוחה"). Each receipt draws its
//              share of the components off their batches and opens a batch of
//              the parent — or tops up the one the order's previous receipt
//              opened — with the recipe's shelf life. Waste gets a batch of its
//              own only when the preparation type accepts waste (grinding a
//              plant leaves a real remainder; a tincture's extraction loss does
//              not). The last receipt draws whatever is left of the
//              components and completes the order.
//   cancel   — the reservation still standing is released.
//
// Every mutation is optimistic and calls persist(), a no-op against the fixture.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { DEFAULT_WAREHOUSE } from '@/config/inventory';
import {
    PRODUCTION_MOVE_KINDS,
    PRODUCTION_OPEN_STATE_IDS,
    PRODUCTION_SERIES,
    productionDueDays,
    resolveExpiryMonths,
} from '@/config/production';
import { persist } from '@/data/source';
import { componentUnitCost, toStockUnits } from '@/demo/production';
import {
    addDays,
    addMonths,
    daysSince,
    fmtISO,
    hm,
    isoDaysAgo,
    now,
    stamp,
} from '@/lib/dates';
import { L } from '@/lib/localized';
import { convertQty } from '@/lib/units';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;
const round4 = (value) => Math.round(value * 10000) / 10000;

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

/**
 * The notes an order carries to the bench that are not about this run alone,
 * copied when the order is opened — what the paper said is what the lab read.
 *
 * Two sources, both on the item card:
 *   item    the card's own remarks (`OITM.UserText`). For the items the
 *           pharmacy makes this is where the standing instructions already
 *           live — "להשרות את השמן במשך שבוע עם הצמחים", "לא לנדף את הפרופוליס",
 *           a pharmacopoeia reference — 82 of the 120 items SAP has production
 *           orders for carry one.
 *   recipe  the note on the recipe section of the card.
 */
export function standingNotesOf(item, bom) {
    const text = (value) => String(value ?? '').trim() || null;
    const recipe = bom?.notes?.he?.trim() ? { ...bom.notes } : null;

    return { item: text(item?.remarks), recipe };
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

    /** An order's own number, for putting runs in the order they were opened. */
    const serialOf = (order) =>
        Number(String(order.id).match(/(\d+)\s*$/)?.[1]) || 0;

    /**
     * Runs of one parent item, newest first. Sorted here: the fixture and the
     * database both hand the orders over oldest first, and a run opened this
     * session is put at the front — so without this the item card's "last
     * runs" would change meaning after a reload.
     */
    const ordersOf = (sku) =>
        orders.value
            .filter((order) => order.parentSku === sku)
            .sort((a, b) => serialOf(b) - serialOf(a));

    /** Runs a batch of a component went into — the forward trace. */
    const ordersUsingBatch = (batchId) =>
        orders.value.filter((order) =>
            order.components.some((component) =>
                component.picks.some((pick) => pick.batch === batchId),
            ),
        );

    /** The last unit cost a run of this item came out at — the latest finished. */
    const lastUnitCost = (sku) =>
        ordersOf(sku)
            .filter((order) => order.cost?.perUnit != null)
            .sort((a, b) =>
                `${b.completedOn?.iso || ''}${b.completedOn?.time || ''}`.localeCompare(
                    `${a.completedOn?.iso || ''}${a.completedOn?.time || ''}`,
                ),
            )[0]?.cost?.perUnit ?? null;

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

    /** The target date an order opened today on this recipe would carry. */
    const dueOnFor = (bom) => {
        const days = productionDueDays(items.prepTypeById(bom?.prepType));

        return days ? addDays(null, days) : null;
    };

    /**
     * The unit an order for this recipe is written in: the unit of measure of
     * the item it makes, off that item's card — what the person opening the
     * order thinks in, and what the shelf counts — whenever the recipe's yield
     * can be restated in it. A recipe whose yield cannot (a run of bottles
     * counted in units against an item counted in kilos) keeps its own.
     */
    function unitFor(bom) {
        const made = bom?.yield?.uom || 'unit';
        const own = inventory.itemBySku(bom?.parentSku)?.unit;

        return own && convertQty(1, made, own) !== null ? own : made;
    }

    /**
     * Scale a recipe to a planned quantity and draw the FEFO plan for each
     * component. Waste batches are drawn only when the recipe's preparation
     * type accepts waste.
     *
     * `overrides` is a `{ [sku]: [{ batch, qty }] }` map — a hand-picked
     * allocation replacing FEFO for that one component, from Natalie's ask to
     * see and choose from the rest of the shelf (components/production/
     * ComponentBatchPicker.vue).
     */
    function planComponents(bom, plannedQty, overrides = {}, uom = null) {
        // The quantity is in the item's own unit (`unitFor`); the recipe's
        // yield may be written in another one of the same kind — a litre of
        // tincture against a recipe for 1,000 ml.
        const runs =
            toStockUnits(plannedQty, uom || unitFor(bom), bom.yield?.uom) /
            (bom.yield?.qty || 1);
        const prepType = items.prepTypeById(bom.prepType);
        const allowWaste = Boolean(prepType?.acceptsWaste);

        return bom.components.map((component) => {
            const row = inventory.itemBySku(component.sku);
            const planned = round2(component.qty * runs);
            const inStock = toStockUnits(planned, component.uom, row?.unit);
            const manual = overrides?.[component.sku];
            let picks;
            let left;

            if (manual) {
                picks = manual.map((pick) => ({
                    batch: pick.batch,
                    qty: round2(Number(pick.qty) || 0),
                }));
                left = round2(
                    Math.max(
                        0,
                        inStock -
                            picks.reduce((sum, pick) => sum + pick.qty, 0),
                    ),
                );
            } else {
                picks = [];
                left = inStock;

                inventory
                    .openBatchesOf(component.sku, { allowWaste })
                    .forEach((batch) => {
                        if (left <= 0) {
                            return;
                        }

                        const take = Math.min(batch.remaining, left);

                        // Four places, not two: a pick rounded to 10 g
                        // leaves the batches and the stock row a hair apart
                        // after the run draws it.
                        picks.push({ batch: batch.id, qty: round4(take) });
                        left = round4(left - take);
                    });
            }

            return {
                sku: component.sku,
                name: row ? row.name : component.sku,
                plannedQty: planned,
                uom: component.uom,
                stockUnit: row?.unit || component.uom,
                issue: component.issue,
                picks,
                short: left > 0 ? round4(left) : 0,
                actualQty: null,
                consumedQty: 0,
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

    /**
     * What a component holds reserved, in its stock row's unit. An order
     * issued before the amount was kept on the component reads it from the
     * plan, as it was reserved then.
     */
    const reservedOf = (component, row) =>
        component.reserved ??
        round4(
            toStockUnits(
                component.plannedQty,
                component.uom,
                row?.unit || component.stockUnit,
            ),
        );

    /** What a component has already handed back, in the same unit. */
    const releasedOf = (order, component, row) =>
        component.released ??
        round4(reservedOf(component, row) * (Number(order.drawn) || 0));

    /**
     * Reserve a run's components on their stock rows, and remember on each
     * component exactly how much — so what is handed back later, in parts or
     * all at once, adds up to what was taken and not to a rounding of it.
     */
    function reserveRun(order) {
        order.components.forEach((component) => {
            const row = inventory.itemBySku(component.sku);

            component.reserved = reservedOf(
                { ...component, reserved: null },
                row,
            );
            component.released = 0;

            if (row) {
                row.alloc = round4(row.alloc + component.reserved);
                inventory.syncRow(row);
            }
        });
    }

    /**
     * Hand back a share of each component's reservation as part of the run
     * comes back — or, with no share, everything still held, when the run
     * completes or is cancelled.
     */
    function release(order, share = null) {
        order.components.forEach((component) => {
            const row = inventory.itemBySku(component.sku);
            const reserved = reservedOf(component, row);
            const released = releasedOf(order, component, row);
            const held = Math.max(0, round4(reserved - released));
            const amount =
                share === null
                    ? held
                    : Math.min(held, round4(reserved * share));

            component.reserved = reserved;
            component.released = round4(released + amount);

            if (row && amount > 0) {
                row.alloc = Math.max(0, round4(row.alloc - amount));
                inventory.syncRow(row);
            }
        });
    }

    // ---- mutations -----------------------------------------------------------

    /**
     * Open a production order on a recipe.
     *
     * @param {{ bomId: string, plannedQty: number, labNote?: string,
     *          internalNote?: string, dueOn?: string,
     *          overrides?: Record<string, {batch: string, qty: number}[]> }} form
     */
    async function createOrder(form) {
        const bom = items.bomById(form.bomId);
        const plannedQty = Number(form.plannedQty) || 0;

        if (!bom || plannedQty <= 0) {
            throw new Error('A production order needs a recipe and a quantity');
        }

        const rows = bag('productionOrders');
        const byRule = dueOnFor(bom);
        // A form that sent the field decides, even when it cleared it.
        const dueOn = form.dueOn !== undefined ? form.dueOn || null : byRule;
        // The figure the date came from — only while the date is the one it
        // gives. A date the person chose is theirs, and says so.
        const dueDays =
            dueOn && dueOn === byRule
                ? productionDueDays(items.prepTypeById(bom.prepType))
                : null;
        const uom = unitFor(bom);
        const opened = moment();
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
            uom,
            state: 'issued',
            components: planComponents(bom, plannedQty, form.overrides, uom),
            // תאריך יעד — the preparation's own figure, or the date the person
            // opening the order chose over it.
            dueOn,
            dueDays,
            // A note for this run only — "שלא נגררות להוראה הבאה" — and the
            // standing ones the item card carries, copied as they read today.
            labNote: form.labNote?.trim() || null,
            // The pharmacy's own note on the order. It stays in the console:
            // the work sheet and the labels that go to the lab never carry it.
            internalNote: form.internalNote?.trim() || null,
            standing: standingNotesOf(items.itemBySku(bom.parentSku), bom),
            receipts: [],
            drawn: 0,
            yieldQty: null,
            wasteQty: null,
            outputBatch: null,
            wasteBatch: null,
            expiresOn: null,
            cost: null,
            by: dataset.me?.name || null,
            createdOn: opened,
            issuedOn: opened,
            completedOn: null,
            cancelledOn: null,
            reason: null,
        };

        rows.unshift(order);
        reserveRun(order);
        writeLog({
            act: 'production_create',
            entType: 'production_order',
            ent: order.id,
            to: `${plannedQty} ${order.uom}`,
        });
        writeLog({
            act: 'production_issue',
            entType: 'production_order',
            ent: order.id,
        });
        await persist('production-orders', order);

        return order;
    }

    /**
     * The order's internal note — the pharmacy's own, edited while the order
     * is open and never printed for the lab.
     */
    async function setInternalNote(id, note) {
        const order = orderById(id);
        const next = String(note || '').trim() || null;

        if (!order || (order.internalNote || null) === next) {
            return null;
        }

        order.internalNote = next;
        await persist(`production-orders/${id}`, order, 'PUT');

        return order;
    }

    /** Move an open order's target date — the lab's load is the person's call. */
    async function setDueOn(id, dueOn) {
        const order = orderById(id);

        if (
            !order ||
            !PRODUCTION_OPEN_STATE_IDS.includes(order.state) ||
            (dueOn || null) === (order.dueOn || null)
        ) {
            return null;
        }

        writeLog({
            act: 'production_due',
            entType: 'production_order',
            ent: order.id,
            valueType: 'date',
            from: order.dueOn || null,
            to: dueOn || null,
        });
        order.dueOn = dueOn || null;
        // Moved by hand: no longer the preparation's figure.
        order.dueDays = null;
        await persist(`production-orders/${id}`, order, 'PUT');

        return order;
    }

    /**
     * Receive what came back from the lab: all of what is left, or a part.
     *
     * A part draws its share of the run off the components — the share being
     * what came out plus what went to waste, against the planned quantity — and
     * leaves the order open. The last receipt draws everything still standing,
     * whatever the yield: the run is over, and what is not in the jar is in the
     * waste or lost to the process. That last one may bring nothing back at all
     * when earlier receipts already took the whole yield.
     *
     * @param {{ yieldQty: number, wasteQty?: number, expiresOn?: string,
     *          final?: boolean, batchMode?: 'new'|'add',
     *          actual?: Record<string, number>, note?: string,
     *          labels?: number|null }} form
     */
    async function receiveOrder(id, form) {
        const order = orderById(id);

        if (!order || order.state !== 'issued') {
            return null;
        }

        // Once every part of the run has been drawn, whatever comes back is
        // the last of it — a "part" of nothing would open a batch that drew
        // nothing and cost nothing.
        const final = form.final !== false || (Number(order.drawn) || 0) >= 1;
        const bom = items.bomById(order.bomId);
        const item = items.itemBySku(order.parentSku);
        const parent = inventory.itemBySku(order.parentSku);
        const prepType = items.prepTypeById(order.prepType);
        const yieldQty = round2(Math.max(0, Number(form.yieldQty) || 0));
        const wasteQty = round2(Math.max(0, Number(form.wasteQty) || 0));
        const receipts = Array.isArray(order.receipts)
            ? order.receipts
            : (order.receipts = []);

        if (!yieldQty && !(final && receipts.length)) {
            return null;
        }

        // Whether this preparation type's waste is a physical remainder worth a
        // batch of its own (grinding a plant into powder leaves one) or a pure
        // process loss with nothing to receive (a tincture's extraction loss is
        // liquid that never reaches the shelf) — Natalie, on the tincture order
        // that prompted this: "זה לא באמת פחת שנקלט למערכת... אני לא צריכה לקלוט
        // אותו וגם לא לייצר עבורו אצווה". The quantity is kept on the order either
        // way, because she also wants it for statistics; only the inventory and
        // batch side is gated.
        const wasteReceivable = wasteQty > 0 && Boolean(prepType?.acceptsWaste);
        const when = moment();
        const by = dataset.me?.name || null;
        const n = receipts.length + 1;
        const months = resolveExpiryMonths({
            item,
            prepType,
            settings: dataset.data.inventorySettings,
        });
        // Calendar months, not 30-day blocks — a 36-month shelf life lands on
        // the same day three years later, which is the "round" number the
        // pharmacy expects on the batch label.
        const expiresOn = form.expiresOn || addMonths(null, months || 24);

        // How much of the run this receipt accounts for.
        const drawn = Number(order.drawn) || 0;
        const left = Math.max(0, round4(1 - drawn));
        const share = final
            ? left
            : Math.min(
                  left,
                  order.plannedQty
                      ? round4((yieldQty + wasteQty) / order.plannedQty)
                      : 0,
              );

        // Hand back this share of the reservation — or all of what is still
        // held, on the last receipt — then take the real quantities out.
        release(order, final ? null : share);

        // What the run took off the shelf, for the goods issue it posts.
        const issued = [];
        let cost = 0;

        order.components.forEach((component) => {
            const row = inventory.itemBySku(component.sku);
            const unit = row?.unit || component.stockUnit;
            const toStock = (qty) =>
                round4(toStockUnits(qty, component.uom, unit));
            const consumed = Number(component.consumedQty) || 0;
            const consumedStock = component.consumedStock ?? toStock(consumed);
            // A counted figure is a number the operator typed; an empty field
            // is no figure, and the recipe's stands.
            const typed = form.actual?.[component.sku];
            const counted =
                final &&
                component.issue === 'manual' &&
                typed !== undefined &&
                typed !== null &&
                typed !== '' &&
                Number.isFinite(Number(typed))
                    ? round2(Number(typed))
                    : null;
            const target = counted ?? component.plannedQty;
            // In the recipe's unit, for the record, and in the stock unit, for
            // the shelf. The last receipt takes exactly what is left to reach
            // the run's figure — the recipe's, or the one counted — so the
            // parts add up to it and not to a rounding of it.
            const take = final
                ? round4(Math.max(0, target - consumed))
                : round4(component.plannedQty * share);
            const takeStock = final
                ? Math.max(0, round4(toStock(target) - consumedStock))
                : toStock(component.plannedQty * share);
            const unitCost = componentUnitCost(items.itemBySku(component.sku));
            // The batches give what the shelf gives, in the order the plan
            // listed them; what the plan set aside and the run did not use
            // stays in its batch.
            let fromBatches = takeStock;

            component.picks.forEach((pick) => {
                const open = round4((pick.qty || 0) - (pick.taken || 0));
                const qty = round4(Math.min(open, fromBatches));

                if (qty <= 0) {
                    return;
                }

                fromBatches = round4(fromBatches - qty);
                pick.taken = round4((pick.taken || 0) + qty);

                const batch = inventory.batchById(pick.batch);

                if (!batch) {
                    return;
                }

                issued.push({
                    sku: component.sku,
                    name: batch.name,
                    unit: batch.unit,
                    qty,
                    wh: batch.wh,
                    batch: batch.id,
                    price: unitCost || null,
                });

                batch.remaining = Math.max(0, round4(batch.remaining - qty));
                inventory.syncBatch(batch);
                inventory.writeMovement({
                    id: `mv-prod-out-${order.id}-${n}-${batch.id}`,
                    kind: PRODUCTION_MOVE_KINDS.consume,
                    sku: component.sku,
                    name: batch.name,
                    unit: batch.unit,
                    wh: batch.wh,
                    qty: -qty,
                    batch: batch.id,
                    ref: order.id,
                    when,
                    by,
                });
                cost += unitCost * qty;
            });

            component.consumedQty = round4(consumed + take);
            component.consumedStock = round4(consumedStock + takeStock);

            if (final) {
                component.actualQty = round2(component.consumedQty);
            }

            if (row && takeStock > 0) {
                row.onHand = Math.max(0, round4(row.onHand - takeStock));
                inventory.syncRow(row);
            }
        });

        order.drawn = round4(drawn + share);

        // SAP posts a goods issue for what the run consumed and a goods
        // receipt for what it made, both against the order.
        if (issued.length) {
            inventory.postDoc({
                type: 'goods_issue',
                base: 'production',
                baseRef: order.id,
                warehouse: issued[0].wh,
                remarks: L(
                    `נוצר באופן אוטומטי על-ידי הוראת ייצור ${order.id}`,
                    `Created automatically by production order ${order.id}`,
                ),
                when,
                by,
                lines: issued,
            });
        }

        const stockUnit = parent?.unit || order.uom;
        const outputQty = round3(toStockUnits(yieldQty, order.uom, stockUnit));
        const previous = [...receipts]
            .reverse()
            .map((receipt) => inventory.batchById(receipt.batch))
            .find(Boolean);
        let output = null;

        if (outputQty > 0 && form.batchMode === 'add' && previous) {
            // The same lot, brought back in two goes — the batch the previous
            // receipt opened grows, and keeps its number and its dates.
            const before = previous.qty || 0;

            previous.qty = round3(before + outputQty);
            previous.remaining = round3((previous.remaining || 0) + outputQty);
            previous.unitCost = previous.qty
                ? round2(
                      ((previous.unitCost || 0) * before + cost) / previous.qty,
                  )
                : previous.unitCost;
            previous.components = [
                ...(previous.components || []),
                ...issued.map((line) => ({
                    sku: line.sku,
                    batch: line.batch,
                    qty: line.qty,
                })),
            ];
            inventory.syncBatch(previous);
            output = previous;
        } else if (outputQty > 0) {
            // V3 — the output takes the next number in the pharmacy's own
            // running series, allocated by the system and not editable.
            output = inventory.openBatch({
                ...inventory.nextBatchNumber({
                    sku: order.parentSku,
                    kind: 'production',
                }),
                sku: order.parentSku,
                name: parent ? parent.name : order.name,
                unit: stockUnit,
                wh: parent?.wh || DEFAULT_WAREHOUSE,
                source: 'production',
                production: order.id,
                received: when,
                qty: outputQty,
                expiry: expiresOn,
                unitCost: round2(cost / outputQty),
                components: issued.map((line) => ({
                    sku: line.sku,
                    batch: line.batch,
                    qty: line.qty,
                })),
                by,
            });
        } else if (previous && cost > 0) {
            // The last of a run that brought nothing more back still drew
            // components, and what they cost belongs to what the run did make:
            // the batch the previous part opened carries it, so its unit cost
            // and the order's agree.
            const qty = Number(previous.qty) || 0;

            previous.unitCost = qty
                ? round2(((previous.unitCost || 0) * qty + cost) / qty)
                : previous.unitCost;
        }

        if (output) {
            inventory.writeMovement({
                id: `mv-prod-in-${order.id}-${n}-${output.id}`,
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
        }

        let waste = null;
        let wasteStock = 0;

        if (wasteReceivable) {
            wasteStock = round3(toStockUnits(wasteQty, order.uom, stockUnit));
            waste = order.wasteBatch
                ? inventory.batchById(order.wasteBatch)
                : null;

            if (waste) {
                // V3 — one waste batch per order: it carries the order's
                // number, so a second part of the run tops it up.
                waste.qty = round3((waste.qty || 0) + wasteStock);
                waste.remaining = round3((waste.remaining || 0) + wasteStock);
                inventory.syncBatch(waste);
            } else {
                // V3 — waste carries the production order's own number, which
                // is how the pharmacy tells ground waste from whole herb today.
                waste = inventory.openBatch({
                    ...inventory.nextBatchNumber({
                        sku: order.parentSku,
                        kind: 'waste',
                        production: order.id,
                    }),
                    sku: order.parentSku,
                    name: parent ? parent.name : order.name,
                    unit: stockUnit,
                    wh: parent?.wh || DEFAULT_WAREHOUSE,
                    source: 'waste',
                    production: order.id,
                    received: when,
                    qty: wasteStock,
                    expiry: expiresOn,
                    waste: true,
                    by,
                });
            }

            inventory.writeMovement({
                id: `mv-waste-in-${order.id}-${n}-${waste.id}`,
                kind: PRODUCTION_MOVE_KINDS.waste,
                sku: order.parentSku,
                name: waste.name,
                unit: stockUnit,
                wh: waste.wh,
                qty: wasteStock,
                batch: waste.id,
                ref: order.id,
                when,
                by,
            });
        }

        if (parent && (outputQty > 0 || wasteStock > 0)) {
            parent.onHand = round3(parent.onHand + outputQty + wasteStock);
            inventory.syncRow(parent);
        }

        const made = [
            output && {
                sku: order.parentSku,
                name: output.name,
                unit: stockUnit,
                qty: outputQty,
                wh: output.wh,
                batch: output.id,
                price: output.unitCost ?? null,
            },
            waste && {
                sku: order.parentSku,
                name: waste.name,
                unit: stockUnit,
                qty: wasteStock,
                wh: waste.wh,
                batch: waste.id,
                price: null,
            },
        ].filter(Boolean);

        if (made.length) {
            inventory.postDoc({
                type: 'goods_receipt',
                base: 'production',
                baseRef: order.id,
                warehouse: made[0].wh,
                remarks: L(
                    `קבלה מהייצור · הוראת ייצור ${order.id}`,
                    `Receipt from production · order ${order.id}`,
                ),
                when,
                by,
                lines: made,
            });
        }

        const receipt = {
            n,
            qty: yieldQty,
            stockQty: outputQty,
            wasteQty,
            wasteStock,
            batch: output ? output.id : null,
            added: Boolean(output && output === previous),
            wasteBatch: waste ? waste.id : null,
            expiresOn: output ? output.expiry : null,
            labels:
                form.labels != null && Number(form.labels) >= 0
                    ? Math.round(Number(form.labels))
                    : null,
            // What this receipt drew off the component batches — its own goods
            // issue, line by line.
            drew: issued.map((line) => ({
                sku: line.sku,
                batch: line.batch,
                qty: line.qty,
            })),
            cost: round2(cost),
            final,
            note: form.note?.trim() || null,
            when,
            by,
        };

        receipts.push(receipt);

        const totalYield = round2(
            receipts.reduce((sum, row) => sum + (row.qty || 0), 0),
        );
        const totalCost = round2((order.cost?.components || 0) + cost);

        Object.assign(order, {
            yieldQty: totalYield,
            wasteQty: round2(
                receipts.reduce((sum, row) => sum + (row.wasteQty || 0), 0),
            ),
            outputBatch:
                receipts.find((row) => row.batch)?.batch || order.outputBatch,
            wasteBatch: waste ? waste.id : order.wasteBatch,
            expiresOn: receipt.expiresOn || order.expiresOn,
            cost: {
                components: totalCost,
                perUnit: totalYield ? round2(totalCost / totalYield) : null,
            },
        });

        if (final) {
            order.state = 'completed';
            order.completedOn = when;
        }

        writeLog({
            act: final ? 'production_complete' : 'production_receive',
            entType: 'production_order',
            ent: order.id,
            to: output
                ? `${inventory.batchNo(output)} · ${yieldQty} ${order.uom}`
                : null,
            note: bom ? null : 'recipe missing',
        });
        await persist(`production-orders/${id}/receive`, receipt);

        return { order, receipt };
    }

    /**
     * Cancel an open run; the reservation still standing is released.
     *
     * A run part of which already came back is not cancelled — the stock it
     * delivered is real — but closed short: it completes on what it brought,
     * and only what was never drawn goes back to being available. That is what
     * SAP shows too: ten of its 180 orders closed with less received than
     * ordered.
     */
    async function cancelOrder(id, reason = '') {
        const order = orderById(id);

        if (!order || !PRODUCTION_OPEN_STATE_IDS.includes(order.state)) {
            return null;
        }

        if (order.state === 'issued') {
            release(order);
        }

        const short = Boolean(order.receipts?.length);

        if (short) {
            order.components.forEach((component) => {
                component.actualQty = round2(component.consumedQty || 0);
            });
            order.state = 'completed';
            order.completedOn = moment();
            order.closedShort = true;
        } else {
            order.state = 'cancelled';
            order.cancelledOn = moment();
        }

        order.reason = reason.trim() || null;
        writeLog({
            act: short ? 'production_close_short' : 'production_cancel',
            entType: 'production_order',
            ent: order.id,
            to: order.reason,
        });
        await persist(`production-orders/${id}/cancel`, { reason });

        return order;
    }

    /**
     * How many batch labels a receipt went out with — the count the person
     * printed, which may differ from the one the containers suggested.
     */
    async function setReceiptLabels(id, n, count) {
        const order = orderById(id);
        const receipt = order?.receipts?.find((row) => row.n === n);
        const next = Math.max(0, Math.round(Number(count) || 0));

        if (!receipt || receipt.labels === next) {
            return null;
        }

        receipt.labels = next;
        await persist(`production-orders/${id}`, order, 'PUT');

        return receipt;
    }

    /**
     * The target-date figure of a preparation type, in days. The note's
     * example is the tincture's 21 days of maceration.
     */
    async function setPrepTarget(typeId, days) {
        const type = items.prepTypeById(typeId);
        const next =
            days === '' || days === null || !(Number(days) > 0)
                ? null
                : Math.round(Number(days));

        if (!type || (type.productionDays ?? null) === next) {
            return null;
        }

        type.productionDays = next;
        writeLog({
            act: 'prep_type_update',
            entType: 'catalog_item',
            ent: type.id,
            to: `${type.name?.he || type.id}: ${next ?? '—'}`,
        });
        await persist(`prep-types/${type.id}`, type, 'PUT');

        return type;
    }

    return {
        orders,
        openOrders,
        orderById,
        ordersOf,
        ordersUsingBatch,
        lastUnitCost,
        canProduce,
        dueOnFor,
        planComponents,
        unitFor,
        createOrder,
        setInternalNote,
        setDueOn,
        receiveOrder,
        setReceiptLabels,
        cancelOrder,
        setPrepTarget,
    };
});
