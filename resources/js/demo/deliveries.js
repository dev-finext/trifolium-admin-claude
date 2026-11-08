// The shipping station's own fixtures: each courier's operational settings
// (SHIPPING_STATION_SPEC.md §5.6) and the pickup lists already handed to a
// driver. Partner pickup points are gone — self pickup is the pharmacy
// counter only (DEMO_SHIPPING_STATION_PROMPT.md §16).
import { COURIERS } from '@/config';
import { at, pickFrom } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';

/** A courier connected via `config/org.js`'s `hasApi` gets real-looking
 * day-to-day settings; one every pharmacy actually uses is the default. */
const COURIER_TEXTURE = {
    tapuz: {
        isDefault: true,
        contactName: 'מוקד תפוז',
        lastPickupTime: '15:00',
        lastSuccessDaysAgo: 1,
    },
    special_delivery: {
        contactName: 'דנה, מוקד Special Delivery',
        lastPickupTime: '14:30',
        lastSuccessDaysAgo: 1,
    },
    focus: {
        contactName: 'מוקד פוקוס',
        lastPickupTime: '16:00',
        lastSuccessDaysAgo: 2,
    },
    yarden: {
        contactName: 'משה, מוקד ירדן',
        lastPickupTime: '13:45',
        lastSuccessDaysAgo: 3,
    },
};

/**
 * One row per courier the pharmacy could ship with. A company with no API
 * connection yet shows "אין חיבור" and cannot be made active — see
 * `CourierSettingsTab.vue`.
 */
export function buildCourierSettings() {
    return COURIERS.map((courier) => {
        const texture = COURIER_TEXTURE[courier.id] || null;

        return {
            code: courier.id,
            isActive: Boolean(texture),
            isDefault: Boolean(texture?.isDefault),
            phone: courier.phone || '',
            contactName: texture?.contactName || '',
            lastPickupTime: texture?.lastPickupTime || null,
            notes: texture ? '' : 'אין חיבור API — תוכנן לשלב הבא',
            lastSuccessAt: texture
                ? at(texture.lastSuccessDaysAgo, 16, 5)
                : null,
            lastErrorAt: null,
            lastError: null,
        };
    });
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
