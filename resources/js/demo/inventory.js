// Inventory. The quantities here ARE the stock — nothing is pulled from an
// outside system.
//
// Batches, the goods-receipt history and the stock ledger come straight from
// the real SAP extract (demo/real/batches.json, batchMovements.json,
// goodsReceipts.json, stockCounts.json) — not invented
// (DEMO_INVENTORY_FIXES_PROMPT.md §3). On top of that real baseline, the
// demo's own order book (buildBatchUse) draws down whatever batches are open,
// exactly as "העבר למעבדה" would in the running app, so the 50 real orders
// this console manages have something real to consume.
import {
    BATCH_EXPIRY_WARN_DAYS,
    DEFAULT_WAREHOUSE,
    convertQty,
    familyOfCode,
} from '@/config';
import { at, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import REAL_BATCHES from '@/demo/real/batches.json';
import REAL_BATCH_MOVEMENTS from '@/demo/real/batchMovements.json';
import REAL_GOODS_RECEIPTS from '@/demo/real/goodsReceipts.json';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_ORDERS from '@/demo/real/orders.json';
import REAL_PRODUCTS from '@/demo/real/products.json';
import REAL_STOCK_COUNTS from '@/demo/real/stockCounts.json';
import { daysSince, isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/** Inventory documents run in SAP's own 26xxxxx block — only for documents this
 * fixture itself invents (production); real receipts and counts keep their own
 * real document numbers, which sit in lower, non-overlapping ranges. */
const FIRST_DOC_NUMBER = 2602000;

/** Order statuses at which the lab has drawn the formula's herbs from stock. */
const CONSUMING_STATUS_IDS = [
    'in_production',
    'packing',
    'awaiting_courier',
    'shipped',
    'ready_for_pickup',
    'collected',
];

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

/**
 * One real date turned into the three language-neutral forms every record
 * needs. The hour and minute are not in the extract, so they are a stable
 * pseudo-time derived from the record's own key — never `now()`, so the
 * fixture never drifts between loads (demo/fixture.js's own rule).
 */
function momentOf(iso, slot) {
    return at(
        daysSince(iso),
        spread(`${slot}:hh`, 8, 17),
        spread(`${slot}:mm`, 0, 59),
    );
}

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
 * Which warehouse a row is counted in: the one `OITW` shows the quantity in,
 * and the general warehouse when the item has none anywhere.
 */
function warehouseOf(item) {
    const holding = (item.warehouses || []).find((row) => row.onHand > 0);

    return holding ? holding.warehouse : DEFAULT_WAREHOUSE;
}

/**
 * One OITM row as a stock row.
 *
 * The identity, the quantities, the units, the minimum level and the safety
 * limits are SAP's own — only the warehouse id is translated, because the
 * console models two warehouses where SAP numbers seven.
 */
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
        // The full per-warehouse breakdown, real (OITW), for a screen that
        // needs more than the one warehouse the row is filed under.
        warehouses: (item.warehouses || []).filter(
            (row) => row.onHand > 0 || row.committed > 0,
        ),
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

/**
 * Every real batch (demo/real/batches.json), as the pharmacy's own stock
 * actually sits today — 700 of them, every one in warehouse `01` (the real
 * data never shows a split batch, matching rule 1: only the main warehouse
 * carries batches that count).
 *
 * `source` is read off the batch number itself, the same split the live
 * database shows: a purely numeric number is the house running series, which
 * only an item made in-house carries; anything else — a supplier's own code,
 * or the `WV` + date the pharmacy wrote in for a receipt with no lot code —
 * is a purchase (see [[v3-planning-batches]]: 3,646 of 5,830 batches carry the
 * running number and are all made in-house, the rest all purchased).
 */
export function buildBatches(stock = []) {
    const bySku = new Map(stock.map((row) => [row.sku, row]));
    const numericNumber = /^\d+$/;

    return REAL_BATCHES.map((real) => {
        const row = bySku.get(real.code);
        const name = row ? row.name : { he: real.itemName, en: real.itemName };
        const unit = row ? row.unit : 'kg';
        const source = numericNumber.test(real.batch)
            ? 'production'
            : 'supplier';
        const remaining = real.quantity;
        const daysToExp = -daysSince(real.expiresOn);

        return {
            id: String(real.batchKey),
            number: real.batch,
            sku: real.code,
            name,
            unit,
            wh: real.warehouse,
            source,
            production: null,
            // Real data carries no document linking a batch to the receipt
            // that opened it (demo/real/goodsReceipts.json does not join to
            // demo/real/batches.json by key) — left null rather than guessed.
            receipt: null,
            supplier: null,
            supplierBatch: real.supplierBatch || null,
            received: momentOf(real.receivedOn, `batch:${real.batchKey}:recv`),
            madeOn: real.producedOn || null,
            qty: real.quantity,
            remaining,
            expiry: real.expiresOn,
            daysToExp,
            state: batchStateOf(remaining, daysToExp),
            waste: false,
            // No real per-batch cost in this extract; the item's own last
            // purchase price stands in, same fallback INVENTORY_SPEC.md §11
            // uses for an opening batch ("עלות פתיחה משוערת").
            unitCost: row?.price ?? null,
            costEstimated: true,
            components: null,
            by: null,
        };
    });
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

const RECEIVERS = [
    DEMO_ACTORS.orit,
    DEMO_ACTORS.amit,
    DEMO_ACTORS.hadarMizrahi,
];

/**
 * Real goods receipts (demo/real/goodsReceipts.json) — 140 of them, each with
 * its real supplier, delivery-note reference and lines. The lines carry no
 * batch: this source does not join to demo/real/batches.json by any shared
 * key, so a receipt's batch column stays empty rather than a guessed one.
 */
export function buildReceipts(stock = []) {
    const bySku = new Map(stock.map((row) => [row.sku, row]));

    return REAL_GOODS_RECEIPTS.map((real) => {
        const when = momentOf(real.docDate, `gr:${real.docNum}`);
        const lines = real.lines.map((line) => {
            const row = bySku.get(line.code);

            return {
                sku: line.code,
                name: row ? row.name : { he: line.name, en: line.name },
                unit: row ? row.unit : uomOf(line.uom),
                qty: line.qty,
                wh: line.warehouse || DEFAULT_WAREHOUSE,
                batch: null,
                price: line.price || null,
            };
        });

        return {
            id: `GR-${real.docNum}`,
            supplier: real.supplier,
            supplierCode: real.supplierCode,
            po: null,
            docNum: String(real.docNum),
            when,
            by: null,
            note: real.comments || null,
            lines,
            batches: [],
        };
    });
}

// --------------------------------------------------------- inventory documents

/**
 * The paperwork behind every movement, as SAP posts it.
 *
 * The goods receipts and the stock counts are real documents
 * (demo/real/goodsReceipts.json, demo/real/stockCounts.json), kept under
 * their own real document numbers. A production run is still this fixture's
 * own (production orders are demo-built), so those keep the synthetic
 * `FIRST_DOC_NUMBER` series — a range real receipts and counts never reach.
 */
export function buildInventoryDocs({ receipts, production, stock }) {
    const bySku = new Map(stock.map((row) => [row.sku, row]));
    const docs = [];
    let number = FIRST_DOC_NUMBER;
    const next = () => {
        number += 1;

        return String(number);
    };

    // The real goods receipts, oldest first, so the numbers run with the dates.
    [...receipts]
        .sort((a, b) => b.when.daysAgo - a.when.daysAgo)
        .forEach((receipt) => {
            docs.push({
                id: receipt.docNum,
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
    // posts two documents per receipt and links both to the order — once for
    // a run that came back whole, once per part for one that came back in
    // parts.
    (production || [])
        .flatMap((order) =>
            (order.receipts || []).map((receipt) => ({ order, receipt })),
        )
        .sort((a, b) => b.receipt.when.daysAgo - a.receipt.when.daysAgo)
        .forEach(({ order, receipt }) => {
            const componentOf = (sku) =>
                order.components.find((component) => component.sku === sku);
            const issued = (receipt.drew || []).map((line) => {
                const row = bySku.get(line.sku) || null;
                const component = componentOf(line.sku);

                return {
                    sku: line.sku,
                    name: component?.name || line.sku,
                    unit: row?.unit || component?.stockUnit || 'unit',
                    qty: line.qty,
                    wh: row?.wh || DEFAULT_WAREHOUSE,
                    batch: line.batch,
                    price: null,
                };
            });

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
                    when: receipt.when,
                    by: receipt.by || order.by,
                    lines: issued,
                });
            }

            // In the unit the item is held in — a tincture made in millilitres
            // is stocked in litres.
            const parent = bySku.get(order.parentSku) || null;
            const made = [
                receipt.batch && {
                    sku: order.parentSku,
                    name: parent ? parent.name : order.name,
                    unit: parent?.unit || order.uom,
                    qty: receipt.stockQty ?? receipt.qty,
                    wh: parent?.wh || DEFAULT_WAREHOUSE,
                    batch: receipt.batch,
                    price: order.cost?.perUnit ?? null,
                },
                receipt.wasteBatch && {
                    sku: order.parentSku,
                    name: parent ? parent.name : order.name,
                    unit: parent?.unit || order.uom,
                    qty: receipt.wasteStock ?? receipt.wasteQty,
                    wh: parent?.wh || DEFAULT_WAREHOUSE,
                    batch: receipt.wasteBatch,
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
                    when: receipt.when,
                    by: receipt.by || order.by,
                    lines: made,
                });
            }
        });

    // The real stock counts (demo/real/stockCounts.json) — 25 of them, each
    // with its real variance.
    REAL_STOCK_COUNTS.forEach((real) => {
        const lines = real.lines.map((line) => {
            const row = bySku.get(line.code);

            return {
                sku: line.code,
                name: row ? row.name : { he: line.name, en: line.name },
                unit: row ? row.unit : uomOf(line.uom),
                qty: line.variance,
                counted: line.countedQty,
                inStock: line.onRecord,
                wh: line.warehouse || DEFAULT_WAREHOUSE,
                batch: null,
                price: null,
            };
        });

        docs.push({
            id: String(real.docNum),
            type: 'count',
            base: 'manual',
            baseRef: null,
            warehouse: real.lines[0]?.warehouse || DEFAULT_WAREHOUSE,
            supplier: null,
            supplierCode: null,
            receipt: null,
            remarks: real.remarks || null,
            when: momentOf(real.countedOn, `count:${real.docNum}`),
            by: null,
            lines,
        });
    });

    // One illustrative transfer — real data carries no transfer documents at
    // all (demo/real has no transfers file; the live database shows only 11 in
    // nine years), so this one stays the fixture's own.
    const transferable = [...stock]
        .filter((row) => row.onHand > 0)
        .sort((a, b) => b.onHand - a.onHand);
    const moved = transferable[Math.min(11, transferable.length - 1)];

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
                                    batch.state !== 'expired' &&
                                    !batch.waste,
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
 * The real stock ledger (demo/real/batchMovements.json), joined onto the real
 * batches by their SAP key — 4,234 rows, the two years of history behind
 * today's balance. `ref` stays null: a historical row's own SAP document
 * number does not resolve to anything in `inventoryDocs` (that list holds
 * only the real receipts, real counts and this fixture's own production
 * docs), and a reference that cannot be opened is worse than none
 * (DEMO_INVENTORY_FIXES_PROMPT.md §5.4.3 — broken reference links).
 */
const DOC_TYPE_KIND = {
    59: () => 'goods_in',
    15: () => 'allocated_to_compounding',
    60: (qty) => (qty >= 0 ? 'manual_in' : 'manual_out'),
    10000071: () => 'count',
    20: (qty) => (qty >= 0 ? 'production_in' : 'production_out'),
};

function historicalMovements(batches) {
    const byKey = new Map(batches.map((batch) => [batch.id, batch]));

    return REAL_BATCH_MOVEMENTS.map((real, i) => {
        const batch = byKey.get(String(real.batchKey));

        if (!batch) {
            return null;
        }

        const kind = (DOC_TYPE_KIND[real.docType] || DOC_TYPE_KIND[60])(
            real.quantity,
        );

        return {
            id: `mv-hist-${i}`,
            kind,
            sku: batch.sku,
            name: batch.name,
            unit: batch.unit,
            wh: batch.wh,
            qty: real.quantity,
            batch: batch.id,
            ref: null,
            when: momentOf(real.docDate, `mv:${i}`),
            by: real.party || null,
        };
    }).filter(Boolean);
}

/**
 * The stock ledger, newest first: the real history behind today's batches,
 * plus the demo's own order-driven consumption on top of it.
 */
export function buildMovements(batches, batchUse) {
    const rows = [...historicalMovements(batches)];

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
