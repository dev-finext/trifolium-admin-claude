// ארנק ונקודות זכות — נקודה אחת שווה שקל אחד, והיומן הוא מקור האמת היחיד
// ליתרה.
export default {
    title: 'ארנק ונקודות זכות',
    sub: '1 נקודה = ₪1 · יומן הנקודות במסד הנתונים הוא מקור האמת היחיד',

    noun: {
        practitioners: 'מטפלים',
        movements: 'תנועות · מתוך {total}',
    },

    kpi: {
        total: 'סך נקודות בשוק',
        totalSub: 'התחייבות של {value} · לחיצה מציגה הכל',
        withBalance: 'מטפלים עם יתרה',
        withBalanceSub: 'מתוך {n} · לחיצה מסננת',
        withoutBalance: 'בלי יתרת נקודות',
        withoutBalanceSub: 'לא צברו או מימשו הכל',
        withDebt: 'מטפלים עם חוב פתוח',
        withDebtSub: '{amount} · מנוהל בעמוד כספים',
        earned: 'סך צבירה ביומן',
        earnedSub: '{n} מטפלים עם צבירה · לחיצה מסננת',
        redeemed: 'סך מימוש ביומן',
        redeemedSub: '{n} מטפלים שמימשו · שווי {value}',
    },

    filter: {
        search: 'שם מטפל · מספר לקוח · טלפון',
        balanceAll: 'יתרה — הכל',
        withPoints: 'עם יתרת נקודות',
        withoutPoints: 'בלי יתרת נקודות',
        withDebt: 'עם חוב פתוח',
        withEarned: 'עם תנועות צבירה',
        withRedeemed: 'עם תנועות מימוש',
        kindAll: 'סוג — הכל',
        searchLedger: 'הזמנה · תאריך · סיבה',
    },

    list: {
        title: 'יתרות לפי מטפל',
        points: 'נקודות',
        value: 'שווי',
        debt: 'יתרת חוב',
        emptyTitle: 'לא נמצאו מטפלים',
        emptySub: 'נקה את החיפוש או הסינון',
    },

    // Points movement kinds — the ids the ledger rows carry.
    kind: {
        earn: 'צבירה',
        spend: 'מימוש',
    },

    ledger: {
        title: 'יומן נקודות · {name}',
        balance: 'יתרה',
        kind: 'סוג',
        points: 'נקודות',
        running: 'יתרה מצטברת',
        manual: 'התאמה ידנית',
        readOnly: 'לצפייה בלבד',
        emptyFilterTitle: 'אין תנועות שתואמות את הסינון',
        emptyFilterSub: 'נקה את הסינון',
        noMovesTitle: 'אין תנועות ביומן',
        noMovesSub: 'צבירה ומימוש יופיעו כאן',
    },

    adjust: {
        action: 'התאמה ידנית',
        title: 'התאמת נקודות ידנית',
        note: '1 נקודה = ₪1. ההתאמה נרשמת כשורה ביומן הנקודות עם סיבה ומבצע — היומן הוא מקור האמת ליתרה, והכרטיס זז רק יחד איתו.',
        amountLabel: 'כמות נקודות — חיובי לזיכוי, שלילי לגריעה',
        amountPlaceholder: '+50 / -25',
        invalid: 'יש להזין מספר שלם שאינו אפס — חיובי לזיכוי, שלילי לגריעה',
        after: 'יתרה לאחר ההתאמה: {points} נקודות ({value})',
        reasonLabel: 'סיבת ההתאמה — חובה, נרשמת ביומן',
        continue: 'המשך לאישור',
        confirmTitle: 'אישור התאמת נקודות',
        confirmBody:
            '{verb} של {points} נקודות ל{name} ({code}). היתרה תעבור מ-{from} ל-{to}.',
        credit: 'זיכוי',
        debit: 'גריעה',
        confirmAction: 'בצע התאמה',
        effect1: 'תיווסף שורת התאמה ידנית ליומן הנקודות',
        effect2: 'היתרה בכרטיס תתעדכן יחד עם היומן',
        effect3: 'הפעולה תירשם ביומן המערכת עם הסיבה והמבצע',
    },

    check: {
        action: 'בדיקת שלמות היומן',
        title: 'בדיקת שלמות יומן הנקודות',
        body: 'הפעולה מחשבת מחדש כל יתרה מסך תנועות הצבירה והמימוש שביומן, ומדווחת על כל פער.',
        confirm: 'הרץ בדיקה',
        effect1: 'חישוב מחדש של {n} יתרות מתוך היומן',
        effect2: 'פער בין יתרה מוצגת לסך התנועות יסומן כחריג',
        effect3: 'לא מבוצע תיקון אוטומטי — כל תיקון דורש התאמה ידנית מתועדת',
    },

    toast: {
        adjusted: 'ההתאמה בוצעה',
        adjustedBody: '{delta} נקודות · יתרה חדשה {balance}',
        gapsFound: 'נמצאו פערים ביומן',
        gapsBody: '{n} כרטיסים אינם תואמים ליומן: {names}',
        noGaps: 'הבדיקה עברה',
        noGapsBody: 'כל {n} היתרות תואמות ליומן',
    },
};
