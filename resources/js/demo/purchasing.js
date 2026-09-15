// Purchasing fixture: the batch-handling settings, the purchase orders, the
// supplier delivery notes they produced, the supplier invoices that bill those
// notes and the payments that close the invoices. Second-version content.
//
// A purchase order is written in the supplier's units (kilograms, litres, packs)
// and received in stock units; the conversion sits on the item card. Every
// receipt against an order opens a supplier delivery note that stays open until
// the invoice for it arrives. A payment hangs off invoices — one payment may
// close several — never off the order, and a supplier card's `open` and
// `spend12` are read off that chain, never typed.
import { PAYMENT_TERM, SETTINGS } from '@/config';
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
 * A note opens without an invoice; buildSupplierInvoices() closes the ones the
 * fixture's invoices bill, by writing the invoice id on `invoice`.
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
            invoice: null,
            state: 'open',
        };

        notes.push(note);
        order.deliveryNotes.push(note.id);
    });

    return notes;
}

// ---- supplier invoices and payments -----------------------------------------

const FIRST_INVOICE_NUMBER = 3101;
const FIRST_PAYMENT_NUMBER = 5101;

const VAT_RATE = SETTINGS.vatRate;

const round2 = (value) => Math.round(value * 100) / 100;

/** The scanned invoice and the payment receipt every fixture file opens. */
const INVOICE_SAMPLE_PDF = 'demo/files/invoice-sample.pdf';
const RECEIPT_SAMPLE_PDF = 'demo/files/supplier-receipt.pdf';

const BOOKKEEPERS = [DEMO_ACTORS.orit, DEMO_ACTORS.ella];

/**
 * The nine invoices, as the bookkeeper met them. An entry billing a delivery
 * note names the note by index (`note`) and takes its supplier and its net from
 * the note's lines at the order's prices; a free-standing entry names the
 * supplier and states its net. `daysAgo` is the invoice date; the due date is
 * that plus the supplier's terms. `disputed` and `sent` are the two things the
 * figures cannot say on their own.
 *
 * The plan is written so every state is on screen: paid, partially paid, open
 * and disputed; two of the open ones past due, one due this week, one later.
 */
const INVOICE_PLAN = [
    {
        note: 0,
        category: 'raw_materials',
        daysAgo: 52,
        sent: true,
        text: L('צמחים מיובשים — הזמנה חודשית', 'Dried herbs — monthly order'),
    },
    {
        note: 1,
        category: 'raw_materials',
        daysAgo: 39,
        sent: true,
        text: L('אבקות ותמציות', 'Powders and extracts'),
    },
    {
        supplier: 'S-118',
        category: 'lab_supplies',
        net: 412,
        daysAgo: 39,
        sent: true,
        text: L(
            'נייר סינון, כפיות שקילה וכפפות ניטריל',
            'Filter paper, weighing spatulas and nitrile gloves',
        ),
    },
    {
        supplier: 'S-131',
        category: 'equipment',
        net: 6800,
        daysAgo: 20,
        sent: true,
        text: L(
            'מד-אלכוהול דיגיטלי ומשקל אנליטי — בשני תשלומים',
            'Digital alcoholmeter and analytical balance — two instalments',
        ),
    },
    {
        supplier: 'S-142',
        category: 'packaging',
        net: 1240,
        daysAgo: 24,
        sent: false,
        text: L(
            'בקבוקי ענבר 100 מ״ל — משלוח דחוף',
            'Amber 100 ml bottles — urgent delivery',
        ),
    },
    {
        supplier: 'S-163',
        category: 'shipping',
        net: 2640,
        daysAgo: 46,
        sent: true,
        text: L('משלוחים — יוני', 'Deliveries — June'),
    },
    {
        note: 3,
        category: 'shipping',
        daysAgo: 8,
        sent: false,
        disputed: L(
            'חויבנו על כל ההזמנה — התקבל חלק. ממתין לחשבונית מתוקנת.',
            'Billed for the whole order — part was delivered. Awaiting a corrected invoice.',
        ),
        // The dispute: the supplier billed the order in full while the note
        // shows what actually arrived. The invoice states the full figure.
        netOverride: (po) =>
            po.lines.reduce((sum, line) => sum + line.qty * line.price, 0),
        text: L('משלוחים — חיוב לפי הזמנה', 'Deliveries — billed per order'),
    },
    {
        supplier: 'S-163',
        category: 'shipping',
        net: 2910,
        daysAgo: 25,
        sent: false,
        text: L('משלוחים — יולי', 'Deliveries — July'),
    },
    {
        supplier: 'S-155',
        category: 'raw_materials',
        net: 3560,
        daysAgo: 75,
        sent: true,
        text: L(
            'מוצרי מדף במיתוג טריפוליום — 120 יח׳',
            'Shelf products under the Trifolium brand — 120 units',
        ),
    },
];

/**
 * The six payments, by invoice index into INVOICE_PLAN. `share` is the part of
 * the invoice the allocation pays (1 = the rest). One payment closes two
 * invoices at once; two pay the same invoice in instalments and still leave it
 * partial; one large invoice is paid in a deposit and a balance.
 */
const PAYMENT_PLAN = [
    {
        daysAgo: 44,
        method: 'transfer',
        allocations: [{ invoice: 0, amount: 4000 }],
        text: L(
            'מקדמה 4,000 ₪ על ההזמנה החודשית',
            'Deposit of ₪4,000 on the monthly order',
        ),
    },
    {
        daysAgo: 12,
        method: 'transfer',
        allocations: [{ invoice: 1 }, { invoice: 2 }],
        text: L('שתי חשבוניות בהעברה אחת', 'Two invoices in one transfer'),
    },
    {
        daysAgo: 15,
        method: 'transfer',
        allocations: [{ invoice: 3, amount: 3000 }],
        text: L('תשלום ראשון מתוך שניים', 'First of two instalments'),
    },
    {
        daysAgo: 16,
        method: 'check',
        allocations: [{ invoice: 8 }],
        text: L('שיק דחוי — נפרע', 'Post-dated cheque — cleared'),
    },
    {
        daysAgo: 6,
        method: 'transfer',
        allocations: [{ invoice: 0 }],
        text: L('יתרת ההזמנה החודשית', 'Balance of the monthly order'),
    },
    {
        daysAgo: 2,
        method: 'card',
        allocations: [{ invoice: 3, amount: 2000 }],
        text: L(
            'תשלום שני בכרטיס החברה',
            'Second instalment on the company card',
        ),
    },
];

/** A supplier's own invoice number — a running series of its own. */
const supplierNumber = (slot) => String(spread(slot, 100000, 199999));

/** A bank reference (אסמכתא) or a cheque number. */
const paymentReference = (method, slot) =>
    method === 'check'
        ? String(spread(slot, 1000000, 9999999))
        : `${spread(`${slot}:a`, 10, 99)}-${spread(`${slot}:b`, 100000, 999999)}`;

/** Net of a delivery note: its received lines at the order's prices. */
function noteNet(note, purchaseOrders) {
    const po = purchaseOrders.find((order) => order.id === note.po);

    return note.lines.reduce((sum, line) => {
        const poLine = po?.lines.find((row) => row.sku === line.sku);

        return sum + line.qty * (poLine?.price || 0);
    }, 0);
}

/**
 * Supplier invoices, and the delivery notes they close. Mutates the notes the
 * fixture just built — `invoice` and `state` — the way the store's
 * captureSupplierInvoice() does on the live path.
 *
 * @returns {Array<object>} nine invoices, `paid` still 0 until the payments run
 */
export function buildSupplierInvoices(notes, purchaseOrders, suppliers) {
    return INVOICE_PLAN.map((plan, i) => {
        const id = `SI-${FIRST_INVOICE_NUMBER + i}`;
        const slot = `si:${i}`;
        const note = plan.note !== undefined ? notes[plan.note] : null;
        const po = note
            ? purchaseOrders.find((order) => order.id === note.po)
            : null;
        const supplierCode = note ? note.supplierCode : plan.supplier;
        const supplier = suppliers.find((row) => row.code === supplierCode);
        const net = round2(
            plan.netOverride && po
                ? plan.netOverride(po)
                : note
                  ? noteNet(note, purchaseOrders)
                  : plan.net,
        );
        const vat = round2(net * VAT_RATE);
        const terms = PAYMENT_TERM[supplier?.terms]?.days ?? 30;
        const date = at(
            plan.daysAgo,
            spread(`${slot}:hh`, 9, 16),
            spread(`${slot}:mm`, 0, 59),
        );
        const sentOn = plan.daysAgo - spread(`${slot}:sent`, 1, 4);

        if (note) {
            note.invoice = id;
            note.state = 'closed';
        }

        return {
            id,
            supplierCode,
            supplier: supplier?.name || supplierCode,
            num: supplierNumber(`${slot}:num`),
            date,
            dueOn: isoDaysAgo(plan.daysAgo - terms),
            notes: note ? [note.id] : [],
            category: plan.category,
            currency: po?.currency || 'ILS',
            net,
            vat,
            total: round2(net + vat),
            paid: 0,
            state: plan.disputed ? 'disputed' : 'open',
            file: `att-si-${i + 1}`,
            accounting: {
                sent: Boolean(plan.sent),
                when: plan.sent ? at(Math.max(0, sentOn), 9, 30) : null,
                by: plan.sent ? pickFrom(`${slot}:by`, BOOKKEEPERS) : null,
            },
            by: pickFrom(`${slot}:by`, BOOKKEEPERS),
            note: plan.disputed || plan.text,
        };
    });
}

/**
 * Supplier payments, each closing what it allocates. Mutates the invoices'
 * `paid`; the state is then read off the figures (`supplierInvoiceState`), so
 * one invoice ends partial and the rest paid or untouched.
 */
export function buildSupplierPayments(invoices) {
    return PAYMENT_PLAN.map((plan, i) => {
        const id = `SP-${FIRST_PAYMENT_NUMBER + i}`;
        const slot = `sp:${i}`;
        const allocations = plan.allocations.map((allocation) => {
            const invoice = invoices[allocation.invoice];
            const amount = round2(
                allocation.amount ?? invoice.total - invoice.paid,
            );

            invoice.paid = round2(invoice.paid + amount);

            if (invoice.state !== 'disputed') {
                invoice.state =
                    invoice.paid + 0.005 >= invoice.total ? 'paid' : 'partial';
            }

            return { invoice: invoice.id, amount };
        });
        const first = invoices[plan.allocations[0].invoice];

        return {
            id,
            supplierCode: first.supplierCode,
            supplier: first.supplier,
            date: at(
                plan.daysAgo,
                spread(`${slot}:hh`, 9, 15),
                spread(`${slot}:mm`, 0, 59),
            ),
            amount: round2(
                allocations.reduce(
                    (sum, allocation) => sum + allocation.amount,
                    0,
                ),
            ),
            currency: first.currency,
            method: plan.method,
            reference: paymentReference(plan.method, `${slot}:ref`),
            allocations,
            receipt: `att-sp-${i + 1}`,
            by: pickFrom(`${slot}:by`, BOOKKEEPERS),
            note: plan.text,
        };
    });
}

/**
 * The scanned invoices and payment receipts, as attachment records on the
 * `supplier_invoice` / `supplier_payment` entities. Ids are their own series
 * so they never collide with the item and batch files.
 */
export function buildSupplierFiles(invoices, payments) {
    const rows = [];

    invoices.forEach((invoice, i) => {
        rows.push({
            id: invoice.file,
            entity: 'supplier_invoice',
            ref: invoice.id,
            name: `invoice-${invoice.num}.pdf`,
            type: 'pdf',
            sizeKb: spread(`att:si:${i}:kb`, 140, 620),
            by: invoice.by,
            when: invoice.date,
            note: null,
            url: INVOICE_SAMPLE_PDF,
        });
    });

    payments.forEach((payment, i) => {
        rows.push({
            id: payment.receipt,
            entity: 'supplier_payment',
            ref: payment.id,
            name: `receipt-${payment.reference}.pdf`,
            type: 'pdf',
            sizeKb: spread(`att:sp:${i}:kb`, 60, 240),
            by: payment.by,
            when: payment.date,
            note: null,
            url: RECEIPT_SAMPLE_PDF,
        });
    });

    return rows;
}

/** Rough conversion into shekels for a card figure, whatever the invoice currency. */
const inIls = (amount, currency) => amount * (TO_ILS[currency] || 1);

/**
 * What a supplier's chain says about him: everything billed in the last twelve
 * months and everything still owed. The same two figures the store recomputes
 * after a payment, written the same way.
 */
export function supplierMoney(code, invoices) {
    const own = invoices.filter((invoice) => invoice.supplierCode === code);

    return {
        spend12: Math.round(
            own
                .filter((invoice) => invoice.date.daysAgo <= 365)
                .reduce(
                    (sum, invoice) =>
                        sum + inIls(invoice.total, invoice.currency),
                    0,
                ),
        ),
        open: round2(
            own.reduce(
                (sum, invoice) =>
                    sum +
                    inIls(
                        Math.max(0, invoice.total - invoice.paid),
                        invoice.currency,
                    ),
                0,
            ),
        ),
    };
}

/**
 * Write the derived money figures onto each supplier card, so the card and the
 * invoice list never disagree. Mutates the cards — the same pattern as
 * applyBalances() in demo/money.js.
 */
export function applySupplierBalances(suppliers, invoices) {
    suppliers.forEach((supplier) => {
        Object.assign(supplier, supplierMoney(supplier.code, invoices));
    });

    return suppliers;
}
