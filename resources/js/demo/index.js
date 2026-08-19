// The demo fixture, assembled.
//
// Nothing in this directory ships to a real deployment: every practitioner,
// patient, order, batch, message and log line below is fabricated sample
// content, and it is kept here — and only here — so that no screen, store or
// config file ever carries a made-up record.
//
// `buildDataset()` returns plain data. It writes nothing to `window`, starts no
// timer and reads no clock other than the one resources/js/data/source.js pins
// before it calls in. The build order matters and is the only stateful thing
// about it: orders need practitioner cards, messages need orders, exception
// flags need messages, and balances need the orders they are derived from.
import { SETTINGS } from '@/config';
import {
    DEMO_HERBS,
    DEMO_HERB_BY_ID,
    DOSE_TIMING_IDS,
    DOSE_UNIT_IDS,
    EVAPORATION_IDS,
    HERB_INTERACTIONS,
    HERB_WARNINGS,
    PREPARATION_FORMS,
    TCM_HERB_IDS,
} from '@/demo/catalog';
import { DEMO_CLOCK } from '@/demo/clock';
import {
    ARTICLE_CATEGORY_IDS,
    DEMO_ARTICLES,
    DEMO_EVENTS,
    DEMO_FORMULA_LIBRARY,
    DEMO_VIDEOS,
    EVENT_KIND_IDS,
} from '@/demo/content';
import {
    buildBatchUse,
    buildBatches,
    buildMovements,
    buildReceipts,
    buildStock,
    INGREDIENT_PRICE_PREFIX,
    STOCK_KINDS,
} from '@/demo/inventory';
import {
    buildSystemLog,
    DEMO_LOG_AGENTS,
    LOG_ENTITY_TYPE_IDS,
} from '@/demo/log';
import {
    buildMessages,
    buildScheduledMessages,
    DEMO_TEMPLATES,
    DEMO_TRIGGERS,
} from '@/demo/messaging';
import {
    applyBalances,
    buildCollectionLinks,
    buildDocuments,
    buildTransactions,
    COLLECT_LINK_STATES,
    DEMO_LEGACY_DEBT,
} from '@/demo/money';
import {
    buildOrders,
    buildOrderNote,
    FORMULA_TEMPLATES,
    orderExceptionFlags,
} from '@/demo/orders';
import {
    buildAdmins,
    buildCustomers,
    buildPendingUsers,
    buildPointsLedger,
    buildPractitionerDocumentation,
    buildPractitioners,
    CUSTOMER_SOURCE_IDS,
    DEMO_PATIENTS,
    DEMO_SESSION,
} from '@/demo/people';
import {
    buildPriceGroups,
    buildPriceImport,
    DEMO_INGREDIENT_SKUS,
    DEMO_PRICE_BREAKS,
    PRICE_UOM_IDS,
} from '@/demo/pricing';
import {
    buildProductLabels,
    buildProducts,
    DEFAULT_MIN_STOCK,
    PRODUCT_STATUS_IDS,
    SHELF_ITEMS,
} from '@/demo/products';
import { buildServices, SERVICE_STATES } from '@/demo/services';
import {
    BUSINESS_TYPE_IDS,
    DEMO_SUPPLIERS,
    DEMO_VENDOR_CONTACTS,
    PAY_TERM_IDS,
    SUPPLIER_KIND_IDS,
    SUPPLIER_PAY_METHOD_IDS,
} from '@/demo/vendors';

export { DEMO_CLOCK };

/**
 * Build the whole fixture.
 *
 * @returns {object} One object keyed by domain, ready for the Pinia stores.
 */
export function buildDataset() {
    const practitioners = buildPractitioners();
    const patients = DEMO_PATIENTS;

    const orders = buildOrders(practitioners, patients);
    const messages = buildMessages(orders);

    orders.forEach((order) => {
        order.flags = orderExceptionFlags(order, messages);
    });

    applyBalances(practitioners, orders);

    practitioners.forEach((practitioner) => {
        practitioner.documentation = buildPractitionerDocumentation(
            practitioner,
            SETTINGS.defaultDiscountPct,
        );
    });

    const stock = buildStock();
    const receipts = buildReceipts(stock);
    const batches = buildBatches(receipts);
    const batchUse = buildBatchUse(orders, batches);
    const priceGroups = buildPriceGroups();

    return {
        // people
        practitioners,
        pendingUsers: buildPendingUsers(),
        patients,
        customers: buildCustomers(orders, practitioners),
        admins: buildAdmins(),
        pointsLedger: buildPointsLedger(practitioners, orders),
        session: DEMO_SESSION,
        customerSources: CUSTOMER_SOURCE_IDS,

        // orders
        orders,
        orderNote: buildOrderNote(),
        formulaTemplates: FORMULA_TEMPLATES,

        // catalog
        herbs: DEMO_HERBS,
        herbsById: DEMO_HERB_BY_ID,
        tcmHerbIds: TCM_HERB_IDS,
        preparationForms: PREPARATION_FORMS,
        doseUnits: DOSE_UNIT_IDS,
        doseTimings: DOSE_TIMING_IDS,
        evaporations: EVAPORATION_IDS,
        interactions: HERB_INTERACTIONS,
        herbWarnings: HERB_WARNINGS,

        // products
        products: buildProducts(),
        productLabels: buildProductLabels(),
        shelfItems: SHELF_ITEMS,
        productStatuses: PRODUCT_STATUS_IDS,
        defaultMinStock: DEFAULT_MIN_STOCK,

        // pricing
        priceGroups,
        priceBreaks: DEMO_PRICE_BREAKS,
        priceUoms: PRICE_UOM_IDS,
        ingredientSkus: DEMO_INGREDIENT_SKUS,
        priceImport: buildPriceImport(priceGroups),

        // inventory
        stock,
        receipts,
        batches,
        batchUse,
        movements: buildMovements(receipts, batchUse),
        stockKinds: STOCK_KINDS,
        ingredientPricePrefix: INGREDIENT_PRICE_PREFIX,

        // money
        documents: buildDocuments(orders),
        transactions: buildTransactions(practitioners, orders),
        collectionLinks: buildCollectionLinks(practitioners, orders),
        collectLinkStates: COLLECT_LINK_STATES,
        legacyDebt: DEMO_LEGACY_DEBT,

        // messaging
        messages,
        messageTemplates: DEMO_TEMPLATES,
        messageTriggers: DEMO_TRIGGERS,
        scheduledMessages: buildScheduledMessages(),

        // content
        articles: DEMO_ARTICLES,
        articleCategories: ARTICLE_CATEGORY_IDS,
        events: DEMO_EVENTS,
        eventKinds: EVENT_KIND_IDS,
        videos: DEMO_VIDEOS,
        formulaLibrary: DEMO_FORMULA_LIBRARY,

        // system
        services: buildServices(),
        serviceStates: SERVICE_STATES,
        vendorContacts: DEMO_VENDOR_CONTACTS,
        suppliers: DEMO_SUPPLIERS,
        supplierKinds: SUPPLIER_KIND_IDS,
        supplierPayMethods: SUPPLIER_PAY_METHOD_IDS,
        payTerms: PAY_TERM_IDS,
        businessTypes: BUSINESS_TYPE_IDS,
        log: buildSystemLog(orders, practitioners),
        logAgents: DEMO_LOG_AGENTS,
        logEntityTypes: LOG_ENTITY_TYPE_IDS,
    };
}
