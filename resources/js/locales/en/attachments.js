// English mirror of he/attachments.js.
export default {
    title: 'Files',
    sub: '{n} files',
    add: 'Add a file',
    empty: 'No files attached',
    emptyHint: 'PDF, images, Word and Excel · up to {mb} MB',
    demoNote:
        'The demo keeps the file’s details only — name, type, size, who and when. Storage itself is the API’s job.',
    remove: 'Remove',
    removeTitle: 'Remove file',
    removeBody: '{name} will be removed from {entity}. The log entry is kept.',
    removeConfirm: 'Remove file',

    col: {
        name: 'File',
        size: 'Size',
        by: 'Uploaded by',
        when: 'When',
        actions: 'Actions',
    },

    entity: {
        item: 'the item',
        batch: 'the batch',
        supplier: 'the supplier',
        purchase_order: 'the purchase order',
        practitioner: 'the practitioner',
        customer: 'the customer',
    },

    size: {
        kb: '{n} KB',
        mb: '{n} MB',
    },

    toast: {
        added: 'File attached',
        addedBody: '{name} · {size}',
        removed: 'File removed',
        removedBody: '{name} · reason: {reason}',
        tooBig: 'File too large',
        tooBigBody: '{name} — the limit is {mb} MB',
        badType: 'Unsupported file type',
        badTypeBody: '{name} — supported: {types}',
    },
};
