// Shelf products — mirrors he/products.js key for key.
export default {
    title: 'Shelf products',
    sub: 'The shelf-product catalogue practitioners browse on the website',

    actions: {
        newProduct: 'New product',
        manageLabels: 'Manage labels',
        export: 'Export catalogue',
    },

    countLabel: 'products of {total}',

    filters: {
        option: '{label} ({n})',
        searchPlaceholder: 'Product name · SKU · pack contents',
        searchAria: 'Search products',
        labelsAria: 'Filter by label',
        labelsAll: 'Labels — all',
        labelsChosen: '{n} labels selected',
        labelsClear: 'Clear label selection',
        statusAria: 'Product status',
        statusAll: 'Status — all',
        stockAria: 'Available stock',
        stockAll: 'Stock — all',
        stockLow: 'Under minimum — blocked for sale',
        stockZero: 'Out of stock',
        stockOk: 'Available for sale',
        priceAria: 'Price before VAT',
        priceAll: 'Price — all',
        priceUpTo: 'Up to {amount}',
        priceBetween: '{from}–{to}',
        priceOver: 'Over {amount}',
        uomAria: 'Weight unit',
        uomAll: 'Unit of measure — all',
        imageAria: 'Product image',
        imageAll: 'Image — all',
        imageHas: 'With an image',
        imageNone: 'Without an image',
        tagsAria: 'Label assignment',
        tagsAll: 'Label assignment — all',
        tagsNone: 'No labels at all',
        tagsHas: 'With labels',
    },

    noWeight: 'Not set',

    status: {
        published: 'Published',
        archived: 'Archived',
    },

    unit: {
        g: 'grams',
        kg: 'kg',
        ml: 'ml',
        l: 'litres',
    },

    table: {
        image: 'Image',
        name: 'Product name',
        sku: 'SKU',
        net: 'Price before VAT',
        gross: 'Consumer price',
        weight: 'Weight',
        stock: 'Available stock',
        minStock: 'Minimum {n}',
        belowMin: 'Under minimum ({n})',
        noImage: 'No image for this product',
        moreLabels: '{n} more labels: {names}',
        edit: 'Edit',
        archive: 'Archive',
        restore: 'Restore',
    },

    empty: {
        noneTitle: 'No shelf products in the catalogue yet',
        noneSub:
            'The first product you add appears here, and in the practitioner catalogue once published',
        filteredTitle: 'No products match the filter',
        filteredSub: 'Try another search term, another label or another status',
    },

    editor: {
        newTitle: 'New shelf product',
        editTitle: 'Edit product',
        skuMeta: 'SKU {sku}',
        localCatalog: 'This catalogue is managed in our system only',
        unsaved: '● Unsaved changes',
        missing: 'Missing: {list}',
        saveNew: 'Save product',
        save: 'Save changes',
        full: 'Full screen',
        collapse: 'Collapse',
        close: 'Close',

        cards: {
            details: 'Product details',
            price: 'Price',
            image: 'Product image',
            stock: 'Stock and minimum stock',
        },

        need: {
            name: 'product name',
            content: 'pack contents',
            net: 'price before VAT',
            sku: 'a valid SKU',
            skuUnique: 'a unique SKU',
            labels: 'at most {max} labels',
            weight: 'weight and unit of measure',
            minStock: 'minimum stock',
        },

        fields: {
            name: {
                label: 'Product name',
                placeholder: 'The name practitioners will see',
                hint: '{min}–{max} characters',
                tooShort: 'Please enter a product name',
                tooLong: 'Up to {max} characters',
            },
            content: {
                label: 'Pack contents',
                placeholder: 'e.g. 60 capsules · 100 ml · 50 g',
                hint: 'What the pack holds · up to {max} characters',
                required: 'Please enter what the pack holds',
                tooLong: 'Up to {max} characters',
            },
            sku: {
                label: 'SKU',
                placeholder: 'ABC-1234',
                hint: '{min}–{max} characters · digits, Latin letters and hyphens · unique in the system',
                required: 'Please enter a SKU',
                length: 'A SKU is {min}–{max} characters long',
                chars: 'Digits, Latin letters and hyphens only',
                taken: 'This SKU already exists in the system',
            },
            net: {
                label: 'Price before VAT',
                hint: 'Up to two decimal places',
                required: 'Please enter the price before VAT',
                invalid:
                    'The price must be a number greater than 0, with at most two decimal places',
            },
            labels: {
                label: 'Labels',
                hint: 'Up to {max} labels per product ({n}/{max}) · a label shows on the product card and doubles as a filter in the practitioner catalogue',
                tooMany: 'Up to {max} labels per product',
            },
            uom: {
                label: 'Weight unit of measure',
                choose: 'Choose a unit of measure…',
                required: 'Please choose a unit of measure',
            },
            weight: {
                label: 'Weight',
                placeholderWithUom: 'Amount in {uom}',
                placeholderNoUom: 'Choose a unit of measure first',
                hintWithUom: 'Shown as {value} {uom}',
                hintNoUom: 'This field opens once a unit of measure is chosen',
                required: 'Please enter a weight greater than 0',
            },
            minStock: {
                label: 'Minimum stock',
                hint: 'The default is {n} units',
                required: 'Please enter a minimum stock level',
                integer: 'Whole numbers only',
                tooLarge: 'Up to {max} units',
            },
        },

        stock: {
            available: 'Available stock',
            availableHint: 'Managed on the stock & batches screen · read only',
            note: 'Below this level nothing is sold any more — neither on the consumer site nor on the practitioner site. The product stays in the catalogue, marked sold out, until stock rises back above the minimum.',
            blocked:
                'Available stock ({stock}) is currently below the minimum ({min}) — the product is blocked for sale on both sites.',
        },
    },

    sim: {
        title: 'Price simulation',
        net: 'Price before VAT',
        vat: 'VAT ({rate})',
        gross: 'Price after VAT',
        display: 'Displayed price',
        roundUp: 'Rounding added',
        note: 'The VAT rate is set in system settings · the displayed price is always rounded up to a whole shekel, and that is the figure a practitioner sees in the catalogue.',
    },

    image: {
        dropTitle: 'Drop an image here, or click to choose one',
        dropHint: '{types} · up to {size}MB · square {px}×{px} recommended',
        chooseAria: 'Choose a product image',
        previewAlt: 'Preview of the product image',
        remove: 'Remove image',
        localOnly:
            'The image is previewed from the file on your own computer and was not uploaded anywhere. It stays visible until the page is reloaded.',
        typeError: 'Unsupported file type — {types} required',
        sizeError: 'The file is larger than {size}MB',
        loadFailed: 'The image was not loaded',
    },

    picker: {
        searchPlaceholder: 'Search a label to add',
        aria: 'Choose labels',
        none: 'No label found named “{term}”',
        atMax: '{n} labels selected — the maximum per product',
        createNew: 'Create a new label',
        remove: 'Remove the label {name}',
    },

    labels: {
        title: 'Manage labels',
        note: 'A label shows on the product card on the website and doubles as a filter practitioners narrow the catalogue by. Renaming one updates every product linked to it immediately.',
        countLabel: 'labels of {total}',
        searchPlaceholder: 'Search a label',
        searchAria: 'Search a label',
        useAria: 'Use across products',
        useAll: 'Use — all',
        used: 'In use',
        unused: 'Not in use',
        newLabel: 'New label',
        nameLabel: 'Label name',
        namePlaceholder: 'e.g. Sleep · Stomach pain · Immunity',
        nameHint: '{min}–{max} characters · must be unique',
        add: 'Add label',
        cancel: 'Cancel',
        renameAria: 'New name for the label',
        rename: 'Rename',
        saveRename: 'Save',
        delete: 'Delete',
        colName: 'Label name',
        colUse: 'Use',
        colCreated: 'Created on',
        usedIn: 'Used by {n} products',
        notUsed: 'Not in use',
        emptyTitle: 'No labels in the system yet',
        emptySub:
            'The first label appears both as a card and as a filter in the practitioner catalogue',
        createFirst: 'Create the first label',
        noMatchTitle: 'No matching label',
        noMatchSub: 'Try another search term',
        clearSearch: 'Clear search',
        tooShort: 'A label name must be at least {min} characters',
        tooLong: 'Up to {max} characters',
        duplicate: 'A label with this name already exists',
    },

    confirm: {
        archive: {
            title: 'Archive product · {name}',
            body: 'The product “{name}” (SKU {sku}) will be moved to the archive.',
            confirm: 'Move to archive',
            effect1:
                'The product leaves the practitioner catalogue and can no longer be ordered',
            effect2: 'Existing orders that include it are unaffected',
            effect3:
                'It can be restored at any time — a product is never deleted for good',
            effect4:
                'The archiving, the reason and the agent are written to the system log',
        },
        restore: {
            title: 'Restore product · {name}',
            body: 'The product “{name}” will be returned from the archive to the catalogue.',
            confirm: 'Restore product',
            effect1:
                'The product shows in the practitioner catalogue again and can be ordered',
            effect2: 'The displayed price will be {price} including VAT',
            effect3: 'The restore is written to the system log',
        },
        leave: {
            title: 'Leave without saving',
            body: 'The form holds changes that were not saved.',
            confirm: 'Leave without saving',
            effect1: 'The changes you made will be lost',
            effect2: 'The product stays exactly as it was before you opened it',
        },
        renameLabel: {
            title: 'Rename label',
            body: 'The label “{from}” will be renamed to “{to}”.',
            confirm: 'Rename',
            effect1:
                'The name updates immediately on the {n} products linked to it',
            effect2:
                'The filter name in the practitioner catalogue updates with it',
            effect3: 'The action is written to the system log',
        },
        deleteLabel: {
            title: 'Delete label · {name}',
            bodyUsed:
                'The label “{name}” is currently linked to {n} products: {names}.',
            bodyUsedMore:
                'The label “{name}” is currently linked to {n} products: {names} and {rest} more.',
            bodyFree: 'The label “{name}” is not linked to any product.',
            confirm: 'Delete label',
            effectUsed: 'The label is removed from {n} products',
            effectFree: 'No products are linked to this label',
            effect2:
                'The filter disappears from the practitioner catalogue on the website',
            effect3:
                'The products themselves are neither deleted nor changed in any other way',
            effect4:
                'The deletion, the reason and the agent are written to the system log',
        },
    },

    toast: {
        created: 'Product created',
        updated: 'Product updated',
        savedBody: '{name} · listed in the practitioner catalogue',
        archived: 'Product moved to the archive',
        archivedBody: '{name} · removed from the practitioner catalogue',
        restored: 'Product restored',
        restoredBody: '{name} · back in the practitioner catalogue',
        exported: 'Catalogue exported to a file',
        exportedBody: '{n} rows · {file}',
        labelCreated: 'Label created',
        labelRenamed: 'Label renamed',
        labelRenamedBody: '{from} → {to}',
        labelDeleted: 'Label deleted',
        labelDeletedBody: '{name} · removed from {n} products',
    },

    export: {
        colName: 'Product name',
        colContent: 'Pack contents',
        colSku: 'SKU',
        colNet: 'Price before VAT',
        colGross: 'Consumer price',
        colWeight: 'Weight',
        colUom: 'Unit of measure',
        colStock: 'Available stock',
        colMinStock: 'Minimum stock',
        colStatus: 'Status',
        colLabels: 'Labels',
        rows: '{n} rows',
    },
};
