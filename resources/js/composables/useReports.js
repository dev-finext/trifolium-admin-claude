// The reports: each one a pure function of the loaded data and a date range,
// returning KPI tiles and one or more tables with typed columns. The screen
// renders them, the CSV export writes the raw values, the print run lays the
// same tables on paper.
import { useI18n } from 'vue-i18n';

import { useLocalized } from '@/composables/useLocalized';
import {
    AGING_BUCKETS,
    agingBucket,
    LOW_COVERAGE_MONTHS,
    REPORTS,
} from '@/config';
import { downloadCsv } from '@/lib/csv';
import { inRange } from '@/lib/dateRange';
import { fmtISO } from '@/lib/dates';
import { ils, num, pct } from '@/lib/money';
import { esc, printHtml } from '@/lib/print';
import { useCrmStore } from '@/stores/crm';
import { useItemsStore } from '@/stores/items';
import { useMoneyStore } from '@/stores/money';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';
import { usePeopleStore } from '@/stores/people';
import { usePurchasingStore } from '@/stores/purchasing';

const share = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const col = (k, label, fmt = 'text') => ({ k, label, fmt });

export function useReports() {
    const { t } = useI18n();
    const { loc } = useLocalized();
    const orders = useOrdersStore();
    const people = usePeopleStore();
    const money = useMoneyStore();
    const purchasing = usePurchasingStore();
    const items = useItemsStore();
    const crm = useCrmStore();

    const c = (k, fmt) => col(k, t(`reports.col.${k}`), fmt);
    const kpi = (id, value) => ({ id, label: t(`reports.kpi.${id}`), value });

    const ordersIn = (range) =>
        orders.all.filter((order) => inRange(order.iso, range));
    const isLive = (order) => statusOf(order) !== 'cancelled';
    const revenueOf = (list) =>
        list
            .filter(isLive)
            .reduce((sum, order) => sum + order.pricing.total, 0);

    const builders = {
        orders_status(range) {
            const list = ordersIn(range);
            const groups = new Map();

            list.forEach((order) => {
                const status = statusOf(order);
                const row = groups.get(status) || { status, n: 0, revenue: 0 };

                row.n += 1;
                row.revenue += order.pricing.total;
                groups.set(status, row);
            });

            const rows = [...groups.values()]
                .sort((a, b) => b.n - a.n)
                .map((row) => ({
                    ...row,
                    statusLabel: t(`status.${row.status}`),
                    share: share(row.n, list.length),
                }));

            return {
                kpis: [
                    kpi('orders', num(list.length)),
                    kpi('revenue', ils(revenueOf(list), 0)),
                    kpi(
                        'cancelled',
                        num(list.filter((order) => !isLive(order)).length),
                    ),
                ],
                tables: [
                    {
                        id: 'status',
                        cols: [
                            c('statusLabel'),
                            c('n', 'num'),
                            c('revenue', 'money'),
                            c('share', 'pct'),
                        ],
                        rows,
                    },
                ],
            };
        },

        orders_city(range) {
            const list = ordersIn(range).filter(isLive);
            const groups = new Map();

            list.forEach((order) => {
                const city =
                    loc(order.address?.city) || loc(order.patient?.city) || '—';
                const row = groups.get(city) || {
                    city,
                    n: 0,
                    revenue: 0,
                    deliveries: 0,
                    pickups: 0,
                };

                row.n += 1;
                row.revenue += order.pricing.total;

                if (order.deliveryType === 'pickup') {
                    row.pickups += 1;
                } else {
                    row.deliveries += 1;
                }

                groups.set(city, row);
            });

            const rows = [...groups.values()]
                .sort((a, b) => b.n - a.n)
                .map((row) => ({ ...row, share: share(row.n, list.length) }));

            return {
                kpis: [
                    kpi('orders', num(list.length)),
                    kpi('cities', num(rows.length)),
                    kpi('topCity', rows[0]?.city || '—'),
                ],
                tables: [
                    {
                        id: 'city',
                        cols: [
                            c('city'),
                            c('n', 'num'),
                            c('deliveries', 'num'),
                            c('pickups', 'num'),
                            c('revenue', 'money'),
                            c('share', 'pct'),
                        ],
                        rows,
                    },
                ],
            };
        },

        orders_prep_type(range) {
            const list = ordersIn(range).filter(isLive);
            const groups = new Map();
            let lines = 0;

            list.forEach((order) => {
                trackedItems(order)
                    .filter((item) => item.stage !== 'cancelled')
                    .forEach((item) => {
                        const type = items.prepTypeById(item.typeId);
                        const key = item.typeId;
                        const row = groups.get(key) || {
                            typeId: key,
                            prepType: type
                                ? loc(type.name)
                                : t(`preparationForm.${key}`),
                            lines: 0,
                            orders: new Set(),
                            volume: 0,
                            unit: item.unit,
                        };

                        row.lines += 1;
                        row.orders.add(order.id);
                        row.volume += Number(item.vol) || 0;
                        groups.set(key, row);
                        lines += 1;
                    });
            });

            const rows = [...groups.values()]
                .sort((a, b) => b.lines - a.lines)
                .map((row) => ({
                    ...row,
                    orders: row.orders.size,
                    volume: `${num(row.volume)} ${t(`orders.unit.${row.unit}`)}`,
                    share: share(row.lines, lines),
                }));

            return {
                kpis: [
                    kpi('lines', num(lines)),
                    kpi('types', num(rows.length)),
                    kpi('topType', rows[0]?.prepType || '—'),
                ],
                tables: [
                    {
                        id: 'prep',
                        cols: [
                            c('prepType'),
                            c('lines', 'num'),
                            c('orders', 'num'),
                            c('volume'),
                            c('share', 'pct'),
                        ],
                        rows,
                    },
                ],
            };
        },

        cancel_causes(range) {
            const list = ordersIn(range).filter((order) => !isLive(order));
            const groups = new Map();

            list.forEach((order) => {
                const key = order.cancelCause || 'none';
                const row = groups.get(key) || {
                    cause:
                        key === 'none'
                            ? t('reports.value.noCause')
                            : t(`orders.cancelCause.${key}`),
                    n: 0,
                    revenue: 0,
                };

                row.n += 1;
                row.revenue += order.pricing.total;
                groups.set(key, row);
            });

            const rows = [...groups.values()]
                .sort((a, b) => b.n - a.n)
                .map((row) => ({ ...row, share: share(row.n, list.length) }));
            const activities = crm.activities.filter(
                (row) =>
                    row.subject === 'cancellation' &&
                    inRange(row.when.iso, range),
            ).length;

            return {
                kpis: [
                    kpi('cancelled', num(list.length)),
                    kpi('topCause', rows[0]?.cause || '—'),
                    kpi('activities', num(activities)),
                ],
                tables: [
                    {
                        id: 'causes',
                        cols: [
                            c('cause'),
                            c('n', 'num'),
                            c('revenue', 'money'),
                            c('share', 'pct'),
                        ],
                        rows,
                    },
                ],
            };
        },

        practitioners(range) {
            const list = ordersIn(range).filter(isLive);
            const rows = people.practitioners
                .map((practitioner) => {
                    const mine = list.filter(
                        (order) =>
                            order.practitioner.code === practitioner.code,
                    );
                    const revenue = revenueOf(mine);
                    const last = orders.all
                        .filter(
                            (order) =>
                                order.practitioner.code === practitioner.code,
                        )
                        .map((order) => order.iso)
                        .sort()
                        .pop();

                    return {
                        code: practitioner.code,
                        name: loc(practitioner.name),
                        therapy: t(`therapy.${practitioner.therapy}`),
                        orders: mine.length,
                        revenue,
                        avg: mine.length
                            ? Math.round(revenue / mine.length)
                            : 0,
                        points: practitioner.points || 0,
                        debt: practitioner.debt || 0,
                        lastOrder: last ? fmtISO(last) : '—',
                    };
                })
                .sort((a, b) => b.revenue - a.revenue);
            const active = rows.filter((row) => row.orders > 0);
            const revenue = revenueOf(list);

            return {
                kpis: [
                    kpi(
                        'active',
                        `${num(active.length)} / ${num(rows.length)}`,
                    ),
                    kpi('revenue', ils(revenue, 0)),
                    kpi(
                        'avgPractitioner',
                        ils(active.length ? revenue / active.length : 0, 0),
                    ),
                ],
                tables: [
                    {
                        id: 'practitioners',
                        cols: [
                            c('code'),
                            c('name'),
                            c('therapy'),
                            c('orders', 'num'),
                            c('revenue', 'money'),
                            c('avg', 'money'),
                            c('points', 'num'),
                            c('debt', 'money'),
                            c('lastOrder'),
                        ],
                        rows,
                    },
                ],
            };
        },

        students() {
            const rows = people.pendingUsers
                .filter((user) => user.role === 'student')
                .map((user) => ({
                    name: `${loc(user.first)} ${loc(user.last)}`,
                    tz: user.tz,
                    email: user.email,
                    phone: user.phone,
                    submitted: user.submitted?.stamp || '—',
                    gradYear: user.gradYear || '—',
                    cert: user.cert
                        ? t('reports.value.certYes')
                        : t('reports.value.certNo'),
                    doc:
                        user.docOk === true
                            ? t('reports.value.docOk')
                            : user.docOk === false
                              ? t('reports.value.docBad')
                              : t('reports.value.docPending'),
                    docState: user.docOk,
                }));

            return {
                kpis: [
                    kpi('waiting', num(rows.length)),
                    kpi(
                        'docOk',
                        num(rows.filter((row) => row.docState === true).length),
                    ),
                    kpi(
                        'docMissing',
                        num(rows.filter((row) => row.docState !== true).length),
                    ),
                ],
                tables: [
                    {
                        id: 'students',
                        cols: [
                            c('name'),
                            c('tz'),
                            c('email'),
                            c('phone'),
                            c('submitted'),
                            c('gradYear'),
                            c('cert'),
                            c('doc'),
                        ],
                        rows,
                    },
                ],
            };
        },

        aging() {
            const bucketLabel = (bucket) =>
                bucket.to === Infinity
                    ? t('reports.value.bucketOpen', { from: bucket.from })
                    : t('reports.value.bucket', {
                          from: bucket.from,
                          to: bucket.to,
                      });
            const buckets = money.agingRows.map((row) => ({
                bucket: bucketLabel(row),
                n: row.n,
                amt: row.amt,
                share: row.share,
            }));
            const debtors = money.debtors.map((practitioner) => ({
                code: practitioner.code,
                name: loc(practitioner.name),
                debt: practitioner.debt,
                days: practitioner.debtDays,
                bucket: bucketLabel(
                    AGING_BUCKETS.find(
                        (bucket) =>
                            bucket.id === agingBucket(practitioner.debtDays).id,
                    ),
                ),
            }));
            const over90 = debtors
                .filter((row) => row.days > 90)
                .reduce((sum, row) => sum + row.debt, 0);

            return {
                kpis: [
                    kpi('totalDebt', ils(money.totalDebt, 0)),
                    kpi('debtors', num(debtors.length)),
                    kpi('over90', ils(over90, 0)),
                ],
                tables: [
                    {
                        id: 'buckets',
                        title: t('reports.table.buckets'),
                        cols: [
                            c('bucket'),
                            c('n', 'num'),
                            c('amt', 'money'),
                            c('share', 'pct'),
                        ],
                        rows: buckets,
                    },
                    {
                        id: 'debtors',
                        title: t('reports.table.debtors'),
                        cols: [
                            c('code'),
                            c('name'),
                            c('debt', 'money'),
                            c('days', 'num'),
                            c('bucket'),
                        ],
                        rows: debtors,
                    },
                ],
            };
        },

        consumption(range) {
            const result = purchasing.consumption(range);
            const rows = result.rows
                .map((row) => {
                    const total = row.production + row.sales;
                    const monthly = total / result.months;
                    const avail = row.avail ?? null;
                    const coverage =
                        avail === null || !monthly ? null : avail / monthly;

                    return {
                        sku: row.sku,
                        item: loc(row.name),
                        production: row.production,
                        sales: row.sales,
                        total,
                        monthly: Math.round(monthly),
                        avail: avail === null ? '—' : num(avail),
                        coverage:
                            coverage === null
                                ? '—'
                                : t('reports.value.months', {
                                      n: num(coverage, 1),
                                  }),
                        low:
                            coverage !== null && coverage < LOW_COVERAGE_MONTHS,
                    };
                })
                .sort((a, b) => b.total - a.total);

            return {
                kpis: [
                    kpi('skus', num(rows.length)),
                    kpi(
                        'monthlyTotal',
                        num(rows.reduce((sum, row) => sum + row.monthly, 0)),
                    ),
                    kpi(
                        'lowCoverage',
                        num(rows.filter((row) => row.low).length),
                    ),
                ],
                tables: [
                    {
                        id: 'consumption',
                        cols: [
                            c('sku'),
                            c('item'),
                            c('production', 'num'),
                            c('sales', 'num'),
                            c('total', 'num'),
                            c('monthly', 'num'),
                            c('avail'),
                            c('coverage'),
                        ],
                        rows,
                    },
                ],
            };
        },
    };

    /** Build one report for a range. Unknown ids yield an empty report. */
    function build(id, range) {
        const builder = builders[id];

        return builder ? builder(range) : { kpis: [], tables: [] };
    }

    /** A cell for the screen and the printout: money, counts and shares formatted. */
    function format(column, value) {
        if (value === null || value === undefined || value === '') {
            return '—';
        }

        if (column.fmt === 'money') {
            return ils(value, 0);
        }

        if (column.fmt === 'num') {
            return num(value);
        }

        if (column.fmt === 'pct') {
            return pct(value);
        }

        return String(value);
    }

    /** Hand one table to the reader as CSV — raw values, translated header. */
    function exportTable(reportId, table) {
        const header = table.cols.map((column) => column.label);
        const rows = table.rows.map((row) =>
            table.cols.map((column) => row[column.k] ?? ''),
        );

        return downloadCsv(`${reportId}-${table.id}.csv`, header, rows);
    }

    /** The whole report on paper: title, parameters, tiles, every table. */
    function printReport(reportId, result, paramsText) {
        const tables = result.tables
            .map((table) => {
                const head = table.cols
                    .map((column) => `<th>${esc(column.label)}</th>`)
                    .join('');
                const body = table.rows
                    .map(
                        (row) =>
                            `<tr>${table.cols
                                .map(
                                    (column) =>
                                        `<td class="${column.fmt === 'text' ? '' : 'num'}">${esc(format(column, row[column.k]))}</td>`,
                                )
                                .join('')}</tr>`,
                    )
                    .join('');

                return `${table.title ? `<h2>${esc(table.title)}</h2>` : ''}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
            })
            .join('');
        const tiles = result.kpis
            .map(
                (tile) =>
                    `<div class="box"><div class="small">${esc(tile.label)}</div><div class="num" style="font-size:18px;font-weight:700">${esc(tile.value)}</div></div>`,
            )
            .join('');
        const body = `<h1>${esc(t(`reports.report.${reportId}.title`))}</h1><div class="meta">${esc(paramsText)}</div><div class="grid" style="grid-template-columns:repeat(3,1fr)">${tiles}</div>${tables}`;

        return printHtml(t(`reports.report.${reportId}.title`), body, 'rtl');
    }

    return { REPORTS, build, format, exportTable, printReport };
}
