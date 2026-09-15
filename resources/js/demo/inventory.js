// Inventory. The quantities here ARE the stock — nothing is pulled from an
// outside system.
//
// Goods receipt is the only way stock enters: each receipt line opens one batch
// with its own expiry, and every batch can be traced forward to the customer
// who received it. The receipts that were made against a purchase order carry
// its id; the rest record the supplier's name and delivery-note number as
// plain data.
import { BATCH_EXPIRY_WARN_DAYS, convertQty, familyOfCode } from '@/config';
import { at, fraction, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { SHELF_ITEMS } from '@/demo/products';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_ORDERS from '@/demo/real/orders.json';
import { DEMO_SUPPLIERS } from '@/demo/vendors';
import { daysSince, isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/** How many goods receipts the fixture carries, and the batch series they open. */
const RECEIPT_COUNT = 16;
const FIRST_BATCH_NUMBER = 2610;

/** Days between one receipt and the next, newest first. */
const RECEIPT_GAP_DAYS = 7;

/** The minimum the fixture authors its own shelf rows against. */
const SHELF_MIN = 12;

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

/**
 * The bases and packaging the fixture authors itself, numbered the way SAP
 * numbers them — 30 for bases, 40 for glass — so the code-prefix rules of the
 * price lists and the item families reach them like any real row.
 */
const BASE_AND_PACK = [
    {
        sku: '300901',
        kind: 'base',
        name: L('אלכוהול 96% מזוקק', 'Distilled alcohol 96%'),
        lat: 'Ethanol 96%',
        wh: 'raw',
        unit: 'ml',
        onHand: 41200,
        alloc: 3800,
        min: 12000,
        price: 0.041,
        createdDaysAgo: 640,
    },
    {
        sku: '300902',
        kind: 'base',
        name: L('גליצרין צמחי', 'Vegetable glycerin'),
        lat: 'Glycerin USP',
        wh: 'raw',
        unit: 'ml',
        onHand: 8600,
        alloc: 900,
        min: 4000,
        price: 0.028,
        createdDaysAgo: 610,
    },
    {
        sku: '300903',
        kind: 'base',
        name: L('שמן זית כתית — בסיס להשריה', 'Virgin olive oil — infusion base'),
        lat: 'Olea europaea oleum',
        wh: 'raw',
        unit: 'ml',
        onHand: 18400,
        alloc: 0,
        min: 5000,
        price: 0.034,
        createdDaysAgo: 420,
    },
    {
        sku: '400101',
        kind: 'pack',
        name: L('בקבוק זכוכית כהה 100 מ״ל', 'Amber glass bottle 100 ml'),
        lat: 'amber glass',
        wh: 'shelf',
        unit: 'unit',
        onHand: 640,
        alloc: 120,
        min: 300,
        price: 1.9,
        createdDaysAgo: 520,
    },
    {
        sku: '400102',
        kind: 'pack',
        name: L('בקבוק זכוכית כהה 50 מ״ל', 'Amber glass bottle 50 ml'),
        lat: 'amber glass',
        wh: 'shelf',
        unit: 'unit',
        onHand: 180,
        alloc: 60,
        min: 300,
        price: 1.4,
        createdDaysAgo: 500,
    },
];

/**
 * Stock-tracked consumables nobody weighs per order — consumed by time. Each
 * carries the rate the pharmacy goes through it, the last count and what was
 * found; the builder posts the movements a nightly job would have written
 * since the count and reduces the stock accordingly. `countedQty` minus the
 * periods elapsed is what the shelf holds today; the toilet paper is meant to
 * come out under its minimum so the low-stock exception has a time-consumed
 * item in it.
 */
export const CONSUMABLE_USAGE = [
    {
        sku: '300910',
        name: L('נייר טואלט (גליל)', 'Toilet paper (roll)'),
        min: 30,
        qty: 8,
        periodDays: 7,
        countedDaysAgo: 63,
        countedQty: 96,
        price: 1.6,
    },
    {
        sku: '300911',
        name: L('מגבות נייר (גליל)', 'Paper towels (roll)'),
        min: 12,
        qty: 4,
        periodDays: 7,
        countedDaysAgo: 35,
        countedQty: 60,
        price: 4.2,
    },
    {
        sku: '300912',
        name: L('כפפות ניטריל M (קופסה)', 'Nitrile gloves M (box)'),
        min: 6,
        qty: 2,
        periodDays: 7,
        countedDaysAgo: 49,
        countedQty: 30,
        price: 42,
    },
    {
        sku: '300913',
        name: L('מגבוני אלכוהול לחיטוי (אריזה)', 'Alcohol cleaning wipes (pack)'),
        min: 10,
        qty: 3,
        periodDays: 14,
        countedDaysAgo: 28,
        countedQty: 40,
        price: 11.5,
    },
];

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
        wh: kind === 'shelf' ? 'shelf' : 'raw',
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
 * Stock rows, straight off the catalogue SAP holds.
 *
 * The 200 ingredients were drawn in proportion to the real families, so the
 * mix on screen is the pharmacy's mix. Any ingredient an order line names but
 * the sample missed is added from that line, so every formula still resolves
 * to a stock row and FEFO has something to pick from. A shelf product on an
 * order line is NOT added here — the product master authors it below, once —
 * and a delivery fee or a workshop is a line on the order, not a thing on a
 * shelf.
 */
export function buildStock() {
    const rows = REAL_INGREDIENTS.map(stockRowOf);
    const seen = new Set(rows.map((row) => row.sku));
    const shelfSkus = new Set(SHELF_ITEMS.map((item) => item.sku));

    REAL_ORDERS.forEach((order) => {
        (order.lines || []).forEach((line) => {
            const family = familyOfCode(line.code);

            if (
                !line.code ||
                !family ||
                seen.has(line.code) ||
                shelfSkus.has(line.code) ||
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

    return [...rows, ...buildBasesAndShelf(seen)].map(syncStockRow);
}

/** The bases, packaging, consumables and shelf rows the fixture still authors itself. */
function buildBasesAndShelf(seen) {
    const bases = BASE_AND_PACK.map(({ createdDaysAgo, ...row }) => ({
        ...row,
        herbId: null,
        cn: null,
        system: 'west',
        size: null,
        sizeUnit: null,
        created: isoDaysAgo(createdDaysAgo),
    }));

    // What the shelf holds today: the last count less one period's usage for
    // every period the nightly job has run since.
    const consumables = CONSUMABLE_USAGE.map((usage) => ({
        sku: usage.sku,
        herbId: null,
        kind: 'base',
        name: usage.name,
        lat: null,
        cn: null,
        system: 'west',
        wh: 'raw',
        unit: 'unit',
        size: null,
        sizeUnit: null,
        price: usage.price,
        onHand: Math.max(
            0,
            usage.countedQty -
                periodsSince(usage.countedDaysAgo, usage.periodDays) *
                    usage.qty,
        ),
        alloc: 0,
        min: usage.min,
        created: isoDaysAgo(usage.countedDaysAgo + 200),
    }));

    const shelf = SHELF_ITEMS.filter((item) => !seen.has(item.sku)).map(
        (item) => {
            const onHand = spread(`stock:${item.sku}:onhand`, 2, 90);

            return {
                sku: item.sku,
                herbId: null,
                kind: 'shelf',
                name: item.name,
                lat: null,
                cn: null,
                system: 'west',
                wh: 'shelf',
                unit: 'unit',
                size: item.size,
                sizeUnit: item.unit,
                price: item.price,
                onHand,
                alloc: Math.min(onHand, spread(`stock:${item.sku}:alloc`, 0, 8)),
                min: SHELF_MIN,
                created: isoDaysAgo(spread(`stock:${item.sku}:created`, 60, 500)),
            };
        },
    );

    return [...bases, ...consumables, ...shelf];
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
 * The components the in-house recipes consume (demo/items.js INTERNAL_TREES):
 * the herbs of the three tinctures, the powder's herb, the infused oil's herb,
 * the alcohol and the carrier oil. They go into the OLDEST receipts so a
 * production run dated weeks ago had a batch to draw from.
 */
const PRODUCTION_INPUT_SKUS = [
    '100497',
    '100482',
    '100060',
    '100224',
    '300901',
    '300903',
];

/**
 * Which items the receipts should open batches for, oldest receipt first: the
 * production inputs, then the ingredients the real order book names, most
 * used first. A herb an order actually consumed is what a batch has to exist
 * for — traceability that points at herbs nobody ordered is theatre.
 */
function receiptLinePool(stock) {
    const bySku = new Map(stock.map((row) => [row.sku, row]));
    const usage = new Map();

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
        .filter((sku) => !PRODUCTION_INPUT_SKUS.includes(sku));

    return [...PRODUCTION_INPUT_SKUS, ...ordered]
        .map((sku) => bySku.get(sku))
        .filter(Boolean);
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
export function buildReceipts(stock) {
    const pool = receiptLinePool(stock);
    const receipts = [];
    // Lines are dealt from the pool, and batch numbers run, oldest receipt
    // first — the list itself is newest first, as every list here is.
    const deal = [];
    let dealt = 0;

    for (let i = RECEIPT_COUNT - 1; i >= 0; i -= 1) {
        deal[i] = { count: spread(`receipt:${i}:lines`, 3, 6), from: dealt };
        dealt += deal[i].count;
    }

    for (let i = 0; i < RECEIPT_COUNT; i += 1) {
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
                batch: `B-${FIRST_BATCH_NUMBER + from + k}`,
                expiry: isoDaysAgo(
                    -Math.round(shelfLifeMonths * 30) +
                        spread(`${lineSlot}:jitter`, 0, 180),
                ),
                supplierBatch: `L${spread(`${lineSlot}:sbatch`, 10000, 99999)}`,
                // V2: how many item labels the receipt asked for
                labels: spread(`${lineSlot}:labels`, 1, 3),
            });
        }

        receipts.push({
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
                              (0.55 + fraction(`batch:${line.batch}:left`) * 0.4),
                      )
                    : line.qty;

            batches.push({
                id: line.batch,
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

                            const take = round3(Math.min(batch.remaining, need));

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
export function buildMovements(receipts, batchUse, stock = []) {
    const rows = [];
    const bySku = new Map(stock.map((row) => [row.sku, row]));

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
            wh: 'raw',
            qty: -use.qty,
            batch: use.batch,
            ref: use.order,
            when: use.when,
            by: null,
        });
    });

    CONSUMABLE_USAGE.forEach((usage) => {
        const row = bySku.get(usage.sku);
        const periods = periodsSince(usage.countedDaysAgo, usage.periodDays);

        for (let k = 1; k <= periods; k += 1) {
            rows.push({
                id: `mv-time-${usage.sku}-${k}`,
                kind: 'time_consumption',
                sku: usage.sku,
                name: row ? row.name : usage.name,
                unit: row ? row.unit : 'unit',
                wh: row ? row.wh : 'raw',
                qty: -usage.qty,
                batch: null,
                ref: null,
                // the nightly job runs at half past two
                when: at(usage.countedDaysAgo - k * usage.periodDays, 2, 30),
                by: null,
            });
        }
    });

    return sortMovements(rows);
}

/** Newest first, ties broken by id so the order is stable. */
export function sortMovements(rows) {
    return rows.sort((a, b) =>
        `${b.when.iso}${b.id}`.localeCompare(`${a.when.iso}${a.id}`),
    );
}
