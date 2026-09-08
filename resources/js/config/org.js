// The pharmacy's own details, as they appear on documents, pickup instructions
// and outgoing messages. Bilingual because a message template renders in the
// recipient's language.
import { L } from '@/lib/localized';

export const ORG = {
    name: L('בית המרקחת Trifolium', 'Trifolium Pharmacy'),
    address: L(
        'יגאל אלון 94, קומה 3, תל אביב',
        '94 Yigal Alon St, floor 3, Tel Aviv',
    ),
    hours: L('א׳–ה׳ 09:00–17:00', 'Sun–Thu 09:00–17:00'),
    phone: '03-0001200',
    email: 'lab@trifolium.example',
};

/**
 * Courier companies the pharmacy ships with — the ones its shipments actually
 * went out with (SAP's U_SendTo): Tapuz, Special Delivery, Focus, Yarden,
 * Deliver, and Sosna as history. The first version listed companies the pharmacy
 * never used; the replacements carry `v2`. A historical courier keeps its code so
 * old orders still read, but is never offered for a new assignment; Sosna's
 * tracking is a TP number plus a shipment number, hence `tp`.
 */
export const COURIERS = [
    { code: 'T', id: 'tapuz', phone: '03-0001200', hasApi: false },
    { code: 'A', id: 'special_delivery', phone: '', hasApi: false, v2: true },
    { code: 'F', id: 'focus', phone: '', hasApi: false, v2: true },
    { code: 'Y', id: 'yarden', phone: '', hasApi: false, v2: true },
    { code: 'D', id: 'deliver', phone: '', hasApi: false, v2: true },
    {
        code: 'S',
        id: 'sosna',
        phone: '',
        hasApi: false,
        v2: true,
        historical: true,
        tp: true,
    },
];

export const COURIER = Object.fromEntries(
    COURIERS.map((courier) => [courier.id, courier]),
);

export const COURIER_IDS = COURIERS.map((courier) => courier.id);

/** `ORDR.U_SendTo` holds the letter; every screen here keys couriers by id. */
export const COURIER_BY_CODE = Object.fromEntries(
    COURIERS.map((courier) => [courier.code, courier.id]),
);

/** The couriers a new shipment may be assigned to. */
export const ACTIVE_COURIERS = COURIERS.filter(
    (courier) => !courier.historical,
);

export const ACTIVE_COURIER_IDS = ACTIVE_COURIERS.map((courier) => courier.id);

/** A pickup point is a partner shop or a practitioner collecting for patients. */
export const PICKUP_POINT_KIND_IDS = ['shop', 'practitioner'];

/** Weekdays, Sunday first — `Date#getDay()` order. Labels at `weekday.<id>`. */
export const WEEKDAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * The four hands an order passes through in the lab. Marked by hand in phase A;
 * filled by the station scan in phase B. Labels at `orders.labRole.<id>`.
 */
export const LAB_ROLE_IDS = ['picker', 'checker', 'pharmacist', 'packer'];

/**
 * Therapy disciplines a practitioner registers under. Labels are in the locale
 * catalog at `therapy.<id>`.
 */
export const THERAPY_IDS = [
    'naturopathy',
    'herbalism',
    'chinese_medicine',
    'homeopathy',
    'clinical_nutrition',
    'reflexology',
    'aromatherapy',
    'bach_flowers',
];

/** How an order leaves the pharmacy. */
export const FULFILMENT_IDS = ['courier', 'pickup'];

/** Who pays for an order. */
export const PAYER_IDS = ['practitioner', 'patient'];
