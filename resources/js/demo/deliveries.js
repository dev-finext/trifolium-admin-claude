// The shipping station's own fixtures: each courier's operational settings
// (SHIPPING_STATION_SPEC.md §5.6) and the pickup lists already handed to a
// driver. Partner pickup points are gone — self pickup is the pharmacy
// counter only (DEMO_SHIPPING_STATION_PROMPT.md §16).
import { COURIERS } from '@/config';
import { at, pickFrom } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';

/**
 * One row per courier the pharmacy could ship with. Only Tapuz is connected
 * and active on day one — the rest show "אין חיבור" until a driver exists.
 */
export function buildCourierSettings() {
    return COURIERS.map((courier) => ({
        code: courier.id,
        isActive: courier.id === 'tapuz',
        isDefault: courier.id === 'tapuz',
        phone: courier.phone || '',
        contactName: courier.id === 'tapuz' ? 'מוקד תפוז' : '',
        lastPickupTime: courier.id === 'tapuz' ? '15:00' : null,
        notes:
            courier.id === 'tapuz'
                ? ''
                : 'אין חיבור API — תוכנן לשלב הבא',
        lastSuccessAt: courier.id === 'tapuz' ? at(1, 16, 5) : null,
        lastErrorAt: null,
        lastError: null,
    }));
}

/** A handful of pickup lists already handed to the driver, for "נשלחו". */
export function buildCourierPickupLists(orders) {
    const handed = orders.filter(
        (order) => order.status === 'shipped' && order.shipments?.length,
    );
    const byDay = new Map();

    handed.forEach((order) => {
        const day = order.shippedAt?.daysAgo ?? order.daysAgo;

        if (!byDay.has(day)) {
            byDay.set(day, []);
        }

        byDay.get(day).push(order);
    });

    return [...byDay.entries()].map(([day, dayOrders], i) => ({
        id: `cpl-${i + 1}`,
        courierCode: 'tapuz',
        printedAt: at(day, 14, 30),
        printedBy: pickFrom(`cpl:${i}:by`, [
            DEMO_ACTORS.amitLab,
            DEMO_ACTORS.ellaSupport,
        ]),
        handedAt: at(day, 16, 0),
        handedBy: DEMO_ACTORS.amitLab,
        note: '',
        orderIds: dayOrders.map((order) => order.id),
    }));
}
