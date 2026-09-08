// Lab settings — the managed texts every preparation carries. Second-version
// fixture content.
//
// In SAP both texts are injected into every order by a formatted search; here
// they are data, edited in the console. The regulatory wording is a sample: the
// pharmacy's own approved text replaces it at migration.
import { at } from '@/demo/fixture';
import { DEMO_ACTORS } from '@/demo/people';
import { L } from '@/lib/localized';

export const LAB_SETTINGS = {
    /** Printed as the patient's instructions when the formula carries none. */
    instructionsDefault: L(
        'על פי הנחיות המטפל',
        'As directed by the practitioner',
    ),
    /** Printed on every preparation label. */
    regulatoryText: L(
        'תכשיר צמחי בהכנה אישית על פי הנחיית מטפל. אינו תרופה ואינו מיועד לאבחן, לרפא או למנוע מחלה. יש לשמור מהישג ידם של ילדים. בהיריון, בהנקה או בנטילת תרופות — יש להתייעץ עם המטפל.',
        'A herbal preparation compounded to a practitioner’s instruction. Not a medicine and not intended to diagnose, treat or prevent disease. Keep out of reach of children. In pregnancy, while breastfeeding or when taking medication, consult the practitioner.',
    ),
    updated: at(120, 10, 0),
    updatedBy: DEMO_ACTORS.orit,
};
