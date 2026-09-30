// V3 — דוח ירון: ניתוח מלאי.
//
// This is not a report the console designed. It is a report the pharmacy
// already has, saved in SAP as `מלאי → דוח ירון ניתוח מלאי - ללא בחירת קבוצה -
// ללא ספירת מלאי`, which ירון exports to Excel and analyses in a workbook of
// his own. What happens inside that workbook is his way of buying, and the
// instruction is explicit: do not go near it. The console's job is the one
// thing the workbook depends on — that the report keeps coming out the same.
//
// So the columns, their names, their order, their types and the sort are copied
// from the SAP query rather than chosen. The query was read out of the restored
// database (`extracts/queries/0654__…`) and its numbers were reproduced against
// the file ירון sent: item 300010 for 2025-08 comes to 133,300 from the
// movement table alone and 138,700 once production is added back, which is what
// his file shows, month for month.
//
// How that query defines consumption:
//
//   from OINM       everything except TransType 10000071 (stock count), 19, 21
//                   and 60 (goods issue)
//   plus OIGE/IGE1  the goods issues whose base document is a production order
//                   (BaseType 202) — what the lab actually consumed
//
// Three of its behaviours are reproduced deliberately, because reproducing the
// report means reproducing them:
//
//   * An item with no movement in the period is absent. The query inner-joins
//     to the movement table, so an item sitting on the shelf untouched is not a
//     row with zeros — it is not a row at all.
//   * OnHand, OnOrder and IsCommited are read now, not then. They come off the
//     item master at the moment the report runs, so a report for last year
//     shows this morning's stock beside last year's consumption.
//   * A code that is all digits is written as a number, not as text. SAP's own
//     export does this — all 2,414 item codes in his file come back as numbers
//     — and a lookup against a text "300010" would not match it.
//
// One thing is not reproduced: an item the console has archived does not
// appear. Archiving is the console's own idea and SAP has no equivalent, but a
// row the pharmacy deliberately removed has no business coming back through a
// report.

/** The columns before the months, exactly as the query names them. */
export const STOCK_ANALYSIS_HEAD = [
    'ItemCode',
    'ItemName',
    'FrgnName',
    'GroupName',
    'OnHand',
    'OnOrder',
    'IsCommited',
];

/** And the one after them. */
export const STOCK_ANALYSIS_TOTAL = 'TotalOutQty';

/** The sheet SAP's own export puts it on. */
export const STOCK_ANALYSIS_SHEET = 'גיליון1';

/** 'YYYY-MM' of an ISO date. */
export const monthOf = (iso) => String(iso || '').slice(0, 7);

/**
 * Every month from one to the other, inclusive.
 *
 * The SAP query builds its columns from the months that happen to hold data, so
 * a quiet month silently drops its column and shifts everything after it. The
 * console emits the whole range instead — a decision recorded on 30.9.2026,
 * because ירון's workbook reads fixed columns and a column that comes and goes
 * is the one difference that would break it.
 */
export function monthsInRange(from, to) {
    const start = monthOf(from);
    const end = monthOf(to);

    if (!start || !end || start > end) {
        return [];
    }

    const out = [];
    let year = Number(start.slice(0, 4));
    let month = Number(start.slice(5, 7));

    for (let guard = 0; guard < 600; guard += 1) {
        const ym = `${year}-${String(month).padStart(2, '0')}`;

        out.push(ym);

        if (ym >= end) {
            break;
        }

        month += 1;

        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return out;
}

/**
 * A quantity as SAP's export writes it: at most three decimals.
 *
 * Not a display choice — the file itself carries the rounded value, never more
 * than three places anywhere in the 21,305 numbers of ירון's own export. The
 * total is rounded after being summed rather than summed from rounded months,
 * which is why a few hundred rows in his file show a total a thousandth away
 * from the columns beside it. Reproducing the report means reproducing that.
 */
export function qty(value) {
    const n = Number(value) || 0;
    const text = String(n);

    // Shifted through the decimal string rather than by multiplying: 4.0055
    // times a thousand is 4005.4999999999995 in binary, which rounds down to
    // 4.005 where SAP writes 4.006. Moving the exponent in the text moves it
    // exactly. A number already written in exponential form has no decimals
    // worth keeping at this scale, so it takes the plain route.
    if (text.includes('e') || text.includes('E')) {
        return Math.round(n * 1000) / 1000;
    }

    return Number(`${Math.round(Number(`${text}e3`))}e-3`);
}

/** Text that is a clean number becomes one, the way SAP's own export writes it. */
export function asCell(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value);

    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

/**
 * The report's rows.
 *
 * @param {object[]} items      the item master, archived rows already out
 * @param {(sku: string) => object|undefined} seriesOf  that item's month → qty
 * @param {string[]} months     every month in the chosen range
 */
export function stockAnalysisRows(items, seriesOf, months) {
    const rows = [];

    for (const item of items) {
        const series = seriesOf(item.sku);

        if (!series) {
            continue;
        }

        const inRange = {};
        let total = 0;
        let moved = false;

        for (const ym of months) {
            const qty = series[ym];

            if (qty === undefined) {
                continue;
            }

            moved = true;
            inRange[ym] = qty;
            total += Number(qty) || 0;
        }

        // No movement in the period, no row — the inner join, reproduced.
        if (!moved) {
            continue;
        }

        rows.push({
            id: item.sku,
            code: item.sku,
            name: item.names?.he ?? '',
            foreign: item.names?.en ?? '',
            group: item.groupName ?? '',
            onHand: item.onHand ?? 0,
            onOrder: item.onOrder ?? 0,
            committed: item.committed ?? 0,
            months: inRange,
            total,
        });
    }

    // The query's own ORDER BY: the item that moved most stands first.
    return rows.sort((a, b) => b.total - a.total);
}

/** The rows as a sheet: the header row, then one array per item. */
export function stockAnalysisSheet(rows, months) {
    const header = [...STOCK_ANALYSIS_HEAD, ...months, STOCK_ANALYSIS_TOTAL];
    const body = rows.map((row) => [
        asCell(row.code),
        asCell(row.name),
        asCell(row.foreign),
        asCell(row.group),
        qty(row.onHand),
        qty(row.onOrder),
        qty(row.committed),
        ...months.map((ym) => qty(row.months[ym] ?? 0)),
        qty(row.total),
    ]);

    return [header, ...body];
}
