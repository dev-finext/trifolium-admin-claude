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
    liveOnly,
    lineFromItem,
    parseSkus,
} from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';

/** This moment, in the shape every record's `when` field carries. */
function moment() {
    return { iso: isoDaysAgo(0), stamp: stamp(0), time: hm(now()) };
}

export const useBuyingStore = defineStore('buying', () => {
    const dataset = useDatasetStore();
    const items = useItemsStore();

    const all = computed(() => dataset.data.buyingLists || []);
    const lists = computed(() => liveOnly(all.value));

    const listsOf = (kind) => lists.value.filter((row) => row.kind === kind);

    const listById = (id) => all.value.find((row) => row.id === id) || null;

    function bag() {
        if (!Array.isArray(dataset.data.buyingLists)) {
            dataset.data.buyingLists = [];
        }

        return dataset.data.buyingLists;
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
            state: 'open',
            created: moment(),
            by: dataset.me?.name || null,
            [ARCHIVE_FIELD]: null,
        };

        rows.unshift(list);
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

            list.lines.push(lineFromItem(row));
            result.added.push(code);
        }

        if (result.added.length) {
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

        const line = lineFromItem(row);

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

    /** Sent to the supplier, or worked through to the end. */
    function closeList(id) {
        const list = listById(id);

        if (!list || list.state === 'closed') {
            return list;
        }

        list.state = 'closed';
        list.closed = moment();

        return save(list);
    }

    function reopenList(id) {
        const list = listById(id);

        if (!list || list.state !== 'closed') {
            return list;
        }

        list.state = 'open';
        list.closed = null;

        return save(list);
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
        closeList,
        reopenList,
    };
});
