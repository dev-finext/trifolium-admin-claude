// Inventory: stock rows, goods receipts, batches and the stock ledger.
//
// The rows come from the dataset store — nothing here imports the fixture — and
// everything the screens need is a derivation of them. Two business rules live
// in this file because they are the ones a screen must never re-invent:
//
//   1. Stock enters ONLY through a goods receipt. Each receipt line opens one
//      batch with its own number and expiry, so every gram in stock can be
//      traced back to a delivery note and forward to the customer who got it.
//   2. Batches are consumed nearest-expiry-first — FEFO, the only rule
//      (DEMO_INVENTORY_FIXES_PROMPT.md §5.1). Expired and waste batches are
//      skipped; a plan that spills past one batch moves into the next.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    BATCH_EXPIRY_WARN_DAYS,
    batchNumberFor,
    DEFAULT_WAREHOUSE,
    HOUSE_SERIES_NEXT,
    INVENTORY_DOC_SERIES,
    liveOnly,
    MAIN_WAREHOUSE,
    REASON,
} from '@/config';
import { persist } from '@/data/source';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { isLocalized } from '@/lib/localized';
import { convertQty } from '@/lib/units';
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

/** Three decimals — a gram of a herb kept in kilograms. */
const round3 = (value) => Math.round(value * 1000) / 1000;

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

/**
 * Where a batch sits in the nearest-expiry-first order. A batch SAP holds with
 * no expiry (five real ones) goes last: read as a number, its missing date
 * would be day zero and FEFO would empty it before anything that really is
 * about to expire.
 */
export const expiryRank = (batch) =>
    Number.isFinite(batch?.daysToExp) ? batch.daysToExp : Infinity;

/** Nearest expiry first; two batches with no expiry keep their order. */
export const byExpiry = (a, b) => expiryRank(a) - expiryRank(b) || 0;

/** How near a batch is to its expiry, in the windows a pharmacist works in. */
export function batchExpiryWindow(batch) {
    // No date is its own answer, not "expires today".
    if (!Number.isFinite(batch.daysToExp)) {
        return 'none';
    }

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
    // V3 — what turns the ledger into the batch report. `batchNo` and
    // `batchSource` are put on the row by the screen, which has the batch
    // records; a filter field never reaches into a store.
    {
        key: 'mbatch',
        group: 'where',
        kind: 'set',
        values: (move) => (move.batch ? [move.batch] : []),
    },
    {
        key: 'msource',
        group: 'what',
        kind: 'set',
        prefix: 'inventory.batchSource',
        values: (move) => (move.batchSource ? [move.batchSource] : []),
    },
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

    /**
     * The stock rows a user works with: archived ones are out of the table, its
     * export, the low-stock count and the pickers. `stock` keeps them, because
     * the ledger and a batch's trace still name the item they moved.
     */
    const liveStock = computed(() => liveOnly(stock.value));

    const lowStock = computed(() => liveStock.value.filter((row) => row.low));

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
     * Batches of one item that may still be drawn from, nearest expiry first —
     * FEFO is the only rule (DEMO_INVENTORY_FIXES_PROMPT.md §5.1; FIFO and the
     * pharmacist-approval toggle are retired). Expired and waste batches stay
     * out unless the caller's preparation type accepts waste.
     *
     * `warehouse` narrows to one warehouse. Selling takes from the main one
     * only (config MAIN_WAREHOUSE), so a batch received into the external
     * warehouse is not handed to a customer's order until it is moved in. No
     * warehouse means every one, which is what production and the receipt's
     * top-up picker have always seen.
     */
    const openBatchesOf = (
        sku,
        { allowWaste = false, warehouse = null } = {},
    ) =>
        batchesOf(sku)
            .filter(
                (batch) =>
                    batch.remaining > 0 &&
                    batch.state !== 'expired' &&
                    (allowWaste || !batch.waste) &&
                    (!warehouse || batch.wh === warehouse),
            )
            .sort(byExpiry);

    /**
     * Every batch of an item that still holds something — expired and waste
     * included, nearest expiry first. This is what is physically on the shelf:
     * what a count counts, what an issue may write off, and what the stock
     * table's batch column counts.
     */
    const heldBatchesOf = (sku) =>
        batchesOf(sku)
            .filter((batch) => batch.remaining > 0)
            .sort(byExpiry);

    const useOfBatch = (id) => batchUse.value.filter((row) => row.batch === id);

    /**
     * Every movement a batch ever had, newest first. V3.
     *
     * Natalie: "באצוות צריך להיות קישור לכל ההזמנות שנוצרו מאותה האצווה - דוח
     * תנועות מספרי אצוות". Every movement in the ledger carries the batch it
     * moved, so the report is a filter, not a new record — the receipt that
     * opened it, the runs that drew on it, the orders it went out on, and any
     * count or adjustment that corrected it, each with the document behind it.
     */
    const movementsOfBatch = (id) =>
        movements.value
            .filter((move) => move.batch === id)
            .slice()
            .sort((a, b) =>
                `${b.when.iso}${b.id}`.localeCompare(`${a.when.iso}${a.id}`),
            );

    /**
     * The receipts that fed a batch, oldest first. A batch may be topped up by
     * a later delivery, and then it has more than one — which is the list of
     * dates the specification asks for.
     */
    const receiptsOfBatch = (id) =>
        movementsOfBatch(id)
            .filter((move) => move.kind === 'goods_in')
            .reverse();

    /** Open waste batches of one item, nearest expiry first. */
    const wasteBatchesOf = (sku) =>
        batchesOf(sku)
            .filter((batch) => batch.waste && batch.remaining > 0)
            .sort(byExpiry);

    /** How much of an item's stock is waste — "of which waste: N". */
    const wasteOf = (sku) =>
        wasteBatchesOf(sku).reduce((sum, batch) => sum + batch.remaining, 0);

    /** How many batches of an item still hold quantity. */
    const liveBatchCount = (sku) => heldBatchesOf(sku).length;

    /**
     * The documents stock moved on. SAP posts nothing without one, so every
     * receipt, issue, count and transfer here is a row the screen can open.
     */
    const inventoryDocs = computed(() => dataset.data.inventoryDocs || []);

    const docById = (id) =>
        inventoryDocs.value.find((doc) => String(doc.id) === String(id)) ||
        null;

    /**
     * What a movement's reference opens, or null when it opens nothing.
     *
     * The ledger's `ref` is whatever document moved the stock — a goods
     * receipt, an inventory document, a production run or a customer's order —
     * and one column holds them all. Each is looked up rather than guessed
     * from its prefix, so a number that names nothing on file is shown as text
     * and never as a button that does nothing.
     *
     * @returns {'receipt'|'doc'|'production'|'order'|null}
     */
    function refKind(ref) {
        if (ref === null || ref === undefined || ref === '') {
            return null;
        }

        const id = String(ref);

        if (receiptById(id)) {
            return 'receipt';
        }

        if (docById(id)) {
            return 'doc';
        }

        if ((dataset.data.productionOrders || []).some((o) => o.id === id)) {
            return 'production';
        }

        if (dataset.orders.some((order) => order.id === id)) {
            return 'order';
        }

        return null;
    }

    /**
     * The next document number in SAP's own block.
     *
     * Only numbers inside the block count. SAP numbers its stock counts in a
     * series of their own — the real counts carry 26000000 and 26000001 —
     * and the highest of everything would send the next goods issue to an
     * eight-digit number in the counts' range.
     */
    const nextDocNumber = () =>
        String(
            inventoryDocs.value.reduce((top, doc) => {
                const n = Number(doc.id);

                return Number.isInteger(n) &&
                    n > top &&
                    n < INVENTORY_DOC_SERIES + 100000
                    ? n
                    : top;
            }, INVENTORY_DOC_SERIES) + 1,
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
     *
     * Where SAP and the workbook stopped is HOUSE_SERIES_NEXT, read off the
     * database once; from there the series grows only by the batches a
     * production order opened here. It is not the highest number on any batch:
     * SAP's batch table holds suppliers' own numeric lot codes too — eleven
     * digits on an extract, 7,528,252 on a herb — and production orders'
     * numbers on waste, and the first of those would have sent the series
     * from 16,942 to forty billion.
     */
    const houseSerial = computed(() =>
        batches.value.reduce((top, batch) => {
            if (batch.source !== 'production' || !batch.production) {
                return top;
            }

            const n = Number(batch.number ?? batch.id);

            return Number.isInteger(n) && n > top ? n : top;
        }, HOUSE_SERIES_NEXT - 1),
    );

    /**
     * The number and the key a new batch opens under. V3.
     *
     * `ahead` lets one screen number several new batches in one go — a receipt
     * of eight herbs — without each asking the store and getting the same
     * answer. `taken` does the same for keys: the keys one receipt has already
     * handed out, so two of its lines carrying the same supplier code do not
     * both open under one key before either is saved.
     *
     * A delivery whose lot carries no code of its own is numbered the way the
     * pharmacy numbers it in SAP — `WV` and the date of the receipt (`when`) —
     * rather than opening a batch with no number, which nothing could find or
     * open again.
     */
    const nextBatchNumber = ({
        kind = 'production',
        supplierBatch = '',
        production = '',
        ahead = 0,
        taken = null,
        when = null,
    } = {}) => {
        let number = batchNumberFor({
            kind,
            serial: houseSerial.value + 1 + ahead,
            supplierBatch,
            production,
        });

        if (!number && kind === 'purchase') {
            number = `WV${String(when || isoDaysAgo(0)).replace(/-/g, '')}`;
        }

        if (!number) {
            return { number: '', id: '' };
        }

        // The key has to be unique even when the number is not.
        let id = number;
        let n = 1;

        while (
            batches.value.some((batch) => batch.id === id) ||
            taken?.has(id)
        ) {
            n += 1;
            id = `${number}/${n}`;
        }

        taken?.add(id);

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
     * `qty` is in the unit the item is stocked in — a caller holding grams
     * against a herb kept in kilograms converts first (lib/units convertQty).
     * `warehouse` narrows the batches as in `openBatchesOf`.
     *
     * @returns {{ steps: Array<{batch: object, take: number, after: number}>,
     *            short: number }} `short` is what the open batches cannot cover.
     */
    function fifoPlan(sku, qty, { warehouse = null } = {}) {
        const steps = [];
        let left = Math.max(0, Number(qty) || 0);

        for (const batch of openBatchesOf(sku, { warehouse })) {
            if (left <= 0) {
                break;
            }

            const take = Math.min(batch.remaining, left);

            // Kept to the gram of a kilogram batch, so a plan that spills
            // across two batches never reports 0.000000001 as short.
            left = round3(left - take);
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
     * A batch's state follows from what is left in it and how far off its
     * expiry is. A waste batch stays `waste` whatever its quantity or date —
     * it never re-reads as active (config.batchState mirrors this rule).
     */
    function syncBatch(batch) {
        if (batch.waste) {
            batch.state = 'waste';

            return;
        }

        if (batch.remaining <= 0) {
            batch.state = 'depleted';

            return;
        }

        // A batch with no expiry on record is neither expired nor about to be
        // — five real SAP batches have none.
        if (!Number.isFinite(batch.daysToExp)) {
            batch.state = 'active';

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
        // The keys this receipt hands out, so two of its lines never share one.
        const taken = new Set();

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
                      taken,
                      when: when.iso,
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
                    expiry: line.expiry || null,
                    daysToExp: line.expiry ? -daysSince(line.expiry) : null,
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
                // The receipt in the key too: a batch topped up by a second
                // delivery has a second `goods_in`.
                id: `mv-in-${id}-${line.batch}`,
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
     * Correct a batch's two dates. V3.
     *
     * Natalie asks for both to be editable and for each to be one field, not a
     * list: "לאצווה ניתן לערוך את תאריך התוקף - תמיד שדה אחד (לא רשימה)" and
     * "לאצווה ניתן לערוך את תאריך הייצור (שדה אחד)". Changing the expiry moves
     * the batch through the expiry states, so the record is re-aged; every
     * change is written to the log with what it was and what it became.
     */
    /**
     * V3 — תפיסת אצוות: commit an order's formulas to actual batches.
     *
     * Until this runs, `fifoPlan` is only a proposal — it says which batches
     * *would* serve a quantity, and changes its mind the moment anything else
     * consumes them. Sending an order to the lab is the point at which the
     * pharmacy stops proposing: the quantity comes out of named batches, the
     * batches carry less than they did, and the ledger says so.
     *
     * Idempotent. An order that already holds allocations gets them back
     * untouched, because a second click on "send to the lab" must not take the
     * material twice.
     *
     * @param {object} order
     * @returns {Promise<{rows: Array, short: Array, already: boolean}>}
     */
    async function allocateToOrder(order) {
        if (!order) {
            return { rows: [], short: [], already: false };
        }

        const held = batchUse.value.filter((row) => row.order === order.id);

        if (held.length) {
            return { rows: held, short: [], already: true };
        }

        const rows = bag('batchUse');
        const made = [];
        const moves = [];
        const short = [];
        const touched = { batches: new Set(), rows: new Set() };
        const when = moment();
        const by = dataset.me?.name || null;

        const formulas = (order.items || []).filter(
            (item) => item.kind === 'formula' && !item.cancelled,
        );

        formulas.forEach((item) => {
            (item.herbs || []).forEach((herb) => {
                const row = stock.value.find(
                    (one) => one.herbId === herb.id || one.sku === herb.id,
                );

                if (!row) {
                    short.push({ name: herb.name, qty: herb.qty, sku: null });

                    return;
                }

                // The formula states a quantity in the unit the prescriber
                // wrote it in; the batches hold the unit the item is stocked
                // in. 120 ml out of a batch counted in litres is 0.12 of it.
                const need = convertQty(
                    herb.qty,
                    herb.unit || row.unit,
                    row.unit,
                );

                if (need === null) {
                    short.push({
                        name: herb.name,
                        sku: row.sku,
                        qty: herb.qty,
                    });

                    return;
                }

                // A customer's order is served from the main warehouse only.
                const plan = fifoPlan(row.sku, need, {
                    warehouse: MAIN_WAREHOUSE,
                });

                plan.steps.forEach((step, k) => {
                    const take = step.take;

                    if (take <= 0) {
                        return;
                    }

                    step.batch.remaining =
                        Math.round((step.batch.remaining - take) * 1000) / 1000;
                    syncBatch(step.batch);

                    row.onHand =
                        Math.round(Math.max(0, row.onHand - take) * 1000) /
                        1000;
                    row.alloc = Math.min(row.alloc, row.onHand);
                    syncRow(row);

                    const use = {
                        id: `bu-${order.id}-${item.id}-${herb.id}-${k}`,
                        batch: step.batch.id,
                        batchName: step.batch.name,
                        sku: step.batch.sku,
                        order: order.id,
                        item: item.id,
                        itemName: item.name,
                        patient: order.patient?.name || null,
                        practitioner: order.practitioner?.name || null,
                        qty: take,
                        unit: step.batch.unit,
                        lineQty: herb.qty,
                        when,
                        by,
                    };

                    rows.unshift(use);
                    made.push(use);

                    const move = {
                        id: `mv-alloc-${order.id}-${step.batch.id}-${k}`,
                        kind: 'allocated_to_compounding',
                        sku: step.batch.sku,
                        name: step.batch.name,
                        unit: step.batch.unit,
                        wh: step.batch.wh,
                        qty: -take,
                        batch: step.batch.id,
                        ref: order.id,
                        when,
                        by,
                    };

                    writeMovement(move);
                    moves.push(move);
                    touched.batches.add(step.batch);
                    touched.rows.add(row);
                });

                if (plan.short > 0) {
                    short.push({
                        name: herb.name,
                        sku: row.sku,
                        qty: plan.short,
                        unit: row.unit,
                    });
                }
            });
        });

        writeLog({
            act: 'batch_allocate',
            entType: 'order',
            ent: order.id,
            to: String(made.length),
        });

        // Everything this touched, written where it lives. A batch that gave
        // up material, the stock row behind it, the allocation itself and the
        // ledger row are four different records; persisting only the order
        // would leave the shelf saying it still has what the lab just took.
        await Promise.all([
            ...made.map((one) => persist('batchUse', one)),
            ...[...touched.batches].map((batch) =>
                persist(`batches/${batch.id}`, batch, 'PUT'),
            ),
            ...[...touched.rows].map((row) =>
                persist(`inventory/ingredients/${row.sku}`, row, 'PUT'),
            ),
            ...moves.map((move) => persist('movements', move)),
            persist(`orders/${order.id}/batch-allocation`, {
                rows: made.map((one) => ({
                    batch: one.batch,
                    sku: one.sku,
                    qty: one.qty,
                })),
            }),
        ]);

        return { rows: made, short, already: false };
    }

    /**
     * The other half of `allocateToOrder`: give back what a cancelled order had
     * already committed (SHIPPING_STATION_SPEC.md §3.4 step 2 — the shipping
     * station calls this before it runs the order's own cancellation). A batch
     * gets its remaining quantity back, never past what it started with; an
     * order with nothing allocated (cancelled before the lab) is a no-op.
     *
     * @returns {Promise<{rows: Array}>}
     */
    async function releaseFromOrder(order, reason = '') {
        if (!order) {
            return { rows: [] };
        }

        const held = batchUse.value.filter((row) => row.order === order.id);

        if (!held.length) {
            return { rows: [] };
        }

        const when = moment();
        const by = dataset.me?.name || null;
        const touched = { batches: new Set(), rows: new Set() };
        const moves = [];

        held.forEach((use) => {
            const batch = batchById(use.batch);
            const row = batch
                ? stock.value.find((one) => one.sku === batch.sku)
                : null;

            if (batch) {
                batch.remaining =
                    Math.round((batch.remaining + use.qty) * 1000) / 1000;
                syncBatch(batch);
                touched.batches.add(batch);
            }

            if (row) {
                row.onHand = Math.round((row.onHand + use.qty) * 1000) / 1000;
                syncRow(row);
                touched.rows.add(row);
            }

            const move = {
                id: `mv-release-${order.id}-${use.batch}-${use.item}`,
                // The kind config/inventory STOCK_MOVES names, so the ledger
                // labels it and links its order like the allocation it undoes.
                kind: 'released_on_cancel',
                sku: use.sku,
                name: use.batchName,
                unit: use.unit,
                wh: batch?.wh,
                qty: use.qty,
                batch: use.batch,
                ref: order.id,
                reason,
                when,
                by,
            };

            writeMovement(move);
            moves.push(move);
        });

        const remaining = bag('batchUse').filter(
            (row) => row.order !== order.id,
        );

        dataset.data.batchUse = remaining;

        writeLog({
            act: 'batch_release',
            entType: 'order',
            ent: order.id,
            to: String(held.length),
        });

        await Promise.all([
            ...[...touched.batches].map((batch) =>
                persist(`batches/${batch.id}`, batch, 'PUT'),
            ),
            ...[...touched.rows].map((row) =>
                persist(`inventory/ingredients/${row.sku}`, row, 'PUT'),
            ),
            ...moves.map((move) => persist('movements', move)),
            persist(
                `orders/${order.id}/batch-allocation`,
                { rows: [] },
                'DELETE',
            ),
        ]);

        return { rows: held };
    }

    async function editBatchDates(id, { expiry, madeOn, reason = '' } = {}) {
        const batch = batchById(id);

        if (!batch) {
            return null;
        }

        const changes = [];

        // An expiry is corrected, never removed: FEFO and the label both work
        // from it. The editor will not save an empty one, and an empty value
        // that reaches here leaves the date as it was.
        if (expiry && expiry !== batch.expiry) {
            changes.push([
                'inventory.batches.trace.expiry',
                batch.expiry,
                expiry,
            ]);
            batch.expiry = expiry;
            batch.daysToExp = -daysSince(expiry);
        }

        const was = batch.madeOn || null;
        const now = madeOn || null;

        if (now !== was) {
            changes.push(['inventory.batches.trace.madeOn', was, now]);
            batch.madeOn = now;
        }

        if (!changes.length) {
            return batch;
        }

        // A waste batch stays `waste` whatever its dates now say; anything
        // else is re-read against the new expiry.
        syncBatch(batch);

        changes.forEach(([field, from, to]) => {
            writeLog({
                act: 'batch_update',
                entType: 'batch',
                ent: id,
                valueType: 'date',
                field,
                from,
                to,
                note: reason.trim() || null,
            });
        });

        await persist(
            `inventory/batches/${id}`,
            {
                expiry: batch.expiry,
                madeOn: batch.madeOn,
                reason: reason.trim() || null,
            },
            'PATCH',
        );

        return batch;
    }

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
     * A physical count: the figure on the shelf becomes the figure in the
     * system, and every gap is a line on one count document.
     *
     * `counted` is one number for an item that is not held in batches. For one
     * that is, it is `{ batches: { [batchId]: qty }, loose }` — a figure per
     * batch still holding stock, because a total cannot say which batch the
     * difference belongs to, and the batches are what FEFO and a recall work
     * from. The row's on-hand then moves by exactly what the batches moved.
     * `loose` is stock on record in no batch at all (an extract that carried
     * the item's total but not every batch behind it); left out, a surplus
     * stays as it was and a deficit is closed, so on-hand never reads below
     * what its batches hold.
     */
    async function recordCount(sku, counted, note = '') {
        const row = itemBySku(sku);

        if (!row) {
            throw new Error(`Cannot count ${sku}`);
        }

        const when = moment();
        const by = dataset.me?.name || null;
        const remarks = String(note || '').trim() || null;
        const before = row.onHand;
        const touched = [];
        const lines = [];
        const line = (fields) => ({
            sku,
            name: row.name,
            unit: row.unit,
            wh: row.wh,
            batch: null,
            price: null,
            ...fields,
            qty: round3(fields.counted - fields.inStock),
        });

        if (counted && typeof counted === 'object') {
            const figures = counted.batches || {};
            let held = 0;

            heldBatchesOf(sku).forEach((batch) => {
                held += batch.remaining;

                // A batch the count did not reach is left as it stands.
                if (!(batch.id in figures)) {
                    return;
                }

                const found = round3(
                    Math.max(0, Number(figures[batch.id]) || 0),
                );

                lines.push(
                    line({
                        wh: batch.wh,
                        batch: batch.id,
                        inStock: batch.remaining,
                        counted: found,
                    }),
                );
                batch.remaining = found;
                // More found than ever came in: the batch's own total grows
                // with it, or the screen would read "12 of 10".
                batch.qty = Math.max(batch.qty, found);
                syncBatch(batch);
                touched.push(batch);
            });

            const loose = round3(before - held);
            const given =
                counted.loose !== undefined &&
                counted.loose !== null &&
                counted.loose !== '';
            const looseFound = given
                ? round3(Math.max(0, Number(counted.loose) || 0))
                : Math.max(0, loose);

            if (looseFound !== loose) {
                lines.push(line({ inStock: loose, counted: looseFound }));
            }
        } else {
            lines.push(
                line({
                    inStock: before,
                    counted: round3(Math.max(0, Number(counted) || 0)),
                }),
            );
        }

        const delta = round3(lines.reduce((sum, one) => sum + one.qty, 0));

        row.onHand = round3(Math.max(0, before + delta));
        // What is promised to orders cannot exceed what is on the shelf, or
        // "available" reads below zero.
        row.alloc = Math.min(row.alloc, row.onHand);
        syncRow(row);

        const moved = lines.filter((one) => one.qty !== 0);

        if (moved.length) {
            const doc = postDoc({
                type: 'count',
                warehouse: row.wh,
                remarks,
                when,
                by,
                lines,
            });

            moved.forEach((one, i) => {
                writeMovement({
                    // The document in the key: a second count of the same
                    // item on the same day is a second document.
                    id: `mv-count-${doc.id}-${i}`,
                    kind: 'count',
                    sku,
                    name: row.name,
                    unit: row.unit,
                    wh: one.wh,
                    qty: one.qty,
                    batch: one.batch,
                    ref: doc.id,
                    when,
                    by,
                });
            });
        }

        writeLog({
            act: 'stock_adjust',
            entType: 'catalog_item',
            ent: sku,
            from: String(before),
            to: String(row.onHand),
            note: remarks,
        });
        await Promise.all([
            ...touched.map((batch) =>
                persist(`batches/${batch.id}`, batch, 'PUT'),
            ),
            persist(`inventory/count/${sku}`, {
                counted: row.onHand,
                batches: lines
                    .filter((one) => one.batch)
                    .map((one) => ({ batch: one.batch, counted: one.counted })),
                note: remarks,
            }),
        ]);

        return { counted: row.onHand, delta, countedOn: when.iso };
    }

    /**
     * A manual stock issue: deduct a quantity from one named batch, for one of
     * the fixed OUT reasons (DEMO_INVENTORY_FIXES_PROMPT.md rule 4 / §6.4). The
     * batch caps how much can be taken — a batch-managed item never goes below
     * zero. Replaces the old count/damage/reject adjustment: a count's own
     * variance is a count document (`recordCount`), not this.
     */
    async function manualIssue(form) {
        const item = itemBySku(form.sku);
        const batch = batchById(form.batch);
        const rule = REASON[form.reason];

        if (!item || !batch || !rule || rule.dir === 'in') {
            throw new Error(`Cannot issue ${form.sku} for ${form.reason}`);
        }

        const qty = Math.min(
            batch.remaining,
            Math.max(0, Number(form.qty) || 0),
        );
        const before = item.onHand;

        batch.remaining = Math.round((batch.remaining - qty) * 1000) / 1000;
        syncBatch(batch);
        item.onHand = Math.max(
            0,
            Math.round((item.onHand - qty) * 1000) / 1000,
        );
        // What is promised to orders cannot exceed what is left, or
        // "available" reads below zero (allocateToOrder caps the same way).
        item.alloc = Math.min(item.alloc, item.onHand);
        syncRow(item);

        const after = item.onHand;

        // SAP has no "adjustment": stock that disappears is a goods issue, and
        // it is a document like any other. Its lines carry the quantity as a
        // positive figure, as a production run's issue does — the document's
        // type is what says it went out; the ledger row below keeps the sign.
        const doc = postDoc({
            type: 'goods_issue',
            reason: form.reason,
            warehouse: batch.wh,
            remarks: form.note.trim() || null,
            lines: [
                {
                    sku: item.sku,
                    name: item.name,
                    unit: item.unit,
                    qty,
                    wh: batch.wh,
                    batch: batch.id,
                    price: null,
                },
            ],
        });

        writeMovement({
            id: `mv-manual-${batch.id}-${movements.value.length}`,
            kind: 'manual_out',
            sku: item.sku,
            name: item.name,
            unit: item.unit,
            wh: batch.wh,
            qty: -qty,
            batch: batch.id,
            reason: form.reason,
            ref: doc.id,
            by: dataset.me?.name || null,
        });

        writeLog({
            act: 'stock_adjust',
            entType: 'batch',
            ent: batch.id,
            from: String(before),
            to: String(after),
            note: form.note.trim(),
        });

        await persist('inventory/adjustments', {
            sku: item.sku,
            reason: form.reason,
            qty,
            batch: batch.id,
        });

        return { before, after, diff: after - before };
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
    /**
     * Archive a stock row. Its batches and its movements stay exactly as they
     * are — they are the history of material that really moved.
     */
    async function removeIngredient(sku, reason = '') {
        const row = bag('stock').find((one) => one.sku === sku);

        if (!row) {
            return false;
        }

        row.archived = { on: moment(), by: dataset.me?.name || null, reason };

        writeLog({
            act: 'ingredient_delete',
            entType: 'catalog_item',
            ent: sku,
            from: optionKey(row.name),
            to: reason,
        });
        await persist(`inventory/ingredients/${sku}`, row, 'PUT');

        return true;
    }

    /** Take a stock row back out of the archive. */
    async function restoreIngredient(sku, reason = '') {
        const row = bag('stock').find((one) => one.sku === sku);

        if (!row?.archived) {
            return false;
        }

        row.archived = null;

        writeLog({
            act: 'ingredient_restore',
            entType: 'catalog_item',
            ent: sku,
            from: optionKey(row.name),
            to: reason,
        });
        await persist(`inventory/ingredients/${sku}`, row, 'PUT');

        return true;
    }

    return {
        stock,
        liveStock,
        batches,
        receipts,
        inventoryDocs,
        docById,
        refKind,
        postDoc,
        movements,
        batchUse,
        allocateToOrder,
        releaseFromOrder,
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
        nextBatchNumber,

        itemBySku,
        batchById,
        receiptById,
        batchesOf,
        openBatchesOf,
        heldBatchesOf,
        openBatch,
        syncRow,
        syncBatch,
        writeMovement,
        wasteBatchesOf,
        wasteOf,
        recordCount,
        useOfBatch,
        movementsOfBatch,
        receiptsOfBatch,
        editBatchDates,
        liveBatchCount,
        fifoPlan,

        receiveGoods,
        manualIssue,

        skuTaken,
        ingredientBlock,
        saveIngredient,
        removeIngredient,
        restoreIngredient,
    };
});
