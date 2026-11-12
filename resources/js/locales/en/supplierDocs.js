// Supplier documents — delivery notes, tax invoices, and attaching an invoice
// to notes (12.11.2026). The whole model is written out in
// config/supplierDocs.js.
export default {
    // config/supplierDocs.js RECEIPT_DOC_TYPE_IDS
    type: {
        delivery_note: 'Delivery note',
        tax_invoice: 'Tax invoice',
    },

    status: {
        open: 'Open — awaiting its invoice',
        attached: 'Attached to invoice {num}',
        sap: 'Attached to invoice {num} in SAP',
        sapUnknown: 'Closed in SAP',
        invoice: 'Tax invoice',
        covers: 'Covers {refs}',
    },

    col: {
        kind: 'Type',
        ref: 'Number',
        when: 'Date',
        supplier: 'Supplier',
        po: 'Order',
        qty: 'Quantity',
        lines: 'Lines',
        net: 'Before VAT',
        quoted: 'At the quote',
        status: 'State',
        age: 'Open for',
        files: 'Scan',
    },

    age: 'since today | one day | {n} days',
    netPending: 'Set by the invoice',
    sapNum: 'SAP {num}',
    noPo: 'No order',
    noCard: 'Supplier without a card',
    files: 'none | one scan | {n} scans',
    general: 'General line',

    tab: {
        title: 'Notes & invoices',
        lead: 'Every document this supplier’s goods came on: delivery notes — open, or attached to the invoice that billed them — and tax invoices. A scan can be attached to any document, at receipt or later.',
        empty: 'No goods have come from this supplier yet',
        emptySub:
            'Every goods receipt from the supplier shows here as a document — a delivery note or a tax invoice.',
        openNotes: 'one open delivery note | {n} open delivery notes',
        detail: '{kind} {ref}',
        lines: 'Document lines',
        scans: 'Document scans',
        notes: 'The notes the invoice covers',
        pick: 'Click a row to open the document and its scans.',
    },

    open: {
        tab: 'Open delivery notes',
        lead: 'Delivery notes whose goods were booked in and that no tax invoice is attached to yet. One invoice can cover several notes of the same supplier.',
        search: 'Note number, supplier or order…',
        count: 'notes · of {total}',
        empty: 'No open delivery notes',
        emptySub: 'Every delivery note already has its tax invoice.',
        attach: 'Attach an invoice',
        noCardHint: 'Supplier without a card — no invoice can be attached',
    },

    attach: {
        title: 'Attach a tax invoice',
        lead: 'One invoice for one delivery note or for several notes of the same supplier. A price for every line — required, per purchase unit, before VAT — opens at the order’s quote price.',
        supplier: 'Supplier',
        supplierPick: 'Choose a supplier…',
        supplierOption: '{name} · one open note | {name} · {n} open notes',
        notes: 'The notes the invoice covers',
        noNotes: 'This supplier has no open delivery notes.',
        noteLabel: 'Note {ref} · {date}',
        notePo: 'Order {number}',
        num: 'Tax invoice number',
        date: 'Invoice date',
        file: 'Invoice scan',
        fileHint: 'Optional — it can be added later.',
        note: 'Note',
        prices: 'Prices',
        price: 'Price before VAT',
        qtyLine: '{qty} {uom}',
        quote: 'Quote: {price}',
        noQuote: 'No quote — type the price',
        net: 'Total before VAT',
        vat: 'VAT ({rate}%)',
        total: 'Total incl. VAT',
        need: {
            supplier: 'Choose a supplier',
            notes: 'Tick at least one note',
            num: 'The invoice number is missing',
            date: 'The invoice date is missing',
            prices: 'one line has no price | {n} lines have no price',
        },
        save: 'Attach',
        confirmTitle: 'Attach invoice {num}?',
        confirmBody:
            'The invoice covers one delivery note. | The invoice covers {n} delivery notes.',
        effectNotes:
            'The note closes and leaves the open delivery notes | The {n} notes close and leave the open delivery notes',
        effectBalance:
            'An invoice for {total} incl. VAT is recorded on the supplier and enters the open balance on the card',
        effectPrices:
            'The prices are written onto the lines, the batches’ cost and the item card’s last purchase price',
        effectOrders:
            'Order {numbers} moves to Received | Orders {numbers} move to Received',
        done: 'Invoice {num} attached',
        doneBody: 'one note closed | {n} notes closed',
        doneOrders: 'Order {numbers} received | Orders {numbers} received',
    },
};
