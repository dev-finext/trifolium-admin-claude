// רכש — the buyer's own sheets.
//
// A purchase request is a shopping list and a purchase order is a list with a
// supplier on it, so they are one record with a `kind` rather than two stores
// that would share every line of their code. Neither posts stock or reserves
// anything: they are written, worked through, and exported. An order's goods
// are booked in through its receipts, each one a supplier document — a
// delivery note or a tax invoice (config/supplierDocs.js) — and the order
// closes only once every line carries a price (config/buying.js, the states).
//
// The lines carry their own copy of what the item looked like when it was added
// — see `lineFromItem` in `config/buying.js` for why — and their own `key`: a
// real sheet can list one item twice, so a tick, a quantity or a receipt is
// addressed to the line, never to the item code.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    allLinesMoved,
    ARCHIVE_FIELD,
    BUYING_KIND,
    BUYING_SERIES,
    buyingFirstState,
    DEFAULT_WAREHOUSE,
    groupDoneLines,
    isFullyReceived,
    isOpenNote,
    leadTimeOf,
    lineMoved,
    lineOutstanding,
    linesEditable,
    liveOnly,
    lineFromItem,
    parsePaste,
    quoteEditable,
    RECEIPT_DOC_TYPE_IDS,
} from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { usePurchasingStore } from '@/stores/purchasing';

/** This moment, in the shape every record's `when` field carries. */
function moment() {
    return { iso: isoDaysAgo(0), stamp: stamp(0), time: hm(now()) };
}

const round3 = (value) => Math.round(value * 1000) / 1000;

export const useBuyingStore = defineStore('buying', () => {
    const dataset = useDatasetStore();
    const items = useItemsStore();
    const inventory = useInventoryStore();
    const purchasing = usePurchasingStore();

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

    const supplierName = (code) =>
        dataset.suppliers.find((one) => one.code === code)?.name ?? null;

    function bag() {
        if (!Array.isArray(dataset.data.buyingLists)) {
            dataset.data.buyingLists = [];
        }

        return dataset.data.buyingLists;
    }

    /**
     * Give a line the next key on its sheet. Lines written before keys
     * existed get theirs here, in order, the first time the sheet is touched.
     */
    function keyLines(list) {
        list.lineSeq = Math.max(
            Number(list.lineSeq) || 0,
            (list.lines || []).length,
        );
        (list.lines || []).forEach((line, index) => {
            if (!line.key) {
                line.key = `${list.number}-x${index + 1}`;
            }
        });
    }

    function withKey(list, line) {
        keyLines(list);
        list.lineSeq += 1;
        line.key = `${list.number}-${list.lineSeq}`;

        return line;
    }

    /**
     * The item card, as a line.
     *
     * Three of the card's figures are not on the item record itself: the
     * supplier's name sits behind its code, the group's name behind its
     * number, and the lead time is the supplier's or the preparation type's
     * before it is the item's. They are resolved here, where the stores that
     * hold them are, and written onto the line with everything else.
     */
    function snapshot(row) {
        const code = row.suppliers?.preferred || row.suppliers?.sapCode;
        const lead = leadTimeOf(row, {
            supplier: dataset.suppliers.find((one) => one.code === code),
            prepType: items.prepTypeById((row.prepTypes || [])[0]),
            madeHere: (row.bomCount || 0) > 0,
        });

        return lineFromItem(row, {
            supplier: row.preferred?.name ?? supplierName(code),
            groupName: row.groupName,
            onHand: row.onHand,
            committed: row.alloc,
            onOrder: row.onOrder,
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
            // The pharmacy's own working note, and the one written for the
            // supplier — only the second goes out with the order.
            note: '',
            supplierNote: '',
            lines: [],
            lineSeq: 0,
            state: buyingFirstState(kind),
            created: moment(),
            sent: null,
            received: null,
            receipts: [],
            closedShort: false,
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
     * Add every code in a pasted block — with its quantity, when the block
     * carries one (`parsePaste` in config/buying.js).
     *
     * Four things come back, because all four have to be said out loud: what
     * went on the sheet, which lines already on it took the pasted quantity,
     * what was already there with no quantity to give it, and what the
     * catalogue has never heard of. A code silently dropped is a code the
     * buyer thinks they ordered.
     *
     * A pasted quantity replaces the one on the line: the paste is the list as
     * it stands now, so pasting the same column twice does not double it.
     */
    function addSkus(id, text) {
        const list = listById(id);
        const result = { added: [], updated: [], missing: [], already: [] };

        if (!list || !linesEditable(list)) {
            return result;
        }

        keyLines(list);

        // A request line that moved to an order is a record of that order now:
        // a pasted code never takes its quantity, and an item whose only line
        // moved is added afresh — the buyer needs it again.
        const live = list.lines.filter((line) => !lineMoved(line));

        for (const { code, qty } of parsePaste(text, (token) =>
            Boolean(items.rowBySku(token)),
        )) {
            const twin = live.find(
                (line) => line.sku === code && !(Number(line.received) > 0),
            );

            if (twin || live.some((line) => line.sku === code)) {
                if (twin && qty > 0 && Number(twin.qty) !== qty) {
                    twin.qty = qty;
                    result.updated.push(code);
                } else {
                    result.already.push(code);
                }

                continue;
            }

            const row = items.rowBySku(code);

            if (!row) {
                result.missing.push(code);
                continue;
            }

            const line = withKey(list, snapshot(row));

            if (qty > 0) {
                line.qty = qty;
            }

            list.lines.push(line);
            result.added.push(code);
        }

        if (result.added.length) {
            writeLog({
                act: 'buying_lines_add',
                ent: list.id,
                to: String(result.added.length),
            });
        }

        if (result.added.length || result.updated.length) {
            save(list);
        }

        return result;
    }

    /** One item, chosen from the search rather than pasted. */
    function addItem(id, sku) {
        const list = listById(id);
        const row = items.rowBySku(sku);

        if (
            !linesEditable(list) ||
            !row ||
            list.lines.some((line) => line.sku === sku && !lineMoved(line))
        ) {
            return null;
        }

        const line = withKey(list, snapshot(row));

        list.lines.push(line);
        writeLog({ act: 'buying_lines_add', ent: list.id, to: '1' });
        save(list);

        return line;
    }

    /** A line by its key — the item code is not unique on a real sheet. */
    const lineOf = (list, key) => {
        if (list) {
            keyLines(list);
        }

        return (list?.lines || []).find((line) => line.key === key) || null;
    };

    /**
     * A line's quantity. Open while the sheet is: an order's quantities are
     * what was asked of the supplier, so once it is sent they are fixed, and
     * whatever arrives is measured against them (`lineGap`). A line goods
     * already arrived on keeps its quantity even on an order that failed.
     */
    function setQty(id, key, qty) {
        const list = listById(id);
        const line = lineOf(list, key);

        if (
            !line ||
            !linesEditable(list) ||
            Number(line.received) > 0 ||
            lineMoved(line)
        ) {
            return null;
        }

        const amount = Number(qty);

        line.qty = Number.isFinite(amount) && amount > 0 ? amount : null;
        save(list);

        return line;
    }

    /** The checklist: a request line is ticked off as it is sourced. */
    function toggleDone(id, key) {
        const list = listById(id);
        const line = lineOf(list, key);

        if (
            !line ||
            !BUYING_KIND[list.kind]?.checklist ||
            !linesEditable(list) ||
            lineMoved(line)
        ) {
            return null;
        }

        line.done = !line.done;
        save(list);

        return line;
    }

    function removeLine(id, key) {
        const list = listById(id);

        if (!linesEditable(list)) {
            return null;
        }

        keyLines(list);

        const at = list.lines.findIndex((line) => line.key === key);

        // A line goods already arrived against is part of the record of what
        // came, and a request line that moved to an order is the record of
        // that move; both stay.
        if (
            at < 0 ||
            Number(list.lines[at].received) > 0 ||
            lineMoved(list.lines[at])
        ) {
            return null;
        }

        list.lines.splice(at, 1);

        // What is left may be nothing but lines that already moved — which is
        // a request that is done.
        if (!settleRequest(list)) {
            save(list);
        }

        return list;
    }

    /**
     * The order's price for one line — "הצעת מחיר", per purchase unit, before
     * VAT — written beside the last purchase price. Open while `quoteEditable`
     * (config/buying.js) says so: until goods arrive for the line. It opens the
     * price of a tax-invoice receipt and of an invoice attached later; it is
     * not in the regular export.
     */
    function setQuotePrice(id, key, value) {
        const list = listById(id);
        const line = lineOf(list, key);

        if (!line || !quoteEditable(list, line)) {
            return null;
        }

        const amount =
            value === '' || value === null || value === undefined
                ? null
                : Number(value);
        const next = Number.isFinite(amount) && amount >= 0 ? amount : null;

        if (next === (line.quotePrice ?? null)) {
            return line;
        }

        writeLog({
            act: 'buying_quote',
            ent: list.id,
            from: line.quotePrice ?? null,
            to: next === null ? null : `${line.sku} · ${next}`,
        });
        line.quotePrice = next;
        save(list);

        return line;
    }

    /**
     * Who the order goes to. Settled once it is sent — the supplier is who it
     * went to — and open again when it failed, because "looking for another
     * supplier" is the common reason it failed.
     */
    function setSupplier(id, { supplierCode, supplier }) {
        const list = listById(id);

        if (!list || !['draft', 'failed'].includes(list.state)) {
            return null;
        }

        const from = list.supplierCode;

        list.supplierCode = supplierCode || null;
        list.supplier = supplier || null;

        if (from && from !== list.supplierCode) {
            writeLog({
                act: 'buying_supplier',
                ent: list.id,
                valueType: 'plain',
                from: supplierName(from)?.he || from,
                to: supplier?.he || supplier || '—',
            });
        }

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

    /**
     * The note that goes to the supplier, at the head of the exported sheet.
     * Written while the order is being prepared; once it is sent it is part
     * of what was sent.
     */
    function setSupplierNote(id, note) {
        const list = listById(id);

        if (!list || list.kind !== 'order' || !linesEditable(list)) {
            return null;
        }

        list.supplierNote = String(note || '');

        return save(list);
    }

    /**
     * May this sheet be taken off the lists? Only one nothing happened to: a
     * draft order, or an open request none of whose lines moved to an order —
     * a moved line is the record of an order, and the order points back at it.
     */
    const removable = (list) =>
        Boolean(list) &&
        ((list.kind === 'order' && list.state === 'draft') ||
            (list.kind === 'request' &&
                list.state === 'open' &&
                !list.lines.some(lineMoved)));

    /**
     * Take a sheet off the lists. Nothing is deleted — see
     * `config/archive.js` — and only a sheet nothing happened to may go
     * (`removable`). Anything sent or received stays on record.
     */
    function removeList(id, { by, reason } = {}) {
        const list = listById(id);

        if (!removable(list)) {
            return null;
        }

        list[ARCHIVE_FIELD] = {
            by: by || dataset.me?.name || null,
            on: moment(),
            reason: reason || null,
        };
        writeLog({
            act: 'buying_archive',
            ent: list.id,
            to: list.number,
            note: reason || null,
        });

        return save(list);
    }

    /**
     * Move a sheet to another state.
     *
     * The states are in `config/buying.js`, one set per kind, and the moves a
     * person may make by hand are `buyingMoves` there. What is recorded is that
     * it moved, from what, and by whom. A send is dated every time it happens,
     * so an order that failed and went out again says when it went out last.
     */
    function setState(id, state, { by } = {}) {
        const list = listById(id);

        if (!list || list.state === state) {
            return list;
        }

        const from = list.state;

        list.state = state;

        if (state === 'sent') {
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
     * A copy of the sheet left the console — nothing more.
     *
     * Exporting used to be what sent a draft order; it no longer is. A buyer
     * takes a copy to work from at any stage, draft included, without that
     * stage changing — sending is its own, deliberate move (`buying.move.sent`).
     */
    function markExported(id) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        writeLog({ act: 'buying_export', ent: list.id, to: list.number });

        return save(list);
    }

    /** The newest draft order to one supplier, still unsent. */
    const openDraftFor = (code) =>
        code
            ? listsOf('order').find(
                  (one) => one.state === 'draft' && one.supplierCode === code,
              ) || null
            : null;

    /**
     * What turning a request's ticked lines into orders will do, group by
     * group — read by the confirmation dialog and by the move itself, so the
     * buyer is shown exactly what happens.
     *
     * A supplier who already has a draft order waiting gets the lines on that
     * draft (`into`) rather than a second order beside it: a request worked
     * through in two sittings should not send one supplier two orders. A
     * group with no supplier always opens its own draft — whoever picks the
     * supplier on it decides where those lines go.
     */
    function conversionPlan(id) {
        const list = listById(id);

        if (!list || list.kind !== 'request' || list.state !== 'open') {
            return [];
        }

        return groupDoneLines(list, supplierName).map((group) => ({
            ...group,
            into: openDraftFor(group.supplierCode),
        }));
    }

    /**
     * Push a request's sourced lines into one order per supplier.
     *
     * A request is one shopping list and an order is one supplier, so the
     * split is read off the lines themselves — each already carries the
     * supplier it was sourced from — rather than asked for again. Only lines
     * ticked `done` move; everything else stays on the request for later.
     * An item a draft already holds is not listed twice there: the quantities
     * are added together.
     *
     * **For production (12.11.2026).** A line that moved is not taken off the
     * request: it stays, read-only, marked with the order it went to
     * (`movedTo: {id, number}`), so the request remains the record of what was
     * asked for and where each item went. When this move leaves no line
     * unmoved, the request is "בוצע" (`settleRequest`) — automatically, never
     * by hand. A request moved in part stays open, the rest editable.
     *
     * @returns {Array<{order: object, merged: boolean, lines: number}>}
     */
    function convertToOrders(id) {
        const list = listById(id);
        const plan = conversionPlan(id);

        if (!list || !plan.length) {
            return [];
        }

        keyLines(list);

        const results = plan.map(
            ({ supplierCode, supplierName: name, lines, into }) => {
                const order =
                    into ||
                    createList('order', {
                        supplierCode: supplierCode || '',
                        supplier: name,
                    });

                keyLines(order);

                lines.forEach((line) => {
                    const twin = into
                        ? order.lines.find((one) => one.sku === line.sku)
                        : null;

                    if (twin) {
                        const sum =
                            (Number(twin.qty) || 0) + (Number(line.qty) || 0);

                        twin.qty = sum > 0 ? round3(sum) : null;

                        return;
                    }

                    order.lines.push(
                        withKey(order, {
                            ...line,
                            done: false,
                            received: null,
                            movedTo: null,
                        }),
                    );
                });
                save(order);

                lines.forEach((line) => {
                    line.movedTo = { id: order.id, number: order.number };
                });

                writeLog({
                    act: 'buying_convert',
                    ent: order.id,
                    from: list.number,
                    to: order.number,
                });

                return { order, merged: Boolean(into), lines: lines.length };
            },
        );

        writeLog({
            act: 'buying_convert',
            ent: list.id,
            to: results.map(({ order }) => order.number).join(', '),
        });

        if (!settleRequest(list)) {
            save(list);
        }

        return results;
    }

    /**
     * A request every line of which has moved to an order is "בוצע". Called by
     * whatever can make that true — moving lines, and removing the last line
     * that had not moved. Returns whether it moved the request.
     */
    function settleRequest(list) {
        if (
            list?.kind !== 'request' ||
            list.state !== 'open' ||
            !allLinesMoved(list)
        ) {
            return false;
        }

        setState(list.id, 'done');

        return true;
    }

    // ---- an order's goods and its documents -----------------------------------

    /** The goods receipts booked against an order, as records. */
    const receiptsOfList = (list) =>
        (list?.receipts || [])
            .map((id) => inventory.receiptById(id))
            .filter(Boolean);

    /** Its delivery notes still waiting for a tax invoice. */
    const openNotesOfList = (list) => receiptsOfList(list).filter(isOpenNote);

    /** Did any of its deliveries come on a delivery note? */
    const hasNotes = (list) =>
        receiptsOfList(list).some(
            (receipt) => receipt.docType === 'delivery_note',
        );

    /**
     * Where an order goes once nothing more is coming — its last goods booked
     * in, or the rest closed: "ממתין לחשבונית מס" while a delivery note of it
     * still has no tax invoice, "התקבלה" when every line has its price.
     */
    const closingState = (list) =>
        openNotesOfList(list).length ? 'awaiting_invoice' : 'received';

    /**
     * Close the orders an attached invoice may have finished: each one that
     * was "ממתין לחשבונית מס" and has no open delivery note left moves to
     * "התקבלה". An order still holding another open note keeps waiting.
     *
     * @param {string[]} ids  buying-list ids, as `purchasing.attachInvoice`
     *   hands them back
     * @returns {object[]} the orders that closed
     */
    function settleInvoiced(ids) {
        return [...new Set(ids || [])]
            .map((id) => listById(id))
            .filter(
                (list) =>
                    list?.kind === 'order' &&
                    list.state === 'awaiting_invoice' &&
                    !openNotesOfList(list).length,
            )
            .map((list) => setState(list.id, 'received'));
    }

    /**
     * Attach one tax invoice to open delivery notes, and close what it
     * finished — the whole of "הצמדת חשבונית מס", from wherever it is pressed
     * (the suppliers screen's open-notes tab, an order waiting for its invoice).
     * The invoice itself is stores/purchasing.js `attachInvoice`.
     *
     * @returns {Promise<{invoice: object, closed: object[]}>}
     */
    async function attachInvoice(form) {
        const { invoice, orders } = await purchasing.attachInvoice(form);

        return { invoice, closed: settleInvoiced(orders) };
    }

    /**
     * The goods arrived: book in what actually turned up.
     *
     * The quantities are the receiver's and not the order's — a supplier who
     * sent eight of ten is recorded as eight, and the line keeps both figures.
     * Receipts add up: the order stays sent, and receivable, until every line
     * has arrived in full, so the two missing are booked against it when they
     * come. The shelf is raised by `inventory.receiveGoods` — through
     * `purchasing.receiveDocument`, the one door every receipt goes through —
     * so what lands here lands exactly as a receipt entered by hand does.
     *
     * **For production (12.11.2026).** Each delivery is one supplier document,
     * chosen at the top of the receipt screen (config/supplierDocs.js):
     *
     *   "תעודת משלוח"  the lines are booked with no price. If this delivery
     *                  completes the order, the order waits in "ממתין לחשבונית
     *                  מס" until a tax invoice is attached to its notes.
     *   "חשבונית מס"   every line carries its price — per purchase unit,
     *                  before VAT, opened at the line's quote price — the
     *                  invoice is recorded on the supplier, and an order this
     *                  delivery completes closes on it ("התקבלה"), unless an
     *                  earlier delivery note of it is still without an invoice.
     *
     * A general line ("פריט כללי": free description, quantity, price before
     * VAT) rides on the document only — no order line, no stock, no batch, no
     * label. An item whose card has "ניהול אצוות" off is booked in with no
     * batch, no production date and no expiry.
     *
     * The item card's "בהזמנה" (stores/items.js `onOrderOf`, config/items.js
     * `sentOrderQtyBySku`) is every SENT order's outstanding quantity —
     * ordered less received, in the stock unit; drafts do not count. Each
     * receipt here raises `received` on the order line, so the figure drops by
     * exactly what arrived, and an order that leaves "נשלחה" — complete,
     * waiting for its invoice, closed short — drops out of it altogether.
     * Nothing on the card is written for it: the card reads the orders.
     *
     * @param {string} id
     * @param {{docType: 'delivery_note'|'tax_invoice', docNum?: string,
     *          date: string, note?: string, file?: File|null,
     *          lines: Array<{key: string, qty: number, supplierBatch?: string,
     *                        madeOn?: string, expiry?: string, price?: number,
     *                        labels?: number}>,
     *          general?: Array<{name: string, qty: number, price: number}>}} form
     */
    async function receiveList(id, form) {
        const list = listById(id);

        if (!list || list.kind !== 'order' || list.state !== 'sent') {
            throw new Error(`${id} is not a sent purchase order`);
        }

        if (!RECEIPT_DOC_TYPE_IDS.includes(form.docType)) {
            throw new Error('A goods receipt says which document it came on');
        }

        keyLines(list);

        const arrived = (form.lines || []).filter(
            (line) => Number(line.qty) > 0,
        );

        if (!arrived.length) {
            throw new Error('A goods receipt needs at least one quantity');
        }

        const invoice = form.docType === 'tax_invoice';
        const general = (form.general || []).filter((line) =>
            String(line.name || '').trim(),
        );

        const booked = await purchasing.receiveDocument({
            supplier: list.supplier,
            supplierCode: list.supplierCode,
            po: list.id,
            docType: form.docType,
            docNum: form.docNum || list.number,
            date: form.date,
            note: form.note || '',
            file: form.file || null,
            // The sheet counts in the purchase unit and the shelf counts in the
            // stock unit; `numInBuy` off the item card is what sits between.
            lines: [
                ...arrived.map((line) => {
                    const row = list.lines.find((one) => one.key === line.key);
                    const perBuy = Number(row?.numInBuy) || 1;
                    const card = items.itemBySku(row?.sku || line.sku);
                    const batched = card?.flags?.batch !== false;

                    return {
                        sku: row?.sku || line.sku,
                        key: line.key,
                        qty: Number(line.qty) * perBuy,
                        perBuy,
                        wh: line.wh || DEFAULT_WAREHOUSE,
                        batched,
                        supplierBatch: batched ? line.supplierBatch || '' : '',
                        // The supplier's manufacturing date, off the
                        // certificate — the label's "תאריך ייצור".
                        madeOn: batched ? line.madeOn || null : null,
                        expiry: batched ? line.expiry || null : null,
                        // A tax invoice's price, as typed; a delivery note has
                        // none (`receiveGoods` drops whatever it is handed).
                        price: invoice ? line.price : null,
                        quotePrice: row?.quotePrice ?? null,
                        // How many containers the quantity is divided into:
                        // one batch label for each, numbered 1/n … n/n.
                        labels: Math.max(
                            0,
                            Math.round(Number(line.labels) || 0),
                        ),
                    };
                }),
                ...general.map((line) => ({
                    general: true,
                    name: String(line.name).trim(),
                    qty: Number(line.qty) || 1,
                    price: line.price,
                })),
            ],
        });

        arrived.forEach((line) => {
            const row = list.lines.find((one) => one.key === line.key);

            if (row) {
                row.received = round3(
                    (Number(row.received) || 0) + Number(line.qty),
                );
            }
        });

        list.receipts = [...(list.receipts || []), booked.id];
        list.received = moment();

        writeLog({ act: 'buying_receive', ent: list.id, to: booked.id });

        if (isFullyReceived(list)) {
            setState(id, closingState(list));
        } else {
            save(list);
        }

        return booked;
    }

    /**
     * The rest is not coming: close an order part of which arrived.
     *
     * It closes on what was booked in, and claims nothing more — the lines
     * keep what came, and the shortfall stays visible on them. Only for an
     * order something actually arrived on; one nothing arrived on is `failed`,
     * which says that. Closed means "התקבלה" only when every delivery is
     * priced; a delivery note still without its invoice makes it "ממתין
     * לחשבונית מס" (`closingState`).
     */
    function closeRemainder(id, reason = '') {
        const list = listById(id);

        if (
            !list ||
            list.state !== 'sent' ||
            !list.lines.some((line) => Number(line.received) > 0)
        ) {
            return null;
        }

        const short = list.lines.filter((line) => lineOutstanding(line) > 0);

        list.closedShort = true;
        writeLog({
            act: 'buying_close_short',
            ent: list.id,
            to: String(short.length),
            note: reason.trim() || null,
        });

        return setState(id, closingState(list));
    }

    return {
        lists,
        listsOf,
        listById,
        createList,
        addSkus,
        addItem,
        setQty,
        setQuotePrice,
        toggleDone,
        removeLine,
        setSupplier,
        setNote,
        setSupplierNote,
        removable,
        removeList,
        setState,
        markExported,
        openDraftFor,
        conversionPlan,
        convertToOrders,
        receiveList,
        closeRemainder,
        receiptsOfList,
        openNotesOfList,
        hasNotes,
        settleInvoiced,
        attachInvoice,
    };
});
