// Single import point for configuration.
//
// Everything re-exported here is permanent product configuration: business
// rules, taxonomies, thresholds. There is not one sample record in this
// directory — all fabricated content lives in resources/js/demo/ and is reached
// through resources/js/data/source.js.
export * from '@/config/catalog';
export * from '@/config/customers';
export * from '@/config/exceptions';
export * from '@/config/finance';
export * from '@/config/inventory';
export * from '@/config/items';
export * from '@/config/log';
export * from '@/config/messaging';
export * from '@/config/nav';
export * from '@/config/org';
export * from '@/config/settings';
export * from '@/config/statuses';
export * from '@/config/suppliers';
