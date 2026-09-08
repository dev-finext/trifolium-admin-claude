// Supplier contacts and supplier cards. English mirror of he/vendors.js.
export default {
    title: 'Third-party system contacts',
    sub: '{contacts} external systems · who to call when an outside system goes down',

    tab: {
        contacts: 'External-system contacts',
        suppliers: 'Supplier cards',
    },

    kind: {
        raw_materials: 'Raw materials',
        bases_alcohol: 'Bases & alcohol',
        packaging: 'Packaging & labels',
        logistics: 'Shipping & logistics',
        services: 'Services & systems',
    },

    terms: {
        immediate: 'Immediate payment',
        net30: 'Net 30',
        net60: 'Net 60',
        net90: 'Net 90',
    },

    payMethod: {
        transfer: 'Bank transfer',
        cheque: 'Cheque',
    },

    bizType: {
        ltd: 'Limited company',
        sole_trader: 'Sole trader',
    },

    status: {
        active: 'Active supplier',
        suspended: 'Suspended for purchasing',
    },

    contacts: {
        add: 'New contact',
        countLabel: 'contacts',

        filter: {
            search: 'System · contact · role · phone · notes',
            searchLabel: 'Search contacts',
            system: 'System',
            systemAll: 'System — all',
            role: 'Contact role',
            roleAll: 'Role — all',
            notes: 'Internal notes',
            notesAll: 'Notes — all',
            notesHas: 'With internal notes',
            notesNone: 'Without internal notes',
        },

        table: {
            system: 'System',
            contact: 'Contact',
            role: 'Contact’s role',
            phone: 'Contact phone',
            notes: 'Internal notes',
        },

        profile: {
            title: 'Contact card',
            details: 'Contact details',
            notes: 'Internal notes',
            noNotes: 'No internal notes recorded',
        },

        editor: {
            newTitle: 'New third-party system contact',
            editTitle: 'Edit contact',
            system: 'System name',
            systemPh: 'e.g. invoice provider · WhatsApp provider · courier',
            contact: 'Contact',
            contactPh: 'First and last name',
            role: 'Contact’s role',
            rolePh: 'e.g. account manager · technical support',
            phone: 'Contact’s phone',
            phonePh: '03-0000000 / 052-0000000',
            notes: 'Internal notes',
            notesPh:
                'Answering hours, contract or SLA number, who to call first, open issues',
            note: 'Internal notes are shown to admins only and are never sent to any external system.',
            add: 'Add contact',
            save: 'Save changes',
            invalid:
                'A system name, a contact name and a phone number are required.',
        },

        remove: {
            title: 'Delete contact',
            body: '{contact} ({system}) will be removed from the contact list.',
            confirm: 'Delete contact',
            effect1: 'The contact details and internal notes are deleted',
            effect2: 'The deletion is written to the system log',
        },

        toast: {
            added: 'The contact was added',
            updated: 'The contact was updated',
            removed: 'The contact was deleted',
        },

        empty: {
            title: 'No contact found',
            subFiltered: 'Clear the filter or the search',
            subEmpty: 'Add the first contact',
        },
    },

    suppliers: {
        countLabel: 'suppliers',

        gate: {
            title: 'The supplier cards are locked',
            why: 'A card exposes bank details, trade terms and purchase prices — data that is not part of the team’s daily work.',
            scope: 'An unlock lasts until you leave this screen or lock it again.',
            unlock: 'Unlock the cards',
            confirmTitle: 'Unlock the supplier cards',
            confirmBody:
                'The code is verified on the server against the signed-in user. No code is stored in or sent to the browser.',
            confirm: 'Unlock',
            effect1: 'The cards open for viewing until you leave the screen',
            effect2: 'Bank details and trade terms become visible',
            effect3: 'The unlock is written to the system log',
            openNote: 'The cards are open for viewing.',
            lockAgain: 'Lock again',
            locked: 'The supplier cards are locked again',
            failed: 'The unlock was refused',
        },

        filter: {
            search: 'Supplier · code · company no. · contact · phone',
            searchLabel: 'Search suppliers',
            kind: 'Supplier kind',
            kindAll: 'Kind — all',
            status: 'Status',
            statusAll: 'Status — all',
            docs: 'Certificates',
            noun: 'suppliers',
            field: {
                kind: 'Category',
                status: 'Status',
                docs: 'Certificates',
                pay: 'Payment method',
            },
            docsState: {
                ok: 'Certificates in order',
                bad: 'Missing or expired',
            },
            docsAll: 'Certificates — all',
            docsBad: 'Missing or expired',
            docsOk: 'All valid',
        },

        table: {
            code: 'Code',
            name: 'Supplier',
            kind: 'Kind',
            contact: 'Contact',
            terms: 'Payment terms',
            lead: 'Lead time',
            docs: 'Certificates',
            spend: '12-month spend',
            open: 'Open balance',
            status: 'Status',
        },

        docsOk: 'Valid',
        docsBad: 'Missing / expired',
        docsMissingChip: 'Certificates missing',
        leadDays: 'One day | {n} days',
        supplierCode: 'Supplier code',
        since: 'Supplier since',
        suspendedNote: 'Suspended since {date} — {reason}',

        action: {
            orderMail: 'Email an order',
            edit: 'Edit card',
            suspend: 'Suspend supplier',
            reactivate: 'Reactivate',
        },

        tab: {
            profile: 'Profile & contact',
            terms: 'Trade & payment terms',
            docs: 'Certificates & documents',
            receipts: 'Goods receipts',
            // V2
            items: 'Linked items',
            purchasing: 'Purchase orders',
            activities: 'Activities',
        },

        filterGroup: {
            who: 'The supplier',
            papers: 'Documents & payment',
        },


        // V2
        items: {
            note: 'The items this supplier is the standing supplier for, or that were last bought from it — from the item card, not a separate list.',
            preferred: 'Standing supplier',
            last: 'Last supplier',
            empty: 'No items linked to this supplier',
            col: {
                code: 'Code',
                name: 'Item',
                family: 'Family',
                price: 'Last purchase price',
                role: 'Link',
            },
        },
        purchasing: {
            open: 'Open orders',
            closed: 'Completed or cancelled orders',
            empty: 'No purchase orders for this supplier',
            openIt: 'Open',
            col: {
                id: 'Order',
                state: 'State',
                lines: 'Lines',
                value: 'Value',
                eta: 'ETA',
                created: 'Created',
            },
        },

        card: {
            supplier: 'Supplier card',
            contact: 'Contact',
            address: 'Address',
            notes: 'Notes',
            trade: 'Trade terms',
            bank: 'Bank account for transfers',
            money: 'Financial position',
            docs: 'Valid certificates',
            scans: 'Scans on the card',
            receipts: 'Goods receipts from this supplier',
        },

        field: {
            code: 'Supplier code',
            name: 'Supplier name',
            bizType: 'Legal form',
            biz: 'Company / sole-trader number',
            kind: 'Supplier kind',
            skus: 'Items supplied',
            since: 'Supplier since',
            contactName: 'Name',
            contactRole: 'Role',
            mobile: 'Mobile',
            office: 'Office phone',
            email: 'Email',
            orderMail: 'Email for orders',
            site: 'Website',
            addr: 'Address',
            city: 'City',
            terms: 'Payment terms',
            pay: 'Payment method',
            cur: 'Currency',
            tradeDisc: 'Trade discount',
            minOrder: 'Minimum order',
            lead: 'Average lead time',
            coa: 'COA with every batch',
            bank: 'Bank',
            branch: 'Branch',
            acct: 'Account number',
            payee: 'Payee name on the account',
            spend12: '12-month spend',
            open: 'Open balance',
            lastReceipt: 'Last goods receipt',
        },

        value: {
            skus: 'One item in the catalog | {n} items in the catalog',
            serviceNoStock: 'A service — no stock items',
            coaRequired: 'Required and received',
            coaNotRequired: 'Not required',
            noMinOrder: 'None',
            noOpenDebt: 'No open balance',
            bankProtected: 'Protected by re-confirmation',
            bankWarning:
                'Changing bank details requires a re-confirmation and a phone check with the contact. A fraudulent account change is the most common attack there is.',
            paymentBlocked:
                'The bookkeeping certificate is not valid — no payment can be released until it is renewed. Purchasing itself is not blocked.',
        },

        docs: {
            bookkeeping_cert: 'Bookkeeping certificate',
            withholding_tax: 'Withholding-tax certificate',
            coa: 'COA with every batch',
            validUntil: 'Valid until {date}',
            notPresented: 'No certificate presented',
            ok: 'Valid',
            expired: 'Expired',
            missing: 'Missing',
            exemptUntil: 'Exempt from withholding · valid until {date}',
            withholdRate: 'Withhold {rate}% at source — no valid certificate',
            coaEveryReceipt:
                'Received with the delivery note on every goods receipt',
            noScans: 'No scans on the card',
            files: 'Contract, NDA, scanned certificates',
            noScansSub:
                'Scanned documents are kept on the supplier card. No file is stored right now.',
        },

        receipts: {
            id: 'Receipt',
            doc: 'Delivery note',
            when: 'Date',
            lines: 'Lines',
            by: 'Received by',
            note: 'Note',
            lineCount: 'One item | {n} items',
            empty: 'No goods receipts from this supplier',
            emptyNone: 'Nothing has been received from this supplier yet',
            emptyService: 'A service supplier — nothing enters stock',
        },

        editor: {
            title: 'Edit supplier card',
            note: 'The supplier code appears on every goods receipt and every batch, so it cannot be changed. Changing bank details requires a phone check with the contact before saving.',
            changed: 'One field changed | {n} fields changed',
            unchanged: 'Nothing changed',
            missing: 'Required fields are missing: {fields}',
            save: 'Save changes',
            confirmTitle: 'Save changes to a supplier card',
            confirmBody: 'The changes to {name}’s card will be saved.',
            confirm: 'Save',
            effect1:
                'The fields that changed, who changed them and when are written to the system log',
            effect2:
                'A change to bank details affects every future payment to this supplier',
        },

        suspend: {
            title: 'Suspend a supplier for purchasing',
            body: '{name} will be marked suspended and will not appear in the supplier list when goods are received.',
            confirm: 'Suspend supplier',
            effect1: 'The supplier cannot be picked on a new goods receipt',
            effect2: 'Existing batches from the supplier are unchanged',
            effect3:
                'The reason, who acted and the date are written to the log',
        },

        reactivate: {
            title: 'Reactivate a supplier',
            body: '{name} will be available again when goods are received.',
            confirm: 'Reactivate',
            effect1: 'The supplier appears in the supplier list again',
            effect2:
                'Missing certificates do not block purchasing — they block payment',
            effect3: 'The action is written to the log',
        },

        toast: {
            updated: 'The supplier card was updated',
            suspended: 'The supplier was suspended',
            reactivated: 'The supplier is active again',
            unlocked: 'The supplier cards are unlocked',
            mail: 'An email draft was opened',
            mailBody: '{address} · purchase order',
        },

        empty: {
            title: 'No supplier found',
            sub: 'Clear the search or the filter',
        },
    },

    toast: {
        failed: 'The change was not saved',
        failedBody: 'The request was rejected. Try again.',
    },
};
