// Inventory: stock rows, goods receipts, batches and the stock ledger.
//
// The rows come from the dataset store — nothing here imports the fixture — and
// everything the screens need is a derivation of them. Two business rules live
// in this file because they are the ones a screen must never re-invent:
//
//   1. Stock enters ONLY through a goods receipt. Each receipt line opens one
//      batch with its own number and expiry, so every gram in stock can be
//      traced back to a delivery note and forward to the customer who got it.
//   2. Batches are consumed nearest-expiry-first (config BATCH_PICK is `fifo`).
//      A count adjustment that finds less than the books say deducts the gap
//      from the batches themselves, FIFO, spilling into the next batch — so the
//      item total and the sum of its batches never drift apart.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { ADJUST_REASON, BATCH_EXPIRY_WARN_DAYS } from '@/config';
import { persist } from '@/data/source';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Document series. A deployment with no documents on file starts numbering here;
 * once one exists, the next number is derived from the highest one already used.
 */
const RECEIPT_SERIES = 'GR-';
const BATCH_SERIES = 'B-';
const FIRST_SERIAL = 1;

/** The highest trailing number in a set of ids, plus one. */
function nextSerial(ids, series) {
    const highest = ids.reduce((top, id) => {
        const digits = String(id).match(/(\d+)\s*$/);

        return digits ? Math.max(top, Number(digits[1])) : top;
    }, 0);

    return `${series}${highest ? highest + 1 : FIRST_SERIAL}`;
}

/** A stable option key for a value that may be a `{ he, en }` record pair. */
export function optionKey(value) {
    return isLocalized(value) ? value.he : String(value ?? '');
}

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

export const useInventoryStore = defineStore('inventory', () => {
    const dataset = useDatasetStore();

    const stock = computed(() => dataset.stock);
    const batches = computed(() => dataset.batches);
    const receipts = computed(() => dataset.receipts);
    const movements = computed(() => dataset.movements);
    const batchUse = computed(() => dataset.data.batchUse || []);

    // ---- derivations -------------------------------------------------------

    const lowStock = computed(() => stock.value.filter((row) => row.low));

    const liveBatches = computed(() =>
        batches.value.filter((batch) => batch.remaining > 0),
    );

    const expiringBatches = computed(() =>
        liveBatches.value.filter((batch) => batch.state === 'expiring'),
    );

    const expiredBatches = computed(() =>
        liveBatches.value.filter((batch) => batch.state === 'expired'),
    );

    const itemBySku = (sku) => stock.value.find((row) => row.sku === sku);
    const batchById = (id) => batches.value.find((batch) => batch.id === id);
    const receiptById = (id) =>
        receipts.value.find((receipt) => receipt.id === id);

    const batchesOf = (sku) =>
        batches.value.filter((batch) => batch.sku === sku);

    /** Batches of one item that may still be drawn from, nearest expiry first. */
    const openBatchesOf = (sku) =>
        batchesOf(sku)
            .filter(
                (batch) => batch.remaining > 0 && batch.state !== 'rejected',
            )
            .sort((a, b) => a.daysToExp - b.daysToExp);

    const useOfBatch = (id) => batchUse.value.filter((row) => row.batch === id);

    /** How many batches of an item still hold quantity. */
    const liveBatchCount = (sku) =>
        batchesOf(sku).filter((batch) => batch.remaining > 0).length;

    /** The batch number the next receipt line would open. */
    const nextBatchNo = computed(() =>
        nextSerial(
            batches.value.map((batch) => batch.id),
            BATCH_SERIES,
        ),
    );

    /** Distinct suppliers and receivers across the receipts, with their counts. */
    const facet = (pick) =>
        computed(() => {
            const seen = new Map();

            receipts.value.forEach((receipt) => {
                const value = pick(receipt);
                const key = optionKey(value);

                if (!key) {
                    return;
                }

                const row = seen.get(key);

                if (row) {
                    row.n += 1;
                } else {
                    seen.set(key, { key, label: value, n: 1 });
                }
            });

            return [...seen.values()];
        });

    const receiptSuppliers = facet((receipt) => receipt.supplier);
    const receiptReceivers = facet((receipt) => receipt.by);

    /**
     * Names to hint at in the supplier field. A receipt records the supplier as
     * plain data — there are no purchase orders here and nothing links the two —
     * so the field stays free text and these are only suggestions.
     */
    const supplierHints = computed(() =>
        dataset.suppliers.map((supplier) => supplier.name),
    );

    /**
     * Which batches a quantity would be drawn from, nearest expiry first.
     *
     * @returns {{ steps: Array<{batch: object, take: number, after: number}>,
     *            short: number }} `short` is what the open batches cannot cover.
     */
    function fifoPlan(sku, qty) {
        const steps = [];
        let left = Math.max(0, Number(qty) || 0);

        for (const batch of openBatchesOf(sku)) {
            if (left <= 0) {
                break;
            }

            const take = Math.min(batch.remaining, left);

            left -= take;
            steps.push({ batch, take, after: batch.remaining - take });
        }

        return { steps, short: left };
    }

    // ---- mutations ---------------------------------------------------------

    /** Keep a stock row's derived fields in step after any quantity change. */
    function syncRow(row) {
        row.avail = row.onHand - row.alloc;
        row.low = row.avail < row.min;
    }

    /**
     * A batch's state follows from what is left in it and how far off its expiry
     * is. A rejected batch stays rejected whatever its quantity.
     */
    function syncBatch(batch) {
        if (batch.state === 'rejected') {
            return;
        }

        if (batch.remaining <= 0) {
            batch.state = 'depleted';

            return;
        }

        if (batch.daysToExp < 0) {
            batch.state = 'expired';

            return;
        }

        batch.state =
            batch.daysToExp < BATCH_EXPIRY_WARN_DAYS ? 'expiring' : 'active';
    }

    /** The collection to write into, created on first use. */
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
            // Not recorded in the browser: the address belongs to the request
            // that performed the action, and there is no request behind this.
            ip: null,
            ...row,
        });
    }

    function writeMovement(row) {
        bag('movements').unshift({ ...row, when: row.when || moment() });
    }

    /**
     * Receive goods into stock: one receipt, one batch per line, the item totals
     * raised, and one ledger row per batch.
     *
     * @param {{supplier: *, docNum: string, date: string, note: string,
     *          lines: Array<object>}} form
     * @returns {Promise<{id: string, batches: string[]}>}
     */
    async function receiveGoods(form) {
        const id = nextSerial(
            receipts.value.map((receipt) => receipt.id),
            RECEIPT_SERIES,
        );
        const when = moment(form.date);
        const by = dataset.me?.name || null;
        const known = dataset.suppliers.find(
            (supplier) => optionKey(supplier.name) === optionKey(form.supplier),
        );
        const supplier = known ? known.name : form.supplier;

        const lines = form.lines.map((line) => {
            const item = itemBySku(line.sku);

            return {
                sku: line.sku,
                name: item ? item.name : line.sku,
                unit: item ? item.unit : null,
                qty: Number(line.qty),
                wh: line.wh,
                batch: line.batch.trim(),
                expiry: line.expiry,
                supplierBatch: line.supplierBatch.trim() || null,
            };
        });

        bag('receipts').unshift({
            id,
            supplier,
            supplierCode: known ? known.code : null,
            docNum: form.docNum.trim(),
            when,
            by,
            note: form.note.trim() || null,
            lines,
            batches: lines.map((line) => line.batch),
        });

        lines.forEach((line) => {
            const batch = {
                id: line.batch,
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                wh: line.wh,
                receipt: id,
                supplier,
                supplierBatch: line.supplierBatch,
                received: when,
                qty: line.qty,
                remaining: line.qty,
                expiry: line.expiry,
                daysToExp: -daysSince(line.expiry),
                state: 'active',
                by,
            };

            syncBatch(batch);
            bag('batches').unshift(batch);

            const item = itemBySku(line.sku);

            if (item) {
                item.onHand += line.qty;
                syncRow(item);
            }

            writeMovement({
                id: `mv-in-${line.batch}`,
                kind: 'goods_in',
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                wh: line.wh,
                qty: line.qty,
                batch: line.batch,
                ref: id,
                when,
                by,
            });

            writeLog({
                act: 'goods_in',
                entType: 'batch',
                ent: line.batch,
                to: String(line.qty),
                note: form.note.trim() || null,
            });
        });

        await persist('inventory/receipts', {
            id,
            docNum: form.docNum.trim(),
            lines,
        });

        return { id, batches: lines.map((line) => line.batch) };
    }

    /**
     * The one stock adjustment, with the three reasons of ADJUST_REASONS.
     *
     * `count` SETS the quantity to what was physically found and records the
     * variance; `damage` and `reject` DEDUCT a quantity from a named batch. A
     * rejection also blocks the batch from compounding, whatever is left in it.
     *
     * @param {{sku: string, reason: string, qty: number, batch?: string,
     *          note: string}} form
     * @returns {Promise<{before: number, after: number, diff: number,
     *                    moved: Array<{id: string, delta: number}>}>}
     */
    async function adjustStock(form) {
        const item = itemBySku(form.sku);
        const rule = ADJUST_REASON[form.reason];

        if (!item || !rule) {
            throw new Error(`Cannot adjust ${form.sku} for ${form.reason}`);
        }

        const qty = Math.max(0, Number(form.qty) || 0);
        const before = item.onHand;
        const moved = [];

        if (rule.mode === 'set') {
            item.onHand = qty;

            const gap = before - qty;

            if (gap > 0) {
                fifoPlan(item.sku, gap).steps.forEach(({ batch, take }) => {
                    batch.remaining -= take;
                    syncBatch(batch);
                    moved.push({ id: batch.id, delta: -take });
                });
            } else if (gap < 0) {
                const [nearest] = openBatchesOf(item.sku);

                if (nearest) {
                    nearest.remaining += -gap;
                    syncBatch(nearest);
                    moved.push({ id: nearest.id, delta: -gap });
                }
            }
        } else {
            item.onHand = Math.max(0, before - qty);

            const batch = batchById(form.batch);

            if (batch) {
                batch.remaining = Math.max(0, batch.remaining - qty);

                if (form.reason === 'reject') {
                    batch.state = 'rejected';
                } else {
                    syncBatch(batch);
                }

                moved.push({ id: batch.id, delta: -qty });
            }
        }

        syncRow(item);

        const after = item.onHand;

        moved.forEach(({ id, delta }) =>
            writeMovement({
                id: `mv-adj-${id}-${movements.value.length}`,
                kind: 'adjustment',
                sku: item.sku,
                name: item.name,
                unit: item.unit,
                wh: item.wh,
                qty: delta,
                batch: id,
                // An adjustment has no document of its own — the log row it
                // wrote is the record, and the ledger points at the batch.
                ref: null,
                by: dataset.me?.name || null,
            }),
        );

        writeLog({
            act: form.reason === 'reject' ? 'batch_reject' : 'stock_adjust',
            // A count is an adjustment of the item, not of one batch; the log
            // taxonomy has no stock-item entity, so it is filed under `system`.
            entType: rule.mode === 'set' ? 'system' : 'batch',
            ent: rule.mode === 'set' ? item.sku : form.batch,
            from: String(before),
            to: String(after),
            note: form.note.trim(),
        });

        await persist('inventory/adjustments', {
            sku: item.sku,
            reason: form.reason,
            qty,
            batch: form.batch || null,
        });

        return { before, after, diff: after - before, moved };
    }

    // ---- ingredient catalogue ----------------------------------------------
    //
    // "רכיבי פורמולה" is the one place a formula ingredient is created: the same
    // record is the item the compounding wizard offers and the row the warehouse
    // counts. Only the identity and catalogue fields are edited here — a
    // quantity never changes on this screen, it enters through a goods receipt
    // and leaves through compounding or an adjustment.

    /** Every stock row that is a formula ingredient — shelf products excluded. */
    const ingredients = computed(() =>
        stock.value.filter((row) => row.kind !== 'shelf'),
    );

    /** True when a SKU (or pricing code) is already held by a different row. */
    function skuTaken(sku, field, exceptSku) {
        const wanted = String(sku || '').trim();

        return stock.value.some(
            (row) =>
                row.sku !== exceptSku &&
                String(row[field] || '').trim() === wanted,
        );
    }

    /**
     * Why an ingredient cannot be deleted, or null when it can. An ingredient is
     * only removable once nothing depends on it — no stock on hand, no batches,
     * no formula uses it — so deleting never orphans historical data.
     */
    function ingredientBlock(row) {
        const batchCount = batchesOf(row.sku).length;
        const inFormulas = row.herbId
            ? (dataset.data.formulaTemplates || []).filter((template) =>
                  (template.herbs || []).includes(row.herbId),
              ).length
            : 0;

        if (row.onHand > 0 || batchCount || inFormulas) {
            return {
                onHand: row.onHand,
                batches: batchCount,
                formulas: inFormulas,
            };
        }

        return null;
    }

    /**
     * Create or update an ingredient. On create the row enters with zero stock —
     * quantity only ever arrives through a goods receipt. When the ingredient is
     * a raw herb, its shared herb record is kept in step so the compounding
     * wizard and the label show the same name.
     */
    async function saveIngredient(form, existingSku = null) {
        const rows = bag('stock');
        const isNew = !existingSku;

        if (isNew) {
            const row = {
                sku: form.sku,
                priceSku: form.priceSku || null,
                herbId: form.kind === 'raw' ? `ing-${form.sku}` : null,
                kind: form.kind,
                name: form.name,
                lat: form.lat || null,
                cn: form.cn || null,
                system: form.system,
                wh: form.wh,
                unit: form.unit,
                size: null,
                sizeUnit: null,
                price: null,
                onHand: 0,
                alloc: 0,
                min: form.min,
                created: isoDaysAgo(0),
            };

            syncRow(row);
            rows.unshift(row);

            const herbs = dataset.data.herbsById;

            if (row.herbId && herbs) {
                herbs[row.herbId] = {
                    id: row.herbId,
                    name: form.name,
                    lat: form.lat || null,
                    cn: form.cn || null,
                    system: form.system,
                };
            }

            writeLog({
                act: 'ingredient_create',
                entType: 'catalog_item',
                ent: form.sku,
                to: optionKey(form.name),
            });
            await persist('inventory/ingredients', form);

            return { created: true, row };
        }

        const row = itemBySku(existingSku);

        if (!row) {
            return { created: false, row: null };
        }

        Object.assign(row, {
            name: form.name,
            lat: form.lat || null,
            cn: form.cn || null,
            kind: form.kind,
            priceSku: form.priceSku || null,
            unit: form.unit,
            wh: form.wh,
            system: form.system,
            min: form.min,
        });
        syncRow(row);

        const herbs = dataset.data.herbsById;

        if (row.herbId && herbs?.[row.herbId]) {
            Object.assign(herbs[row.herbId], {
                name: form.name,
                lat: form.lat || null,
                cn: form.cn || null,
                system: form.system,
            });
        }

        writeLog({
            act: 'ingredient_update',
            entType: 'catalog_item',
            ent: row.sku,
            to: optionKey(form.name),
        });
        await persist(`inventory/ingredients/${row.sku}`, form, 'PATCH');

        return { created: false, row };
    }

    /** Remove an ingredient that nothing depends on (see `ingredientBlock`). */
    async function removeIngredient(sku, reason = '') {
        const rows = bag('stock');
        const index = rows.findIndex((row) => row.sku === sku);

        if (index < 0) {
            return false;
        }

        const [row] = rows.splice(index, 1);
        const herbs = dataset.data.herbsById;

        if (row.herbId && herbs) {
            delete herbs[row.herbId];
        }

        writeLog({
            act: 'ingredient_delete',
            entType: 'catalog_item',
            ent: sku,
            from: optionKey(row.name),
            to: reason,
        });
        await persist(`inventory/ingredients/${sku}`, { reason }, 'DELETE');

        return true;
    }

    return {
        stock,
        batches,
        receipts,
        movements,
        batchUse,
        ingredients,

        lowStock,
        liveBatches,
        expiringBatches,
        expiredBatches,
        receiptSuppliers,
        receiptReceivers,
        supplierHints,
        nextBatchNo,

        itemBySku,
        batchById,
        receiptById,
        batchesOf,
        openBatchesOf,
        useOfBatch,
        liveBatchCount,
        fifoPlan,

        receiveGoods,
        adjustStock,

        skuTaken,
        ingredientBlock,
        saveIngredient,
        removeIngredient,
    };
});
