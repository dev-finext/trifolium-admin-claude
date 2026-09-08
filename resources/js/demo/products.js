// Shelf goods: the small line the pharmacy sells finished, and the larger
// consumer catalogue behind the Products screen with its label taxonomy.
//
// Two lists, deliberately: SHELF_ITEMS are the SKUs an order can carry as a
// plain line (they also hold stock in the shelf warehouse), while DEMO_PRODUCTS
// are the published product pages with weights, labels and an archive state.
import { spread } from '@/demo/fixture';
import REAL_CATEGORIES from '@/demo/real/categories.json';
import REAL_PRODUCTS from '@/demo/real/products.json';
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

/** SAP's unit names on the consumer site, mapped onto the console's. */
const SITE_UOM = {
    "י''ח": 'capsule',
    'י"ח': 'capsule',
    'מ"ל': 'ml',
    "מ''ל": 'ml',
    גרם: 'g',
};

/**
 * Shelf SKUs an order line can point at — the finished goods SAP publishes to
 * the consumer site with a stated size, plus any code a real order line names.
 *
 * They also hold stock in the shelf warehouse, which is why the size and its
 * unit are here: a shelf row is counted in units and *described* in millilitres
 * or capsules.
 */
export const SHELF_ITEMS = REAL_PRODUCTS.filter(
    (item) => item.siteQuantity && SITE_UOM[item.siteUom],
).map((item) => ({
    sku: item.code,
    name: L(item.nameHe, item.nameForeign || item.nameHe),
    size: Number(item.siteQuantity) || null,
    unit: SITE_UOM[item.siteUom],
    price: item.lastPurchasePrice ?? 0,
}));

/**
 * Labels products are filed under on the consumer site — SAP's
 * `@CATEGORIES` tree, which is exactly where a product card's category
 * codes point.
 *
 * The tree carries no creation date, so the one on the row is the fixture's.
 */
export function buildProductLabels() {
    return REAL_CATEGORIES.filter((category) =>
        category.code.includes('.'),
    ).map((category) => ({
        id: category.code,
        name: L(category.name),
        created: isoDaysAgo(spread(`label:${category.code}`, 90, 900)),
    }));
}

/**
 * The shelf catalogue as SAP holds it — 100 items of families 50/55/16, drawn
 * in proportion to the real catalogue.
 *
 * One field is an approximation and says so: `net`. The extract took the item
 * master, where the money field is the last purchase price; the sale price
 * lives in a price list that was not read. Every other figure on the card —
 * the stock, the minimum, the site name, quantity and note, the dates — is the
 * value SAP holds.
 */
function realProduct(item) {
    const content = item.siteQuantity
        ? `${item.siteQuantity} ${item.siteUom || ''}`.trim()
        : null;

    return {
        id: item.code,
        sku: item.code,
        name: { he: item.nameHe, en: item.nameForeign || item.nameHe },
        content: content ? { he: content, en: content } : null,
        net: item.lastPurchasePrice ?? 0,
        stock: Math.max(0, Math.round(item.onHand || 0)),
        minStock: item.minLevel ?? DEFAULT_MIN_STOCK,
        labels: [
            item.category1,
            item.category2,
            item.category3,
            item.category4,
        ].filter(Boolean),
        wUom: null,
        wVal: null,
        // Every item in the extract is active; what separates them is
        // whether SAP publishes them to the consumer site, which is what the
        // console's two states are really about.
        status: item.siteSync === 'Y' ? 'published' : 'archived',
        family: item.family,
        img: null,
        created: item.createdOn || isoDaysAgo(400),
    };
}

export function buildProducts() {
    return REAL_PRODUCTS.map(realProduct);
}
