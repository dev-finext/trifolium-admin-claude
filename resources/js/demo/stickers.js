// The stickers module — second-version fixture content.
//
// Three templates as data, a pool of notes keyed by preparation type, and a
// print log. The layout is mine from scratch: Natalie asked "how do you see
// it", and the existing SAP stickers were not available as text.
import { STICKER_SIZES } from '@/config/stickers';
import { at, pickFrom, spread } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

/** One element on a label. Positions and widths in mm, font in points. */
function el(id, kind, props) {
    return {
        id,
        kind,
        field: null,
        text: null,
        x: 2,
        y: 2,
        w: 30,
        h: null,
        size: 8,
        bold: false,
        align: 'start',
        label: false,
        ...props,
    };
}

const field = (id, name, props) => el(id, 'field', { field: name, ...props });

export const STICKER_TEMPLATES = [
    {
        id: 'prep',
        size: { ...STICKER_SIZES.prep },
        elements: [
            el('logo', 'logo', { x: 2, y: 2, w: 24, h: 9 }),
            field('phone', 'pharmacyPhone', {
                x: 2,
                y: 12,
                w: 24,
                size: 6.5,
                align: 'center',
            }),
            field('patient', 'patient', {
                x: 28,
                y: 2,
                w: 56,
                size: 11,
                bold: true,
                label: true,
            }),
            field('practitioner', 'practitioner', {
                x: 28,
                y: 8.5,
                w: 56,
                size: 7,
                label: true,
            }),
            field('formula', 'formula', {
                x: 28,
                y: 14,
                w: 56,
                size: 10,
                bold: true,
            }),
            field('type', 'prepType', { x: 28, y: 21, w: 28, size: 7 }),
            field('content', 'content', { x: 58, y: 21, w: 28, size: 7 }),
            field('conc', 'concentration', { x: 88, y: 21, w: 30, size: 7 }),
            field('instructions', 'instructions', {
                x: 28,
                y: 27,
                w: 90,
                size: 8,
                label: true,
            }),
            field('typeText', 'typeText', { x: 28, y: 35, w: 90, size: 7 }),
            field('notes', 'notes', { x: 28, y: 40, w: 90, size: 7 }),
            field('regulatory', 'regulatory', {
                x: 2,
                y: 48,
                w: 116,
                size: 5.5,
            }),
            field('made', 'madeOn', {
                x: 86,
                y: 2,
                w: 32,
                size: 6.5,
                label: true,
                align: 'end',
            }),
            field('expiry', 'expiry', {
                x: 86,
                y: 6,
                w: 32,
                size: 7,
                bold: true,
                label: true,
                align: 'end',
            }),
            el('barcode', 'barcode', { x: 88, y: 10.5, w: 30, h: 8 }),
            field('split', 'split', {
                x: 2,
                y: 17,
                w: 24,
                size: 6.5,
                align: 'center',
            }),
        ],
        updated: at(21, 10, 12),
        updatedBy: DEMO_ACTORS.ronit,
    },
    {
        id: 'item',
        size: { ...STICKER_SIZES.item },
        elements: [
            field('name', 'itemName', {
                x: 2,
                y: 2,
                w: 40,
                size: 10,
                bold: true,
            }),
            field('code', 'itemCode', {
                x: 2,
                y: 9,
                w: 30,
                size: 7,
                label: true,
            }),
            field('batch', 'batch', {
                x: 2,
                y: 13.5,
                w: 34,
                size: 8,
                bold: true,
                label: true,
            }),
            field('sbatch', 'supplierBatch', {
                x: 2,
                y: 18.5,
                w: 40,
                size: 6.5,
                label: true,
            }),
            field('supplier', 'supplier', {
                x: 2,
                y: 22.5,
                w: 40,
                size: 6.5,
                label: true,
            }),
            field('received', 'receivedOn', {
                x: 2,
                y: 26.5,
                w: 30,
                size: 6.5,
                label: true,
            }),
            field('expiry', 'expiry', {
                x: 36,
                y: 26.5,
                w: 32,
                size: 7,
                bold: true,
                label: true,
            }),
            field('qty', 'qty', {
                x: 2,
                y: 30.5,
                w: 30,
                size: 6.5,
                label: true,
            }),
            el('barcode', 'barcode', { x: 44, y: 2, w: 24, h: 9 }),
            field('split', 'split', {
                x: 44,
                y: 12,
                w: 24,
                size: 6.5,
                align: 'center',
            }),
            field('pharmacy', 'pharmacy', { x: 2, y: 35, w: 66, size: 5.5 }),
        ],
        updated: at(34, 9, 40),
        updatedBy: DEMO_ACTORS.avi,
    },
    {
        id: 'shipping',
        size: { ...STICKER_SIZES.shipping },
        elements: [
            el('logo', 'logo', { x: 2, y: 2, w: 26, h: 9 }),
            field('phone', 'pharmacyPhone', {
                x: 2,
                y: 12,
                w: 26,
                size: 6,
                align: 'center',
            }),
            field('patient', 'patient', {
                x: 31,
                y: 3,
                w: 67,
                size: 12,
                bold: true,
                label: true,
            }),
            field('address', 'address', { x: 31, y: 11, w: 67, size: 9 }),
            field('phone2', 'phone', {
                x: 31,
                y: 21,
                w: 40,
                size: 9,
                label: true,
            }),
            field('courier', 'courier', {
                x: 31,
                y: 29,
                w: 40,
                size: 8,
                label: true,
            }),
            field('order', 'orderId', {
                x: 72,
                y: 29,
                w: 26,
                size: 8,
                label: true,
            }),
            el('barcode', 'barcode', { x: 31, y: 37, w: 67, h: 12 }),
            field('tracking', 'tracking', {
                x: 31,
                y: 52,
                w: 67,
                size: 7,
                label: true,
            }),
        ],
        updated: at(60, 14, 5),
        updatedBy: DEMO_ACTORS.ronit,
    },
];

/**
 * The notes pool. A note prints on every preparation of the types it names —
 * or on all of them. Editing the text here changes every future print.
 */
export const STICKER_NOTES = [
    {
        id: 'sn-cool',
        text: L('לשמור בקירור לאחר פתיחה', 'Refrigerate after opening'),
        all: false,
        prepTypes: ['evap_tincture', 'decoction', 'hydrosol'],
        active: true,
        updated: at(40, 11, 20),
        updatedBy: DEMO_ACTORS.avi,
    },
    {
        id: 'sn-shake',
        text: L('לנער לפני שימוש', 'Shake before use'),
        all: false,
        prepTypes: ['tincture', 'classic_tincture', 'evap_tincture'],
        active: true,
        updated: at(40, 11, 22),
        updatedBy: DEMO_ACTORS.avi,
    },
    {
        id: 'sn-heat',
        text: L(
            'לא לנידוף — להרחיק ממקור חום ומאור ישיר',
            'Do not evaporate — keep away from heat and direct light',
        ),
        all: false,
        prepTypes: [
            'tincture',
            'classic_tincture',
            'essential_oil',
            'infused_oil',
        ],
        active: true,
        updated: at(40, 11, 25),
        updatedBy: DEMO_ACTORS.avi,
    },
    {
        id: 'sn-children',
        text: L('להרחיק מהישג ידם של ילדים', 'Keep out of reach of children'),
        all: true,
        prepTypes: [],
        active: true,
        updated: at(40, 11, 27),
        updatedBy: DEMO_ACTORS.avi,
    },
    {
        id: 'sn-dry',
        text: L(
            'לשמור במקום יבש וחשוך, באריזה סגורה',
            'Keep dry and dark, in a closed container',
        ),
        all: false,
        prepTypes: ['powder', 'classic_powder', 'tea', 'capsule'],
        active: true,
        updated: at(12, 9, 5),
        updatedBy: DEMO_ACTORS.ronit,
    },
    {
        id: 'sn-external',
        text: L('לשימוש חיצוני בלבד', 'External use only'),
        all: false,
        prepTypes: ['cream', 'gel', 'infused_oil', 'essential_oil'],
        active: true,
        updated: at(12, 9, 8),
        updatedBy: DEMO_ACTORS.ronit,
    },
    {
        id: 'sn-suppository',
        text: L(
            'לשמור בקירור · להוציא מהאריזה רק לפני השימוש',
            'Refrigerate · unwrap only before use',
        ),
        all: false,
        prepTypes: ['suppository'],
        active: false,
        updated: at(5, 16, 30),
        updatedBy: DEMO_ACTORS.ronit,
    },
];

const PRINTERS = [DEMO_ACTORS.aviLab, DEMO_ACTORS.danaPharmacist];

const prepCount = (item) =>
    Math.max(1, Number(item.packages) || 1) + (item.unit === 'capsule' ? 1 : 0);

/** The print log: prep labels for orders that reached the lab, item labels per receipt, a parcel label per shipment. */
export function buildStickerPrints(orders, receipts) {
    const rows = [];
    let n = 0;
    const push = (template, ref, count, detail, slot) => {
        n += 1;
        rows.push({
            id: `sp-${n}`,
            template,
            ref,
            count,
            detail,
            when: at(
                spread(`${slot}:day`, 0, 45),
                spread(`${slot}:hh`, 8, 17),
                spread(`${slot}:mm`, 0, 59),
            ),
            by: pickFrom(`${slot}:by`, PRINTERS),
        });
    };

    orders.forEach((order) => {
        const live = (order.items || []).filter(
            (item) => item.kind === 'formula' && !item.cancelled,
        );

        if (
            ['packed', 'sent', 'closed'].includes(order.status) &&
            live.length
        ) {
            const count = live.reduce((sum, item) => sum + prepCount(item), 0);

            push(
                'prep',
                order.id,
                count,
                `${live.length}`,
                `sticker:${order.id}:prep`,
            );
        }

        if (['sent', 'closed'].includes(order.status) && order.courier) {
            push(
                'shipping',
                order.id,
                1,
                order.courier,
                `sticker:${order.id}:ship`,
            );
        }
    });

    receipts.forEach((receipt) => {
        const count = (receipt.lines || []).reduce(
            (sum, line) => sum + Math.max(1, Number(line.labels) || 1),
            0,
        );

        push(
            'item',
            receipt.id,
            count,
            `${(receipt.lines || []).length}`,
            `sticker:${receipt.id}`,
        );
    });

    return rows.sort((a, b) => a.when.daysAgo - b.when.daysAgo);
}
