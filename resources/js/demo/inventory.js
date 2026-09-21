// Inventory. The quantities here ARE the stock — nothing is pulled from an
// outside system.
//
// Goods receipt is the only way stock enters: each receipt line opens one batch
// with its own expiry, and every batch can be traced forward to the customer
// who received it. The receipts that were made against a purchase order carry
// its id; the rest record the supplier's name and delivery-note number as
// plain data.
import {
    BATCH_EXPIRY_WARN_DAYS,
    DEFAULT_WAREHOUSE,
    convertQty,
    familyOfCode,
    ITEM_FAMILY,
} from '@/config';
import { at, fraction, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_ORDERS from '@/demo/real/orders.json';
import REAL_PRODUCTS from '@/demo/real/products.json';
import { DEMO_SUPPLIERS } from '@/demo/vendors';
import { daysSince, isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/** How many goods receipts the fixture carries, and where each family's batch serial starts. */
const RECEIPT_COUNT = 16;
const FIRST_BATCH_NUMBER = 2610;

/** Inventory documents run in SAP's own 26xxxxx block. */
const FIRST_DOC_NUMBER = 2602000;

/** When the stock counts were taken, newest first. */
const COUNT_DAYS = [12, 41, 76, 118];

const COUNT_NOTES = [
    L('ספירת רבעון', 'Quarterly count'),
    L('ספירה חלקית — מדף עליון', 'Partial count — top shelf'),
    L('ספירה לאחר פער במלאי', 'Count after a stock discrepancy'),
    L('ספירת סוף שנה', 'Year-end count'),
];

/** Days between one receipt and the next, newest first. */
const RECEIPT_GAP_DAYS = 7;

/** Order statuses at which the lab has drawn the formula's herbs from stock. */
const CONSUMING_STATUS_IDS = ['lab', 'packed', 'sent', 'closed'];

/** Families an order line may carry that never sit on a shelf. */
const NOT_STOCKED_FAMILIES = ['labour', 'workshop'];

/** Stock kinds and the chip tone each is shown in. */
export const STOCK_KINDS = {
    raw: { tone: 'teal' },
    base: { tone: 'blue' },
    pack: { tone: 'gray' },
    shelf: { tone: 'purple' },
};

export const STOCK_KIND_IDS = Object.keys(STOCK_KINDS);

/**
 * Which pricing-code prefix each ingredient kind is priced under. The tiered
 * price lists resolve a SKU by its longest matching prefix.
 */
export const INGREDIENT_PRICE_PREFIX = { raw: '300', base: '21', pack: null };

/** Whole consumption periods elapsed since a count. */
export function periodsSince(countedDaysAgo, periodDays) {
    return Math.floor(Math.max(0, countedDaysAgo) / Math.max(1, periodDays));
}

/** Recompute the derived fields after any change to a stock row. */
export function syncStockRow(row) {
    row.avail = row.onHand - row.alloc;
    row.low = row.avail < row.min;

    return row;
}

/** Two decimals, the precision a stock figure is kept at. */
const round2 = (value) => Math.round(value * 100) / 100;

/** Three decimals, for a quantity drawn from a batch kept in kilograms. */
const round3 = (value) => Math.round(value * 1000) / 1000;

/** SAP's unit names, as they come out of OITM, mapped onto the console's. */
const UOM_BY_SAP = {
    'ק"ג': 'kg',
    גרם: 'g',
    "יח'": 'unit',
    ליטר: 'l',
    'מ"ל': 'ml',
    gr: 'g',
    kg: 'kg',
    ml: 'ml',
    unit: 'unit',
};

const uomOf = (name) => UOM_BY_SAP[String(name || '').trim()] || 'g';

/** Which pricing prefix an item's family is priced under. */
const KIND_BY_FAMILY = {
    herb: 'raw',
    herb_1to1: 'raw',
    extract: 'raw',
    tincture: 'raw',
    homeopathy: 'raw',
    hydrosol: 'base',
    essential_oil: 'base',
    infused_oil: 'base',
    consumable: 'base',
    glass: 'pack',
    plastic: 'pack',
    cap: 'pack',
    box: 'pack',
    jar: 'pack',
    packaging: 'pack',
    shelf: 'shelf',
    formula: 'shelf',
    private_label: 'shelf',
    bought_shelf: 'shelf',
};

/**
 * One OITM row as a stock row.
 *
 * The identity, the quantities, the units, the minimum level and the safety
 * limits are SAP's own — only the warehouse id is translated, because the
 * console models two warehouses where SAP numbers seven.
 */
/**
 * Which warehouse a row is counted in: the one `OITW` shows the quantity in,
 * and the general warehouse when the item has none anywhere.
 */
function warehouseOf(item) {
    const holding = (item.warehouses || []).find((row) => row.onHand > 0);

    return holding ? holding.warehouse : DEFAULT_WAREHOUSE;
}

function stockRowOf(item) {
    const kind = KIND_BY_FAMILY[item.family] || 'raw';
    const onHand = Math.max(0, round2(item.onHand || 0));
    // SAP's foreign-name field holds the pinyin where a herb has one, and
    // repeats the botanical name where it does not. The difference is what
    // makes a herb part of the Chinese materia medica.
    const pinyin =
        item.nameForeign && item.nameForeign !== item.nameHe
            ? item.nameForeign
            : null;

    return {
        sku: item.code,
        // The item code is the herb's id: a formula line and its stock row are
        // the same catalogue row in SAP, and they are here too.
        herbId: item.code,
        kind,
        name: { he: item.nameHe, en: item.nameHe },
        lat: null,
        cn: pinyin,
        system: pinyin ? 'chinese' : 'west',
        wh: warehouseOf(item),
        unit: uomOf(item.stockUom),
        size: null,
        sizeUnit: null,
        price: item.lastPurchasePrice ?? null,
        onHand,
        alloc: Math.min(onHand, Math.max(0, item.committed || 0)),
        min: item.minLevel ?? 0,
        created: item.createdOn || isoDaysAgo(400),
    };
}

/** A plausible quantity on hand for a row the extract missed, in its unit. */
function guessedOnHand(slot, unit) {
    if (unit === 'kg' || unit === 'l') {
        return spread(slot, 3, 40);
    }

    if (unit === 'unit') {
        return spread(slot, 50, 800);
    }

    return spread(slot, 400, 6000);
}

/** A plausible minimum for the same row. */
function guessedMin(unit) {
    if (unit === 'kg' || unit === 'l') {
        return 5;
    }

    return unit === 'unit' ? 20 : 500;
}

/**
 * Stock rows — one per inventory item, which is what `OITW` is.
 *
 * Every figure is SAP's: the quantity on hand, what is committed, what is on
 * order, the minimum, and the warehouse the quantity actually sits in. An item
 * SAP does not track in inventory (labour, a service) gets no row, and any
 * ingredient an order line names but the sample missed is added from that line
 * so every formula still resolves and FEFO has something to pick from.
 */
export function buildStock() {
    const rows = [...REAL_INGREDIENTS, ...REAL_PRODUCTS]
        .filter((item) => item.stockTracked === 'Y')
        .map(stockRowOf);
    const seen = new Set(rows.map((row) => row.sku));

    REAL_ORDERS.forEach((order) => {
        (order.lines || []).forEach((line) => {
            const family = familyOfCode(line.code);

            if (
                !line.code ||
                !family ||
                seen.has(line.code) ||
                NOT_STOCKED_FAMILIES.includes(family)
            ) {
                return;
            }

            const unit = uomOf(line.unit);

            seen.add(line.code);
            rows.push(
                stockRowOf({
                    code: line.code,
                    nameHe: line.name,
                    nameForeign: line.foreignName,
                    family,
                    stockUom: line.unit,
                    onHand: guessedOnHand(`stock:${line.code}:onhand`, unit),
                    committed: 0,
                    minLevel: guessedMin(unit),
                    lastPurchasePrice: line.price ?? null,
                    createdOn: null,
                }),
            );
        });
    });

    return rows.map(syncStockRow);
}

const RECEIPT_NOTES = [
    null,
    null,
    L(
        'נבדק מול תעודת המשלוח — תקין',
        'Checked against the delivery note — correct',
    ),
    L('אריזה אחת פגומה, לא נקלטה', 'One package damaged, not received'),
];

const RECEIVERS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.amit,
    DEMO_ACTORS.hadarMizrahi,
];

/**
 * Which purchase order each receipt was made against. `buildSupplierNotes`
 * (demo/purchasing.js) pairs delivery note k with receipt k, and the notes are
 * written for the orders that have had goods received — PO-26031, 26032, 26033
 * and 26036, in that order — so those four receipts name them. The rest are
 * free receipts, which is what keeps the "against a purchase order" facet
 * two-sided.
 */
const RECEIPT_PO = ['PO-26031', 'PO-26032', 'PO-26033', 'PO-26036'];

/**
 * The supplier of each receipt, newest first: the order's supplier where the
 * receipt was made against one (the orders cycle the supplier list in code
 * order), then the raw-material and base suppliers in turn.
 */
const RECEIPT_SUPPLIER_CODES = [
    'S-104',
    'S-118',
    'S-131',
    'S-163',
    'S-155',
    'S-104',
    'S-118',
    'S-131',
    'S-155',
    'S-104',
    'S-142',
    'S-118',
    'S-104',
    'S-155',
    'S-131',
    'S-104',
];

/**
 * Which items the receipts should open batches for, oldest receipt first: the
 * components the production runs will consume, then the ingredients the real
 * order book names, most used first. A herb an order actually consumed is what a batch has to exist
 * for — traceability that points at herbs nobody ordered is theatre.
 */
function receiptLinePool(stock, inputs) {
    const usage = new Map();
    const bySku = new Map(stock.map((row) => [row.sku, row]));

    REAL_ORDERS.forEach((order) => {
        (order.lines || []).forEach((line) => {
            const row = bySku.get(line.code);

            if (!row || row.kind === 'shelf' || !/^[12]/.test(line.code)) {
                return;
            }

            usage.set(line.code, (usage.get(line.code) || 0) + 1);
        });
    });

    const ordered = [...usage]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([sku]) => sku)
        .filter((sku) => !inputs.includes(sku));

    return [...inputs, ...ordered].map((sku) => bySku.get(sku)).filter(Boolean);
}

/** A delivery quantity in the row's own unit. */
function receiptQty(slot, row) {
    if (row.unit === 'kg' || row.unit === 'l') {
        return spread(slot, 2, 25);
    }

    if (row.unit === 'unit') {
        return spread(slot, 20, 120);
    }

    if (row.kind === 'base') {
        return spread(slot, 2000, 20000);
    }

    return spread(slot, 500, 5000);
}

/** Goods receipts — the single entry point of all stock. */
export function buildReceipts(stock, productionInputs = []) {
    const pool = receiptLinePool(stock, productionInputs);
    const receipts = [];
    // Lines are dealt from the pool, and batch numbers run per item family
    // (`10-02610`), oldest receipt first — the list itself is newest first,
    // as every list here is.
    const serial = {};
    const batchNoOf = (sku) => {
        const prefix = ITEM_FAMILY[familyOfCode(sku)]?.prefix || '00';

        serial[prefix] = (serial[prefix] || FIRST_BATCH_NUMBER - 1) + 1;

        return `${prefix}-${String(serial[prefix]).padStart(5, '0')}`;
    };
    const deal = [];
    let dealt = 0;

    for (let i = RECEIPT_COUNT - 1; i >= 0; i -= 1) {
        deal[i] = { count: spread(`receipt:${i}:lines`, 3, 6), from: dealt };
        dealt += deal[i].count;
    }

    for (let i = RECEIPT_COUNT - 1; i >= 0; i -= 1) {
        const slot = `receipt:${i}`;
        const supplier =
            DEMO_SUPPLIERS.find(
                (row) => row.code === RECEIPT_SUPPLIER_CODES[i],
            ) || DEMO_SUPPLIERS[0];
        const days = 3 + i * RECEIPT_GAP_DAYS;
        const { count, from } = deal[i];
        const lines = [];

        for (let k = 0; k < count; k += 1) {
            const lineSlot = `${slot}:line:${k}`;
            const item = pool[(from + k) % pool.length];
            const shelfLifeMonths =
                item.kind === 'raw'
                    ? spread(`${lineSlot}:life`, 18, 36)
                    : spread(`${lineSlot}:life`, 24, 48);

            lines.push({
                sku: item.sku,
                name: item.name,
                unit: item.unit,
                qty: receiptQty(`${lineSlot}:qty`, item),
                wh: item.wh,
                batch: batchNoOf(item.sku),
                expiry: isoDaysAgo(
                    -Math.round(shelfLifeMonths * 30) +
                        spread(`${lineSlot}:jitter`, 0, 180),
                ),
                supplierBatch: `L${spread(`${lineSlot}:sbatch`, 10000, 99999)}`,
                // V3 — the supplier's own manufacturing date, off the same
                // delivery note as the expiry: a few weeks to a few months
                // before the goods reached the pharmacy.
                madeOn: isoDaysAgo(days + spread(`${lineSlot}:made`, 14, 150)),
                // V2: how many item labels the receipt asked for
                labels: spread(`${lineSlot}:labels`, 1, 3),
            });
        }

        receipts.unshift({
            id: `GR-26${70 + i * 2}`,
            supplier: supplier.name,
            supplierCode: supplier.code,
            po: RECEIPT_PO[i] || null,
            docNum: String(spread(`${slot}:doc`, 400000, 499999)),
            when: at(
                days,
                spread(`${slot}:hh`, 9, 16),
                spread(`${slot}:mm`, 0, 59),
            ),
            by: pickFrom(`${slot}:by`, RECEIVERS),
            note: pickFrom(`${slot}:note`, RECEIPT_NOTES),
            lines,
            batches: lines.map((line) => line.batch),
        });
    }

    return receipts;
}

// --------------------------------------------------------- inventory documents

/**
 * The paperwork behind every movement, as SAP posts it.
 *
 * Stock does not move in SAP without a document: a goods receipt (`OIGN`)
 * brings it in, a goods issue (`OIGE`) takes it out, a count (`OINC`) corrects
 * it and a transfer (`OWTR`) moves it between warehouses. Almost all of the
 * first two are raised by a production order and say so — 64% of receipt lines
 * and 87% of issue lines in the live database carry `BaseType` 202 — and SAP
 * writes the order's number into the remark, which is why the remarks below
 * read the way they do.
 *
 * The documents are the record; the batches, the quantities and the movement
 * ledger are what they produced, and are built before them.
 */
export function buildInventoryDocs({ receipts, production, stock }) {
    const bySku = new Map(stock.map((row) => [row.sku, row]));
    const docs = [];
    let number = FIRST_DOC_NUMBER;
    const next = () => {
        number += 1;

        return String(number);
    };

    // The supplier receipts, oldest first, so the numbers run with the dates.
    [...receipts]
        .sort((a, b) => b.when.daysAgo - a.when.daysAgo)
        .forEach((receipt) => {
            docs.push({
                id: next(),
                type: 'goods_receipt',
                base: receipt.po ? 'purchase_order' : 'manual',
                baseRef: receipt.po || null,
                warehouse: receipt.lines[0]?.wh || DEFAULT_WAREHOUSE,
                supplier: receipt.supplier,
                supplierCode: receipt.supplierCode,
                receipt: receipt.id,
                remarks: receipt.note,
                when: receipt.when,
                by: receipt.by,
                lines: receipt.lines.map((line) => ({
                    sku: line.sku,
                    name: line.name,
                    unit: line.unit,
                    qty: line.qty,
                    wh: line.wh,
                    batch: line.batch,
                    price: line.price ?? null,
                })),
            });
        });

    // A production run issues its components and receives what it made. SAP
    // posts two documents per run and links both to the order.
    [...(production || [])]
        .filter((order) => order.state === 'completed')
        .sort((a, b) => b.completedOn.daysAgo - a.completedOn.daysAgo)
        .forEach((order) => {
            const issued = order.components.flatMap((component) =>
                component.picks.map((pick) => {
                    const row = bySku.get(component.sku) || null;

                    return {
                        sku: component.sku,
                        name: component.name,
                        unit: row?.unit || component.uom,
                        qty: pick.qty,
                        wh: row?.wh || DEFAULT_WAREHOUSE,
                        batch: pick.batch,
                        price: null,
                    };
                }),
            );

            if (issued.length) {
                docs.push({
                    id: next(),
                    type: 'goods_issue',
                    base: 'production',
                    baseRef: order.id,
                    warehouse: issued[0].wh,
                    supplier: null,
                    supplierCode: null,
                    receipt: null,
                    remarks: L(
                        `נוצר באופן אוטומטי על-ידי הוראת ייצור ${order.id}`,
                        `Created automatically by production order ${order.id}`,
                    ),
                    when: order.completedOn,
                    by: order.by,
                    lines: issued,
                });
            }

            const parent = bySku.get(order.parentSku) || null;
            const made = [
                order.outputBatch && {
                    sku: order.parentSku,
                    name: parent ? parent.name : order.name,
                    unit: parent?.unit || order.uom,
                    qty: order.yieldQty,
                    wh: parent?.wh || DEFAULT_WAREHOUSE,
                    batch: order.outputBatch,
                    price: order.cost?.perUnit ?? null,
                },
                order.wasteBatch && {
                    sku: order.parentSku,
                    name: parent ? parent.name : order.name,
                    unit: parent?.unit || order.uom,
                    qty: order.wasteQty,
                    wh: parent?.wh || DEFAULT_WAREHOUSE,
                    batch: order.wasteBatch,
                    price: null,
                },
            ].filter(Boolean);

            if (made.length) {
                docs.push({
                    id: next(),
                    type: 'goods_receipt',
                    base: 'production',
                    baseRef: order.id,
                    warehouse: made[0].wh,
                    supplier: null,
                    supplierCode: null,
                    receipt: null,
                    remarks: L(
                        `קבלה מהייצור · הוראת ייצור ${order.id}`,
                        `Receipt from production · order ${order.id}`,
                    ),
                    when: order.completedOn,
                    by: order.by,
                    lines: made,
                });
            }
        });

    // The counts the pharmacy runs on the shelf it cannot weigh per order, and
    // the one transfer a year that moves stock to the external warehouse.
    const countable = stock
        .filter((row) => row.onHand > 0)
        .sort((a, b) => String(a.sku).localeCompare(String(b.sku)));

    COUNT_DAYS.forEach((daysAgo, i) => {
        const lines = Array.from({ length: 3 }, (_, k) => {
            const row = countable[(i * 7 + k * 31) % countable.length];
            const counted = round2(
                row.onHand * (1 + (fraction(`count:${i}:${k}`) - 0.5) / 12),
            );

            return {
                sku: row.sku,
                name: row.name,
                unit: row.unit,
                qty: round2(counted - row.onHand),
                counted,
                inStock: row.onHand,
                wh: row.wh,
                batch: null,
                price: null,
            };
        });

        docs.push({
            id: next(),
            type: 'count',
            base: 'manual',
            baseRef: null,
            warehouse: DEFAULT_WAREHOUSE,
            supplier: null,
            supplierCode: null,
            receipt: null,
            remarks: pickFrom(`count:${i}:note`, COUNT_NOTES),
            when: at(daysAgo, 8, 30),
            by: pickFrom(`count:${i}:by`, RECEIVERS),
            lines,
        });
    });

    const moved = countable[11] || countable[0];

    if (moved) {
        docs.push({
            id: next(),
            type: 'transfer',
            base: 'manual',
            baseRef: null,
            warehouse: DEFAULT_WAREHOUSE,
            toWarehouse: '02',
            supplier: null,
            supplierCode: null,
            receipt: null,
            remarks: L(
                'העברה למחסן החיצוני — חוסר מקום במדף',
                'Moved to the external warehouse — no room on the shelf',
            ),
            when: at(34, 11, 15),
            by: pickFrom('transfer:by', RECEIVERS),
            lines: [
                {
                    sku: moved.sku,
                    name: moved.name,
                    unit: moved.unit,
                    qty: round2(moved.onHand / 4),
                    wh: DEFAULT_WAREHOUSE,
                    toWh: '02',
                    batch: null,
                    price: null,
                },
            ],
        });
    }

    // Newest first, as every list here is.
    return docs.sort((a, b) => a.when.daysAgo - b.when.daysAgo);
}

/**
 * One batch per receipt line, with what is left of it.
 *
 * A batch received in the fixture's window is still whole — what the orders
 * and the production runs drew from it is deducted by their own builders, so
 * every gram that left is on the ledger. A batch older than sixty days has
 * also served orders the book no longer shows, and carries a spent share.
 *
 * The batches then ARE the stock: a row that has batches holds exactly what
 * they hold, and the SAP figure the row arrived with is replaced. Rows without
 * batches keep SAP's quantity.
 */
export function buildBatches(receipts, stock = []) {
    const batches = [];

    receipts.forEach((receipt) => {
        receipt.lines.forEach((line) => {
            const daysToExp = -daysSince(line.expiry);
            const remaining =
                receipt.when.daysAgo > 60
                    ? round2(
                          line.qty *
                              (0.55 +
                                  fraction(`batch:${line.batch}:left`) * 0.4),
                      )
                    : line.qty;

            batches.push({
                madeOn: line.madeOn,
                id: line.batch,
                // V3 — goods from a supplier carry the supplier's own batch
                // code as their number, always. Yaron: "אם חומר גלם מגיע מספק
                // המוצר מקבל אצוות ספק תמיד". The key stays the console's own,
                // because 2,914 numbers in the live database are shared by more
                // than one item and a key cannot be.
                number: line.supplierBatch,
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                wh: line.wh,
                source: 'supplier',
                receipt: receipt.id,
                production: null,
                supplier: receipt.supplier,
                supplierBatch: line.supplierBatch,
                received: receipt.when,
                qty: line.qty,
                remaining,
                expiry: line.expiry,
                daysToExp,
                state: batchStateOf(remaining, daysToExp),
                waste: false,
                unitCost: null,
                components: null,
                by: receipt.by,
            });
        });
    });

    // Two fixed cases on one of the older receipts, so both expiry states are
    // always on screen whatever the rest of the fixture does — and never on the
    // batches the production runs were issued against.
    const aged = batches.filter(
        (batch) => batch.receipt === receipts[RECEIPT_COUNT - 3]?.id,
    );

    if (aged.length > 1) {
        Object.assign(aged[0], {
            expiry: isoDaysAgo(-46),
            daysToExp: 46,
            state: batchStateOf(aged[0].remaining, 46),
        });
        Object.assign(aged[1], {
            expiry: isoDaysAgo(18),
            daysToExp: -18,
            state: batchStateOf(aged[1].remaining, -18),
        });
    }

    reconcileStock(stock, batches);

    return batches;
}

/** A row with batches holds what its batches hold. */
export function reconcileStock(stock, batches) {
    const sums = new Map();

    batches.forEach((batch) => {
        sums.set(batch.sku, (sums.get(batch.sku) || 0) + batch.remaining);
    });

    stock.forEach((row) => {
        if (!sums.has(row.sku)) {
            return;
        }

        row.onHand = round2(sums.get(row.sku));
        row.alloc = Math.min(row.alloc, row.onHand);
        syncStockRow(row);
    });
}

/** The state a batch is in, from what is left and how far off its expiry is. */
export function batchStateOf(remaining, daysToExp) {
    if (remaining <= 0) {
        return 'depleted';
    }

    if (daysToExp < 0) {
        return 'expired';
    }

    return daysToExp < BATCH_EXPIRY_WARN_DAYS ? 'expiring' : 'active';
}

/**
 * Traceability: batch → compounded item → order → customer.
 *
 * Every formula herb on an order the lab has started is drawn from the open
 * batches of that herb's SAP code, nearest expiry first, at the quantity the
 * order line carries — converted into the batch's unit, because the order says
 * grams and SAP keeps the herb in kilograms. The batch's remaining and the
 * stock row's quantity come down by the same amount, so the ledger, the batch
 * list and the stock table agree. A line that outruns one batch spills into
 * the next; a herb with no batch at all leaves no row rather than a fake one.
 */
export function buildBatchUse(orders, batches, stock = []) {
    const rows = [];
    const bySku = new Map(stock.map((row) => [row.sku, row]));

    orders
        .filter((order) => CONSUMING_STATUS_IDS.includes(order.status))
        .sort((a, b) => a.placed.iso.localeCompare(b.placed.iso))
        .forEach((order) => {
            order.items
                .filter((item) => item.kind === 'formula' && !item.cancelled)
                .forEach((item) => {
                    (item.herbs || []).forEach((herb) => {
                        const open = batches
                            .filter(
                                (batch) =>
                                    batch.sku === herb.id &&
                                    batch.remaining > 0 &&
                                    batch.state !== 'rejected',
                            )
                            .sort((a, b) => a.expiry.localeCompare(b.expiry));
                        const before = open.filter(
                            (batch) => batch.received.iso <= order.placed.iso,
                        );
                        const candidates = before.length ? before : open;

                        if (!candidates.length) {
                            return;
                        }

                        let need = round3(
                            convertQty(herb.qty, herb.unit, candidates[0].unit),
                        );

                        candidates.forEach((batch, k) => {
                            if (need <= 0) {
                                return;
                            }

                            const take = round3(
                                Math.min(batch.remaining, need),
                            );

                            if (take <= 0) {
                                return;
                            }

                            need = round3(need - take);
                            batch.remaining = round3(batch.remaining - take);
                            batch.state = batchStateOf(
                                batch.remaining,
                                batch.daysToExp,
                            );

                            const row = bySku.get(batch.sku);

                            if (row) {
                                row.onHand = round3(
                                    Math.max(0, row.onHand - take),
                                );
                                row.alloc = Math.min(row.alloc, row.onHand);
                                syncStockRow(row);
                            }

                            rows.push({
                                id: `bu-${item.id}-${herb.id}-${k}`,
                                batch: batch.id,
                                batchName: batch.name,
                                sku: batch.sku,
                                order: order.id,
                                item: item.id,
                                itemName: item.name,
                                patient: order.patient.name,
                                practitioner: order.practitioner.name,
                                qty: take,
                                unit: batch.unit,
                                // the figure as the order line states it
                                lineQty: herb.qty,
                                lineUnit: herb.unit,
                                when: order.placed,
                                status: order.status,
                            });
                        });
                    });
                });
        });

    return rows;
}

/**
 * The stock ledger, newest first. Every row here is a projection of a receipt
 * line, a batch allocation or a consumption period that already exists —
 * nothing moves stock in this fixture without a document behind it. The
 * time-consumption rows are the ones the nightly job would have written since
 * each consumable was last counted.
 */
export function buildMovements(receipts, batchUse) {
    const rows = [];

    receipts.forEach((receipt) => {
        receipt.lines.forEach((line) => {
            rows.push({
                id: `mv-in-${line.batch}`,
                kind: 'goods_in',
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                wh: line.wh,
                qty: line.qty,
                batch: line.batch,
                ref: receipt.id,
                when: receipt.when,
                by: receipt.by,
            });
        });
    });

    batchUse.forEach((use) => {
        rows.push({
            id: `mv-alloc-${use.id}`,
            kind: 'allocated_to_compounding',
            sku: use.sku,
            name: use.batchName,
            unit: use.unit,
            wh: DEFAULT_WAREHOUSE,
            qty: -use.qty,
            batch: use.batch,
            ref: use.order,
            when: use.when,
            by: null,
        });
    });

    return sortMovements(rows);
}

/** Newest first, ties broken by id so the order is stable. */
export function sortMovements(rows) {
    return rows.sort((a, b) =>
        `${b.when.iso}${b.id}`.localeCompare(`${a.when.iso}${a.id}`),
    );
}
