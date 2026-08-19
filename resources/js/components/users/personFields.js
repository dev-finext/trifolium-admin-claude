// The editable fields of the two person cards, as one declarative list per
// audience, so the edit modal and the new-patient form render the same field
// the same way.
//
// `localized: true` marks a `{ he, en }` record value: the form edits the text
// in the reader's language and keeps the other language's text untouched.
// `digits` keeps free text out of a number-shaped field without changing its
// stored type; `numeric` is for the one field that is really a number (the
// discount percent).
//
// Deliberately absent from both lists: the customer number (it is the identity
// the practitioner signs in with), the points balance (derived from the points
// ledger), the debt (managed on the Finance screen), and the patient's linked
// practitioner (moving a patient is a documented transfer, not a field edit).
import { SETTINGS, THERAPY_IDS } from '@/config';

/**
 * @param {(key: string, params?: object) => string} t
 * @returns {Array<object>} field descriptors for FieldInput / PersonEditModal
 */
export function practitionerFields(t) {
    return [
        {
            k: 'first',
            label: t('users.field.first'),
            req: true,
            localized: true,
        },
        {
            k: 'last',
            label: t('users.field.last'),
            req: true,
            localized: true,
        },
        { k: 'tz', label: t('users.field.tz'), req: true, digits: true },
        { k: 'phone', label: t('users.field.phone'), req: true },
        { k: 'email', label: t('users.field.email'), req: true, ltr: true },
        {
            k: 'therapy',
            label: t('users.field.therapy'),
            options: THERAPY_IDS.map((id) => ({
                value: id,
                label: t(`therapy.${id}`),
            })),
        },
        { k: 'spec', label: t('users.field.spec'), localized: true },
        {
            k: 'clinic',
            label: t('users.field.clinic'),
            localized: true,
            hint: t('users.hint.clinicEmpty'),
        },
        {
            k: 'disc',
            label: t('users.field.disc'),
            numeric: true,
            hint: t('users.hint.defaultDisc', {
                n: SETTINGS.defaultDiscountPct,
            }),
        },
        { k: 'city', label: t('users.field.city'), req: true, localized: true },
        { k: 'street', label: t('users.field.street'), localized: true },
        { k: 'num', label: t('users.field.num'), digits: true },
        { k: 'apt', label: t('users.field.apt'), digits: true },
        { k: 'floor', label: t('users.field.floor'), digits: true },
        { k: 'entry', label: t('users.field.entry'), localized: true },
    ];
}

/**
 * @param {(key: string, params?: object) => string} t
 * @returns {Array<object>}
 */
export function patientFields(t) {
    return [
        {
            k: 'first',
            label: t('users.field.first'),
            req: true,
            localized: true,
        },
        {
            k: 'last',
            label: t('users.field.last'),
            req: true,
            localized: true,
        },
        {
            k: 'tz',
            label: t('users.field.tz'),
            req: true,
            digits: true,
            hint: t('users.hint.tzRequired'),
        },
        {
            k: 'phone',
            label: t('users.field.mobile'),
            req: true,
            hint: t('users.hint.phoneUpdates'),
        },
        { k: 'email', label: t('users.field.email'), ltr: true },
        {
            k: 'birth',
            label: t('users.field.birth'),
            ltr: true,
            hint: t('users.hint.birthFormat'),
        },
        {
            k: 'sex',
            label: t('users.field.sex'),
            allowEmpty: true,
            options: [
                { value: 'f', label: t('users.sexLabel.f') },
                { value: 'm', label: t('users.sexLabel.m') },
            ],
        },
        { k: 'city', label: t('users.field.city'), req: true, localized: true },
        { k: 'street', label: t('users.field.street'), localized: true },
        { k: 'num', label: t('users.field.num'), digits: true },
        { k: 'apt', label: t('users.field.apt'), digits: true },
        { k: 'floor', label: t('users.field.floor'), digits: true },
        { k: 'entry', label: t('users.field.entry'), localized: true },
        {
            k: 'allerg',
            label: t('users.field.allerg'),
            localized: true,
            full: true,
            hint: t('users.hint.allergShown'),
        },
    ];
}
