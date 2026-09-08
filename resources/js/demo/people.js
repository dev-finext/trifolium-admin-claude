// Everyone the console knows about: practitioners with a card in our database,
// registrations still waiting for approval, the patients those practitioners
// treat, and the pharmacy's own admin users.
//
// A customer record always points at exactly one practitioner — a customer with
// no practitioner cannot exist — so `buildCustomers()` derives the link from the
// orders rather than inventing it.
import { CUSTOMER_SOURCE_IDS } from '@/config/customers';
import { at, pickFrom, spread } from '@/demo/fixture';
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * Named actors the fixture attributes work to. Support agents appear under the
 * short form the console shows in a log line; the same people appear under
 * their full name on the admin-users screen.
 */
export const DEMO_ACTORS = {
    system: L('מערכת', 'System'),
    ronitSupport: L('רונית מ׳ (תמיכה)', 'Ronit M. (support)'),
    shaySupport: L('שי כ׳ (תמיכה)', 'Shay C. (support)'),
    noaSupport: L('נועה ב׳ (תמיכה)', 'Noa B. (support)'),
    aviLab: L('אבי ל׳ (מעבדה)', 'Avi L. (lab)'),
    aviPharmacist: L('אבי ל׳ (רוקח)', 'Avi L. (pharmacist)'),
    danaPharmacist: L('דנה ר׳ (רוקחת)', 'Dana R. (pharmacist)'),
    ronit: L('רונית מרדכי', 'Ronit Mordechai'),
    avi: L('אבי לוין', 'Avi Levin'),
    shay: L('שי כהן', 'Shay Cohen'),
    noa: L('נועה ברששת', 'Noa Bar-Sheshet'),
    danaRaz: L('דנה רז (רוקחת)', 'Dana Raz (pharmacist)'),
    practitionerRole: L('המטפל', 'The practitioner'),
};

/** Support agents a status change can be attributed to. */
export const SUPPORT_ACTORS = [
    DEMO_ACTORS.ronitSupport,
    DEMO_ACTORS.aviLab,
    DEMO_ACTORS.shaySupport,
];

/** Pharmacists who sign off a compounded formula. */
export const PHARMACIST_ACTORS = [
    DEMO_ACTORS.aviPharmacist,
    DEMO_ACTORS.danaPharmacist,
];

/** Join a person's two name halves into one localized value. */
export function fullName(person) {
    return L(
        `${person.first.he} ${person.last.he}`,
        `${person.first.en} ${person.last.en}`,
    );
}

/**
 * The signed-in agent and the demo-only credentials the console gates its
 * riskier actions behind. Real deployments authenticate against the server;
 * these exist so the confirmation flows can be exercised without one.
 */
export const DEMO_SESSION = {
    adminId: 'a1',
    actor: DEMO_ACTORS.ronitSupport,
    pin: '1234',
    adminPassword: 'trifolium',
    testPhone: '052-886-4546',
};

const SPEC = {
    women: L('נשים ופוריות', "Women's health & fertility"),
    pain: L('כאב כרוני', 'Chronic pain'),
    digestive: L('מערכת העיכול', 'Digestive system'),
    immune: L('מערכת החיסון', 'Immune system'),
    menopause: L('גיל המעבר', 'Menopause'),
    skin: L('עור ושיער', 'Skin & hair'),
    children: L('ילדים', 'Paediatrics'),
    mind: L('נפש ורגש', 'Mind & emotion'),
};

const CITY = {
    telAviv: L('תל אביב', 'Tel Aviv'),
    ramatGan: L('רמת גן', 'Ramat Gan'),
    haifa: L('חיפה', 'Haifa'),
    jerusalem: L('ירושלים', 'Jerusalem'),
    netanya: L('נתניה', 'Netanya'),
    beerSheva: L('באר שבע', 'Beer Sheva'),
    modiin: L('מודיעין', 'Modiin'),
    herzliya: L('הרצליה', 'Herzliya'),
    kfarSaba: L('כפר סבא', 'Kfar Saba'),
    givatayim: L('גבעתיים', 'Givatayim'),
    rishon: L('ראשון לציון', 'Rishon LeZion'),
    petahTikva: L('פתח תקווה', 'Petah Tikva'),
};

const STREET = {
    arlozorov: L('ארלוזורוב', 'Arlozorov'),
    herzl: L('הרצל', 'Herzl'),
    bialik: L('ביאליק', 'Bialik'),
    jabotinsky: L('ז׳בוטינסקי', 'Jabotinsky'),
    sokolov: L('סוקולוב', 'Sokolov'),
    katznelson: L('כצנלסון', 'Katznelson'),
    weizmann: L('ויצמן', 'Weizmann'),
    prophets: L('הנביאים', 'HaNevi’im'),
    benYehuda: L('בן יהודה', 'Ben Yehuda'),
    hanasi: L('הנשיא', 'HaNasi'),
    emekRefaim: L('עמק רפאים', 'Emek Refaim'),
    rager: L('רגר', 'Rager'),
    emekDotan: L('עמק דותן', 'Emek Dotan'),
    haatzmaut: L('העצמאות', 'HaAtzmaut'),
};

/** Building entrance letters, as printed on the door. */
export const ENTRY_LETTERS = [null, L('א', 'A'), L('ב', 'B')];

/**
 * Practitioners with a card in our database. `code` is the number they always
 * had — the historical series was kept as-is. `credit: true` means approved for
 * deferred payment: orders reach the lab unpaid, the balance accrues as open
 * debt, and the admin collects it with one link.
 *
 * `debt` and `debtDays` are placeholders: money.js recomputes both from the
 * open credit orders so a practitioner's debt always equals what he actually
 * owes.
 */
const PRACTITIONERS = [
    {
        code: '11482',
        first: L('מיכל', 'Michal'),
        last: L('אברהמי', 'Avrahami'),
        therapy: 'naturopathy',
        spec: SPEC.women,
        clinic: L('קליניקת שורש · רמת גן', 'Shoresh Clinic · Ramat Gan'),
        city: CITY.ramatGan,
        phone: '052-886-4546',
        email: 'michal@shoresh.co.il',
        status: 'active',
        points: 1240,
        disc: 40,
        orders: 148,
        credit: false,
        creditSince: null,
        creditBy: null,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2021-03-11',
        tz: '029384756',
        // V2 — accounting & payment
        accountingEmail: 'hanhala@shoresh.co.il',
        bizNum: '515382910',
        payMethod: 'transfer',
        shelfDisc: 40,
    },
    {
        code: '11507',
        first: L('יואב', 'Yoav'),
        last: L('שטרן', 'Stern'),
        therapy: 'chinese_medicine',
        spec: SPEC.pain,
        clinic: L('מרפאת צ׳י · תל אביב', 'Chi Clinic · Tel Aviv'),
        city: CITY.telAviv,
        phone: '054-318-2207',
        email: 'yoav.stern@gmail.com',
        status: 'active',
        points: 380,
        disc: 40,
        orders: 96,
        credit: true,
        creditSince: '2023-05-02',
        creditBy: DEMO_ACTORS.ronit,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2021-09-02',
        // V2: special terms the office must see on every one of his orders
        specialTerms: L(
            'משלם בסוף חודש — לא לעכב שחרור למעבדה · שולח חשבונית להנה״ח',
            'Pays at month end — do not hold the lab release · invoice goes to his bookkeeper',
        ),
        tz: '031928475',
        // V2 — accounting & payment
        accountingEmail: null,
        bizNum: '034958211',
        payMethod: 'card',
        shelfDisc: 40,
    },
    {
        code: '11533',
        first: L('נועה', 'Noa'),
        last: L('בן-חיים', 'Ben-Haim'),
        therapy: 'herbalism',
        spec: SPEC.digestive,
        clinic: L('צמח ושורש · חיפה', 'Leaf & Root · Haifa'),
        city: CITY.haifa,
        phone: '050-772-9014',
        email: 'noa@tzemach.co.il',
        status: 'active',
        points: 2870,
        disc: 25,
        orders: 311,
        credit: false,
        creditSince: null,
        creditBy: null,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2020-06-20',
        tz: '045612378',
        // V2 — accounting & payment
        accountingEmail: 'billing@tzmiha.co.il',
        bizNum: '514029384',
        payMethod: 'transfer',
        shelfDisc: 35,
    },
    {
        code: '11570',
        first: L('אורי', 'Uri'),
        last: L('לוינסון', 'Levinson'),
        therapy: 'clinical_nutrition',
        spec: SPEC.immune,
        clinic: null,
        city: CITY.modiin,
        phone: '053-441-0982',
        email: 'uri.lev@walla.com',
        status: 'active',
        points: 90,
        disc: 40,
        orders: 24,
        credit: false,
        creditSince: null,
        creditBy: null,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2023-01-14',
        tz: '052839471',
        // V2 — accounting & payment
        accountingEmail: null,
        bizNum: '045612378',
        payMethod: null,
        shelfDisc: 40,
    },
    {
        code: '11588',
        first: L('רחל', 'Rachel'),
        last: L('סער', 'Saar'),
        therapy: 'chinese_medicine',
        spec: SPEC.menopause,
        clinic: L(
            'סער רפואה משלימה · ירושלים',
            'Saar Complementary Medicine · Jerusalem',
        ),
        city: CITY.jerusalem,
        phone: '058-620-3311',
        email: 'rachel@saar-clinic.co.il',
        status: 'active',
        points: 640,
        disc: 40,
        orders: 71,
        credit: true,
        creditSince: '2022-08-14',
        creditBy: DEMO_ACTORS.avi,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2022-04-05',
        // V2
        specialTerms: L(
            'לצרף חשבונית מודפסת לחבילה · מתקשרת לפני משלוח · נקודת איסוף למטופליה',
            'Attach a printed invoice to the parcel · calls before dispatch · pickup point for her patients',
        ),
        tz: '063748291',
        // V2 — accounting & payment
        accountingEmail: 'accounts@naturali.co.il',
        bizNum: '516273849',
        payMethod: 'transfer',
        shelfDisc: 45,
    },
    {
        code: '11601',
        first: L('דניאל', 'Daniel'),
        last: L('ז׳ק', 'Jacques'),
        therapy: 'aromatherapy',
        spec: SPEC.skin,
        clinic: L('אתר · הרצליה', 'Ether · Herzliya'),
        city: CITY.herzliya,
        phone: '052-119-8877',
        email: 'dan@ether.co.il',
        status: 'active',
        points: 0,
        disc: 40,
        orders: 12,
        credit: false,
        creditSince: '2023-02-09',
        creditBy: DEMO_ACTORS.avi,
        creditRevokedDaysAgo: 29,
        legacyNum: true,
        since: '2022-11-28',
        tz: '074839201',
        // V2 — accounting & payment
        accountingEmail: null,
        bizNum: '074839201',
        payMethod: 'card',
        shelfDisc: 40,
    },
    {
        code: '11622',
        first: L('שירה', 'Shira'),
        last: L('קפלן', 'Kaplan'),
        therapy: 'homeopathy',
        spec: SPEC.children,
        clinic: L('קפלן · באר שבע', 'Kaplan · Beer Sheva'),
        city: CITY.beerSheva,
        phone: '050-330-4412',
        email: 'shira.k@gmail.com',
        status: 'active',
        points: 210,
        disc: 40,
        orders: 39,
        credit: false,
        creditSince: null,
        creditBy: null,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2023-08-19',
        tz: '085920138',
        // V2 — accounting & payment
        accountingEmail: 'hesh@herbal-clinic.co.il',
        bizNum: '513948271',
        payMethod: 'transfer',
        shelfDisc: 40,
    },
    {
        code: '11640',
        first: L('אלון', 'Alon'),
        last: L('מזרחי', 'Mizrahi'),
        therapy: 'reflexology',
        spec: SPEC.mind,
        clinic: null,
        city: CITY.netanya,
        phone: '054-887-2200',
        email: 'alon.m@icloud.com',
        status: 'active',
        points: 55,
        disc: 40,
        orders: 8,
        credit: true,
        creditSince: '2026-05-20',
        creditBy: DEMO_ACTORS.ronit,
        creditRevokedDaysAgo: null,
        legacyNum: true,
        since: '2024-02-02',
        tz: '096528738',
        // V2 — accounting & payment
        accountingEmail: null,
        bizNum: '096528738',
        payMethod: null,
        shelfDisc: 30,
    },
];

/** Fresh practitioner cards. Balances are filled in by money.js. */
export function buildPractitioners() {
    return PRACTITIONERS.map(({ creditRevokedDaysAgo, ...card }) => ({
        ...card,
        name: fullName(card),
        creditRevoked:
            creditRevokedDaysAgo === null
                ? null
                : isoDaysAgo(creditRevokedDaysAgo),
        debt: 0,
        debtDays: 0,
        documentation: [],
        docsExtra: [],
    }));
}

/** Registrations waiting for an admin to approve or reject them. */
export function buildPendingUsers() {
    return [
        {
            id: 'r1',
            first: L('תמר', 'Tamar'),
            last: L('גולן', 'Golan'),
            tz: '204738291',
            role: 'practitioner',
            therapy: 'herbalism',
            spec: SPEC.women,
            email: 'tamar.golan@gmail.com',
            phone: '052-773-1180',
            city: CITY.givatayim,
            street: STREET.katznelson,
            num: '48',
            apt: '7',
            floor: '2',
            entry: ENTRY_LETTERS[1],
            gradYear: '2019',
            cert: true,
            listed: true,
            clinicName: L('שורשים · גבעתיים', 'Shorashim · Givatayim'),
            clinicDesc: L(
                'קליניקה לרפואת צמחים ותזונה, מתמחה בבריאות האישה ופוריות.',
                'A herbal medicine and nutrition clinic specialising in women’s health and fertility.',
            ),
            clinicImg: true,
            submitted: at(0, 8, 14),
            docOk: null,
        },
        {
            id: 'r2',
            first: L('עומר', 'Omer'),
            last: L('ביטון', 'Biton'),
            tz: '215849302',
            role: 'student',
            therapy: 'naturopathy',
            spec: SPEC.digestive,
            email: 'omer.biton@gmail.com',
            phone: '050-448-2277',
            city: CITY.rishon,
            street: STREET.herzl,
            num: '12',
            apt: '3',
            floor: '1',
            entry: null,
            college: L('רידמן', 'Reidman'),
            teacher: L('ד״ר ענת פרי', 'Dr. Anat Peri'),
            head: L('יעל דוד', 'Yael David'),
            intern: true,
            cert: true,
            listed: false,
            submitted: at(0, 7, 2),
            docOk: null,
        },
        {
            id: 'r3',
            first: L('לילך', 'Lilach'),
            last: L('ורדי', 'Vardi'),
            tz: '226950413',
            role: 'practitioner',
            therapy: 'chinese_medicine',
            spec: SPEC.pain,
            email: 'lilach.vardi@gmail.com',
            phone: '054-220-9931',
            city: CITY.kfarSaba,
            street: STREET.weizmann,
            num: '90',
            apt: '14',
            floor: '4',
            entry: ENTRY_LETTERS[2],
            gradYear: '2016',
            cert: true,
            listed: true,
            clinicName: L('אנרג׳י · כפר סבא', 'Energy · Kfar Saba'),
            clinicDesc: L(
                'דיקור סיני וצמחי מרפא, התמחות בכאב כרוני ומיגרנות.',
                'Acupuncture and herbal medicine, specialising in chronic pain and migraine.',
            ),
            clinicImg: false,
            submitted: at(1, 19, 40),
            docOk: true,
        },
        {
            id: 'r4',
            first: L('יונתן', 'Yonatan'),
            last: L('אשד', 'Eshed'),
            tz: '237061524',
            role: 'student',
            therapy: 'clinical_nutrition',
            spec: SPEC.immune,
            email: 'y.eshed@outlook.com',
            phone: '053-661-0028',
            city: CITY.haifa,
            street: STREET.prophets,
            num: '5',
            apt: '',
            floor: '',
            entry: null,
            college: L(
                'המכללה לרפואה משלימה',
                'The College of Complementary Medicine',
            ),
            teacher: L('רון אלמוג', 'Ron Almog'),
            head: L('שרית כהן', 'Sarit Cohen'),
            intern: false,
            cert: false,
            listed: false,
            submitted: at(1, 11, 12),
            docOk: false,
        },
        {
            id: 'r5',
            first: L('הדס', 'Hadas'),
            last: L('פרידמן', 'Friedman'),
            tz: '248172635',
            role: 'practitioner',
            therapy: 'aromatherapy',
            spec: SPEC.mind,
            email: 'hadas.f@gmail.com',
            phone: '058-990-1123',
            city: CITY.telAviv,
            street: STREET.benYehuda,
            num: '160',
            apt: '9',
            floor: '3',
            entry: null,
            gradYear: '2021',
            cert: true,
            listed: false,
            clinicName: null,
            clinicDesc: null,
            clinicImg: false,
            submitted: at(3, 16, 5),
            docOk: null,
        },
    ];
}

const PATIENT_NAMES = [
    [L('דנה', 'Dana'), L('כהן', 'Cohen')],
    [L('אבי', 'Avi'), L('שטרן', 'Stern')],
    [L('יעל', 'Yael'), L('ברק', 'Barak')],
    [L('רות', 'Ruth'), L('מזרחי', 'Mizrahi')],
    [L('משה', 'Moshe'), L('אזולאי', 'Azoulay')],
    [L('שרון', 'Sharon'), L('לוי', 'Levy')],
    [L('איתי', 'Itai'), L('דגן', 'Dagan')],
    [L('ליאת', 'Liat'), L('אבידן', 'Avidan')],
    [L('גיא', 'Guy'), L('רוזן', 'Rosen')],
    [L('נטע', 'Neta'), L('שגב', 'Segev')],
    [L('אורית', 'Orit'), L('פלד', 'Peled')],
    [L('ניר', 'Nir'), L('בן-דוד', 'Ben-David')],
];

const PATIENT_FACTS = [
    { tz: '312874905', phone: '052-441-9930', age: 42, sex: 'f', meds: [] },
    {
        tz: '327819034',
        phone: '054-118-2299',
        age: 61,
        sex: 'm',
        meds: ['Coumadin', 'Eltroxin'],
    },
    {
        tz: '338291746',
        phone: '050-227-3341',
        age: 58,
        sex: 'f',
        meds: ['Eltroxin'],
    },
    {
        tz: '349102837',
        phone: '053-880-4417',
        age: 34,
        sex: 'f',
        preg: true,
        meds: [],
    },
    {
        tz: '351928374',
        phone: '052-664-2018',
        age: 47,
        sex: 'm',
        meds: ['Metformin'],
    },
    {
        tz: '362819473',
        phone: '054-330-9982',
        age: 29,
        sex: 'f',
        bf: true,
        meds: [],
    },
    {
        tz: '373920184',
        phone: '050-119-6634',
        age: 38,
        sex: 'm',
        meds: ['Cipralex'],
    },
    { tz: '384019273', phone: '058-772-1145', age: 51, sex: 'f', meds: [] },
    {
        tz: '395128374',
        phone: '052-909-3320',
        age: 44,
        sex: 'm',
        meds: ['Aspirin'],
    },
    { tz: '406283719', phone: '053-441-8890', age: 26, sex: 'f', meds: [] },
    {
        tz: '417392846',
        phone: '054-661-2277',
        age: 63,
        sex: 'f',
        meds: ['Digoxin', 'Aspirin'],
    },
    { tz: '428401937', phone: '050-773-9911', age: 35, sex: 'm', meds: [] },
];

/** Patients, as they are embedded on an order. */
export const DEMO_PATIENTS = PATIENT_FACTS.map((facts, i) => {
    const [first, last] = PATIENT_NAMES[i];

    return {
        first,
        last,
        name: fullName({ first, last }),
        tz: facts.tz,
        phone: facts.phone,
        age: facts.age,
        sex: facts.sex,
        preg: facts.preg === true,
        bf: facts.bf === true,
        meds: facts.meds,
    };
});

/** Every admin has identical, full permissions — there are no roles here. */
export function buildAdmins() {
    return [
        {
            id: 'a1',
            name: DEMO_ACTORS.ronit,
            email: 'ronit@trifolium.co.il',
            phone: '052-8841207',
            created: '2026-01-02',
            last: at(0, 8, 41),
            me: true,
        },
        {
            id: 'a2',
            name: DEMO_ACTORS.avi,
            email: 'avi@trifolium.co.il',
            phone: '054-7702219',
            created: '2026-01-02',
            last: at(0, 9, 12),
            me: false,
        },
        {
            id: 'a3',
            name: DEMO_ACTORS.shay,
            email: 'shay@trifolium.co.il',
            phone: '053-9914408',
            created: '2026-03-18',
            last: at(1, 17, 26),
            me: false,
        },
        {
            id: 'a4',
            name: DEMO_ACTORS.noa,
            email: 'noa@trifolium.co.il',
            phone: '050-3325514',
            created: '2026-05-11',
            last: at(3, 12, 3),
            me: false,
        },
    ];
}

export { CUSTOMER_SOURCE_IDS };

const CUSTOMER_EXTRAS = [
    {
        city: CITY.telAviv,
        street: STREET.arlozorov,
        num: '88',
        apt: '12',
        floor: '3',
        entry: null,
        allerg: null,
        consent: true,
        mkt: true,
    },
    {
        city: CITY.ramatGan,
        street: STREET.bialik,
        num: '31',
        apt: '4',
        floor: '1',
        entry: ENTRY_LETTERS[1],
        allerg: L('אגוזים', 'Nuts'),
        consent: true,
        mkt: false,
    },
    {
        city: CITY.haifa,
        street: STREET.hanasi,
        num: '7',
        apt: '',
        floor: '',
        entry: null,
        allerg: null,
        consent: true,
        mkt: true,
    },
    {
        city: CITY.jerusalem,
        street: STREET.emekRefaim,
        num: '24',
        apt: '9',
        floor: '2',
        entry: ENTRY_LETTERS[2],
        allerg: L('לקטוז', 'Lactose'),
        consent: true,
        mkt: true,
    },
    {
        city: CITY.beerSheva,
        street: STREET.rager,
        num: '112',
        apt: '15',
        floor: '5',
        entry: null,
        allerg: null,
        consent: false,
        mkt: false,
    },
    {
        city: CITY.netanya,
        street: STREET.herzl,
        num: '56',
        apt: '6',
        floor: '2',
        entry: null,
        allerg: L('דבורים', 'Bee stings'),
        consent: true,
        mkt: true,
    },
    {
        city: CITY.modiin,
        street: STREET.emekDotan,
        num: '3',
        apt: '',
        floor: '',
        entry: null,
        allerg: null,
        consent: true,
        mkt: false,
    },
    {
        city: CITY.herzliya,
        street: STREET.sokolov,
        num: '41',
        apt: '8',
        floor: '3',
        entry: null,
        allerg: null,
        consent: true,
        mkt: true,
    },
    {
        city: CITY.kfarSaba,
        street: STREET.weizmann,
        num: '65',
        apt: '2',
        floor: '1',
        entry: null,
        allerg: L('גלוטן', 'Gluten'),
        consent: true,
        mkt: true,
    },
    {
        city: CITY.givatayim,
        street: STREET.katznelson,
        num: '19',
        apt: '11',
        floor: '4',
        entry: ENTRY_LETTERS[1],
        allerg: null,
        consent: true,
        mkt: false,
    },
    {
        city: CITY.rishon,
        street: STREET.jabotinsky,
        num: '9',
        apt: '5',
        floor: '2',
        entry: null,
        allerg: null,
        consent: true,
        mkt: true,
    },
    {
        city: CITY.petahTikva,
        street: STREET.haatzmaut,
        num: '77',
        apt: '3',
        floor: '1',
        entry: ENTRY_LETTERS[2],
        allerg: L('סויה', 'Soy'),
        consent: false,
        mkt: false,
    },
];

/**
 * Customer cards. Every one is derived from an order the practitioner actually
 * placed, so the practitioner named on the card is the practitioner who treats
 * the person. A customer is never a standalone record.
 */
export function buildCustomers(orders, practitioners) {
    return DEMO_PATIENTS.map((patient, i) => {
        const mine = orders.filter((o) => o.patient.tz === patient.tz);
        const latest = mine[0];
        const practitioner = latest
            ? latest.practitioner
            : practitioners[i % practitioners.length];
        const extra = CUSTOMER_EXTRAS[i % CUSTOMER_EXTRAS.length];
        const spent = mine.reduce(
            (sum, o) => sum + (o.status === 'cancelled' ? 0 : o.pricing.total),
            0,
        );
        const source = mine.length
            ? CUSTOMER_SOURCE_IDS[0]
            : CUSTOMER_SOURCE_IDS[(i % 2) + 1];
        const code = `C-${10240 + i * 13}`;

        return {
            code,
            first: patient.first,
            last: patient.last,
            name: patient.name,
            tz: patient.tz,
            phone: patient.phone,
            email: `c${10240 + i * 13}@example.com`,
            age: patient.age,
            sex: patient.sex,
            birth: `${2026 - patient.age}-0${(i % 9) + 1}-1${i % 9}`,
            preg: patient.preg,
            bf: patient.bf,
            meds: patient.meds,
            allerg: extra.allerg,
            city: extra.city,
            street: extra.street,
            num: extra.num,
            apt: extra.apt,
            floor: extra.floor,
            entry: extra.entry,
            prCode: practitioner.code,
            prName: practitioner.name,
            prTherapy: practitioner.therapy,
            linkedOn: isoDaysAgo(30 + i * 11),
            linkedBy:
                source === CUSTOMER_SOURCE_IDS[0]
                    ? DEMO_ACTORS.practitionerRole
                    : DEMO_ACTORS.ronit,
            transfers:
                i === 2
                    ? [
                          {
                              fromCode: '11601',
                              fromName: L('דניאל ז׳ק', 'Daniel Jacques'),
                              toCode: '11533',
                              toName: L('נועה בן-חיים', 'Noa Ben-Haim'),
                              when: '2026-05-12',
                              by: DEMO_ACTORS.ronit,
                              why: L(
                                  'הלקוחה עברה לטיפול אצל מטפלת אחרת לבקשתה',
                                  'The customer moved to another practitioner at her own request',
                              ),
                          },
                      ]
                    : [],
            consent: extra.consent,
            mkt: extra.mkt,
            source,
            orders: mine.length,
            lastOrder: latest ? latest.iso : null,
            spent,
            status: mine.length || i % 5 !== 4 ? 'active' : 'inactive',
            created: isoDaysAgo(40 + i * 12),
            // V2 — what the consumer site needs from the card
            siteAccount: i % 2 === 0,
            clubSince: i % 2 === 0 ? isoDaysAgo(200 + i * 17) : null,
            sitePoints:
                i % 2 === 0 ? spread(`customer:${i}:points`, 40, 640) : 0,
        };
    });
}

/** Points ledger, newest first, ending on the balance shown on the card. */
export function buildPointsLedger(practitioners, orders) {
    return practitioners.map((practitioner) => {
        const count = spread(`ledger:${practitioner.code}:rows`, 4, 8);
        const rows = [];
        let balance = 0;

        for (let i = 0; i < count; i += 1) {
            const slot = `ledger:${practitioner.code}:${i}`;
            const earned = fractionEarn(slot);
            const amount = earned
                ? spread(`${slot}:earn`, 12, 90)
                : -spread(`${slot}:spend`, 20, 120);

            balance = Math.max(0, balance + amount);

            rows.push({
                id: `l${practitioner.code}-${i}`,
                kind: earned ? 'earn' : 'spend',
                amt: amount,
                bal: balance,
                order: pickFrom(`${slot}:order`, orders.slice(0, 41)).id,
                when: at(
                    spread(`${slot}:day`, 1, 60),
                    spread(`${slot}:hh`, 8, 19),
                    spread(`${slot}:mm`, 0, 59),
                ),
            });
        }

        rows[rows.length - 1].bal = practitioner.points;

        return { code: practitioner.code, rows: rows.reverse() };
    });
}

function fractionEarn(slot) {
    return spread(`${slot}:kind`, 0, 99) < 65;
}

const USER_TALKS = [
    L(
        'שיחה כללית: המטפל מתכנן סדנה בספטמבר ושואל על הנחת כמות למוצרי מדף. נמסר שההנחה נבדקת מול הנהלה.',
        'General call: the practitioner is planning a workshop in September and asked about a volume discount on shelf products. Told the discount is being checked with management.',
    ),
    L(
        'שיחה כללית: עדכון מספר טלפון בקליניקה וברור לגבי שעות האיסוף העצמי. לא קשור להזמנה מסוימת.',
        'General call: clinic phone number updated, and a question about self-pickup hours. Not related to any particular order.',
    ),
    L(
        'שיחה כללית: תלונה על זמן מענה בוואטסאפ. הוסבר תהליך התורים ונמסר זמן מענה צפוי.',
        'General call: complaint about WhatsApp response time. Explained how the queue works and gave an expected response time.',
    ),
    L(
        'שיחה כללית: בקשה לקבל הדרכה על אשף הרקיחה החדש. נקבעה שיחת הדרכה בשבוע הבא.',
        'General call: asked for training on the new compounding wizard. A training call was scheduled for next week.',
    ),
];

/**
 * The practitioner's own documentation trail: account actions the system and
 * the agents recorded, plus the manual summaries of general conversations that
 * belong to no single order.
 */
export function buildPractitionerDocumentation(practitioner, defaultDiscount) {
    const talk = Number(practitioner.code) % 4;
    const rows = [
        {
            id: 'u1',
            kind: 'system',
            when: at(300, 9, 12),
            actor: DEMO_ACTORS.system,
            act: L('יצירת כרטיס מטפל במערכת', 'Practitioner card created'),
            det: L(
                `מספר לקוח ${practitioner.code}`,
                `Customer number ${practitioner.code}`,
            ),
            from: L('הרשמה ממתינה', 'Pending registration'),
            to: L('כרטיס פעיל', 'Active card'),
        },
        {
            id: 'u2',
            kind: 'agent',
            when: at(300, 9, 26),
            actor: DEMO_ACTORS.ronitSupport,
            act: L('אישור הרשמה', 'Registration approved'),
            det: L(
                `${practitioner.name.he} · ${practitioner.therapy}`,
                `${practitioner.name.en} · ${practitioner.therapy}`,
            ),
            from: L('ממתין לאישור', 'Pending approval'),
            to: L('פעיל', 'Active'),
        },
        {
            id: 'u3',
            kind: 'system',
            when: at(14, 3, 5),
            actor: DEMO_ACTORS.system,
            act: L('צבירת נקודות זכות', 'Loyalty points earned'),
            det: L(
                'צבירה אוטומטית על הזמנת מטפל',
                'Earned automatically on a practitioner order',
            ),
            from: String(Math.max(0, practitioner.points - 40)),
            to: String(practitioner.points),
        },
    ];

    if (practitioner.disc !== defaultDiscount) {
        rows.push({
            id: 'u4',
            kind: 'agent',
            when: at(120, 11, 40),
            actor: DEMO_ACTORS.shaySupport,
            act: L('עדכון אחוז הנחה', 'Discount percentage updated'),
            det: L(
                'אושר ע״י הנהלה בשל היקף הזמנות',
                'Approved by management on order volume',
            ),
            from: '20%',
            to: `${practitioner.disc}%`,
        });
    }

    if (practitioner.debt > 0) {
        rows.push({
            id: 'u5',
            kind: 'system',
            when: at(6, 9, 30),
            actor: DEMO_ACTORS.system,
            act: L('שליחת הודעה ללקוח', 'Message sent to the customer'),
            det: L(
                'תבנית: התראת חוב למטפל',
                'Template: practitioner debt notice',
            ),
            from: L('ללא התראה', 'No notice'),
            to: L(
                `התראה על יתרה ₪${practitioner.debt}`,
                `Notice for a ₪${practitioner.debt} balance`,
            ),
        });
    }

    if (practitioner.credit) {
        rows.push({
            id: 'u4c',
            kind: 'agent',
            when: at(210, 10, 5),
            actor: practitioner.creditBy || DEMO_SESSION.actor,
            act: L('אישור מסלול הקפה', 'Credit terms approved'),
            det: L(
                'תשלום מרוכז בלינק גבייה · ללא תקרת חוב',
                'Consolidated payment by collection link · no debt ceiling',
            ),
            from: L('תשלום מיידי', 'Immediate payment'),
            to: L('מאושר להקפה', 'Approved for credit terms'),
        });
    }

    if (practitioner.creditRevoked) {
        rows.push({
            id: 'u4r',
            kind: 'agent',
            when: at(50, 16, 40),
            actor: DEMO_ACTORS.ronitSupport,
            act: L('ביטול מסלול הקפה', 'Credit terms revoked'),
            det: L('חוב פתוח מעל 90 יום', 'Open debt over 90 days'),
            from: L('מאושר להקפה', 'Approved for credit terms'),
            to: L('תשלום מיידי', 'Immediate payment'),
            bad: true,
        });
    }

    rows.push({
        id: 'un1',
        kind: 'manual',
        when: at(9, 13, 22),
        actor: DEMO_ACTORS.shaySupport,
        text: USER_TALKS[talk],
    });
    rows.push({
        id: 'un2',
        kind: 'manual',
        when: at(4, 10, 8),
        actor: DEMO_ACTORS.ronitSupport,
        text: USER_TALKS[(talk + 2) % USER_TALKS.length],
    });

    if (talk % 2 === 0) {
        rows.push({
            id: 'un1f',
            kind: 'manual',
            when: at(9, 15, 44),
            actor: DEMO_ACTORS.noaSupport,
            text: L(
                'תיקון: הסיכום נרשם על השיחה הקודמת בטעות — הפרטים למטה נכונים לשיחה מ-9 ימים.',
                'Correction: the summary was filed against the previous call by mistake — the details below belong to the call 9 days ago.',
            ),
            fixOf: 'un1',
        });
    }

    return rows;
}
