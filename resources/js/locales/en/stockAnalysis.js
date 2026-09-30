// The stock-analysis report. The table's own headers are not here — they are
// SAP's field names and must stay exactly as they are.
export default {
    crumb: 'Daily operations',
    title: 'Stock analysis',
    sub: "Yaron's report, as it comes out of SAP",
    lede: 'The report saved in SAP as "דוח ירון ניתוח מלאי — ללא ספירת מלאי", in the same columns and the same order. Consumption is every stock movement in the period except counts and manual issues, plus what production consumed. Stock, on-order and committed are read from the item card now rather than at the report dates, exactly as in SAP. An item with no movement in the period does not appear.',
    from: 'From',
    to: 'To',
    count: 'no rows · {m} months | one row · {m} months | {n} rows · {m} months',
    export: 'Export to Excel',
    exported: 'one row exported | {n} rows exported',
    emptyTitle: 'Nothing moved in this period',
    emptySub: 'No item has a movement between these dates. Try another range.',
    badRangeTitle: 'The range runs backwards',
    badRangeSub: 'The end date is before the start date.',
    tooWideTitle: 'The range is too long to draw',
    tooWideSub:
        'The report draws a column per month, up to {n}. Shorten the range.',
};
