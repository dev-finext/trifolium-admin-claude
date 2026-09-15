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

    // config/catalog.js PRICE_LADDER_MODE_IDS — how a group states its ladder.
    mode: {
        percent: 'Percent off per band',
        formula: 'Formula',
    },

    // config/catalog.js LADDER_FORMULA_KIND_IDS
    formulaKind: {
        step: 'Steps',
        curve: 'Curve',
    },

    // config/catalog.js LADDER_ERROR_IDS — why the store refuses to save a group.
    ladderError: {
        prefix_conflict: 'A prefix overlaps another pricing group',
        mode: 'Choose how the ladder is stated — a percent table or a formula',
        base_qty: 'The base quantity must be greater than zero',
        breaks_empty: 'The ladder needs at least one quantity band',
        breaks_ascending: 'Quantity bands must rise from smallest to largest',
        percents_length: 'Every quantity band needs a discount percentage',
        percent_range: 'A discount must be between 0 and 100 %',
        percent_decreasing: 'The discount cannot shrink as the quantity grows',
        percent_below_base:
            'A band starting at or below the base quantity must carry no discount',
        formula_kind: 'Choose a formula kind — steps or curve',
        formula_params: 'Formula parameters must be positive numbers',
        floor_range: 'The discount ceiling must be between 0 and 100 %',
    },

    // config/catalog.js PRICE_IMPORT_ERROR_IDS — why an imported row failed.
    importError: {
        group_not_found: 'Pricing group not found',
        range_not_in_group: 'The quantity band does not exist in the group',
        invalid_value: 'Invalid value — a discount percentage is required',
    },

    // The band table the editor, the item calculator and the drawer share.
    ladder: {
        range: 'Quantity band',
        pct: 'Discount',
        unit: 'Unit price',
        unitInclVat: 'Incl. VAT',
        example: 'Example total',
        base: 'Base',
        off: '−{pct}',
        floor: 'Ceiling',
        vatNote: 'Prices are shown before and including VAT ({rate})',
        andUp: '{from}+',
        upTo: '{from}–{to}',
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
        modeAria: 'Ladder mode',
        modeAll: 'Ladder mode — all',
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
        mode: 'Ladder',
        baseQty: 'Base quantity',
        baseQtyValue: 'up to {qty} {uom} — no discount',
        bands: '{n} bands · up to {pct}',
        formulaStep: 'every {step} {uom} above base −{pct} · ceiling {floor}',
        formulaCurve: 'curve k={k} · ceiling {floor}',
        items: 'Items priced',
        itemsNone: 'No item is priced by this group',
        itemsAria: 'Items priced by {name}',
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

        baseQty: {
            label: 'Base quantity',
            hint: "Up to this quantity (inclusive) the full unit price applies — the discount starts above it. Quantities are in the item's sales unit.",
            required: 'Enter a base quantity greater than zero',
        },

        modePick: {
            aria: 'How the discount is computed',
            percentTitle: 'Percent table',
            percentSub: 'A fixed discount for every quantity band — row by row',
            formulaTitle: 'Formula',
            formulaSub:
                'A few parameters set the discount at every quantity — the table is derived from them',
            confirmTitle: 'Switch the ladder mode',
            confirmToFormula:
                'The percent table is cleared and the group moves to a formula. The change only takes effect once saved.',
            confirmToPercent:
                'The formula parameters are cleared and the group moves to a percent table. The change only takes effect once saved.',
            confirm: 'Switch mode',
        },

        formula: {
            title: 'Formula parameters',
            sub: 'The discount is computed from the quantity above the base quantity',
            kind: 'Formula kind',
            stepQty: 'Step size',
            stepQtyHint:
                'Every this many {uom} above base adds one discount step',
            stepPct: 'Discount per step',
            stepPctHint: 'The percentage each step adds',
            k: 'Curve steepness (k)',
            kHint: 'Higher — the discount grows faster. Formula: 1 − (base ÷ qty)^k',
            floorPct: 'Discount ceiling',
            floorPctHint:
                'The discount never exceeds this percentage, at any quantity',
            floorAt: 'The ceiling is reached from {qty} {uom}',
            floorNever:
                'With the current parameters the ceiling is never reached',
            preview: 'Preview',
            previewSub:
                'Table and chart are computed for an example unit price',
            chartAria: 'Unit price by quantity',
            chartX: 'Quantity ({uom})',
            chartY: 'Unit price (₪)',
        },

        previewPrice: {
            label: 'Example unit price',
            hint: 'For the preview only — the real price is each item’s own',
        },

        pctTable: {
            pct: 'Discount %',
            pctAria: 'Discount in band {n}',
            pctRequired: 'Enter a discount percentage',
            pctRange: 'Between 0 and 100',
            pctDecreasing: 'Lower than the previous band',
            pctBase: 'Up to the base quantity — no discount',
            unitAt: 'Unit price at {price}',
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
        effectItems:
            '{n} items assigned to the group by hand return to the prefix default',
    },

    // The price calculator on the item card — stores/catalog.js ladderFor().
    calculator: {
        more: 'and {n} more bands',
        title: 'Price by quantity',
        sub: 'The item’s unit price after the “{group}” ladder',
        fixed: 'Fixed price — no tiered price list applies',
        fixedSub: 'The item sells at its unit price at any quantity',
        noPrice:
            'No unit price entered — the calculator appears once there is one',
        uomMismatch: 'The price list’s unit differs from the item’s sales unit',
        uomMismatchSub:
            'The ladder was written per {groupUom}, the item sells per {itemUom} — quantities are computed in the item’s unit, without conversion',
        groupDefault: 'Default by prefix: {name}',
        groupExplicit: 'Assigned by hand: {name}',
        groupNone: 'Fixed — no price list',
        groupInherit: 'Default by prefix',
        groupInheritNone: 'Default by prefix — no group matches',
        groupMissing: 'The group this item was assigned to no longer exists',
        qtyLabel: 'Quantity',
        qtyAria: 'Quantity to price',
        result: '{qty} {uom} → {unit} each · {total} total',
        resultInclVat: 'Incl. VAT: {unit} each · {total} total',
        atBase: 'Base price',
        atTop: 'Price in the top band ({from}+)',
    },

    // The drawer behind the "items priced" count — stores/catalog.js itemsOfGroup().
    itemsDrawer: {
        title: 'Items priced by “{name}”',
        sub: '{n} items · assigned by hand or by SKU prefix',
        close: 'Close',
        open: 'Open the item card',
        col: {
            code: 'SKU',
            name: 'Item',
            uom: 'Sales unit',
            unitPrice: 'Unit price',
            atBase: 'At base ({qty}+)',
            atTop: 'Top band ({qty}+)',
            assignment: 'Assignment',
        },
        assignment: {
            default: 'By prefix {prefix}',
            explicit: 'By hand',
        },
        noPrice: 'No price',
        uomMismatch: 'Sales unit differs from the ladder’s unit',
        empty: 'No item is priced by this group',
        emptySub:
            'Add a SKU prefix that matches items, or assign items to the group from the item card',
        export: 'Export the list',
    },

    // The spreadsheet import review — stores/catalog.js applyPriceImport().
    import: {
        title: 'Import a price list from a file',
        file: 'File: {name}',
        sub: '{n} rows · {ok} valid · {bad} failing',
        col: {
            group: 'Pricing group',
            range: 'Quantity band',
            old: 'Current discount',
            next: 'New discount',
            state: 'State',
        },
        ok: 'Valid',
        raw: 'Value in file: “{raw}”',
        apply: 'Apply {n} valid rows',
        applied: 'Price list updated',
        appliedBody: '{applied} rows applied · {skipped} rejected',
        rejected:
            'The group “{group}” was not updated — the resulting ladder is not valid',
        formulaGroup: 'Formula group — file rows do not apply to it',
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
        colPct: 'Discount',
        rows: '{n} rows',
    },
};
