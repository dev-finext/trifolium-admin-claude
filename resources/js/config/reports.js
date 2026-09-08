// The reports screen. Second-version material (dev/progress.js → `reports`).
//
// The specification lists seventeen general reports. These are the ones whose
// data already lives in the console; the rest wait for the modules that would
// feed them (dev/progress.js → `b-reports-rest`). Titles and descriptions at
// `reports.report.<id>.*`; the numbers come from useReports.
export const REPORTS = [
    { id: 'orders_status', ranged: true, group: 'orders' },
    { id: 'orders_city', ranged: true, group: 'orders' },
    { id: 'orders_prep_type', ranged: true, group: 'orders' },
    { id: 'cancel_causes', ranged: true, group: 'orders' },
    { id: 'practitioners', ranged: true, group: 'people' },
    { id: 'students', ranged: false, group: 'people' },
    { id: 'aging', ranged: false, group: 'money' },
    { id: 'consumption', ranged: true, group: 'stock' },
];

export const REPORT_IDS = REPORTS.map((report) => report.id);

export const REPORT_GROUP_IDS = ['orders', 'people', 'money', 'stock'];

export const reportById = (id) =>
    REPORTS.find((report) => report.id === id) || null;

/** How many months of stock count as "low coverage" in the consumption report. */
export const LOW_COVERAGE_MONTHS = 2;
