// What goes on a label, and how a template becomes markup.
//
// The template says where things sit; this composable says what they are: for
// a preparation label the order line, the preparation type's fixed text and
// shelf life, the notes pool and the lab's regulatory text; for an item label
// the goods-receipt line and its batch; for a parcel the order's address and
// courier; for a production order its number and dates. A receipt from
// production prints the item label too — it is a batch like any other — one
// per container. The same markup renders the on-screen preview and the print
// run.
import { useI18n } from 'vue-i18n';

import { useLocalized } from '@/composables/useLocalized';
import {
    batchBarcode,
    ITEM_UOM_IDS,
    labelCount,
    labelPackOf,
    ORG,
    STICKER_RULES,
} from '@/config';
import { code39Svg, code39Value } from '@/lib/barcode';
import { containerBarcode, orderContainers } from '@/lib/containers';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { esc, printHtml } from '@/lib/print';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { trackedItems, useOrdersStore } from '@/stores/orders';
import { useStickersStore } from '@/stores/stickers';

/** `iso` plus a number of months, as an ISO date. */
function addMonths(iso, months) {
    const date = new Date(`${iso}T00:00:00`);

    date.setMonth(date.getMonth() + months);

    return date.toISOString().slice(0, 10);
}

export function useStickerData() {
    const { t } = useI18n();
    const { loc } = useLocalized();
    const items = useItemsStore();
    const orders = useOrdersStore();
    const inventory = useInventoryStore();
    const stickers = useStickersStore();
    const dataset = useDatasetStore();

    /** The item's other name — unless it only repeats the first. */
    const foreignOf = (card) => {
        const other = String(card?.names?.en || '').trim();

        return other && other !== String(card?.names?.he || '').trim()
            ? other
            : '';
    };

    const pharmacy = () => ({
        pharmacy: loc(ORG.name),
        pharmacyPhone: ORG.phone,
    });

    function contentText(item) {
        const unit = t(`orders.unit.${item.unit}`);
        const packages = item.packages || 1;

        return packages > 1
            ? t('orders.value.content', {
                  total: item.vol,
                  unit,
                  packages,
                  size: Math.round(item.vol / packages),
              })
            : t('orders.value.contentOne', { total: item.vol, unit });
    }

    /** Field values for label `index` of `total` on one preparation line. */
    function prepData(order, item, index = 1, total = 1) {
        const type = items.prepTypeById(item.typeId);
        const settings = orders.printTexts || {};
        const made = isoDaysAgo(0);
        const months = type?.expiryMonths || STICKER_RULES.fallbackExpiryMonths;
        const lineNo =
            orderContainers(order).find((row) => row.item.id === item.id)
                ?.lineNo || 1;
        // `total` can run past the item's real container count — a few spare
        // labels for capsules, never a container of their own (lib/containers.js)
        // — so a spare repeats the last real container's own barcode rather than
        // inventing one the station would never find.
        const containerNo = Math.min(index, item.packages || 1);

        return {
            ...pharmacy(),
            patient: loc(order.patient.name),
            practitioner: loc(order.practitioner.name),
            formula: loc(item.name),
            prepType: type
                ? loc(type.name)
                : t(`preparationForm.${item.typeId}`),
            content: contentText(item),
            concentration: item.concentration || '',
            instructions:
                item.patientInstructions ||
                loc(settings.instructionsDefault) ||
                '',
            typeText: type?.labelText ? loc(type.labelText) : '',
            notes: stickers
                .notesFor(item.typeId)
                .map((note) => loc(note.text))
                .join(' · '),
            regulatory: loc(settings.regulatoryText) || '',
            madeOn: fmtISO(made),
            expiry: fmtISO(addMonths(made, months)),
            orderId: order.id,
            split: `${index}/${total}`,
            barcode: containerBarcode(order.id, lineNo, containerNo),
        };
    }

    /** Field values for label `index` of `total` on one goods-receipt line. */
    function itemData(receipt, line, index = 1, total = 1) {
        const card = items.itemBySku(line.sku);
        const stock = inventory.itemBySku(line.sku);
        const unit =
            line.unit && ITEM_UOM_IDS.includes(line.unit)
                ? t(`items.uom.${line.unit}`)
                : line.unit || '';

        return {
            ...pharmacy(),
            // The item's own name, SAP's ItemName, whatever language the
            // console is in: the label is printed for the shelf, and the
            // Chinese name has a line of its own under it.
            itemName: card ? card.names.he : loc(stock?.name) || line.sku,
            // V3 — the botanical or Chinese name, as the printed label shows it.
            // SAP's FrgnName sometimes just repeats the item's own name; the
            // label does not print the same line twice.
            foreignName: foreignOf(card),
            itemCode: card?.code || line.sku,
            batch: inventory.batchNo(line.batch) || line.batch || '',
            supplierBatch: line.supplierBatch || '',
            supplier: loc(receipt.supplier),
            receivedOn: receipt.when?.iso ? fmtISO(receipt.when.iso) : '',
            // V3 — the supplier's manufacturing date, which is what the
            // printed label calls "תאריך ייצור". Empty when the delivery note
            // did not carry one, rather than showing the receipt date under a
            // heading that says the goods were made that day.
            madeOn: line.madeOn ? fmtISO(line.madeOn) : '',
            expiry: line.expiry ? fmtISO(line.expiry) : '',
            qty: `${line.qty} ${unit}`.trim(),
            // "חלוקה" — which of the containers the quantity was divided into
            // this label goes on. Natalie: "אם לא בחרתי חלוקה השדה יודפס ריק",
            // so a single label leaves the box empty rather than saying 1/1.
            split: total > 1 ? `${index}/${total}` : '',
            barcode: batchBarcode(
                card?.code || line.sku,
                inventory.batchNo(line.batch) || line.batch,
            ),
        };
    }

    /** Field values for a production order's own label. */
    function productionData(order) {
        const card = items.itemBySku(order.parentSku);

        return {
            ...pharmacy(),
            itemName: card ? card.names.he : loc(order.name),
            foreignName: foreignOf(card),
            itemCode: card?.code || order.parentSku,
            productionOrder: order.id,
            // The day the run went to the bench — the order's date, which is
            // what the pharmacy's label calls "תאריך ייצור".
            productionDate: fmtISO(order.issuedOn?.iso || order.createdOn?.iso),
            dueOn: order.dueOn ? fmtISO(order.dueOn) : '',
            barcode: order.id,
        };
    }

    /** The production order's label — one, or as many as the lab asks for. */
    function labelsForProduction(order, copies = 1) {
        const total = Math.max(1, Math.round(Number(copies) || 1));
        const data = productionData(order);

        return Array.from({ length: total }, (_, i) => ({
            key: `${order.id}-${i + 1}`,
            data,
        }));
    }

    /**
     * How many batch labels one receipt from production needs: what the person
     * printed, or else what its containers come to (config/batches.js).
     */
    function productionLabelCount(order, receipt, fallback = 1) {
        if (receipt.labels != null) {
            return receipt.labels;
        }

        const stock = inventory.itemBySku(order.parentSku);

        return (
            labelCount(
                receipt.stockQty ?? receipt.qty,
                stock?.unit || order.uom,
                labelPackOf({
                    item: items.itemBySku(order.parentSku),
                    settings: dataset.data.inventorySettings,
                }),
            ) ?? fallback
        );
    }

    /**
     * The batch labels for one receipt from production — the item label, one
     * per jar or bottle, numbered 1/n … n/n like a goods receipt's. The
     * quantity on each is what one container holds when that is known.
     */
    function labelsForProductionReceipt(order, receipt, count = null) {
        const total = Math.max(
            1,
            Math.round(
                Number(count ?? productionLabelCount(order, receipt)) || 1,
            ),
        );
        const batch = inventory.batchById(receipt.batch);
        const stock = inventory.itemBySku(order.parentSku);
        const pack = labelPackOf({
            item: items.itemBySku(order.parentSku),
            settings: dataset.data.inventorySettings,
        });
        const line = {
            sku: order.parentSku,
            batch: receipt.batch,
            supplierBatch: '',
            madeOn: batch?.madeOn || receipt.when?.iso || null,
            expiry: batch?.expiry || receipt.expiresOn || null,
            qty: pack ? pack.qty : (receipt.stockQty ?? receipt.qty),
            unit: pack ? pack.uom : stock?.unit || order.uom,
        };
        const source = { supplier: null, when: receipt.when };

        return Array.from({ length: total }, (_, i) => ({
            key: `${order.id}-${receipt.n}-${i + 1}`,
            line,
            data: itemData(source, line, i + 1, total),
        }));
    }

    /** Every preparation label an order needs, in print order. */
    function labelsForOrder(order) {
        const rows = [];

        trackedItems(order)
            .filter((item) => !item.cancelled)
            .forEach((item) => {
                const total = stickers.prepCount(item);

                for (let i = 1; i <= total; i += 1) {
                    rows.push({
                        key: `${item.id}-${i}`,
                        item,
                        data: prepData(order, item, i, total),
                    });
                }
            });

        return rows;
    }

    /** Every item label a goods receipt asked for. */
    function labelsForReceipt(receipt) {
        const rows = [];

        (receipt.lines || []).forEach((line, at) => {
            const total = stickers.itemCount(line);

            for (let i = 1; i <= total; i += 1) {
                rows.push({
                    key: `${receipt.id}-${at}-${i}`,
                    line,
                    data: itemData(receipt, line, i, total),
                });
            }
        });

        return rows;
    }

    /**
     * What a field says before its value: the element's own caption when the
     * template gives one — the batch label writes "אצווה:" and "תאריך
     * תפוגה:", as the pharmacy's label does — or else the field's name. With
     * `captionW` the captions of a column of fields line up, so the values
     * start on one edge.
     */
    function captionHtml(element) {
        const own = element.caption ? loc(element.caption) : '';
        const text = own || `${t(`stickers.field.${element.field}`)}:`;
        const style = [
            own ? 'font-weight:400' : 'opacity:.7',
            element.captionW
                ? `display:inline-block;min-width:${element.captionW}mm`
                : '',
        ]
            .filter(Boolean)
            .join(';');

        return `<span style="${style}">${esc(text)}</span> `;
    }

    /**
     * One element as positioned markup. Empty values print nothing — except
     * a boxed field, whose box and caption are part of the label's layout and
     * print empty, the way "חלוקה" does on a batch that was not divided.
     */
    function elementHtml(element, data) {
        const style = [
            'position:absolute',
            `right:${element.x}mm`,
            `top:${element.y}mm`,
            `width:${element.w}mm`,
            `font-size:${element.size}pt`,
            'line-height:1.25',
            'overflow:hidden',
            element.bold ? 'font-weight:700' : '',
            `text-align:${element.align || 'start'}`,
            element.box
                ? 'border:0.35mm solid #1f2e1d;border-radius:1.2mm;padding:0.5mm 1.2mm;box-sizing:border-box'
                : '',
        ]
            .filter(Boolean)
            .join(';');

        if (element.kind === 'barcode') {
            const value = code39Value(data.barcode);

            return `<div style="${style};height:${element.h || 8}mm"><div style="height:calc(100% - 2.4mm)">${code39Svg(value)}</div><div style="font:5.5pt ui-monospace,Consolas,monospace;text-align:center;direction:ltr;letter-spacing:.06em">${esc(value)}</div></div>`;
        }

        if (element.kind === 'logo') {
            return `<div style="${style};height:${element.h || 8}mm;display:flex;align-items:center;justify-content:center;border:0.3mm solid #1f2e1d;border-radius:1.5mm;font-weight:700;font-size:${element.size || 8}pt">${esc(loc(ORG.name))}</div>`;
        }

        if (element.kind === 'text') {
            return `<div style="${style}">${esc(loc(element.text))}</div>`;
        }

        const value = data[element.field] ?? '';
        const empty = value === '' || value === null;

        if (empty && !element.box) {
            return '';
        }

        const prefix = element.label ? captionHtml(element) : '';

        return `<div style="${style}">${prefix}${empty ? '' : esc(value)}</div>`;
    }

    /** The whole label as markup, sized in millimetres. */
    function stickerHtml(template, data) {
        const { w, h } = template.size;
        const inner = (template.elements || [])
            .map((element) => elementHtml(element, data || {}))
            .join('');

        return `<div class="stk" dir="rtl" style="position:relative;width:${w}mm;height:${h}mm;overflow:hidden;background:#fff;color:#1f2e1d;font-family:'Segoe UI',Arial,sans-serif">${inner}</div>`;
    }

    /**
     * Hand a print run to the browser's print dialog, one label per page, and
     * record it. Returns false when the browser blocked the window.
     */
    async function printStickers(template, labels, ref) {
        const { w, h } = template.size;
        const css = `<style>@page{size:${w}mm ${h}mm;margin:0}body{margin:0;padding:0}.stk{page-break-after:always;break-after:page}</style>`;
        const body =
            css +
            labels.map((label) => stickerHtml(template, label.data)).join('');
        const ok = printHtml(
            `${t(`stickers.template.${template.id}`)} · ${ref}`,
            body,
            'rtl',
        );

        if (ok) {
            await stickers.recordPrint({
                template: template.id,
                ref,
                count: labels.length,
            });
        }

        return ok;
    }

    return {
        prepData,
        itemData,
        productionData,
        labelsForOrder,
        labelsForReceipt,
        labelsForProduction,
        labelsForProductionReceipt,
        productionLabelCount,
        stickerHtml,
        printStickers,
    };
}
