// Shelf goods: the small line the pharmacy sells finished, and the larger
// consumer catalogue behind the Products screen with its label taxonomy.
//
// Two lists, deliberately: SHELF_ITEMS are the SKUs an order can carry as a
// plain line (they also hold stock in the shelf warehouse), while DEMO_PRODUCTS
// are the published product pages with weights, labels and an archive state.
import { isoDaysAgo } from '@/lib/dates';
import { L } from '@/lib/localized';

/**
 * A product is blocked for sale once its stock drops under its minimum: it
 * disappears from both the consumer site and the practitioner site rather than
 * being sold into a backorder. Five is the default for every new product.
 */
export const DEFAULT_MIN_STOCK = 5;

/** Statuses a product page can be in. */
export const PRODUCT_STATUS_IDS = ['published', 'archived'];

/** Units a product's shipping weight is declared in. */
export const PRODUCT_WEIGHT_UNIT_IDS = ['g', 'kg', 'ml', 'l'];

/** Shelf SKUs an order line can point at. `size`/`unit` replace a printed vol. */
export const SHELF_ITEMS = [
    {
        sku: 'TRF-118-004',
        name: L('תמיסת שינה רגועה', 'Calm sleep tincture'),
        size: 50,
        unit: 'ml',
        price: 89,
    },
    {
        sku: 'TRF-118-011',
        name: L('מיקס חיסון יומי', 'Daily immune mix'),
        size: 60,
        unit: 'capsule',
        price: 124,
    },
    {
        sku: 'TRF-118-023',
        name: L('שמן מרגיע לעור', 'Soothing skin oil'),
        size: 100,
        unit: 'ml',
        price: 76,
    },
    {
        sku: 'TRF-118-031',
        name: L('משחת קלנדולה', 'Calendula ointment'),
        size: 60,
        unit: 'g',
        price: 68,
    },
    {
        sku: 'TRF-119-208',
        name: L('שיאו יאו סאן — כמוסות', 'Xiao Yao San — capsules'),
        size: 90,
        unit: 'capsule',
        price: 142,
    },
];

/** Labels products are filed under on the consumer site. */
export function buildProductLabels() {
    return [
        { id: 'lb_sleep', name: L('שינה', 'Sleep'), created: isoDaysAgo(320) },
        {
            id: 'lb_belly',
            name: L('כאבי בטן', 'Stomach pain'),
            created: isoDaysAgo(318),
        },
        {
            id: 'lb_immune',
            name: L('חיסון', 'Immunity'),
            created: isoDaysAgo(318),
        },
        {
            id: 'lb_digest',
            name: L('עיכול', 'Digestion'),
            created: isoDaysAgo(291),
        },
        { id: 'lb_skin', name: L('עור', 'Skin'), created: isoDaysAgo(264) },
        {
            id: 'lb_resp',
            name: L('נשימה', 'Breathing'),
            created: isoDaysAgo(240),
        },
        {
            id: 'lb_energy',
            name: L('אנרגיה', 'Energy'),
            created: isoDaysAgo(203),
        },
        {
            id: 'lb_stress',
            name: L('מתח וחרדה', 'Stress & anxiety'),
            created: isoDaysAgo(168),
        },
        {
            id: 'lb_joints',
            name: L('מפרקים', 'Joints'),
            created: isoDaysAgo(121),
        },
        {
            id: 'lb_women',
            name: L('בריאות האישה', "Women's health"),
            created: isoDaysAgo(74),
        },
    ];
}

const PRODUCTS = [
    {
        id: 'p01',
        stock: 42,
        name: L('שמן דגים אומגה 3', 'Omega-3 fish oil'),
        content: L('90 כמוסות רכות', '90 softgels'),
        net: 78,
        sku: 'OMG-903',
        labels: ['lb_immune', 'lb_energy', 'lb_joints'],
        wUom: 'g',
        wVal: 120,
        status: 'published',
        createdDaysAgo: 300,
    },
    {
        id: 'p02',
        stock: 18,
        name: L('מגנזיום ציטראט', 'Magnesium citrate'),
        content: L('100 כמוסות', '100 capsules'),
        net: 62,
        sku: 'MGC-100',
        labels: ['lb_sleep', 'lb_stress', 'lb_joints'],
        wUom: 'g',
        wVal: 90,
        status: 'published',
        createdDaysAgo: 288,
    },
    {
        id: 'p03',
        stock: 7,
        name: L('תמיסת אכינצאה', 'Echinacea tincture'),
        content: L('100 מ״ל', '100 ml'),
        net: 54,
        sku: 'ECH-100',
        labels: ['lb_immune', 'lb_resp'],
        wUom: 'ml',
        wVal: 100,
        status: 'published',
        createdDaysAgo: 276,
    },
    {
        id: 'p04',
        stock: 63,
        name: L('ויטמין D3 בטיפות', 'Vitamin D3 drops'),
        content: L('30 מ״ל', '30 ml'),
        net: 49,
        sku: 'VTD-030',
        labels: ['lb_immune', 'lb_joints'],
        wUom: 'ml',
        wVal: 30,
        status: 'published',
        createdDaysAgo: 255,
    },
    {
        id: 'p05',
        stock: 3,
        name: L('אבקת פרוביוטיקה', 'Probiotic powder'),
        content: L('50 גרם', '50 g'),
        net: 96,
        sku: 'PRB-050',
        labels: ['lb_digest', 'lb_belly'],
        wUom: 'g',
        wVal: 50,
        status: 'published',
        createdDaysAgo: 232,
    },
    {
        id: 'p06',
        stock: 25,
        name: L('תה צמחים להרגעה', 'Calming herbal tea'),
        content: L('40 שקיקים', '40 sachets'),
        net: 38,
        sku: 'TEA-040',
        labels: ['lb_sleep', 'lb_stress'],
        wUom: 'g',
        wVal: 80,
        status: 'published',
        createdDaysAgo: 210,
    },
    {
        id: 'p07',
        stock: 11,
        name: L('משחת קלנדולה', 'Calendula ointment'),
        content: L('60 גרם', '60 g'),
        net: 44,
        sku: 'CAL-060',
        labels: ['lb_skin'],
        wUom: 'g',
        wVal: 60,
        status: 'published',
        createdDaysAgo: 188,
    },
    {
        id: 'p08',
        stock: 0,
        name: L('כורכומין בספיגה מוגברת', 'High-absorption curcumin'),
        content: L('60 כמוסות', '60 capsules'),
        net: 118,
        sku: 'CUR-060',
        labels: ['lb_joints', 'lb_digest'],
        wUom: 'g',
        wVal: 70,
        status: 'published',
        createdDaysAgo: 164,
    },
    {
        id: 'p09',
        stock: 9,
        name: L('שמן ערער לשאיפה', 'Juniper inhalation oil'),
        content: L('30 מ״ל', '30 ml'),
        net: 42,
        sku: 'JUN-030',
        labels: ['lb_resp'],
        wUom: 'ml',
        wVal: 30,
        status: 'published',
        createdDaysAgo: 150,
    },
    {
        id: 'p10',
        stock: 34,
        name: L('תמצית ג׳ינג׳ר', 'Ginger extract'),
        content: L('50 מ״ל', '50 ml'),
        net: 36,
        sku: 'GNG-050',
        labels: ['lb_belly', 'lb_digest'],
        wUom: 'ml',
        wVal: 50,
        status: 'published',
        createdDaysAgo: 133,
    },
    {
        id: 'p11',
        stock: 4,
        name: L('סירופ צמחים לילדים', "Children's herbal syrup"),
        content: L('150 מ״ל', '150 ml'),
        net: 52,
        sku: 'KID-150',
        labels: ['lb_immune', 'lb_resp'],
        wUom: 'ml',
        wVal: 150,
        status: 'published',
        createdDaysAgo: 96,
    },
    {
        id: 'p12',
        stock: 57,
        name: L('אבץ עם ויטמין C', 'Zinc with vitamin C'),
        content: L('60 טבליות מציצה', '60 lozenges'),
        net: 46,
        sku: 'ZNC-060',
        labels: ['lb_immune'],
        wUom: 'g',
        wVal: 55,
        status: 'published',
        createdDaysAgo: 78,
    },
    {
        id: 'p13',
        stock: 21,
        name: L('ברזל צמחי בנוזל', 'Liquid plant-based iron'),
        content: L('250 מ״ל', '250 ml'),
        net: 74,
        sku: 'IRN-250',
        labels: ['lb_energy', 'lb_women'],
        wUom: 'ml',
        wVal: 250,
        status: 'published',
        createdDaysAgo: 41,
    },
    {
        id: 'p14',
        stock: 6,
        name: L('אשווגנדה', 'Ashwagandha'),
        content: L('60 כמוסות', '60 capsules'),
        net: 88,
        sku: 'ASH-060',
        labels: ['lb_stress', 'lb_energy', 'lb_sleep'],
        wUom: 'g',
        wVal: 65,
        status: 'published',
        createdDaysAgo: 22,
    },
    {
        id: 'p15',
        stock: 48,
        name: L('שמן קיק', 'Castor oil'),
        content: L('100 מ״ל', '100 ml'),
        net: 32,
        sku: 'CST-100',
        labels: ['lb_skin', 'lb_digest'],
        wUom: 'ml',
        wVal: 100,
        status: 'published',
        createdDaysAgo: 17,
    },
    {
        id: 'p16',
        stock: 2,
        name: L('תמצית ולריאן', 'Valerian extract'),
        content: L('50 מ״ל', '50 ml'),
        net: 58,
        sku: 'VAL-050',
        labels: ['lb_sleep'],
        wUom: 'ml',
        wVal: 50,
        status: 'archived',
        createdDaysAgo: 212,
    },
];

export function buildProducts() {
    return PRODUCTS.map(({ createdDaysAgo, ...product }) => ({
        ...product,
        minStock: DEFAULT_MIN_STOCK,
        img: null,
        created: isoDaysAgo(createdDaysAgo),
    }));
}
