// The system area: service health, connections, admin users,
// vendor contacts, supplier cards and the read-only system log.
//
// Two things are worth knowing before reading further.
//
// 1. Nothing in this store probes anything. `services` is the reading the data
//    layer holds — a stored state, a stored response time, a stored check time.
//    There is no timer, no interval, no invented figure: a service is `down`
//    here because the record says so, and it stops being `down` when the record
//    changes, never because a component waited a moment and decided.
//
// 2. Every mutation is applied to a local overlay first and then reported to the
//    data layer through `persist()`. Against the demo fixture `persist()` is a
//    no-op, so the console is fully interactive without a backend; against a
//    real API a rejected write puts the overlay back the way it was and the
//    screen says the change did not save.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { SUPPLIER_COMPLIANCE_DOCS } from '@/config/suppliers';
import { persist } from '@/data/source';
import { isoDaysAgo } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Which system a monitored endpoint belongs to: the part of its id before the
 * first underscore. The ids are authored that way on purpose (`gi_doc` and
 * `gi_alloc` are both Green Invoice), so the health board and the connection
 * cards agree on the grouping without either of them holding a second list.
 */
export function serviceSystemKey(service) {
    return String(service.id).split('_')[0];
}

/** Worst state wins when a system's endpoints disagree. */
export function worstState(services) {
    if (services.some((service) => service.state === 'down')) {
        return 'down';
    }

    if (services.some((service) => service.state === 'slow')) {
        return 'slow';
    }

    return 'ok';
}

/**
 * Endpoints grouped by the system that serves them, in first-appearance order.
 * Exported because a filtered board groups the rows that survived the filter,
 * not the whole list.
 */
export function groupServices(services) {
    const groups = [];

    services.forEach((service) => {
        const key = serviceSystemKey(service);
        let group = groups.find((candidate) => candidate.key === key);

        if (!group) {
            group = {
                key,
                sys: service.sys,
                icon: service.sysIcon,
                services: [],
            };
            groups.push(group);
        }

        group.services.push(service);
    });

    return groups.map((group) => ({
        ...group,
        state: worstState(group.services),
    }));
}

/**
 * How recently an admin user signed in, as the buckets the filter offers. Read
 * from the record's own last-login stamp; an admin who has never signed in
 * carries none.
 */
export const LAST_LOGIN_BUCKET_IDS = ['today', 'yesterday', 'older', 'never'];

export function lastLoginBucket(admin) {
    const days = admin.last?.daysAgo;

    if (days === null || days === undefined) {
        return 'never';
    }

    if (days === 0) {
        return 'today';
    }

    if (days === 1) {
        return 'yesterday';
    }

    return 'older';
}

/**
 * The compliance documents a supplier card actually carries a status for, in the
 * order the card lists them. `field` names the record's own sub-object, so a
 * document nobody recorded is absent rather than shown as unknown.
 */
export const SUPPLIER_DOC_FIELDS = [
    { id: 'bookkeeping_cert', field: 'books' },
    { id: 'withholding_tax', field: 'tax' },
];

/** True while every compliance document on the card is valid. */
export function supplierDocsOk(supplier) {
    return SUPPLIER_DOC_FIELDS.every(
        (doc) => supplier?.[doc.field]?.ok !== false,
    );
}

/**
 * Whether a supplier's missing paperwork blocks paying him. The bookkeeping
 * certificate blocks *payment* and not purchasing — that distinction is the
 * whole point of the rule and is stated in config/suppliers.js.
 */
export function supplierPaymentBlocked(supplier) {
    return SUPPLIER_COMPLIANCE_DOCS.filter(
        (doc) => doc.blocks === 'payment',
    ).some((doc) => {
        const match = SUPPLIER_DOC_FIELDS.find((row) => row.id === doc.id);

        return match ? supplier?.[match.field]?.ok === false : false;
    });
}

/** The next free numeric suffix for an id series like `a1`, `a2`, `v3`. */
function nextId(rows, prefix) {
    const highest = rows.reduce((max, row) => {
        const n = Number(String(row.id).replace(prefix, ''));

        return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    return `${prefix}${highest + 1}`;
}

/** What the supplier list may be narrowed by. */
export const SUPPLIER_FILTER_FIELDS = [
    {
        key: 'kind',
        group: 'who',
        kind: 'set',
        prefix: 'systemContacts.kind',
        values: (one) => [one.kind],
    },
    {
        key: 'status',
        group: 'who',
        kind: 'set',
        prefix: 'systemContacts.status',
        values: (one) => [one.status],
    },
    {
        key: 'docs',
        group: 'papers',
        kind: 'set',
        prefix: 'systemContacts.suppliers.filter.docsState',
        values: (one) => [supplierDocsOk(one) ? 'ok' : 'bad'],
    },
    {
        key: 'pay',
        group: 'papers',
        kind: 'set',
        prefix: 'systemContacts.payMethod',
        values: (one) => (one.payMethod ? [one.payMethod] : []),
    },
];

export const SUPPLIER_FILTER_GROUPS = ['who', 'papers'];

export const useSystemStore = defineStore('system', () => {
    const dataset = useDatasetStore();

    /**
     * Apply a change to one overlay and report it. Returns whether the write
     * was accepted; a rejected write leaves the overlay as it was.
     */
    async function commit(overlay, next, path, payload, method = 'POST') {
        const before = overlay.value;

        overlay.value = next;

        try {
            await persist(path, payload, method);

            return true;
        } catch {
            overlay.value = before;

            return false;
        }
    }

    // ---- service health ------------------------------------------------------

    const services = computed(() => dataset.services);

    /** `{ ok: { tone }, slow: { tone }, down: { tone } }` from the data layer. */
    const serviceStates = computed(() => dataset.data.serviceStates || {});

    const serviceStateIds = computed(() => Object.keys(serviceStates.value));

    /** Endpoints grouped by the system that serves them, first appearance first. */
    const serviceGroups = computed(() => groupServices(services.value));

    /** How many endpoints sit in each state, plus the two totals. */
    const serviceCounts = computed(() => {
        const counts = Object.fromEntries(
            serviceStateIds.value.map((id) => [id, 0]),
        );

        services.value.forEach((service) => {
            if (counts[service.state] !== undefined) {
                counts[service.state] += 1;
            }
        });

        return {
            ...counts,
            endpoints: services.value.length,
            systems: serviceGroups.value.length,
        };
    });

    /**
     * Ask the server to check every monitored endpoint now, instead of waiting
     * for the automatic cycle.
     *
     * Nothing here writes a state, a response time or a check time: the browser
     * cannot reach these endpoints, and a figure this store invented would be a
     * figure the screen then presents as a measurement. The request goes out and
     * the readings change when the server has answers to report — which is the
     * same rule the rest of this file follows.
     *
     * @returns {Promise<boolean>} whether the request was accepted.
     */
    async function requestServiceCheck() {
        try {
            await persist('system/services/check', {
                ids: services.value.map((service) => service.id),
            });

            return true;
        } catch {
            return false;
        }
    }

    const downServices = computed(() =>
        services.value.filter((service) => service.state === 'down'),
    );

    const slowServices = computed(() =>
        services.value.filter((service) => service.state === 'slow'),
    );

    /** The endpoints one connection card covers. */
    const connectionServices = (prefixes) =>
        services.value.filter((service) =>
            prefixes.includes(serviceSystemKey(service)),
        );

    // ---- admin users ---------------------------------------------------------

    const adminOverlay = ref(null);

    /**
     * Admin users. There are deliberately no roles in this console: every admin
     * holds the same full set of permissions, so an account carries no grant of
     * its own and nothing here resolves one.
     */
    const admins = computed(() => {
        if (adminOverlay.value) {
            return adminOverlay.value;
        }

        return dataset.admins.map((admin) => ({
            ...admin,
        }));
    });

    const me = computed(() => admins.value.find((admin) => admin.me) || null);

    /** How many admins fall into each last-login bucket. */
    const adminLoginCounts = computed(() => {
        const counts = Object.fromEntries(
            LAST_LOGIN_BUCKET_IDS.map((id) => [id, 0]),
        );

        admins.value.forEach((admin) => {
            counts[lastLoginBucket(admin)] += 1;
        });

        return counts;
    });

    /**
     * Create an admin user. The initial password is set by the server and sent
     * to the phone on the record — nothing here generates or holds one.
     */
    function addAdmin(user) {
        const admin = {
            id: nextId(admins.value, 'a'),
            name: user.name,
            email: user.email,
            phone: user.phone,
            created: isoDaysAgo(0),
            last: null,
            me: false,
        };

        return commit(
            adminOverlay,
            [...admins.value, admin],
            'system/admins',
            admin,
        );
    }

    function removeAdmin(id, reason) {
        return commit(
            adminOverlay,
            admins.value.filter((admin) => admin.id !== id),
            `system/admins/${id}`,
            { reason },
            'DELETE',
        );
    }

    /**
     * Ask the server to issue a new password. No password is generated in the
     * browser and none is returned to it, so there is nothing to put in the
     * store — only the request.
     */
    async function resetAdminPassword(id) {
        try {
            await persist(`system/admins/${id}/password-reset`, {});

            return true;
        } catch {
            return false;
        }
    }

    // ---- vendor contacts ----------------------------------------------------

    const contactOverlay = ref(null);

    const vendorContacts = computed(
        () => contactOverlay.value || dataset.vendorContacts,
    );

    function saveVendorContact(contact) {
        const isNew = !contact.id;
        const row = isNew
            ? {
                  ...contact,
                  id: nextId(vendorContacts.value, 'v'),
                  icon: contact.icon || 'layers',
              }
            : contact;
        const next = isNew
            ? [...vendorContacts.value, row]
            : vendorContacts.value.map((item) =>
                  item.id === row.id ? row : item,
              );

        return commit(
            contactOverlay,
            next,
            isNew
                ? 'system/vendor-contacts'
                : `system/vendor-contacts/${row.id}`,
            row,
            isNew ? 'POST' : 'PUT',
        );
    }

    function removeVendorContact(id) {
        return commit(
            contactOverlay,
            vendorContacts.value.filter((contact) => contact.id !== id),
            `system/vendor-contacts/${id}`,
            {},
            'DELETE',
        );
    }

    // ---- supplier cards -----------------------------------------------------

    const supplierOverlay = ref(null);

    const suppliers = computed(
        () => supplierOverlay.value || dataset.suppliers,
    );

    const supplierKindIds = computed(() => dataset.data.supplierKinds || []);

    const payTermIds = computed(() => dataset.data.payTerms || []);

    const payMethodIds = computed(() => dataset.data.supplierPayMethods || []);

    const businessTypeIds = computed(() => dataset.data.businessTypes || []);

    /**
     * The currencies that actually appear on supplier cards. The editor offers
     * what the ledger already trades in rather than holding a list of its own.
     */
    const supplierCurrencies = computed(() => [
        ...new Set(
            suppliers.value.map((supplier) => supplier.cur).filter(Boolean),
        ),
    ]);

    /** Goods receipts recorded against one supplier. */
    const supplierReceipts = (code) =>
        dataset.receipts.filter((receipt) => receipt.supplierCode === code);

    function patchSupplier(code, patch, path, payload, method = 'PUT') {
        return commit(
            supplierOverlay,
            suppliers.value.map((supplier) =>
                supplier.code === code ? { ...supplier, ...patch } : supplier,
            ),
            path,
            payload,
            method,
        );
    }

    function updateSupplier(code, patch) {
        return patchSupplier(code, patch, `system/suppliers/${code}`, patch);
    }

    function suspendSupplier(code, reason) {
        return patchSupplier(
            code,
            {
                status: 'suspended',
                suspendedWhy: reason,
                suspendedWhen: isoDaysAgo(0),
            },
            `system/suppliers/${code}/suspend`,
            { reason },
        );
    }

    function reactivateSupplier(code) {
        return patchSupplier(
            code,
            { status: 'active', suspendedWhy: null, suspendedWhen: null },
            `system/suppliers/${code}/reactivate`,
            {},
        );
    }

    /**
     * The supplier cards carry bank details, trade terms and purchase prices, so
     * reaching them is a re-confirmation rather than a click. The code is
     * verified by the server; the fixture's session carries one only so the flow
     * can be exercised without a backend.
     */
    const supplierCardsUnlocked = ref(false);

    /**
     * The approval code the riskier confirmations ask for. The server is what
     * verifies it; the fixture's session carries one only so the flows can be
     * exercised without a backend. Same contract as `approvalPin` in
     * stores/catalog.js.
     */
    const approvalPin = computed(() => dataset.session?.pin || true);

    const supplierGateCode = approvalPin;

    async function unlockSupplierCards(code) {
        try {
            await persist('system/supplier-cards/unlock', { code });
            supplierCardsUnlocked.value = true;

            return true;
        } catch {
            return false;
        }
    }

    function lockSupplierCards() {
        supplierCardsUnlocked.value = false;
    }

    /**
     * Admin-user management is gated the same way, and for the same reason: the
     * screen creates and deletes the accounts that can reach everything, so it
     * is re-confirmed on entry rather than merely navigated to. The gate holds
     * until the screen is left or locked again.
     */
    const adminCardsUnlocked = ref(false);

    const adminGateCode = approvalPin;

    async function unlockAdminUsers(code) {
        try {
            await persist('system/admins/unlock', { code });
            adminCardsUnlocked.value = true;

            return true;
        } catch {
            return false;
        }
    }

    function lockAdminUsers() {
        adminCardsUnlocked.value = false;
    }

    // ---- system log ---------------------------------------------------------

    /** Immutable by design: the log is read, never written, from a screen. */
    const log = computed(() => dataset.log);

    const logEntityTypeIds = computed(() => dataset.data.logEntityTypes || []);

    /**
     * The distinct people and processes the log has rows for, keyed by the
     * Hebrew source text so the filter in the URL survives a language switch.
     */
    const logActors = computed(() => {
        const seen = new Map();

        log.value.forEach((row) => {
            const id = row.actor?.he ?? String(row.actor);

            if (!seen.has(id)) {
                seen.set(id, { id, name: row.actor });
            }
        });

        return [...seen.values()];
    });

    return {
        services,
        serviceStates,
        serviceStateIds,
        serviceGroups,
        serviceCounts,
        downServices,
        slowServices,
        connectionServices,
        requestServiceCheck,

        admins,
        me,
        adminLoginCounts,
        addAdmin,
        removeAdmin,
        resetAdminPassword,

        vendorContacts,
        saveVendorContact,
        removeVendorContact,

        suppliers,
        supplierKindIds,
        payTermIds,
        payMethodIds,
        businessTypeIds,
        supplierCurrencies,
        supplierReceipts,
        updateSupplier,
        suspendSupplier,
        reactivateSupplier,
        supplierCardsUnlocked,
        approvalPin,
        supplierGateCode,
        unlockSupplierCards,
        lockSupplierCards,

        adminCardsUnlocked,
        adminGateCode,
        unlockAdminUsers,
        lockAdminUsers,

        log,
        logEntityTypeIds,
        logActors,
    };
});
