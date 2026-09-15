// English mirror of he/attachments.js.
export default {
    title: 'Files',
    sub: '{n} files',
    add: 'Add a file',
    empty: 'No files attached',
    emptyHint: 'PDF, images, Word and Excel · up to {mb} MB',
    demoNote:
        'In the demo every file opens as a sample document of its kind; a file added here stays in the browser until a reload. Storage itself is the API’s job.',
    open: 'Open {name}',
    download: 'Download',
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

    viewer: {
        download: 'Download file',
        close: 'Close',
        noPreview: 'No preview for a {type} file',
        noPreviewBody:
            'The browser does not display Word and Excel files. Download the file and open it in the matching application.',
        noFile: 'No file behind this record in the demo',
        noFileBody:
            'The record shows the file’s details only — in the live system the file itself comes from the API.',
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
