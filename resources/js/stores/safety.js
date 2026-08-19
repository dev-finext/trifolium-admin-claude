// The safety desk: the documented herb ⇄ drug interaction table, the per-herb
// contraindications, and the pharmacist confirmations that close an
// `interaction` exception.
//
// Rows are read from — and written back to — the loaded dataset, so an edit made
// on the safety screen is the same edit an order's safety tab reads. There is one
// interaction table in the console, not one per screen. Every mutation updates it
// optimistically and calls persist(), which is a no-op against the fixture.
//
// Two clinical rules live here and nowhere else:
//
//   1. An interaction is a plain bidirectional herb ⇄ drug link. No severity, no
//      clinical note: the pharmacist decides, the console only makes sure nobody
//      misses the pair.
//   2. A row HITS an order when any medicine the patient declared appears as a
//      case-insensitive substring of the row's drug list. The same rule runs in
//      the practitioner-facing compounding wizard, so it must not drift.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { persist } from '@/data/source';
import { stamp } from '@/lib/dates';
import { searchHaystack } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useOrdersStore } from '@/stores/orders';

/** Interaction row ids run `i1`, `i2`, … — a new row continues the series. */
const ID_PREFIX = 'i';

/** The two columns a CSV import and export of the table carry. */
export const CSV_COLUMNS = ['herb_id', 'drugs'];

/** Split a stored drug list into the individual names it is matched by. */
export function drugList(drug) {
    return String(drug || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
}

/** The canonical form a drug list is stored and compared in. */
export function drugKey(drug) {
    return drugList(drug).join(', ').toLowerCase();
}

/** True while `term` matches a herb's Hebrew, English, Latin or Chinese name. */
export function herbMatches(herb, term) {
    const needle = String(term || '')
        .trim()
        .toLowerCase();

    if (!needle) {
        return true;
    }

    return searchHaystack(herb.name, herb.lat, herb.cn).includes(needle);
}

/** One row of the export, quoted so the comma-separated drug list survives. */
function csvRow(row) {
    return `${row.herbId},"${drugList(row.drug).join(', ')}"`;
}

/** `herb_id,"drug, drug"` per row, with the header line. */
export function interactionsToCsv(rows) {
    return [CSV_COLUMNS.join(','), ...rows.map(csvRow)].join('\n');
}

/** Split one CSV line into `[herbId, drugs]`; the drug list may be quoted. */
function csvCells(line) {
    const at = line.indexOf(',');

    if (at === -1) {
        return [];
    }

    const drugs = line
        .slice(at + 1)
        .trim()
        .replace(/^"|"$/g, '')
        .replace(/""/g, '"');

    return [line.slice(0, at).trim(), drugs];
}

/**
 * Read an uploaded CSV back into candidate rows. Validation is the store's job —
 * this only turns text into `{ herbId, drug }` pairs.
 */
export function parseInteractionCsv(text) {
    return String(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(csvCells)
        .filter((cells) => cells.length === 2 && cells[0] !== CSV_COLUMNS[0])
        .map(([herbId, drug]) => ({ herbId, drug }));
}

export const useSafetyStore = defineStore('safety', () => {
    const dataset = useDatasetStore();
    const orders = useOrdersStore();

    const interactions = computed(() => dataset.data.interactions || []);
    const herbs = computed(() => dataset.data.herbs || []);
    const herbsById = computed(() => dataset.data.herbsById || {});
    const herbWarnings = computed(() => dataset.data.herbWarnings || {});

    const herb = (id) => herbsById.value[id] || null;
    const warningsFor = (herbId) => herbWarnings.value[herbId] || [];

    /**
     * The contraindication palette.
     *
     * The fixture carries contraindications as localized tags on the herbs that
     * have them, so the palette is the set of tags the catalog knows about. It is
     * remembered rather than recomputed: clearing the last herb that carried a
     * tag must not delete the tag from the palette.
     */
    const seenTags = ref(new Map());

    watch(
        herbWarnings,
        (map) => {
            Object.values(map || {}).forEach((tags) =>
                (tags || []).forEach((tag) => {
                    if (!seenTags.value.has(tag.he)) {
                        seenTags.value.set(tag.he, tag);
                    }
                }),
            );
        },
        { immediate: true, deep: true },
    );

    const warningTags = computed(() => [...seenTags.value.values()]);

    /** Herbs that carry at least one documented interaction row. */
    const herbsWithRows = computed(() => [
        ...new Set(interactions.value.map((row) => row.herbId)),
    ]);

    /** Every individual drug name the table mentions, once, sorted. */
    const allDrugs = computed(() =>
        [
            ...new Set(interactions.value.flatMap((row) => drugList(row.drug))),
        ].sort((a, b) => a.localeCompare(b)),
    );

    const rowsForHerb = (herbId) =>
        interactions.value.filter((row) => row.herbId === herbId);

    const rowsForDrug = (name) =>
        interactions.value.filter((row) => drugList(row.drug).includes(name));

    /** Every distinct herb on one order's formulas. */
    const herbsOnOrder = (order) => orders.herbsOf(order);

    /**
     * The documented interactions on one order.
     *
     * Delegated to the orders store, which owns the same rule for the order's own
     * safety tab. One implementation means the safety desk and the order can never
     * disagree about whether a pair was found.
     */
    const interactionHits = (order) => orders.interactionsFor(order);

    /** How many orders each herb appears in, across every formula they carry. */
    const orderCountByHerb = computed(() => {
        const counts = {};

        dataset.orders.forEach((order) => {
            herbsOnOrder(order).forEach((entry) => {
                counts[entry.id] = (counts[entry.id] || 0) + 1;
            });
        });

        return counts;
    });

    /** Orders whose formulas contain this herb — the blast radius of an edit. */
    const impact = (herbId) => orderCountByHerb.value[herbId] || 0;

    /**
     * The same rule, run against a hand-typed list — the test bench. The hits carry
     * the shape the order's hits do, so InteractionCard renders both identically.
     */
    function benchHits(herbIds, meds) {
        const hits = [];
        const seen = new Set();

        herbIds.forEach((herbId) => {
            rowsForHerb(herbId).forEach((row) => {
                const med = meds.find((name) =>
                    row.drug.toLowerCase().includes(name.toLowerCase()),
                );
                const key = `${herbId}|${med}`;

                if (!med || seen.has(key)) {
                    return;
                }

                seen.add(key);
                hits.push({
                    id: key,
                    herb: herb(herbId),
                    med,
                    drugs: row.drug,
                });
            });
        });

        return hits;
    }

    // ---- pharmacist approval -------------------------------------------------

    /**
     * Confirmations made in this session, newest first. The fixture holds no
     * approval history: an order either still carries the exception or a
     * pharmacist has cleared it here.
     */
    const approvals = ref([]);

    const approvalFor = (orderId) =>
        approvals.value.find((record) => record.orderId === orderId) || null;

    /** Orders whose interaction alert is still waiting for a pharmacist. */
    const awaitingApproval = computed(() =>
        dataset.orders.filter((order) => order.flags?.includes('interaction')),
    );

    /** The orders this session has cleared, newest first. */
    const approvedOrders = computed(() =>
        approvals.value
            .map((record) =>
                dataset.orders.find((order) => order.id === record.orderId),
            )
            .filter(Boolean),
    );

    /**
     * A pharmacist confirms the interaction alert on one order. This is the only
     * thing that resolves the `interaction` exception — the flag is derived from
     * the order, so clearing it here clears the bell and the nav badge too.
     */
    async function approveInteraction(orderId, why = '') {
        const order = dataset.orders.find((row) => row.id === orderId);

        if (!order) {
            return null;
        }

        const record = {
            orderId,
            by: dataset.me?.name || null,
            when: stamp(0),
            why,
            hits: interactionHits(order).length,
        };

        order.interactionFlag = false;
        order.flags = (order.flags || []).filter(
            (flag) => flag !== 'interaction',
        );
        approvals.value = [record, ...approvals.value];

        await persist(`orders/${orderId}/interaction-approval`, { why });

        return record;
    }

    // ---- the interaction table ----------------------------------------------

    function nextId() {
        const top = interactions.value.reduce((highest, row) => {
            const n = Number(String(row.id).replace(ID_PREFIX, ''));

            return Number.isFinite(n) && n > highest ? n : highest;
        }, 0);

        return `${ID_PREFIX}${top + 1}`;
    }

    /** The same herb with the same drug list may only be documented once. */
    function isDuplicate(herbId, drug, exceptId = null) {
        const key = drugKey(drug);

        return interactions.value.some(
            (row) =>
                row.id !== exceptId &&
                row.herbId === herbId &&
                drugKey(row.drug) === key,
        );
    }

    async function saveInteraction({ id, herbId, drug }) {
        const rows = dataset.data.interactions;

        if (!Array.isArray(rows)) {
            return null;
        }

        const row = {
            id: id || nextId(),
            herbId,
            drug: drugList(drug).join(', '),
        };
        const at = rows.findIndex((existing) => existing.id === row.id);

        if (at === -1) {
            rows.push(row);
        } else {
            rows[at] = row;
        }

        await persist(
            `safety/interactions/${row.id}`,
            row,
            at === -1 ? 'POST' : 'PUT',
        );

        return row;
    }

    async function deleteInteraction(id, why = '') {
        const rows = dataset.data.interactions;
        const at = Array.isArray(rows)
            ? rows.findIndex((row) => row.id === id)
            : -1;

        if (at === -1) {
            return null;
        }

        const [removed] = rows.splice(at, 1);

        await persist(`safety/interactions/${id}`, { why }, 'DELETE');

        return removed;
    }

    /**
     * Add every candidate row a CSV brought in that the table can accept: the
     * herb id has to exist in the catalog, the drug list cannot be empty, and the
     * pair must not already be documented.
     *
     * @returns {{added: number, skipped: number}}
     */
    async function importInteractions(candidates) {
        const rows = dataset.data.interactions;

        if (!Array.isArray(rows)) {
            return { added: 0, skipped: candidates.length };
        }

        const added = [];
        let skipped = 0;

        candidates.forEach((candidate) => {
            const drug = drugList(candidate.drug).join(', ');
            const known = Boolean(herbsById.value[candidate.herbId]);

            if (!known || !drug || isDuplicate(candidate.herbId, drug)) {
                skipped += 1;

                return;
            }

            const row = { id: nextId(), herbId: candidate.herbId, drug };

            rows.push(row);
            added.push(row);
        });

        if (added.length) {
            await persist('safety/interactions/import', { rows: added });
        }

        return { added: added.length, skipped };
    }

    // ---- contraindications ---------------------------------------------------

    /** Replace one herb's contraindication tags with the set just toggled. */
    async function setHerbWarnings(herbId, tags) {
        const map = dataset.data.herbWarnings;

        if (!map) {
            return null;
        }

        map[herbId] = [...tags];

        await persist(`safety/herbs/${herbId}/contraindications`, { tags });

        return map[herbId];
    }

    return {
        interactions,
        herbs,
        herbsById,
        herbWarnings,
        herb,
        warningsFor,
        warningTags,
        herbsWithRows,
        allDrugs,
        rowsForHerb,
        rowsForDrug,
        impact,
        herbsOnOrder,
        interactionHits,
        benchHits,

        approvals,
        approvalFor,
        awaitingApproval,
        approvedOrders,
        approveInteraction,

        isDuplicate,
        saveInteraction,
        deleteInteraction,
        importInteractions,
        setHerbWarnings,
    };
});
