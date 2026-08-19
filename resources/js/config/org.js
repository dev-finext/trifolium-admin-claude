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
    phone: '03-6001200',
    email: 'lab@trifolium.example',
};

/** Courier companies the pharmacy ships with. */
export const COURIERS = [
    { code: 'T', id: 'tapuz', phone: '03-6001200', hasApi: false },
    { code: 'F', id: 'fedex_il', phone: '03-9771010', hasApi: false },
    { code: 'Y', id: 'yaad', phone: '03-5551188', hasApi: false },
    { code: 'D', id: 'israel_post', phone: '1-700-500-171', hasApi: false },
];

export const COURIER = Object.fromEntries(
    COURIERS.map((courier) => [courier.id, courier]),
);

export const COURIER_IDS = COURIERS.map((courier) => courier.id);

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
