// זמן אספקה — how long it takes for a quantity to be there.
//
// Two answers, depending on where the quantity comes from:
//
//   bought   the supplier's own lead time, off their card. A supplier who
//            ships in three days ships every item in three days; it is a fact
//            about the supplier, not about the herb.
//   made     the preparation type's. Grinding a powder takes what grinding a
//            powder takes, whichever herb is being ground — which is why the
//            figure lives on the preparation type and not on nine hundred item
//            cards.
//
// SAP's own lead-time field on the item master is the fallback, not the answer.
// It reads 30 on 1,067 of the 1,374 cards — a blanket default somebody set once
// and not a decision about a herb — so letting it win would mean the supplier's
// real figure and the preparation type's real figure never showed at all. It is
// used where neither of those has anything to say.
//
// Stated in days, weeks or months, because that is how the pharmacy talks about
// it — "two weeks" is an answer and "fourteen days" is arithmetic. The days are
// carried alongside so two lead times can be compared and a list can sort.

/** The units a lead time may be stated in. */
export const LEAD_UNIT_IDS = ['day', 'week', 'month'];

/** How many days one of each is. A month is thirty — nobody means 30.44. */
export const LEAD_UNIT_DAYS = { day: 1, week: 7, month: 30 };

/** Where a lead time came from, which the screens say out loud. */
export const LEAD_SOURCE_IDS = ['item', 'supplier', 'prep', 'none'];

/** A stated lead time in days, for comparing and sorting. */
export function leadDays(lead) {
    if (!lead || !Number.isFinite(Number(lead.amount))) {
        return null;
    }

    return Number(lead.amount) * (LEAD_UNIT_DAYS[lead.unit] || 1);
}

/** A lead time from a plain number of days, in the largest whole unit that fits. */
export function leadFromDays(days) {
    const n = Number(days);

    if (!Number.isFinite(n) || n <= 0) {
        return null;
    }

    if (n % LEAD_UNIT_DAYS.month === 0) {
        return { amount: n / LEAD_UNIT_DAYS.month, unit: 'month' };
    }

    if (n % LEAD_UNIT_DAYS.week === 0) {
        return { amount: n / LEAD_UNIT_DAYS.week, unit: 'week' };
    }

    return { amount: n, unit: 'day' };
}

/**
 * The lead time that applies to an item.
 *
 * @param {object} item     The item card.
 * @param {object} [deps]   `{ supplier, prepType, madeHere }` — the supplier
 *   card this item names, the preparation type it is produced as, and whether
 *   it is produced here at all.
 * @returns {{amount: number, unit: string, days: number, source: string}|null}
 */
export function leadTimeOf(item, { supplier, prepType, madeHere } = {}) {
    if (!item) {
        return null;
    }

    // Made here: the preparation type's. Checked first, because an item that is
    // compounded is not waiting for anybody to ship it.
    //
    // `madeHere` and not "has a preparation type": a dried herb lists the
    // preparations it can *become* — a decoction, a tea — and is still bought
    // by the kilo from a supplier. What decides is whether the pharmacy has a
    // recipe for producing this item itself.
    if (madeHere && prepType?.lead?.amount) {
        return {
            ...prepType.lead,
            days: leadDays(prepType.lead),
            source: 'prep',
        };
    }

    // Bought: the supplier's own figure, off their card.
    if (item.flags?.purchase && supplier?.lead) {
        const lead = {
            amount: supplier.lead,
            unit: supplier.leadUnit || 'day',
        };

        return { ...lead, days: leadDays(lead), source: 'supplier' };
    }

    // Neither: whatever the item master carries.
    const own = leadFromDays(item.levels?.leadTime);

    return own ? { ...own, days: leadDays(own), source: 'item' } : null;
}
