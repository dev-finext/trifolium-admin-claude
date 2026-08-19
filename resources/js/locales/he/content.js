// תוכן — מאמרים והרצאות. המסך שעורך התוכן עובד בו: ספריית המאמרים שמוצגת
// למטפלים באפליקציה ובאתר, ולוח העדכונים והאירועים שמופיע לצידה.
export default {
    title: 'תוכן — מאמרים והרצאות',
    sub: 'התוכן שמוצג למטפלים באפליקציה ובאתר',
    newArticle: 'מאמר חדש',

    tab: {
        articles: 'מאמרים',
        events: 'הרצאות ואירועים',
    },

    count: {
        articles: 'מתוך {n} מאמרים',
        events: 'מתוך {n} הרצאות ואירועים',
    },

    search: {
        articles: 'כותרת · תקציר · מחבר',
        events: 'כותרת · תוכן · תאריך',
    },

    filter: {
        optionCount: '{label} ({n})',
        category: 'קטגוריה',
        categoryAll: 'קטגוריה — הכל',
        state: 'מצב פרסום',
        stateAll: 'מצב — הכל',
        system: 'שיטה',
        systemAll: 'שיטה — הכל',
        author: 'מחבר',
        authorAll: 'מחבר — הכל',
        readTime: 'זמן קריאה',
        readTimeAll: 'זמן קריאה — הכל',
        kind: 'סוג הרשומה',
        kindAll: 'סוג — הכל',
    },

    band: {
        read: {
            lt6: 'עד 5 דק׳',
            '6to10': '6–10 דק׳',
            gt10: 'מעל 10 דק׳',
        },
    },

    // קטגוריות המאמרים, לפי המזהים שהרשומות נושאות.
    cat: {
        herbs: 'צמחי מרפא',
        research: 'מחקר',
        clinical_tip: 'טיפ קליני',
        monograph: 'מונוגרפיה',
        safety: 'בטיחות',
        tcm_theory: 'תורת הרפואה הסינית',
        diagnosis: 'אבחון',
    },

    // שיטת הרפואה שהמאמר נכתב בתוכה.
    system: {
        west: 'מערבית',
        chinese: 'סינית',
    },

    state: {
        published: 'מפורסם',
        draft: 'טיוטה',
    },

    // סוג הרשומה בלוח העדכונים והאירועים.
    eventKind: {
        event: 'אירוע',
        new_article: 'מאמר חדש',
        system_update: 'עדכון מערכת',
        webinar: 'וובינר',
    },

    col: {
        title: 'כותרת',
        category: 'קטגוריה',
        author: 'מחבר',
        readTime: 'זמן קריאה',
        system: 'שיטה',
        state: 'מצב',
        actions: '',
    },

    readMinutes: '{n} דק׳',

    empty: {
        articles: {
            title: 'אין מאמרים שתואמים את הסינון',
            sub: 'נקה את החיפוש או בחר קטגוריה אחרת',
        },
        events: {
            title: 'אין אירועים שתואמים את הסינון',
            sub: 'נקה את החיפוש',
        },
    },

    editor: {
        newTitle: 'מאמר חדש',
        details: 'פרטי המאמר',
        title: 'כותרת',
        titlePlaceholder: 'כותרת המאמר',
        category: 'קטגוריה',
        readMin: 'זמן קריאה (דק׳)',
        system: 'שיטה',
        author: 'מחבר',
        excerpt: 'תקציר',
        excerptPlaceholder: 'שני-שלושה משפטים שמסבירים על מה המאמר',
        localeNote:
            'העריכה נעשית בשפת הממשק הנוכחית. השפה השנייה נשמרת כפי שהיא.',

        body: 'גוף המאמר — עורך בלוקים',
        bodyEmpty: 'גוף המאמר ריק',
        bodyEmptyHint: 'הוסיפו כותרת ביניים או פסקה כדי להתחיל',
        addHeading: 'הוסף כותרת',
        addParagraph: 'הוסף פסקה',
        moveUp: 'העלה בלוק',
        moveDown: 'הורד בלוק',
        removeBlock: 'מחק בלוק',
        block: {
            h: 'כותרת ביניים',
            p: 'פסקה',
        },
        blockPlaceholder: {
            h: 'כותרת הביניים',
            p: 'תוכן הפסקה',
        },

        publication: 'פרסום',
        publishedLabel: 'מפורסם למטפלים',
        state: 'מצב',
        date: 'תאריך',
        blocks: 'בלוקים בגוף',
    },

    preview: {
        open: 'תצוגה מקדימה',
        title: 'תצוגה מקדימה — כפי שהמאמר מוצג למטפל',
        untitled: 'ללא כותרת',
        byline: '{author} · {n} דק׳ קריאה',
    },

    toast: {
        saved: 'המאמר נשמר',
        updated: 'המאמר עודכן',
        savedBody: '{title} · מצב: {state}',
    },
};
