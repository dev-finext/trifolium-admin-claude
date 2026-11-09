// The two labels a production run prints, through the stickers module — the
// templates there are the pharmacy's to edit, and every print run is logged
// there with the rest.
//
//   order label  the `production` template. It goes to the lab with the work
//                sheet, so nothing stands on the bench without a name until it
//                has a batch.
//   batch labels the `item` template — the batch label the pharmacy already
//                prints for goods received — one per jar or bottle of what came
//                back, the count from the containers (config/batches.js).
//
// The stickers screen prints the same labels from the same sources; this is
// the shortcut from the production order itself.
import { useStickerData } from '@/composables/useStickerData';
import { useStickersStore } from '@/stores/stickers';

export function useProductionLabels() {
    const stickers = useStickersStore();
    const { labelsForProduction, labelsForProductionReceipt, printStickers } =
        useStickerData();

    /**
     * Open the order label in the print dialog and log the run.
     *
     * @returns {Promise<boolean>} false when the browser blocked the window.
     */
    async function printOrderLabel(order, copies = 1) {
        const template = stickers.templateById('production');

        return template
            ? printStickers(
                  template,
                  labelsForProduction(order, copies),
                  order.id,
              )
            : false;
    }

    /**
     * Open a receipt's batch labels in the print dialog, `count` of them, and
     * log the run.
     *
     * @returns {Promise<boolean>} false when the browser blocked the window.
     */
    async function printBatchLabels(order, receipt, count) {
        const template = stickers.templateById('item');

        return template
            ? printStickers(
                  template,
                  labelsForProductionReceipt(order, receipt, count),
                  `${order.id}/${receipt.n}`,
              )
            : false;
    }

    return { printOrderLabel, printBatchLabels };
}
