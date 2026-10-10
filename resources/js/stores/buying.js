// רכש — the buyer's own sheets.
//
// A purchase request is a shopping list and a purchase order is a list with a
// supplier on it, so they are one record with a `kind` rather than two stores
// that would share every line of their code. Neither posts stock or reserves
// anything: they are written, worked through, and exported.
//
// The lines carry their own copy of what the item looked like when it was added
// — see `lineFromItem` in `config/buying.js` for why.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    ARCHIVE_FIELD,
    BUYING_KIND,
    BUYING_SERIES,
    buyingFirstState,
    DEFAULT_WAREHOUSE,
    leadTimeOf,
    liveOnly,
    lineFromItem,
    parseSkus,
} from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';

/** This moment, in the shape every record's `when` field carries. */
function moment() {
    return { iso: isoDaysAgo(0), stamp: stamp(0), time: hm(now()) };
}

export const useBuyingStore = defineStore('buying', () => {
    const dataset = useDatasetStore();
    const items = useItemsStore();
    const inventory = useInventoryStore();

    /**
     * One row in the system log.
     *
     * The sheet's own history is the system log filtered to it, not a second
     * log kept on the record — so what the drawer shows and what the log screen
     * shows are the same row, written once.
     */
    function writeLog(row) {
        const log = Array.isArray(dataset.data.log) ? dataset.data.log : [];

        if (!Array.isArray(dataset.data.log)) {
            dataset.data.log = log;
        }

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            valueType: 'plain',
            entType: 'buying_list',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    const all = computed(() => dataset.data.buyingLists || []);
    const lists = computed(() => liveOnly(all.value));

    /**
     * One kind's sheets, newest first.
     *
     * Ordered here rather than where they are written, because the records
     * make a round trip through the database and come back in whatever order
     * it hands them over; the screen opens on the newest sheet either way.
     */
    const listsOf = (kind) =>
        lists.value
            .filter((row) => row.kind === kind)
            .sort((a, b) => Number(b.number) - Number(a.number));

    const listById = (id) => all.value.find((row) => row.id === id) || null;

    function bag() {
        if (!Array.isArray(dataset.data.buyingLists)) {
            dataset.data.buyingLists = [];
        }

        return dataset.data.buyingLists;
    }

    /**
     * The item card, as a line.
     *
     * Three of the card's figures are not on the item record itself: the
     * supplier's name sits behind its SAP code, the group's name behind its
     * number, and the lead time is the supplier's or the preparation type's
     * before it is the item's. They are resolved here, where the stores that
     * hold them are, and written onto the line with everything else.
     */
    function snapshot(row) {
        const lead = leadTimeOf(row, {
            supplier: dataset.suppliers.find(
                (one) => one.code === row.suppliers?.sapCode,
            ),
            prepType: items.prepTypeById((row.prepTypes || [])[0]),
            madeHere: (row.bomCount || 0) > 0,
        });

        return lineFromItem(row, {
            supplier: row.preferred?.name ?? null,
            groupName: row.groupName,
            onHand: row.onHand,
            committed: row.alloc,
            leadDays: lead?.days ?? null,
        });
    }

    const nextNumber = (kind) => {
        const used = all.value
            .filter((row) => row.kind === kind)
            .map((row) => Number(row.number))
            .filter(Number.isFinite);

        return String(Math.max(BUYING_SERIES[kind] || 0, ...used, 0) + 1);
    };

    /** A fresh sheet. An order carries its supplier from the moment it exists. */
    function createList(kind, { supplierCode = '', supplier = null } = {}) {
        const rows = bag();
        const number = nextNumber(kind);
        const list = {
            id: `${kind}-${number}`,
            number,
            kind,
            supplierCode: supplierCode || null,
            supplier: supplier || null,
            note: '',
            lines: [],
            state: buyingFirstState(kind),
            created: moment(),
            sent: null,
            received: null,
            receipts: [],
            by: dataset.me?.name || null,
            [ARCHIVE_FIELD]: null,
        };

        rows.unshift(list);
        writeLog({ act: 'buying_create', ent: list.id, to: list.number });
        persist('buying-lists', list);

        return list;
    }

    function save(list) {
        persist(`buying-lists/${list.id}`, list, 'PUT');

        return list;
    }

    /**
     * Add every code in a pasted block.
     *
     * Three things come back, because all three have to be said out loud: what
     * went on the sheet, what the catalogue has never heard of, and what was
     * already there. A code silently dropped is a code the buyer thinks they
     * ordered.
     */
    function addSkus(id, text) {
        const list = listById(id);
        const result = { added: [], missing: [], already: [] };

        if (!list) {
            return result;
        }

        for (const code of parseSkus(text)) {
            if (list.lines.some((line) => line.sku === code)) {
                result.already.push(code);
                continue;
            }

            const row = items.rowBySku(code);

            if (!row) {
                result.missing.push(code);
                continue;
            }

            list.lines.push(snapshot(row));
            result.added.push(code);
        }

        if (result.added.length) {
            writeLog({
                act: 'buying_lines_add',
                ent: list.id,
                to: String(result.added.length),
            });
            save(list);
        }

        return result;
    }

    /** One item, chosen from the search rather than pasted. */
    function addItem(id, sku) {
        const list = listById(id);
        const row = items.rowBySku(sku);

        if (!list || !row || list.lines.some((line) => line.sku === sku)) {
            return null;
        }

        const line = snapshot(row);

        list.lines.push(line);
        save(list);

        return line;
    }

    const lineOf = (list, sku) =>
        (list?.lines || []).find((line) => line.sku === sku) || null;

    function setQty(id, sku, qty) {
        const list = listById(id);
        const line = lineOf(list, sku);

        if (!line) {
            return null;
        }

        const amount = Number(qty);

        line.qty = Number.isFinite(amount) && amount > 0 ? amount : null;
        save(list);

        return line;
    }

    /** The checklist: a request line is ticked off as it is sourced. */
    function toggleDone(id, sku) {
        const list = listById(id);
        const line = lineOf(list, sku);

        if (!line || !BUYING_KIND[list.kind]?.checklist) {
            return null;
        }

        line.done = !line.done;
        save(list);

        return line;
    }

    function removeLine(id, sku) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        const at = list.lines.findIndex((line) => line.sku === sku);

        if (at < 0) {
            return null;
        }

        list.lines.splice(at, 1);
        save(list);

        return list;
    }

    function setSupplier(id, { supplierCode, supplier }) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        list.supplierCode = supplierCode || null;
        list.supplier = supplier || null;

        return save(list);
    }

    function setNote(id, note) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        list.note = String(note || '');

        return save(list);
    }

    /** Nothing is deleted — see `config/archive.js`. */
    function removeList(id, { by, reason } = {}) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        list[ARCHIVE_FIELD] = {
            by: by || dataset.me?.name || null,
            on: moment(),
            reason: reason || null,
        };

        return save(list);
    }

    /**
     * Move a sheet to another state.
     *
     * The states are in `config/buying.js`, one set per kind, and nothing here
     * judges the order they are reached in: an order that failed and was sent
     * again goes back to `sent`, and a receipt booked in error is undone by
     * moving the sheet back. What is recorded is that it moved, from what, and
     * by whom.
     */
    function setState(id, state, { by } = {}) {
        const list = listById(id);

        if (!list || list.state === state) {
            return list;
        }

        const from = list.state;

        list.state = state;

        if (state === 'sent' && !list.sent) {
            list.sent = moment();
        }

        writeLog({
            act: 'buying_state',
            ent: list.id,
            valueType: 'key',
            from: `buying.state.${from}`,
            to: `buying.state.${state}`,
            actor: by || dataset.me?.name || null,
        });

        return save(list);
    }

    /**
     * The file went out, so the order went out.
     *
     * Exporting an order *is* sending it — the spreadsheet is what the supplier
     * receives — so a draft becomes sent the moment it is exported, and an
     * order already further along stays where it is.
     */
    function markExported(id) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        writeLog({ act: 'buying_export', ent: list.id, to: list.number });

        if (list.kind === 'order' && list.state === 'draft') {
            return setState(id, 'sent');
        }

        return save(list);
    }

    /**
     * The goods arrived: book in what actually turned up.
     *
     * The quantities are the receiver's and not the order's — a supplier who
     * sent eight of ten is recorded as eight, and the line keeps both figures.
     * The shelf is raised by `inventory.receiveGoods`, the one place that opens
     * batches and posts the goods-receipt document, so what lands here lands
     * exactly as a receipt entered by hand does.
     *
     * @param {string} id
     * @param {{docNum?: string, date: string, note?: string,
     *          lines: Array<{sku: string, qty: number, supplierBatch?: string,
     *                        expiry?: string, price?: number}>}} form
     */
    async function receiveList(id, form) {
        const list = listById(id);

        if (!list || list.kind !== 'order') {
            throw new Error(`${id} is not a purchase order`);
        }

        const arrived = (form.lines || []).filter(
            (line) => Number(line.qty) > 0,
        );

        if (!arrived.length) {
            throw new Error('A goods receipt needs at least one quantity');
        }

        const receipt = await inventory.receiveGoods({
            supplier: list.supplier,
            supplierCode: list.supplierCode,
            po: list.id,
            docNum: form.docNum || list.number,
            date: form.date,
            note: form.note || '',
            // The sheet counts in the purchase unit and the shelf counts in the
            // stock unit; `numInBuy` off the item card is what sits between.
            lines: arrived.map((line) => {
                const row = list.lines.find((one) => one.sku === line.sku);
                const perBuy = Number(row?.numInBuy) || 1;

                return {
                    sku: line.sku,
                    qty: Number(line.qty) * perBuy,
                    wh: line.wh || DEFAULT_WAREHOUSE,
                    supplierBatch: line.supplierBatch || '',
                    expiry: line.expiry || null,
                    price: line.price ?? row?.lastPrice ?? null,
                    labels: 0,
                };
            }),
        });

        arrived.forEach((line) => {
            const row = list.lines.find((one) => one.sku === line.sku);

            if (row) {
                row.received = Number(line.qty);
            }
        });

        list.receipts = [...(list.receipts || []), receipt.id];
        list.received = moment();

        writeLog({ act: 'buying_receive', ent: list.id, to: receipt.id });
        setState(id, 'received');

        return receipt;
    }

    return {
        lists,
        listsOf,
        listById,
        createList,
        addSkus,
        addItem,
        setQty,
        toggleDone,
        removeLine,
        setSupplier,
        setNote,
        removeList,
        setState,
        markExported,
        receiveList,
    };
});
