// Editorial content the practitioner site pulls from this console: the article
// library, the what's-new feed, the tutorial videos, and the formula libraries
// the compounding wizard offers as a starting point.
//
// A video slot's `slug` is defined by the SITE — the record here must match it
// verbatim or the slot renders empty, which is why it is not translated.
import { L } from '@/lib/localized';

/** Categories an article is filed under. */
export const ARTICLE_CATEGORY_IDS = [
    'herbs',
    'research',
    'clinical_tip',
    'monograph',
    'safety',
    'tcm_theory',
    'diagnosis',
];

const AUTHOR = {
    saar: L('ד״ר רחל סער', 'Dr. Rachel Saar'),
    even: L('פרופ׳ דניאל אבן', 'Prof. Daniel Even'),
    levy: L('ענת לוי', 'Anat Levy'),
    benHaim: L('ד״ר יעל בן־חיים', 'Dr. Yael Ben-Haim'),
    shalem: L('אורי שלם', 'Uri Shalem'),
};

export const DEMO_ARTICLES = [
    {
        id: 'a1',
        title: L(
            'שילוב פסיפלורה וולריאן בטיפול בנדודי שינה',
            'Combining passionflower and valerian for insomnia',
        ),
        excerpt: L(
            'מחקר חדש מצביע על אפקט סינרגיסטי בין שני הצמחים, עם השפעה מובהקת על איכות השינה ללא אפקט מטמטם.',
            'New research points to a synergistic effect between the two herbs, with a marked improvement in sleep quality and no next-day dulling.',
        ),
        cat: 'herbs',
        author: AUTHOR.saar,
        readMin: 7,
        system: 'west',
        published: true,
    },
    {
        id: 'a2',
        title: L(
            'כורכומין: ביו-זמינות והדרכים לשפר אותה',
            'Curcumin: bioavailability and how to improve it',
        ),
        excerpt: L(
            'סקירה של השיטות העדכניות להגדלת הספיגה — פיפרין, ליפוזומים, ננו-מולקולות. מה באמת עובד בקליניקה?',
            'A review of current absorption strategies — piperine, liposomes, nano-formulations. What actually works in clinic?',
        ),
        cat: 'research',
        author: AUTHOR.even,
        readMin: 12,
        system: 'west',
        published: true,
    },
    {
        id: 'a3',
        title: L(
            'איך להציג פורמולה ללקוח ראשון',
            'How to present a formula to a first-time customer',
        ),
        excerpt: L(
            'שיחת ההתחלה היא הכל. שיטה מסודרת להציג מטרות, יחסים והוראות שימוש בשפה ברורה ובוטחת.',
            'The opening conversation is everything. A structured way to explain goals, ratios and directions in plain, confident language.',
        ),
        cat: 'clinical_tip',
        author: AUTHOR.levy,
        readMin: 5,
        system: 'west',
        published: true,
    },
    {
        id: 'a4',
        title: L(
            'אדפטוגנים בעידן של שחיקה כרונית',
            'Adaptogens in an age of chronic burnout',
        ),
        excerpt: L(
            'אשווגנדה, רודיולה ושיזנדרה — כיצד לבחור את האדפטוגן הנכון לפי פרופיל הלקוח, ולא לפי האופנה.',
            'Ashwagandha, rhodiola and schisandra — choosing the right adaptogen by the client in front of you, not by fashion.',
        ),
        cat: 'herbs',
        author: AUTHOR.saar,
        readMin: 9,
        system: 'west',
        published: true,
    },
    {
        id: 'a5',
        title: L(
            'אכינצאה: מתי באמת להשתמש ובאיזה מינון',
            'Echinacea: when it really helps, and at what dose',
        ),
        excerpt: L(
            'הצמח הנפוץ ביותר לחיזוק חיסון — אך התזמון והמינון קובעים אם הוא יעבוד. סקירה קלינית מבוססת ראיות.',
            'The most common immune herb there is — but timing and dose decide whether it works at all. An evidence-based clinical review.',
        ),
        cat: 'monograph',
        author: AUTHOR.even,
        readMin: 8,
        system: 'west',
        published: true,
    },
    {
        id: 'a6',
        title: L(
            'גדילן מצוי וההגנה על הכבד',
            'Milk thistle and liver protection',
        ),
        excerpt: L(
            'סילימרין — מנגנון ההגנה ההפטו-פרוטקטיבי, ראיות קליניות, ושילוב נכון בפורמולות ניקוי.',
            'Silymarin — the hepatoprotective mechanism, the clinical evidence, and how to place it in a cleansing formula.',
        ),
        cat: 'research',
        author: AUTHOR.saar,
        readMin: 10,
        system: 'west',
        published: true,
    },
    {
        id: 'a7',
        title: L(
            'אינטראקציות צמחים-תרופות: מתי להיזהר',
            'Herb–drug interactions: when to be careful',
        ),
        excerpt: L(
            'מדריך מעשי לזיהוי שילובים מסוכנים — פרע מחורר, שוש, כורכום וזנגביל מול תרופות מרשם נפוצות.',
            "A practical guide to spotting risky pairs — St John's wort, licorice, turmeric and ginger against common prescriptions.",
        ),
        cat: 'safety',
        author: AUTHOR.even,
        readMin: 11,
        system: 'west',
        published: true,
    },
    {
        id: 'a8',
        title: L(
            'צמחי מרפא בעונת המעבר — תמיכה הורמונלית',
            'Herbal medicine through menopause — hormonal support',
        ),
        excerpt: L(
            'גישה מותאמת לתסמיני גיל המעבר: גלי חום, שינה ומצב רוח — בלי הורמונים, עם פורמולה חכמה.',
            'A tailored approach to menopausal symptoms: hot flushes, sleep and mood — no hormones, one well-built formula.',
        ),
        cat: 'clinical_tip',
        author: AUTHOR.levy,
        readMin: 6,
        system: 'west',
        published: true,
    },
    {
        id: 'c1',
        title: L(
            'מבנה הפורמולה הסינית: מלך, שר, יועץ ושליח',
            'The Chinese formula: emperor, minister, assistant and envoy',
        ),
        excerpt: L(
            'העיקרון המארגן של כל מרשם קלאסי — כיצד ארבעת התפקידים בונים פורמולה מאוזנת ומכוונת מטרה.',
            'The organising principle of every classical prescription — how the four roles build a balanced, purposeful formula.',
        ),
        cat: 'tcm_theory',
        author: AUTHOR.benHaim,
        readMin: 9,
        system: 'chinese',
        published: true,
    },
    {
        id: 'c2',
        title: L(
            'זוגות צמחים (药对) — סינרגיה בפרקטיקה הסינית',
            'Herb pairs (药对) — synergy in Chinese practice',
        ),
        excerpt: L(
            'צמדים קלאסיים שבהם 1+1 גדול משתיים — מנגנון הזיווג, דוגמאות מובילות ושיקולי מינון.',
            'Classical pairs where one plus one is more than two — how the pairing works, the leading examples, and dosing.',
        ),
        cat: 'herbs',
        author: AUTHOR.shalem,
        readMin: 7,
        system: 'west',
        published: true,
    },
    {
        id: 'c3',
        title: L(
            'אבחון לפי לשון ודופק — יסודות מעשיים',
            'Tongue and pulse diagnosis — practical foundations',
        ),
        excerpt: L(
            'שתי שיטות האבחון המרכזיות ברפואה הסינית: מה לחפש, איך לתעד, וכיצד לתרגם ממצא לפורמולה.',
            'The two central diagnostic methods in Chinese medicine: what to look for, how to record it, and how a finding becomes a formula.',
        ),
        cat: 'diagnosis',
        author: AUTHOR.benHaim,
        readMin: 10,
        system: 'west',
        published: true,
    },
    {
        id: 'c4',
        title: L(
            'ארבעת הטבעים וחמשת הטעמים בבחירת צמחים',
            'The four natures and five flavours in choosing herbs',
        ),
        excerpt: L(
            'התכונות הבסיסיות שמסווגות כל צמח סיני — קור־חום וטעם — וכיצד הן מכוונות את הבחירה הקלינית.',
            'The basic properties that classify every Chinese herb — cold to hot, and flavour — and how they steer a clinical choice.',
        ),
        cat: 'tcm_theory',
        author: AUTHOR.shalem,
        readMin: 6,
        system: 'chinese',
        published: true,
    },
];

/** What kind of item the what's-new feed is showing. */
export const EVENT_KIND_IDS = [
    'event',
    'new_article',
    'system_update',
    'webinar',
];

export const DEMO_EVENTS = [
    {
        id: 'e1',
        kind: 'event',
        title: L(
            'כנס שנתי לרפואת צמחים — תל אביב',
            'Annual herbal medicine conference — Tel Aviv',
        ),
        desc: L(
            'יום עיון מקצועי עם ד״ר רחל סער ועוד 12 מרצים מובילים בתחום.',
            'A professional study day with Dr. Rachel Saar and 12 other leading speakers.',
        ),
        date: '2026-06-12',
    },
    {
        id: 'e2',
        kind: 'new_article',
        title: L(
            'אדפטוגנים בעידן של שחיקה כרונית',
            'Adaptogens in an age of chronic burnout',
        ),
        desc: L(
            'סקירה קלינית עדכנית של אשווגנדה, רודיולה ושיזנדרה במצבי דחק.',
            'An up-to-date clinical review of ashwagandha, rhodiola and schisandra under stress.',
        ),
        date: '2026-05-24',
    },
    {
        id: 'e3',
        kind: 'system_update',
        title: L(
            'מאגר רכיבים עודכן — 14 צמחים חדשים',
            'Ingredient database updated — 14 new herbs',
        ),
        desc: L(
            'כולל סייבריאן, אסטרגלוס סיני ועוד צמחים נדירים מטיבט.',
            'Including Siberian ginseng, Chinese astragalus and other rare herbs from Tibet.',
        ),
        date: '2026-05-20',
    },
    {
        id: 'e4',
        kind: 'webinar',
        title: L(
            'אינטראקציות צמחים-תרופות — מה חדש?',
            "Herb–drug interactions — what's new?",
        ),
        desc: L(
            'הקלטה זמינה לצפייה. כולל מצגות וחומרי קריאה להורדה.',
            'The recording is available to watch. Slides and reading material can be downloaded.',
        ),
        date: '2026-05-15',
    },
];

/** Tutorial video slots. `slug` must match the site's slot id verbatim. */
export const DEMO_VIDEOS = [
    {
        id: 'v1',
        slug: 'home-welcome',
        youtube: 'https://youtu.be/kX3nB4wQ7Lo',
        duration: '3:45',
        title: L('ברוכים הבאים לטריפוליום V2', 'Welcome to Trifolium V2'),
        points: [
            L(
                'סיור מודרך בממשק הראשי ובתפריטים',
                'A guided tour of the main interface and its menus',
            ),
            L(
                'איפה מוצאים לקוחות, פורמולות והזמנות',
                'Where to find customers, formulas and orders',
            ),
            L(
                'הגדרות פרופיל ראשוניות למטפל חדש',
                'First profile settings for a new practitioner',
            ),
        ],
    },
    {
        id: 'v2',
        slug: 'wizard-new-formula',
        youtube: 'https://youtu.be/pR8mT2vE1Fk',
        duration: '7:12',
        title: L(
            'כיצד להכין פורמולה אישית מאפס',
            'Building a personal formula from scratch',
        ),
        points: [
            L(
                'בחירת לקוח ופתיחת אשף הרקיחה',
                'Picking a customer and opening the compounding wizard',
            ),
            L(
                'הוספת צמחים ובדיקת אינטראקציות תוך כדי',
                'Adding herbs and checking interactions as you go',
            ),
            L(
                'שליחת קישור תשלום ללקוח בוואטסאפ',
                'Sending the customer a payment link on WhatsApp',
            ),
        ],
    },
    {
        id: 'v3',
        slug: 'wizard-no-patient',
        youtube: 'https://youtu.be/zW5cJ9dH3Ma',
        duration: '0:45',
        title: L('שמירת פורמולה ללא לקוח', 'Saving a formula with no customer'),
        points: [
            L(
                "בוחרים 'ללא לקוח' בשלב בחירת הלקוח",
                'Choose "no customer" at the customer step',
            ),
            L(
                'רוקחים את הפורמולה כרגיל במעבדה',
                'The lab compounds the formula as usual',
            ),
            L(
                'הפורמולה נשמרת בטיוטות — מקשרים לקוח בכל שלב',
                'It is saved as a draft — attach a customer whenever you like',
            ),
        ],
    },
    {
        id: 'v4',
        slug: 'ingredients-interactions',
        youtube: 'https://youtu.be/fQ6yN8sK2Rd',
        duration: '5:30',
        title: L(
            'עבודה עם מאגר הרכיבים ואינטראקציות',
            'Working with the ingredient database and interactions',
        ),
        points: [
            L(
                'סינון וחיפוש במאגר הצמחים',
                'Filtering and searching the herb database',
            ),
            L(
                'בדיקת התאמה בין צמח לתרופה מערבית',
                'Checking a herb against a western drug',
            ),
            L(
                'מה עושים כשמופיעה אזהרת אינטראקציה',
                'What to do when an interaction warning appears',
            ),
        ],
    },
    {
        id: 'v5',
        slug: 'patients-records',
        youtube: 'https://youtu.be/hT4bV7gL9Se',
        duration: '4:18',
        title: L(
            'ניהול לקוחות ורישומים רפואיים',
            'Managing customers and medical records',
        ),
        points: [
            L(
                'פתיחת תיק לקוח והיסטוריית פורמולות',
                'Opening a customer file and its formula history',
            ),
            L('תזכורות והערות פרטיות', 'Reminders and private notes'),
        ],
    },
    {
        id: 'v6',
        slug: 'orders-tracking',
        youtube: 'https://youtu.be/mC2xD5aP8Ng',
        duration: '4:02',
        title: L('מעקב אחר הזמנות וסטטוסים', 'Tracking orders and statuses'),
        points: [
            L(
                'מה קורה בין המעבדה ללקוח',
                'What happens between the lab and the customer',
            ),
            L(
                'עדכוני סטטוס ומספרי מעקב',
                'Status updates and tracking numbers',
            ),
            L(
                'איך פונים לתמיכה מתוך הזמנה',
                'How to reach support from inside an order',
            ),
        ],
    },
];

/**
 * Formula libraries the compounding wizard loads. `sys` are the pharmacy's own
 * house formulas; `preset` are the classical Chinese prescriptions, whose
 * romanised and Chinese names are part of the record and stay untranslated.
 */
export const DEMO_FORMULA_LIBRARY = {
    sys: [
        {
            id: 'sys1',
            name: L('תמצית הרגעה בסיסית', 'Basic calming extract'),
            summary: L(
                'ולריאן · פסיפלורה · מליסה · בבונג',
                'Valerian · passionflower · lemon balm · chamomile',
            ),
            typeId: 'tincture',
            ing: 4,
        },
        {
            id: 'sys2',
            name: L('מיקס חיסון עונתי', 'Seasonal immune mix'),
            summary: L(
                'אכינצאה · סמבוק · אסטרגלוס · זנגביל',
                'Echinacea · elder · astragalus · ginger',
            ),
            typeId: 'tincture',
            ing: 4,
        },
        {
            id: 'sys3',
            name: L('תה עיכול קלאסי', 'Classic digestive tea'),
            summary: L(
                'מנטה · שומר · בבונג · זנגביל',
                'Peppermint · fennel · chamomile · ginger',
            ),
            typeId: 'tea',
            ing: 4,
        },
        {
            id: 'sys4',
            name: L('איזון הורמונלי לאישה', "Women's hormonal balance"),
            summary: L(
                'שיח אברהם · מרווה · אשווגנדה · עלי פטל',
                'Chaste tree · sage · ashwagandha · raspberry leaf',
            ),
            typeId: 'tincture',
            ing: 4,
        },
    ],
    preset: [
        {
            id: 'guizhi_tang',
            nameEn: 'Gui Zhi Tang',
            nameZh: '桂枝汤',
            namePinyin: 'Guì Zhī Tāng',
            source: 'Shang Han Lun · 傷寒論',
            indication: L(
                'שחרור החיצון, הרמוניזציה של יינג וויי — רוח-קור חיצוני עם הזעה ספונטנית',
                'Release the exterior, harmonise ying and wei — external wind-cold with spontaneous sweating',
            ),
            typeId: 'tincture',
            ing: 5,
        },
        {
            id: 'baitouweng_tang',
            nameEn: 'Bai Tou Weng Tang',
            nameZh: '白头翁汤',
            namePinyin: 'Bái Tóu Wēng Tāng',
            source: 'Shang Han Lun · 傷寒論',
            indication: L(
                'ניקוי חום-רעלים, קירור דם — דיזנטריה ממחום-רעלים, דם בצואה',
                'Clear heat-toxin, cool the blood — dysentery from heat-toxin, blood in the stool',
            ),
            typeId: 'tincture',
            ing: 4,
        },
        {
            id: 'xiao_yao_san',
            nameEn: 'Xiao Yao San',
            nameZh: '逍遥散',
            namePinyin: 'Xiāo Yáo Sǎn',
            source: 'Tai Ping Hui Min He Ji Ju Fang · 太平惠民和劑局方',
            indication: L(
                'פיזור Qi כבד, חיזוק טחול, הזנת דם — עצירת Qi כבד עם חוסר דם',
                'Spread liver qi, strengthen the spleen, nourish blood — liver qi stagnation with blood deficiency',
            ),
            typeId: 'tincture',
            ing: 8,
        },
        {
            id: 'si_jun_zi_tang',
            nameEn: 'Si Jun Zi Tang',
            nameZh: '四君子汤',
            namePinyin: 'Sì Jūn Zǐ Tāng',
            source: 'Tai Ping Hui Min He Ji Ju Fang · 太平惠民和劑局方',
            indication: L(
                'חיזוק Qi הטחול והקיבה — חוסר Qi של טחול-קיבה, עייפות ואין-אוניה',
                'Tonify spleen and stomach qi — spleen-stomach qi deficiency, fatigue and weakness',
            ),
            typeId: 'tincture',
            ing: 4,
        },
        {
            id: 'liu_wei_di_huang_wan',
            nameEn: 'Liu Wei Di Huang Wan',
            nameZh: '六味地黄丸',
            namePinyin: 'Liù Wèi Dì Huáng Wán',
            source: 'Xiao Er Yao Zheng Zhi Jue · 小兒藥證直訣',
            indication: L(
                'הזנת Yin הכליות — חוסר Yin כליות-כבד, חום ריק, הזעות לילה',
                'Nourish kidney yin — kidney-liver yin deficiency, empty heat, night sweats',
            ),
            typeId: 'capsule',
            ing: 6,
        },
        {
            id: 'bu_zhong_yi_qi_tang',
            nameEn: 'Bu Zhong Yi Qi Tang',
            nameZh: '补中益气汤',
            namePinyin: 'Bǔ Zhōng Yì Qì Tāng',
            source: 'Pi Wei Lun · 脾胃論',
            indication: L(
                'חיזוק Qi טחול-קיבה, הרמת יאנג השוקע — שקיעת יאנג עם עייפות כרונית',
                'Tonify spleen-stomach qi, raise sinking yang — yang collapse with chronic fatigue',
            ),
            typeId: 'tincture',
            ing: 6,
        },
        {
            id: 'si_wu_tang',
            nameEn: 'Si Wu Tang',
            nameZh: '四物汤',
            namePinyin: 'Sì Wù Tāng',
            source: 'Tai Ping Hui Min He Ji Ju Fang · 太平惠民和劑局方',
            indication: L(
                'הזנת דם והסדרתו — חוסר דם עם עצירת דם, מחזור לא סדיר, ראש תופף',
                'Nourish and regulate the blood — blood deficiency with stasis, irregular cycles, throbbing head',
            ),
            typeId: 'tincture',
            ing: 4,
        },
    ],
};
