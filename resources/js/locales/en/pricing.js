// Tiered price lists — mirrors he/pricing.js key for key.
export default {
    title: 'Tiered price lists',
    sub: 'Formula ingredients priced by quantity — the unit price drops as the ordered quantity rises',

    actions: {
        export: 'Export all groups',
        newGroup: 'New pricing group',
        createFirst: 'Create the first pricing group',
    },

    countLabel: 'groups of {total}',

    uom: {
        ml: 'ml',
        g: 'gram',
        unit: 'unit',
        capsule: 'capsule',
    },

    per: {
        ml: 'per ml',
        g: 'per gram',
        unit: 'per unit',
        capsule: 'per capsule',
    },

    filters: {
        option: '{label} ({n})',
        searchPlaceholder: 'Group name · prefix · SKU (e.g. 200455)',
        searchAria: 'Search pricing groups',
        uomAria: 'Unit of measure',
        uomAll: 'Unit of measure — all',
        scaleAria: 'Quantity scale',
        scaleAll: 'Quantity scale — all',
        scaleCustom: 'Custom',
        scaleDefault: 'System default',
        fillAria: 'SKU assignment and prices',
        fillAll: 'Assignment and prices — all',
        fillNone: 'No SKUs assigned',
        fillHas: 'With SKUs assigned',
        fillNoPrice: 'No price in the first band',
    },

    lookup: {
        resolved: 'SKU {sku} is priced by {group} (prefix {prefix})',
        resolvedNamed:
            'SKU {sku} · {name} is priced by {group} (prefix {prefix})',
        open: 'Open the group',
        unresolved: 'SKU {sku} is not assigned to any pricing group.',
    },

    table: {
        group: 'Pricing group',
        uom: 'Unit of measure',
        scale: 'Quantity scale',
        base: 'Unit price',
        matched: 'SKUs assigned',
        updated: 'Last updated',
        custom: 'Custom · {n} bands',
        default: 'System default · {n} bands',
        from: 'from {price} {per}',
        by: 'by {name}',
        edit: 'Edit',
        exportAria: 'Export the group {name}',
        deleteAria: 'Delete the group {name}',
    },

    empty: {
        noneTitle: 'No pricing groups yet',
        noneSub:
            'A pricing group declares SKU prefixes, a unit of measure and a price-per-quantity table — that is how every ingredient gets a price automatically.',
        filteredTitle: 'No pricing groups found',
        filteredSub: 'Try another name, a prefix, or a full SKU',
    },

    editor: {
        newTitle: 'New pricing group',
        editTitle: 'Edit pricing group · {name}',
        close: 'Close',
        export: 'Export this group',

        meta: {
            uom: 'Unit of measure: {uom}',
            noUom: 'No unit of measure chosen yet',
            matched: '{n} SKUs assigned',
            filled: '{filled}/{total} price rows filled',
            lastUpdate: 'Last updated: {stamp} · by {name}',
        },

        step1: {
            title: 'Group details',
            sub: 'Name, the SKU prefixes the group prices, and the unit of measure',
        },
        step2: {
            title: 'Quantity bands',
            sub: 'Which quantity steps the unit price is set by',
        },
        step3: {
            title: 'Price table',
            sub: 'The price of one {uom} in each quantity band — the discount off the base price is shown alongside',
            subLocked: 'Choose a unit of measure in step 1 to open the table',
        },

        name: {
            label: 'Group name',
            placeholder: 'e.g. Essential oils',
        },

        prefixes: {
            label: 'SKU prefixes',
            hint: 'Every SKU belongs to exactly one group — a prefix that overlaps another group is refused.',
            placeholderFirst: 'e.g. 200 — then Enter',
            placeholderMore: 'Another prefix…',
            aria: 'Add a SKU prefix',
            removeAria: 'Remove the prefix {prefix}',
            conflict:
                'The prefix {prefix} cannot be added — it overlaps the prefix {other} of the group “{group}”. Overlapping prefixes between groups are not allowed.',
        },

        uomField: {
            label: 'Unit of measure',
            choose: '— choose —',
        },

        preview: {
            label: 'Assigned SKUs — live',
            head: '{n} SKUs out of {total} in the catalogue',
            noPrefix:
                'Add a SKU prefix to see which items the group would cover',
            noMatch: 'No SKU in the catalogue starts with the prefixes entered',
        },

        mode: {
            aria: 'Choose a quantity scale',
            defaultTitle: "The system's fixed scale",
            defaultSub: '{n} ready-made bands: {sample}',
            customTitle: 'Custom scale',
            customSub:
                'You define the bands yourself — row by row in the price table',
            customNote:
                'On a custom scale the fixed system scale no longer applies to this group: add bands in the table below and set the quantity each one starts at. Bands must rise from smallest to largest.',
        },

        table: {
            range: 'Quantity band',
            unitPrice: 'Unit price',
            discount: 'Discount off base',
            example: 'Example total',
            exampleValue: '{qty} {uom} → {total}',
            filled: '{filled}/{total} rows filled',
            base: 'Base',
            discountDown: '−{pct}',
            discountUp: '+{pct}',
            priceAria: 'Unit price',
            priceRequired: 'A price is required',
            priceRose: 'The unit price rose compared with the previous band',
            rangeAria: 'Start of band {n}',
            rangeFrom: 'from',
            rangeUpTo: 'up to {n}',
            rangeAndUp: 'and up',
            rangeRequired: 'Please enter a quantity',
            rangeAscending: 'Must be greater than the previous band',
            removeRange: 'Remove band {n}',
            addRange: 'Add a band',
            addRangeHint:
                'Each band runs up to the start of the next one; the last band is open ended.',
            locked: 'Choose a unit of measure to open the price table',
        },

        save: {
            label: 'Save',
            cancel: 'Cancel',
            unsaved: '● Unsaved changes',
            blockedName: 'Saving needs a group name and at least one prefix',
            blockedUom: 'Saving needs a unit of measure',
            blockedRanges:
                'Fix the quantity bands — they must rise from smallest to largest',
            blockedTable:
                'The table must be complete — every row needs a price',
        },

        confirmSave: {
            titleNew: 'Confirm creating the group',
            titleEdit: 'Confirm saving the changes',
            bodyNew:
                'The group “{name}” will be created and will immediately price the SKUs assigned to it.',
            bodyEdit:
                'The group “{name}” will be updated and will immediately price the SKUs assigned to it.',
            confirmNew: 'Create group',
            confirmEdit: 'Save changes',
            effect1: '{matched} SKUs assigned · {ranges} quantity bands',
            effect2:
                "The group's last-updated signature moves to your name ({name})",
        },

        confirmUom: {
            title: 'Change unit of measure',
            body: 'The price table is kept, but the meaning of every price changes: each one now reads as the price of one {next} instead of one {current}.',
            bodyFirst: 'The price table will open for pricing per {next}.',
            confirm: 'Change the unit of measure',
            effect1:
                'The {n} price rows already filled stay exactly as they are',
            effect2: 'Quantity bands are measured in {next} from now on',
        },

        confirmMode: {
            titleCustom: 'Switch to a custom scale',
            titleDefault: 'Return to the fixed scale',
            bodyCustom:
                'The fixed scale will no longer apply to this group — you will define the quantity bands yourself, band by band.',
            bodyDefault:
                'The custom bands will be discarded and the group returns to the fixed system scale ({n} bands).',
            confirmCustom: 'Switch to a custom scale',
            confirmDefault: 'Return to the fixed scale',
            effect1: 'The current price table is cleared and entered again',
            effect2: 'The change only takes effect once saved',
        },

        confirmLeave: {
            title: 'Leave without saving',
            body: 'This group holds changes that were not saved. Leave anyway?',
            confirm: 'Leave without saving',
            effect1: 'The changes you made will be discarded',
        },
    },

    confirmDelete: {
        title: 'Delete pricing group',
        body: 'The group “{name}” will be deleted for good and will stop pricing SKUs.',
        confirm: 'Delete group',
        effect1: '{n} assigned SKUs will be left without a pricing group',
        effect2: 'The price table is deleted and cannot be restored',
        effect3:
            'A SKU without a pricing group gets no automatic price in a formula',
    },

    toast: {
        saved: 'Pricing group saved',
        savedBody: '{name} · every price row is filled',
        deleted: 'Group deleted',
        exported: 'Price list exported to a file',
        exportedBody: '{n} rows · {file}',
    },

    export: {
        colGroup: 'Pricing group',
        colPrefixes: 'SKU prefixes',
        colUom: 'Unit of measure',
        colRange: 'Quantity band',
        colPrice: 'Unit price',
        rows: '{n} rows',
    },
};
