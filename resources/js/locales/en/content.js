// English mirror of he/content.js — same keys, real translations.
export default {
    title: 'Content — articles & lectures',
    sub: 'The content practitioners see in the app and on the site',
    newArticle: 'New article',

    tab: {
        articles: 'Articles',
        events: 'Lectures & events',
    },

    count: {
        articles: 'of {n} articles',
        events: 'of {n} lectures and events',
    },

    search: {
        articles: 'Title · summary · author',
        events: 'Title · body · date',
    },

    filter: {
        optionCount: '{label} ({n})',
        category: 'Category',
        categoryAll: 'Category — all',
        state: 'Publication state',
        stateAll: 'State — all',
        system: 'Tradition',
        systemAll: 'Tradition — all',
        author: 'Author',
        authorAll: 'Author — all',
        readTime: 'Reading time',
        readTimeAll: 'Reading time — all',
        kind: 'Entry type',
        kindAll: 'Type — all',
    },

    band: {
        read: {
            lt6: 'Up to 5 min',
            '6to10': '6–10 min',
            gt10: 'Over 10 min',
        },
    },

    // Article categories, by the ids the records carry.
    cat: {
        herbs: 'Medicinal herbs',
        research: 'Research',
        clinical_tip: 'Clinical tip',
        monograph: 'Monograph',
        safety: 'Safety',
        tcm_theory: 'Chinese medicine theory',
        diagnosis: 'Diagnosis',
    },

    // The tradition the article is written within.
    system: {
        west: 'Western',
        chinese: 'Chinese',
    },

    state: {
        published: 'Published',
        draft: 'Draft',
    },

    // What kind of entry the what's-new feed is showing.
    eventKind: {
        event: 'Event',
        new_article: 'New article',
        system_update: 'System update',
        webinar: 'Webinar',
    },

    col: {
        title: 'Title',
        category: 'Category',
        author: 'Author',
        readTime: 'Reading time',
        system: 'Tradition',
        state: 'State',
        actions: '',
    },

    readMinutes: '{n} min',

    empty: {
        articles: {
            title: 'No articles match the filter',
            sub: 'Clear the search or pick another category',
        },
        events: {
            title: 'No events match the filter',
            sub: 'Clear the search',
        },
    },

    editor: {
        newTitle: 'New article',
        details: 'Article details',
        title: 'Title',
        titlePlaceholder: 'The article title',
        category: 'Category',
        readMin: 'Reading time (min)',
        system: 'Tradition',
        author: 'Author',
        excerpt: 'Summary',
        excerptPlaceholder: 'Two or three sentences on what the article covers',
        localeNote:
            'You are editing in the current interface language. The other language is kept as it is.',

        body: 'Article body — block editor',
        bodyEmpty: 'The article body is empty',
        bodyEmptyHint: 'Add a subheading or a paragraph to start',
        addHeading: 'Add heading',
        addParagraph: 'Add paragraph',
        moveUp: 'Move block up',
        moveDown: 'Move block down',
        removeBlock: 'Delete block',
        block: {
            h: 'Subheading',
            p: 'Paragraph',
        },
        blockPlaceholder: {
            h: 'The subheading',
            p: 'The paragraph text',
        },

        publication: 'Publication',
        publishedLabel: 'Published to practitioners',
        state: 'State',
        date: 'Date',
        blocks: 'Blocks in body',
    },

    preview: {
        open: 'Preview',
        title: 'Preview — as the practitioner reads it',
        untitled: 'Untitled',
        byline: '{author} · {n} min read',
    },

    toast: {
        saved: 'Article saved',
        updated: 'Article updated',
        savedBody: '{title} · state: {state}',
    },
};
