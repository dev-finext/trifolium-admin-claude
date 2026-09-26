// Converting a quantity between two units of the same physical kind.
//
// The console plans in the unit the item is *held* in — `uom.stock`, which is
// what SAP's `OITM.InvntryUom` says — while a recipe yields in the unit it was
// written in. For a tincture those are not the same: the item is counted in
// litres and the recipe makes 1,000 ml. Handing one number to the other without
// conversion is off by a factor of a thousand, in the direction that makes a
// production order look trivially small and its components trivially available.
//
// Nothing here is a business rule: these are the metric prefixes. Units that do
// not share a physical kind — a jar and a millilitre, a drop and a gram — have
// no fixed ratio, and `convertQty` says so by returning null rather than
// guessing one. A caller that gets null must refuse, not carry on.

/** How many of the kind's base unit one of this unit is. */
const SCALE = {
    mcg: ['mass', 1e-6],
    mg: ['mass', 1e-3],
    g: ['mass', 1],
    kg: ['mass', 1000],
    ml: ['volume', 1],
    l: ['volume', 1000],
};

/**
 * @param {number} qty
 * @param {string} from the unit `qty` is stated in
 * @param {string} to the unit wanted
 * @returns {number|null} the quantity in `to`, or null if the two cannot be
 *   converted into one another.
 */
export function convertQty(qty, from, to) {
    const n = Number(qty) || 0;

    if (!from || !to || from === to) {
        return n;
    }

    const a = SCALE[from];
    const b = SCALE[to];

    if (!a || !b || a[0] !== b[0]) {
        return null;
    }

    return (n * a[1]) / b[1];
}

/** Whether a quantity in `from` can be restated in `to` at all. */
export function convertible(from, to) {
    return convertQty(1, from, to) !== null;
}
