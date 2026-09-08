// Purchasing: purchase orders, receipts against them, supplier delivery notes,
// the batch-handling settings, and the consumption report the buyer plans from.
// Second-version material.
//
// Stock itself still moves only through the inventory store's goods receipt —
// receiving against an order calls it and then records what the order got.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { PO_RECEIVABLE_STATE_IDS } from '@/config';
import { persist } from '@/data/source';
import { inRange } from '@/lib/dateRange';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

/** Orders whose shelf lines have left the pharmacy — what "sales" counts. */
const SOLD_STATUS_IDS = ['sent', 'closed'];

const PO_SERIES = 'PO-';
const NOTE_SERIES = 'SDN-';

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
    const settings = computed(() => dataset.data.inventorySettings || null);

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
    async function closeNote(noteId, invoiceNum, invoiceDate) {
        const note = noteById(noteId);

        if (!note || note.state === 'closed') {
            return false;
        }

        note.invoice = {
            num: String(invoiceNum).trim(),
            when: moment(invoiceDate || null),
        };
        note.state = 'closed';

        writeLog({
            act: 'supplier_note_close',
            entType: 'purchase_order',
            ent: note.po,
            to: `${note.id} · ${note.invoice.num}`,
        });
        await persist(`supplier-notes/${note.id}/close`, note.invoice);

        return true;
    }

    /** Change one or more of the batch-handling settings. */
    async function updateSettings(patch, label) {
        if (!dataset.data.inventorySettings) {
            dataset.data.inventorySettings = {
                pickMode: 'fefo',
                batchSeries: {},
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
                    unit: stock?.unit || row?.uom?.sales || 'unit',
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

        savePo,
        cancelPo,
        receiveAgainstPo,
        closeNote,
        updateSettings,
        consumption,
    };
});
