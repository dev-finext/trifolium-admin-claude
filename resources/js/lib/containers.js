// How many physical containers one order line has, and the barcode each one
// carries — read by the order labels ("העבר למעבדה") and by the shipping
// station's own scan, from this one place, so the two can never disagree
// (SHIPPING_STATION_SPEC.md §4).
//
// A compounded formula's containers are its split-packaging count — `packages`
// on the item, the same figure the sticker print run already uses. A shelf
// line's containers are simply how many units were ordered.

/** How many containers this order line was packed into. */
export function containerCount(item) {
    if (item.kind === 'shelf') {
        return Math.max(1, Number(item.qty) || 1);
    }

    return Math.max(1, Number(item.packages) || 1);
}

/** The order's own barcode — the lab sheet and the order barcode scan. */
export function orderBarcode(orderId) {
    return orderId;
}

/** One container's barcode — printed on the order labels, scanned at packing. */
export function containerBarcode(orderId, lineNo, containerNo) {
    return `${orderId}-${lineNo}-${containerNo}`;
}

/**
 * Every container of every live line on the order, in print/line order.
 * `lineNo` is the line's 1-based position on the order, matching what the
 * order labels print.
 */
export function orderContainers(order) {
    return (order.items || [])
        .filter((item) => !item.cancelled)
        .map((item, index) => {
            const lineNo = index + 1;
            const count = containerCount(item);

            return {
                item,
                lineNo,
                count,
                barcodes: Array.from({ length: count }, (_, i) =>
                    containerBarcode(order.id, lineNo, i + 1),
                ),
            };
        });
}

/** Total containers across the whole order — the packing checklist's N. */
export function totalContainers(order) {
    return orderContainers(order).reduce((sum, row) => sum + row.count, 0);
}
