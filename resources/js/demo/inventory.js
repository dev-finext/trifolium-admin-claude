// Inventory. The quantities here ARE the stock — nothing is pulled from an
// outside system.
//
// Goods receipt is the only way stock enters: each receipt line opens one batch
// with its own expiry, and every batch can be traced forward to the customer
// who received it. Purchase orders are not managed here, so a receipt records
// the supplier's name and delivery-note number as plain data.
import { BATCH_EXPIRY_WARN_DAYS } from '@/config';
import { at, fraction, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { SHELF_ITEMS } from '@/demo/products';
import REAL_INGREDIENTS from '@/demo/real/ingredients.json';
import REAL_ORDERS from '@/demo/real/orders.json';
import { DEMO_SUPPLIERS } from '@/demo/vendors';
import { daysSince, isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/** How many goods receipts the fixture carries, and the batch series they open. */
const RECEIPT_COUNT = 7;
const FIRST_BATCH_NUMBER = 2610;

/** The minimum the fixture authors its own shelf rows against. */
const SHELF_MIN = 12;

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

const BASE_AND_PACK = [
    {
        sku: 'BS-2001',
        priceSku: '210010',
        kind: 'base',
        name: L('אלכוהול 96% מזוקק', 'Distilled alcohol 96%'),
        lat: 'Ethanol 96%',
        wh: 'raw',
        unit: 'ml',
        onHand: 41200,
        alloc: 3800,
        min: 12000,
        createdDaysAgo: 640,
    },
    {
        sku: 'BS-2002',
        priceSku: '210024',
        kind: 'base',
        name: L('גליצרין צמחי', 'Vegetable glycerin'),
        lat: 'Glycerin USP',
        wh: 'raw',
        unit: 'ml',
        onHand: 8600,
        alloc: 900,
        min: 4000,
        createdDaysAgo: 610,
    },
    {
        sku: 'PK-3001',
        priceSku: null,
        kind: 'pack',
        name: L('בקבוק זכוכית כהה 100 מ״ל', 'Amber glass bottle 100 ml'),
        lat: 'amber glass',
        wh: 'shelf',
        unit: 'unit',
        onHand: 640,
        alloc: 120,
        min: 300,
        createdDaysAgo: 520,
    },
    {
        sku: 'PK-3002',
        priceSku: null,
        kind: 'pack',
        name: L('בקבוק זכוכית כהה 50 מ״ל', 'Amber glass bottle 50 ml'),
        lat: 'amber glass',
        wh: 'shelf',
        unit: 'unit',
        onHand: 180,
        alloc: 60,
        min: 300,
        createdDaysAgo: 500,
    },
];

/** Recompute the derived fields after any change to a stock row. */
export function syncStockRow(row) {
    row.avail = row.onHand - row.alloc;
    row.low = row.avail < row.min;

    return row;
}

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
    hydrosol: 'base',
    essential_oil: 'base',
    consumable: 'base',
    packaging: 'pack',
    shelf: 'shelf',
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
    const onHand = Math.max(0, Math.round((item.onHand || 0) * 100) / 100);
    // SAP's foreign-name field holds the pinyin where a herb has one, and
    // repeats the botanical name where it does not. The difference is what
    // makes a herb part of the Chinese materia medica.
    const pinyin =
        item.nameForeign && item.nameForeign !== item.nameHe
            ? item.nameForeign
            : null;

    return {
        sku: item.code,
        priceSku: item.code,
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

/**
 * Stock rows, straight off the catalogue SAP holds.
 *
 * The 200 ingredients were drawn in proportion to the real families, so the
 * mix on screen is the pharmacy's mix. Any item an order line names but the
 * sample missed is added from that line, so every formula still resolves to a
 * stock row and FEFO has something to pick from.
 */
export function buildStock() {
    const rows = REAL_INGREDIENTS.map(stockRowOf);
    const seen = new Set(rows.map((row) => row.sku));

    REAL_ORDERS.forEach((order) => {
        (order.lines || []).forEach((line) => {
            if (!line.code || seen.has(line.code)) {
                return;
            }

            seen.add(line.code);
            rows.push(
                stockRowOf({
                    code: line.code,
                    nameHe: line.name,
                    nameForeign: line.foreignName,
                    family: 'herb',
                    stockUom: line.unit,
                    onHand: spread(`stock:${line.code}:onhand`, 400, 6000),
                    committed: 0,
                    minLevel: 800,
                    lastPurchasePrice: line.price ?? null,
                    createdOn: null,
                }),
            );
        });
    });

    return [...rows, ...buildBasesAndShelf()].map(syncStockRow);
}

/** The bases, packaging and shelf rows the fixture still authors itself. */
function buildBasesAndShelf() {
    const bases = BASE_AND_PACK.map(({ createdDaysAgo, ...row }) => ({
        ...row,
        herbId: null,
        cn: null,
        system: 'west',
        size: null,
        sizeUnit: null,
        price: null,
        created: isoDaysAgo(createdDaysAgo),
    }));

    const shelf = SHELF_ITEMS.map((item) => {
        const onHand = spread(`stock:${item.sku}:onhand`, 2, 90);

        return {
            sku: item.sku,
            priceSku: null,
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
    });

    return [...bases, ...shelf];
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

const RECEIVERS = [DEMO_ACTORS.ronit, DEMO_ACTORS.avi, DEMO_ACTORS.danaRaz];

/** Goods receipts — the single entry point of all stock. */
export function buildReceipts(stock) {
    const suppliers = DEMO_SUPPLIERS.slice(0, 5);
    const receipts = [];
    let batchNumber = FIRST_BATCH_NUMBER;

    for (let i = 0; i < RECEIPT_COUNT; i += 1) {
        const slot = `receipt:${i}`;
        const supplier = suppliers[i % suppliers.length];
        const days = 3 + i * 9;
        const lineCount = spread(`${slot}:lines`, 2, 4);
        const lines = [];

        for (let k = 0; k < lineCount; k += 1) {
            const lineSlot = `${slot}:line:${k}`;
            const item = pickFrom(lineSlot, stock);
            const qty =
                item.unit === 'unit'
                    ? spread(`${lineSlot}:qty`, 20, 120)
                    : spread(`${lineSlot}:qty`, 1200, 8000);
            const shelfLifeMonths =
                item.kind === 'raw'
                    ? spread(`${lineSlot}:life`, 18, 36)
                    : spread(`${lineSlot}:life`, 24, 48);

            lines.push({
                sku: item.sku,
                name: item.name,
                unit: item.unit,
                qty,
                wh: item.wh,
                batch: `B-${batchNumber}`,
                expiry: isoDaysAgo(
                    -Math.round(shelfLifeMonths * 30) +
                        spread(`${lineSlot}:jitter`, 0, 180),
                ),
                supplierBatch: `L${spread(`${lineSlot}:sbatch`, 10000, 99999)}`,
                // V2: how many item labels the receipt asked for
                labels: spread(`${lineSlot}:labels`, 1, 3),
            });

            batchNumber += 1;
        }

        receipts.push({
            id: `GR-26${70 + i * 2}`,
            supplier: supplier.name,
            supplierCode: supplier.code,
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

/** One batch per receipt line, with what is left of it. */
export function buildBatches(receipts) {
    const batches = [];

    receipts.forEach((receipt) => {
        receipt.lines.forEach((line) => {
            const daysToExp = -daysSince(line.expiry);
            const remaining = Math.round(
                line.qty * (fraction(`batch:${line.batch}:left`) * 0.7 + 0.15),
            );

            batches.push({
                id: line.batch,
                sku: line.sku,
                name: line.name,
                unit: line.unit,
                wh: line.wh,
                receipt: receipt.id,
                supplier: receipt.supplier,
                supplierBatch: line.supplierBatch,
                received: receipt.when,
                qty: line.qty,
                remaining,
                expiry: line.expiry,
                daysToExp,
                state: batchState(remaining, daysToExp),
                by: receipt.by,
            });
        });
    });

    // Two fixed cases, so both expiry states are always on screen whatever the
    // rest of the fixture does.
    if (batches.length > 5) {
        batches[1] = {
            ...batches[1],
            expiry: isoDaysAgo(-46),
            daysToExp: 46,
            state: 'expiring',
        };
        batches[3] = {
            ...batches[3],
            expiry: isoDaysAgo(18),
            daysToExp: -18,
            state: 'expired',
        };
    }

    return batches;
}

function batchState(remaining, daysToExp) {
    if (remaining === 0) {
        return 'depleted';
    }

    if (daysToExp < 0) {
        return 'expired';
    }

    return daysToExp < BATCH_EXPIRY_WARN_DAYS ? 'expiring' : 'active';
}

/** Traceability: batch → compounded item → order → customer. */
export function buildBatchUse(orders, batches) {
    const usable = batches.filter(
        (batch) => batch.sku.startsWith('RM') || batch.sku.startsWith('BS'),
    );
    const rows = [];

    if (!usable.length) {
        return rows;
    }

    // Only an order the lab actually started consumes a batch.
    orders
        .filter((order) =>
            ['lab', 'packed', 'sent', 'closed'].includes(order.status),
        )
        .forEach((order) => {
            order.items
                .filter((item) => item.kind === 'formula' && !item.cancelled)
                .forEach((item) => {
                    const batch =
                        usable[
                            (Number(String(order.id).replace(/\D/g, '')) +
                                item.id.length) %
                                usable.length
                        ];

                    rows.push({
                        id: `bu-${item.id}`,
                        batch: batch.id,
                        batchName: batch.name,
                        sku: batch.sku,
                        order: order.id,
                        item: item.id,
                        itemName: item.name,
                        patient: order.patient.name,
                        practitioner: order.practitioner.name,
                        qty: spread(`use:${item.id}`, 4, 42),
                        unit: batch.unit,
                        when: order.placed,
                        status: order.status,
                    });
                });
        });

    return rows;
}

/**
 * The stock ledger, newest first. Every row here is a projection of a receipt
 * line or a batch allocation that already exists — nothing moves stock in this
 * fixture without a document behind it.
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
            id: `mv-alloc-${use.item}`,
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

    return rows.sort((a, b) =>
        `${b.when.iso}${b.id}`.localeCompare(`${a.when.iso}${a.id}`),
    );
}

/** The batch number a new receipt line would open. */
export function nextBatchNumber(batches) {
    return `B-${FIRST_BATCH_NUMBER + batches.length + 1}`;
}
