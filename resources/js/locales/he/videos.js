// סרטוני מערכת — סרטוני ההדרכה שמוצגים באתר. ה-ID של כל נקודת הצגה נקבע
// באתר, וכאן מזינים אותו בדיוק כפי שהוגדר שם.
export default {
    title: 'סרטוני מערכת',
    sub: 'סרטוני הדרכה שמוצגים באתר — ה-ID של כל נקודת הצגה נקבע באתר, וכאן מזינים אותו בדיוק',
    newVideo: 'סרטון חדש',

    count: 'מתוך {n} סרטונים',
    search: 'ID באתר · כותרת · נקודת עניין · קישור',

    filter: {
        length: 'אורך הסרטון',
        lengthAll: 'אורך — הכל',
        points: 'נקודות עניין',
        pointsAll: 'נקודות עניין — הכל',
    },

    band: {
        length: {
            lt3: 'עד 3 דק׳',
            '3to7': '3–7 דק׳',
            gt7: 'מעל 7 דק׳',
            none: 'ללא אורך מוגדר',
        },
        points: {
            has: 'עם נקודות עניין',
            none: 'בלי נקודות עניין',
        },
    },

    col: {
        slug: 'מזהה באתר (ID)',
        title: 'כותרת ונקודות עניין',
        youtube: 'יוטיוב',
        duration: 'אורך',
        actions: '',
    },

    pointCount: '{n} נקודות עניין',
    pointSummary: '{n} נקודות עניין · {first}',
    noDuration: '—',

    empty: {
        filtered: {
            title: 'אין סרטונים שתואמים את הסינון',
            sub: 'נקה את הסינון',
        },
        none: {
            title: 'אין סרטוני מערכת',
            sub: 'הוסיפו סרטון והזינו את ה-ID שהוגדר באתר',
        },
    },

    editor: {
        newTitle: 'סרטון מערכת חדש',
        editTitle: 'עריכת סרטון',
        slot: 'שיוך לאתר',
        slug: 'מזהה סרטון (ID)',
        slugPlaceholder: 'wizard-no-patient',
        youtube: 'קישור יוטיוב',
        youtubePlaceholder: 'https://youtu.be/…',
        duration: 'אורך',
        durationPlaceholder: '0:45',
        slugNote:
            'ה-ID של כל נקודת הצגה נקבע באתר. יש להזין אותו כאן בדיוק כפי שהוגדר — אחרת הסרטון לא ישויך ולא יוצג.',

        text: 'טקסט חופשי — כותרת ונקודות עניין',
        title: 'כותרת',
        titlePlaceholder: 'למשל: שמירת פורמולה ללא לקוח',
        points: 'נקודות עניין (״מה תראו בסרטון״)',
        point: 'נקודת עניין {n}',
        pointPlaceholder: 'מה רואים בשלב הזה…',
        addPoint: 'הוסף נקודה',
        removePoint: 'מחיקת נקודה',
        localeNote:
            'הכותרת ונקודות העניין נערכות בשפת הממשק הנוכחית. השפה השנייה נשמרת כפי שהיא.',

        preview: 'תצוגה מקדימה — כפי שמוצג באתר',
        previewTitle: 'כותרת הסרטון',
        previewPoints: 'מה תראו בסרטון',
        previewPointHint: 'נקודת עניין ראשונה…',
    },

    toast: {
        added: 'הסרטון נוסף',
        updated: 'הסרטון עודכן',
        body: '{title} · ID: {slug}',
    },
};
