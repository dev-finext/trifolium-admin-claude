// V3 — תכנון מלאי ורכש.
//
// The report the buyer plans from, replacing the external workbook the pharmacy
// keeps today. One row per item: what is on the shelf, what is promised, what is
// coming and from whom, what went out month by month, how many months of stock
// that leaves, and the quantity the buyer means to bring in.
//
// The arithmetic is not this store's invention. `config/planning.js` records
// where each rule comes from — the client's note of 14.09.26, the workbook it
// attaches, and the pharmacy's own saved SAP query. The history behind it is
// real: `demo/planning.js` reads it out of the restored database.
//
// This store computes and it plans. It does not post stock — a purchase request
// becomes a purchase order through the purchasing store, and a production
// recommendation becomes a run through the production store.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
    coverState,
    coverThreshold,
    monthsOfCover,
    planningAvailable,
    PLANNING_DEFAULT_MONTHS,
    planTargetsFor,
    PURCHASE_REQUEST_SERIES,
} from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { convertQty } from '@/lib/units';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';
import { usePurchasingStore } from '@/stores/purchasing';

/** This moment, in the shape every record's `when` field carries. */
function moment() {
    const at = isoDaysAgo(0);

    return { daysAgo: 0, iso: at, time: hm(now()), stamp: stamp(0) };
}

/** 'YYYY-MM' plus n months. */
function addMonths(ym, n) {
    const [year, month] = ym.split('-').map(Number);
    const total = year * 12 + (month - 1) + n;

    return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String(
        (total % 12) + 1,
    ).padStart(2, '0')}`;
}

/** Every month from `from` to `to`, inclusive, oldest first. */
function monthRange(from, to) {
    const out = [];
    let cursor = from;

    while (cursor <= to) {
        out.push(cursor);
        cursor = addMonths(cursor, 1);
    }

    return out;
}

/** What a series adds up to over a set of months. */
function sumOver(series, months) {
    return months.reduce((sum, ym) => sum + (Number(series?.[ym]) || 0), 0);
}

export const usePlanningStore = defineStore('planning', () => {
    const dataset = useDatasetStore();
    const items = useItemsStore();
    const purchasing = usePurchasingStore();
    const production = useProductionStore();

    const history = computed(
        () => dataset.data.consumption || { months: [], rows: [] },
    );

    const openOrders = computed(() => dataset.data.openOrders || []);

    /** Consumption per item, keyed by item number, for O(1) lookup per row. */
    const historyBySku = computed(
        () => new Map(history.value.rows.map((row) => [row.sku, row])),
    );

    /** Every month the fixture holds history for, oldest first. */
    const months = computed(() => history.value.months || []);

    /** The window the report opens on: the last `PLANNING_DEFAULT_MONTHS`. */
    const defaultWindow = computed(() => {
        const all = months.value;

        if (!all.length) {
            return { from: null, to: null };
        }

        return {
            from: all[Math.max(0, all.length - PLANNING_DEFAULT_MONTHS)],
            to: all[all.length - 1],
        };
    });

    // ---- the buyer's own numbers ---------------------------------------------

    /**
     * A quantity typed into the planning column, per item and per target.
     *
     * It is not a document and it is not stock — it is the buyer's intention,
     * kept so the row can show what that quantity would do to the cover before
     * anything is sent anywhere. `state` follows it from typed, to asked for, to
     * on order.
     */
    const planLines = computed(() => dataset.data.planLines || []);

    const planFor = (sku, target) =>
        planLines.value.find(
            (line) =>
                line.sku === sku &&
                line.target === target &&
                line.state !== 'cancelled',
        ) || null;

    /** The per-item-group cover thresholds the pharmacy has set. */
    const coverThresholds = computed(() => dataset.data.coverThresholds || {});

    // ---- open orders ---------------------------------------------------------

    const openOrdersOf = (sku) =>
        openOrders.value.filter((row) => row.sku === sku);

    // ---- the report ----------------------------------------------------------

    /**
     * One row per item, over a chosen window.
     *
     * `range` is a pair of 'YYYY-MM'. Everything the client's note lists as a
     * column is here; what it asks for and this system cannot yet answer — the
     * standing remark to the supplier, the trend coefficient, the forecast — is
     * deliberately absent rather than guessed at. See `dev/progress.js`.
     */
    function report(range = {}) {
        const from = range.from || defaultWindow.value.from;
        const to = range.to || defaultWindow.value.to;

        if (!from || !to) {
            return { from: null, to: null, months: [], rows: [] };
        }

        const window = monthRange(from, to);
        const span = Math.max(1, window.length);
        const groups = range.groups || [];
        const thresholds = coverThresholds.value;

        const rows = items.rows
            .filter((item) => item.flags?.inventory)
            .filter((item) => !groups.length || groups.includes(item.group))
            .map((item) => {
                const series = historyBySku.value.get(item.sku);
                const total = sumOver(series?.months, window);
                const direct = sumOver(series?.direct, window);
                const monthly = total / span;
                const coming = openOrdersOf(item.sku);
                const available = planningAvailable(item);
                const cover = monthsOfCover(available, monthly);
                const threshold = coverThreshold(item.group, thresholds);
                const purchase = planFor(item.sku, 'purchase');
                const production = planFor(item.sku, 'production');
                const planned =
                    (purchase?.qty || 0) + (production?.qty || 0) || 0;

                return {
                    id: item.sku,
                    sku: item.sku,
                    name: item.names,
                    foreign: item.names?.en || null,
                    group: item.group,
                    groupName: item.groupName,
                    unit: item.uom?.stock || 'unit',
                    onHand: item.onHand || 0,
                    committed: item.committed || 0,
                    onOrder: item.onOrder || 0,
                    available,
                    coming,
                    comingFrom: coming
                        .map((one) => one.party)
                        .filter(Boolean)
                        .join(', '),
                    total,
                    direct,
                    monthly,
                    cover,
                    threshold,
                    coverState: coverState(cover, threshold),
                    // What the cover becomes if the planned quantity arrives —
                    // the column the note's own worked example turns on.
                    planned,
                    plannedCover: monthsOfCover(available + planned, monthly),
                    plan: { purchase, production },
                    planState: purchase?.state || production?.state || null,
                    targets: planTargetsFor(
                        item,
                        items.bomsOfParent(item.sku).length > 0,
                    ),
                    min: item.levels?.min ?? null,
                    max: item.levels?.max ?? null,
                    // Against the minimum, the way the workbook reads it.
                    overMin:
                        item.levels?.min === null ||
                        item.levels?.min === undefined
                            ? null
                            : available - item.levels.min,
                    supplierCode: item.suppliers?.sapCode || null,
                    supplier: item.preferred?.name || null,
                    price: item.price?.lastPurchase ?? null,
                    priceOn: item.price?.lastPurchaseOn || null,
                    leadTime: item.levels?.leadTime ?? null,
                    remarks: item.remarks || null,
                    internalNotes: item.internalNotes || null,
                    series: series?.months || {},
                    directSeries: series?.direct || {},
                };
            });

        return { from, to, months: window, rows };
    }

    // ---- writes --------------------------------------------------------------

    function bag(name) {
        if (!Array.isArray(dataset.data[name])) {
            dataset.data[name] = [];
        }

        return dataset.data[name];
    }

    /**
     * Put a quantity in the planning column, or take it out again.
     *
     * A zero clears the line. A line that has already gone out to a supplier or
     * to the lab is not edited here — it is cancelled and typed again, so the
     * request that was sent stays what was sent.
     */
    function plan(sku, target, qty) {
        const rows = bag('planLines');
        const existing = planFor(sku, target);
        const amount = Number(qty) || 0;

        if (existing && existing.state !== 'planned') {
            return existing;
        }

        if (!amount) {
            if (existing) {
                rows.splice(rows.indexOf(existing), 1);
                persist(`plan-lines/${existing.id}`, {}, 'DELETE');
            }

            return null;
        }

        if (existing) {
            existing.qty = amount;
            existing.when = moment();
            persist(`plan-lines/${existing.id}`, existing, 'PUT');

            return existing;
        }

        const line = {
            id: `pl-${target}-${sku}-${rows.length}`,
            sku,
            target,
            qty: amount,
            state: 'planned',
            request: null,
            order: null,
            when: moment(),
            by: dataset.me?.name || null,
        };

        rows.unshift(line);
        persist('plan-lines', line);

        return line;
    }

    /** Clear every planned line that has not gone anywhere yet. */
    function clearPlan() {
        const rows = bag('planLines');

        for (let i = rows.length - 1; i >= 0; i -= 1) {
            if (rows[i].state === 'planned') {
                rows.splice(i, 1);
            }
        }

        persist('plan-lines', {}, 'DELETE');
    }

    /**
     * Everything planned for purchase, gathered under the supplier who would
     * fill it — which is how the pharmacy sends it: one email per supplier.
     *
     * An item whose card names no supplier lands in its own group with a null
     * code; the screen makes the buyer choose one before that group can go out,
     * because a request without a recipient cannot be sent anywhere.
     */
    const plannedBySupplier = computed(() => {
        const groups = new Map();

        planLines.value.forEach((line) => {
            if (line.target !== 'purchase' || line.state !== 'planned') {
                return;
            }

            const row = items.rowBySku(line.sku);
            const code = row?.suppliers?.sapCode || null;
            const key = code || '';

            if (!groups.has(key)) {
                groups.set(key, {
                    supplierCode: code,
                    supplier: row?.preferred?.name || null,
                    lines: [],
                });
            }

            groups.get(key).lines.push({
                sku: line.sku,
                name: row?.names || line.sku,
                qty: line.qty,
                unit: row?.uom?.stock || 'unit',
                price: row?.price?.lastPurchase ?? null,
                // No remark travels with the line yet. The standing remark the
                // note asks for — "הערות קבועות העוברות לספק" — has nowhere to
                // live until it is decided whether it belongs to the supplier,
                // to the item or to both; and the item's own remarks field is
                // full of pharmacopoeia references, which is not something to
                // write to a supplier.
                remark: null,
            });
        });

        return [...groups.values()].sort(
            (a, b) =>
                Number(Boolean(b.supplierCode)) -
                Number(Boolean(a.supplierCode)),
        );
    });

    /** Everything planned for production, with the recipe each one would run. */
    const plannedForProduction = computed(() =>
        planLines.value
            .filter(
                (line) =>
                    line.target === 'production' && line.state === 'planned',
            )
            .map((line) => {
                const row = items.rowBySku(line.sku);
                const recipe = items.bomsOfParent(line.sku)[0] || null;

                return {
                    sku: line.sku,
                    name: row?.names || line.sku,
                    qty: line.qty,
                    unit: row?.uom?.stock || 'unit',
                    bomId: recipe?.id || null,
                    can: recipe ? producible(line.sku, line.qty) : null,
                };
            }),
    );

    // ---- purchase requests ---------------------------------------------------

    /**
     * A purchase request is what the note insists on: an ask, not an order.
     *
     * SAP keeps the same document (`OPRQ`, 434 of them, numbered on the 2600000
     * series) and leaves the supplier off it — the supplier is chosen when the
     * request becomes an order. The pharmacy's described flow is the other way
     * round: it picks a supplier, gathers that supplier's lines and mails them.
     * This follows the pharmacy, because the email cannot be written without a
     * recipient; the difference is recorded in `dev/progress.js`.
     */
    const purchaseRequests = computed(
        () => dataset.data.purchaseRequests || [],
    );

    const requestById = (id) =>
        purchaseRequests.value.find((row) => row.id === id) || null;

    const nextRequestNumber = () => {
        const used = purchaseRequests.value
            .map((row) => Number(row.number))
            .filter(Number.isFinite);

        return String(Math.max(PURCHASE_REQUEST_SERIES, ...used, 0) + 1);
    };

    /**
     * Raise a purchase request from the planning column: every purchase line
     * still only planned, for one supplier, moved onto one document.
     */
    function raiseRequest({ supplierCode, supplier, lines, note = '' }) {
        const rows = bag('purchaseRequests');
        const number = nextRequestNumber();
        const request = {
            id: `pr-${number}`,
            number,
            supplierCode: supplierCode || null,
            supplier: supplier || null,
            state: 'draft',
            note: note.trim() || null,
            lines: lines.map((line) => ({
                sku: line.sku,
                name: line.name,
                qty: line.qty,
                unit: line.unit,
                price: line.price ?? null,
                remark: line.remark || null,
            })),
            raised: moment(),
            sent: null,
            by: dataset.me?.name || null,
            order: null,
        };

        rows.unshift(request);

        lines.forEach((line) => {
            const held = planFor(line.sku, 'purchase');

            if (held) {
                held.state = 'requested';
                held.request = request.id;
            }
        });

        persist('purchase-requests', request);

        return request;
    }

    /** Mark a request as gone out to the supplier. */
    function sendRequest(id) {
        const request = requestById(id);

        if (!request || request.state !== 'draft') {
            return request;
        }

        request.state = 'sent';
        request.sent = moment();
        persist(`purchase-requests/${id}`, { state: 'sent' }, 'PATCH');

        return request;
    }

    /**
     * The supplier agreed: the request becomes a purchase order, and the planned
     * lines behind it stop being a plan and start being stock on its way.
     */
    function confirmRequest(id, orderId) {
        const request = requestById(id);

        if (!request || request.state === 'ordered') {
            return request;
        }

        request.state = 'ordered';
        request.order = orderId || null;

        planLines.value.forEach((line) => {
            if (line.request === id) {
                line.state = 'ordered';
                line.order = orderId || null;
            }
        });

        persist(
            `purchase-requests/${id}`,
            { state: 'ordered', order: orderId || null },
            'PATCH',
        );

        return request;
    }

    /**
     * The supplier said yes: raise the purchase order the request stood for.
     *
     * The planned quantities are in stock units, because that is what the report
     * counts in; a purchase order is written in the unit the pharmacy buys by.
     * Where the item card knows both and how many of one go into the other, the
     * quantity is converted; where it does not, the stock unit is used and says
     * so rather than inventing a factor.
     */
    async function orderFromRequest(id) {
        const request = requestById(id);

        if (!request || request.state === 'ordered') {
            return null;
        }

        const { po } = await purchasing.savePo({
            supplierCode: request.supplierCode,
            currency: 'ILS',
            eta: null,
            notes: request.note || '',
            lines: request.lines.map((line) => {
                const row = items.rowBySku(line.sku);
                const factor = Number(row?.uom?.factor) || 0;
                const buyUom = row?.uom?.purchase || line.unit;
                const inBuyUnits =
                    factor > 0 && buyUom !== line.unit
                        ? Math.round((line.qty / factor) * 1000) / 1000
                        : line.qty;

                return {
                    sku: line.sku,
                    qty: inBuyUnits,
                    uom: factor > 0 ? buyUom : line.unit,
                    price: line.price,
                };
            }),
        });

        // The console carries seven supplier cards against SAP's 402, so an
        // order raised under a SAP vendor code cannot look its name up there.
        // The request already resolved it when it was raised; the order keeps
        // that name rather than printing a bare number.
        if (po && request.supplier) {
            po.supplier = request.supplier;
        }

        confirmRequest(id, po?.id || null);

        return po;
    }

    /**
     * Open the production order a planned line stands for, straight from the
     * report — "עם אופציה לייצור ישירות מהדוח בלחיצת כפתור".
     */
    async function produceFromPlan(sku) {
        const line = planFor(sku, 'production');
        const recipe = items.bomsOfParent(sku)[0] || null;

        if (!line || !recipe || line.state !== 'planned') {
            return null;
        }

        // A production order is stated in the recipe's own unit, not in the
        // unit the report planned in.
        const plannedQty = convertQty(
            line.qty,
            items.rowBySku(sku)?.uom?.stock || recipe.yield?.uom,
            recipe.yield?.uom,
        );

        if (plannedQty === null) {
            return null;
        }

        const order = await production.createOrder({
            bomId: recipe.id,
            plannedQty,
        });

        line.state = 'ordered';
        line.order = order?.id || null;

        return order;
    }

    /** A request withdrawn: its lines go back to being plans. */
    function cancelRequest(id, reason = '') {
        const request = requestById(id);

        if (!request || request.state === 'ordered') {
            return request;
        }

        request.state = 'cancelled';
        request.reason = reason.trim() || null;

        planLines.value.forEach((line) => {
            if (line.request === id) {
                line.state = 'planned';
                line.request = null;
            }
        });

        persist(
            `purchase-requests/${id}`,
            { state: 'cancelled', reason: request.reason },
            'PATCH',
        );

        return request;
    }

    // ---- can it be made ------------------------------------------------------

    /**
     * Whether a quantity of an item can actually be produced, and what is short.
     *
     * The note asks for exactly this before a run is opened — "המערכת תדע להתריע
     * לי אם אין ביכולתי לייצר את המוצר כי חסר לי משהו מפרטי הבנים, וכמובן גם
     * לציין מה בדיוק חסר לי". One level deep: the components of the item's own
     * recipe, against what is available now.
     */
    function producible(sku, qty) {
        const recipes = items.bomsOfParent(sku);

        if (!recipes.length) {
            return { ok: false, reason: 'noRecipe', short: [] };
        }

        const recipe = recipes[0];
        const row = items.rowBySku(sku);

        // The report plans in the unit the item is held in; the recipe yields
        // in the unit it was written in. A tincture is counted in litres and
        // made a thousand millilitres at a time, so the two have to be brought
        // to the same unit before anything is divided by anything.
        const wanted = convertQty(
            qty,
            row?.uom?.stock || recipe.yield?.uom,
            recipe.yield?.uom,
        );

        if (wanted === null) {
            return { ok: false, reason: 'unitMismatch', short: [], recipe };
        }

        const batch = Number(recipe.yield?.qty) || 1;
        const runs = wanted / batch;
        const short = [];

        recipe.components.forEach((component) => {
            const part = items.rowBySku(component.sku);
            const unit = part?.uom?.stock || component.uom || 'unit';

            // Same again on the way down: the recipe states the component in
            // its own unit, the stock figure is in the item's.
            const need = convertQty(
                (Number(component.qty) || 0) * runs,
                component.uom || unit,
                unit,
            );
            const have = part ? planningAvailable(part) : 0;

            if (need === null || have + 1e-9 < need) {
                short.push({
                    sku: component.sku,
                    name: part?.names || component.sku,
                    unit,
                    need,
                    have,
                    gap: need === null ? null : need - have,
                });
            }
        });

        return { ok: !short.length, reason: null, short, recipe };
    }

    // ---- what the drawer shows ----------------------------------------------

    const saving = ref(false);

    return {
        history,
        months,
        defaultWindow,
        openOrders,
        planLines,
        purchaseRequests,
        coverThresholds,
        saving,

        report,
        planFor,
        openOrdersOf,
        requestById,
        producible,
        plannedBySupplier,
        plannedForProduction,

        plan,
        clearPlan,
        raiseRequest,
        sendRequest,
        confirmRequest,
        cancelRequest,
        orderFromRequest,
        produceFromPlan,
    };
});
