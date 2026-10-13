// The address book — towns, and the streets in each.
export default {
    title: 'Address book',
    sub: '{cities} towns · {streets} streets',
    intro: 'The list an address is picked from. The customer chooses a town, and is then offered that town’s streets and no others.',

    cities: {
        heading: 'Towns',
        add: 'New town',
        search: 'Search towns',
        searchLabel: 'Search the list of towns',
        col: {
            name: 'Town',
            alt: 'In Hebrew',
            streets: 'Streets',
        },
        none: 'No towns on the list yet.',
        noneHint: 'Start with “New town”.',
        noMatch: 'No town matches the search.',
        pick: 'Pick a town to see its streets.',
    },

    streets: {
        headingEmpty: 'Streets',
        heading: 'Streets in {city}',
        add: 'New street',
        search: 'Search streets',
        searchLabel: 'Search this town’s streets',
        col: {
            name: 'Street',
            alt: 'In Hebrew',
        },
        none: 'This town has no streets yet.',
        noneHint: 'Add the first one with “New street”.',
        noMatch: 'No street matches the search.',
    },

    editor: {
        cityNew: 'New town',
        cityEdit: 'Edit town',
        streetNew: 'New street in {city}',
        streetEdit: 'Edit street in {city}',
        he: 'Name in Hebrew',
        en: 'Name in English',
        enHint: 'Optional. Left empty, the Hebrew name is shown in English too.',
        cityHePlaceholder: 'תל אביב',
        cityEnPlaceholder: 'Tel Aviv',
        streetHePlaceholder: 'רוטשילד',
        streetEnPlaceholder: 'Rothschild',
        save: 'Save',
        taken: 'That name is already on the list.',
    },

    remove: {
        cityTitle: 'Remove town',
        cityBody: 'Remove {city} from the address book?',
        cityConfirm: 'Remove the town',
        cityEffect1: 'Its {n} streets are removed with it.',
        cityEffect2:
            'Addresses already saved on existing orders do not change.',
        streetTitle: 'Remove street',
        streetBody: 'Remove {street} from {city}?',
        streetConfirm: 'Remove the street',
        streetEffect1:
            'It will no longer be offered when an address in this town is picked.',
        streetEffect2:
            'Addresses already saved on existing orders do not change.',
    },

    toast: {
        cityAdded: 'Town added',
        cityUpdated: 'Town renamed',
        cityRemoved: 'Town removed',
        streetAdded: 'Street added',
        streetUpdated: 'Street renamed',
        streetRemoved: 'Street removed',
        failed: 'Could not save',
        failedBody: 'The change was not saved. Try again.',
    },
};
