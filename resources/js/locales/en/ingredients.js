// Formula ingredients catalogue.
export default {
    title: 'Formula ingredients',
    crumb: 'Formula ingredients',
    sub: '{total} ingredients in the catalogue · {west} Western · {chinese} Chinese · every new stock item is created here',

    kind: {
        raw: 'Raw material',
        base: 'Base',
        pack: 'Packaging',
    },
    system: {
        west: 'Western',
        chinese: 'Chinese',
    },
    unit: {
        g: 'g',
        ml: 'ml',
        unit: 'units',
    },

    kpi: {
        all: 'All ingredients',
        allSub: 'Click to show all',
        filters: 'Click to filter',
        low: 'Below minimum',
        lowSub: 'Needs a goods receipt',
        chinese: 'Chinese ingredients',
    },

    filter: {
        count: 'ingredients · of {total}',
        search: 'Name · Latin · Chinese · SKU · pricing code',
        kind: 'Kind — all',
        unit: 'Unit — all',
        warehouse: 'Warehouse — all',
        stock: 'Stock — all',
        stockLow: 'Below minimum',
        stockZero: 'Out of stock',
        stockOk: 'Above minimum',
        system: 'Method — all',
        priceGroup: 'Pricing — all',
        noGroup: 'No pricing group',
    },

    col: {
        sku: 'SKU',
        priceCode: 'Pricing: {code}',
        name: 'Ingredient',
        kind: 'Kind',
        unit: 'Unit',
        warehouse: 'Warehouse',
        stock: 'Stock',
        min: 'Minimum',
        priceGroup: 'Pricing group',
        actions: 'Actions',
    },

    stock: {
        onHand: '{qty} {unit}',
        available: 'available {qty}',
        low: 'Below minimum',
        empty: 'Out',
        noGroup: '— none —',
    },

    action: {
        add: 'New ingredient',
        edit: 'Edit',
        remove: 'Delete',
        export: 'Export to Excel',
    },

    editor: {
        newTitle: 'New ingredient',
        editTitle: 'Edit ingredient · {name}',
        createConfirm: 'Create ingredient',
        saveConfirm: 'Save changes',
        missing: 'Missing: {fields}',
        identity: 'Ingredient identity',
        codes: 'Codes and warehouse',
        availability: 'Availability and stock',
        name: 'Ingredient name',
        nameHint:
            'The name the practitioner sees in the compounding wizard and on the label',
        kind: 'Ingredient kind',
        lat: 'Latin name',
        latHint: 'Optional — shown to the pharmacist',
        cn: 'Chinese name / Pinyin',
        system: 'Method',
        sku: 'Stock SKU',
        skuHint: 'Digits, Latin letters and a hyphen · 3–20 characters',
        priceSku: 'Pricing code',
        priceHint: '3–8 digits — determines the price group',
        priceGroupResolved: 'Resolves to group: {group}',
        priceGroupNone: 'No matching pricing group',
        unit: 'Unit of measure',
        warehouse: 'Default warehouse',
        min: 'Minimum stock',
        minHint:
            'Below this level the ingredient is unavailable in the compounding wizard',
        required: 'Required',
    },

    field: {
        name: 'name',
        sku: 'SKU',
        priceSku: 'pricing code',
        min: 'minimum stock',
    },

    validate: {
        nameShort: 'Enter an ingredient name',
        nameLong: 'Up to 80 characters',
        skuMissing: 'Enter a SKU',
        skuLength: 'SKU must be 3–20 characters',
        skuChars: 'Digits, Latin letters and a hyphen only',
        skuTaken: 'This SKU already exists',
        priceFormat: 'A pricing code is 3–8 digits',
        priceTaken: 'This pricing code belongs to another ingredient',
        minMissing: 'Enter a minimum stock level',
        minInteger: 'Whole number only',
        minHigh: 'Value is too high',
    },

    remove: {
        title: 'Delete ingredient',
        confirm: 'Delete ingredient',
        body: '{name} ({sku}) will be removed from the ingredient catalogue.',
        effectWizard:
            'The ingredient will no longer appear in the compounding wizard or goods receipt',
        effectHistory:
            'It has no stock, batches or formulas — so no historical data is affected',
        effectLog:
            'The deletion, its reason and the operator are written to the log',
        blockedTitle: 'This ingredient cannot be deleted',
        blockedBody: '{name} ({sku}) is linked to existing data: {deps}.',
        depStock: '{qty} {unit} in stock',
        depBatches: '{n} batches',
        depFormulas: '{n} formulas',
    },

    toast: {
        created: 'Ingredient created',
        createdBody: '{name} · {sku} · stock 0 — arrives via a goods receipt',
        updated: 'Ingredient updated',
        updatedBody: '{name} · {sku}',
        removed: 'Ingredient deleted',
        removedBody: '{name} · reason: {reason}',
        exported: 'Export ready',
        exportedBody: '{n} rows · {file}',
    },

    empty: {
        title: 'No matching ingredients',
        hint: 'Try changing the filters or the search.',
    },
};
