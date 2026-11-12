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
    DEFAULT_WAREHOUSE,
    familyOfCode,
    ITEM_FAMILY,
    ITEM_FLAG_IDS,
    ITEM_UOMS,
    liveOnly,
    openOrderQty,
    sentOrderQtyBySku,
    sentOrders,
    TERMINAL_STATUS_IDS,
} from '@/config';
import { persist } from '@/data/source';
import {
    addDays,
    daysSince,
    fmtISO,
    hm,
    isoDaysAgo,
    now,
    stamp,
} from '@/lib/dates';
import { isLocalized } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';

/** Item stages during which the herbs on an order are committed, not yet consumed. */
/** The statuses at which an order has claimed its materials but not shipped. */
const COMMITTED_STATUS_IDS = [
    'pending_payment',
    'paid',
    'credit',
    'in_production',
    'packing',
];

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

/**
 * Bytes of files picked this session, by attachment id. Object URLs are not
 * state — they are never persisted, never reactive, and are revoked when the
 * record is removed. A record's own `url` is a sample under public/ instead.
 */
const sessionUrls = new Map();

/** Where a new item's stock row is counted, by family — SAP's warehouse split. */
const STOCK_KIND_OF_FAMILY = {
    herb: 'raw',
    herb_1to1: 'raw',
    extract: 'raw',
    hydrosol: 'raw',
    essential_oil: 'raw',
    tincture: 'raw',
    infused_oil: 'raw',
    homeopathy: 'raw',
    consumable: 'base',
    glass: 'pack',
    plastic: 'pack',
    cap: 'pack',
    box: 'pack',
    jar: 'pack',
    packaging: 'pack',
};

/** A number typed into a form, or null when the field was left empty. */
function numberOrNull(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);

    return Number.isNaN(parsed) ? null : parsed;
}

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
        // SAP's own item group (`OITM.ItmsGrpCod`) — the option text is the
        // group's name, so the screen labels it.
        key: 'grp',
        group: 'what',
        kind: 'set',
        values: (row) => (row.group === null ? [] : [String(row.group)]),
    },
    {
        key: 'state',
        group: 'what',
        kind: 'set',
        prefix: 'items.filter.stateState',
        values: (row) => [
            row.frozen ? 'frozen' : row.active ? 'active' : 'inactive',
        ],
    },
    {
        key: 'flag',
        group: 'what',
        kind: 'set',
        prefix: 'items.flag',
        values: (row) => ITEM_FLAG_IDS.filter((id) => row.flags?.[id]),
    },
    {
        key: 'batch',
        group: 'what',
        kind: 'set',
        prefix: 'items.filter.batchState',
        values: (row) => [row.flags?.batch ? 'yes' : 'no'],
    },
    {
        key: 'tree',
        group: 'what',
        kind: 'set',
        prefix: 'items.filter.treeState',
        values: (row) => [row.treeType === 'P' ? 'P' : 'N'],
    },
    {
        // The ladder an item is priced by: a group it names, the one its code
        // prefix resolves to, or none — a fixed price. Labelled by the screen.
        //
        // Named `ladder` and not `pg`: every paging screen keeps its page
        // number in `pg`, so a filter by that name wrote its value into the
        // pager. The facet counted correctly and the list never moved.
        key: 'ladder',
        group: 'supply',
        kind: 'set',
        values: (row) => [
            row.priceGroup === 'none' ? 'fixed' : row.priceGroup || 'inherit',
        ],
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
    const boms = computed(() => liveOnly(list('boms')));
    const attachments = computed(() => liveOnly(list('attachments')));
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

    /**
     * Where a file's bytes are: an object URL for a file picked this session,
     * else the record's sample path under the deploy base — the demo is served
     * from a sub-path on GitHub Pages, so `demo/files/x.pdf` alone is not enough.
     * Empty when the demo has nothing behind the record.
     */
    const attachmentUrl = (file) => {
        if (sessionUrls.has(file.id)) {
            return sessionUrls.get(file.id);
        }

        if (!file.url) {
            return '';
        }

        const base = import.meta.env.BASE_URL || '/';

        return `${base}${base.endsWith('/') ? '' : '/'}${file.url}`;
    };

    /** The preparation type a SAP property number names, if it names one. */
    const prepTypeBySap = (code) =>
        prepTypes.value.find((type) => type.sap === code)?.id || null;

    /**
     * What is on order for an item, live.
     *
     * SAP's `OnOrder` was frozen the day the catalogue was read, so on its own
     * it never moves: an order sent here added nothing and one received here
     * took nothing off. The fixture keeps on each item only the part of it no
     * sheet here carries (`onOrderBase`), and the purchase orders the console
     * has sent and not yet received are added back from the sheets themselves.
     * An item made here since has no SAP figure at all — its own `onOrder`, zero.
     */
    const sentOnOrder = computed(() => sentOrderQtyBySku(list('buyingLists')));

    const onOrderBaseOf = (item) =>
        Number(item?.onOrderBase ?? item?.onOrder) || 0;

    const liveOnOrder = (item) =>
        Math.round(
            (onOrderBaseOf(item) + (sentOnOrder.value.get(item.sku) || 0)) *
                1000,
        ) / 1000;

    /**
     * An item's row in every warehouse, reconciled.
     *
     * `OITW` is what SAP held the day the catalogue was read; the console has
     * moved stock since — receipts, production, counts — and its own figure is
     * the live one. The warehouse the console counts the item in takes the live
     * quantity; the rest keep what SAP had, which for six of the seven is zero.
     */
    const warehouseRowsOf = (sku) => {
        const item = itemBySku(sku);
        const live = inventory.itemBySku(sku);
        // What is on order moved too: the orders the console sent since are
        // added and the ones it received are gone. The difference lands on the
        // warehouse the item is counted in, which is the one SAP ordered into.
        const orderedInto = live?.wh || DEFAULT_WAREHOUSE;
        const onOrderMoved = item
            ? liveOnOrder(item) - (Number(item.onOrder) || 0)
            : 0;

        return (item?.warehouses || []).map((row) => {
            if (row.warehouse !== orderedInto) {
                return row;
            }

            const onOrder = Math.max(
                0,
                (Number(row.onOrder) || 0) + onOrderMoved,
            );

            return live
                ? {
                      ...row,
                      onHand: live.onHand,
                      committed: live.alloc,
                      onOrder,
                      min: live.min ?? row.min,
                  }
                : { ...row, onOrder };
        });
    };

    /** SAP's item groups (`OITB`), and one group's name. */
    const itemGroups = computed(() => list('itemGroups'));

    const groupName = (code) =>
        itemGroups.value.find((group) => group.code === code)?.name || null;

    /** The price lists an item is priced in (`OPLN`). */
    const priceLists = computed(() => list('priceLists'));

    /** SAP's warehouses (`OWHS`). */
    const sapWarehouses = computed(() => list('sapWarehouses'));

    /** The sixty-four item properties (`OITG`); only the named ones are shown. */
    const itemProperties = computed(() => list('itemProperties'));

    /** The next free code in a family — `10` + `0026`. */
    const nextCode = (group) => {
        const code = numberOrNull(group);
        const numbered = items.value
            .filter((item) => item.group === code)
            .map((item) => String(item.code))
            .filter((one) => /^\d+$/.test(one));

        if (!numbered.length) {
            return '';
        }

        // A category is numbered in one series — every tincture is 20xxxx —
        // so the next number is simply the highest in that series plus one.
        const highest = numbered.reduce(
            (top, one) => Math.max(top, Number(one)),
            0,
        );

        return String(highest + 1).padStart(6, '0');
    };

    /**
     * The next free code in a numbering block — `21` + the highest `21xxxx`
     * plus one, or `210001` for a block nothing is numbered in yet.
     *
     * For the categories SAP holds with nothing in them: there is no series to
     * continue, so whoever opens the first item there says which block it is
     * numbered in. Counted over every item, archived ones too — a code that was
     * once used stays used.
     */
    const nextCodeInFamily = (familyId) => {
        const prefix = ITEM_FAMILY[familyId]?.prefix;

        if (!prefix) {
            return '';
        }

        const highest = items.value
            .map((item) => String(item.code))
            .filter((one) => /^\d{6}$/.test(one) && one.startsWith(prefix))
            .reduce((top, one) => Math.max(top, Number(one)), 0);

        return highest
            ? String(highest + 1).padStart(6, '0')
            : `${prefix}${'1'.padStart(6 - prefix.length, '0')}`;
    };

    const codeTaken = (code, exceptSku) =>
        items.value.some(
            (item) => item.sku !== exceptSku && item.code === code,
        );

    const skuTaken = (sku) => items.value.some((item) => item.sku === sku);

    // ---- the joined rows -----------------------------------------------------

    /**
     * Every item with its stock figures and its resolved suppliers — the row
     * the screen lists and the card opens.
     */
    /**
     * Every item card, archived ones included, joined to its stock, product and
     * counts. A screen picks which it shows; nothing here decides for it.
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
                // Live, not SAP's frozen figure — the stock analysis, planning
                // and the production forms all read it off this row.
                onOrder: liveOnOrder(item),
                preferred: supplierByCode(item.suppliers?.preferred),
                groupName: groupName(item.group),
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
                        // The formula's own unit — sixty grams of a herb held
                        // in kilos is "60 גרם", not "60 ק״ג". SAP writes grams
                        // as `gr` on the real lines.
                        unit: herb.unit === 'gr' ? 'g' : herb.unit || 'g',
                    });
                }
            });
        });

        return out;
    };

    /**
     * What is on its way for an item, line by line: every open line of a
     * purchase order the console sent, and — as one line of its own — what SAP
     * still had on order that no sheet here carries. The lines add up to the
     * row's `onOrder` in stock units, so the card's tile and the list under it
     * are the same figure.
     *
     * The buyer's sheets are read straight off the dataset: the buying store
     * imports this one, and importing it back would be a cycle.
     */
    const onOrderOf = (sku) => {
        const lines = sentOrders(list('buyingLists')).flatMap((order) =>
            (order.lines || [])
                .filter((line) => line.sku === sku && openOrderQty(line) > 0)
                .map((line) => ({
                    id: `${order.id}-${line.sku}`,
                    po: order.number,
                    supplier: order.supplier,
                    // in the unit the order was written in…
                    qty: (Number(line.qty) || 0) - (Number(line.received) || 0),
                    uom: line.purchaseUom || line.uom,
                    // …and in the stock unit, which is what the tile adds up
                    qtyStock: openOrderQty(line),
                    // sent, plus the lead time the line was ordered with
                    eta:
                        order.sent?.iso && Number(line.leadDays) > 0
                            ? addDays(order.sent.iso, line.leadDays)
                            : null,
                })),
        );
        const item = itemBySku(sku);
        const rest = onOrderBaseOf(item);

        if (item && rest > 0) {
            lines.push({
                id: `${sku}-sap`,
                po: null,
                sap: true,
                supplier: null,
                qty: rest,
                uom: item.uom?.stock || 'unit',
                qtyStock: rest,
                eta: null,
            });
        }

        return lines;
    };

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
            field: null,
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    /**
     * The fields a change log follows value by value, and the label each is
     * written under. The lists and the pictures are in `TRACKED_WHOLE` below.
     */
    const TRACKED = [
        ['names.he', 'items.editor.nameHe'],
        ['names.en', 'items.editor.nameForeign'],
        ['group', 'items.editor.group'],
        ['itemType', 'items.card.itemType'],
        ['treeType', 'items.card.treeType'],
        ['active', 'items.card.active'],
        ['flags.inventory', 'items.flag.inventory'],
        ['flags.sales', 'items.flag.sales'],
        ['flags.purchase', 'items.flag.purchase'],
        ['flags.batch', 'items.flag.batch'],
        ['barcode', 'items.card.barcode'],
        ['suppliers.preferred', 'items.card.preferredSupplier'],
        ['suppliers.catalogNum', 'items.card.catalogNum'],
        ['suppliers.itemName', 'items.card.supplierItemName'],
        ['uom.stock', 'items.card.stockUom'],
        ['uom.purchase', 'items.card.purchaseUom'],
        ['uom.sales', 'items.card.salesUom'],
        ['levels.min', 'items.card.minLevel'],
        ['levels.max', 'items.card.maxLevel'],
        ['price.sale', 'items.card.salePrice'],
        ['price.lastPurchase', 'items.card.lastPurchase'],
        ['priceGroup', 'items.card.ladder'],
        ['site.sync', 'items.card.siteSync'],
        ['remarks', 'items.card.remarks'],
        ['internalNotes', 'items.card.internalNotes'],
        ['issueMethod', 'items.card.issueMethod'],
        ['frozen', 'items.editor.frozen'],
        ['frozenComment', 'items.editor.frozenComment'],
        ['additionalId', 'items.card.additionalId'],
        ['uom.group', 'items.card.uomGroup'],
        ['uom.count', 'items.card.countUom'],
        ['uom.numInBuy', 'items.card.numInBuy'],
        ['uom.numInSale', 'items.card.numInSale'],
        ['uom.packUom', 'items.card.packUom'],
        ['uom.packQty', 'items.card.packQty'],
        ['uom.salesPackUom', 'items.card.salesPackUom'],
        ['uom.salesPackQty', 'items.card.salesPack'],
        ['levels.reorder', 'items.card.reorderQty'],
        ['levels.minOrder', 'items.card.minOrderQty'],
        ['levels.leadTime', 'items.card.leadTime'],
        ['planning.method', 'items.card.planningMethod'],
        ['planning.procurement', 'items.card.procurementMethod'],
        ['planning.componentWarehouse', 'items.card.componentWarehouse'],
        ['price.evalPrice', 'items.card.evalPrice'],
        ['accounting.valuation', 'items.card.valuation'],
        ['accounting.byWarehouse', 'items.card.byWarehouse'],
        ['accounting.noDiscount', 'items.card.noDiscount'],
        ['accounting.inCostRoll', 'items.card.inCostRoll'],
        ['lab.alcoholPct', 'items.card.alcoholPct'],
        ['lab.oilPct', 'items.card.oilPct'],
        ['lab.extractionRatio', 'items.card.extractionRatio'],
        ['lab.packageSize', 'items.card.packageSize'],
        ['site.name', 'items.card.siteName'],
        ['site.quantity', 'items.editor.siteQty'],
        ['site.uom', 'items.editor.siteUom'],
        ['site.comments', 'items.card.siteComments'],
        ['saleText', 'items.card.saleText'],
    ];

    /**
     * What the log records only as "changed": a picture is a data URL and a
     * list of properties or categories is not one value, so the row names the
     * area and the card itself shows what it now holds.
     */
    const TRACKED_WHOLE = [
        ['pictureInternal', 'items.editor.pictureInternal'],
        ['picture', 'items.editor.pictureExternal'],
        ['safety', 'items.card.safety'],
        ['site.categories', 'items.card.categories'],
        ['properties', 'items.card.properties'],
        ['prices', 'items.card.prices'],
        ['warehouses', 'items.card.warehouse'],
        ['supplierCatalog', 'items.card.supplierCatalog'],
    ];

    const at = (record, path) =>
        path.split('.').reduce((node, key) => node?.[key], record);

    /** A value as the log stores it — a flag reads as on or off, not as true. */
    const logValue = (value) => {
        if (value === true || value === false) {
            return value ? 'V' : '—';
        }

        if (value === null || value === undefined || value === '') {
            return null;
        }

        return isLocalized(value) ? value.he : String(value);
    };

    /** One row per field the save moved, so the card can show its own history. */
    function logChanges(before, after, sku) {
        TRACKED.forEach(([path, label]) => {
            const was = logValue(at(before, path));
            const now = logValue(at(after, path));

            if (was === now) {
                return;
            }

            writeLog({
                act: 'item_update',
                entType: 'catalog_item',
                ent: sku,
                field: label,
                from: was,
                to: now,
            });
        });

        TRACKED_WHOLE.forEach(([path, label]) => {
            const was = JSON.stringify(at(before, path) ?? null);
            const now = JSON.stringify(at(after, path) ?? null);

            if (was === now) {
                return;
            }

            writeLog({
                act: 'item_update',
                entType: 'catalog_item',
                ent: sku,
                field: label,
            });
        });
    }

    const nameText = (value) =>
        isLocalized(value) ? value.he : String(value ?? '');

    /**
     * The stock row an inventory item is counted on, made when it has none.
     *
     * With zero quantity — stock still only ever arrives through a goods
     * receipt. A new item gets one on creation; an item that becomes an
     * inventory item later gets one on that save, or the card would offer a
     * count the inventory store has no row to post.
     */
    function ensureStockRow(item) {
        if (!item.flags?.inventory || inventory.itemBySku(item.sku)) {
            return null;
        }

        const min = item.levels.min ?? 0;
        const row = {
            sku: item.sku,
            herbId: item.family === 'herb' ? item.sku : null,
            kind: STOCK_KIND_OF_FAMILY[item.family] || 'shelf',
            name: {
                he: item.names.he,
                en: item.names.en || item.names.he,
            },
            lat: null,
            cn: null,
            system: 'west',
            wh: DEFAULT_WAREHOUSE,
            unit: item.uom.stock,
            size: null,
            sizeUnit: null,
            price: item.price.sale,
            onHand: 0,
            alloc: 0,
            min,
            avail: 0,
            low: min > 0,
            created: isoDaysAgo(0),
        };

        bag('stock').unshift(row);

        return row;
    }

    /**
     * Create or update an item. A new item that also needs a stock row gets one
     * with zero quantity — stock still only ever arrives through a goods receipt.
     */
    async function saveItem(form, existingSku = null) {
        const rows = bag('items');
        const isNew = !existingSku;
        const flags = { ...form.flags };

        // SAP's own rule: a batch-managed item is an inventory item.
        if (flags.batch) {
            flags.inventory = true;
        }

        const record = {
            // SAP's item number is the one key, and the console joins on it.
            sku: existingSku || form.code,
            code: form.code || existingSku,
            names: {
                he: form.names?.he || '',
                en: form.names?.en || null,
                site: form.names?.site || null,
            },
            group: numberOrNull(form.group),
            // The numbering block is read off the item number — it is what
            // numbers the batches and sets a default shelf life, and nobody
            // picks it: the category picks the number, the number the block.
            family: familyOfCode(form.code || existingSku) || null,
            itemType: form.itemType || 'I',
            treeType: form.treeType || 'N',
            issueMethod: form.issueMethod || 'M',
            active: form.active ?? true,
            frozen: form.frozen ?? false,
            frozenFrom: form.frozenFrom || null,
            frozenTo: form.frozenTo || null,
            activeComment: form.activeComment || null,
            frozenComment: form.frozenComment || null,
            flags,
            barcode: form.barcode || null,
            additionalId: form.additionalId || null,
            picture: form.picture || null,
            // The console's own, for the team: the editor offers it, so the
            // save keeps it.
            pictureInternal: form.pictureInternal || null,
            suppliers: {
                preferred: form.suppliers?.preferred || null,
                // SAP holds one supplier on the item (`OITM.CardCode`). The
                // purchase lines, planning and the lead time read it as
                // `sapCode`, the card's picker writes `preferred` — so the one
                // follows the other, or changing the supplier on the card
                // changed nothing anywhere else.
                sapCode: form.suppliers?.preferred || null,
                catalogNum: form.suppliers?.catalogNum || null,
                // What the vendor calls it — SAP keeps the field in `OSCN` and
                // has never filled it.
                itemName: form.suppliers?.itemName || null,
            },
            // 12.11.2026 — each supplier's own catalogue number for the item
            // (SAP's `OSCN`), one row per supplier, read by the supplier's
            // Excel file for the order's supplier (config/items.js
            // `supplierCatalogNum`). A row needs both halves, and a supplier
            // appears once: the editor offers each supplier to one row only,
            // and a second row for the same one would be a number nobody reads.
            supplierCatalog: (form.supplierCatalog || [])
                .map((row) => ({
                    supplierCode: String(row?.supplierCode || '').trim(),
                    catalogNum: String(row?.catalogNum || '').trim(),
                }))
                .filter((row) => row.supplierCode && row.catalogNum)
                .filter(
                    (row, index, all) =>
                        all.findIndex(
                            (other) => other.supplierCode === row.supplierCode,
                        ) === index,
                ),
            uom: {
                stock: form.uom?.stock || 'unit',
                purchase: form.uom?.purchase || 'unit',
                sales: form.uom?.sales || 'unit',
                count: form.uom?.count || form.uom?.stock || 'unit',
                price: form.uom?.price || form.uom?.sales || 'unit',
                // SAP stores the pricing unit as a `UomEntry`; the card edits
                // the unit itself, so the number follows from it.
                priceUnit:
                    ITEM_UOMS.find(
                        (uom) =>
                            uom.id === (form.uom?.price || form.uom?.sales),
                    )?.sap ?? -1,
                numInBuy: numberOrNull(form.uom?.numInBuy) ?? 1,
                numInSale: numberOrNull(form.uom?.numInSale) ?? 1,
                factor: numberOrNull(form.uom?.factor) ?? 1,
                group: numberOrNull(form.uom?.group) ?? -1,
                packUom: form.uom?.packUom || null,
                packQty: numberOrNull(form.uom?.packQty),
                salesPackUom: form.uom?.salesPackUom || null,
                salesPackQty: numberOrNull(form.uom?.salesPackQty),
            },
            levels: {
                min: numberOrNull(form.levels?.min),
                max: numberOrNull(form.levels?.max),
                reorder: numberOrNull(form.levels?.reorder),
                minOrder: numberOrNull(form.levels?.minOrder),
                leadTime: numberOrNull(form.levels?.leadTime),
            },
            planning: {
                method: form.planning?.method || 'N',
                procurement: form.planning?.procurement || 'B',
                productSource: form.planning?.productSource || null,
                componentWarehouse: form.planning?.componentWarehouse || 'B',
            },
            price: {
                sale: numberOrNull(form.price?.sale),
                saleUom: form.price?.saleUom || form.uom?.sales || 'unit',
                lastPurchase: numberOrNull(form.price?.lastPurchase),
                currency: form.price?.currency || 'ILS',
                lastPurchaseOn: form.price?.lastPurchaseOn || null,
                evalPrice: numberOrNull(form.price?.evalPrice),
                evalOn: form.price?.evalOn || null,
                avgPrice: numberOrNull(form.price?.avgPrice),
            },
            accounting: {
                valuation: form.accounting?.valuation || 'C',
                byWarehouse: form.accounting?.byWarehouse ?? false,
                noDiscount: form.accounting?.noDiscount ?? false,
                inCostRoll: form.accounting?.inCostRoll ?? true,
            },
            lab: {
                alcoholPct: numberOrNull(form.lab?.alcoholPct),
                oilPct: numberOrNull(form.lab?.oilPct),
                extractionRatio: form.lab?.extractionRatio || null,
                packageSize: numberOrNull(form.lab?.packageSize),
            },
            safety: { ...form.safety },
            site: {
                ...form.site,
                categories: [...(form.site?.categories || [])],
            },
            properties: [...(form.properties || [])],
            prepTypes: [...(form.prepTypes || [])],
            prices: (form.prices || []).map((row) => ({
                list: row.list,
                price: numberOrNull(row.price),
                currency: row.currency || 'ILS',
            })),
            warehouses: (form.warehouses || []).map((row) => ({
                warehouse: row.warehouse,
                onHand: numberOrNull(row.onHand) ?? 0,
                committed: numberOrNull(row.committed) ?? 0,
                onOrder: numberOrNull(row.onOrder) ?? 0,
                min: numberOrNull(row.min) ?? 0,
                max: numberOrNull(row.max) ?? 0,
            })),
            remarks: form.remarks || null,
            // The console's own: a note for the office that never prints.
            internalNotes: form.internalNotes || null,
            saleText: form.saleText || null,
            // The console's own: which quantity ladder prices it.
            priceGroup: form.priceGroup || null,
            updated: isoDaysAgo(0),
        };

        if (isNew) {
            const item = {
                ...record,
                onHand: 0,
                committed: 0,
                onOrder: 0,
                created: isoDaysAgo(0),
            };

            rows.unshift(item);

            const stockRow = ensureStockRow(item);

            writeLog({
                act: 'item_create',
                entType: 'catalog_item',
                ent: item.sku,
                to: item.names.he,
            });
            await persist('items', item);

            // After the item: the stock row is keyed by it.
            if (stockRow) {
                await persist('inventory/ingredients', stockRow);
            }

            return { created: true, item };
        }

        const item = rows.find((row) => row.sku === existingSku);

        if (!item) {
            return { created: false, item: null };
        }

        const before = JSON.parse(JSON.stringify(item));

        Object.assign(item, record);

        const stockRow = inventory.itemBySku(item.sku);
        // Ticking "inventory" on an item that never had stock opens its row.
        const newStockRow = stockRow ? null : ensureStockRow(item);

        if (stockRow) {
            stockRow.name = {
                he: item.names.he,
                en: item.names.en || item.names.he,
            };
            stockRow.unit = item.uom.stock;
            stockRow.price = item.price.sale;
            stockRow.min = item.levels.min ?? stockRow.min;
            stockRow.low = stockRow.avail < stockRow.min;
        }

        logChanges(before, item, item.sku);
        await persist(`items/${item.sku}`, item, 'PUT');

        if (newStockRow) {
            await persist('inventory/ingredients', newStockRow);
        }

        return { created: false, item };
    }

    /** A physical count: the inventory store moves the stock to what was found. */
    async function recordCount(sku, countedQty, note = '') {
        return inventory.recordCount(sku, countedQty, note);
    }

    /**
     * Why an item cannot be deleted, or null when it can: stock on hand, live
     * batches, recipes that use it or are it, open purchase-order lines.
     */
    function itemBlock(sku) {
        const stockRow = inventory.itemBySku(sku);
        const stockBlock = stockRow
            ? inventory.ingredientBlock(stockRow)
            : null;
        const inBoms = bomsUsing(sku).length + bomsOfParent(sku).length;
        const onOrder = onOrderOf(sku).length;

        if (!stockBlock && !inBoms && !onOrder) {
            return null;
        }

        return {
            onHand: stockBlock?.onHand || 0,
            batches: stockBlock?.batches || 0,
            formulas: stockBlock?.formulas || 0,
            boms: inBoms,
            onOrder,
        };
    }

    /**
     * Delete an item and its stock row together. Refused while anything still
     * depends on it — the caller shows `itemBlock()` and never gets here.
     */
    /**
     * Archive an item card.
     *
     * Not a delete: the card stops appearing in the lists and stays where it
     * is. An item code is written on batches, on purchase orders and on ten
     * years of movements, and a row that vanishes turns all of those into
     * dangling references.
     */
    async function removeItem(sku, reason = '') {
        if (itemBlock(sku)) {
            throw new Error(`Item ${sku} is still in use`);
        }

        const item = bag('items').find((row) => row.sku === sku);

        if (!item) {
            return false;
        }

        item.archived = { on: moment(), by: dataset.me?.name || null, reason };

        if (inventory.itemBySku(sku)) {
            await inventory.removeIngredient(sku, reason);
        }

        writeLog({
            act: 'item_delete',
            entType: 'catalog_item',
            ent: sku,
            from: item.names.he,
            to: reason,
        });
        await persist(`items/${sku}`, item, 'PUT');

        return true;
    }

    /** Take an item card back out of the archive. */
    async function restoreItem(sku, reason = '') {
        const item = bag('items').find((row) => row.sku === sku);

        if (!item?.archived) {
            return false;
        }

        item.archived = null;

        if (inventory.restoreIngredient) {
            await inventory.restoreIngredient(sku, reason);
        }

        writeLog({
            act: 'item_restore',
            entType: 'catalog_item',
            ent: sku,
            from: item.names.he,
            to: reason,
        });
        await persist(`items/${sku}`, item, 'PUT');

        return true;
    }

    /** Create or update a preparation type — its text, unit, shelf life, contents, recipe. */
    async function savePrepType(form, existingId = null) {
        const rows = bag('prepTypes');
        const record = {
            name: { ...form.name },
            unit: form.unit,
            expiryMonths: Number(form.expiryMonths) || 0,
            acceptsWaste: Boolean(form.acceptsWaste),
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
        const bom = bag('boms').find((row) => row.id === id);

        if (!bom) {
            return false;
        }

        // Archived, not deleted: a production order made months ago names this
        // recipe, and the run it describes really happened.
        bom.archived = { on: moment(), by: dataset.me?.name || null, reason };

        writeLog({
            act: 'bom_delete',
            entType: 'catalog_item',
            ent: bom.parentSku,
            from: nameText(bom.name),
            to: reason,
        });
        await persist(`boms/${id}`, bom, 'PUT');

        return true;
    }

    /**
     * Attach a file to an entity. The record keeps name, type, size, who and
     * when; the bytes stay in the browser as an object URL for this session —
     * against the fixture there is no storage to send them to.
     */
    async function addAttachment({
        entity,
        ref,
        file: picked,
        type,
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
            name: picked.name,
            type,
            sizeKb: Math.max(1, Math.round(picked.size / 1024)),
            by: dataset.me?.name || null,
            when: moment(),
            note,
            url: null,
        };

        sessionUrls.set(file.id, URL.createObjectURL(picked));
        rows.unshift(file);
        writeLog({
            act: 'attachment_add',
            entType: 'system',
            ent: `${entity}:${ref}`,
            // The file's own name — a bare `name` here is `window.name`.
            to: file.name,
        });
        await persist('attachments', file);

        return file;
    }

    async function removeAttachment(id, reason = '') {
        const file = bag('attachments').find((row) => row.id === id);

        if (!file) {
            return false;
        }

        file.archived = { on: moment(), by: dataset.me?.name || null, reason };

        if (sessionUrls.has(id)) {
            URL.revokeObjectURL(sessionUrls.get(id));
            sessionUrls.delete(id);
        }

        writeLog({
            act: 'attachment_remove',
            entType: 'system',
            ent: `${file.entity}:${file.ref}`,
            from: file.name,
            to: reason,
        });
        await persist(`attachments/${id}`, file, 'PUT');

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
        attachmentUrl,
        itemGroups,
        groupName,
        warehouseRowsOf,
        prepTypeBySap,
        priceLists,
        sapWarehouses,
        itemProperties,
        nextCode,
        nextCodeInFamily,
        codeTaken,
        skuTaken,
        committedOf,
        onOrderOf,

        saveItem,
        recordCount,
        itemBlock,
        removeItem,
        restoreItem,
        savePrepType,
        saveBom,
        removeBom,
        addAttachment,
        removeAttachment,
    };
});
