// The boot store: one load of the whole dataset, and the cross-screen counts
// derived from it.
//
// Every domain store reads its rows from here rather than importing @/demo, so
// the console has exactly one place that knows whether its records came from the
// fixture or from an API.
//
// The two computeds at the bottom are what the shell needs: `navCounts` feeds the
// badge on each nav item, `openExceptions` feeds the bell. Both are pure
// derivations of the loaded records — nothing here starts a timer, refreshes
// itself, or invents a figure the data does not hold. A count of zero means the
// records say zero.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
    BATCH_EXPIRY_WARN_DAYS,
    CREDIT,
    DELIVERY_STATUS_IDS,
    EXCEPTION_THRESHOLDS,
    TERMINAL_STATUS_IDS,
} from '@/config';
import { loadDataset } from '@/data/source';

/**
 * Statuses that put an order on the deliveries desk and still need someone to
 * act: the delivery statuses minus the ones that mean the order is finished.
 */
const OPEN_DELIVERY_STATUS_IDS = DELIVERY_STATUS_IDS.filter(
    (id) => !TERMINAL_STATUS_IDS.includes(id),
);

/** How many item names the low-stock notification row previews. */
const LOW_STOCK_PREVIEW = 3;

export const useDatasetStore = defineStore('dataset', () => {
    /** `idle` | `loading` | `ready` | `error`. */
    const status = ref('idle');
    const error = ref(null);
    const data = ref({});

    const isBusy = computed(
        () => status.value === 'idle' || status.value === 'loading',
    );
    const isReady = computed(() => status.value === 'ready');
    const isError = computed(() => status.value === 'error');

    /** One collection, always an array — screens render before the load lands. */
    const list = (name) =>
        Array.isArray(data.value[name]) ? data.value[name] : [];

    // The domain collections. Named rather than reached through `list()` at the
    // call site, so a typo is a missing import instead of a silently empty grid.
    const orders = computed(() => list('orders'));
    const practitioners = computed(() => list('practitioners'));
    const pendingUsers = computed(() => list('pendingUsers'));
    const patients = computed(() => list('patients'));
    const customers = computed(() => list('customers'));
    const admins = computed(() => list('admins'));
    const products = computed(() => list('products'));
    const priceGroups = computed(() => list('priceGroups'));
    const stock = computed(() => list('stock'));
    const batches = computed(() => list('batches'));
    const receipts = computed(() => list('receipts'));
    const movements = computed(() => list('movements'));
    const documents = computed(() => list('documents'));
    const transactions = computed(() => list('transactions'));
    const collectionLinks = computed(() => list('collectionLinks'));
    const messages = computed(() => list('messages'));
    const services = computed(() => list('services'));
    const vendorContacts = computed(() => list('vendorContacts'));
    const suppliers = computed(() => list('suppliers'));
    const log = computed(() => list('log'));

    const session = computed(() => data.value.session || null);

    /** The signed-in admin, or null while the dataset is still loading. */
    const me = computed(() => {
        const id = session.value?.adminId;

        return (
            admins.value.find((admin) => admin.id === id) ||
            admins.value.find((admin) => admin.me) ||
            null
        );
    });

    /**
     * Load the dataset. Called once by the root component; `load(true)` is the
     * retry path behind AErrorState.
     *
     * @param {boolean} [force] Reload even when a dataset is already in hand.
     */
    async function load(force = false) {
        if (status.value === 'loading') {
            return;
        }

        if (status.value === 'ready' && !force) {
            return;
        }

        status.value = 'loading';
        error.value = null;

        try {
            data.value = await loadDataset();
            status.value = 'ready';
        } catch (failure) {
            data.value = {};
            error.value = failure;
            status.value = 'error';
        }
    }

    // ---- derivations the whole console shares --------------------------------

    /** Orders carrying at least one open exception flag. */
    const flaggedOrders = computed(() =>
        orders.value.filter((order) => order.flags?.length),
    );

    const ordersByFlag = (flag) =>
        orders.value.filter((order) => order.flags?.includes(flag));

    const downServices = computed(() =>
        services.value.filter((service) => service.state === 'down'),
    );

    const failedDocuments = computed(() =>
        documents.value.filter((document) => document.status === 'failed'),
    );

    const failedMessages = computed(() =>
        messages.value.filter((message) => message.status === 'failed'),
    );

    /**
     * Practitioners whose credit balance has been open past the warning window.
     * The pharmacy warns and never blocks, so this is the only signal that a
     * debt has aged — there is no credit ceiling to breach.
     */
    const overduePractitioners = computed(() =>
        practitioners.value.filter(
            (practitioner) =>
                practitioner.debt > 0 &&
                practitioner.debtDays > CREDIT.warnDays,
        ),
    );

    const lowStock = computed(() => stock.value.filter((row) => row.low));

    /** Batches inside the expiry warning window that still hold quantity. */
    const expiringBatches = computed(() =>
        batches.value.filter(
            (batch) => batch.state === 'expiring' && batch.remaining > 0,
        ),
    );

    const openDeliveries = computed(() =>
        orders.value.filter((order) =>
            OPEN_DELIVERY_STATUS_IDS.includes(order.status),
        ),
    );

    /** The pending registration that has waited longest, or null. */
    const oldestPendingUser = computed(() =>
        pendingUsers.value.reduce(
            (oldest, user) =>
                !oldest || user.submitted?.daysAgo > oldest.submitted?.daysAgo
                    ? user
                    : oldest,
            null,
        ),
    );

    /**
     * Badge per nav item: `n` is the number of records, `alert` marks the ones
     * that are exceptions rather than ordinary workload, and `params` fills the
     * tooltip message at `shell.count.<navId>`. The badge itself is hidden at
     * zero, so no screen has to special-case an empty count.
     */
    const navCounts = computed(() => {
        const flagged = flaggedOrders.value.length;
        const pending = pendingUsers.value.length;
        const docs = failedDocuments.value.length;
        const overdue = overduePractitioners.value.length;
        const deliveries = openDeliveries.value.length;
        const failedMsgs = failedMessages.value.length;
        const low = lowStock.value.length;
        const down = downServices.value.length;

        return {
            orders: { n: flagged, alert: true, params: { n: flagged } },
            users: { n: pending, alert: true, params: { n: pending } },
            finance: {
                n: docs + overdue,
                alert: true,
                params: { overdue, docs, days: CREDIT.warnDays },
            },
            deliveries: {
                n: deliveries,
                alert: false,
                params: { n: deliveries },
            },
            messaging: {
                n: failedMsgs,
                alert: true,
                params: { n: failedMsgs },
            },
            inventory: { n: low, alert: true, params: { n: low } },
            integrations: { n: down, alert: true, params: { n: down } },
        };
    });

    /**
     * The open-exceptions list behind the bell, most disruptive first. One row
     * per condition, each routing to the screen that resolves it.
     *
     * `params` fills `shell.exception.<id>.title`; `names` carries the record
     * content the row lists, as arrays of `{ he, en }` values the component
     * resolves in the active locale.
     */
    const openExceptions = computed(() => {
        const rows = [
            {
                id: 'services_down',
                icon: 'db',
                n: downServices.value.length,
                names: downServices.value.map((service) => [
                    service.sys,
                    service.label,
                ]),
                params: { n: downServices.value.length },
                to: { name: 'integrations', query: { tab: 'services' } },
            },
            {
                id: 'doc_failed',
                icon: 'file_text',
                n: ordersByFlag('doc_failed').length,
                params: { n: ordersByFlag('doc_failed').length },
                to: { name: 'finance', query: { tab: 'docs' } },
            },
            {
                id: 'credit_overdue',
                icon: 'coin',
                n: overduePractitioners.value.length,
                names: overduePractitioners.value.map((practitioner) => [
                    practitioner.name,
                ]),
                params: {
                    n: overduePractitioners.value.length,
                    days: CREDIT.warnDays,
                },
                to: { name: 'finance', query: { tab: 'balances' } },
            },
            {
                id: 'link_expiring',
                icon: 'clock',
                n: ordersByFlag('link_expiring').length,
                params: {
                    n: ordersByFlag('link_expiring').length,
                    hours: EXCEPTION_THRESHOLDS.linkExpiringHours,
                },
                to: { name: 'orders', query: { flag: 'link_expiring' } },
            },
            {
                id: 'low_stock',
                icon: 'grid',
                n: lowStock.value.length,
                names: lowStock.value
                    .slice(0, LOW_STOCK_PREVIEW)
                    .map((row) => [row.name]),
                params: { n: lowStock.value.length },
                to: { name: 'inventory', query: { tab: 'stock' } },
            },
            {
                id: 'expiring_batches',
                icon: 'layers',
                n: expiringBatches.value.length,
                params: {
                    n: expiringBatches.value.length,
                    days: BATCH_EXPIRY_WARN_DAYS,
                },
                to: { name: 'inventory', query: { tab: 'batches' } },
            },
            {
                id: 'missing_address',
                icon: 'map_pin',
                n: ordersByFlag('address').length,
                params: { n: ordersByFlag('address').length },
                to: { name: 'orders', query: { flag: 'address' } },
            },
            {
                id: 'msg_failed',
                icon: 'whatsapp',
                n: failedMessages.value.length,
                params: { n: failedMessages.value.length },
                to: {
                    name: 'messaging',
                    query: { tab: 'log', status: 'failed' },
                },
            },
            {
                id: 'pending_users',
                icon: 'users',
                n: pendingUsers.value.length,
                params: {
                    n: pendingUsers.value.length,
                    oldest: oldestPendingUser.value?.submitted?.stamp || '',
                },
                to: { name: 'users', query: { tab: 'pending' } },
            },
            {
                id: 'pay_stale',
                icon: 'clock',
                n: ordersByFlag('pay_stale').length,
                params: {
                    n: ordersByFlag('pay_stale').length,
                    days: EXCEPTION_THRESHOLDS.payStaleDays,
                },
                to: { name: 'orders', query: { flag: 'pay_stale' } },
            },
        ];

        return rows.filter((row) => row.n > 0);
    });

    return {
        status,
        error,
        data,
        isBusy,
        isReady,
        isError,
        load,

        orders,
        practitioners,
        pendingUsers,
        patients,
        customers,
        admins,
        products,
        priceGroups,
        stock,
        batches,
        receipts,
        movements,
        documents,
        transactions,
        collectionLinks,
        messages,
        services,
        vendorContacts,
        suppliers,
        log,
        session,
        me,

        flaggedOrders,
        ordersByFlag,
        downServices,
        failedDocuments,
        failedMessages,
        overduePractitioners,
        lowStock,
        expiringBatches,
        openDeliveries,
        navCounts,
        openExceptions,
    };
});
