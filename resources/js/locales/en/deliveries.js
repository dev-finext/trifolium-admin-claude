// The shipping station — one page, from "in production" to "shipped" /
// "collected" (SHIPPING_STATION_SPEC.md, DEMO_SHIPPING_STATION_PROMPT.md).
//
// Enum labels are not repeated here: an order status reads from `status.*`,
// an exception from `exception.*`, a courier company from `courier.*`.
export default {
    title: 'Shipping station',

    tab: {
        in_production: 'In preparation',
        packing: 'Packing',
        awaiting_courier: 'Awaiting courier',
        pickup: 'Awaiting self-pickup',
        shipped: 'Shipped',
        couriers: 'Courier company management',
    },

    scanLabel: 'Scan',
    scanPlaceholder: 'Scan an order or container barcode',
    search: 'Order · recipient · city · tracking number',

    // The demo's own list standard: filters, filter chips and saved views —
    // the same engine every other screen uses (useListFilters.js).
    filter: {
        noun: 'orders',
        field: {
            gate: 'Gate state',
            problem: 'Exception',
            shipTo: 'Recipient',
            city: 'City',
            courier: 'Courier',
        },
        gate: {
            ok: 'Clear',
            blocked: 'Blocked',
        },
    },

    filterGroup: {
        state: 'State',
        where: 'Destination',
    },

    scan: {
        orderNotFound: 'Order not found',
        orderNotInStation: 'The order is {status} — not at the station',
        orderOpened: '✓ Order opened',
        containerScanned: '✓ Item {k} of {n} · {name}, {city}',
        alreadyScanned: 'This item was already scanned',
        belongsToAnotherOrder:
            'This item belongs to order {id}, not the open order',
        badBarcode: 'Not a valid barcode',
        allScannedShipping:
            '✓ Every item is marked — ready to pass to a courier company',
        allScannedPickup:
            '✓ Every item is marked — ready to pass to self-pickup',
    },

    col: {
        actions: 'Actions',
        order: 'Order',
        sentToLab: 'Sent to the lab',
        practitioner: 'Practitioner',
        recipient: 'Recipient',
        city: 'City',
        ship: 'Delivery / pickup',
        marked: 'Marked',
        courier: 'Company',
        packages: 'Packages',
        trackingNumber: 'Tracking number',
        linkedAt: 'Passed on',
        payer: 'Practitioner / payer',
        phone: 'Phone',
        readySince: 'Ready since',
        handedAt: 'Handed / collected on',
        by: 'By',
    },

    ship: {
        delivery: 'Delivery',
        pickup: 'Self pickup',
    },

    action: {
        linkCourier: 'Pass to a courier company',
        markReady: 'Pass to self-pickup',
        markCollected: 'Collected',
        printPickupList: 'Print pickup list',
    },

    manual: 'Manual',

    empty: {
        title: 'No orders in this tab',
    },

    toast: {
        readyForPickup: 'The order is awaiting self-pickup',
    },

    // StationOrderCard.vue — the order card at the station
    card: {
        recipientTitle: 'Recipient and address',
        recipient: 'Recipient',
        phone: 'Phone',
        address: 'Address',
        city: 'City',
        street: 'Street',
        houseNum: 'House number',
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
        shipTo: {
            me: 'To me (the practitioner)',
            patient: 'To the patient',
            pickup: 'Self pickup',
            none: 'Unknown',
        },

        packingTitle: 'Marking items · {k} of {n}',
        allMarked: 'Every item is marked',
        shelfQty: 'one unit | {n} units',
        col: {
            item: 'Item',
            containers: 'Containers',
        },
        num: '{k} of {n}',
        manualTick: 'Mark manually',

        shipmentTitle: 'Shipment',
        courier: 'Courier company',
        packages: 'Number of packages',
        editPackages: 'Change package count',
        linkBlocked: {
            wrongStatus:
                'The order is no longer in preparation — it cannot pass to a courier company.',
            notFullyPacked: 'Not every item is marked — mark them all first.',
            isPickupOrder:
                'This is a self-pickup order — it does not go to a courier company.',
            gateBlocked:
                'The order is blocked: the address is incomplete, or the recipient is unknown.',
            noCourier: 'No active courier company.',
        },
        link: 'Pass to a courier company',
        linking: 'Passing to the courier company…',
        linked: 'Passed to the courier company',
        linkedBody: 'Tracking number {tracking} · {courier}',
        linkFailed: 'Passing to the courier company failed',
        tracking: 'Tracking number',
        trackingNumber: 'Tracking number',
        manual: 'Manual',
        retry: 'Retry',
        manualTracking: 'Enter tracking number by hand',
        trackingRequired: 'Enter a tracking number',

        contentTitle: "The order's content",

        historyTitle: 'History',
        visibleToCustomer: 'Customer sees this',

        // Tapuz has no cancel call yet — the agent really does call them
        // (spec §3.3, §7.4), and this can't proceed without that checked.
        phoneConfirm: 'I cancelled this with the courier company by phone',

        stepBack: 'Step back',
        stepBackDestroyLabel:
            'If the courier company already issued a label, destroy it — a new one is issued on the next pass.',
        cancelOrder: 'Cancel order',
        markReady: 'Pass to self-pickup',
        markCollected: 'Collected',
        collectedByName: 'Collected by (optional)',
        openInOrders: 'Open in the orders screen',
    },

    event: {
        container_scanned_manual: 'A container was marked manually',
        shipment_linked: 'Passed to the courier company, tracking {tracking}',
        shipment_link_failed:
            'Passing to the courier company failed: {message}',
        shipment_manual: 'A tracking number was entered by hand',
        shipment_cancelled: 'The shipment was cancelled',
        pickup_list_printed: 'The order joined a pickup list',
        handed_to_courier: 'Handed to the courier',
        ready_for_pickup: 'Passed to self-pickup',
        collected: 'Collected',
        address_updated: 'The address was updated',
        delivery_auth_signed: 'The power of attorney was signed',
        status_reverted: 'Stepped back one stage',
        cancelled_by_station: 'The order was cancelled at the station',
        packages_count_changed: 'The package count was changed',
    },

    history: {
        statusChange: 'Status changed from {from} to {to}',
    },

    // CourierSettingsTab.vue
    courierTab: {
        title: 'Courier company management',
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

    // CollectModal.vue
    collect: {
        title: 'Mark as collected',
        byLabel: 'Collected by (optional)',
        byHint: "For whoever collects on the patient's behalf — not required by default",
        confirm: 'Mark as collected',
    },
};
