// Money. There is no external accounting system behind this console: every
// charge, payment, credit note, collection link and tax document is a row in
// our own database.
//
// Balances are DERIVED from the order set, never stated: a practitioner's debt
// always equals his open credit orders plus whatever predates them. That is the
// point of `applyBalances()` — one source of truth, recomputed at build time.
import { CREDIT } from '@/config';
import { at, pickFrom } from '@/demo/fixture';
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
                        note: order.credit
                            ? L(
                                  'תשלום לינק גבייה מרוכז',
                                  'Consolidated collection-link payment',
                              )
                            : PAYMENT_NOTES[order.payMethod],
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

/** Tax documents issued by the cloud provider — plus the ones that failed. */
export function buildDocuments(orders) {
    const rows = [];

    orders.forEach((order) => {
        if (order.docNum === null && order.docStatus !== 'failed') {
            return;
        }

        rows.push({
            id: `doc${order.id}`,
            num: order.docNum,
            alloc: order.docAlloc,
            type: order.credit ? 'invrec_multi' : 'invrec',
            amt: order.pricing.total,
            when: order.placed,
            order: order.id,
            code: order.practitioner.code,
            to:
                order.payer === 'patient'
                    ? order.patient.name
                    : order.practitioner.name,
            toType: order.payer === 'patient' ? 'patient' : 'practitioner',
            status: order.docStatus,
            err:
                order.docStatus === 'failed'
                    ? `${order.docReq} · ${pickFrom(`${order.id}:docerr`, PROVIDER_ERRORS)}`
                    : null,
        });
    });

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
