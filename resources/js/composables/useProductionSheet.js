// דף עבודה לייצור — the paper a production run goes to the bench with.
//
// Not the same document as a customer order's preparation sheet: that one is
// about a patient, their safety flags and their formulas. This one is about a
// batch of one item — what to take off the shelf, how much, and what to write
// down when it comes out.
//
// Everything a run needs is on one page, because the page is what stands on the
// bench while the hands are busy: the recipe, the components with their
// quantities, and empty boxes for the yield, the waste, the batch number and
// the signature. The empty boxes are the point — the lab writes on this and the
// numbers are typed back in afterwards.
import { useI18n } from 'vue-i18n';

import { useLocalized } from '@/composables/useLocalized';
import { ORG } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { esc, printHtml } from '@/lib/print';
import { useItemsStore } from '@/stores/items';

export function useProductionSheet() {
    const { t, locale } = useI18n();
    const { loc } = useLocalized();
    const items = useItemsStore();

    const text = (value) => esc(loc(value));
    const unit = (uom) => esc(t(`inventory.unit.${uom || 'unit'}`));

    /**
     * One component: what to take, how much, and room to tick it off.
     *
     * `plannedQty` and not `qty`: `qty` is what the recipe asks for one batch,
     * and the planner has already multiplied it by the number of batches in
     * this run. The bench needs the run's figure.
     */
    function componentRow(component) {
        const card = items.rowBySku(component.sku);

        return `<tr>
            <td class="num">${esc(component.sku)}</td>
            <td>${esc(card?.names?.he || component.sku)}</td>
            <td class="num">${esc(num(component.plannedQty, 3))} ${unit(component.uom)}</td>
            <td class="tick"></td>
            <td class="write"></td>
        </tr>`;
    }

    /** The whole document for one run, as body markup. */
    function build(order) {
        const card = items.rowBySku(order.parentSku);
        const components = order.components || [];
        const boxes = ['yieldQty', 'wasteQty', 'batchNo', 'expiresOn']
            .map(
                (field) =>
                    `<div class="box"><strong>${esc(t(`production.sheet.${field}`))}</strong><div class="write tall"></div></div>`,
            )
            .join('');

        return `
            <h1>${esc(t('production.sheet.title'))} · <span class="barcode">${esc(order.id)}</span></h1>
            <div class="meta">${text(ORG.name)} · ${esc(
                t('production.sheet.printedOn', {
                    date: fmtISO(isoDaysAgo(0)),
                }),
            )}</div>

            <div class="grid">
                <div class="box"><strong>${esc(t('production.sheet.item'))}</strong>
                    <div>${esc(card?.names?.he || order.parentSku)}</div>
                    <div class="small num">${esc(order.parentSku)}</div></div>
                <div class="box"><strong>${esc(t('production.sheet.recipe'))}</strong>
                    <div>${text(order.name)}</div>
                    <div class="small">${esc(t('production.sheet.version', { v: order.bomVersion || 1 }))}</div></div>
                <div class="box"><strong>${esc(t('production.sheet.planned'))}</strong>
                    <div class="num">${esc(num(order.plannedQty, 3))} ${unit(order.uom)}</div></div>
                <div class="box"><strong>${esc(t('production.sheet.opened'))}</strong>
                    <div>${esc(order.createdOn?.stamp || '')}</div>
                    <div class="small">${text(order.by)}</div></div>
            </div>

            <h2>${esc(t('production.sheet.components'))}</h2>
            <table>
                <thead><tr>
                    <th>${esc(t('production.sheet.colSku'))}</th>
                    <th>${esc(t('production.sheet.colName'))}</th>
                    <th>${esc(t('production.sheet.colQty'))}</th>
                    <th>${esc(t('production.sheet.colTaken'))}</th>
                    <th>${esc(t('production.sheet.colBatch'))}</th>
                </tr></thead>
                <tbody>${components.map(componentRow).join('')}</tbody>
            </table>

            <h2>${esc(t('production.sheet.result'))}</h2>
            <div class="grid">${boxes}</div>

            <h2>${esc(t('production.sheet.signature'))}</h2>
            <div class="grid">
                <div><div class="sig"></div><div class="small">${esc(t('production.sheet.madeBy'))}</div></div>
                <div><div class="sig"></div><div class="small">${esc(t('production.sheet.checkedBy'))}</div></div>
            </div>`;
    }

    /**
     * Open the work sheet in the print dialog.
     *
     * @returns {boolean} false when the browser blocked the window.
     */
    function printProductionSheet(order) {
        return printHtml(
            `${t('production.sheet.title')} ${order.id}`,
            build(order),
            locale.value === 'he' ? 'rtl' : 'ltr',
        );
    }

    return { printProductionSheet, buildProductionSheet: build };
}
