// Tiered price lists.
//
// A group owns a set of SKU prefixes and a DISCOUNT ladder — never a price. The
// item carries its own unit price (`item.price.sale`, per its sales unit) and
// the group says how much comes off it as the ordered quantity grows: nothing
// up to and including `baseQty`, then either a percentage per quantity band
// (`percent` mode) or a small formula (`formula` mode). A SKU is priced by the
// group holding the LONGEST prefix that matches it unless the item names a group
// itself, which is why two groups may never own overlapping prefixes.
//
// SAP's real ladders (demo/real/priceTiers.json) are flat for 199 of 200 herbs
// and the one that is not drops 14 % by 3 kg, so the ladders here are modest.
import { at, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** The default quantity scale a new percent-mode group inherits. */
export const DEMO_PRICE_BREAKS = [
    1, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

/** `10–20` / `1000+` for band `index` of a group's scale. */
export function priceRangeText(group, index) {
    const breaks = group.breaks;

    return breaks[index + 1] != null
        ? `${breaks[index]}–${breaks[index + 1]}`
        : `${breaks[index]}+`;
}

/**
 * Pricing groups, each with the ladder it was last saved with. Three are in
 * percent mode and two in formula mode so both editors have something to show.
 */
export function buildPriceGroups() {
    return [
        {
            id: 'g1',
            name: L('שמנים אתריים', 'Essential oils'),
            // Family 15 in SAP's item numbering.
            prefixes: ['15'],
            uom: 'ml',
            baseQty: 10,
            mode: 'formula',
            breaks: [],
            percents: [],
            // 21.5 % at 20 ml, 38 % at 40 ml, the 40 % floor from 43 ml on.
            formula: { kind: 'curve', k: 0.35, floorPct: 40 },
            updated: at(2, 11, 40),
            updatedBy: DEMO_ACTORS.amit,
        },
        {
            id: 'g2',
            name: L('שמנים מושרים', 'Infused oils'),
            prefixes: ['201'],
            uom: 'ml',
            baseQty: 1,
            mode: 'percent',
            breaks: DEMO_PRICE_BREAKS,
            // The old absolute bands (9 → 2.2 ₪) relative to the first one,
            // compressed so the ladder tops out at 30 %.
            percents: [
                0, 4.5, 8.5, 11, 13.5, 15, 20, 23, 24.5, 26, 27, 28, 28, 28.5,
                29, 29.5, 30,
            ],
            formula: null,
            updated: at(6, 9, 15),
            updatedBy: DEMO_ACTORS.orit,
        },
        {
            id: 'g3',
            name: L('שמני בסיס', 'Carrier oils'),
            prefixes: ['21'],
            uom: 'ml',
            baseQty: 1,
            mode: 'percent',
            breaks: DEMO_PRICE_BREAKS,
            percents: [
                0, 6, 10, 13, 15, 17, 20, 23, 25, 26, 27, 27.5, 28, 28.5, 29,
                29.5, 30,
            ],
            formula: null,
            updated: at(14, 13, 0),
            updatedBy: DEMO_ACTORS.orit,
        },
        {
            id: 'g4',
            name: L('צמחי מרפא יבשים', 'Dried herbs'),
            // Families 10 and 11 — the herbs and the 1:1 extracts.
            prefixes: ['10', '11'],
            uom: 'g',
            baseQty: 1,
            mode: 'percent',
            // SAP's SPP2 thresholds (1 / 1000 / 3000 g) and the shape of the
            // one herb whose ladder is not flat: thin, at fixed quantities.
            breaks: [1, 1000, 3000],
            percents: [0, 5, 14],
            formula: null,
            updated: at(1, 16, 22),
            updatedBy: DEMO_ACTORS.amit,
        },
        {
            id: 'g5',
            name: L('קפסולות', 'Capsules'),
            // Family 30, where the capsule shells are numbered.
            prefixes: ['30'],
            uom: 'capsule',
            baseQty: 100,
            mode: 'formula',
            breaks: [],
            percents: [],
            // 4 % off for every 250 capsules above the first hundred, capped
            // at 50 % — reached at 3,350.
            formula: { kind: 'step', stepQty: 250, stepPct: 4, floorPct: 50 },
            updated: at(0, 10, 5),
            updatedBy: DEMO_ACTORS.orit,
        },
    ];
}

/**
 * The parse result of a price-list spreadsheet, built against the live groups
 * so the old → new comparison the review screen shows is truthful. Rows carry
 * the percentage off per band; three rows fail, one for each error id in
 * PRICE_IMPORT_ERROR_IDS (config/catalog.js). Only percent-mode groups have
 * bands a spreadsheet can address.
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
