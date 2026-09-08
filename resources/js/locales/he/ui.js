// Strings the shared primitives in resources/js/components/ui/ show themselves:
// dialog buttons, empty and error states, sort hints, the date filter.
//
// Screen copy does not belong here — it goes in that screen's own catalog.
export default {
    facet: {
        search: 'חיפוש בערכים…',
        searchIn: 'חיפוש בתוך {name}',
        noMatch: 'אין ערך תואם',
        selectAll: 'בחר הכל',
        clear: 'נקה',
    },
    numOp: {
        label: 'אופרטור עבור {name}',
        gt: 'גדול מ־',
        lt: 'קטן מ־',
        eq: 'שווה ל־',
    },
    close: 'סגור',
    cancel: 'ביטול',
    confirm: 'אישור',
    clear: 'נקה',
    clearFilter: 'נקה סינון',
    retry: 'נסה שוב',
    showing: 'מציג {n} {label}',
    showingOf: 'מוצגים {n} מתוך {total}',
    noResults: 'אין תוצאות',
    noResultsHint: 'נסה לשנות את הסינון או את החיפוש',
    loadFailed: 'לא הצלחנו לטעון את הנתונים',
    loadFailedHint: 'נסה שוב. אם הבעיה חוזרת, רענן את הדף.',
    demo: 'הדגמה',
    reasonLabel: 'סיבה (חובה — נרשמת ביומן)',
    reasonPlaceholder: 'תיאור קצר של הסיבה',
    pinLabel: 'סיסמת אישור לביצוע הפעולה',
    pinWrong: 'סיסמה שגויה — נסה שוב',
    pinHint: 'הפעולה והמבצע נרשמים ביומן',
    whatHappens: 'מה יקרה בפועל',
    toggle: 'החלף',
    sortAsc: 'מיין בסדר עולה',
    sortDesc: 'מיין בסדר יורד',
    dateRange: 'טווח תאריכים',
    from: 'מתאריך',
    to: 'עד תאריך',
    // עימוד — הרכיב המשותף בתחתית כל טבלה
    page: {
        showing: 'מציג',
        of: 'מתוך',
        size: 'שורות בעמוד',
        prev: 'העמוד הקודם',
        next: 'העמוד הבא',
    },

    datePreset: {
        all: 'כל התאריכים',
        today: 'היום',
        7: '7 ימים',
        30: '30 ימים',
        month: 'החודש',
        custom: 'טווח מותאם',
    },
    payer: {
        practitioner: 'משלם: המטפל',
        patient: 'משלם: הלקוח',
    },
    interaction: {
        documented: 'אינטראקציה מתועדת',
    },
};
