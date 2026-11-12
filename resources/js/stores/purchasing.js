// Purchasing: purchase orders, receipts against them, supplier delivery notes,
// the batch-handling settings, and the consumption report the buyer plans from.
// Second-version material.
//
// Stock itself still moves only through the inventory store's goods receipt —
// receiving against an order calls it and then records what the order got.
//
// Supplier documents (12.11.2026) live here too: every goods receipt is booked
// in through `receiveDocument`, a tax invoice is recorded on the supplier the
// moment it arrives, and `attachInvoice` attaches one tax invoice to open
// delivery notes. The whole model is written out in config/supplierDocs.js.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    ATTACHMENT_RULES,
    docRef,
    invoiceDueState,
    isOpenNote,
    PAYMENT_TERM,
    PO_RECEIVABLE_STATE_IDS,
    receiptNet,
    SETTINGS,
    supplierInvoiceOpen,
    supplierInvoiceState,
    supplierMoney,
} from '@/config';
import { persist } from '@/data/source';
import { inRange } from '@/lib/dateRange';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { supplierPaymentBlocked } from '@/stores/system';

const round2 = (value) => Math.round(value * 100) / 100;

/** The first day of the month a date falls in, as ISO. */
const monthStart = (iso) => `${String(iso).slice(0, 7)}-01`;

/** Orders whose shelf lines have left the pharmacy — what "sales" counts. */
const SOLD_STATUS_IDS = ['shipped', 'collected'];

const PO_SERIES = 'PO-';
const NOTE_SERIES = 'SDN-';

/**
 * The expense category a goods invoice is filed under, by the kind of supplier
 * it came from — the accountant's split, never asked of the receiver.
 */
const CATEGORY_BY_SUPPLIER_KIND = {
    raw_materials: 'raw_materials',
    packaging: 'packaging',
    logistics: 'shipping',
};

/** A price the person typed: a number, zero or more. */
const isPrice = (value) =>
    value !== '' &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0;

/** A file's extension, the attachment record's `type`. */
const extensionOf = (name) =>
    (String(name)
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/) || [])[1] || '';

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

function nextSerial(ids, series) {
    const highest = ids.reduce((top, id) => {
        const digits = String(id).match(/(\d+)\s*$/);

        return digits ? Math.max(top, Number(digits[1])) : top;
    }, 0);

    return `${series}${highest + 1}`;
}

export const usePurchasingStore = defineStore('purchasing', () => {
    const dataset = useDatasetStore();
    const inventory = useInventoryStore();
    const items = useItemsStore();

    const list = (name) =>
        Array.isArray(dataset.data[name]) ? dataset.data[name] : [];

    const purchaseOrders = computed(() => list('purchaseOrders'));
    const supplierNotes = computed(() => list('supplierNotes'));
    // The supplier's side of the money: what was billed for the deliveries,
    // and what was paid against those bills (spec: payments hang off invoices,
    // never off the purchase order — one payment may close several invoices).
    const supplierInvoices = computed(() => list('supplierInvoices'));
    const supplierPayments = computed(() => list('supplierPayments'));
    const settings = computed(() => dataset.data.inventorySettings || null);

    const invoiceById = (id) =>
        supplierInvoices.value.find((invoice) => invoice.id === id) || null;
    const paymentById = (id) =>
        supplierPayments.value.find((payment) => payment.id === id) || null;
    const invoicesOf = (code) =>
        supplierInvoices.value.filter(
            (invoice) => invoice.supplierCode === code,
        );
    const paymentsOf = (code) =>
        supplierPayments.value.filter(
            (payment) => payment.supplierCode === code,
        );

    /** Invoices still owed something, oldest due first. */
    const openInvoices = computed(() =>
        supplierInvoices.value
            .filter((invoice) => supplierInvoiceOpen(invoice) > 0)
            .sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    );

    /** The payables desk in four figures. */
    const payableKpis = computed(() => {
        const today = isoDaysAgo(0);
        const month = monthStart(today);
        const sum = (rows, pick) =>
            round2(rows.reduce((total, row) => total + pick(row), 0));
        const open = openInvoices.value;

        return {
            open: sum(open, supplierInvoiceOpen),
            openCount: open.length,
            dueWeek: sum(
                open.filter((invoice) => invoiceDueState(invoice) === 'week'),
                supplierInvoiceOpen,
            ),
            overdue: sum(
                open.filter(
                    (invoice) => invoiceDueState(invoice) === 'overdue',
                ),
                supplierInvoiceOpen,
            ),
            overdueCount: open.filter(
                (invoice) => invoiceDueState(invoice) === 'overdue',
            ).length,
            paidThisMonth: sum(
                supplierPayments.value.filter(
                    (payment) => payment.date.iso >= month,
                ),
                (payment) => payment.amount,
            ),
        };
    });

    /**
     * One supplier's ledger: invoices as charges, payments as credits, in date
     * order with a running balance — what the card owes right now.
     */
    const supplierLedger = (code) => {
        const rows = [
            ...invoicesOf(code).map((invoice) => ({
                id: invoice.id,
                kind: 'invoice',
                when: invoice.date,
                ref: invoice.num,
                charge: invoice.total,
                credit: 0,
                state: supplierInvoiceState(invoice),
                due: invoiceDueState(invoice),
            })),
            ...paymentsOf(code).map((payment) => ({
                id: payment.id,
                kind: 'payment',
                when: payment.date,
                ref: payment.reference,
                charge: 0,
                credit: payment.amount,
                state: payment.method,
                due: null,
            })),
        ].sort((a, b) =>
            `${a.when.iso}${a.id}`.localeCompare(`${b.when.iso}${b.id}`),
        );
        let balance = 0;

        rows.forEach((row) => {
            balance = round2(balance + row.charge - row.credit);
            row.balance = balance;
        });

        const open = invoicesOf(code).filter(
            (invoice) => supplierInvoiceOpen(invoice) > 0,
        );

        return {
            rows: rows.reverse(),
            balance,
            open: round2(
                open.reduce(
                    (sum, invoice) => sum + supplierInvoiceOpen(invoice),
                    0,
                ),
            ),
            overdue: round2(
                open
                    .filter((invoice) => invoiceDueState(invoice) === 'overdue')
                    .reduce(
                        (sum, invoice) => sum + supplierInvoiceOpen(invoice),
                        0,
                    ),
            ),
        };
    };

    // ---- lookups -------------------------------------------------------------

    const poById = (id) =>
        purchaseOrders.value.find((po) => po.id === id) || null;
    const noteById = (id) =>
        supplierNotes.value.find((note) => note.id === id) || null;
    const notesOfPo = (id) =>
        supplierNotes.value.filter((note) => note.po === id);
    const receiptsOfPo = (id) =>
        inventory.receipts.filter((receipt) => receipt.po === id);
    const supplierByCode = (code) =>
        dataset.suppliers.find((supplier) => supplier.code === code) || null;

    const receivable = (po) => PO_RECEIVABLE_STATE_IDS.includes(po.state);

    /** Orders with their totals — the row the screen lists. */
    const rows = computed(() =>
        purchaseOrders.value.map((po) => {
            const ordered = po.lines.reduce((sum, line) => sum + line.qty, 0);
            const received = po.lines.reduce(
                (sum, line) => sum + (line.received || 0),
                0,
            );
            const value = po.lines.reduce(
                (sum, line) => sum + line.qty * (line.price || 0),
                0,
            );
            const openValue = po.lines.reduce(
                (sum, line) =>
                    sum +
                    Math.max(0, line.qty - (line.received || 0)) *
                        (line.price || 0),
                0,
            );

            return {
                ...po,
                ordered,
                received,
                value,
                openValue,
                supplierRec: supplierByCode(po.supplierCode),
                noteCount: notesOfPo(po.id).length,
            };
        }),
    );

    const openNotes = computed(() =>
        supplierNotes.value.filter((note) => note.state === 'open'),
    );

    // ---- supplier documents (config/supplierDocs.js) --------------------------

    /** The supplier invoice that bills a receipt, when it is one of ours. */
    const invoiceOfReceipt = (receipt) =>
        receipt?.invoice ? invoiceById(receipt.invoice) : null;

    /**
     * "תעודות משלוח פתוחות" — every delivery note no tax invoice is attached to
     * yet, across suppliers, newest first. What the suppliers screen's tab of
     * that name lists, and what "הצמדת חשבונית מס" picks from.
     */
    const openDeliveryNotes = computed(() =>
        inventory.receipts
            .filter(isOpenNote)
            .sort((a, b) =>
                `${b.when?.iso}${b.id}`.localeCompare(`${a.when?.iso}${a.id}`),
            ),
    );

    /** One supplier's open delivery notes — the notes one invoice may cover. */
    const openNotesOf = (code) =>
        openDeliveryNotes.value.filter((note) => note.supplierCode === code);

    /**
     * Everything one supplier's goods came on, newest first — the supplier
     * card's "מסמכים" tab, one row per paper the supplier printed:
     *
     *   each goods receipt, as the document it came on — a delivery note
     *   (open, or attached to the invoice that billed it) or a tax invoice;
     *
     *   each tax invoice attached to delivery notes afterwards, which is a
     *   paper of its own (`source: 'attach'`).
     *
     * A tax-invoice receipt is listed once: the supplier invoice it records is
     * the same paper, not a second one.
     *
     * @returns {Array<{key: string, kind: 'delivery_note'|'tax_invoice',
     *   ref: string, when: object, receipt: object|null, invoice: object|null,
     *   notes: object[], net: number|null}>}
     */
    function documentsOf(code) {
        const receipts = inventory.receipts.filter(
            (receipt) => receipt.supplierCode === code,
        );
        const rows = receipts.map((receipt) => ({
            key: receipt.id,
            kind: receipt.docType || 'delivery_note',
            ref: docRef(receipt),
            when: receipt.when,
            receipt,
            invoice: invoiceOfReceipt(receipt),
            notes: [],
            net: receiptNet(receipt),
        }));

        invoicesOf(code)
            .filter((invoice) => invoice.source === 'attach')
            .forEach((invoice) => {
                rows.push({
                    key: invoice.id,
                    kind: 'tax_invoice',
                    ref: invoice.num,
                    when: invoice.date,
                    receipt: null,
                    invoice,
                    notes: (invoice.receipts || [])
                        .map((id) => inventory.receiptById(id))
                        .filter(Boolean),
                    net: invoice.net,
                });
            });

        return rows.sort((a, b) =>
            `${b.when?.iso}${b.key}`.localeCompare(`${a.when?.iso}${a.key}`),
        );
    }

    /** The default expiry a new batch of an item takes, from its family. */
    const defaultExpiryFor = (sku) => {
        const item = items.itemBySku(sku);
        const months = item
            ? settings.value?.defaultExpiryMonths?.[item.family]
            : null;

        if (!months) {
            return null;
        }

        const d = now();

        d.setMonth(d.getMonth() + months);

        return {
            months,
            iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        };
    };

    // ---- writes --------------------------------------------------------------

    /**
     * Write a supplier's two money figures again from his invoices, by the same
     * rule the supplier screens read them with (`supplierMoney`). An invoice
     * that changed without this leaves the card's own record saying what was
     * owed before it. No request of its own: the figures are derived, and the
     * invoice or payment that moved them is the write.
     */
    function refreshSupplierMoney(code) {
        const supplier = supplierByCode(code);

        if (supplier) {
            Object.assign(supplier, supplierMoney(code, invoicesOf(code)));
        }
    }

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
            ip: null,
            ...row,
        });
    }

    // ---- supplier documents: booking in, invoicing --------------------------

    /**
     * Record one supplier invoice that bills goods receipts, and put it on the
     * supplier's open balance. The value is what the receipts' lines come to —
     * every line priced by now — before VAT; VAT is added at the console's
     * rate; it falls due by the supplier's payment terms from its date.
     *
     * `source` says how it came: `receipt` — the goods came on the invoice
     * itself; `attach` — it was attached to delivery notes afterwards.
     */
    async function bookInvoice({
        supplier,
        num,
        date,
        receipts,
        source,
        file = null,
        note = null,
    }) {
        const rows = bag('supplierInvoices');
        const when = moment(date || null);
        const terms = PAYMENT_TERM[supplier.terms]?.days ?? 30;
        const net = round2(
            receipts.reduce(
                (sum, receipt) => sum + (receiptNet(receipt) || 0),
                0,
            ),
        );
        const vat = round2(net * SETTINGS.vatRate);
        const invoice = {
            id: nextSerial(
                rows.map((row) => row.id),
                'SI-',
            ),
            supplierCode: supplier.code,
            supplier: supplier.name,
            num: String(num).trim(),
            date: when,
            dueOn: isoDaysAgo(when.daysAgo - terms),
            notes: [],
            // The goods receipts this invoice bills — see config/supplierDocs.js.
            receipts: receipts.map((receipt) => receipt.id),
            source,
            category:
                CATEGORY_BY_SUPPLIER_KIND[supplier.kind] || 'raw_materials',
            currency: 'ILS',
            net,
            vat,
            total: round2(net + vat),
            paid: 0,
            state: 'open',
            file: null,
            accounting: { sent: false, when: null, by: null },
            by: dataset.me?.name || null,
            note: String(note || '').trim() || null,
        };

        if (file) {
            const attachment = await items.addAttachment({
                entity: 'supplier_invoice',
                ref: invoice.id,
                file,
                type: extensionOf(file.name),
            });

            invoice.file = attachment.id;
        }

        receipts.forEach((receipt) => {
            receipt.invoice = invoice.id;
        });

        rows.unshift(invoice);
        refreshSupplierMoney(supplier.code);
        await persist('supplier-invoices', invoice);
        await Promise.all(
            receipts.map((receipt) =>
                persist(`inventory/receipts/${receipt.id}`, receipt, 'PUT'),
            ),
        );

        return invoice;
    }

    /**
     * The supplier invoice a tax-invoice receipt is.
     *
     * **For production.** When the goods came on "חשבונית מס" the document in
     * the receiver's hand is the invoice: it is recorded on the supplier the
     * moment the receipt is booked — the number and date typed on the receipt,
     * the value its lines come to (every one priced, the screen does not save
     * otherwise) — and it enters his open balance at once. Nothing waits for
     * it, so the order it was received against closes on it ("התקבלה").
     */
    async function recordReceiptInvoice(receiptId) {
        const receipt = inventory.receiptById(receiptId);
        const supplier = supplierByCode(receipt?.supplierCode);

        if (
            !receipt ||
            !supplier ||
            receipt.docType !== 'tax_invoice' ||
            receipt.invoice
        ) {
            return null;
        }

        const invoice = await bookInvoice({
            supplier,
            num: receipt.docNum,
            date: receipt.when?.iso,
            receipts: [receipt],
            source: 'receipt',
        });

        writeLog({
            act: 'supplier_invoice_capture',
            entType: 'supplier_invoice',
            ent: invoice.id,
            to: `${invoice.num} · ${invoice.total}`,
        });

        return invoice;
    }

    /**
     * Book a supplier document in — the one door every goods receipt goes
     * through, against an order (stores/buying.js `receiveList`) or without
     * one (the purchasing screen's goods-receipt dialog).
     *
     *   1. `inventory.receiveGoods` posts the stock, by the document's rules:
     *      a delivery note with no prices, a tax invoice priced on every line,
     *      a general line ("פריט כללי") on the document only, an item that is
     *      not batch-managed with no batch (config/supplierDocs.js);
     *   2. a tax invoice is recorded on the supplier there and then
     *      (`recordReceiptInvoice`);
     *   3. the document's scan, when one was attached, is filed on the receipt
     *      — the supplier card's "מסמכים" tab shows it, and more can be added
     *      there later.
     *
     * @param {object} form  `inventory.receiveGoods`'s form, plus `file`
     * @returns {Promise<{id: string, batches: string[]}>}
     */
    async function receiveDocument(form) {
        if (form.docType === 'tax_invoice') {
            const unpriced = (form.lines || []).some(
                (line) => !isPrice(line.price),
            );

            if (unpriced || !supplierByCode(form.supplierCode)) {
                throw new Error(
                    'A tax invoice needs a known supplier and a price on every line',
                );
            }
        }

        const booked = await inventory.receiveGoods(form);

        if (form.docType === 'tax_invoice') {
            await recordReceiptInvoice(booked.id);
        }

        if (form.file) {
            await items.addAttachment({
                entity: 'receipt',
                ref: booked.id,
                file: form.file,
                type: extensionOf(form.file.name),
            });
        }

        return booked;
    }

    /**
     * הצמדת חשבונית מס — one tax invoice for one or more open delivery notes
     * of one supplier.
     *
     * **For production.** The person picks the notes, types the invoice's
     * number and date, and a price for every line of every note (mandatory —
     * per purchase unit, before VAT — opened at the order's quote price, and a
     * general line at its own). On saving, in one go:
     *
     *   - the prices are written onto the notes' lines, the batches they
     *     opened take their cost and the item cards their last purchase price
     *     (`inventory.priceReceipt`);
     *   - one supplier invoice is recorded, billing those notes, and enters the
     *     supplier's open balance (`bookInvoice`, `source: 'attach'`);
     *   - the notes are closed — attached to that invoice — and leave the
     *     "תעודות משלוח פתוחות" list;
     *   - the purchase orders they were received against are handed back, so
     *     the buying store can close each one that has no open note left
     *     (stores/buying.js `attachInvoice` → `settleInvoiced`). On the server
     *     this is one transaction.
     *
     * @param {{supplierCode: string, num: string, date: string,
     *          receipts: string[], prices: Object<string, Array>,
     *          file?: File|null, note?: string}} form
     * @returns {Promise<{invoice: object, orders: string[]}>}
     */
    async function attachInvoice(form) {
        const supplier = supplierByCode(form.supplierCode);
        const num = String(form.num || '').trim();
        const notes = (form.receipts || [])
            .map((id) => inventory.receiptById(id))
            .filter(Boolean);

        if (!supplier || !num || !notes.length) {
            throw new Error(
                'An invoice needs a supplier, a number and at least one delivery note',
            );
        }

        if (
            notes.some(
                (note) =>
                    !isOpenNote(note) || note.supplierCode !== supplier.code,
            )
        ) {
            throw new Error('Only open delivery notes of this supplier attach');
        }

        if (
            notes.some((note) =>
                note.lines.some(
                    (line, index) => !isPrice(form.prices?.[note.id]?.[index]),
                ),
            )
        ) {
            throw new Error('Every line of every note needs its price');
        }

        if (
            form.file &&
            !ATTACHMENT_RULES.extensions.includes(extensionOf(form.file.name))
        ) {
            throw new Error('The invoice file is not a type that can be kept');
        }

        for (const note of notes) {
            await inventory.priceReceipt(note.id, form.prices[note.id]);
        }

        const invoice = await bookInvoice({
            supplier,
            num,
            date: form.date,
            receipts: notes,
            source: 'attach',
            file: form.file || null,
            note: form.note,
        });

        writeLog({
            act: 'supplier_invoice_attach',
            entType: 'supplier_invoice',
            ent: invoice.id,
            to: `${invoice.num} · ${notes.map(docRef).join(', ')}`,
        });

        return {
            invoice,
            orders: [...new Set(notes.map((note) => note.po).filter(Boolean))],
        };
    }

    /** Create or update an order. Only an order nothing has been received on is edited. */
    async function savePo(form, existingId = null) {
        const rows = bag('purchaseOrders');
        const supplier = supplierByCode(form.supplierCode);
        const lines = form.lines.map((line) => {
            const item = items.itemBySku(line.sku);

            return {
                sku: line.sku,
                name: item
                    ? { he: item.names.he, en: item.names.en || item.names.he }
                    : line.sku,
                qty: Number(line.qty) || 0,
                uom: line.uom,
                price:
                    line.price === '' || line.price === null
                        ? null
                        : Number(line.price),
                received: line.received || 0,
            };
        });

        if (!existingId) {
            const po = {
                id: nextSerial(
                    rows.map((row) => row.id),
                    PO_SERIES,
                ),
                supplierCode: form.supplierCode,
                supplier: supplier ? supplier.name : form.supplierCode,
                state: 'open',
                currency: form.currency || 'ILS',
                created: moment(),
                eta: form.eta || null,
                by: dataset.me?.name || null,
                lines,
                notes: form.notes?.trim()
                    ? { he: form.notes.trim(), en: form.notes.trim() }
                    : null,
                deliveryNotes: [],
            };

            rows.unshift(po);
            writeLog({
                act: 'po_create',
                entType: 'purchase_order',
                ent: po.id,
                to: supplier ? supplier.name : po.supplierCode,
            });
            await persist('purchase-orders', po);

            return { created: true, po };
        }

        const po = rows.find((row) => row.id === existingId);

        if (!po) {
            return { created: false, po: null };
        }

        Object.assign(po, {
            supplierCode: form.supplierCode,
            supplier: supplier ? supplier.name : form.supplierCode,
            currency: form.currency || po.currency,
            eta: form.eta || null,
            lines,
            notes: form.notes?.trim()
                ? { he: form.notes.trim(), en: form.notes.trim() }
                : null,
        });
        writeLog({
            act: 'po_update',
            entType: 'purchase_order',
            ent: po.id,
            to: po.supplier,
        });
        await persist(`purchase-orders/${po.id}`, po, 'PUT');

        return { created: false, po };
    }

    async function cancelPo(id, reason = '') {
        const po = poById(id);

        if (!po || !receivable(po)) {
            return false;
        }

        po.state = 'cancelled';
        writeLog({
            act: 'po_cancel',
            entType: 'purchase_order',
            ent: po.id,
            to: reason,
        });
        await persist(`purchase-orders/${po.id}/cancel`, { reason });

        return true;
    }

    /**
     * Receive goods against an order: one goods receipt (through the inventory
     * store), the order's lines advanced in purchase units, the order closed when
     * every line is in, and a supplier delivery note opened for the invoice to
     * close later.
     *
     * @param {string} poId
     * @param {{docNum: string, date: string, note: string,
     *          lines: Array<object>}} form receipt lines in STOCK units
     */
    async function receiveAgainstPo(poId, form) {
        const po = poById(poId);

        if (!po || !receivable(po)) {
            throw new Error(`Purchase order ${poId} cannot receive goods`);
        }

        const receipt = await inventory.receiveGoods({
            supplier: po.supplier,
            supplierCode: po.supplierCode,
            po: po.id,
            docNum: form.docNum,
            date: form.date,
            note: form.note,
            lines: form.lines,
        });

        const noteLines = [];

        form.lines.forEach((line) => {
            const poLine = po.lines.find((row) => row.sku === line.sku);
            const item = items.itemBySku(line.sku);
            const factor = item?.uom?.factor || 1;
            const inPurchaseUnits =
                Math.round((Number(line.qty) / factor) * 1000) / 1000;

            if (poLine) {
                poLine.received = Math.min(
                    poLine.qty,
                    (poLine.received || 0) + inPurchaseUnits,
                );
            }

            noteLines.push({
                sku: line.sku,
                name: poLine ? poLine.name : line.sku,
                qty: inPurchaseUnits,
                uom: poLine ? poLine.uom : item?.uom?.purchase || 'unit',
            });
        });

        po.state = po.lines.every((line) => (line.received || 0) >= line.qty)
            ? 'closed'
            : 'partial';

        const notes = bag('supplierNotes');
        const note = {
            id: nextSerial(
                notes.map((row) => row.id),
                NOTE_SERIES,
            ),
            po: po.id,
            supplierCode: po.supplierCode,
            supplier: po.supplier,
            docNum: String(form.docNum).trim(),
            when: moment(form.date),
            lines: noteLines,
            receipt: receipt.id,
            invoice: null,
            state: 'open',
        };

        notes.unshift(note);
        po.deliveryNotes = [...(po.deliveryNotes || []), note.id];

        writeLog({
            act: 'po_receive',
            entType: 'purchase_order',
            ent: po.id,
            to: `${receipt.id} · ${note.id}`,
        });
        await persist(`purchase-orders/${po.id}/receive`, {
            receipt: receipt.id,
            note: note.id,
        });

        return { receipt, note, state: po.state };
    }

    /** The invoice arrived: close the delivery note it covers. */
    /** Net of a delivery note: its received lines at the order's prices. */
    function noteNet(note) {
        const po = poById(note.po);

        return round2(
            note.lines.reduce((sum, line) => {
                const poLine = po?.lines.find((row) => row.sku === line.sku);

                return sum + line.qty * (poLine?.price || 0);
            }, 0),
        );
    }

    /**
     * Capture a supplier's invoice: the document that bills one or more
     * delivery notes. The notes close on it; the amount defaults to their
     * lines at the order's prices; the due date follows the supplier's terms.
     *
     * @param {{ supplierCode: string, num: string, date?: string,
     *          notes?: string[], category: string, net?: number, vat?: number,
     *          file?: File|null, note?: string }} form
     */
    async function captureSupplierInvoice(form) {
        const supplier = supplierByCode(form.supplierCode);

        if (!supplier || !String(form.num || '').trim()) {
            throw new Error('A supplier invoice needs a supplier and a number');
        }

        const notes = (form.notes || [])
            .map((id) => noteById(id))
            .filter((note) => note && note.state !== 'closed');
        const net = round2(
            form.net !== '' && form.net !== null && form.net !== undefined
                ? Number(form.net)
                : notes.reduce((sum, note) => sum + noteNet(note), 0),
        );
        const vat = round2(
            form.vat !== '' && form.vat !== null && form.vat !== undefined
                ? Number(form.vat)
                : net * SETTINGS.vatRate,
        );
        const rows = bag('supplierInvoices');
        const date = moment(form.date || null);
        const terms = PAYMENT_TERM[supplier.terms]?.days ?? 30;
        const invoice = {
            id: nextSerial(
                rows.map((row) => row.id),
                'SI-',
            ),
            supplierCode: supplier.code,
            supplier: supplier.name,
            num: String(form.num).trim(),
            date,
            dueOn: isoDaysAgo(date.daysAgo - terms),
            notes: notes.map((note) => note.id),
            category: form.category || 'other',
            currency: poById(notes[0]?.po)?.currency || 'ILS',
            net,
            vat,
            total: round2(net + vat),
            paid: 0,
            state: 'open',
            file: null,
            accounting: { sent: false, when: null, by: null },
            by: dataset.me?.name || null,
            note: form.note?.trim() || null,
        };

        if (form.file) {
            const attachment = await items.addAttachment({
                entity: 'supplier_invoice',
                ref: invoice.id,
                file: form.file,
            });

            invoice.file = attachment.id;
        }

        notes.forEach((note) => {
            note.invoice = invoice.id;
            note.state = 'closed';
        });

        rows.unshift(invoice);
        refreshSupplierMoney(invoice.supplierCode);
        writeLog({
            act: 'supplier_invoice_capture',
            entType: 'supplier_invoice',
            ent: invoice.id,
            to: `${invoice.num} · ${invoice.total}`,
        });
        await persist('supplier-invoices', invoice);

        return invoice;
    }

    /**
     * Close a delivery note by the invoice that bills it — the one-note
     * shortcut the notes tab offers; the full form lives on the invoices tab.
     */
    async function closeNote(noteId, invoiceNum, invoiceDate) {
        const note = noteById(noteId);

        if (!note || note.state === 'closed') {
            return false;
        }

        await captureSupplierInvoice({
            supplierCode: note.supplierCode,
            num: invoiceNum,
            date: invoiceDate || null,
            notes: [note.id],
            category: 'raw_materials',
        });
        writeLog({
            act: 'supplier_note_close',
            entType: 'purchase_order',
            ent: note.po,
            to: `${note.id} · ${String(invoiceNum).trim()}`,
        });

        return true;
    }

    /**
     * Why a payment to this supplier cannot be recorded right now, or null:
     * a missing or expired bookkeeping certificate blocks payment (never
     * purchasing), and an allocation may not exceed what the invoice still owes.
     */
    function paymentBlock(form) {
        const supplier = supplierByCode(form.supplierCode);

        if (!supplier) {
            return 'supplier';
        }

        if (supplierPaymentBlocked(supplier)) {
            return 'compliance';
        }

        const over = (form.allocations || []).some((allocation) => {
            const invoice = invoiceById(allocation.invoice);

            return (
                !invoice ||
                Number(allocation.amount) <= 0 ||
                Number(allocation.amount) > supplierInvoiceOpen(invoice) + 0.005
            );
        });

        if (over || !(form.allocations || []).length) {
            return 'allocation';
        }

        return null;
    }

    /**
     * Record a payment to a supplier and the invoices it closes. The amount is
     * the sum of its allocations; the reference is the bank's (אסמכתא) or the
     * cheque's number; the receipt file is attached to the payment.
     *
     * @param {{ supplierCode: string, date?: string, method: string,
     *          reference: string, allocations: Array<{invoice: string, amount: number}>,
     *          receipt?: File|null, note?: string }} form
     */
    async function recordSupplierPayment(form) {
        const block = paymentBlock(form);

        if (block) {
            throw new Error(`Payment refused: ${block}`);
        }

        const supplier = supplierByCode(form.supplierCode);
        const rows = bag('supplierPayments');
        const allocations = form.allocations.map((allocation) => ({
            invoice: allocation.invoice,
            amount: round2(Number(allocation.amount)),
        }));
        const payment = {
            id: nextSerial(
                rows.map((row) => row.id),
                'SP-',
            ),
            supplierCode: supplier.code,
            supplier: supplier.name,
            date: moment(form.date || null),
            amount: round2(
                allocations.reduce(
                    (sum, allocation) => sum + allocation.amount,
                    0,
                ),
            ),
            currency: invoiceById(allocations[0].invoice)?.currency || 'ILS',
            method: form.method || 'transfer',
            reference: String(form.reference || '').trim(),
            allocations,
            receipt: null,
            by: dataset.me?.name || null,
            note: form.note?.trim() || null,
        };

        if (form.receipt) {
            const attachment = await items.addAttachment({
                entity: 'supplier_payment',
                ref: payment.id,
                file: form.receipt,
            });

            payment.receipt = attachment.id;
        }

        allocations.forEach((allocation) => {
            const invoice = invoiceById(allocation.invoice);

            invoice.paid = round2(invoice.paid + allocation.amount);

            if (invoice.state !== 'disputed') {
                invoice.state = supplierInvoiceState(invoice);
            }
        });

        rows.unshift(payment);
        refreshSupplierMoney(supplier.code);
        writeLog({
            act: 'supplier_payment',
            entType: 'supplier_payment',
            ent: payment.id,
            to: `${payment.reference} · ${payment.amount}`,
        });
        await persist('supplier-payments', payment);

        return payment;
    }

    /** Mark an invoice disputed (a reason is kept), or lift the dispute. */
    async function disputeInvoice(id, reason = '', on = true) {
        const invoice = invoiceById(id);

        if (!invoice) {
            return null;
        }

        invoice.state = on ? 'disputed' : supplierInvoiceState(invoice);
        invoice.note = on ? reason.trim() || invoice.note : invoice.note;
        writeLog({
            act: 'supplier_invoice_dispute',
            entType: 'supplier_invoice',
            ent: invoice.id,
            to: on ? invoice.note : null,
        });
        await persist(`supplier-invoices/${id}/dispute`, { on, reason });

        return invoice;
    }

    /** Hand invoices to the accountant's books: a stamp, not an export. */
    async function markInvoicesSent(ids) {
        const when = moment();
        const by = dataset.me?.name || null;
        const sent = ids
            .map((id) => invoiceById(id))
            .filter((invoice) => invoice && !invoice.accounting?.sent);

        sent.forEach((invoice) => {
            invoice.accounting = { sent: true, when, by };
            writeLog({
                act: 'supplier_invoice_sent',
                entType: 'supplier_invoice',
                ent: invoice.id,
            });
        });
        await persist('supplier-invoices/sent', {
            ids: sent.map((invoice) => invoice.id),
        });

        return sent.length;
    }

    /** Change one or more of the batch-handling settings. */
    async function updateSettings(patch, label) {
        if (!dataset.data.inventorySettings) {
            dataset.data.inventorySettings = {
                defaultExpiryMonths: {},
            };
        }

        const target = dataset.data.inventorySettings;

        Object.entries(patch).forEach(([key, value]) => {
            target[key] =
                value && typeof value === 'object' && !Array.isArray(value)
                    ? { ...(target[key] || {}), ...value }
                    : value;
        });
        target.updated = moment();
        target.updatedBy = dataset.me?.name || null;

        writeLog({
            act: 'inventory_settings_update',
            entType: 'system',
            ent: 'inventory-settings',
            to: label || null,
        });
        await persist('inventory/settings', patch, 'PATCH');
    }

    // ---- the consumption report ------------------------------------------------

    /**
     * What left stock for production or sale inside a date range, per item —
     * deliberately without adjustments, waste or rejections, which say nothing
     * about demand.
     *
     * @param {{from?: string, to?: string}} range
     */
    function consumption(range) {
        const bySku = new Map();
        const touch = (sku) => {
            if (!bySku.has(sku)) {
                bySku.set(sku, { sku, production: 0, sales: 0 });
            }

            return bySku.get(sku);
        };
        let earliest = null;

        inventory.movements.forEach((move) => {
            if (
                move.kind !== 'allocated_to_compounding' ||
                !inRange(move.when.iso, range)
            ) {
                return;
            }

            touch(move.sku).production += Math.abs(move.qty);
            earliest =
                !earliest || move.when.iso < earliest
                    ? move.when.iso
                    : earliest;
        });

        dataset.orders.forEach((order) => {
            if (
                !SOLD_STATUS_IDS.includes(order.status) ||
                !inRange(order.placed?.iso, range)
            ) {
                return;
            }

            (order.items || []).forEach((line) => {
                if (line.kind === 'shelf' && line.sku) {
                    touch(line.sku).sales += Number(line.qty) || 0;
                    earliest =
                        !earliest || order.placed.iso < earliest
                            ? order.placed.iso
                            : earliest;
                }
            });
        });

        const from = range?.from || earliest || isoDaysAgo(0);
        const to = range?.to || isoDaysAgo(0);
        const months = Math.max(
            1 / 3,
            (daysSince(from) - daysSince(to) + 1) / 30,
        );

        return {
            months,
            rows: [...bySku.values()].map((entry) => {
                const row = items.rowBySku(entry.sku);
                const stock = inventory.itemBySku(entry.sku);
                const total = entry.production + entry.sales;
                const monthly = total / months;
                const avail = row?.avail ?? stock?.avail ?? null;

                return {
                    ...entry,
                    name: row
                        ? { he: row.names.he, en: row.names.en || row.names.he }
                        : stock?.name || entry.sku,
                    family: row?.family || null,
                    unit: stock?.unit || row?.uom?.stock || 'unit',
                    total,
                    monthly,
                    avail,
                    cover:
                        avail === null || monthly <= 0 ? null : avail / monthly,
                };
            }),
        };
    }

    return {
        purchaseOrders,
        supplierNotes,
        settings,
        rows,
        openNotes,

        poById,
        noteById,
        notesOfPo,
        receiptsOfPo,
        supplierByCode,
        receivable,
        defaultExpiryFor,

        invoiceOfReceipt,
        openDeliveryNotes,
        openNotesOf,
        documentsOf,
        receiveDocument,
        recordReceiptInvoice,
        attachInvoice,

        savePo,
        cancelPo,
        receiveAgainstPo,
        closeNote,
        supplierInvoices,
        supplierPayments,
        invoiceById,
        paymentById,
        invoicesOf,
        paymentsOf,
        openInvoices,
        payableKpis,
        supplierLedger,
        noteNet,
        captureSupplierInvoice,
        paymentBlock,
        recordSupplierPayment,
        disputeInvoice,
        markInvoicesSent,
        updateSettings,
        consumption,
    };
});
