// English mirror of he/lab.js — same keys, real translations.
export default {
    title: 'Lab',
    sub: 'The lab area is still in development — this screen shows no data',

    empty: {
        title: 'The lab screen has not been built yet',
        sub: 'Lab work runs from the orders screen for now: each item carries its compounding stage there and is advanced from it. When the lab area is built it will bring those actions together in one place.',
    },

    scopeTitle: 'What this area will cover',
    scope: {
        queue: 'The compounding queue — items waiting to be compounded, in priority order and by the pharmacist handling them',
        labels: 'Labels — producing and printing a label for every compounded item, directions of use included',
        types: 'Preparation types — defining the forms the lab can compound into, and the equipment each one needs',
        validity:
            'Validity — deriving a compounded item’s expiry date from its preparation form and from the batches that went into it',
    },

    where: 'Until then, an item’s compounding stage lives on the orders screen.',
    toOrders: 'Go to orders',
};
