// V3 — the history the planning report reads: what each item consumed month by
// month, what is on order for it, and who has supplied it before.
//
// None of this is fabricated. All three files come straight out of the restored
// SAP database by `scripts/extract-sap/extract.py`:
//
//   consumption.json    24 months per item, on the pharmacy's own definition of
//                       consumption (`CONSUMPTION_SKIP` there, and the same list
//                       restated as `CONSUMPTION_EXCLUDED_SAP_TYPES` in
//                       config/planning.js). `direct` is the slice of it that
//                       left as a sale of raw material rather than into a run.
//   openOrders.json     open purchase-order lines (POR1) and open production
//                       orders (OWOR), so column 7 of the client's note can say
//                       not just how much is coming but from whom.
//   purchaseHistory.json  one row per item and supplier out of the receipts
//                       (OPDN/PDN1): how much was taken, at what price, when.
//
// The console's demo clock runs at 2026-09; the database was backed up on
// 2026-08-05, so the history ends at 2026-07. `shiftMonths` moves the whole
// series forward so the report's "last fourteen months" lands on months the
// rest of the console also believes in — the numbers are untouched, only the
// month they are filed under.
import REAL_CONSUMPTION from '@/demo/real/consumption.json';
import REAL_OPEN_ORDERS from '@/demo/real/openOrders.json';
import REAL_PURCHASE_HISTORY from '@/demo/real/purchaseHistory.json';
import { isoDaysAgo } from '@/lib/dates';

/** 'YYYY-MM' plus n months. */
function addMonths(ym, n) {
    const [year, month] = ym.split('-').map(Number);
    const total = year * 12 + (month - 1) + n;

    return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String(
        (total % 12) + 1,
    ).padStart(2, '0')}`;
}

/** How many months apart two 'YYYY-MM' are. */
function monthsBetween(from, to) {
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);

    return (ty - fy) * 12 + (tm - fm);
}

/** The month the console's clock is in. */
function currentMonth() {
    return isoDaysAgo(0).slice(0, 7);
}

const shift = (() => {
    const last = REAL_CONSUMPTION.to;

    if (!last) {
        return 0;
    }

    // The last whole month before today is where the history should end: the
    // month in progress is a stub in the real data too.
    return monthsBetween(last, addMonths(currentMonth(), -1));
})();

const moveSeries = (series) =>
    Object.fromEntries(
        Object.entries(series || {}).map(([ym, qty]) => [
            addMonths(ym, shift),
            qty,
        ]),
    );

/**
 * Consumption per item per month, keyed by item number.
 *
 * `months` is every month the window covers, oldest first, so a report can walk
 * them in order without reading the keys of a sparse object.
 */
export function buildConsumption() {
    return {
        from: REAL_CONSUMPTION.from
            ? addMonths(REAL_CONSUMPTION.from, shift)
            : null,
        to: REAL_CONSUMPTION.to ? addMonths(REAL_CONSUMPTION.to, shift) : null,
        months: (REAL_CONSUMPTION.months || []).map((ym) =>
            addMonths(ym, shift),
        ),
        rows: (REAL_CONSUMPTION.rows || []).map((row) => ({
            sku: row.code,
            months: moveSeries(row.months),
            direct: moveSeries(row.direct),
        })),
    };
}

/**
 * What is on order for an item and from whom — a supplier for a purchase order,
 * the run itself for a production order.
 */
export function buildOpenOrders() {
    return REAL_OPEN_ORDERS.map((row, i) => ({
        id: `oo-${row.kind}-${row.doc}-${row.code}-${i}`,
        sku: row.code,
        kind: row.kind,
        doc: row.doc,
        partyCode: row.partyCode || null,
        party: row.party || null,
        qty: Number(row.qty) || 0,
        uom: row.uom || null,
        due: row.due || null,
        placed: row.placed || null,
    }));
}

/**
 * Who has actually supplied an item. The client's note asks the report to
 * recommend a supplier and to show "מה קורה שאין לספק למי כן היה" — which is
 * answerable only from the receipts, not from the one preferred supplier the
 * item card names.
 */
export function buildPurchaseHistory() {
    return REAL_PURCHASE_HISTORY.map((row, i) => ({
        id: `ph-${row.code}-${row.supplierCode}-${i}`,
        sku: row.code,
        supplierCode: row.supplierCode || null,
        supplier: row.supplier || null,
        lines: Number(row.lines) || 0,
        qty: Number(row.qty) || 0,
        lastOn: row.lastOn || null,
        lowPrice: Number(row.lowPrice) || 0,
        highPrice: Number(row.highPrice) || 0,
    }));
}
