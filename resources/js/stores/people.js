// Practitioners, pending registrations and patients.
//
// The screen reads its rows from here and never from @/demo. Every mutation is
// optimistic — it moves the loaded record and calls persist(), which is a no-op
// against the fixture — and every state change that the closed log taxonomy has
// an action id for writes one row into the system log.
//
// Three things are deliberately not editable anywhere: the customer number (it
// is the identity the practitioner signs in with, and it sits on every
// historical order and tax document), the points balance (it is derived from the
// points ledger, so it moves only together with a row in it), and deletion — a
// practitioner card is never deleted.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { CREDIT, NUMBERING, SETTINGS } from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { isLocalized, LOCALES, loc } from '@/lib/localized';
import { useDatasetStore } from '@/stores/dataset';

/**
 * Patient numbers are their own series, separate from the practitioners': a
 * patient never signs in, so his number is a reference, not a credential.
 */
const PATIENT_CODE_PREFIX = 'C-';

// Ids only have to be unique within a session, and a counter is deterministic
// where a timestamp would make the same action produce a different row twice.
let sequence = 0;

const nextId = (prefix) => `${prefix}${++sequence}`;

/** The moment a mutation happens, in the shape every record's dates use. */
function moment() {
    return {
        daysAgo: 0,
        iso: isoDaysAgo(0),
        time: hm(now()),
        stamp: stamp(0),
    };
}

/** Join two name halves, keeping a `{ he, en }` pair a pair. */
function joinName(first, last) {
    return Object.fromEntries(
        LOCALES.map((code) => [
            code,
            `${loc(first, code) || ''} ${loc(last, code) || ''}`.trim(),
        ]),
    );
}

/** The numeric tail of a code, for continuing a series. */
function codeNumber(code) {
    const digits = String(code).replace(/\D/g, '');

    return digits ? Number(digits) : 0;
}

/**
 * A city as a stable key: the Hebrew source text, so a filtered link opens on
 * the same city whichever language the reader is in.
 */
function cityOf(one) {
    const city = one.city;

    return isLocalized(city) ? city.he : String(city ?? '');
}

/** Whether a practitioner's debt has passed the warning window. */
export function practitionerLate(one) {
    return one.debt > 0 && one.debtDays > CREDIT.warnDays;
}

/** What the practitioner directory may be narrowed by. */
export const PRACTITIONER_FILTER_FIELDS = [
    {
        key: 'th',
        group: 'who',
        kind: 'set',
        prefix: 'therapy',
        values: (one) => [one.therapy],
    },
    {
        key: 'status',
        group: 'who',
        kind: 'set',
        prefix: 'users.filter.statusState',
        values: (one) => [one.status],
    },
    { key: 'city', group: 'who', kind: 'set', values: (one) => [cityOf(one)] },
    {
        key: 'cr',
        group: 'money',
        kind: 'set',
        prefix: 'users.filter.creditState',
        values: (one) => [one.credit ? 'credit' : 'now'],
    },
    {
        key: 'dbt',
        group: 'money',
        kind: 'set',
        prefix: 'users.filter.debtState',
        values: (one) => [
            one.debt > 0 ? (practitionerLate(one) ? 'late' : 'open') : 'none',
        ],
    },
    { key: 'debt', group: 'money', kind: 'num', value: (one) => one.debt || 0 },
    {
        key: 'points',
        group: 'money',
        kind: 'num',
        value: (one) => one.points || 0,
    },
    {
        key: 'site',
        group: 'site',
        kind: 'set',
        prefix: 'users.filter.siteState',
        values: (one) => [one.clinic ? 'yes' : 'no'],
    },
    {
        key: 'pay',
        group: 'site',
        kind: 'set',
        prefix: 'paymentMethod',
        values: (one) => (one.payMethod ? [one.payMethod] : []),
    },
];

export const PRACTITIONER_FILTER_GROUPS = ['who', 'money', 'site'];

/** What the customer list may be narrowed by. */
export const PATIENT_FILTER_FIELDS = [
    { key: 'cpr', group: 'who', kind: 'set', values: (one) => [one.prCode] },
    { key: 'ccity', group: 'who', kind: 'set', values: (one) => [cityOf(one)] },
    {
        key: 'cst',
        group: 'who',
        kind: 'set',
        prefix: 'users.filter.statusState',
        values: (one) => [one.status],
    },
    {
        key: 'csafe',
        group: 'safety',
        kind: 'set',
        prefix: 'users.filter.safetyState',
        values: (one) => {
            const out = [];

            if (one.meds?.length) {
                out.push('meds');
            }

            if (one.preg || one.bf) {
                out.push('preg');
            }

            if (one.allerg) {
                out.push('allerg');
            }

            if (!one.consent) {
                out.push('consent');
            }

            return out;
        },
    },
    {
        key: 'csite',
        group: 'site',
        kind: 'set',
        prefix: 'users.filter.siteAccountState',
        values: (one) => [one.siteAccount ? 'yes' : 'no'],
    },
    {
        key: 'cspent',
        group: 'site',
        kind: 'num',
        value: (one) => one.spent || 0,
    },
];

export const PATIENT_FILTER_GROUPS = ['who', 'safety', 'site'];

export const usePeopleStore = defineStore('people', () => {
    const dataset = useDatasetStore();

    const practitioners = computed(() => dataset.practitioners);
    const pendingUsers = computed(() => dataset.pendingUsers);
    /** The practitioners' own patients — one practitioner per patient, always. */
    const patients = computed(() => dataset.customers);
    const ledgers = computed(() =>
        Array.isArray(dataset.data.pointsLedger)
            ? dataset.data.pointsLedger
            : [],
    );

    const practitionerByCode = (code) =>
        practitioners.value.find((one) => one.code === code) || null;

    const patientByCode = (code) =>
        patients.value.find((one) => one.code === code) || null;

    const patientsOf = (code) =>
        patients.value.filter((one) => one.prCode === code);

    const ordersOf = (code) =>
        dataset.orders.filter((order) => order.practitioner.code === code);

    const ordersForPatient = (tz) =>
        dataset.orders.filter((order) => order.patient.tz === tz);

    /** Orders whose safety declaration was signed — the signature archive. */
    const signedOrdersOf = (code) =>
        ordersOf(code).filter((order) => order.poaSigned);

    const ledgerFor = (code) => {
        const entry = ledgers.value.find((one) => one.code === code);

        return entry ? entry.rows : [];
    };

    /**
     * The next customer number. The historical series was kept as it was and
     * nothing is renumbered, so a new card simply continues it.
     */
    const nextCustomerNumber = computed(() => {
        const highest = practitioners.value.reduce(
            (top, one) => Math.max(top, codeNumber(one.code)),
            0,
        );

        return String(Math.max(NUMBERING.next, highest + 1));
    });

    const nextPatientCode = computed(() => {
        const highest = patients.value.reduce(
            (top, one) => Math.max(top, codeNumber(one.code)),
            0,
        );

        return `${PATIENT_CODE_PREFIX}${highest + 1}`;
    });

    // ---- writes ------------------------------------------------------------

    /** Send a change on. Against the fixture this resolves without a request. */
    function save(path, payload, method = 'POST') {
        persist(path, payload, method).catch(() => {
            // The optimistic update stands. A real deployment surfaces the
            // failure to the agent; nothing here invents a success message.
        });
    }

    /**
     * One immutable log row. `act` must be an id from LOG_ACTION_IDS — the
     * taxonomy is closed, which is what keeps the log filterable in both
     * languages.
     */
    function writeLog({ act, entType, ent, from = null, to = null }) {
        if (!Array.isArray(dataset.data.log)) {
            return;
        }

        dataset.data.log.unshift({
            id: nextId('lg-'),
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            act,
            entType,
            ent,
            valueType: 'plain',
            from,
            to,
            src: 'manual',
            // The console cannot know the address it is reached from; the
            // server fills this in on a real deployment.
            ip: null,
        });
    }

    /** Mark the uploaded diploma valid or invalid while reviewing it. */
    function setRegistrationDoc(user, ok) {
        user.docOk = ok;
    }

    /**
     * Approve a registration: a practitioner card is created with the next
     * customer number, which is also the number he signs in with.
     *
     * @returns {string} the new customer number
     */
    function approveRegistration(user) {
        const code = nextCustomerNumber.value;
        const card = {
            code,
            first: user.first,
            last: user.last,
            name: joinName(user.first, user.last),
            therapy: user.therapy,
            spec: user.spec,
            clinic: user.listed ? user.clinicName || null : null,
            city: user.city,
            phone: user.phone,
            email: user.email,
            status: 'active',
            points: 0,
            disc: SETTINGS.defaultDiscountPct,
            orders: 0,
            credit: false,
            creditSince: null,
            creditBy: null,
            creditRevoked: null,
            legacyNum: false,
            since: isoDaysAgo(0),
            tz: user.tz,
            debt: 0,
            debtDays: 0,
            documentation: [],
            docsExtra: [],
        };

        dataset.data.practitioners = [card, ...practitioners.value];
        dropRegistration(user);
        writeLog({
            act: 'registration_approve',
            entType: 'practitioner',
            ent: code,
            to: code,
        });
        save('practitioners', { registration: user.id, code });

        return code;
    }

    /** Reject a registration. No card is created; the reason is logged. */
    function rejectRegistration(user, reason) {
        dropRegistration(user);
        writeLog({
            act: 'registration_reject',
            entType: 'practitioner',
            ent: user.id,
            to: reason,
        });
        save('registrations/reject', { registration: user.id, reason });
    }

    function dropRegistration(user) {
        dataset.data.pendingUsers = pendingUsers.value.filter(
            (one) => one.id !== user.id,
        );
    }

    /**
     * Save an edited practitioner card. `changes` is `[{ key, from, to }]`, and
     * each one becomes its own log row so the before/after values stay readable
     * in either language.
     */
    function savePractitioner(practitioner, changes) {
        changes.forEach((change) => {
            practitioner[change.key] = change.to;
            writeLog({
                act:
                    change.key === 'disc'
                        ? 'discount_update'
                        : 'practitioner_update',
                entType: 'practitioner',
                ent: practitioner.code,
                from: change.from === '' ? null : String(change.from),
                to: String(change.to),
            });
        });

        if (changes.length) {
            practitioner.name = joinName(practitioner.first, practitioner.last);
            save(
                `practitioners/${practitioner.code}`,
                Object.fromEntries(
                    changes.map((change) => [change.key, change.to]),
                ),
                'PATCH',
            );
        }
    }

    /**
     * Approve or revoke credit terms (הקפה). There is no debt ceiling: an
     * approved practitioner's orders reach the lab unpaid and the balance
     * accrues, the system warns, and collection is one link for the whole
     * balance.
     */
    function setCreditTerms(practitioner, approved, reason = null) {
        if (approved) {
            practitioner.credit = true;
            practitioner.creditSince = isoDaysAgo(0);
            practitioner.creditBy = dataset.me?.name || null;
            practitioner.creditRevoked = null;
        } else {
            practitioner.credit = false;
            practitioner.creditRevoked = isoDaysAgo(0);
        }

        writeLog({
            act: approved ? 'credit_terms_approve' : 'credit_terms_revoke',
            entType: 'practitioner',
            ent: practitioner.code,
            to: reason,
        });
        save(
            `practitioners/${practitioner.code}/credit-terms`,
            { approved, reason },
            'PATCH',
        );
    }

    /**
     * Credit or charge the points wallet by hand. The ledger is the single
     * source of truth: the balance moves only together with a row in it, which
     * is what keeps the two reconciling.
     */
    function creditPoints(practitioner, amount, reason) {
        const balance = Math.max(0, practitioner.points + amount);
        let entry = ledgers.value.find((one) => one.code === practitioner.code);

        if (!entry) {
            entry = { code: practitioner.code, rows: [] };
            dataset.data.pointsLedger = [...ledgers.value, entry];
        }

        entry.rows.unshift({
            id: nextId('pl-'),
            kind: amount > 0 ? 'earn' : 'spend',
            amt: amount,
            bal: balance,
            order: null,
            manual: true,
            actor: dataset.me?.name || null,
            reason,
            when: moment(),
        });

        writeLog({
            act: 'points_credit_manual',
            entType: 'practitioner',
            ent: practitioner.code,
            from: String(practitioner.points),
            to: String(balance),
        });

        practitioner.points = balance;
        save(`practitioners/${practitioner.code}/points`, { amount, reason });

        return balance;
    }

    /** Send the practitioner a password-reset link. */
    function resetPractitionerPassword(practitioner) {
        writeLog({
            act: 'password_reset',
            entType: 'practitioner',
            ent: practitioner.code,
        });
        save(`practitioners/${practitioner.code}/password-reset`, {});
    }

    /**
     * Add one manual documentation record to a practitioner card. Records are
     * never edited and never deleted — a correction is a new record that points
     * at the one it corrects.
     */
    function addPractitionerNote(practitioner, text, fixOf = null) {
        const record = {
            id: nextId('mn-'),
            kind: 'manual',
            when: moment(),
            actor: dataset.me?.name || null,
            text,
            fixOf: fixOf || null,
        };

        practitioner.docsExtra = [...(practitioner.docsExtra || []), record];
        save(`practitioners/${practitioner.code}/documentation`, {
            text,
            fixOf,
        });

        return record;
    }

    /** Save an edited patient card. */
    function savePatient(patient, changes) {
        changes.forEach((change) => {
            patient[change.key] = change.to;
        });

        if (changes.length) {
            patient.name = joinName(patient.first, patient.last);
            save(
                `patients/${patient.code}`,
                Object.fromEntries(
                    changes.map((change) => [change.key, change.to]),
                ),
                'PATCH',
            );
        }
    }

    /**
     * Move a patient to another practitioner. Historical orders stay with the
     * practitioner who placed them; only orders from now on belong to the new
     * one. The move is recorded on the card with its reason — it is never an
     * edit of a field.
     */
    function transferPatient(patient, target, reason) {
        const from = { code: patient.prCode, name: patient.prName };

        patient.transfers = [
            {
                fromCode: from.code,
                fromName: from.name,
                toCode: target.code,
                toName: target.name,
                when: isoDaysAgo(0),
                by: dataset.me?.name || null,
                why: reason,
            },
            ...(patient.transfers || []),
        ];
        patient.prCode = target.code;
        patient.prName = target.name;
        patient.prTherapy = target.therapy;
        patient.linkedOn = isoDaysAgo(0);
        patient.linkedBy = dataset.me?.name || null;

        save(`patients/${patient.code}/practitioner`, {
            to: target.code,
            reason,
        });
    }

    /**
     * Create a patient card by hand. A patient with no practitioner cannot
     * exist, so the caller must supply the practitioner to link him to.
     */
    function createPatient(values, target) {
        const code = nextPatientCode.value;
        const birthYear = Number(String(values.birth || '').slice(0, 4));
        const patient = {
            code,
            first: values.first,
            last: values.last,
            name: joinName(values.first, values.last),
            tz: values.tz,
            phone: values.phone,
            email: values.email || null,
            birth: values.birth || null,
            age: birthYear ? now().getFullYear() - birthYear : null,
            sex: values.sex || null,
            preg: false,
            bf: false,
            meds: [],
            allerg: values.allerg || null,
            city: values.city,
            street: values.street || null,
            num: values.num || null,
            apt: values.apt || null,
            floor: values.floor || null,
            entry: values.entry || null,
            prCode: target.code,
            prName: target.name,
            prTherapy: target.therapy,
            linkedOn: isoDaysAgo(0),
            linkedBy: dataset.me?.name || null,
            transfers: [],
            consent: false,
            mkt: false,
            source: 'admin_entry',
            orders: 0,
            lastOrder: null,
            spent: 0,
            status: 'active',
            created: isoDaysAgo(0),
        };

        dataset.data.customers = [patient, ...patients.value];
        save('patients', { code, practitioner: target.code });

        return patient;
    }

    /**
     * The duplicate check on a card being created (V2). The same national ID,
     * phone or email — or the same full name — already on a practitioner, a
     * patient or a waiting registration. Returns one row per match with the
     * reasons it matched on.
     */
    function findDuplicates(probe, exclude = '') {
        const digits = (value) => String(value || '').replace(/\D/g, '');
        const tz = digits(probe.tz);
        const phone = digits(probe.phone);
        const email = String(probe.email || '')
            .trim()
            .toLowerCase();
        const name =
            [loc(probe.first, 'he'), loc(probe.last, 'he')]
                .filter(Boolean)
                .join(' ')
                .trim() || String(probe.name || '').trim();

        const check = (row, kind, code, rowName) => {
            if (exclude && code === exclude) {
                return null;
            }

            const reasons = [];

            if (tz && digits(row.tz) === tz) {
                reasons.push('tz');
            }

            if (phone && phone.length >= 9 && digits(row.phone) === phone) {
                reasons.push('phone');
            }

            if (
                email &&
                String(row.email || '')
                    .trim()
                    .toLowerCase() === email
            ) {
                reasons.push('email');
            }

            if (name && loc(rowName, 'he') === name) {
                reasons.push('name');
            }

            return reasons.length
                ? { kind, code, name: rowName, reasons }
                : null;
        };

        return [
            ...practitioners.value.map((row) =>
                check(row, 'practitioner', row.code, row.name),
            ),
            ...patients.value.map((row) =>
                check(row, 'patient', row.code, row.name),
            ),
            ...pendingUsers.value.map((row) =>
                check(row, 'pending', row.id, {
                    he: `${loc(row.first, 'he')} ${loc(row.last, 'he')}`,
                    en: `${loc(row.first, 'en')} ${loc(row.last, 'en')}`,
                }),
            ),
        ].filter(Boolean);
    }

    return {
        practitioners,
        pendingUsers,
        patients,
        ledgers,
        findDuplicates,

        practitionerByCode,
        patientByCode,
        patientsOf,
        ordersOf,
        ordersForPatient,
        signedOrdersOf,
        ledgerFor,
        nextCustomerNumber,
        nextPatientCode,

        setRegistrationDoc,
        approveRegistration,
        rejectRegistration,
        savePractitioner,
        setCreditTerms,
        creditPoints,
        resetPractitionerPassword,
        addPractitionerNote,
        savePatient,
        transferPatient,
        createPatient,
    };
});
