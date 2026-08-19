// Courier display names, resolved in one place.
//
// A courier's letter code is configuration, but the company name behind it is the
// pharmacy's own setting: if it typed one into the code mapping that name wins,
// otherwise the taxonomy label from the locale catalog is used.
import { useI18n } from 'vue-i18n';

import { useDeliveriesStore } from '@/stores/deliveries';

export function useCourierName() {
    const { t } = useI18n();
    const deliveries = useDeliveriesStore();

    /**
     * @param {string|null} id A courier id from config/org.js COURIERS.
     * @returns {string} The name to show, or an empty string when unassigned.
     */
    const courierName = (id) =>
        id ? deliveries.courierNameEdit(id) || t(`courier.${id}`) : '';

    return { courierName };
}
