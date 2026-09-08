// The instant the demo fixture is pinned to.
//
// Every relative date in the dataset is expressed as an offset from this one
// Date — an order placed "3 days ago", a batch expiring "in 46 days", a payment
// link with "2 days left" — so the sample data renders identically on every
// load instead of drifting out of the state each screen was designed against.
//
// resources/js/data/source.js hands this to setClock() before it calls
// buildDataset(); against a real API the clock is never pinned. Stated once,
// here, and nowhere else. It is the day the SAP backup the order book was read
// from was taken, so the newest real document in the fixture is 'today'.
export const DEMO_CLOCK = new Date(2026, 7, 5, 14, 5);
