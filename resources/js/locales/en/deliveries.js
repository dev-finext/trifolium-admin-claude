// The shipping station — one page, from "in production" to "shipped" /
// "collected" (SHIPPING_STATION_SPEC.md, DEMO_SHIPPING_STATION_PROMPT.md).
//
// Enum labels are not repeated here: an order status reads from `status.*`,
// an exception from `exception.*`, a courier company from `courier.*`.
export default {
    title: 'Shipping station',

    tab: {
        in_production: 'In production',
        packing: 'Packing',
        awaiting_courier: 'Awaiting courier',
        pickup: 'Self pickup',
        exceptions: 'Exceptions',
        shipped: 'Shipped',
        couriers: 'Courier companies',
    },

    kpi: {
        inProduction: 'In production',
        packing: 'Packing',
        awaitingCourier: 'Awaiting courier',
        readyForPickup: 'Ready for pickup',
        exceptions: 'Exceptions',
        shippedToday: 'Shipped today',
        collectedToday: 'Collected today',
    },

    scanLabel: 'Scan',
    scanPlaceholder: 'Scan an order or container barcode',
    search: 'Order · recipient · city · tracking number',

    scan: {
        orderNotFound: 'Order not found',
        orderNotInStation: 'The order is {status} — not at the station',
        orderOpened: '✓ Order opened',
        containerScanned: '✓ Item {k} of {n} · {name}, {city}',
        alreadyScanned: 'This item was already scanned',
        belongsToAnotherOrder:
            'This item belongs to order {id}, not the open order',
        badBarcode: 'Not a valid barcode',
        allScannedShipping: '✓ Everything is scanned — ready to link a courier',
        allScannedPickup:
            '✓ Everything is scanned — ready to mark ready for pickup',
    },

    col: {
        order: 'Order',
        sentToLab: 'Sent to the lab',
        practitioner: 'Practitioner',
        recipient: 'Recipient',
        city: 'City',
        ship: 'Fulfilment',
        containers: 'Containers',
        gate: 'Gate',
        scanned: 'Scanned',
        courier: 'Company',
        packages: 'Packages',
        trackingNumber: 'Tracking number',
        linkedAt: 'Linked on',
        status: 'Status',
        problem: 'Problem',
        since: 'Since',
        payer: 'Practitioner / payer',
        phone: 'Phone',
        readySince: 'Ready since',
        handedAt: 'Handed / collected on',
        by: 'By',
    },

    gate: {
        ok: '✓',
        noAddress: 'No address',
        noPoa: 'No POA',
    },

    ship: {
        courier: 'Courier',
        pickup: 'Self pickup',
    },

    action: {
        linkCourier: 'Link to courier',
        retry: 'Retry',
        manualTracking: 'Enter tracking number by hand',
        sendPoaRequest: 'Send request to patient',
        editAddress: 'Edit address',
        open: 'Open',
        markReady: 'Ready for pickup',
        markCollected: 'Collected',
        reprintLabel: 'Reprint shipping labels',
        printPickupList: 'Print pickup list',
    },

    manual: 'Manual',

    empty: {
        title: 'No orders in this tab',
    },

    exceptions: {
        empty: 'No exceptions right now',
    },

    toast: {
        readyForPickup: 'Marked as ready for pickup',
        poaRequested: 'Power-of-attorney request sent to the patient',
        linked: 'Linked to courier',
        linkFailed: 'The link failed',
    },

    export: {
        none: 'There is no table to export on this tab',
        file: '{tab}-{date}.xlsx',
    },

    // StationOrderCard.vue — the order card at the station
    card: {
        urgent: 'Urgent',
        recipientTitle: 'Recipient and address',
        recipient: 'Recipient',
        phone: 'Phone',
        address: 'Address',
        city: 'City',
        street: 'Street and number',
        apt: 'Apartment',
        floor: 'Floor',
        entry: 'Entrance',
        notes: 'Delivery notes',
        editAddress: 'Edit address',
        addressSaved: 'The address was saved',
        addressMissing: 'The address is incomplete',
        poa: 'Power of attorney',
        poaSigned: 'Signed',
        poaMissing: 'Missing',
        poaRequested: 'Request sent',
        poaRequestedAt: 'Sent on {stamp}',
        requestPoa: 'Send request to patient',
        shipTo: {
            me: 'To me (the practitioner)',
            patient: 'To the patient',
            pickup: 'Self pickup',
        },

        packingTitle: 'Packing checklist',
        col: {
            item: 'Item',
            containers: 'Containers',
        },
        num: '{k} of {n}',
        tick: 'Tick',
        manualTick: 'Manual tick',
        manualTickBody:
            'The container will be marked as scanned by hand, with no barcode.',

        shipmentTitle: 'Shipment',
        courier: 'Courier company',
        packages: 'Number of packages',
        link: 'Link to courier',
        linking: 'Linking to courier…',
        linked: 'Linked to courier',
        linkedBody: 'Tracking number {tracking} · {courier}',
        linkFailed: 'The link failed',
        tracking: 'Tracking number',
        trackingNumber: 'Tracking number',
        linkedAt: 'Linked on {stamp} by {by}',
        manual: 'Manual',
        retry: 'Retry',
        manualTracking: 'Enter tracking number by hand',
        reprintLabel: 'Reprint shipping labels',

        contentTitle: "The order's content",

        historyTitle: 'History',
        visibleToCustomer: 'Customer sees this',

        stepBack: 'Step back',
        stepBackDestroyLabel:
            'If a shipping label was already printed, destroy it — a new one prints on the next link.',
        cancelOrder: 'Cancel order',
        markReady: 'Ready for pickup',
        markCollected: 'Collected',
        collectedByName: 'Collected by (optional)',
        openInOrders: 'Open in the orders screen',
    },

    event: {
        packing_started: 'Packing started',
        container_scanned_manual: 'A container was ticked by hand',
        shipment_linked: 'Linked to courier, tracking {tracking}',
        shipment_link_failed: 'The courier link failed: {message}',
        shipment_manual: 'A tracking number was entered by hand',
        shipment_cancelled: 'The shipment was cancelled',
        label_printed: 'The shipping label was printed',
        pickup_list_printed: 'The order joined a pickup list',
        handed_to_courier: 'Handed to the courier',
        ready_for_pickup: 'Marked as ready for pickup',
        collected: 'Collected',
        address_updated: 'The address was updated',
        delivery_auth_requested: 'A power-of-attorney request was sent',
        delivery_auth_signed: 'The power of attorney was signed',
        status_reverted: 'Stepped back one stage',
        cancelled_by_station: 'The order was cancelled at the station',
    },

    history: {
        statusChange: 'Status changed from {from} to {to}',
    },

    // CourierSettingsTab.vue
    courierTab: {
        title: 'Courier companies',
        col: {
            name: 'Company',
            connection: 'Connection',
            active: 'Active',
            default: 'Default',
            phone: 'Phone',
            contact: 'Contact',
            lastPickup: 'Last pickup time',
            notes: 'Notes',
            lastResult: 'Last success / error',
        },
        connected: 'Connected',
        notConnected: 'No connection',
        noConnection: 'A company with no connection cannot be made active',
        hasWaiting:
            "Can't deactivate — {n} orders are waiting on this courier | Can't deactivate — one order is waiting on this courier",
        lastSuccess: 'Last success: {stamp}',
    },

    // PickupListModal.vue
    pickupList: {
        title: 'Pickup list',
        titleFor: 'Pickup list · {courier}',
        col: {
            order: 'Order',
            recipient: 'Recipient',
            city: 'City',
            packages: 'Packages',
            tracking: 'Tracking number',
        },
        totals: '{orders} orders · {packages} packages',
        driverName: "Driver's name",
        signature: 'Signature',
        time: 'Time',
        untickHint: 'Every row starts ticked — untick what stayed behind',
        print: 'Print the list',
        handOver: 'Handed to courier',
        handedTitle: 'Handed to courier',
        handedBody: 'One order was handed over | {n} orders were handed over',
    },

    // ManualTrackingModal.vue
    manualTracking: {
        title: 'Enter tracking number by hand',
        courier: 'Courier company',
        tracking: 'Tracking number',
        save: 'Save',
    },

    // CollectModal.vue
    collect: {
        title: 'Mark as collected',
        byLabel: 'Collected by (optional)',
        byHint: "For whoever collects on the patient's behalf — not required by default",
        confirm: 'Mark as collected',
    },
};
