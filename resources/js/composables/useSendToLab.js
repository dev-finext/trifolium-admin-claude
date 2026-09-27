// שליחת הזמנה למעבדה — the four things that happen together.
//
// Natalie's description of the step is a single decision with four
// consequences: the material is committed to named batches, the prep sheet
// comes out, the labels come out, and the order moves to the lab. They belong
// together because doing three of them is worse than doing none — a sheet
// printed against batches nobody reserved is a sheet the lab cannot trust.
//
// Two of the four are browser print dialogs, and a browser will block the
// second window of a pair it did not expect. So the run reports what actually
// happened rather than claiming success: the caller shows which steps came out
// and which have to be printed again from the order itself.
//
// The order of operations is deliberate. Batches first, because the sheet and
// the labels quote them. Status last, because it is the record that the rest
// was done.
import { useI18n } from 'vue-i18n';

import { usePrepSheet } from '@/composables/usePrepSheet';
import { useStickerData } from '@/composables/useStickerData';
import { useInventoryStore } from '@/stores/inventory';
import { canSendToLab, useOrdersStore } from '@/stores/orders';
import { useStickersStore } from '@/stores/stickers';

export function useSendToLab() {
    const { t } = useI18n();
    const orders = useOrdersStore();
    const inventory = useInventoryStore();
    const stickers = useStickersStore();
    const { printPrepSheet } = usePrepSheet();
    const { labelsForOrder, printStickers } = useStickerData();

    /**
     * Run the step for one order.
     *
     * @param {object} order
     * @param {{reason?: string, print?: boolean}} [opts] `print: false` skips
     *   both dialogs, which is what a run over many orders wants — twenty print
     *   windows is not a batch action, it is an accident.
     * @returns {Promise<object>} what each of the four steps did.
     */
    async function sendOne(order, { reason = '', print = true } = {}) {
        const result = {
            id: order?.id || null,
            ok: false,
            batches: 0,
            short: [],
            alreadyAllocated: false,
            sheet: false,
            labels: 0,
            moved: false,
            blocked: false,
        };

        if (!order || !canSendToLab(order)) {
            return result;
        }

        // 1 — the material is committed to named batches.
        const allocation = await inventory.allocateToOrder(order);

        result.batches = allocation.rows.length;
        result.short = allocation.short;
        result.alreadyAllocated = allocation.already;

        // 2 — the prep sheet the lab works from.
        //
        // A print that fails must not take the rest of the step with it. The
        // material is already committed by the time we get here, so abandoning
        // the run would leave batches reserved for an order that never moved —
        // the one outcome worse than a sheet that has to be printed again.
        if (print) {
            try {
                result.sheet = await printPrepSheet(order);
            } catch {
                result.sheet = false;
            }
        }

        // 3 — the labels for the packages.
        if (print) {
            try {
                const template = stickers.templateById('prep');
                const labels = template ? labelsForOrder(order) : [];

                if (template && labels.length) {
                    const ok = await printStickers(template, labels, order.id);

                    result.labels = ok ? labels.length : 0;
                }
            } catch {
                result.labels = 0;
            }
        }

        result.blocked = print && (!result.sheet || result.labels === 0);

        // 4 — and the order is in the lab.
        const moved = await orders.sendToLab(
            order.id,
            reason || t('orders.lab.reason'),
        );

        result.moved = Boolean(moved);
        result.ok = result.moved;

        return result;
    }

    /** The same for a selection. Nothing prints: see `print` above. */
    async function sendMany(list, { reason = '' } = {}) {
        const done = [];

        for (const order of list) {
            done.push(await sendOne(order, { reason, print: false }));
        }

        return done;
    }

    return { sendOne, sendMany };
}
