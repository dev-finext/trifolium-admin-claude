// The delivery queue's columns.
//
// They live outside the component because two places need them: the queue that
// renders the table, and the screen above it that sorts the whole list before
// cutting a page out of it. A column's `sortValue` is the sort, so the screen
// cannot sort without the same definitions the header row was built from.
import { COURIER, ORDER_STATUS_IDS } from '@/config';

/**
 * @param {Function} t  The screen's `t`.
 * @param {Function} courierName  Resolves a courier id to its name.
 */
export function deliveryCols(t, courierName) {
    return [
        {
            k: 'id',
            label: t('deliveries.col.order'),
            nowrap: true,
            sortable: true,
        },
        {
            k: 'to',
            label: t('deliveries.col.recipient'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => order.patient.name,
        },
        {
            k: 'type',
            label: t('deliveries.col.type'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => t(`fulfilment.${order.deliveryType}`),
        },
        {
            k: 'addr',
            label: t('deliveries.col.address'),
            sortable: true,
            sortValue: (order) => order.address.city,
        },
        {
            k: 'courier',
            label: t('deliveries.col.courier'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => courierName(order.courier),
        },
        {
            k: 'track',
            label: t('deliveries.col.tracking'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => order.tracking || '',
        },
        {
            k: 'st',
            label: t('deliveries.col.status'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => ORDER_STATUS_IDS.indexOf(order.status),
        },
        {
            k: 'date',
            label: t('deliveries.col.date'),
            nowrap: true,
            sortable: true,
            sortValue: (order) => order.iso,
        },
        { k: 'act', label: t('deliveries.col.actions'), nowrap: true },
    ];
}

export { COURIER };
