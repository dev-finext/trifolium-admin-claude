// Tiered price lists.
//
// A scale owns a set of ITEM GROUPS and a DISCOUNT ladder — never a price. The
// item carries its own unit price (`item.price.sale`, per the scale's unit) and
// the scale says how much comes off it as the ordered quantity grows: nothing
// up to and including `baseQty`, then the percentage of the band the quantity
// falls into. An item is priced by the scale holding its item group — SAP's
// `OITB` code, the same grouping the item screen filters by — and an item group
// belongs to one scale at most.
//
// Every group states its own quantity bands. Capsules are bought in thousands
// and essential oils in tens of millilitres, and one scale over both would be a
// scale that fits neither.
//
// SAP's real ladders (demo/real/priceTiers.json) are flat for 199 of 200 herbs
// and the one that is not drops 14 % by 3 kg, so the ladders here are modest.
import { at, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** The bands the two oil ladders were written on. */
const OIL_BANDS = [
    1, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

/** `10–20` / `1000+` for band `index` of a group's scale. */
export function priceRangeText(group, index) {
    const breaks = group.breaks;

    return breaks[index + 1] != null
        ? `${breaks[index]}–${breaks[index + 1]}`
        : `${breaks[index]}+`;
}

/** Pricing groups, each with the ladder it was last saved with. */
export function buildPriceGroups() {
    return [
        {
            id: 'g1',
            name: L('שמנים אתריים', 'Essential oils'),
            // 15 שמן אתרי
            itemGroups: [104],
            uom: 'ml',
            baseQty: 10,
            // Steep early and then flat: 10 ml is the base, and by 50 ml the
            // ladder has given everything it has.
            breaks: [1, 10, 20, 30, 40, 50],
            percents: [0, 0, 21.5, 31.9, 38.4, 40],
            updated: at(2, 11, 40),
            updatedBy: DEMO_ACTORS.amit,
        },
        {
            id: 'g2',
            name: L('שמנים מושרים', 'Infused oils'),
            // שמן מושרה
            itemGroups: [107],
            uom: 'ml',
            baseQty: 1,
            breaks: OIL_BANDS,
            // The old absolute bands (9 → 2.2 ₪) relative to the first one,
            // compressed so the ladder tops out at 30 %.
            percents: [
                0, 4.5, 8.5, 11, 13.5, 15, 20, 23, 24.5, 26, 27, 28, 28, 28.5,
                29, 29.5, 30,
            ],
            updated: at(6, 9, 15),
            updatedBy: DEMO_ACTORS.orit,
        },
        {
            id: 'g3',
            name: L('שמני בסיס', 'Carrier oils'),
            // שמנים בכבישה קרה — the group exists and holds nothing yet, which
            // is a real state the screen has to show.
            itemGroups: [150],
            uom: 'ml',
            baseQty: 1,
            breaks: OIL_BANDS,
            percents: [
                0, 6, 10, 13, 15, 17, 20, 23, 25, 26, 27, 27.5, 28, 28.5, 29,
                29.5, 30,
            ],
            updated: at(14, 13, 0),
            updatedBy: DEMO_ACTORS.orit,
        },
        {
            id: 'g4',
            name: L('צמחי מרפא יבשים', 'Dried herbs'),
            // 10 צמחים and 11 צמחים 1:1 — one scale over two item groups.
            itemGroups: [100, 101],
            uom: 'g',
            baseQty: 1,
            // SAP's SPP2 thresholds (1 / 1000 / 3000 g) and the shape of the
            // one herb whose ladder is not flat: thin, at fixed quantities.
            breaks: [1, 1000, 3000],
            percents: [0, 5, 14],
            updated: at(1, 16, 22),
            updatedBy: DEMO_ACTORS.amit,
        },
        {
            id: 'g5',
            name: L('קפסולות', 'Capsules'),
            // 30 חומרי עזר, where the capsule shells sit.
            itemGroups: [112],
            uom: 'capsule',
            baseQty: 100,
            // Four percent for every 250 capsules above the first hundred,
            // stopping at half price from 3,350 on.
            breaks: [1, 100, 350, 600, 850, 1100, 1600, 2100, 2600, 3100, 3350],
            percents: [0, 0, 4, 8, 12, 16, 24, 32, 40, 48, 50],
            updated: at(0, 10, 5),
            updatedBy: DEMO_ACTORS.orit,
        },
    ];
}

/**
 * The parse result of a price-list spreadsheet, built against the live groups
 * so the old → new comparison the review screen shows is truthful. Rows carry
 * the percentage off per band; three rows fail, one for each error id in
 * PRICE_IMPORT_ERROR_IDS (config/catalog.js).
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
            old: group.percents[index],
            next,
            raw: null,
            err: null,
        };
    };

    return {
        file: L('מחירון אוגוסט 2026.xlsx', 'August 2026 price list.xlsx'),
        rows: [
            row('g2', 2, 9),
            row('g2', 3, 12),
            row('g2', 6, 21),
            row('g3', 1, 6.5),
            row('g3', 7, 24),
            row('g3', 16, 30),
            row('g4', 1, 6),
            row('g4', 2, 15),
            {
                group: null,
                gname: L('שמנים אקזוטיים', 'Exotic oils'),
                index: null,
                range: '1–5',
                old: null,
                next: 3,
                raw: null,
                err: 'group_not_found',
            },
            {
                group: 'g3',
                gname: byId('g3').name,
                index: null,
                range: '15–25',
                old: null,
                next: 12,
                raw: null,
                err: 'range_not_in_group',
            },
            {
                group: 'g4',
                gname: byId('g4').name,
                index: 2,
                range: priceRangeText(byId('g4'), 2),
                old: byId('g4').percents[2],
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
