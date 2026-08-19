// English mirror of he/libraries.js — same keys, real translations.
export default {
    title: 'Formula libraries',
    sub: 'The libraries the compounding wizard loads — maintained in the system database',
    readOnly:
        'The libraries are shown here read-only, exactly as the wizard loads them. Adding and editing happen in the system database.',

    // The formula editor is its own wizard — a separate screen this console
    // links to rather than contains.
    newFormula: {
        label: 'New formula',
        title: 'New formula',
        body: 'The formula editor opens',
    },

    tab: {
        system: 'House formulas',
        preset: 'Classical Chinese formulas',
        free: 'Free-pour bases',
    },

    count: {
        system: 'of {n} house formulas',
        preset: 'of {n} classical formulas',
        free: 'of {n} bases',
    },

    search: {
        system: 'Formula name · herbs in the summary',
        preset: 'English name · Chinese · pinyin · indication',
        free: 'Item code · base name · volume',
    },

    filter: {
        optionCount: '{label} ({n})',
        form: 'Preparation form',
        formAll: 'Preparation form — all',
        size: 'Herb count',
        sizeAll: 'Herb count — all',
        composition: 'Composition',
        compositionAll: 'Composition — all',
        source: 'Classical source',
        sourceAll: 'Classical source — all',
        shelfForm: 'Shelf form',
        shelfFormAll: 'Shelf form — all',
        price: 'Price range',
        priceAll: 'Price — all',
    },

    band: {
        size: {
            lt5: 'Up to 4 herbs',
            '5to6': '5–6 herbs',
            gt6: '7 and above',
        },
        price: {
            lt80: 'Up to ₪80',
            '80to120': '₪80–120',
            gt120: 'Over ₪120',
        },
    },

    shelfUnit: {
        ml: 'Liquid (ml)',
        capsule: 'Capsules',
        g: 'Ointment / powder (g)',
    },

    // The volume as it is printed on the shelf.
    size: {
        ml: '{n} ml',
        capsule: '{n} capsules',
        g: '{n} g',
    },

    col: {
        name: 'Formula name',
        presetName: 'Name',
        form: 'Preparation form',
        herbs: 'Herbs',
        composition: 'Composition',
        source: 'Classical source',
        indication: 'Indication',
        sku: 'Item code',
        base: 'Base',
        shelfSize: 'Shelf volume',
        price: 'Price',
        actions: '',
    },

    herbCount: '{n} herbs',
    compositionCell: '{n} herbs · base ratios locked',
    lockedRatios: 'base ratios locked',
    freePourBase: 'Free-pour base — base composition locked',

    empty: {
        system: {
            title: 'No formulas match the filter',
            sub: 'Clear the filter or pick another preparation form',
        },
        preset: {
            title: 'No formulas match the filter',
            sub: 'Clear the search or pick another classical source',
        },
        free: {
            title: 'No bases match the filter',
            sub: 'Clear the filter',
        },
    },

    preview: {
        open: 'Preview',
        title: 'Preview — as the practitioner sees it in the wizard',
        summary: 'Summary',
        nameZh: 'Chinese name',
        namePinyin: 'Pinyin',
        wizardNote:
            'The wizard offers the formula as a starting point. The practitioner can change doses, but the base composition is locked.',
    },
};
