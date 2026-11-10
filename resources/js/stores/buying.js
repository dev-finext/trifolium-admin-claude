// רכש — the buyer's own sheets.
//
// A purchase request is a shopping list and a purchase order is a list with a
// supplier on it, so they are one record with a `kind` rather than two stores
// that would share every line of their code. Neither posts stock or reserves
// anything: they are written, worked through, and exported.
//
// The lines carry their own copy of what the item looked like when it was added
// — see `lineFromItem` in `config/buying.js` for why — and their own `key`: a
// real sheet can list one item twice, so a tick, a quantity or a receipt is
// addressed to the line, never to the item code.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    ARCHIVE_FIELD,
    BUYING_KIND,
    BUYING_SERIES,
    buyingFirstState,
    DEFAULT_WAREHOUSE,
    groupDoneLines,
    isFullyReceived,
    leadTimeOf,
    lineOutstanding,
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

const round3 = (value) => Math.round(value * 1000) / 1000;

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
            note: '',
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

            list.lines.push(withKey(list, snapshot(row)));
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

    function setQty(id, key, qty) {
        const list = listById(id);
        const line = lineOf(list, key);

        if (!line) {
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

        if (!line || !BUYING_KIND[list.kind]?.checklist) {
            return null;
        }

        line.done = !line.done;
        save(list);

        return line;
    }

    function removeLine(id, key) {
        const list = listById(id);

        if (!list) {
            return null;
        }

        keyLines(list);

        const at = list.lines.findIndex((line) => line.key === key);

        // A line goods already arrived against is part of the record of what
        // came; it stays.
        if (at < 0 || Number(list.lines[at].received) > 0) {
            return null;
        }

        list.lines.splice(at, 1);
        save(list);

        return list;
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
     * Take a sheet off the lists. Nothing is deleted — see
     * `config/archive.js` — and only a sheet nothing happened to may go: a
     * draft order, or a request still open. Anything sent or received stays
     * on record.
     */
    function removeList(id, { by, reason } = {}) {
        const list = listById(id);

        if (
            !list ||
            !(
                (list.kind === 'order' && list.state === 'draft') ||
                (list.kind === 'request' && list.state === 'open')
            )
        ) {
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
                        }),
                    );
                });
                save(order);

                writeLog({
                    act: 'buying_convert',
                    ent: order.id,
                    from: list.number,
                    to: order.number,
                });

                return { order, merged: Boolean(into), lines: lines.length };
            },
        );

        const moved = new Set(
            plan.flatMap((group) => group.lines.map((line) => line.key)),
        );

        list.lines = list.lines.filter((line) => !moved.has(line.key));

        writeLog({
            act: 'buying_convert',
            ent: list.id,
            to: results.map(({ order }) => order.number).join(', '),
        });
        save(list);

        return results;
    }

    /**
     * The goods arrived: book in what actually turned up.
     *
     * The quantities are the receiver's and not the order's — a supplier who
     * sent eight of ten is recorded as eight, and the line keeps both figures.
     * Receipts add up: the order stays sent, and receivable, until every line
     * has arrived in full, so the two missing are booked against it when they
     * come. The shelf is raised by `inventory.receiveGoods`, the one place
     * that opens batches and posts the goods-receipt document, so what lands
     * here lands exactly as a receipt entered by hand does.
     *
     * @param {string} id
     * @param {{docNum?: string, date: string, note?: string,
     *          lines: Array<{key: string, qty: number, supplierBatch?: string,
     *                        expiry?: string, price?: number}>}} form
     */
    async function receiveList(id, form) {
        const list = listById(id);

        if (!list || list.kind !== 'order' || list.state !== 'sent') {
            throw new Error(`${id} is not a sent purchase order`);
        }

        keyLines(list);

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
                const row = list.lines.find((one) => one.key === line.key);
                const perBuy = Number(row?.numInBuy) || 1;

                return {
                    sku: row?.sku || line.sku,
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
            const row = list.lines.find((one) => one.key === line.key);

            if (row) {
                row.received = round3(
                    (Number(row.received) || 0) + Number(line.qty),
                );
            }
        });

        list.receipts = [...(list.receipts || []), receipt.id];
        list.received = moment();

        writeLog({ act: 'buying_receive', ent: list.id, to: receipt.id });

        if (isFullyReceived(list)) {
            setState(id, 'received');
        } else {
            save(list);
        }

        return receipt;
    }

    /**
     * The rest is not coming: close an order part of which arrived.
     *
     * It moves to `received` on what was booked in, and claims nothing more —
     * the lines keep what came, and the shortfall stays visible on them. Only
     * for an order something actually arrived on; one nothing arrived on is
     * `failed`, which says that.
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

        return setState(id, 'received');
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
        openDraftFor,
        conversionPlan,
        convertToOrders,
        receiveList,
        closeRemainder,
    };
});
