// The prep sheet (דף הכנה) — the one document the lab works from.
//
// Designed from the data rather than copied from the SAP printout, which was not
// available as text. What it carries follows the specification: who and for
// whom, payment and delivery, the safety flags, every formula with its herbs in
// ascending item-code order (the pickers' walking order) and the FEFO batch each
// quantity comes out of, the item cards' production notes, the preparation type's
// fixed label text and method, the patient's instructions, the regulatory text,
// the other items in the same basket, and signature boxes for the four lab roles.
//
// Second-version material (dev/progress.js → `prep-sheet`).
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import { useLocalized } from '@/composables/useLocalized';
import { isSettled, LAB_ROLE_IDS, ORG, SAFETY_LEVEL_IDS } from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { esc, printHtml } from '@/lib/print';
import { useDeliveriesStore } from '@/stores/deliveries';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { shelfItems, trackedItems, useOrdersStore } from '@/stores/orders';

export function usePrepSheet() {
    const { t, locale } = useI18n();
    const { loc } = useLocalized();
    const { courierName } = useCourierName();
    const orders = useOrdersStore();
    const inventory = useInventoryStore();
    const items = useItemsStore();
    const deliveries = useDeliveriesStore();

    const text = (value) => esc(loc(value));

    /** One herb line: item code, FEFO batches for the quantity, production note, safety. */
    function herbRow(herb, unit, patient) {
        const stock =
            inventory.stock.find((row) => row.herbId === herb.id) || null;
        const card = stock ? items.itemBySku(stock.sku) : null;
        const plan = stock
            ? inventory.fifoPlan(stock.sku, herb.qty)
            : { steps: [], short: herb.qty };
        const batches = plan.steps
            .map((step) => `${step.batch.id} (${step.take})`)
            .join(', ');
        const flags = [];

        if (card?.safety) {
            const check = (ctx, on) => {
                const level = card.safety[ctx];

                if (on && level && level !== SAFETY_LEVEL_IDS[0]) {
                    flags.push(
                        t('orders.sheet.safetyFlag', {
                            ctx: t(`items.safetyContext.${ctx}`),
                            level: t(`items.safetyLevel.${level}`),
                        }),
                    );
                }
            };

            check('pregnancy', patient.preg);
            check('lactation', patient.bf);
        }

        return {
            code: card?.code || stock?.sku || '—',
            name: loc(herb.name),
            lat: herb.lat || '',
            qty: `${herb.qty} ${t(`orders.unit.${herb.unit || unit}`)}`,
            batches: batches || t('orders.sheet.noBatch'),
            short:
                plan.short > 0
                    ? t('orders.sheet.short', { n: plan.short })
                    : '',
            note: card?.notes?.production ? loc(card.notes.production) : '',
            flags,
        };
    }

    /** When the order was paid or cleared for credit, off its own audit trail. */
    function paymentLine(order) {
        if (order.credit && !order.creditPaid) {
            return t('orders.sheet.credit');
        }

        if (!isSettled(order)) {
            return t('orders.sheet.unpaid');
        }

        const paid = (order.audit || []).find(
            (row) => row.valueType === 'status' && row.to === 'new',
        );

        return paid?.when?.stamp
            ? t('orders.sheet.paidOn', { stamp: paid.when.stamp })
            : t('payment.paid');
    }

    function deliveryLine(order) {
        if (order.deliveryType === 'pickup') {
            const point = order.pickupPoint
                ? deliveries.pointById(order.pickupPoint)
                : null;

            return point
                ? t('orders.sheet.pickupAt', { name: loc(point.name) })
                : t('orders.sheet.pharmacy');
        }

        return order.courier
            ? t('orders.sheet.courier', { name: courierName(order.courier) })
            : t('fulfilment.courier');
    }

    function contentLine(item) {
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

    function formulaSection(order, item, index, total) {
        const type = items.prepTypeById(item.typeId);
        const typeName = type
            ? loc(type.name)
            : t(`preparationForm.${item.typeId}`);
        const rows = (item.herbs || [])
            .map((herb) => herbRow(herb, item.unit, order.patient))
            .sort((a, b) =>
                String(a.code).localeCompare(String(b.code), 'en', {
                    numeric: true,
                }),
            );
        const meta = [
            `${esc(t('orders.sheet.type'))}: ${esc(typeName)}`,
            `${esc(t('orders.sheet.content'))}: ${esc(contentLine(item))}`,
            item.concentration
                ? `${esc(t('orders.sheet.concentration'))}: <span class="num">${esc(item.concentration)}</span>`
                : '',
            item.evap
                ? `${esc(t('orders.sheet.evap'))}: ${esc(t(`orders.evaporation.${item.evap}`))}`
                : '',
            `${esc(t('orders.sheet.dose'))}: ${esc(
                t('orders.value.dose', {
                    qty: item.dose.qty,
                    unit: t(`orders.unit.${item.dose.unit}`),
                    times: item.dose.times,
                }),
            )} · ${esc(t(`orders.doseTiming.${item.timing}`))}`,
        ]
            .filter(Boolean)
            .join(' · ');
        const table = `<table><thead><tr>
            <th>${esc(t('orders.sheet.col.code'))}</th><th>${esc(t('orders.sheet.col.herb'))}</th>
            <th>${esc(t('orders.sheet.col.qty'))}</th><th>${esc(t('orders.sheet.col.batch'))}</th>
            <th>${esc(t('orders.sheet.col.note'))}</th></tr></thead><tbody>${rows
                .map(
                    (row) => `<tr>
                <td class="code">${esc(row.code)}</td>
                <td>${esc(row.name)}${row.lat ? ` <span class="small num">${esc(row.lat)}</span>` : ''}${
                    row.flags.length
                        ? `<div class="warn small">${row.flags.map(esc).join(' · ')}</div>`
                        : ''
                }</td>
                <td class="num">${esc(row.qty)}</td>
                <td class="code">${esc(row.batches)}${row.short ? ` <span class="small">${esc(row.short)}</span>` : ''}</td>
                <td>${esc(row.note)}</td></tr>`,
                )
                .join('')}</tbody></table>`;
        const recipe = type?.recipe?.length
            ? `<ol>${type.recipe
                  .map(
                      (step) =>
                          `<li>${text(step.text)}${step.minutes ? ` <span class="small">${esc(t('orders.sheet.minutes', { n: step.minutes }))}</span>` : ''}</li>`,
                  )
                  .join('')}</ol>`
            : `<div class="small">${esc(t('orders.sheet.recipeMissing'))}</div>`;
        const instructions = item.patientInstructions
            ? loc(item.patientInstructions)
            : orders.printTexts
              ? loc(orders.printTexts.instructionsDefault)
              : '';

        return `
            <h2>${esc(t('orders.sheet.formula', { n: index + 1, total }))} · ${text(item.name)} <span class="barcode">${esc(item.id)}</span></h2>
            <div class="meta">${meta}</div>
            ${table}
            <div class="grid" style="grid-template-columns: 1fr 1fr">
                <div class="box"><strong>${esc(t('orders.sheet.labelText'))}</strong><div>${type?.labelText ? text(type.labelText) : '—'}</div>
                    <strong>${esc(t('orders.sheet.recipe'))}</strong>${recipe}</div>
                <div class="box"><strong>${esc(t('orders.sheet.internalNotes'))}</strong><div>${text(item.internalNotes)}</div>
                    <strong>${esc(t('orders.sheet.instructions'))}</strong><div>${esc(instructions)}</div></div>
            </div>`;
    }

    /** The whole document for one order, as body markup. */
    function build(order) {
        const formulas = trackedItems(order).filter((item) => !item.cancelled);
        const shelf = shelfItems(order);
        const patient = order.patient;
        const practitioner = order.practitioner;
        const safety = [
            patient.preg && t('orders.sheet.pregnant'),
            patient.bf && t('orders.sheet.breastfeeding'),
            patient.meds?.length &&
                t('orders.sheet.meds', { list: patient.meds.join(', ') }),
        ].filter(Boolean);
        const roles = LAB_ROLE_IDS.map((role) => {
            const value = order.lab?.[role];

            return `<div><div class="sig"></div><div class="small">${esc(t(`orders.labRole.${role}`))}${
                value
                    ? ` — ${esc(t('orders.sheet.signed', { name: loc(value.by), when: value.when.stamp }))}`
                    : ''
            }</div></div>`;
        }).join('');
        const basket = [
            ...formulas.map((item) => text(item.name)),
            ...shelf.map(
                (line) =>
                    `${text(line.name)} · ${esc(t('orders.sheet.shelfLine', { qty: line.qty }))}`,
            ),
        ];

        return `
            ${order.urgent ? `<div class="warn"><strong>${esc(t('orders.sheet.urgent'))}</strong></div>` : ''}
            <h1>${esc(t('orders.sheet.title'))} · <span class="barcode">${esc(order.id)}</span></h1>
            <div class="meta">${text(ORG.name)} · ${esc(t('orders.sheet.printedOn', { date: fmtISO(isoDaysAgo(0)) }))} · ${esc(
                t('orders.sheet.total', {
                    n: formulas.length,
                    shelf: shelf.length,
                }),
            )}</div>
            <div class="grid">
                <div class="box"><strong>${esc(t('orders.sheet.practitioner'))}</strong><div>${text(practitioner.name)}</div>
                    <div class="small num">${esc(practitioner.code)} · ${esc(practitioner.phone)}</div>
                    ${practitioner.specialTerms ? `<div class="warn small">${esc(t('orders.sheet.specialTerms', { text: loc(practitioner.specialTerms) }))}</div>` : ''}</div>
                <div class="box"><strong>${esc(t('orders.sheet.patient'))}</strong><div>${text(patient.name)}</div>
                    <div class="small num">${esc(patient.phone)}</div>
                    <div class="small">${esc(t('orders.value.ageSex', { age: patient.age, sex: t(`orders.sex.${patient.sex}`) }))}</div></div>
                <div class="box"><strong>${esc(t('orders.sheet.payment'))}</strong><div>${esc(paymentLine(order))}</div>
                    <div class="small">${esc(t(`payer.${order.payer}`))}</div></div>
                <div class="box"><strong>${esc(t('orders.sheet.delivery'))}</strong><div>${esc(deliveryLine(order))}</div>
                    <div class="small">${esc(t(`fulfilment.${order.deliveryType}`))}</div></div>
            </div>
            <div class="box${safety.length ? ' warn' : ''}"><strong>${esc(t('orders.sheet.safety'))}</strong> ${
                safety.length
                    ? safety.map(esc).join(' · ')
                    : esc(t('orders.sheet.noSafety'))
            }</div>
            ${formulas.map((item, i) => formulaSection(order, item, i, formulas.length)).join('')}
            <h2>${esc(t('orders.sheet.basket'))}</h2>
            <div>${basket.length ? basket.join(' · ') : esc(t('orders.sheet.noBasket'))}</div>
            ${orders.printTexts ? `<h2>${esc(t('orders.sheet.regulatory'))}</h2><div class="small">${text(orders.printTexts.regulatoryText)}</div>` : ''}
            <h2>${esc(t('orders.sheet.roles'))}</h2>
            <div class="grid">${roles}</div>
            <h2>${esc(t('orders.sheet.barcodes'))}</h2>
            <div class="code">${[order.id, ...formulas.map((item) => item.id)].map(esc).join(' · ')}</div>`;
    }

    /**
     * Open the prep sheet of an order in the print dialog and log the print.
     *
     * @returns {Promise<boolean>} false when the browser blocked the window.
     */
    async function printPrepSheet(order) {
        const ok = printHtml(
            `${t('orders.sheet.title')} ${order.id}`,
            build(order),
            locale.value === 'he' ? 'rtl' : 'ltr',
        );

        if (ok) {
            await orders.logPrepSheet(order.id);
        }

        return ok;
    }

    return { printPrepSheet, buildPrepSheet: build };
}
