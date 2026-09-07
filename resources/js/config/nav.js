// The right-side navigation (RTL) / left-side (LTR).
//
// Ids double as route names and as locale keys: an item's label is
// `nav.item.<id>`, a group's heading is `nav.group.<id>`. Adding a screen means
// adding one entry here plus its route — nothing else knows the nav's shape.
export const NAV_GROUPS = [
    {
        id: 'daily_ops',
        items: [
            { id: 'orders', icon: 'clipboard_list' },
            { id: 'deliveries', icon: 'truck' },
            { id: 'messaging', icon: 'whatsapp' },
        ],
    },
    {
        id: 'customers',
        items: [
            { id: 'users', icon: 'users' },
            { id: 'finance', icon: 'card' },
            { id: 'wallet', icon: 'coin' },
        ],
    },
    {
        id: 'operations',
        separated: true,
        items: [
            { id: 'products', icon: 'package' },
            { id: 'pricing', icon: 'layers' },
            { id: 'ingredients', icon: 'beaker' },
            { id: 'lab', icon: 'zoom', inDevelopment: true },
            { id: 'inventory', icon: 'grid' },
        ],
    },
    {
        id: 'knowledge',
        items: [
            { id: 'safety', icon: 'shield' },
            { id: 'libraries', icon: 'beaker' },
            { id: 'content', icon: 'book' },
            { id: 'videos', icon: 'play' },
        ],
    },
    {
        id: 'system',
        items: [
            { id: 'integrations', icon: 'db' },
            { id: 'admins', icon: 'users' },
            { id: 'systemContacts', icon: 'phone' },
            { id: 'log', icon: 'list' },
        ],
    },
    // Development-only. Shown against the demo fixture and nowhere else; the
    // route behind it is folded out of a production build (see router/index.js).
    {
        id: 'dev',
        separated: true,
        devOnly: true,
        items: [{ id: 'devProgress', icon: 'file_text' }],
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
