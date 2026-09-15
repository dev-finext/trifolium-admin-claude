// Money. There is no external accounting system behind this console: every
// charge, payment, credit note, collection link and tax document is a row in
// our own database.
//
// Balances are DERIVED from the order set, never stated: a practitioner's debt
// always equals his open credit orders plus whatever predates them. That is the
// point of `applyBalances()` — one source of truth, recomputed at build time.
//
// The same rule holds for a tax document's body: `documentLines()` lists the
// order's real lines at the prices SAP charged, and the document's total is
// SAP's own. Where the two cannot be made to meet the builder says so on the
// row (`reconciled: false`) and lists one total line — it never invents a
// component price to force the sum.
import { ALLOCATION, ALLOCATION_DOC_TYPE_IDS, CREDIT } from '@/config';
import { at, pickFrom, spread } from '@/demo/fixture';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * Debt that predates the current order window. Kept so the fixture always
 * contains an aged case and a revoked-credit case, whatever the orders do.
 */
export const DEMO_LEGACY_DEBT = {
    11507: { amt: 1840, days: 38 },
    11601: { amt: 2340, days: 96 },
};

const PAYMENT_NOTES = {
    card: L('סליקת אשראי', 'Card capture'),
    cash: L('מזומן', 'Cash'),
    transfer: L('העברה בנקאית', 'Bank transfer'),
};

const PROVIDER_ERRORS = [
    '422 allocation service unavailable',
    '400 invalid customer tax id',
    '502 provider timeout',
];

/** The provider's reason on the two documents whose allocation was refused. */
const ALLOCATION_REFUSAL = '422 allocation refused — customer tax id mismatch';

/**
 * The sample PDF every issued fixture document opens. One generated Hebrew
 * invoice (public/demo/files) stands in for the provider's copy of each.
 */
export const DOC_SAMPLE_PDF = 'demo/files/invoice-sample.pdf';

/**
 * The monthly export to the accountant: everything issued before the first of
 * the current month has been sent, dated the morning it went. `DEMO_CLOCK` is
 * 05.08 — so July's documents are sent and August's are still pending.
 */
const ACCOUNTING_CUTOFF_DAYS_AGO = 4;

/** How many issued documents the fixture leaves with a refused allocation. */
const REFUSED_ALLOCATIONS = 2;

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Item codes that are a charge, not a thing — SAP bills delivery and the
 * compounding fee as ordinary order lines in the 999xxx block. Mirrors
 * demo/orders.js, which classifies the same lines on the way in.
 */
const FEE_CODE_PREFIX = '999';
const SHIPPING_WORD = 'משלוח';

const isFeeCode = (code) => String(code || '').startsWith(FEE_CODE_PREFIX);

/** A 999 line whose name says delivery is shipping; any other 999 line is a fee. */
const feeKind = (name) =>
    String(name?.he ?? name ?? '').includes(SHIPPING_WORD) ? 'shipping' : 'fee';

/** A practitioner's open credit orders, oldest debt last. */
export function openCreditOrders(code, orders) {
    return orders
        .filter(
            (order) =>
                order.practitioner.code === code &&
                order.credit &&
                !order.creditPaid,
        )
        .sort((a, b) => a.daysAgo - b.daysAgo);
}

/** What a practitioner owes: open credit orders plus any legacy balance. */
export function practitionerBalance(code, orders) {
    const open = openCreditOrders(code, orders).reduce(
        (sum, order) => sum + order.pricing.total,
        0,
    );
    const legacy = DEMO_LEGACY_DEBT[code];

    return open + (legacy ? legacy.amt : 0);
}

/** Age of the oldest slice of that debt, in days. */
export function practitionerDebtAge(code, orders) {
    const open = openCreditOrders(code, orders);
    const legacy = DEMO_LEGACY_DEBT[code];
    const oldest = open.length
        ? Math.max(...open.map((order) => order.daysAgo))
        : 0;

    return Math.max(oldest, legacy ? legacy.days : 0);
}

/**
 * Write the derived balance back onto each practitioner card, so every screen
 * reads the same number. Mutates the cards this build just created — nothing
 * outside the fixture is touched.
 */
export function applyBalances(practitioners, orders) {
    practitioners.forEach((practitioner) => {
        practitioner.debt = practitionerBalance(practitioner.code, orders);
        practitioner.debtDays = practitionerDebtAge(practitioner.code, orders);
    });

    return practitioners;
}

/** The account statement: one charge per order, one payment once it is paid. */
export function buildTransactions(practitioners, orders) {
    const rows = [];

    practitioners.forEach((practitioner) => {
        orders
            .filter(
                (order) =>
                    order.practitioner.code === practitioner.code &&
                    order.payer === 'practitioner' &&
                    order.status !== 'cancelled',
            )
            .forEach((order) => {
                rows.push({
                    id: `tx-c-${order.id}`,
                    code: practitioner.code,
                    kind: 'charge',
                    when: order.placed,
                    amt: order.pricing.total,
                    order: order.id,
                    doc: order.docNum,
                    method: null,
                    terminal: null,
                    note: order.credit
                        ? L(
                              'חיוב בהקפה — ההזמנה ירדה למעבדה ללא תשלום',
                              'Credit charge — the order reached the lab unpaid',
                          )
                        : L('חיוב הזמנה', 'Order charge'),
                });

                if (!order.credit || order.creditPaid) {
                    rows.push({
                        id: `tx-p-${order.id}`,
                        code: practitioner.code,
                        kind: 'payment',
                        when: order.placed,
                        amt: -order.pricing.total,
                        order: order.id,
                        doc: order.docNum,
                        method: order.credit ? null : order.payMethod,
                        terminal: order.terminal || null,
                        note: order.credit
                            ? L(
                                  'תשלום לינק גבייה מרוכז',
                                  'Consolidated collection-link payment',
                              )
                            : PAYMENT_NOTES[order.payMethod],
                    });
                }

                // The credit note buildDocuments() issued reverses the charge
                // — the same state the store's issueCreditNote() writes.
                if (order.docStatus === 'credited') {
                    rows.push({
                        id: `tx-cr-${order.id}`,
                        code: practitioner.code,
                        kind: 'credit',
                        when: at(Math.max(0, order.daysAgo - 2), 11, 40),
                        amt: -order.pricing.total,
                        order: order.id,
                        doc: order.docNum,
                        method: null,
                        terminal: null,
                        note: L(
                            'חשבונית זיכוי — המוצר הוחזר',
                            'Credit note — the product was returned',
                        ),
                    });
                }
            });
    });

    Object.entries(DEMO_LEGACY_DEBT).forEach(([code, legacy]) => {
        rows.push({
            id: `tx-c-legacy-${code}`,
            code,
            kind: 'charge',
            when: at(legacy.days),
            amt: legacy.amt,
            order: null,
            doc: null,
            method: null,
            terminal: null,
            note:
                code === '11601'
                    ? L(
                          'יתרת חוב פתוחה — מסלול הקפה שבוטל',
                          'Open balance — credit terms since revoked',
                      )
                    : L(
                          'יתרת חוב מהזמנות קודמות בהקפה',
                          'Balance carried over from earlier credit orders',
                      ),
        });
    });

    return rows.sort((a, b) =>
        `${b.when.iso}${b.id}`.localeCompare(`${a.when.iso}${a.id}`),
    );
}

/**
 * Collection links. One link per practitioner, always for the WHOLE open
 * balance: all or nothing, no partial payment, one consolidated document.
 */
export function buildCollectionLinks(practitioners, orders) {
    return practitioners
        .filter((practitioner) => practitioner.debt > 0)
        .map((practitioner, i) => {
            const open = openCreditOrders(practitioner.code, orders);
            const sent = i === 0;

            return {
                id: `cl${practitioner.code}`,
                code: practitioner.code,
                name: practitioner.name,
                amt: practitioner.debt,
                n: open.length || 1,
                url: `https://pay.trifolium.co.il/c/${practitioner.code}${(
                    practitioner.debt * 7
                )
                    .toString(36)
                    .slice(0, 5)}`,
                state: sent ? 'sent' : 'none',
                sentAt: sent ? at(3, 9, 40) : null,
                expiresIn: sent ? CREDIT.linkDays - 3 : null,
                views: sent ? 2 : 0,
                orders: open.map((order) => order.id),
            };
        });
}

/** States a collection link can be in. */
export const COLLECT_LINK_STATES = {
    none: { tone: 'gray' },
    sent: { tone: 'blue' },
    paid: { tone: 'green' },
    expired: { tone: 'red' },
};

export const COLLECT_LINK_STATE_IDS = Object.keys(COLLECT_LINK_STATES);

// ---- the document body -------------------------------------------------------

/** One document line. `label` is an L pair; `total` is what the line came to. */
function docLine(kind, code, label, qty, uom, unitPrice, total) {
    return { kind, code, label, qty, uom, unitPrice, total };
}

/**
 * The body of a tax document, from the order's real lines: one line per
 * formula component at its own price, then the shelf products, then the
 * charges, then the discount and the points as negative lines. `subtotal` is
 * the sum of the positive lines, and the row is `reconciled` when
 *
 *     subtotal − discount − points + vat = total      (to the agora)
 *
 * SAP writes each line's price to two decimals and the header total exactly, so
 * on a few documents the lines fall short of the total by a handful of agorot
 * and no discount can be read off them (it would be negative). Those documents
 * are NOT forced: they carry one total line for the net and `reconciled: false`,
 * so the preview says "one line" rather than showing a price nobody charged.
 * The probe counts them — three in the SAP sample, all under ₪0.40 apart.
 *
 * Used by the fixture and by the money store, so a document the console issues
 * later reads exactly like one the fixture authored.
 *
 * @returns {{ lines: Array<object>, subtotal: number, discount: number,
 *             points: number, vat: number, total: number, reconciled: boolean }}
 */
export function documentLines(order) {
    const pricing = order?.pricing || {};
    const items = [];
    let priced = true;

    const push = (kind, code, label, qty, uom, unitPrice, lineTotal) => {
        const price = unitPrice ?? null;
        const total =
            lineTotal ?? (price === null ? null : round2((qty || 0) * price));

        if (total === null) {
            priced = false;
        }

        items.push(docLine(kind, code, label, qty, uom, price, total));
    };

    [order?.formula, order?.formula2].filter(Boolean).forEach((formula) => {
        (formula.herbs || []).forEach((herb) =>
            push(
                'component',
                herb.id,
                herb.name,
                herb.qty,
                herb.unit,
                herb.price,
                herb.lineTotal,
            ),
        );
        (formula.materials || []).forEach((material) =>
            push(
                'component',
                material.id,
                material.name,
                material.qty,
                material.unit,
                material.price,
                material.lineTotal,
            ),
        );
    });

    (order?.shelfLines || []).forEach((line) =>
        push(
            isFeeCode(line.sku) ? feeKind(line.name) : 'shelf',
            line.sku,
            line.name,
            line.qty,
            line.unit,
            line.price,
            line.lineTotal,
        ),
    );

    (order?.feeLines || []).forEach((line) =>
        push(
            feeKind(line.name),
            line.code,
            line.name,
            line.qty,
            'unit',
            line.price,
            line.lineTotal,
        ),
    );

    const subtotal = round2(
        items.reduce((sum, line) => sum + (line.total || 0), 0),
    );
    const discount = round2(
        (pricing.baseDisc || 0) +
            (pricing.shelfDisc || 0) +
            (pricing.patientDisc || 0),
    );
    const points = round2(pricing.pointsUsed || 0);
    const vat = round2(pricing.vat || 0);
    const total = round2(pricing.total || 0);
    const reconciled =
        priced &&
        items.length > 0 &&
        Math.abs(round2(subtotal - discount - points + vat) - total) < 0.011;

    if (!reconciled) {
        const net = round2(total - vat);

        return {
            lines: [
                docLine(
                    order?.type === 'formula' ? 'component' : 'shelf',
                    null,
                    order?.formula?.name || L('סה״כ הזמנה', 'Order total'),
                    1,
                    'unit',
                    net,
                    net,
                ),
            ],
            subtotal: net,
            discount: 0,
            points: 0,
            vat,
            total,
            reconciled: false,
        };
    }

    const lines = [...items];

    if (discount > 0) {
        lines.push(
            docLine(
                'discount',
                null,
                L('הנחה', 'Discount'),
                1,
                'unit',
                -discount,
                -discount,
            ),
        );
    }

    if (points > 0) {
        lines.push(
            docLine(
                'points',
                null,
                L('מימוש נקודות', 'Points redeemed'),
                1,
                'unit',
                -points,
                -points,
            ),
        );
    }

    return { lines, subtotal, discount, points, vat, total, reconciled: true };
}

/**
 * Where the allocation request stands. The provider asks for a number on every
 * invoice-type document; `required` says whether the tax authority insists on
 * one at this total (config/finance.js ALLOCATION).
 */
export function allocationOf(type, total, num, refused = false) {
    const applies = ALLOCATION_DOC_TYPE_IDS.includes(type);
    const required = applies && total >= ALLOCATION.thresholdIls;

    if (!applies) {
        return { required: false, num: null, state: 'not_required' };
    }

    if (refused) {
        return { required, num: null, state: 'refused' };
    }

    if (num) {
        return { required, num, state: 'granted' };
    }

    return {
        required,
        num: null,
        state: required ? 'pending' : 'not_required',
    };
}

/** A document is sendable once it is issued and nothing is refused on it. */
export const documentSendable = (status, allocation) =>
    status === 'issued' && allocation.state !== 'refused';

/** Whether the monthly export to the accountant has already carried a document. */
function accountingOf(when) {
    const sent = when.daysAgo > ACCOUNTING_CUTOFF_DAYS_AGO;

    return {
        sent,
        when: sent ? at(ACCOUNTING_CUTOFF_DAYS_AGO, 9, 30) : null,
    };
}

/**
 * The two documents the fixture issues with no order behind them: a counter
 * sale rung straight through the terminal, and a workshop billed to a clinic.
 * Neither is in the order book, which is exactly what the reconciliation tab
 * exists to show — and the workshop is the one document over the allocation
 * threshold, so the "required" reading is on screen.
 */
function standaloneDocuments(orders) {
    const clinic = orders.find(
        (order) => order.practitioner.code === '11640',
    )?.practitioner;
    const workshopNet = 10508.47;
    const workshopVat = 1891.53;
    const workshopTotal = 12400;
    const teaUnit = 44.07;
    const teaTotal = 104;
    const teaVat = round2(teaTotal - teaTotal / 1.18);
    const teaNet = round2(teaTotal - teaVat);

    return [
        {
            id: 'doc-std-1',
            num: String(spread('doc:std:1', 20250, 20999)),
            type: 'inv',
            when: at(9, 11, 15),
            order: null,
            orders: [],
            code: clinic ? '11640' : null,
            to: clinic ? clinic.name : L('קליניקת שורשים', 'Shorashim Clinic'),
            toType: 'practitioner',
            status: 'issued',
            err: null,
            lines: [
                docLine(
                    'fee',
                    null,
                    L(
                        'סדנת רקיחה לצוות הקליניקה — 2 מפגשים',
                        'Compounding workshop for the clinic team — 2 sessions',
                    ),
                    1,
                    'unit',
                    workshopNet,
                    workshopNet,
                ),
            ],
            subtotal: workshopNet,
            discount: 0,
            points: 0,
            vat: workshopVat,
            total: workshopTotal,
            reconciled: true,
            terminal: 'practitioner_site',
            // No order behind it: a workshop is not something the order book
            // holds, so the reconciliation tab lists it as a document without
            // an order — with the reason on the row.
            note: L(
                'סדנה — אין הזמנה במערכת',
                'Workshop — no order in the system',
            ),
        },
        {
            id: 'doc-std-2',
            num: String(spread('doc:std:2', 20250, 20999)),
            type: 'invrec',
            when: at(2, 16, 42),
            order: null,
            orders: [],
            code: null,
            to: L('לקוח מזדמן — דלפק', 'Walk-in customer — counter'),
            toType: 'patient',
            status: 'issued',
            err: null,
            lines: [
                docLine(
                    'shelf',
                    '500135',
                    L('תה צמחים — תערובת שינה', 'Herbal tea — sleep blend'),
                    2,
                    'unit',
                    teaUnit,
                    teaNet,
                ),
            ],
            subtotal: teaNet,
            discount: 0,
            points: 0,
            vat: teaVat,
            total: teaTotal,
            reconciled: true,
            terminal: 'physical',
            note: L(
                'מכירת דלפק במסוף הפיזי — ללא הזמנת אתר',
                'Counter sale on the physical terminal — no web order',
            ),
        },
    ].map((doc) => {
        const allocation = allocationOf(
            doc.type,
            doc.total,
            String(spread(`${doc.id}:alloc`, 10000000, 99999999)),
        );

        return {
            ...doc,
            alloc: allocation.num,
            amt: doc.total,
            allocation,
            sendable: documentSendable(doc.status, allocation),
            pdf: DOC_SAMPLE_PDF,
            accounting: accountingOf(doc.when),
            parent: null,
        };
    });
}

/**
 * Tax documents issued by the cloud provider — plus the ones that failed, the
 * ones whose allocation number was refused, the receipt that follows an invoice
 * paid by transfer, one credit note, and two documents with no order behind
 * them.
 *
 * Mutates three things on the orders it reads, all fixture-internal and all
 * the same state the store writes on the live path: the two refused orders
 * lose their `docAlloc` and gain the `alloc_refused` flag; the transfer-paid
 * orders' `docType` becomes `inv`; the credited order's `docStatus` becomes
 * `credited`.
 */
export function buildDocuments(orders) {
    const rows = [];
    const documented = orders.filter(
        (order) => order.docNum !== null || order.docStatus === 'failed',
    );

    // Whoever pays by bank transfer gets an invoice when the order is billed
    // and a receipt when the money lands — two documents, not one.
    const byTransfer = new Set(
        documented
            .filter(
                (order) =>
                    order.docStatus === 'issued' &&
                    order.payMethod === 'transfer' &&
                    !order.credit,
            )
            .map((order) => order.id),
    );

    // The allocation endpoint is down (demo/services.js): the two largest
    // invoices issued since then came back without a number.
    const refused = new Set(
        documented
            .filter(
                (order) =>
                    order.docStatus === 'issued' &&
                    !order.credit &&
                    !byTransfer.has(order.id),
            )
            .sort((a, b) => b.pricing.total - a.pricing.total)
            .slice(0, REFUSED_ALLOCATIONS)
            .map((order) => order.id),
    );

    // One closed, paid order whose product came back: the smallest one, so the
    // credit note is unmistakably a return and not a dispute.
    const credited = documented
        .filter(
            (order) =>
                order.docStatus === 'issued' &&
                order.status === 'closed' &&
                order.payer === 'practitioner' &&
                !order.credit &&
                order.pricing.total > 0 &&
                !byTransfer.has(order.id) &&
                !refused.has(order.id),
        )
        .sort((a, b) => a.pricing.total - b.pricing.total)[0];

    documented.forEach((order) => {
        const isRefused = refused.has(order.id);
        const isCredited = credited?.id === order.id;
        const type = order.credit
            ? 'invrec_multi'
            : byTransfer.has(order.id)
              ? 'inv'
              : order.docType || 'invrec';
        const body = documentLines(order);
        const failed = order.docStatus === 'failed';

        if (isRefused) {
            order.docAlloc = null;
            order.flags = [...(order.flags || []), 'alloc_refused'];
        }

        if (byTransfer.has(order.id)) {
            order.docType = 'inv';
        }

        if (isCredited) {
            order.docStatus = 'credited';
        }

        const allocation = allocationOf(
            type,
            body.total,
            order.docAlloc,
            isRefused,
        );
        const status = order.docStatus;

        rows.push({
            id: `doc${order.id}`,
            num: order.docNum,
            alloc: allocation.num,
            type,
            amt: body.total,
            when: order.placed,
            order: order.id,
            orders: [order.id],
            code: order.practitioner.code,
            to:
                order.payer === 'patient'
                    ? order.patient.name
                    : order.practitioner.name,
            toType: order.payer === 'patient' ? 'patient' : 'practitioner',
            status,
            err: failed
                ? `${order.docReq} · ${pickFrom(`${order.id}:docerr`, PROVIDER_ERRORS)}`
                : isRefused
                  ? ALLOCATION_REFUSAL
                  : null,
            ...body,
            allocation,
            sendable: documentSendable(status, allocation),
            pdf: failed ? null : DOC_SAMPLE_PDF,
            terminal: order.terminal || null,
            accounting: failed
                ? { sent: false, when: null }
                : accountingOf(order.placed),
            parent: null,
            note: null,
        });

        if (byTransfer.has(order.id)) {
            const when = at(Math.max(0, order.daysAgo - 3), 10, 5);
            const receiptAllocation = allocationOf('receipt', body.total, null);

            rows.push({
                id: `doc${order.id}-R`,
                num: String(spread(`${order.id}:rcpt`, 30250, 30999)),
                alloc: null,
                type: 'receipt',
                amt: body.total,
                when,
                order: order.id,
                orders: [order.id],
                code: order.practitioner.code,
                to:
                    order.payer === 'patient'
                        ? order.patient.name
                        : order.practitioner.name,
                toType: order.payer === 'patient' ? 'patient' : 'practitioner',
                status: 'issued',
                err: null,
                lines: [
                    docLine(
                        'fee',
                        null,
                        L(
                            `תשלום בהעברה בנקאית על חשבונית ${order.docNum}`,
                            `Bank transfer against invoice ${order.docNum}`,
                        ),
                        1,
                        'unit',
                        body.total,
                        body.total,
                    ),
                ],
                subtotal: body.total,
                discount: 0,
                points: 0,
                vat: 0,
                total: body.total,
                reconciled: true,
                allocation: receiptAllocation,
                sendable: true,
                pdf: DOC_SAMPLE_PDF,
                terminal: order.terminal || null,
                accounting: accountingOf(when),
                parent: `doc${order.id}`,
                note: null,
            });
        }

        if (isCredited) {
            const when = at(Math.max(0, order.daysAgo - 2), 11, 40);
            const creditAllocation = allocationOf('credit', body.total, null);

            rows.push({
                id: `doc${order.id}-C`,
                num: String(spread(`${order.id}:credit`, 40250, 40999)),
                alloc: null,
                type: 'credit',
                amt: body.total,
                when,
                order: order.id,
                orders: [order.id],
                code: order.practitioner.code,
                to: order.practitioner.name,
                toType: 'practitioner',
                status: 'issued',
                err: null,
                ...body,
                allocation: creditAllocation,
                sendable: true,
                pdf: DOC_SAMPLE_PDF,
                terminal: order.terminal || null,
                accounting: accountingOf(when),
                parent: `doc${order.id}`,
                note: L(
                    'המוצר הוחזר — זיכוי מלא',
                    'The product was returned — full credit',
                ),
            });
        }
    });

    rows.push(...standaloneDocuments(orders));

    return rows.sort((a, b) =>
        `${b.when.iso}${b.num ?? ''}`.localeCompare(
            `${a.when.iso}${a.num ?? ''}`,
        ),
    );
}

/** The ISO date a legacy balance started accruing. */
export function legacyDebtSince(code) {
    const legacy = DEMO_LEGACY_DEBT[code];

    return legacy ? isoDaysAgo(legacy.days) : null;
}
