export default {
    title: 'Database',
    lede: "The console keeps its records in a real PostgreSQL, compiled to WebAssembly and running inside this page (PGlite), with its data directory in this machine's IndexedDB. The tables, foreign keys and indexes are the ones in database/schema.sql, and every action in the console is a real INSERT, UPDATE or DELETE — which is why what you do is still there after a reload.",
    off: 'This console is pointed at a server, so it carries no database of its own.',
    refresh: 'Refresh the counts',
    rebuild: 'Rebuild',
    rebuildTitle: 'Rebuild the database?',
    rebuildBody:
        'Everything done in the console — orders raised, batches received, requests sent — goes, and the records return to what the SAP backup held. This cannot be undone.',
    rebuilt: 'The database was rebuilt',
    tables: 'Tables',
    filter: 'Filter by table name',
    query: 'Query',
    queryHint:
        'Any SQL runs against this database. It is on your machine and nowhere else.',
    run: 'Run',
    returned: 'No rows | One row | {n} rows',
    col: {
        table: 'Table',
        rows: 'Rows',
    },
    kpi: {
        tables: 'Tables',
        rows: 'Records',
        engine: 'Engine',
    },
    example: {
        coverage: 'Stock by supplier',
        expiring: 'Batches by expiry',
        shared: 'Shared components',
        spend: 'Purchasing by supplier',
    },
};
