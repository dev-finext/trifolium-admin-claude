// Purchasing fixture: the batch-handling settings, the purchase orders and the
// supplier delivery notes they produced. Second-version content.
//
// A purchase order is written in the supplier's units (kilograms, litres, packs)
// and received in stock units; the conversion sits on the item card. Every
// receipt against an order opens a supplier delivery note that stays open until
// the invoice for it arrives.
import { at, chance, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * The batch-handling settings — data, edited in the console, never a constant:
 * the pick rule, the default shelf life per item family, and the prefix each
 * batch source numbers under.
 */
export const INVENTORY_SETTINGS = {
    pickMode: 'fefo',
    batchSeries: { supplier: 'B-', production: 'P-', waste: 'W-' },
    defaultExpiryMonths: {
        herb: 24,
        herb_1to1: 24,
        extract: 36,
        hydrosol: 12,
        essential_oil: 36,
        supplement: 24,
        tincture: 24,
        infused_oil: 12,
        formula: 12,
        private_label: 24,
        consumable: 36,
        packaging: null,
        admin: null,
        shelf: 12,
        bought_shelf: 24,
        workshop: null,
        labour: null,
    },
    updated: at(40, 11, 20),
    updatedBy: DEMO_ACTORS.orit,
};

const PO_COUNT = 7;
const FIRST_PO_NUMBER = 26031;

/** The state mix the screens were designed against, read modulo the index. */
const STATE_MIX = [
    'closed',
    'closed',
    'partial',
    'open',
    'open',
    'partial',
    'open',
];

const BUYERS = [DEMO_ACTORS.orit, DEMO_ACTORS.ella];

/** Rough conversion into shekels, for a fixture line priced in another currency. */
const TO_ILS = { ILS: 1, EUR: 4, USD: 3.7 };

/** The currency a supplier card trades in, from the symbol it carries. */
function supplierCurrency(supplier) {
    if (supplier?.cur === '$') {
        return 'USD';
    }

    if (supplier?.cur === '€') {
        return 'EUR';
    }

    return 'ILS';
}

const PO_NOTES = [
    null,
    L(
        'לתאם אספקה מראש — המחסן סגור בימי שישי',
        'Arrange delivery in advance — the warehouse is closed on Fridays',
    ),
    null,
    L(
        'COA לכל אצווה, כתנאי לקליטה',
        'A COA with every batch, as a condition of receipt',
    ),
];

/** A plausible quantity in the item's purchase unit. */
function orderQty(slot, uom) {
    if (uom === 'kg') {
        return spread(slot, 2, 25);
    }

    if (uom === 'l') {
        return spread(slot, 5, 40);
    }

    if (uom === 'pack') {
        return spread(slot, 1, 6);
    }

    return spread(slot, 10, 120);
}

/**
 * Purchase orders, one supplier each, drawn from the items that name that
 * supplier as preferred. Quantities are in the purchase unit; `received` counts
 * what has arrived so far in the same unit.
 */
export function buildPurchaseOrders(items, suppliers) {
    const purchasable = items.filter(
        (item) => item.flags?.purchase && item.suppliers?.preferred,
    );
    const codes = suppliers
        .map((supplier) => supplier.code)
        .filter((code) =>
            purchasable.some((item) => item.suppliers.preferred === code),
        );

    if (!codes.length) {
        return [];
    }

    const orders = [];

    for (let i = 0; i < PO_COUNT; i += 1) {
        const slot = `po:${i}`;
        const code = codes[i % codes.length];
        const supplier = suppliers.find((row) => row.code === code);
        const pool = purchasable.filter(
            (item) => item.suppliers.preferred === code,
        );
        const state = STATE_MIX[i % STATE_MIX.length];
        const wanted = Math.min(pool.length, spread(`${slot}:lines`, 2, 5));
        const picked = [];

        for (let k = 0; picked.length < wanted && k < pool.length * 3; k += 1) {
            const item = pickFrom(`${slot}:pick:${k}`, pool);

            if (!picked.includes(item)) {
                picked.push(item);
            }
        }

        const currency = supplierCurrency(supplier);

        const lines = picked.map((item, k) => {
            const uom = item.uom?.purchase || 'unit';
            const qty = orderQty(`${slot}:qty:${k}`, uom);
            const own =
                item.price?.lastPurchase ??
                spread(`${slot}:price:${k}`, 20, 300);
            const base =
                (own * (TO_ILS[item.price?.currency] || 1)) / TO_ILS[currency];
            const received =
                state === 'closed'
                    ? qty
                    : state === 'partial'
                      ? chance(`${slot}:part:${k}`, 0.6)
                          ? spread(`${slot}:recv:${k}`, 1, Math.max(1, qty - 1))
                          : 0
                      : 0;

            return {
                sku: item.sku,
                name: { he: item.names.he, en: item.names.en || item.names.he },
                qty,
                uom,
                price:
                    Math.round(
                        base *
                            (0.95 + spread(`${slot}:jit:${k}`, 0, 10) / 100) *
                            100,
                    ) / 100,
                received: Math.min(received, qty),
            };
        });

        // A partial order must actually be partial.
        if (state === 'partial' && !lines.some((line) => line.received > 0)) {
            lines[0].received = Math.max(1, Math.floor(lines[0].qty / 2));
        }

        const createdDays =
            state === 'closed'
                ? spread(`${slot}:days`, 40, 90)
                : state === 'partial'
                  ? spread(`${slot}:days`, 10, 30)
                  : spread(`${slot}:days`, 1, 12);
        const lead = supplier?.lead || 7;

        orders.push({
            id: `PO-${FIRST_PO_NUMBER + i}`,
            supplierCode: code,
            supplier: supplier.name,
            state,
            currency,
            created: at(
                createdDays,
                spread(`${slot}:hh`, 9, 16),
                spread(`${slot}:mm`, 0, 59),
            ),
            eta: state === 'closed' ? null : isoDaysAgo(createdDays - lead),
            by: pickFrom(`${slot}:by`, BUYERS),
            lines,
            notes: pickFrom(`${slot}:note`, PO_NOTES),
            deliveryNotes: [],
        });
    }

    return orders;
}

/**
 * Supplier delivery notes: one per order that has had goods received against it.
 * A closed order's note carries the invoice that closed it; a partial order's
 * note is still waiting for one.
 */
export function buildSupplierNotes(orders, receipts) {
    const notes = [];

    orders.forEach((order) => {
        const received = order.lines.filter((line) => line.received > 0);

        if (!received.length) {
            return;
        }

        const slot = `sdn:${order.id}`;
        const daysAgo = Math.max(
            1,
            order.created.daysAgo - spread(`${slot}:lag`, 3, 12),
        );
        const closed = order.state === 'closed';
        const note = {
            id: `SDN-${7781 + notes.length}`,
            po: order.id,
            supplierCode: order.supplierCode,
            supplier: order.supplier,
            docNum: String(spread(`${slot}:doc`, 400000, 499999)),
            when: at(
                daysAgo,
                spread(`${slot}:hh`, 9, 16),
                spread(`${slot}:mm`, 0, 59),
            ),
            lines: received.map((line) => ({
                sku: line.sku,
                name: line.name,
                qty: line.received,
                uom: line.uom,
            })),
            receipt:
                receipts[notes.length % Math.max(1, receipts.length)]?.id ||
                null,
            invoice: closed
                ? {
                      num: String(spread(`${slot}:inv`, 100000, 199999)),
                      when: at(
                          Math.max(
                              0,
                              daysAgo - spread(`${slot}:invlag`, 2, 20),
                          ),
                      ),
                  }
                : null,
            state: closed ? 'closed' : 'open',
        };

        notes.push(note);
        order.deliveryNotes.push(note.id);
    });

    return notes;
}
