// Pickup points — second-version fixture content.
//
// A pickup point is either a partner shop or a practitioner who collects for
// their own patients. Each carries its dispatch days, the courier that serves
// it and the consolidation notes the office works by ("every four orders go out
// as one shipment"). The partner shops are the ones SAP's @DELIVERYPOINT table
// holds; where only the town was known the row says so in its name.
import { L } from '@/lib/localized';

const ALL_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu'];

export const PARTNER_SHOPS = [
    {
        id: 'pp-anis',
        kind: 'shop',
        name: L('אניס — ירושלים', 'Anis — Jerusalem'),
        city: L('ירושלים', 'Jerusalem'),
        address: L('רחוב עזה 14', '14 Aza St'),
        days: ['sun', 'tue', 'thu'],
        courier: 'tapuz',
        notes: L(
            'משלוח מרוכז — כל 4 הזמנות להוציא משלוח אחד',
            'Consolidated — every 4 orders go out as one shipment',
        ),
        active: true,
    },
    {
        id: 'pp-yeruka',
        kind: 'shop',
        name: L('הירוקה — כרכור', 'HaYeruka — Karkur'),
        city: L('כרכור', 'Karkur'),
        address: L('דרך הבנים 2', '2 Derech HaBanim'),
        days: ['mon', 'thu'],
        courier: 'special_delivery',
        notes: null,
        active: true,
    },
    {
        id: 'pp-teva',
        kind: 'shop',
        name: L('טבע סנטר — קרית עקרון', 'Teva Center — Kiryat Ekron'),
        city: L('קרית עקרון', 'Kiryat Ekron'),
        address: L('מרכז ביל״ו', 'Bilu Center'),
        days: ['sun', 'wed'],
        courier: 'focus',
        notes: null,
        active: true,
    },
    {
        id: 'pp-davidoff',
        kind: 'shop',
        name: L('מרכז דוידוף', 'Davidoff Center'),
        city: L('פתח תקווה', 'Petah Tikva'),
        address: L('ז׳בוטינסקי 155', '155 Jabotinsky St'),
        days: ['tue', 'thu'],
        courier: 'tapuz',
        notes: L(
            'לתאם עם הקבלה לפני הגעת השליח',
            'Coordinate with reception before the courier arrives',
        ),
        active: true,
    },
    {
        id: 'pp-ramat-gan',
        kind: 'shop',
        name: L('חנות שותפה — רמת גן', 'Partner shop — Ramat Gan'),
        city: L('רמת גן', 'Ramat Gan'),
        address: L('ביאליק 30', '30 Bialik St'),
        days: ALL_WEEK,
        courier: 'tapuz',
        notes: null,
        active: true,
    },
    {
        id: 'pp-petah-tikva',
        kind: 'shop',
        name: L('חנות שותפה — פתח תקווה', 'Partner shop — Petah Tikva'),
        city: L('פתח תקווה', 'Petah Tikva'),
        address: L('חיים עוזר 12', '12 Haim Ozer St'),
        days: ['mon', 'wed'],
        courier: 'yarden',
        notes: null,
        active: true,
    },
    {
        id: 'pp-raanana',
        kind: 'shop',
        name: L('חנות שותפה — רעננה', 'Partner shop — Raanana'),
        city: L('רעננה', 'Raanana'),
        address: L('אחוזה 118', '118 Ahuza St'),
        days: ['sun', 'thu'],
        courier: 'deliver',
        notes: null,
        active: true,
    },
    {
        id: 'pp-tel-aviv',
        kind: 'shop',
        name: L('חנות שותפה — תל אביב', 'Partner shop — Tel Aviv'),
        city: L('תל אביב', 'Tel Aviv'),
        address: L('דיזנגוף 200', '200 Dizengoff St'),
        days: ALL_WEEK,
        courier: 'tapuz',
        notes: L('איסוף עד 13:00', 'Collection until 13:00'),
        active: true,
    },
    {
        id: 'pp-tel-mond',
        kind: 'shop',
        name: L('חנות שותפה — תל מונד', 'Partner shop — Tel Mond'),
        city: L('תל מונד', 'Tel Mond'),
        address: L('הדקל 3', '3 HaDekel St'),
        days: ['tue'],
        courier: 'focus',
        notes: null,
        active: true,
    },
];

/** Practitioners who collect for their patients, by their card number. */
export const PRACTITIONER_POINTS = [
    {
        id: 'pp-11533',
        kind: 'practitioner',
        practitionerCode: '11533',
        days: ['mon', 'thu'],
        courier: 'tapuz',
        notes: L(
            'אוספת עבור מטופליה · לצרף רשימת שמות לחבילה',
            'Collects for her patients · attach a name list to the parcel',
        ),
        active: true,
    },
    {
        id: 'pp-11588',
        kind: 'practitioner',
        practitionerCode: '11588',
        days: ['sun', 'wed'],
        courier: 'special_delivery',
        notes: L(
            'מטפלת עם תנאים מיוחדים — ראו הערות בכרטיס',
            'Practitioner with special terms — see the notes on her card',
        ),
        active: true,
    },
];

export const PICKUP_POINT_IDS = [...PARTNER_SHOPS, ...PRACTITIONER_POINTS].map(
    (point) => point.id,
);

/** The full list, with a practitioner point named and placed from the card. */
export function buildPickupPoints(practitioners) {
    return [
        ...PARTNER_SHOPS,
        ...PRACTITIONER_POINTS.map((point) => {
            const card = practitioners.find(
                (practitioner) => practitioner.code === point.practitionerCode,
            );

            return {
                ...point,
                name: card ? card.name : L(point.practitionerCode),
                city: card?.city || null,
                address: card?.clinic || null,
            };
        }),
    ];
}
