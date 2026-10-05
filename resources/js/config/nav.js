// The right-side navigation (RTL) / left-side (LTR).
//
// Ids double as route names and as locale keys: an item's label is
// `nav.item.<id>`, a group's heading is `nav.group.<id>`. Adding a screen means
// adding one entry here plus its route — nothing else knows the nav's shape.
export const NAV_GROUPS = [
    {
        id: 'daily_ops',
        items: [
            { id: 'orders', icon: 'clipboard_list', ready: true },
            { id: 'deliveries', icon: 'truck' },
            { id: 'messaging', icon: 'whatsapp' },
        ],
    },
    {
        id: 'customers',
        items: [
            { id: 'users', icon: 'users', ready: true },
            { id: 'finance', icon: 'card' },
            { id: 'wallet', icon: 'coin' },
        ],
    },
    {
        id: 'operations',
        separated: true,
        items: [
            // One item card for everything the pharmacy buys, makes, stocks or
            // sells — one table, split by family, as SAP's item master is. Shelf
            // products and bills of materials are sections of the card.
            { id: 'items', icon: 'tag' },
            { id: 'pricing', icon: 'layers' },
            { id: 'suppliers', icon: 'truck', ready: true },
            // V2 — the stickers module: template editor, print run, notes pool, log
            { id: 'stickers', icon: 'printer', v2: 'labels' },
            { id: 'inventory', icon: 'grid' },
            // V2 — purchase orders, supplier delivery notes, consumption report
            { id: 'purchasing', icon: 'inbox', v2: 'purchase-orders' },
            { id: 'stockAnalysis', icon: 'chart', v3: true },
            // V2 — production orders: a recipe run that opens a batch
            { id: 'production', icon: 'beaker' },
        ],
    },
    {
        id: 'knowledge',
        items: [
            { id: 'safety', icon: 'shield', ready: true },
            { id: 'libraries', icon: 'beaker', ready: true },
            { id: 'content', icon: 'book' },
            { id: 'videos', icon: 'play', ready: true },
        ],
    },
    {
        id: 'system',
        items: [
            { id: 'integrations', icon: 'db' },
            { id: 'admins', icon: 'users', ready: true },
            { id: 'systemContacts', icon: 'phone', ready: true },
            { id: 'log', icon: 'list' },
            { id: 'database', icon: 'db', devOnly: true },
        ],
    },
];

/** Every nav item, flattened — used by the router and the command palette. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.id })),
);

export const NAV_ITEM_IDS = NAV_ITEMS.map((item) => item.id);

/** The screen the console opens on. */
export const DEFAULT_NAV_ITEM = 'orders';

/** Collapsed-sidebar preference key, and the shortcut that toggles it. */
export const NAV_STORAGE_KEY = 'trifolium-admin-nav';
export const NAV_TOGGLE_KEY = 'b';
