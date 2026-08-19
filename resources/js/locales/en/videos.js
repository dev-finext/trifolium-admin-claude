// English mirror of he/videos.js — same keys, real translations.
export default {
    title: 'System videos',
    sub: 'Tutorial videos shown on the site — each slot ID is defined by the site, and is entered here verbatim',
    newVideo: 'New video',

    count: 'of {n} videos',
    search: 'Site ID · title · interest point · link',

    filter: {
        length: 'Video length',
        lengthAll: 'Length — all',
        points: 'Interest points',
        pointsAll: 'Interest points — all',
    },

    band: {
        length: {
            lt3: 'Up to 3 min',
            '3to7': '3–7 min',
            gt7: 'Over 7 min',
            none: 'No length recorded',
        },
        points: {
            has: 'With interest points',
            none: 'Without interest points',
        },
    },

    col: {
        slug: 'Site ID',
        title: 'Title & interest points',
        youtube: 'YouTube',
        duration: 'Length',
        actions: '',
    },

    pointCount: '{n} interest points',
    pointSummary: '{n} interest points · {first}',
    noDuration: '—',

    empty: {
        filtered: {
            title: 'No videos match the filter',
            sub: 'Clear the filter',
        },
        none: {
            title: 'No system videos yet',
            sub: 'Add a video and enter the ID defined on the site',
        },
    },

    editor: {
        newTitle: 'New system video',
        editTitle: 'Edit video',
        slot: 'Site slot',
        slug: 'Video ID',
        slugPlaceholder: 'wizard-no-customer',
        youtube: 'YouTube link',
        youtubePlaceholder: 'https://youtu.be/…',
        duration: 'Length',
        durationPlaceholder: '0:45',
        slugNote:
            'Each slot ID is defined by the site. Enter it here exactly as it was defined there — otherwise the video is not matched to a slot and never appears.',

        text: 'Free text — title and interest points',
        title: 'Title',
        titlePlaceholder: 'For example: saving a formula with no customer',
        points: 'Interest points ("what you will see")',
        point: 'Interest point {n}',
        pointPlaceholder: 'What this step shows…',
        addPoint: 'Add point',
        removePoint: 'Delete point',
        localeNote:
            'The title and interest points are edited in the current interface language. The other language is kept as it is.',

        preview: 'Preview — as the site shows it',
        previewTitle: 'Video title',
        previewPoints: 'What you will see',
        previewPointHint: 'First interest point…',
    },

    toast: {
        added: 'Video added',
        updated: 'Video updated',
        body: '{title} · ID: {slug}',
    },
};
