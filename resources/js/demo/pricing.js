// Tiered price lists.
//
// A group owns a set of SKU prefixes and one price per quantity band: a SKU is
// priced by the group holding the LONGEST prefix that matches it, which is why
// two groups may never own overlapping prefixes. Most groups use the default
// quantity scale; a group that needs its own (capsules are bought in thousands)
// carries it on the record.
import { at, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** The default quantity scale a new group inherits. */
export const DEMO_PRICE_BREAKS = [
    1, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

/** Units a price list can be quoted per. */
export const PRICE_UOM_IDS = ['ml', 'g', 'unit', 'capsule'];

/** `10–20` / `1000+` for band `index` of a group's scale. */
export function priceRangeText(group, index) {
    const breaks = group.breaks;

    return breaks[index + 1] != null
        ? `${breaks[index]}–${breaks[index + 1]}`
        : `${breaks[index]}+`;
}

/** How many bands of a group actually carry a price. */
export function filledBandCount(group) {
    return group.prices.filter((price) => price != null).length;
}

/** The group that prices a SKU: the longest matching prefix wins. */
export function resolvePriceGroup(sku, groups) {
    let best = null;

    groups.forEach((group) => {
        group.prefixes.forEach((prefix) => {
            if (
                String(sku).startsWith(prefix) &&
                (!best || prefix.length > best.prefix.length)
            ) {
                best = { group, prefix };
            }
        });
    });

    return best;
}

/** Prefixes that would collide with another group's — always forbidden. */
export function prefixConflicts(prefixes, groups, selfId) {
    const conflicts = [];

    groups.forEach((group) => {
        if (group.id === selfId) {
            return;
        }

        group.prefixes.forEach((theirs) => {
            prefixes.forEach((mine) => {
                if (mine.startsWith(theirs) || theirs.startsWith(mine)) {
                    conflicts.push({ mine, theirs, group });
                }
            });
        });
    });

    return conflicts;
}

/** Pricing groups, each with the bands it was last saved with. */
export function buildPriceGroups() {
    return [
        {
            id: 'g1',
            name: L('שמנים אתריים', 'Essential oils'),
            // Family 15 in SAP's item numbering.
            prefixes: ['15'],
            uom: 'ml',
            updated: at(2, 11, 40),
            updatedBy: DEMO_ACTORS.avi,
            breaks: DEMO_PRICE_BREAKS,
            prices: [
                12, 10, 8.5, 8, 7.5, 7, 5, 4, 3.6, 3.3, 3.1, 2.9, 2.8, 2.7, 2.6,
                2.5, 2.4,
            ],
        },
        {
            id: 'g2',
            name: L('שמנים מושרים', 'Infused oils'),
            prefixes: ['201'],
            uom: 'ml',
            updated: at(6, 9, 15),
            updatedBy: DEMO_ACTORS.ronit,
            breaks: DEMO_PRICE_BREAKS,
            prices: [
                9, 8, 7, 6.5, 6, 5.6, 4.5, 3.8, 3.4, 3.1, 2.9, 2.7, 2.6, 2.5,
                2.4, 2.3, 2.2,
            ],
        },
        {
            id: 'g3',
            name: L('שמני בסיס', 'Carrier oils'),
            prefixes: ['21'],
            uom: 'ml',
            updated: at(14, 13, 0),
            updatedBy: DEMO_ACTORS.ronit,
            breaks: DEMO_PRICE_BREAKS,
            prices: [
                4, 3.4, 3, 2.7, 2.5, 2.3, 2, 1.7, 1.5, 1.4, 1.3, 1.25, 1.2,
                1.15, 1.1, 1.05, 1,
            ],
        },
        {
            id: 'g4',
            name: L('צמחי מרפא יבשים', 'Dried herbs'),
            // Families 10 and 11 — the herbs and the 1:1 extracts.
            prefixes: ['10', '11'],
            uom: 'g',
            updated: at(1, 16, 22),
            updatedBy: DEMO_ACTORS.avi,
            breaks: DEMO_PRICE_BREAKS,
            prices: [
                3.5, 3.2, 2.8, 2.6, 2.4, 2.9, 2.2, 1.9, 1.7, 1.5, 1.4, 1.3, 1.2,
                1.1, 1.05, 1, 0.95,
            ],
        },
        {
            id: 'g5',
            name: L('קפסולות', 'Capsules'),
            // Family 30, where the capsule shells are numbered.
            prefixes: ['30'],
            uom: 'capsule',
            updated: at(0, 10, 5),
            updatedBy: DEMO_ACTORS.ronit,
            breaks: [100, 250, 500, 1000, 2500, 5000],
            prices: [0.5, 0.45, 0.4, 0.34, 0.3, 0.26],
        },
    ];
}

/** The ingredient SKU catalogue the price lists resolve against. */
export const DEMO_INGREDIENT_SKUS = [
    { sku: '200110', name: L('שמן אתרי לבנדר', 'Lavender essential oil') },
    { sku: '200125', name: L('שמן אתרי מנטה', 'Peppermint essential oil') },
    { sku: '200210', name: L('שמן אתרי אקליפטוס', 'Eucalyptus essential oil') },
    {
        sku: '200455',
        name: L('שמן אתרי קמומיל רומאי', 'Roman chamomile essential oil'),
    },
    { sku: '200460', name: L('שמן אתרי רוזמרין', 'Rosemary essential oil') },
    { sku: '200518', name: L('שמן אתרי עץ התה', 'Tea tree essential oil') },
    { sku: '200610', name: L('שמן אתרי גרניום', 'Geranium essential oil') },
    { sku: '200735', name: L('שמן אתרי לימון', 'Lemon essential oil') },
    { sku: '201110', name: L('שמן מושרה קלנדולה', 'Calendula infused oil') },
    {
        sku: '201220',
        name: L('שמן מושרה פרע מחורר', "St John's wort infused oil"),
    },
    { sku: '201330', name: L('שמן מושרה בוצין', 'Mullein infused oil') },
    { sku: '210050', name: L('שמן שקדים מתוקים', 'Sweet almond oil') },
    { sku: '210060', name: L('שמן זית כתית', 'Virgin olive oil') },
    { sku: '210075', name: L('שמן חוחובה', 'Jojoba oil') },
    { sku: '211020', name: L('חמאת שיאה', 'Shea butter') },
    { sku: '300210', name: L('ולריאן — שורש', 'Valerian — root') },
    { sku: '300225', name: L('פסיפלורה — עלים', 'Passionflower — leaf') },
    { sku: '300310', name: L('בבונג — פרחים', 'Chamomile — flower') },
    { sku: '300415', name: L('מליסה — עלים', 'Lemon balm — leaf') },
    { sku: '300520', name: L('סרפד — עלים', 'Nettle — leaf') },
    { sku: '300610', name: L('שן הארי — שורש', 'Dandelion — root') },
    { sku: '300711', name: L('אכינצאה — שורש', 'Echinacea — root') },
    { sku: '300820', name: L('מרווה — עלים', 'Sage — leaf') },
    { sku: '301150', name: L('קורנית — עלים', 'Thyme — leaf') },
    { sku: '301230', name: L('לבנדר — פרחים', 'Lavender — flower') },
    { sku: '400120', name: L('טינקטורת ולריאן', 'Valerian tincture') },
    { sku: '400230', name: L('טינקטורת אכינצאה', 'Echinacea tincture') },
    {
        sku: '500110',
        name: L('קפסולה ריקה — מידה 0', 'Empty capsule — size 0'),
    },
    {
        sku: '500120',
        name: L('קפסולה ריקה — מידה 00', 'Empty capsule — size 00'),
    },
    {
        sku: '900110',
        name: L('בקבוק זכוכית ענבר 50 מ״ל', 'Amber glass bottle 50 ml'),
    },
    { sku: '900225', name: L('משאבת ספריי לבקבוק', 'Spray pump for a bottle') },
    { sku: '910310', name: L('תווית מוצר — גליל', 'Product label — roll') },
];

/** Why an imported row could not be applied. */
export const PRICE_IMPORT_ERROR_IDS = [
    'group_not_found',
    'range_not_in_group',
    'invalid_value',
];

/**
 * The parse result of a price-list spreadsheet, built against the live groups
 * so the old → new comparison the review screen shows is truthful. Three rows
 * fail, one for each way a row can be wrong.
 */
export function buildPriceImport(groups) {
    const byId = (id) => groups.find((group) => group.id === id);
    const row = (groupId, index, next) => {
        const group = byId(groupId);

        return {
            group: groupId,
            gname: group.name,
            index,
            range: priceRangeText(group, index),
            old: group.prices[index],
            next,
            raw: null,
            err: null,
        };
    };

    return {
        file: L('מחירון אוגוסט 2026.xlsx', 'August 2026 price list.xlsx'),
        rows: [
            row('g1', 2, 8.2),
            row('g1', 3, 7.8),
            row('g1', 6, 4.8),
            row('g2', 0, 9.5),
            row('g2', 1, 8.2),
            row('g3', 7, 1.6),
            row('g4', 10, 1.35),
            row('g4', 11, 1.3),
            row('g5', 0, 0.9),
            {
                group: null,
                gname: L('שמנים אקזוטיים', 'Exotic oils'),
                index: null,
                range: '1–5',
                old: null,
                next: 7,
                raw: null,
                err: 'group_not_found',
            },
            {
                group: 'g1',
                gname: byId('g1').name,
                index: null,
                range: '15–25',
                old: null,
                next: 8,
                raw: null,
                err: 'range_not_in_group',
            },
            {
                group: 'g3',
                gname: byId('g3').name,
                index: 3,
                range: priceRangeText(byId('g3'), 3),
                old: byId('g3').prices[3],
                next: null,
                raw: 'abc',
                err: 'invalid_value',
            },
        ],
    };
}

/** A deterministic stand-in for the next import id the screen would allocate. */
export function nextImportId() {
    return `imp-${spread('pricing:import', 100000, 999999)}`;
}
