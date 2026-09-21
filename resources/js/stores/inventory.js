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

import {
    ADJUST_REASON,
    BATCH_EXPIRY_WARN_DAYS,
    batchNumberFor,
    BATCH_PICK,
    DEFAULT_BATCH_NUMBER_SCHEME,
    DEFAULT_WAREHOUSE,
    HOUSE_SERIES_NEXT,
    INVENTORY_DOC_SERIES,
} from '@/config';
import { persist } from '@/data/source';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Document series. A deployment with no documents on file starts numbering here;
 * once one exists, the next number is derived from the highest one already used.
 */
const RECEIPT_SERIES = 'GR-';
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

/** Where one stock row stands against its minimum, as one value. */
export function stockRowState(row) {
    if (row.avail <= 0) {
        return 'out';
    }

    return row.low ? 'low' : 'ok';
}

/** How near a batch is to its expiry, in the windows a pharmacist works in. */
export function batchExpiryWindow(batch) {
    if (batch.daysToExp < 0) {
        return 'past';
    }

    if (batch.daysToExp < 30) {
        return 'd30';
    }

    if (batch.daysToExp < 60) {
        return 'd60';
    }

    if (batch.daysToExp < 90) {
        return 'd90';
    }

    return 'later';
}

/** What the stock table may be narrowed by. */
export const STOCK_FILTER_FIELDS = [
    {
        key: 'kind',
        group: 'what',
        kind: 'set',
        prefix: 'inventory.stockKind',
        values: (row) => [row.kind],
    },
    { key: 'wh', group: 'what', kind: 'set', values: (row) => [row.wh] },
    {
        key: 'state',
        group: 'level',
        kind: 'set',
        prefix: 'inventory.filter.stockState',
        values: (row) => [stockRowState(row)],
    },
    { key: 'avail', group: 'level', kind: 'num', value: (row) => row.avail },
    { key: 'alloc', group: 'level', kind: 'num', value: (row) => row.alloc },
];

export const STOCK_FILTER_GROUPS = ['what', 'level'];

/** What the batch table may be narrowed by. */
export const BATCH_FILTER_FIELDS = [
    {
        key: 'bstate',
        group: 'state',
        kind: 'set',
        prefix: 'batchState',
        values: (batch) => [batch.state],
    },
    {
        key: 'bexp',
        group: 'state',
        kind: 'set',
        prefix: 'inventory.filter.expiryWindow',
        values: (batch) => [batchExpiryWindow(batch)],
    },
    { key: 'bwh', group: 'where', kind: 'set', values: (batch) => [batch.wh] },
    {
        key: 'bitem',
        group: 'where',
        kind: 'set',
        values: (batch) => [batch.sku],
    },
    {
        key: 'bleft',
        group: 'level',
        kind: 'num',
        value: (batch) => batch.remaining,
    },
];

export const BATCH_FILTER_GROUPS = ['state', 'where', 'level'];

/** What the goods-receipt list may be narrowed by. */
export const RECEIPT_FILTER_FIELDS = [
    {
        key: 'rsup',
        group: 'who',
        kind: 'set',
        values: (receipt) => [optionKey(receipt.supplier)],
    },
    {
        key: 'rby',
        group: 'who',
        kind: 'set',
        values: (receipt) => [optionKey(receipt.by)],
    },
    {
        key: 'rpo',
        group: 'what',
        kind: 'set',
        prefix: 'inventory.filter.poState',
        values: (receipt) => [receipt.po ? 'yes' : 'no'],
    },
    {
        key: 'rlines',
        group: 'what',
        kind: 'num',
        value: (receipt) => (receipt.lines || []).length,
    },
];

export const RECEIPT_FILTER_GROUPS = ['who', 'what'];

/** What the stock-movement ledger may be narrowed by. */
export const MOVEMENT_FILTER_FIELDS = [
    {
        key: 'mkind',
        group: 'what',
        kind: 'set',
        prefix: 'stockMove',
        values: (move) => [move.kind],
    },
    { key: 'mwh', group: 'what', kind: 'set', values: (move) => [move.wh] },
    { key: 'mitem', group: 'where', kind: 'set', values: (move) => [move.sku] },
    {
        key: 'mdir',
        group: 'where',
        kind: 'set',
        prefix: 'inventory.filter.moveDir',
        values: (move) => [move.qty < 0 ? 'out' : 'in'],
    },
];

export const MOVEMENT_FILTER_GROUPS = ['what', 'where'];

/**
 * What the ingredient catalogue can be filtered by, declared once beside the
 * store that holds it.
 *
 * The units are not a fixed list: SAP keeps herbs in grams, bases in millilitres
 * and some raw material by the kilogram, and a facet reads whatever the rows
 * actually carry — so a unit can never go missing from the filter because a
 * constant somewhere forgot it.
 *
 * There is no display text here: `group` and every value are ids, and the
 * drawer resolves them through the locale catalogs.
 */
export const INGREDIENT_FILTER_FIELDS = [
    {
        key: 'ikind',
        group: 'what',
        kind: 'set',
        prefix: 'ingredients.kind',
        values: (row) => [row.kind],
    },
    {
        key: 'isys',
        group: 'what',
        kind: 'set',
        prefix: 'ingredients.system',
        values: (row) => [row.system || 'west'],
    },
    {
        key: 'iunit',
        group: 'what',
        kind: 'set',
        prefix: 'ingredients.unit',
        values: (row) => (row.unit ? [row.unit] : []),
    },
    {
        key: 'iwh',
        group: 'stock',
        kind: 'set',
        values: (row) => (row.wh ? [row.wh] : []),
    },
    {
        key: 'istk',
        group: 'stock',
        kind: 'set',
        prefix: 'ingredients.filter.stockState',
        values: (row) => [row.avail > 0 ? (row.low ? 'low' : 'ok') : 'zero'],
    },
    {
        key: 'iavail',
        group: 'stock',
        kind: 'num',
        value: (row) => row.avail || 0,
    },
    {
        key: 'ipg',
        group: 'pricing',
        kind: 'set',
        values: (row) => [row.group?.id || 'none'],
    },
];

export const INGREDIENT_FILTER_GROUPS = ['what', 'stock', 'pricing'];

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

    /**
     * FEFO by expiry — the pharmacy's rule — or FIFO by receipt date. A setting
     * the console edits since V2 (inventorySettings.pickMode); config is the default.
     */
    const pickMode = computed(
        () => dataset.data.inventorySettings?.pickMode || BATCH_PICK.mode,
    );

    /**
     * Batches of one item that may still be drawn from, in pick order. Waste
     * batches stay out unless the caller's preparation type accepts waste.
     */
    const openBatchesOf = (sku, { allowWaste = false } = {}) =>
        batchesOf(sku)
            .filter(
                (batch) =>
                    batch.remaining > 0 &&
                    batch.state !== 'rejected' &&
                    (allowWaste || !batch.waste),
            )
            .sort((a, b) =>
                pickMode.value === 'fifo'
                    ? String(a.received?.iso || '').localeCompare(
                          String(b.received?.iso || ''),
                      )
                    : a.daysToExp - b.daysToExp,
            );

    const useOfBatch = (id) => batchUse.value.filter((row) => row.batch === id);

    /** Open waste batches of one item, nearest expiry first. */
    const wasteBatchesOf = (sku) =>
        batchesOf(sku)
            .filter((batch) => batch.waste && batch.remaining > 0)
            .sort((a, b) => a.daysToExp - b.daysToExp);

    /** How much of an item's stock is waste — "of which waste: N". */
    const wasteOf = (sku) =>
        wasteBatchesOf(sku).reduce((sum, batch) => sum + batch.remaining, 0);

    /**
     * When time-consumed stock runs out at the current pace, as an ISO date —
     * or null when the item is not consumed by the calendar.
     */
    const runOutOn = (sku, consumption) => {
        const row = itemBySku(sku);

        if (!row || !consumption?.qty || !consumption?.periodDays) {
            return null;
        }

        const perDay = consumption.qty / consumption.periodDays;
        const days = Math.floor(Math.max(0, row.onHand) / perDay);

        return isoDaysAgo(-days);
    };

    /** How many batches of an item still hold quantity. */
    const liveBatchCount = (sku) =>
        batchesOf(sku).filter((batch) => batch.remaining > 0).length;

    /**
     * The documents stock moved on. SAP posts nothing without one, so every
     * receipt, issue, count and transfer here is a row the screen can open.
     */
    const inventoryDocs = computed(() => dataset.data.inventoryDocs || []);

    const docById = (id) =>
        inventoryDocs.value.find((doc) => String(doc.id) === String(id)) ||
        null;

    /** The next document number in SAP's own block. */
    const nextDocNumber = () =>
        String(
            inventoryDocs.value.reduce(
                (top, doc) => Math.max(top, Number(doc.id) || 0),
                INVENTORY_DOC_SERIES,
            ) + 1,
        );

    /**
     * Post one inventory document. Everything that moves stock goes through
     * here, so the paperwork and the ledger can never disagree.
     */
    function postDoc(doc) {
        const record = {
            base: 'manual',
            baseRef: null,
            supplier: null,
            supplierCode: null,
            receipt: null,
            remarks: null,
            warehouse: DEFAULT_WAREHOUSE,
            by: dataset.me?.name || null,
            ...doc,
            id: nextDocNumber(),
            when: doc.when || moment(),
        };

        bag('inventoryDocs').unshift(record);

        return record;
    }

    /**
     * The number shown, printed and scanned for a batch. V3.
     *
     * A batch's `id` is the record's key and nothing else; `number` is what the
     * pharmacy calls it. The two are the same for a batch this console
     * numbered, and differ whenever a supplier's code is not unique — 2,914 of
     * the numbers in the live database are shared by more than one item, so the
     * number cannot also be the key.
     */
    const batchNo = (batch) => {
        const row = typeof batch === 'string' ? batchById(batch) : batch;

        return row ? row.number || row.id : batch || '';
    };

    /**
     * The next number in the pharmacy's own running series. V3.
     *
     * It carries on from the workbook and from SAP rather than restarting, so
     * no number is ever handed out twice and an old label still means what it
     * meant. Natalie: "סדר רץ של ספרור אצוות בקבלה מיצור צריך להתקבל אוטומטית
     * מהמערכת ללא יכולת שינוי ידנית כדי למנוע כפילויות".
     */
    const houseSerial = computed(() =>
        batches.value.reduce((top, batch) => {
            const n = Number(batch.number ?? batch.id);

            return Number.isInteger(n) && n > top ? n : top;
        }, HOUSE_SERIES_NEXT - 1),
    );

    /**
     * How many batches an item has already had this year — the serial inside a
     * structured number, for the scheme Yaron proposed.
     */
    const yearSerialOf = (sku, year) =>
        batches.value.filter(
            (batch) =>
                batch.sku === sku &&
                String(batch.number || '').startsWith(`${year}${sku}`),
        ).length + 1;

    /** The numbering scheme in force — a setting, because it is not settled. */
    const batchScheme = computed(
        () =>
            dataset.data.inventorySettings?.batchScheme ||
            DEFAULT_BATCH_NUMBER_SCHEME,
    );

    /**
     * The number and the key a new batch opens under. V3.
     *
     * `ahead` lets one screen number several new batches in one go — a receipt
     * of eight herbs — without each asking the store and getting the same
     * answer.
     */
    const nextBatchNumber = ({
        sku,
        kind = 'production',
        supplierBatch = '',
        production = '',
        ahead = 0,
    } = {}) => {
        const year = String(isoDaysAgo(0).slice(2, 4));
        const number = batchNumberFor({
            kind,
            sku,
            scheme: batchScheme.value,
            serial: houseSerial.value + 1 + ahead,
            yearSerial: yearSerialOf(sku, year) + ahead,
            supplierBatch,
            production,
            year,
        });

        if (!number) {
            return { number: '', id: '' };
        }

        // The key has to be unique even when the number is not.
        let id = number;
        let n = 1;

        while (batches.value.some((batch) => batch.id === id)) {
            n += 1;
            id = `${number}/${n}`;
        }

        return { number, id };
    };

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
            (supplier) =>
                (form.supplierCode && supplier.code === form.supplierCode) ||
                optionKey(supplier.name) === optionKey(form.supplier),
        );
        const supplier = known ? known.name : form.supplier;
        const supplierCode = known ? known.code : form.supplierCode || null;

        const lines = form.lines.map((line) => {
            const item = itemBySku(line.sku);
            // V2: a line may top up an existing batch instead of opening one; it
            // then takes that batch's number, expiry and supplier batch.
            const existing = line.existingBatch
                ? batchById(line.existingBatch)
                : null;

            // V3 — the number is the supplier's own code; the key is derived
            // from it and made unique, because two items may legitimately carry
            // the same supplier batch.
            const minted = existing
                ? { id: existing.id, number: batchNo(existing) }
                : nextBatchNumber({
                      sku: line.sku,
                      kind: line.waste ? 'waste' : 'purchase',
                      supplierBatch: line.supplierBatch,
                      production: line.supplierBatch,
                  });

            return {
                sku: line.sku,
                name: item ? item.name : line.sku,
                unit: item ? item.unit : null,
                qty: Number(line.qty),
                wh: line.wh,
                batch: minted.id,
                number: minted.number,
                waste: Boolean(line.waste) && !existing,
                madeOn: existing
                    ? existing.madeOn || null
                    : line.madeOn || null,
                expiry: existing ? existing.expiry : line.expiry,
                supplierBatch: existing
                    ? existing.supplierBatch
                    : String(line.supplierBatch || '').trim() || null,
                existing: Boolean(existing),
                // V2: the price becomes the item card's last purchase price,
                // and the label count feeds the labels module.
                price:
                    line.price === '' ||
                    line.price === null ||
                    line.price === undefined
                        ? null
                        : Number(line.price),
                currency: line.currency || null,
                labels: Number(line.labels) || 0,
            };
        });

        bag('receipts').unshift({
            id,
            supplier,
            supplierCode,
            po: form.po || null,
            docNum: String(form.docNum).trim(),
            when,
            by,
            note: form.note.trim() || null,
            lines,
            batches: lines.map((line) => line.batch),
        });

        // SAP posts a goods receipt for the delivery; the console does the same
        // so the document list and the ledger agree.
        postDoc({
            type: 'goods_receipt',
            base: form.po ? 'purchase_order' : 'manual',
            baseRef: form.po || null,
            warehouse: lines[0]?.wh || DEFAULT_WAREHOUSE,
            supplier,
            supplierCode,
            receipt: id,
            remarks: form.note.trim() || null,
            when,
            by,
            lines: lines.map((line) => ({
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                qty: line.qty,
                wh: line.wh,
                batch: line.batch,
                price: line.price ?? null,
            })),
        });

        lines.forEach((line) => {
            if (line.existing) {
                // Topping up: the batch grows, keeps its expiry, and this
                // receipt is one more document behind it.
                const batch = batchById(line.batch);

                batch.qty += line.qty;
                batch.remaining += line.qty;
                syncBatch(batch);
            } else {
                const batch = {
                    id: line.batch,
                    // V3 — what the pharmacy calls it, which for goods from a
                    // supplier is the supplier's own batch code.
                    number: line.number,
                    sku: line.sku,
                    name: line.name,
                    unit: line.unit,
                    wh: line.wh,
                    // Every batch says where it came from; without it the trace
                    // drawer has nothing to show and FEFO cannot tell waste
                    // from whole material.
                    source: line.waste ? 'waste' : 'supplier',
                    production: null,
                    receipt: id,
                    supplier,
                    supplierBatch: line.supplierBatch,
                    received: when,
                    // V3 — when the goods were made, as against when they came
                    // in. `received` is the pharmacy's date; this is the
                    // supplier's, and only the supplier can supply it.
                    madeOn: line.madeOn,
                    qty: line.qty,
                    remaining: line.qty,
                    expiry: line.expiry,
                    daysToExp: -daysSince(line.expiry),
                    state: 'active',
                    waste: Boolean(line.waste),
                    unitCost: line.price ?? null,
                    components: null,
                    by,
                };

                syncBatch(batch);
                bag('batches').unshift(batch);
            }

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

        // V2: the receipt writes the item card's "last purchase" — price,
        // currency, date — and its last supplier.
        const cards = Array.isArray(dataset.data.items)
            ? dataset.data.items
            : [];

        lines.forEach((line) => {
            const card = cards.find((row) => row.sku === line.sku);

            if (!card) {
                return;
            }

            if (line.price !== null) {
                card.price = {
                    ...card.price,
                    lastPurchase: line.price,
                    currency: line.currency || card.price?.currency || 'ILS',
                    lastPurchaseOn: when.iso,
                };
            }

            if (supplierCode) {
                card.suppliers = { ...card.suppliers, last: supplierCode };
            }
        });

        await persist('inventory/receipts', {
            id,
            docNum: String(form.docNum).trim(),
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
    /**
     * Open a batch that did not come through a goods receipt — a production
     * run's output or its waste. The record is completed with the fields every
     * batch carries, aged against its expiry, and put first in the list.
     */
    function openBatch(record) {
        const batch = {
            receipt: null,
            production: null,
            supplier: null,
            supplierBatch: null,
            // V3 — what the pharmacy calls this batch. See `batchNo`.
            number: record.number || record.id,
            // V3 — a batch the pharmacy made was made the day it was received.
            madeOn: record.received?.iso || null,
            remaining: record.qty,
            daysToExp: -daysSince(record.expiry),
            state: 'active',
            waste: false,
            unitCost: null,
            components: null,
            ...record,
        };

        syncBatch(batch);
        bag('batches').unshift(batch);

        return batch;
    }

    /**
     * Fold every open waste batch of an item into one new W- batch, so the
     * pile of small ones a year of grinding leaves behind reads as one line.
     * The merged batch keeps the earliest expiry and remembers its parts.
     */
    async function mergeWaste(sku) {
        const parts = wasteBatchesOf(sku);

        if (parts.length < 2) {
            return null;
        }

        const row = itemBySku(sku);
        const { id, number } = nextBatchNumber({
            sku,
            kind: 'waste',
            production: parts[0]?.production || '',
        });
        const qty = parts.reduce((sum, batch) => sum + batch.remaining, 0);
        const earliest = parts.reduce((best, batch) =>
            batch.daysToExp < best.daysToExp ? batch : best,
        );
        const when = moment();
        const by = dataset.me?.name || null;

        parts.forEach((batch) => {
            writeMovement({
                id: `mv-merge-${batch.id}`,
                kind: 'waste_merge',
                sku,
                name: batch.name,
                unit: batch.unit,
                wh: batch.wh,
                qty: -batch.remaining,
                batch: batch.id,
                ref: id,
                when,
                by,
            });
            batch.remaining = 0;
            syncBatch(batch);
        });

        const merged = {
            id,
            number,
            sku,
            name: row ? row.name : earliest.name,
            unit: earliest.unit,
            wh: earliest.wh,
            source: 'waste',
            receipt: null,
            production: parts[0]?.production || null,
            supplier: null,
            supplierBatch: null,
            received: when,
            qty,
            remaining: qty,
            expiry: earliest.expiry,
            daysToExp: earliest.daysToExp,
            state: 'active',
            waste: true,
            unitCost: null,
            components: parts.map((batch) => ({
                sku,
                batch: batch.id,
                qty: batch.qty,
            })),
            by,
        };

        syncBatch(merged);
        bag('batches').unshift(merged);
        writeMovement({
            id: `mv-merge-in-${id}`,
            kind: 'waste_merge',
            sku,
            name: merged.name,
            unit: merged.unit,
            wh: merged.wh,
            qty,
            batch: id,
            ref: null,
            when,
            by,
        });
        writeLog({
            act: 'stock_adjust',
            entType: 'batch',
            ent: id,
            from: parts.map((batch) => batch.id).join(', '),
            to: String(qty),
        });
        await persist(`inventory/waste/${sku}/merge`, {
            batches: parts.map((batch) => batch.id),
        });

        return merged;
    }

    /**
     * A physical count of time-consumed stock: the figure on the shelf becomes
     * the figure in the system, the gap is one `count` movement, and the
     * consumption clock restarts from today.
     */
    async function recordCount(sku, countedQty, note = '') {
        const row = itemBySku(sku);

        if (!row) {
            throw new Error(`Cannot count ${sku}`);
        }

        const counted = Math.max(0, Number(countedQty) || 0);
        const delta = counted - row.onHand;
        const when = moment();

        row.onHand = counted;
        syncRow(row);

        if (delta !== 0) {
            const doc = postDoc({
                type: 'count',
                warehouse: row.wh,
                remarks: note.trim() || null,
                when,
                lines: [
                    {
                        sku,
                        name: row.name,
                        unit: row.unit,
                        qty: delta,
                        counted,
                        inStock: counted - delta,
                        wh: row.wh,
                        batch: null,
                        price: null,
                    },
                ],
            });

            writeMovement({
                id: `mv-count-${sku}-${when.iso}`,
                kind: 'count',
                sku,
                name: row.name,
                unit: row.unit,
                wh: row.wh,
                qty: delta,
                batch: null,
                ref: doc.id,
                when,
                by: dataset.me?.name || null,
            });
        }

        writeLog({
            act: 'stock_adjust',
            entType: 'catalog_item',
            ent: sku,
            from: String(row.onHand - delta),
            to: String(counted),
            note: note || null,
        });
        await persist(`inventory/count/${sku}`, { counted, note });

        return { counted, delta, countedOn: when.iso };
    }

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

        // SAP has no "adjustment": stock that appears is a goods receipt and
        // stock that disappears is a goods issue, and both are documents.
        const adjustment = moved.length
            ? postDoc({
                  type:
                      moved.reduce((sum, row) => sum + row.delta, 0) >= 0
                          ? 'goods_receipt'
                          : 'goods_issue',
                  warehouse: item.wh,
                  remarks: form.note.trim() || null,
                  lines: moved.map(({ id, delta }) => ({
                      sku: item.sku,
                      name: item.name,
                      unit: item.unit,
                      qty: delta,
                      wh: item.wh,
                      batch: id,
                      price: null,
                  })),
              })
            : null;

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
                ref: adjustment ? adjustment.id : null,
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
        inventoryDocs,
        docById,
        postDoc,
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
        batchNo,
        houseSerial,
        batchScheme,
        nextBatchNumber,
        pickMode,

        itemBySku,
        batchById,
        receiptById,
        batchesOf,
        openBatchesOf,
        openBatch,
        syncRow,
        syncBatch,
        writeMovement,
        wasteBatchesOf,
        wasteOf,
        runOutOn,
        mergeWaste,
        recordCount,
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
