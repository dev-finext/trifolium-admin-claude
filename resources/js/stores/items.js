// Items: the unified item card, the managed preparation types, the bills of
// materials and the attached files. Second-version material.
//
// An item record extends a stock row or a product (matched by sku) with the
// fields the first version never held; the joins happen here so no screen has to
// know which of the three lists a figure came from. Stock quantities stay the
// inventory store's — this store reads them and never writes them.
//
// Every mutation is optimistic and calls persist(), a no-op against the fixture.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import {
    ITEM_CODE_DIGITS,
    ITEM_FAMILY,
    ITEM_FLAG_IDS,
    ITEM_MANDATORY,
    TERMINAL_STATUS_IDS,
} from '@/config';
import { persist } from '@/data/source';
import { daysSince, fmtISO, hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';

/** Item stages during which the herbs on an order are committed, not yet consumed. */
/** The statuses at which an order has claimed its materials but not shipped. */
const COMMITTED_STATUS_IDS = ['new', 'lab', 'packed'];

/** This moment, in the shape every record's `when` field carries. */
function moment(iso = null) {
    const at = iso || isoDaysAgo(0);
    const time = hm(now());

    return {
        daysAgo: daysSince(at),
        iso: at,
        time,
        stamp: iso ? `${fmtISO(iso)} ${time}` : stamp(0),
    };
}

/** The highest trailing number in a set of ids, plus one. */
function nextSerial(ids, series) {
    const highest = ids.reduce((top, id) => {
        const digits = String(id).match(/(\d+)\s*$/);

        return digits ? Math.max(top, Number(digits[1])) : top;
    }, 0);

    return `${series}${highest + 1}`;
}

/** Is a mandatory field filled on an item? One rule per field id. */
const FILLED = {
    lat: (item) => Boolean(item.names?.lat),
    purchaseUom: (item) => Boolean(item.uom?.purchase),
    prepTypes: (item) => (item.prepTypes || []).length > 0,
    safety: (item) =>
        Boolean(
            item.safety?.pregnancy &&
            item.safety?.lactation &&
            item.safety?.under2,
        ),
    location: (item) => Boolean(item.location?.cabinet),
    siteName: (item) => Boolean(item.names?.site),
    categories: (item) => (item.site?.categories || []).length > 0,
    salePrice: (item) =>
        item.price?.sale !== null && item.price?.sale !== undefined,
    supplier: (item) => Boolean(item.suppliers?.preferred),
};

/**
 * Where one item's stock stands, as one value the filter can group by.
 * An item the console does not track has no state at all rather than a zero.
 */
export function itemStockState(row) {
    if (row.avail === null || row.avail === undefined) {
        return 'untracked';
    }

    if (row.avail <= 0) {
        return 'out';
    }

    return row.low ? 'low' : 'ok';
}

/**
 * What the one filter system may narrow the item list by. Option text comes
 * from each field's `prefix`; the supplier is record content and is labelled by
 * the screen.
 */
export const ITEM_FILTER_FIELDS = [
    {
        key: 'fam',
        group: 'what',
        kind: 'set',
        prefix: 'items.family',
        values: (row) => [row.family],
    },
    {
        key: 'flag',
        group: 'what',
        kind: 'set',
        prefix: 'items.flag',
        values: (row) => ITEM_FLAG_IDS.filter((id) => row.flags?.[id]),
    },
    {
        key: 'uom',
        group: 'what',
        kind: 'set',
        prefix: 'items.uom',
        values: (row) => (row.uom?.sales ? [row.uom.sales] : []),
    },
    {
        key: 'stk',
        group: 'stock',
        kind: 'set',
        prefix: 'items.filter.stockState',
        values: (row) => [itemStockState(row)],
    },
    {
        key: 'avail',
        group: 'stock',
        kind: 'num',
        value: (row) => row.avail ?? -1,
    },
    {
        // 'none' is a purchase item with no standing supplier — the buyer's
        // working list. Everything else that has no supplier is simply not
        // bought, and says so.
        key: 'sup',
        group: 'supply',
        kind: 'set',
        values: (row) => [
            row.suppliers?.preferred || (row.flags?.purchase ? 'none' : 'na'),
        ],
    },
    {
        key: 'price',
        group: 'supply',
        kind: 'num',
        value: (row) => row.price?.lastPurchase ?? -1,
    },
    {
        key: 'site',
        group: 'site',
        kind: 'set',
        prefix: 'items.filter.siteState',
        values: (row) => [row.site?.sync ? 'on' : 'off'],
    },
    {
        key: 'miss',
        group: 'quality',
        kind: 'set',
        prefix: 'items.filter.missState',
        values: (row) => [row.missing.length ? 'yes' : 'no'],
    },
    {
        key: 'bom',
        group: 'quality',
        kind: 'set',
        prefix: 'items.filter.bomState',
        values: (row) => [row.bomCount ? 'yes' : 'no'],
    },
    {
        key: 'files',
        group: 'quality',
        kind: 'set',
        prefix: 'items.filter.fileState',
        values: (row) => [row.fileCount ? 'yes' : 'no'],
    },
];

/** The order the drawer lays the field groups out in. */
export const ITEM_FILTER_GROUPS = [
    'what',
    'stock',
    'supply',
    'site',
    'quality',
];

export const useItemsStore = defineStore('items', () => {
    const dataset = useDatasetStore();
    const inventory = useInventoryStore();

    const list = (name) =>
        Array.isArray(dataset.data[name]) ? dataset.data[name] : [];

    const items = computed(() => list('items'));
    const prepTypes = computed(() => list('prepTypes'));
    const boms = computed(() => list('boms'));
    const attachments = computed(() => list('attachments'));
    const siteCategories = computed(() => list('siteCategories'));

    // ---- lookups -------------------------------------------------------------

    const itemBySku = (sku) =>
        items.value.find((item) => item.sku === sku) || null;
    const prepTypeById = (id) =>
        prepTypes.value.find((type) => type.id === id) || null;
    const bomById = (id) => boms.value.find((bom) => bom.id === id) || null;
    const categoryById = (id) =>
        siteCategories.value.find((cat) => cat.id === id) || null;
    const supplierByCode = (code) =>
        dataset.suppliers.find((supplier) => supplier.code === code) || null;

    const bomsOfParent = (sku) =>
        boms.value.filter((bom) => bom.parentSku === sku);
    const bomsUsing = (sku) =>
        boms.value.filter((bom) =>
            bom.components.some((component) => component.sku === sku),
        );

    const attachmentsOf = (entity, ref) =>
        attachments.value.filter(
            (file) => file.entity === entity && file.ref === ref,
        );

    /** The mandatory fields of a family. */
    const mandatoryOf = (family) => ITEM_MANDATORY[family] || [];

    /** Mandatory fields an item lacks, waivers excluded. */
    const missingOf = (item) =>
        mandatoryOf(item.family).filter(
            (field) =>
                !(item.waived || []).includes(field) && !FILLED[field]?.(item),
        );

    /** Mandatory fields an item lacks that a waiver covers. */
    const waivedOf = (item) =>
        mandatoryOf(item.family).filter(
            (field) =>
                (item.waived || []).includes(field) && !FILLED[field]?.(item),
        );

    /** The next free code in a family — `10` + `0026`. */
    const nextCode = (family) => {
        const prefix = ITEM_FAMILY[family]?.prefix || '00';
        const highest = items.value
            .filter((item) => String(item.code).startsWith(prefix))
            .reduce(
                (top, item) =>
                    Math.max(
                        top,
                        Number(String(item.code).slice(prefix.length)) || 0,
                    ),
                0,
            );

        return `${prefix}${String(highest + 1).padStart(ITEM_CODE_DIGITS, '0')}`;
    };

    const codeTaken = (code, exceptSku) =>
        items.value.some(
            (item) => item.sku !== exceptSku && item.code === code,
        );

    const skuTaken = (sku) => items.value.some((item) => item.sku === sku);

    // ---- the joined rows -----------------------------------------------------

    /**
     * Every item with its stock figures, its resolved suppliers and its policy
     * state — the row the screen lists and the card opens.
     */
    const rows = computed(() =>
        items.value.map((item) => {
            const stock = inventory.itemBySku(item.sku) || null;
            const product =
                dataset.products.find((row) => row.sku === item.sku) || null;
            const onHand = stock
                ? stock.onHand
                : product
                  ? product.stock
                  : null;
            const alloc = stock ? stock.alloc : 0;

            return {
                ...item,
                stock,
                product,
                tracked: item.flags?.inventory && onHand !== null,
                onHand,
                alloc,
                avail: onHand === null ? null : onHand - alloc,
                low: stock
                    ? stock.low
                    : product
                      ? product.stock < (product.minStock ?? 0)
                      : false,
                min: stock ? stock.min : product ? product.minStock : null,
                preferred: supplierByCode(item.suppliers?.preferred),
                last: supplierByCode(item.suppliers?.last),
                missing: missingOf(item),
                waivedMissing: waivedOf(item),
                bomCount: bomsOfParent(item.sku).length,
                usedInCount: bomsUsing(item.sku).length,
                fileCount: attachmentsOf('item', item.sku).length,
            };
        }),
    );

    const rowBySku = (sku) => rows.value.find((row) => row.sku === sku) || null;

    /**
     * Orders whose live items hold this item's stock: a shelf line naming the
     * sku, or a formula still before packing that uses the herb.
     */
    const committedOf = (sku) => {
        const stock = inventory.itemBySku(sku);
        const herbId = stock?.herbId || null;
        const out = [];

        dataset.orders.forEach((order) => {
            if (
                TERMINAL_STATUS_IDS.includes(order.status) ||
                order.status === 'cancelled'
            ) {
                return;
            }

            (order.items || []).forEach((line) => {
                if (line.kind === 'shelf' && line.sku === sku) {
                    out.push({
                        id: line.id,
                        order: order.id,
                        itemName: line.name,
                        status: order.status,
                        practitioner: order.practitioner?.name,
                        qty: line.qty,
                        unit: 'unit',
                    });

                    return;
                }

                if (
                    line.kind !== 'formula' ||
                    !herbId ||
                    line.cancelled ||
                    !COMMITTED_STATUS_IDS.includes(order.status)
                ) {
                    return;
                }

                const herb = (line.herbs || []).find(
                    (row) => row.id === herbId,
                );

                if (herb) {
                    out.push({
                        id: line.id,
                        order: order.id,
                        itemName: line.name,
                        status: order.status,
                        practitioner: order.practitioner?.name,
                        qty: herb.qty,
                        unit: stock?.unit || 'g',
                    });
                }
            });
        });

        return out;
    };

    /** Open purchase-order lines for an item — filled in by the purchasing module. */
    const onOrderOf = (sku) =>
        list('purchaseOrders')
            .filter((po) => po.state !== 'closed' && po.state !== 'cancelled')
            .flatMap((po) =>
                (po.lines || [])
                    .filter(
                        (line) =>
                            line.sku === sku && line.qty > (line.received || 0),
                    )
                    .map((line) => ({
                        id: `${po.id}-${line.sku}`,
                        po: po.id,
                        supplier: po.supplier,
                        qty: line.qty - (line.received || 0),
                        // the same quantity in stock units, for the card's tile
                        qtySales:
                            (line.qty - (line.received || 0)) *
                            (line.uom === itemBySku(sku)?.uom?.purchase
                                ? itemBySku(sku)?.uom?.factor || 1
                                : 1),
                        uom: line.uom,
                        eta: po.eta,
                    })),
            );

    // ---- writes --------------------------------------------------------------

    function bag(name) {
        if (!Array.isArray(dataset.data[name])) {
            dataset.data[name] = [];
        }

        return dataset.data[name];
    }

    function writeLog(row) {
        const log = bag('log');

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    const nameText = (value) =>
        isLocalized(value) ? value.he : String(value ?? '');

    /**
     * Create or update an item. A new item that also needs a stock row gets one
     * with zero quantity — stock still only ever arrives through a goods receipt.
     */
    async function saveItem(form, existingSku = null) {
        const rows = bag('items');
        const isNew = !existingSku;
        const record = {
            sku: existingSku || form.sku,
            code: form.code,
            family: form.family,
            names: { ...form.names },
            uom: { ...form.uom },
            flags: { ...form.flags },
            price: { ...form.price },
            suppliers: { ...form.suppliers },
            prepTypes: [...(form.prepTypes || [])],
            safety: { ...form.safety },
            notes: { ...form.notes },
            site: {
                ...form.site,
                categories: [...(form.site?.categories || [])],
            },
            location: form.location ? { ...form.location } : null,
            waived: [...(form.waived || [])],
        };

        if (isNew) {
            const item = {
                ...record,
                source: form.flags?.inventory ? 'stock' : 'item',
                created: isoDaysAgo(0),
            };

            rows.unshift(item);

            if (item.flags.inventory && !inventory.itemBySku(item.sku)) {
                const stockRows = bag('stock');
                const stockRow = {
                    sku: item.sku,
                    priceSku: null,
                    herbId: item.family === 'herb' ? `ing-${item.sku}` : null,
                    kind:
                        item.family === 'herb'
                            ? 'raw'
                            : item.family === 'packaging'
                              ? 'pack'
                              : item.family === 'consumable'
                                ? 'base'
                                : 'shelf',
                    name: {
                        he: item.names.he,
                        en: item.names.en || item.names.he,
                    },
                    lat: item.names.lat || null,
                    cn: item.names.cn || null,
                    system: 'west',
                    wh:
                        item.family === 'herb' || item.family === 'consumable'
                            ? 'raw'
                            : 'shelf',
                    unit: item.uom.sales,
                    size: null,
                    sizeUnit: null,
                    price: item.price.sale,
                    onHand: 0,
                    alloc: 0,
                    min: 0,
                    avail: 0,
                    low: false,
                    created: item.created,
                };

                stockRows.unshift(stockRow);
            }

            writeLog({
                act: 'item_create',
                entType: 'catalog_item',
                ent: item.sku,
                to: item.names.he,
            });
            await persist('items', item);

            return { created: true, item };
        }

        const item = rows.find((row) => row.sku === existingSku);

        if (!item) {
            return { created: false, item: null };
        }

        const before = item.names.he;

        Object.assign(item, record);

        const stockRow = inventory.itemBySku(item.sku);

        if (stockRow) {
            stockRow.name = {
                he: item.names.he,
                en: item.names.en || item.names.he,
            };
            stockRow.lat = item.names.lat || null;
            stockRow.cn = item.names.cn || null;
        }

        writeLog({
            act: 'item_update',
            entType: 'catalog_item',
            ent: item.sku,
            from: before,
            to: item.names.he,
        });
        await persist(`items/${item.sku}`, item, 'PUT');

        return { created: false, item };
    }

    /** Create or update a preparation type — its text, unit, shelf life, contents, recipe. */
    async function savePrepType(form, existingId = null) {
        const rows = bag('prepTypes');
        const record = {
            name: { ...form.name },
            unit: form.unit,
            expiryMonths: Number(form.expiryMonths) || 0,
            labelText: form.labelText?.he ? { ...form.labelText } : null,
            contains: [...(form.contains || [])],
            recipe: (form.recipe || []).map((step) => ({
                text: { ...step.text },
                minutes: step.minutes ?? null,
            })),
        };

        if (!existingId) {
            const type = { id: form.id, legacy: false, ...record };

            rows.push(type);
            writeLog({
                act: 'prep_type_create',
                entType: 'catalog_item',
                ent: type.id,
                to: type.name.he,
            });
            await persist('prep-types', type);

            return { created: true, type };
        }

        const type = rows.find((row) => row.id === existingId);

        if (!type) {
            return { created: false, type: null };
        }

        Object.assign(type, record);
        writeLog({
            act: 'prep_type_update',
            entType: 'catalog_item',
            ent: type.id,
            to: type.name.he,
        });
        await persist(`prep-types/${type.id}`, type, 'PUT');

        return { created: false, type };
    }

    /** Create or update a bill of materials. */
    async function saveBom(form, existingId = null) {
        const rows = bag('boms');
        const record = {
            parentSku: form.parentSku,
            name: { ...form.name },
            cn: form.cn || null,
            components: form.components.map((component) => ({
                sku: component.sku,
                qty: Number(component.qty) || 0,
                uom: component.uom,
                issue: component.issue,
            })),
            alcoholPct:
                form.alcoholPct === '' || form.alcoholPct === null
                    ? null
                    : Number(form.alcoholPct),
            oilPct:
                form.oilPct === '' || form.oilPct === null
                    ? null
                    : Number(form.oilPct),
            ratio: form.ratio || null,
            yield: {
                qty: Number(form.yield?.qty) || 1,
                uom: form.yield?.uom || 'unit',
            },
            notes: form.notes?.he ? { ...form.notes } : null,
            updated: moment(),
            updatedBy: dataset.me?.name || null,
        };

        if (!existingId) {
            const bom = {
                id: nextSerial(
                    rows.map((row) => row.id),
                    'bom-',
                ),
                ...record,
            };

            rows.unshift(bom);
            writeLog({
                act: 'bom_create',
                entType: 'catalog_item',
                ent: bom.parentSku,
                to: nameText(bom.name),
            });
            await persist('boms', bom);

            return { created: true, bom };
        }

        const bom = rows.find((row) => row.id === existingId);

        if (!bom) {
            return { created: false, bom: null };
        }

        Object.assign(bom, record);
        writeLog({
            act: 'bom_update',
            entType: 'catalog_item',
            ent: bom.parentSku,
            to: nameText(bom.name),
        });
        await persist(`boms/${bom.id}`, bom, 'PUT');

        return { created: false, bom };
    }

    async function removeBom(id, reason = '') {
        const rows = bag('boms');
        const index = rows.findIndex((row) => row.id === id);

        if (index < 0) {
            return false;
        }

        const [bom] = rows.splice(index, 1);

        writeLog({
            act: 'bom_delete',
            entType: 'catalog_item',
            ent: bom.parentSku,
            from: nameText(bom.name),
            to: reason,
        });
        await persist(`boms/${id}`, { reason }, 'DELETE');

        return true;
    }

    /**
     * Attach a file's record to an entity. Against the fixture the file itself
     * goes nowhere — name, type, size, who and when are what is kept.
     */
    async function addAttachment({
        entity,
        ref,
        name,
        type,
        sizeKb,
        note = null,
    }) {
        const rows = bag('attachments');
        const file = {
            id: nextSerial(
                rows.map((row) => row.id),
                'att-',
            ),
            entity,
            ref,
            name,
            type,
            sizeKb,
            by: dataset.me?.name || null,
            when: moment(),
            note,
        };

        rows.unshift(file);
        writeLog({
            act: 'attachment_add',
            entType: 'system',
            ent: `${entity}:${ref}`,
            to: name,
        });
        await persist('attachments', file);

        return file;
    }

    async function removeAttachment(id, reason = '') {
        const rows = bag('attachments');
        const index = rows.findIndex((row) => row.id === id);

        if (index < 0) {
            return false;
        }

        const [file] = rows.splice(index, 1);

        writeLog({
            act: 'attachment_remove',
            entType: 'system',
            ent: `${file.entity}:${file.ref}`,
            from: file.name,
            to: reason,
        });
        await persist(`attachments/${id}`, { reason }, 'DELETE');

        return true;
    }

    return {
        items,
        prepTypes,
        boms,
        attachments,
        siteCategories,
        rows,

        itemBySku,
        rowBySku,
        prepTypeById,
        bomById,
        categoryById,
        supplierByCode,
        bomsOfParent,
        bomsUsing,
        attachmentsOf,
        mandatoryOf,
        missingOf,
        waivedOf,
        nextCode,
        codeTaken,
        skuTaken,
        committedOf,
        onOrderOf,

        saveItem,
        savePrepType,
        saveBom,
        removeBom,
        addAttachment,
        removeAttachment,
    };
});
