// The three actions an agent confirms from the queue: assign a courier, mark an
// order as dispatched, and tell a pickup customer their order is ready.
//
// Each holds the order the confirmation is about; the screen binds those refs to
// its modal and confirm dialogs. The wording is resolved here so the screen
// template stays bare.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useDeliveriesStore } from '@/stores/deliveries';

export function useDeliveryActions() {
    const { t } = useI18n();
    const { loc } = useLocalized();
    const { push } = useToast();
    const deliveries = useDeliveriesStore();
    const { courierName } = useCourierName();

    // ---- courier assignment ------------------------------------------------

    const assigning = ref(null);

    async function saveAssignment(payload) {
        const order = assigning.value;

        assigning.value = null;

        if (!order) {
            return;
        }

        await deliveries.assignCourier(order.id, payload);

        const courier = courierName(payload.courier);

        push({
            title: t('deliveries.assign.done.title'),
            body: payload.tracking
                ? t('deliveries.assign.done.body', {
                      courier,
                      tracking: payload.tracking,
                  })
                : t('deliveries.assign.done.bodyNoTracking', { courier }),
        });
    }

    // ---- dispatch ----------------------------------------------------------

    const shipping = ref(null);

    const shipBody = computed(() =>
        shipping.value
            ? t('deliveries.ship.body', {
                  id: shipping.value.id,
                  courier: courierName(shipping.value.courier),
              })
            : '',
    );

    const shipEffects = computed(() => [
        t('deliveries.ship.effect.status'),
        t('deliveries.ship.effect.date'),
        t('deliveries.ship.effect.message'),
    ]);

    async function confirmShip() {
        const order = shipping.value;

        shipping.value = null;

        if (!order) {
            return;
        }

        const done = await deliveries.markShipped(order.id, order.sentOn);

        if (!done) {
            return;
        }

        push({
            title: t('deliveries.ship.done.title'),
            body: t('deliveries.ship.done.body', {
                id: order.id,
                courier: courierName(order.courier),
            }),
        });
    }

    // ---- pickup notice -----------------------------------------------------

    const notifying = ref(null);

    const notifyBody = computed(() =>
        notifying.value
            ? t('deliveries.notify.body', {
                  name: loc(notifying.value.patient.name),
                  phone: notifying.value.patient.phone,
                  id: notifying.value.id,
              })
            : '',
    );

    const notifyEffects = computed(() => [
        t('deliveries.notify.effect.template'),
        t('deliveries.notify.effect.details'),
    ]);

    async function confirmNotify() {
        const order = notifying.value;

        notifying.value = null;

        if (!order) {
            return;
        }

        await deliveries.notifyPickupReady(order.id);
        push({
            title: t('deliveries.notify.done.title'),
            body: t('deliveries.notify.done.body', {
                name: loc(order.patient.name),
            }),
        });
    }

    return {
        assigning,
        saveAssignment,
        shipping,
        shipBody,
        shipEffects,
        confirmShip,
        notifying,
        notifyBody,
        notifyEffects,
        confirmNotify,
    };
}
