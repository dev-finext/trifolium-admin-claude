// The CSV behind the queue's export button.
//
// Every cell is resolved here — chrome words from the locale catalog, record
// content in the active locale — so the file reads the way the screen did at the
// moment the agent pressed the button.
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ORG } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { deliveriesToCsv, poaState } from '@/stores/deliveries';

/** Byte-order mark: without it a spreadsheet opens the export as mojibake. */
const BOM = String.fromCharCode(0xfeff);

/**
 * @param {import('vue').Ref<Array>} rows The filtered deliveries on screen.
 */
export function useDeliveryExport(rows) {
    const { t } = useI18n();
    const { loc } = useLocalized();
    const { push } = useToast();
    const { courierName } = useCourierName();

    function addressText(order) {
        if (order.deliveryType === 'pickup') {
            return loc(ORG.address);
        }

        if (!order.addressProvided) {
            return t('deliveries.row.addressPending');
        }

        return t('deliveries.row.street', {
            street: loc(order.address.street),
            num: order.address.num,
            city: loc(order.address.city),
        });
    }

    /** Hand the reader the file. The BOM is what makes a spreadsheet read Hebrew. */
    function download(name, text) {
        const blob = new Blob([BOM, text], {
            type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
    }

    function exportRows() {
        const headers = [
            t('deliveries.col.order'),
            t('deliveries.col.recipient'),
            t('labels.phone'),
            t('deliveries.col.type'),
            t('deliveries.col.address'),
            t('deliveries.col.courier'),
            t('deliveries.col.tracking'),
            t('deliveries.col.status'),
            t('deliveries.col.date'),
            t('deliveries.poa.col.state'),
        ];
        const body = rows.value.map((order) => [
            order.id,
            loc(order.patient.name),
            order.patient.phone,
            t(`fulfilment.${order.deliveryType}`),
            addressText(order),
            courierName(order.courier),
            order.tracking || '',
            t(`status.${order.status}`),
            fmtISO(order.iso),
            t(`deliveries.poa.state.${poaState(order)}`),
        ]);
        const file = t('deliveries.export.file', { date: isoDaysAgo(0) });

        download(file, deliveriesToCsv(headers, body));
        push({
            title: t('deliveries.export.done'),
            body: t('deliveries.export.body', { n: body.length, file }),
        });
    }

    return { exportRows };
}
