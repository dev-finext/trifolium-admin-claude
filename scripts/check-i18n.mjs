// Locale completeness check.
//
// Five failure modes this catches, most of which look fine in Hebrew and break in
// English:
//   1. A key used with t() that exists in neither catalog.
//   2. A key present in he but missing in en (or the reverse) — vue-i18n falls
//      back silently to Hebrew, so an English screen quietly stays Hebrew.
//   3. A Hebrew string literal left inside a .vue file.
//   4. A template-literal key — t(`orders.filter.field.${id}`) — whose prefix
//      has no children at all. The individual ids cannot be resolved
//      statically, but a prefix that resolves to nothing is always a bug, and
//      this is exactly the gap that let eight raw keys reach the screen.
//   5. An id in a config enum with no label under its namespace. Check 4 only
//      sees a prefix that resolves to *nothing*; a single missing id inside a
//      populated prefix reaches the screen as a raw key and this is what finds
//      it. ENUM_NAMESPACES below is the map, and it is deliberately explicit:
//      an enum whose ids stop matching its labels is the bug, so the pairing
//      cannot be inferred from the catalog it is meant to police.
//
// Run: node scripts/check-i18n.mjs
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'resources/js');

const HEBREW = /[֐-׿]/;

async function walk(dir, filter, out = []) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await walk(full, filter, out);
        } else if (filter(full)) {
            out.push(full);
        }
    }

    return out;
}

/** Flatten a nested catalog into dotted keys. */
function flatten(obj, prefix = '', out = new Set()) {
    for (const [key, value] of Object.entries(obj)) {
        const dotted = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            flatten(value, dotted, out);
        } else {
            out.add(dotted);
        }
    }

    return out;
}

async function loadCatalog(locale) {
    const entry = pathToFileURL(
        path.join(jsDir, 'locales', locale, 'index.js'),
    );
    const mod = await import(entry.href);

    return flatten(mod.default);
}

// t('a.b'), t("a.b"), $t('a.b'), te('a.b') — the static forms we can verify.
const T_CALL = /\$?\b(?:t|te|tm)\(\s*['"]([\w.-]+)['"]/g;

// t(`a.b.${x}`) — the interpolated form. The id is unknowable here, but the
// prefix before the first ${ must still name a subtree that exists.
const T_TEMPLATE = /\$?\b(?:t|te|tm)\(\s*`([\w.-]*?)\$\{/g;

/**
 * Every enum whose ids become part of a translation key, and the namespace those
 * labels live under. `suffix` is for the enums keyed one level deeper, e.g.
 * `exception.stock_short.short`.
 *
 * Add a row here whenever a new id list starts feeding `t()`. An enum missing
 * from this table is not checked, which is the one way a raw key can still reach
 * a screen.
 */
const ENUM_NAMESPACES = [
    ['@/config/catalog', 'INGREDIENT_KINDS', 'ingredients.kind'],
    ['@/config/catalog', 'PREPARATION_FORM_IDS', 'preparationForm'],
    ['@/config/catalog', 'PRODUCT_STATUS_IDS', 'products.status'],
    ['@/config/catalog', 'STOCK_KINDS', 'inventory.stockKind'],
    ['@/config/catalog', 'UNITS', 'orders.unit'],
    ['@/config/catalog', 'UNITS', 'products.unit'],
    ['@/config/customers', 'CUSTOMER_SOURCE_IDS', 'users.source'],
    ['@/config/exceptions', 'EXCEPTION_IDS', 'exception', 'short'],
    ['@/config/exceptions', 'FINANCE_EXCEPTION_IDS', 'exception', 'short'],
    ['@/config/finance', 'AGING_BUCKETS', 'agingBucket'],
    ['@/config/finance', 'DOC_STATE_IDS', 'docState'],
    ['@/config/finance', 'DOC_TYPES', 'docType', 'name'],
    ['@/config/finance', 'LINK_STATE_IDS', 'finance.linkState'],
    ['@/config/finance', 'PAYMENT_METHODS', 'paymentMethod'],
    ['@/config/integrations', 'CONNECTION_IDS', 'integrations.connections.what'],
    ['@/config/integrations', 'CONNECTION_IDS', 'integrations.impact'],
    ['@/config/inventory', 'ADJUST_REASONS', 'adjustReason', 'name'],
    ['@/config/inventory', 'BATCH_STATE_IDS', 'batchState'],
    ['@/config/inventory', 'STOCK_MOVE_IDS', 'stockMove'],
    ['@/config/inventory', 'STOCK_UNITS', 'inventory.unit'],
    ['@/config/inventory', 'WAREHOUSE_IDS', 'warehouse', 'name'],
    ['@/config/crm', 'ACTIVITY_ENTITY_IDS', 'crm.entity'],
    ['@/config/crm', 'ACTIVITY_SUBJECT_IDS', 'crm.subject'],
    ['@/config/crm', 'ACTIVITY_TYPE_IDS', 'crm.type'],
    ['@/config/crm', 'CANCEL_REASON_IDS', 'orders.cancelCause'],
    ['@/config/gates', 'GATED_ACTION_IDS', 'gate.action', 'title'],
    ['@/config/items', 'ATTACHMENT_ENTITY_IDS', 'attachments.entity'],
    ['@/config/items', 'BOM_ISSUE_IDS', 'items.bom.issue'],
    ['@/config/items', 'CURRENCY_IDS', 'items.currency'],
    ['@/config/items', 'ITEM_FAMILY_IDS', 'items.family'],
    ['@/config/items', 'ITEM_FLAG_IDS', 'items.flag'],
    ['@/config/items', 'ITEM_MANDATORY_FIELD_IDS', 'items.mandatory'],
    ['@/config/items', 'ITEM_UOM_IDS', 'items.uom'],
    ['@/config/items', 'PREP_CONTAINS_IDS', 'items.prep.contains'],
    ['@/config/items', 'PREP_UNIT_IDS', 'items.uom'],
    ['@/config/items', 'SAFETY_CONTEXT_IDS', 'items.safetyContext'],
    ['@/config/items', 'SAFETY_LEVEL_IDS', 'items.safetyLevel'],
    ['@/config/items', 'SITE_CATEGORY_GROUP_IDS', 'items.siteGroup'],
    ['@/config/purchasing', 'BATCH_SOURCE_IDS', 'inventory.batchSource'],
    ['@/config/purchasing', 'PICK_MODE_IDS', 'inventory.pickMode'],
    ['@/config/purchasing', 'PO_STATE_IDS', 'purchasing.state'],
    ['@/config/purchasing', 'SUPPLIER_NOTE_STATE_IDS', 'purchasing.noteState'],
    ['@/config/reports', 'REPORT_GROUP_IDS', 'reports.group'],
    ['@/config/reports', 'REPORT_IDS', 'reports.report', 'title'],
    ['@/config/stickers', 'STICKER_ALIGN_IDS', 'stickers.align'],
    ['@/config/stickers', 'STICKER_FIELD_IDS', 'stickers.field'],
    ['@/config/stickers', 'STICKER_KIND_IDS', 'stickers.kind'],
    ['@/config/stickers', 'STICKER_TEMPLATE_IDS', 'stickers.template'],
    ['@/config/log', 'LOG_ACTION_IDS', 'logAction'],
    ['@/config/log', 'LOG_ACTOR_TYPES', 'logActor'],
    ['@/config/log', 'LOG_FINANCIAL_ACTION_IDS', 'logAction'],
    ['@/config/log', 'LOG_SOURCE_IDS', 'logSource'],
    ['@/config/messaging', 'CHANNEL_IDS', 'channel'],
    ['@/config/messaging', 'MESSAGE_STATE_IDS', 'msgState'],
    ['@/config/messaging', 'TEMPLATE_CATEGORY_IDS', 'templateCategory'],
    ['@/config/messaging', 'TEMPLATE_VARS', 'messaging.var'],
    ['@/config/nav', 'NAV_GROUPS', 'nav.group'],
    ['@/config/nav', 'NAV_ITEM_IDS', 'nav.item'],
    ['@/config/org', 'ACTIVE_COURIER_IDS', 'courier'],
    ['@/config/org', 'COURIER_IDS', 'courier'],
    ['@/config/org', 'LAB_ROLE_IDS', 'orders.labRole'],
    ['@/config/org', 'PICKUP_POINT_KIND_IDS', 'pickupKind'],
    ['@/config/org', 'WEEKDAY_IDS', 'weekday'],
    ['@/config/org', 'FULFILMENT_IDS', 'fulfilment'],
    ['@/config/org', 'PAYER_IDS', 'payer'],
    ['@/config/org', 'PAYER_IDS', 'ui.payer'],
    ['@/config/org', 'THERAPY_IDS', 'therapy'],
    ['@/config/statuses', 'DELIVERY_STATUS_IDS', 'status'],
    ['@/config/statuses', 'HOLD_REASON_IDS', 'holdReason'],
    ['@/config/statuses', 'ITEM_STAGE_IDS', 'itemStage'],
    ['@/config/statuses', 'ORDER_STATUS_IDS', 'status'],
    ['@/config/statuses', 'TERMINAL_STATUS_IDS', 'status'],
    ['@/config/suppliers', 'PAYMENT_TERM_IDS', 'systemContacts.terms'],
    ['@/config/suppliers', 'SUPPLIER_KIND_IDS', 'systemContacts.kind'],
    [
        '@/config/suppliers',
        'SUPPLIER_COMPLIANCE_DOCS',
        'systemContacts.suppliers.docs',
    ],
    ['@/stores/orders', 'ORDER_FILTER_GROUPS', 'orders.filterGroup'],
    ['@/stores/orders', 'ORDER_FILTER_KEYS', 'orders.filter.field'],
];

/** The ids in an exported list, whether it holds strings or `{ id }` records. */
function idsOf(list, label) {
    if (!Array.isArray(list) || !list.length) {
        throw new Error(`${label} is not a non-empty array`);
    }

    return list.map((entry) => {
        if (typeof entry === 'string') {
            return entry;
        }

        if (entry && typeof entry.id === 'string') {
            return entry.id;
        }

        throw new Error(`${label} holds an entry with no id`);
    });
}

// Strip comments and <style> blocks before scanning for stray Hebrew, so a
// business-rule comment written in Hebrew is not reported as a UI string.
function stripNonUi(source) {
    return source
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const [he, en] = await Promise.all([loadCatalog('he'), loadCatalog('en')]);

// Every enum id must have a label. Only `he` is checked: the symmetry checks
// above already guarantee `en` carries whatever `he` does.
const unlabelledIds = [];

for (const [module, name, prefix, suffix] of ENUM_NAMESPACES) {
    const mod = await import(module);
    const list = mod[name];

    if (list === undefined) {
        unlabelledIds.push(`${name} is not exported by ${module}`);
        continue;
    }

    for (const id of idsOf(list, `${module} ${name}`)) {
        const key = suffix
            ? `${prefix}.${id}.${suffix}`
            : `${prefix}.${id}`;

        if (!he.has(key)) {
            unlabelledIds.push(`${key}  (${name})`);
        }
    }
}

const missingInEn = [...he].filter((key) => !en.has(key)).sort();
const missingInHe = [...en].filter((key) => !he.has(key)).sort();

const sourceFiles = await walk(
    jsDir,
    (file) =>
        /\.(vue|js)$/.test(file) &&
        !file.includes(`${path.sep}locales${path.sep}`),
);

const unknownKeys = new Map();
const deadPrefixes = new Map();
const hebrewLiterals = [];

/** Does any key in the catalog sit under this dotted prefix? */
const prefixHasChildren = (prefix, keys) => {
    const dotted = prefix.endsWith('.') ? prefix : `${prefix}.`;

    for (const key of keys) {
        if (key.startsWith(dotted)) {
            return true;
        }
    }

    return false;
};

for (const file of sourceFiles) {
    const raw = await readFile(file, 'utf8');
    const rel = path.relative(root, file);
    const clean = stripNonUi(raw);

    for (const [, key] of clean.matchAll(T_CALL)) {
        if (!he.has(key) && !en.has(key)) {
            if (!unknownKeys.has(key)) {
                unknownKeys.set(key, rel);
            }
        }
    }

    for (const [, prefix] of clean.matchAll(T_TEMPLATE)) {
        const trimmed = prefix.replace(/\.$/, '');

        if (
            trimmed &&
            !prefixHasChildren(trimmed, he) &&
            !prefixHasChildren(trimmed, en) &&
            !deadPrefixes.has(trimmed)
        ) {
            deadPrefixes.set(trimmed, rel);
        }
    }

    if (file.endsWith('.vue') && HEBREW.test(clean)) {
        const lines = clean.split('\n');

        lines.forEach((line, i) => {
            if (HEBREW.test(line)) {
                hebrewLiterals.push(
                    `${rel}:${i + 1}  ${line.trim().slice(0, 90)}`,
                );
            }
        });
    }
}

const report = (title, rows) => {
    if (!rows.length) {
        console.log(`✓ ${title}`);

        return 0;
    }

    console.log(`\n✗ ${title} (${rows.length})`);
    rows.slice(0, 40).forEach((row) => console.log(`    ${row}`));

    if (rows.length > 40) {
        console.log(`    … ${rows.length - 40} more`);
    }

    return rows.length;
};

console.log(`he keys: ${he.size}   en keys: ${en.size}\n`);

let failures = 0;

failures += report('every he key has an en counterpart', missingInEn);
failures += report('every en key has a he counterpart', missingInHe);
failures += report(
    'every t() key exists',
    [...unknownKeys].map(([k, f]) => `${k}  (${f})`),
);
failures += report(
    'every interpolated key prefix resolves',
    [...deadPrefixes].map(([k, f]) => `${k}.\${…}  (${f})`),
);
failures += report('every enum id has a label', unlabelledIds);
failures += report('no Hebrew literals in .vue files', hebrewLiterals);

if (failures) {
    console.log(`\n${failures} problem(s).`);
    process.exit(1);
}

console.log('\nLocale catalogs are complete and consistent.');
