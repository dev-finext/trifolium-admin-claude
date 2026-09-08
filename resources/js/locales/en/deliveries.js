// Deliveries desk — English. Mirrors he/deliveries.js key for key.
export default {
    title: 'Deliveries',
    sub: '{courier} courier deliveries · {pickup} self pickups',

    view: {
        queue: 'Deliveries',
        poa: 'Powers of attorney',
        codes: 'Courier codes',
        points: 'Pickup points',
    },

    export: {
        action: 'Export',
        done: 'Export downloaded',
        body: '{n} rows · {file}',
        file: 'deliveries-{date}.csv',
    },

    range: {
        note: '{n} deliveries in range ({from} to {to}) · the handling stages count inside it',
        hint: 'Pick a date range to get a count per handling stage',
        open: 'No limit',
    },

    // The handling stages in stores/deliveries.js DELIVERY_STAGES.
    stage: {
        all: 'All',
        assign: 'Awaiting courier assignment',
        handed: 'Handed to the courier',
        transit: 'In transit',
        pickup: 'Ready for pickup',
        done: 'Delivered',
    },

    filterGroup: {
        state: 'Delivery state',
        how: 'How it leaves',
        where: 'Destination',
    },

    filter: {
        noun: 'deliveries',
        field: {
            status: 'Status',
            tracking: 'Tracking number',
            signed: 'Power of attorney',
            type: 'How it leaves',
            courier: 'Courier',
            city: 'City',
            point: 'Pickup point',
        },
        trackingState: {
            yes: 'Has a tracking number',
            no: 'No tracking number',
        },
        poaState: {
            yes: 'Signed',
            no: 'Missing',
        },
        noCourier: 'No courier assigned',
        noPoint: 'Pickup at the pharmacy',
        search: 'Search deliveries',
        searchPlaceholder: 'Order · recipient · city · tracking number',
        stage: 'Handling stage',
        stageAll: 'Handling stage — all',
        status: 'Order status',
        statusAll: 'Status — all',
        type: 'Fulfilment',
        typeAll: 'Fulfilment — all',
        courier: 'Courier company',
        courierAll: 'Courier company — all',
        tracking: 'Tracking number',
        trackingAll: 'Tracking number — all',
        trackingYes: 'With a tracking number',
        trackingNo: 'Without a tracking number',
        city: 'Destination city',
        cityAll: 'Destination city — all',
        option: '{label} ({n})',
    },

    count: 'deliveries · out of {n} in range',

    col: {
        order: 'Order',
        recipient: 'Recipient',
        type: 'Fulfilment',
        address: 'Address',
        courier: 'Courier company',
        tracking: 'Tracking number',
        status: 'Status',
        date: 'Date',
        actions: 'Actions',
    },

    row: {
        street: '{street} {num}, {city}',
        addressDetail: 'Apt {apt} · floor {floor} · entrance {entry}',
        addressPending: 'Address to be filled in by the customer',
        noCourier: 'Not assigned',
        supplierCode: 'Supplier code {code}',
        sentOn: 'Dispatched {date}',
        notified: 'Notified {stamp}',
        none: '—',
        point: 'Pickup point: {name}',
        urgent: 'Urgent',
    },

    action: {
        assign: 'Assign a courier',
        updateTracking: 'Update tracking',
        ship: 'Mark as shipped',
        shipBlocked:
            'Cannot be marked as shipped before a signed power of attorney is on file',
        notifyPickup: 'Notify it is ready',
        open: 'Open',
    },

    empty: {
        title: 'No deliveries at this stage',
        sub: 'Pick another stage, widen the date range, or clear the filter',
    },

    assign: {
        title: 'Courier assignment · {id}',
        courier: 'Courier company',
        courierPick: 'Pick a courier company',
        courierOption: '{code} — {name}',
        courierPhone: 'Company phone: {phone}',
        sentOn: 'Dispatch date',
        save: 'Save and assign',
        addressMissing:
            'The address has not come back from the customer yet. A courier can be assigned, but there is nowhere to deliver to until it arrives.',
        poaMissing:
            'The recipient has no signed power of attorney. A courier can be assigned, but handover is blocked until it is signed — the request is sent from the powers-of-attorney tab.',
        done: {
            title: 'Courier assigned',
            body: '{courier} · tracking number {tracking}',
            bodyNoTracking:
                '{courier} · the tracking number will be entered later',
        },
    },

    tracking: {
        label: 'Tracking number',
        format: 'The supplier letter, six digits, then IL — as printed on the shipping label',
        invalid:
            'Not in the expected format: supplier letter, six digits, then IL',
        mismatch:
            'The number starts with {found}, not with {expected} — the letter of the company you picked',
        manual: 'None of the courier companies exposes an API. The tracking number is typed in off the shipping label and saved on the order alone — nothing is checked against the carrier and no status updates arrive on their own.',
    },

    ship: {
        title: 'Mark the order as shipped',
        body: 'Order {id} will be marked as shipped with {courier}.',
        confirm: 'Mark as shipped',
        effect: {
            status: 'The order status becomes "shipped" and every formula on it is marked shipped',
            date: 'The dispatch date is saved on the order',
            message:
                'A WhatsApp message goes to the customer with the courier company and the tracking number',
        },
        done: {
            title: 'Order marked as shipped',
            body: '{id} · {courier}',
        },
    },

    notify: {
        title: 'Tell the customer the order is ready for pickup',
        body: 'A message will be sent to {name} ({phone}) about order {id}.',
        confirm: 'Send the message',
        effect: {
            template: 'A WhatsApp message on the "ready for pickup" template',
            details: 'It carries the pharmacy address and the opening hours',
        },
        done: {
            title: 'Message sent',
            body: '{name} · ready for pickup',
        },
    },

    poa: {
        title: 'Power of attorney for the courier',
        note: 'Courier delivery requires a signed power of attorney from the recipient: the courier hands the parcel to whoever opens the door, or leaves it at the address, and without a signature there is nobody to attribute the handover to. Self-pickup orders need none — the recipient identifies themselves at the pharmacy.',
        kpi: {
            missing: 'Awaiting a signature',
            requested: 'Request sent',
            signed: 'Signed',
        },
        state: {
            missing: 'No power of attorney',
            requested: 'Request sent',
            signed: 'Signed',
        },
        col: {
            state: 'Power of attorney',
            city: 'Destination city',
        },
        request: 'Request over WhatsApp',
        requestAgain: 'Request again',
        requestAll: 'Request from all {n} recipients',
        requestedAt: 'Sent {stamp}',
        confirm: {
            title: 'Request a power of attorney from the recipient',
            body: 'A request will be sent to {name} ({phone}) to sign a power of attorney for the courier on order {id}.',
            label: 'Send the request',
        },
        confirmAll: {
            title: 'Request a power of attorney from every recipient',
            body: 'A request will be sent to {n} recipients who have no signed power of attorney.',
            label: 'Send every request',
        },
        effect: {
            template:
                'A WhatsApp message on the "address & power of attorney request" template',
            link: 'It carries a link to sign digitally',
            blocked:
                'The order stays blocked for handover until the signature comes back',
        },
        done: {
            title: 'Request sent',
            body: '{name} · power of attorney for the courier',
            bodyAll: '{n} power-of-attorney requests sent',
        },
        empty: {
            missing: {
                title: 'Every delivery has a power of attorney',
                sub: 'No courier order is waiting for a signature',
            },
            requested: {
                title: 'No open requests',
                sub: 'A request that was sent shows here until the signature comes back',
            },
            signed: {
                title: 'No signed powers of attorney yet',
                sub: 'A courier order with a signature shows here',
            },
        },
    },

    // V2 — pickup points and the daily dispatch alert
    alert: {
        title: '{points} pickup points go out today · {orders} orders waiting ({ready} ready)',
        none: 'No pickup points go out today',
        open: 'To the pickup points',
    },

    points: {
        note: 'A pickup point is a partner shop or a practitioner collecting for their patients: dispatch days, a regular courier and consolidation notes. The order chooses a point; the daily alert says what goes out today.',
        add: 'New pickup point',
        pickupList: 'Courier pickup list',
        today: 'Goes out today',
        inactive: 'Inactive',
        waiting: '{n} waiting · {ready} ready',
        col: {
            name: 'Pickup point',
            kind: 'Kind',
            address: 'Address',
            days: 'Dispatch days',
            courier: 'Courier',
            notes: 'Consolidation notes',
            waiting: 'Orders waiting',
        },
        editor: {
            newTitle: 'New pickup point',
            editTitle: 'Edit pickup point · {name}',
            kind: 'Kind of point',
            practitioner: 'Practitioner',
            pickPractitioner: 'Choose a practitioner…',
            nameHe: 'Name (Hebrew)',
            nameEn: 'Name (English)',
            city: 'City',
            address: 'Address',
            days: 'Dispatch days',
            courier: 'Regular courier',
            noCourier: 'No regular courier',
            notes: 'Consolidation notes',
            notesPh: 'For example: every 4 orders go out as one shipment',
            active: 'Active',
            activeOn: 'Offered on new orders',
            activeOff: 'Not offered on new orders',
            createConfirm: 'Create point',
            saveConfirm: 'Save changes',
            validate: {
                name: 'Enter a name',
                practitioner: 'Choose a practitioner',
                days: 'At least one dispatch day',
            },
        },
        toast: {
            created: 'Pickup point created',
            updated: 'Pickup point updated',
        },
    },

    pickupList: {
        title: 'Courier pickup list',
        note: 'Parcels handed to the courier and not yet dispatched — ready to pack with a courier assigned. Today this is the “orders for Tapuz” query.',
        courier: 'Courier',
        col: {
            order: 'Order',
            recipient: 'Recipient',
            address: 'Address',
            phone: 'Phone',
            tracking: 'Tracking',
            items: 'Items',
        },
        empty: 'No parcels waiting for this courier',
        print: 'Print the list',
        printed: 'The list opened for printing',
        blocked: 'The browser blocked the print window',
        header: 'Pickup list · {courier} · {date}',
        total: '{n} parcels in total',
        signPharmacy: 'Pharmacy signature',
        signCourier: 'Courier signature',
    },

    codes: {
        title: 'Courier code mapping',
        note: 'Every courier company is identified by a single letter code, printed on the shipping label and opening the tracking number. The code itself is fixed; the company name and phone behind it are set here and are used by every new order.',
        col: {
            code: 'Supplier code',
            name: 'Courier company name',
            phone: 'Phone',
            api: 'API integration',
            orders: 'Deliveries on the desk',
        },
        nameLabel: 'Company name for code {code}',
        phoneLabel: 'Company phone for code {code}',
        api: {
            on: 'Connected',
            off: 'In preparation',
        },
        save: 'Save the mapping',
        historical: 'Historical — not offered for new assignments',
        tp: 'TP number + shipment number',
        confirm: {
            title: 'Save the courier company mapping',
            body: 'The courier company names and their phone numbers will be updated.',
            label: 'Save the mapping',
        },
        effect: {
            newOrders: 'Every new order uses the updated names',
            oldOrders:
                'Existing orders keep showing the supplier code saved on them',
            log: 'The change is written to the system log',
        },
        done: {
            title: 'Mapping saved',
            body: 'The codes will be used by every new order',
        },
    },
};
