// English mirror of he/filters.js — the shared strings of the one filter system.
// Field and group labels live with their screen, under <ns>.filter.field.* and
// <ns>.filterGroup.*, because they belong to the content rather than to the
// component.
export default {
    title: 'Filters',
    open: 'Filters',
    openWith: 'Filters · {n}',
    clearAll: 'Clear all',
    resultCount: '{n} {noun}',
    hint: 'The number beside an option is what you get if you tick it — counted against the other active filters. An option that would return nothing is shown dimmed.',

    chips: {
        label: 'Active filters',
        remove: 'Remove the filter {name}',
    },

    savedViews: {
        label: 'Saved views',
        save: 'Save view',
        saveTitle: 'Save this view',
        saveConfirm: 'Save',
        nameLabel: 'View name',
        namePlaceholder: 'e.g. Batches expiring within 60 days',
        optional: '(optional)',
        autoName: 'View {n}',
        pin: 'Make this my standing filter',
        unpin: 'Clear the standing filter',
        remove: 'Delete the view {name}',
        empty: 'No saved filter yet. Filter with “Filters”, then save — it is kept for you in this browser.',
        saveHint:
            'The view is saved in this browser with the current filter. The date range is not part of it.',
        defaultHint:
            'The standing filter loads every time you open the screen, unless you arrived from a link carrying its own filter.',
    },
};
