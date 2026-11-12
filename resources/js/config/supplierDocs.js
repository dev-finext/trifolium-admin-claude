// מסמכי ספק — the documents goods arrive on, and the tax invoices that bill
// them (12.11.2026).
//
// **For production — the whole model in one place.**
//
// Every goods receipt is a supplier document, and the person booking the goods
// in says which kind at the top of the receipt screen, for that delivery:
//
//   delivery_note  "תעודת משלוח" — the goods came with a delivery note, which
//                  carries no prices. The receipt books the stock in with no
//                  price on its lines; the batches have no cost yet and the
//                  item's last purchase price is not touched. The note stays
//                  OPEN until a tax invoice is attached to it.
//   tax_invoice    "חשבונית מס" — the goods came with the invoice itself. A
//                  price is mandatory on every line (per purchase unit, before
//                  VAT), opened at the order line's quote price. The receipt
//                  IS the invoice: a supplier invoice is recorded on the
//                  supplier at once, and it enters the supplier's open
//                  balance.
//
// Attaching an invoice ("הצמדת חשבונית מס"): one or more open delivery notes of
// ONE supplier → one tax invoice. The person types the invoice number and date
// and a price for every line of every note (mandatory, opened at the quote
// price). On saving:
//   - the prices are written onto the notes' lines, the batches they opened
//     take their cost, and each item's last purchase price is updated;
//   - one supplier invoice is recorded (stores/purchasing.js `attachInvoice`),
//     billing those notes; it enters the supplier's open balance on his card;
//   - the notes are closed (attached to that invoice);
//   - every purchase order those notes belong to that was "ממתין לחשבונית מס"
//     and now has no open note left moves to "התקבלה" (stores/buying.js
//     `settleInvoiced`).
//
// The payment of the invoice is not part of this flow: the money side is the
// invoicing system's (iCount) — see the accounting split.
//
// "פריט כללי" — a line on any goods receipt that is not an item: a free
// description, a quantity and a price before VAT (mandatory). It posts no
// stock, opens no batch and prints no label; it counts in the document's value
// and is billed with it.
//
// Not batch-managed: an item whose card has "ניהול אצוות" off (SAP's
// `OITM.ManBtchNum`) is booked in with no batch, no production date and no
// expiry — the quantity goes onto the item with no batch behind it.

/** The two documents goods arrive on. Labels at `supplierDocs.type.<id>`. */
export const RECEIPT_DOC_TYPE_IDS = ['delivery_note', 'tax_invoice'];

/**
 * A delivery note no tax invoice is attached to yet — what the suppliers
 * screen's "תעודות משלוח פתוחות" tab lists. A receipt carried over from SAP
 * that SAP had already invoiced carries `sapInvoice` and is not open.
 */
export const isOpenNote = (receipt) =>
    receipt?.docType === 'delivery_note' &&
    !receipt.invoice &&
    !receipt.sapInvoice;

/** The number the supplier printed on the document. */
export const docRef = (receipt) =>
    receipt?.supplierRef || receipt?.docNum || '';

/**
 * How much of the purchase unit one receipt line holds. Stock is booked in the
 * stock unit; a price is per purchase unit — the unit the order was written
 * in — and `perBuy` (the item card's `numInBuy`) is what sits between them. A
 * general line is counted as written.
 */
export const lineBuyQty = (line) =>
    line?.general
        ? Number(line.qty) || 0
        : (Number(line?.qty) || 0) / (Number(line?.perBuy) || 1);

const round2 = (value) => Math.round(value * 100) / 100;

/** One line's value before VAT, or null while it has no price. */
export function lineNet(line) {
    if (line?.price === null || line?.price === undefined || line.price === '') {
        return null;
    }

    return round2(lineBuyQty(line) * Number(line.price));
}

/**
 * A document's value before VAT — null while any line is still without a
 * price, which is exactly what an open delivery note is.
 */
export function receiptNet(receipt) {
    const values = (receipt?.lines || []).map(lineNet);

    if (!values.length || values.some((value) => value === null)) {
        return null;
    }

    return round2(values.reduce((sum, value) => sum + value, 0));
}

/** The lines of a receipt that are items (stock), as against general lines. */
export const stockLines = (receipt) =>
    (receipt?.lines || []).filter((line) => !line.general);
