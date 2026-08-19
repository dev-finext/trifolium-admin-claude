// Customers — how a record came to exist.
//
// Customer personal data lives only in the local database and is never sent to an
// external system. Labels are in the locale catalogs under `users.source.*`.

/**
 * How a customer record was created. A practitioner ordering for someone creates
 * that person's record as a side effect; the other two are the customer signing up
 * on the site, and the support team typing a card in by hand.
 */
export const CUSTOMER_SOURCE_IDS = [
    'practitioner_order',
    'website',
    'admin_entry',
];
