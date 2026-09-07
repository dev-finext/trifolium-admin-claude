// English mirror of he/inventory.js — same keys, real translations of the
// compounding-pharmacy domain: אצווה is a batch, רקיחה is compounding, קליטת
// סחורה is a goods receipt, מק״ט is an item code.
export default {
    title: 'Stock, goods receipt and batches',
    sub: '{items} items · {batches} batches with quantity left · {receipts} goods receipts',

    tab: {
        stock: 'Stock',
        receipts: 'Goods receipt',
        batches: 'Batches and expiry',
        movements: 'Stock movements',
    },

    action: {
        export: 'Export stock',
        newReceipt: 'New goods receipt',
        adjust: 'Adjust stock',
        openBatches: "Show this item's batches",
    },

    // Stock units — config/inventory.js STOCK_UNITS
    unit: {
        g: 'g',
        kg: 'kg',
        ml: 'ml',
        l: 'l',
        unit: 'units',
        capsule: 'capsules',
    },

    // Item kinds — config/catalog.js STOCK_KINDS
    stockKind: {
        raw: 'Raw material',
        base: 'Base',
        pack: 'Packaging',
        shelf: 'Shelf product',
    },

    toast: {
        exported: {
            title: 'The file was downloaded',
            body: '{file} · {n} rows',
        },
        received: {
            title: 'The goods were received into stock',
            body: '{id} · 1 batch opened | {id} · {n} batches opened',
        },
        adjusted: {
            title: 'Stock updated',
            body: '{item} · {reason} · {diff} {unit}',
            bodyBatches: '{item} · {reason} · {diff} {unit} · {batches}',
        },
    },

    // V2 — the batch-handling settings
    pickMode: {
        fefo: 'FEFO — by expiry',
        fifo: 'FIFO — by receipt order',
    },
    batchSource: {
        supplier: 'Goods receipt',
        production: 'In-house production',
        waste: 'Waste',
    },
    settings: {
        title: 'Batch settings',
        updated: 'Updated {when} · {by}',
        saved: 'Setting saved',
        pickTitle: 'Batch selection rule',
        pickHint:
            'FEFO is how the pharmacy works — the batch nearest to expiry goes first. FIFO is kept as an option, as the specification asked.',
        expiryTitle: 'Default shelf life by item family',
        expiryHint:
            'Calculated automatically on receipt and on return from production, by the item’s family · can be overridden per batch',
        months: 'months',
        none: 'None',
        seriesTitle: 'Batch numbering',
        seriesHint:
            'A prefix per batch source, and a running number — instead of the spreadsheet',
        next: 'Next: {id}',
    },

    stock: {
        lowTitle: '{n} items below their minimum',
        lowNames: '— {names}.',
        lowMore: 'and {n} more',
        lowOn: 'The table is filtered to these items · click to undo',
        lowOff: 'Click to filter the table to these items',
        allAbove: 'Every item is above its minimum level.',
        count: 'items',
        search: 'Item name · item code · latin name',
        kpi: {
            all: 'All items',
            allSub: 'Click to show everything',
            low: 'Below minimum',
            lowSub: 'Click to filter the table',
            expiring: 'Batches expiring soon',
            expiringSub: 'Less than {days} days',
        },
        filter: {
            kind: 'Kind — all',
            wh: 'Warehouse — all',
            level: 'Level — all',
            low: 'Below minimum',
        },
        aria: {
            kind: 'Item kind',
            wh: 'Warehouse',
            level: 'Stock level',
        },
        col: {
            sku: 'Item code',
            name: 'Item',
            // Export file only — the table shows the latin name under the item
            lat: 'Latin name',
            kind: 'Kind',
            wh: 'Warehouse',
            onHand: 'On hand',
            alloc: 'Allocated to orders',
            avail: 'Available',
            min: 'Minimum',
            unit: 'Unit',
            batches: 'Batches with quantity',
        },
        empty: {
            title: 'No items found',
            sub: 'Clear the search or the filter',
        },
    },

    receipts: {
        note: 'A goods receipt is the only way stock enters the system. Every line opens a batch with its own batch number and expiry date — and that is where the trace to the customer begins.',
        count: 'goods receipts · out of {total}',
        search: 'Receipt · supplier · delivery note · batch',
        filter: {
            supplier: 'Supplier — all',
            by: 'Received by — all',
            window: 'Range — all',
            days: '{n} days',
            option: '{name} ({n})',
        },
        aria: {
            supplier: 'Supplier',
            by: 'Received by',
            window: 'Time range',
        },
        col: {
            id: 'Receipt',
            supplier: 'Supplier',
            lines: 'Lines',
            batches: 'Batches opened',
            when: 'Date',
            by: 'Received by',
            note: 'Note',
        },
        docNum: 'Delivery note {n}',
        empty: {
            title: 'No goods receipts found',
            sub: 'Clear the filter, or receive new goods',
        },
        drawer: {
            title: 'Goods receipt',
            state: 'Received',
            supplier: 'Supplier: {name}',
            docNum: 'Delivery note',
            received: 'Received',
            by: 'Received by: {name}',
            lines: 'Lines received',
            col: {
                batch: 'Batch',
                item: 'Item',
                qty: 'Quantity',
                supplierBatch: "Supplier's batch",
                expiry: 'Expiry',
                wh: 'Warehouse',
                price: 'Price per purchase unit',
                labels: 'Labels',
            },
            po: 'Against purchase order {id}',
        },
    },

    batches: {
        warn: '{expiring} batches expiring soon and {expired} already expired',
        warnBody:
            '— an expired batch is automatically blocked from being allocated to compounding.',
        ok: 'No batches are expiring soon.',
        count: 'batches · click a row to open its trace',
        search: 'Batch number · item · item code · supplier',
        kpi: {
            all: 'All batches',
            allSub: 'Click to show everything',
            expiring: 'Expiring soon',
            expiringSub: 'Less than {days} days',
            expired: 'Expired',
            expiredSub: 'Blocked from allocation',
        },
        filter: {
            state: 'State — all',
            expiry: 'Expiry — all',
            days: 'Less than {n} days',
            past: 'Expired',
            wh: 'Warehouse — all',
        },
        aria: {
            state: 'Batch state',
            expiry: 'Expiry',
            wh: 'Warehouse',
        },
        col: {
            id: 'Batch',
            name: 'Item',
            supplier: 'Supplier',
            qty: 'Left / received',
            expiry: 'Expiry',
            state: 'State',
            receipt: 'Receipt',
            use: 'Compounding allocations',
        },
        expiredAgo: 'Expired {n} days ago',
        expiresIn: 'In {n} days',
        empty: {
            title: 'No batches match the filter',
            sub: 'Clear the filter',
        },
        trace: {
            title: 'Batch',
            supplier: 'Supplier: {name}',
            received: 'Received',
            expiry: 'Expiry',
            remaining: '{left} {unit} left out of {qty}',
            details: 'Batch details',
            sku: 'Item code',
            receipt: 'Goods receipt',
            supplierBatch: "Supplier's batch",
            wh: 'Warehouse',
            by: 'Received by',
            daysToExp: 'Days to expiry',
            days: '{n} days',
            expiredBlocked:
                'The batch has expired and is blocked from allocation. Reject it and deduct it from stock.',
            rejectedBlocked:
                'The batch was rejected and is blocked from compounding, even though quantity is left.',
            chain: 'Chain of use — through to the customer',
            uses: '{n} compounding allocations',
            col: {
                order: 'Order',
                item: 'Formula',
                customer: 'Customer',
                qty: 'Quantity',
                when: 'Date',
            },
            empty: {
                title: 'This batch has not been allocated yet',
                sub: 'Received into stock and waiting to be used',
            },
        },
    },

    movements: {
        note: 'Every movement is written from the record behind it: a goods receipt, a batch allocated to compounding, or a stock adjustment written to the log. Nothing moves without a batch and without someone who moved it.',
        count: 'movements',
        search: 'Batch · item · item code · reference',
        filter: {
            kind: 'Movement kind — all',
            wh: 'Warehouse — all',
        },
        aria: {
            kind: 'Movement kind',
            wh: 'Warehouse',
        },
        col: {
            when: 'When',
            kind: 'Movement kind',
            item: 'Item',
            batch: 'Batch',
            qty: 'Quantity',
            ref: 'Reference',
            by: 'Performed by',
        },
        system: 'System process',
        empty: {
            title: 'No movements match the filter',
            sub: 'Clear the filter',
        },
    },

    receipt: {
        title: 'New goods receipt',
        supplier: 'Supplier',
        supplierPh: 'Supplier name as printed on the delivery note',
        docNum: 'Delivery note',
        docNumPh: 'Delivery-note number',
        date: 'Receipt date',
        note: 'Receipt note',
        notePh: 'For example: one package damaged — not received',
        rows: 'Receipt lines',
        col: {
            item: 'Item',
            qty: 'Quantity',
            batch: 'Batch number',
            supplierBatch: "Supplier's batch",
            expiry: 'Expiry',
            wh: 'Warehouse',
            after: 'Stock after',
            existing: 'Existing batch',
            price: 'Price per purchase unit',
            labels: 'Labels',
        },
        supplierBatchPh: "Batch number at the supplier's",
        // V2
        supplierPick: 'Choose a supplier from the list…',
        supplierOther: 'Other supplier — type the name',
        existingNew: 'New batch',
        existingOption: '{id} · expires {expiry}',
        expiryAuto: 'Family default — {n} months · can be changed',
        addLine: 'Add a line',
        hint: 'Each line opens a separate batch with its own batch number and expiry date, and enters stock the moment it is received',
        submit: 'Receive into stock · 1 batch | Receive into stock · {n} batches',
        need: 'Required: supplier, delivery-note number, and at least one line with an item, a quantity, a batch number and an expiry date',
        aria: {
            qty: 'Quantity on line {n}',
            batch: 'Batch number on line {n}',
            supplierBatch: "Supplier's batch on line {n}",
            expiry: 'Expiry on line {n}',
            wh: 'Warehouse on line {n}',
            remove: 'Remove line {n}',
            existing: 'Existing batch on line {n}',
            price: 'Price on line {n}',
            labels: 'Labels on line {n}',
        },
    },

    adjust: {
        title: 'Stock adjustment · {item}',
        kv: {
            sku: 'Item code',
            onHand: 'On hand now',
            alloc: 'Allocated to orders',
            batches: 'Batches with quantity',
        },
        reason: 'Reason for the adjustment',
        qtySet: 'Quantity actually found',
        qtyDeduct: 'Quantity to deduct',
        batch: 'Batch',
        batchPick: '— pick a batch —',
        batchOption: '{id} · {left} left · expires {expiry}',
        diff: 'Variance',
        why: 'Explanation (required — written to the log)',
        whyPhCount:
            'For example: quarterly stock count — less found than recorded',
        whyPhDeduct: 'For example: a bottle broke on the way to the lab',
        save: 'Save adjustment',
        noBatches:
            'This item has no open batch in stock, so breakage or rejection cannot be recorded against it. If the quantity is wrong, choose a stock count instead.',
        shortfall:
            'The variance — {qty} {unit} — is deducted from the batches nearest to expiry first (FEFO), spilling over to the next batch when it exceeds what is left.',
        shortfallNone:
            'This item has no batch with quantity left, so only the item total is updated.',
        surplus:
            'The surplus — {qty} {unit} — is credited to batch {batch}, the one nearest to expiry.',
        surplusNone:
            'This item has no open batch — better to receive the goods on the goods-receipt screen, so a batch with an expiry date is opened.',
        rejectNote:
            'The batch will be marked rejected and blocked from compounding, even if quantity is left in it.',
    },

    pick: {
        title: 'Batch selection for compounding',
        rule: {
            fefo: 'The selection is automatic, nearest expiry first — FEFO, first expired, first out.',
            fifo: 'The selection is automatic, in order of receipt — FIFO, first in, first out.',
        },
        approval: 'The pharmacist approves the pick before stock is deducted.',
        item: 'Item',
        qty: 'Quantity needed',
        col: {
            batch: 'Batch',
            expiry: 'Expiry',
            take: 'Deducted',
            after: 'Left after',
        },
        idle: 'Pick an item and a quantity to see which batches the system would deduct from.',
        covered: 'Covered by 1 batch | Covered by {n} batches',
        short: '{qty} {unit} short — the open batches of this item do not hold enough.',
        noBatches: 'This item has no open batch with quantity left.',
    },

    picker: {
        placeholder: 'Search an item — name · item code · latin name',
        search: 'Item name · item code · latin name',
        all: 'All',
        wh: 'Warehouse — all',
        whOption: '{name} ({n})',
        low: 'Below minimum',
        clear: 'Clear',
        none: 'No item matches the search and the filter',
        capped: 'Showing {shown} of {total} items — narrow the search',
        found: '{n} of {total} items found · arrows to move, Enter to pick',
        aria: {
            search: 'Item search',
            wh: 'Warehouse',
        },
    },
};
