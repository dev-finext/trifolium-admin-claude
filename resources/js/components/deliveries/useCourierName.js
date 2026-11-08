// Courier display names, resolved in one place — the taxonomy label from the
// locale catalog.
import { useI18n } from 'vue-i18n';

export function useCourierName() {
    const { t } = useI18n();

    /**
     * @param {string|null} id A courier id from config/org.js COURIERS.
     * @returns {string} The name to show, or an empty string when unassigned.
     */
    const courierName = (id) => (id ? t(`courier.${id}`) : '');

    return { courierName };
}
