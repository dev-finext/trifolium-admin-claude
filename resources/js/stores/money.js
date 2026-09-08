// Money: what is owed, what came in, and the tax documents the cloud provider
// issued for us.
//
// Nothing here states a balance. A practitioner owes whatever his open credit
// orders come to plus whatever predates them; the aging table is those balances
// bucketed by age; a collection link is always the whole balance. That is why
// recording one payment moves the tiles, the aging table and the statement
// together — they are all the same derivation.
//
// Mutations change the loaded records in place and call persist(), a no-op
// against the fixture. Two business rules are enforced here rather than in a
// screen, because both are easy to break from the UI:
//
//   1. Collection is all or nothing — CREDIT.allowPartial is false. A payment is
//      recorded for the whole open balance or not at all.
//   2. The pharmacy issues no document itself. A re-issue asks the provider
//      again and leaves the document without a number until it answers: the
//      console never invents a document number or an allocation number.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { AGING_BUCKETS, agingBucket, CREDIT, PAYMENT_METHODS } from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { L } from '@/lib/localized';
import { num, priceParts } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';

/**
 * The age windows the finance filters offer, in days. A display range, not a
 * business rule — the thresholds that decide anything live in config/finance.js.
 */
export const TIME_WINDOWS = [7, 30, 90];

/** The window the "collected recently" tile reports on, in days. */
export const COLLECTED_WINDOW_DAYS = 30;

/**
 * How money can arrive against an open balance at the counter. `credit_terms` is
 * the absence of a payment and `points` are redeemed on the order itself, so
 * neither can be recorded as one.
 */
export const MANUAL_PAYMENT_METHODS = PAYMENT_METHODS.filter(
    (method) => method !== 'credit_terms' && method !== 'points',
);

/** Ids for records this session created, unique within the session. */
let sequence = 0;

/**
 * The moment a mutation happened, in the three forms the records carry. Reads
 * the same clock as the fixture, so a row added now sorts against rows the
 * fixture authored.
 */
function moment() {
    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(now()),
        stamp: stamp(0),
    };
}

/**
 * A gross amount split back into the net and the VAT a tax document states. The
 * rate is whatever SETTINGS holds — read through priceParts() so one setting
 * moves every screen.
 *
 * @param {number} gross
 * @returns {{ net: number, rate: number, vat: number, gross: number }}
 */
export function vatParts(gross) {
    const { rate } = priceParts(0);
    const net = Math.round((Number(gross) || 0) / (1 + rate) / 0.01) * 0.01;
    const parts = priceParts(net);

    return { net: parts.net, rate, vat: parts.vat, gross: Number(gross) || 0 };
}

/**
 * What the three finance lists can be filtered by, declared once beside the
 * store that holds them.
 *
 * A balance is a person and their debt, a document is a thing Green Invoice
 * either issued or failed to issue, and a transaction is a movement of money —
 * so the three share nothing but the practitioner they hang off, and each gets
 * the fields its own list is actually read by.
 *
 * There is no display text here: `group` and every value are ids, and the
 * drawer resolves them through the locale catalogs.
 */
export const BALANCE_FILTER_FIELDS = [
    {
        key: 'bucket',
        group: 'debt',
        kind: 'set',
        prefix: 'agingBucket',
        values: (row) => [agingBucket(row.debtDays).id],
    },
    {
        key: 'track',
        group: 'terms',
        kind: 'set',
        prefix: 'finance.track',
        values: (row) => [row.credit ? 'credit' : 'revoked'],
    },
    {
        key: 'bdebt',
        group: 'debt',
        kind: 'num',
        value: (row) => row.debt,
    },
    {
        key: 'bage',
        group: 'debt',
        kind: 'num',
        value: (row) => row.debtDays,
    },
];

export const BALANCE_FILTER_GROUPS = ['debt', 'terms'];

export const DOC_FILTER_FIELDS = [
    {
        key: 'dstate',
        group: 'state',
        kind: 'set',
        prefix: 'docState',
        values: (doc) => [doc.status],
    },
    {
        key: 'dtype',
        group: 'state',
        kind: 'set',
        values: (doc) => [doc.type],
    },
    {
        key: 'dto',
        group: 'who',
        kind: 'set',
        prefix: 'payer',
        values: (doc) => [doc.toType],
    },
    {
        key: 'dpr',
        group: 'who',
        kind: 'set',
        values: (doc) => [doc.code],
    },
    {
        key: 'damt',
        group: 'size',
        kind: 'num',
        value: (doc) => doc.amt,
    },
    {
        key: 'dage',
        group: 'size',
        kind: 'num',
        value: (doc) => doc.when.daysAgo,
    },
];

export const DOC_FILTER_GROUPS = ['state', 'who', 'size'];

export const TXN_FILTER_FIELDS = [
    {
        key: 'tkind',
        group: 'what',
        kind: 'set',
        prefix: 'finance.txnKind',
        values: (row) => [row.kind],
    },
    {
        key: 'tmethod',
        group: 'what',
        kind: 'set',
        prefix: 'paymentMethod',
        values: (row) => (row.method ? [row.method] : []),
    },
    {
        key: 'tcode',
        group: 'who',
        kind: 'set',
        values: (row) => [row.code],
    },
    {
        key: 'tamt',
        group: 'size',
        kind: 'num',
        // A charge is positive and a payment negative; what a reader means by
        // "over 300" is the size of the movement, not its direction.
        value: (row) => Math.abs(row.amt),
    },
    {
        key: 'tage',
        group: 'size',
        kind: 'num',
        value: (row) => row.when.daysAgo,
    },
];

export const TXN_FILTER_GROUPS = ['what', 'who', 'size'];

export const useMoneyStore = defineStore('money', () => {
    const dataset = useDatasetStore();

    const practitioners = computed(() => dataset.practitioners);
    const orders = computed(() => dataset.orders);
    const documents = computed(() => dataset.documents);
    const transactions = computed(() => dataset.transactions);
    const collectionLinks = computed(() => dataset.collectionLinks);

    /** One `{ code, rows }` ledger per practitioner. */
    const pointsLedgers = computed(() =>
        Array.isArray(dataset.data.pointsLedger)
            ? dataset.data.pointsLedger
            : [],
    );

    /** Balances that predate the order window, keyed by customer number. */
    const legacyDebt = computed(() => dataset.data.legacyDebt || {});

    // ---- selections ---------------------------------------------------------

    const byCode = (code) =>
        practitioners.value.find(
            (practitioner) => practitioner.code === String(code),
        ) || null;

    /** Everyone who owes something, largest balance first. */
    const debtors = computed(() =>
        practitioners.value
            .filter((practitioner) => practitioner.debt > 0)
            .sort((a, b) => b.debt - a.debt),
    );

    const creditPractitioners = computed(() =>
        practitioners.value.filter((practitioner) => practitioner.credit),
    );

    const totalDebt = computed(() =>
        debtors.value.reduce((sum, practitioner) => sum + practitioner.debt, 0),
    );

    /** One practitioner's orders that reached the lab unpaid and still are. */
    const openCreditOrders = (code) =>
        orders.value
            .filter(
                (order) =>
                    order.practitioner.code === String(code) &&
                    order.credit &&
                    !order.creditPaid,
            )
            .sort((a, b) => a.daysAgo - b.daysAgo);

    /** Every open credit order in the console, oldest debt first. */
    const openCreditAll = computed(() =>
        orders.value
            .filter((order) => order.credit && !order.creditPaid)
            .sort((a, b) => b.daysAgo - a.daysAgo),
    );

    const failedDocuments = computed(() =>
        documents.value.filter((document) => document.status === 'failed'),
    );

    /** The document states the loaded set actually contains, for the filter. */
    const documentStates = computed(() => [
        ...new Set(documents.value.map((document) => document.status)),
    ]);

    /** The movement kinds the ledger actually contains, for the filter. */
    const transactionKinds = computed(() => [
        ...new Set(transactions.value.map((row) => row.kind)),
    ]);

    /** The statuses the open credit orders are in, for the filter. */
    const openCreditStatuses = computed(() => [
        ...new Set(openCreditAll.value.map((order) => order.status)),
    ]);

    /** What came in over the last `days` days. */
    const collectedWithin = (days) =>
        transactions.value
            .filter((row) => row.kind === 'payment' && row.when.daysAgo <= days)
            .reduce((sum, row) => sum - row.amt, 0);

    const chargeTotal = computed(() =>
        transactions.value
            .filter((row) => row.kind === 'charge')
            .reduce((sum, row) => sum + row.amt, 0),
    );

    const paymentTotal = computed(() =>
        transactions.value
            .filter((row) => row.kind === 'payment')
            .reduce((sum, row) => sum - row.amt, 0),
    );

    /**
     * The aging table: every bucket from config, with the number of
     * practitioners in it, what they owe and that share of the whole debt.
     */
    const agingRows = computed(() =>
        AGING_BUCKETS.map((bucket) => {
            const inBucket = debtors.value.filter(
                (practitioner) =>
                    agingBucket(practitioner.debtDays).id === bucket.id,
            );
            const amt = inBucket.reduce(
                (sum, practitioner) => sum + practitioner.debt,
                0,
            );

            return {
                ...bucket,
                n: inBucket.length,
                amt,
                share: totalDebt.value
                    ? Math.round((amt / totalDebt.value) * 100)
                    : 0,
            };
        }),
    );

    /** One practitioner's statement, newest first, with a running balance. */
    const statementOf = (code) => {
        const rows = transactions.value.filter(
            (row) => row.code === String(code),
        );
        let running = 0;

        return rows
            .slice()
            .reverse()
            .map((row) => {
                running += row.amt;

                return { ...row, bal: running };
            })
            .reverse();
    };

    const collectionLinkOf = (code) =>
        collectionLinks.value.find((link) => link.code === String(code)) ||
        null;

    /** A practitioner's points movements, newest first. */
    const pointsLedgerOf = (code) => {
        const ledger = pointsLedgers.value.find(
            (entry) => entry.code === String(code),
        );

        return ledger ? ledger.rows : [];
    };

    const totalPoints = computed(() =>
        practitioners.value.reduce(
            (sum, practitioner) => sum + practitioner.points,
            0,
        ),
    );

    const pointMoves = computed(() =>
        pointsLedgers.value.flatMap((ledger) => ledger.rows),
    );

    const pointsEarned = computed(() =>
        pointMoves.value
            .filter((row) => row.amt > 0)
            .reduce((sum, row) => sum + row.amt, 0),
    );

    const pointsRedeemed = computed(() =>
        pointMoves.value
            .filter((row) => row.amt < 0)
            .reduce((sum, row) => sum - row.amt, 0),
    );

    const hasEarned = (code) => pointsLedgerOf(code).some((row) => row.amt > 0);

    const hasRedeemed = (code) =>
        pointsLedgerOf(code).some((row) => row.amt < 0);

    // ---- mutations ----------------------------------------------------------

    /**
     * One immutable log row. `act` must be an id from the closed LOG_ACTION_IDS
     * taxonomy — that is what keeps the log filterable in both languages.
     * `from`/`to` are either plain values (`valueType: 'plain'`) or `{ he, en }`
     * pairs authored with L() (`valueType: 'text'`).
     */
    function writeLog({
        act,
        entType,
        ent,
        valueType = 'plain',
        from = null,
        to = null,
    }) {
        if (!Array.isArray(dataset.data.log)) {
            return;
        }

        dataset.data.log.unshift({
            id: `lg-money-${++sequence}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            act,
            entType,
            ent,
            valueType,
            from,
            to,
            src: 'manual',
            // The console cannot know the address it is reached from; the
            // server fills this in on a real deployment.
            ip: null,
        });
    }

    /** Recompute every balance from the orders, after money moved. */
    function recomputeBalances() {
        practitioners.value.forEach((practitioner) => {
            const open = openCreditOrders(practitioner.code);
            const legacy = legacyDebt.value[practitioner.code];
            const oldest = open.length
                ? Math.max(...open.map((order) => order.daysAgo))
                : 0;

            practitioner.debt =
                open.reduce((sum, order) => sum + order.pricing.total, 0) +
                (legacy ? legacy.amt : 0);
            practitioner.debtDays = Math.max(
                oldest,
                legacy && legacy.amt > 0 ? legacy.days : 0,
            );
        });
    }

    /**
     * Issue the collection link for one practitioner's whole open balance. The
     * link is only ever produced here — sending it is manual, outside the
     * system — so this records that it exists and for how long.
     */
    function issueCollectionLink(code) {
        const practitioner = byCode(code);

        if (!practitioner) {
            return null;
        }

        const link = collectionLinkOf(code);

        if (link) {
            link.amt = practitioner.debt;
            link.n = openCreditOrders(code).length || 1;
            link.state = 'sent';
            link.sentAt = moment();
            link.expiresIn = CREDIT.linkDays;
            link.orders = openCreditOrders(code).map((order) => order.id);
        }

        const covered = openCreditOrders(code).length;

        writeLog({
            act: 'collection_link_issue',
            entType: 'practitioner',
            ent: practitioner.code,
            valueType: 'text',
            to: L(
                `לינק על ₪${num(practitioner.debt)} · ${covered} הזמנות`,
                `Link for ₪${num(practitioner.debt)} · ${covered} orders`,
            ),
        });
        persist(`finance/collection-links/${code}`, {
            amount: practitioner.debt,
            orders: openCreditOrders(code).map((order) => order.id),
        });

        return link;
    }

    /**
     * Record money that arrived outside the payment link — a transfer, cash at
     * the counter. All or nothing: the amount is the whole open balance, so no
     * caller can post a part of it.
     *
     * @returns {{ amount: number, orders: string[] } | null}
     */
    function recordManualPayment({ code, method, reason }) {
        const practitioner = byCode(code);

        if (!practitioner || practitioner.debt <= 0) {
            return null;
        }

        const amount = practitioner.debt;
        const open = openCreditOrders(code);
        const covered = open.map((order) => order.id);
        const when = moment();
        const id = ++sequence;

        open.forEach((order) => {
            order.creditPaid = true;
            order.docStatus = 'queued';
            order.docType = 'invrec_multi';
            order.flags = (order.flags || []).filter(
                (flag) => flag !== 'credit_debt',
            );
        });

        const legacy = legacyDebt.value[code];

        if (legacy) {
            legacy.amt = 0;
        }

        dataset.data.transactions?.unshift({
            id: `tx-p-manual-${code}-${id}`,
            code: String(code),
            kind: 'payment',
            when,
            amt: -amount,
            order: covered[0] ?? null,
            doc: null,
            method,
            note: L(
                'רישום תשלום ידני על כל היתרה הפתוחה',
                'Manual payment recorded against the whole open balance',
            ),
        });

        // One payment, one consolidated document — and no number until the
        // provider answers with one.
        dataset.data.documents?.unshift({
            id: `doc-manual-${code}-${id}`,
            num: null,
            alloc: null,
            type: 'invrec_multi',
            amt: amount,
            when,
            order: covered[0] ?? null,
            code: String(code),
            to: practitioner.name,
            toType: 'practitioner',
            status: 'queued',
            err: null,
        });

        recomputeBalances();
        writeLog({
            act: 'payment_record_manual',
            entType: 'practitioner',
            ent: String(code),
            valueType: 'text',
            from: L(`חוב פתוח ₪${num(amount)}`, `Open debt ₪${num(amount)}`),
            to: L(
                `שולם — ${covered.length} הזמנות נסגרו`,
                `Paid — ${covered.length} orders settled`,
            ),
        });
        persist('finance/payments', {
            code,
            method,
            reason,
            amount,
            orders: covered,
        });

        return { amount, orders: covered };
    }

    /**
     * Ask the provider for a document again. The failed attempt left no number
     * and no allocation number, and this does not invent them: the document
     * waits in `queued` until the provider answers.
     */
    function reissueDocument(id, reason) {
        const document = documents.value.find((row) => row.id === id);

        if (!document) {
            return null;
        }

        document.status = 'queued';
        document.err = null;

        const order = orders.value.find((row) => row.id === document.order);

        if (order) {
            order.docStatus = 'queued';
            order.flags = (order.flags || []).filter(
                (flag) => flag !== 'doc_failed',
            );
        }

        writeLog({
            act: 'doc_reissue',
            entType: 'document',
            ent: document.order || document.id,
            valueType: 'text',
            from: L('הפקה נכשלה', 'Issue failed'),
            to: L('נשלחה בקשה חדשה', 'New request sent'),
        });
        persist(`finance/documents/${document.id}/reissue`, { reason });

        return document;
    }

    /**
     * Approve or revoke credit terms on one practitioner's card. There is no
     * credit limit to set: the system warns past CREDIT.warnDebt or
     * CREDIT.warnDays and never blocks an order.
     */
    function setCreditTerms({ code, approved, reason }) {
        const practitioner = byCode(code);

        if (!practitioner) {
            return null;
        }

        practitioner.credit = approved;

        if (approved) {
            practitioner.creditSince = isoDaysAgo(0);
            practitioner.creditBy = dataset.me?.name || null;
            practitioner.creditRevoked = null;
        } else {
            practitioner.creditRevoked = isoDaysAgo(0);
        }

        const immediate = L('תשלום מיידי', 'Immediate payment');
        const onCredit = L('מאושר להקפה', 'On credit terms');

        writeLog({
            act: approved ? 'credit_terms_approve' : 'credit_terms_revoke',
            entType: 'practitioner',
            ent: practitioner.code,
            valueType: 'text',
            from: approved ? immediate : onCredit,
            to: approved ? onCredit : immediate,
        });
        persist(`finance/credit-terms/${code}`, { approved, reason });

        return practitioner;
    }

    /**
     * Move a points balance. The ledger is the only source of truth for a
     * balance, so the card moves only together with a row in it — which is what
     * keeps the integrity check able to reconcile.
     */
    function adjustPoints({ code, amount, reason }) {
        const practitioner = byCode(code);
        const delta = Math.trunc(Number(amount) || 0);

        if (!practitioner || delta === 0) {
            return null;
        }

        let ledger = pointsLedgers.value.find(
            (entry) => entry.code === String(code),
        );

        if (!ledger) {
            ledger = { code: String(code), rows: [] };
            dataset.data.pointsLedger?.push(ledger);
        }

        const balance = Math.max(0, practitioner.points + delta);

        ledger.rows.unshift({
            id: `pts-manual-${code}-${++sequence}`,
            kind: delta > 0 ? 'earn' : 'spend',
            amt: delta,
            bal: balance,
            order: null,
            when: moment(),
            manual: true,
            reason,
            by: dataset.me?.name || null,
        });

        writeLog({
            act: 'points_credit_manual',
            entType: 'practitioner',
            ent: practitioner.code,
            from: String(practitioner.points),
            to: String(balance),
        });
        practitioner.points = balance;
        persist(`wallet/points/${code}`, { amount: delta, reason });

        return { balance, delta };
    }

    /**
     * Reconcile every card against its ledger: the balance on the card must
     * equal the running balance of the newest movement. Nothing is corrected —
     * a correction is a manual adjustment with a written reason.
     *
     * @returns {{ checked: number, gaps: Array<object> }}
     */
    function checkLedgerIntegrity() {
        const gaps = [];

        practitioners.value.forEach((practitioner) => {
            const rows = pointsLedgerOf(practitioner.code);
            const ledgerBalance = rows.length ? rows[0].bal : 0;

            if (ledgerBalance !== practitioner.points) {
                gaps.push({
                    code: practitioner.code,
                    name: practitioner.name,
                    stated: practitioner.points,
                    ledger: ledgerBalance,
                });
            }
        });

        return { checked: practitioners.value.length, gaps };
    }

    return {
        practitioners,
        orders,
        documents,
        transactions,
        collectionLinks,
        legacyDebt,

        byCode,
        debtors,
        creditPractitioners,
        totalDebt,
        openCreditOrders,
        openCreditAll,
        openCreditStatuses,
        failedDocuments,
        documentStates,
        transactionKinds,
        collectedWithin,
        chargeTotal,
        paymentTotal,
        agingRows,
        statementOf,
        collectionLinkOf,

        pointsLedgerOf,
        totalPoints,
        pointsEarned,
        pointsRedeemed,
        hasEarned,
        hasRedeemed,

        issueCollectionLink,
        recordManualPayment,
        reissueDocument,
        setCreditTerms,
        adjustPoints,
        checkLedgerIntegrity,
        recomputeBalances,
    };
});
