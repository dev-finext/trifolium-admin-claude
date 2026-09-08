"""Pseudonymisation of the people in the real database.

The catalogue — items, ingredients, bills of materials, suppliers, categories,
prices — is extracted verbatim, because it carries no person. People are not:
a practitioner's name, a patient's name, their phone, national ID, email and
street address are replaced here, at extraction time, so no real personal
detail ever reaches the repository.

Everything that is *not* a personal identifier stays real: the city, the
therapy field, the clinic's existence, the discount, the dates, the order
composition, the amounts. That is what makes the fixture behave like the real
system rather than merely look like it.

The replacement is deterministic — the same card code always yields the same
fictitious person — so orders, patients and activities stay consistently
linked across every extracted file.

The shapes follow the conventions `scripts/check-fixture-privacy.mjs` enforces:
a phone in the 000 subscriber block, a national ID that is 9-prefixed and
deliberately fails its check digit, a company number that is 8-prefixed, and
an email under a reserved domain.
"""

import hashlib

FIRST_M = [
    'אורי', 'איתי', 'אלון', 'אסף', 'בועז', 'גיא', 'דורון', 'הראל', 'זוהר',
    'חן', 'יואב', 'יונתן', 'ליאור', 'מתן', 'נדב', 'ניר', 'עומר', 'עמית',
    'רועי', 'שחר', 'תומר', 'יורם', 'משה', 'דוד', 'אבנר',
]

FIRST_F = [
    'אביגיל', 'אורית', 'איילה', 'אלה', 'גלית', 'דנה', 'הדר', 'ורד', 'זהר',
    'חני', 'טל', 'יעל', 'כרמל', 'ליאת', 'מיכל', 'נועה', 'סיגל', 'עדי',
    'רונית', 'רותם', 'שירה', 'תמר', 'נטע', 'מרים', 'לילך',
]

LAST = [
    'אבידן', 'אברהמי', 'אדלר', 'אזולאי', 'בן־ארי', 'ברקוביץ', 'גולן',
    'גרינברג', 'דגן', 'הלוי', 'ויסמן', 'זילבר', 'חרותי', 'טולדנו', 'יהלום',
    'כספי', 'לביא', 'מזרחי', 'נחמיאס', 'סגל', 'עומר', 'פלד', 'צדוק',
    'קפלן', 'רוזן', 'שגב', 'שטרן', 'תדהר', 'ליבנה', 'ארבל',
]

STREETS = [
    'הרצל', 'ויצמן', 'בן גוריון', 'אלנבי', 'ז׳בוטינסקי', 'סוקולוב',
    'הנשיא', 'הגלבוע', 'התאנה', 'הזיתים', 'הדקל', 'ההדס', 'הכרמל',
    'אחד העם', 'ביאליק', 'רוטשילד', 'הפלמ״ח', 'שדרות ירושלים',
]

EMAIL_DOMAINS = ['clinic.example', 'herbs.example', 'mail.example']


def _seed(key):
    """A stable number for one real key, so the same person recurs."""
    digest = hashlib.sha256(str(key).encode('utf-8')).hexdigest()

    return int(digest[:12], 16)


def _pick(pool, seed, salt=0):
    return pool[(seed + salt) % len(pool)]


def national_id(key):
    """Nine digits, 9-prefixed, with a check digit chosen to be wrong."""
    seed = _seed(f'tz:{key}')
    body = f'{seed % 10_000_000:07d}'
    digits = [9] + [int(c) for c in body]

    # The Israeli check digit makes the weighted sum a multiple of ten. Add
    # five to whatever would be correct so the number can never be a real one.
    total = 0

    for i, digit in enumerate(digits):
        step = digit * (1 if i % 2 == 0 else 2)
        total += step if step < 10 else step - 9

    check = (10 - total % 10) % 10

    return ''.join(str(d) for d in digits) + str((check + 5) % 10)


def phone(key, mobile=True):
    """A number in the 000 subscriber block, which is not allocated."""
    seed = _seed(f'phone:{key}')
    prefix = _pick(['050', '052', '053', '054', '058'], seed) if mobile else '03'

    return f'{prefix}-000-{seed % 9000 + 1000:04d}'


def company_number(key):
    """Nine digits, 8-prefixed, so it cannot be a real registration."""
    seed = _seed(f'biz:{key}')

    return f'8{seed % 100_000_000:08d}'


def email(key, first, last):
    """A local part built from the fictitious name, on a reserved domain."""
    seed = _seed(f'mail:{key}')
    slug = f'{_translit(first)}.{_translit(last)}'.strip('.') or f'user{seed % 999}'

    return f'{slug}@{_pick(EMAIL_DOMAINS, seed)}'


_TRANSLIT = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
    'ח': 'h', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
    'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'f',
    'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
}


def _translit(text):
    return ''.join(_TRANSLIT.get(ch, '') for ch in str(text or ''))


def person(key, female=None):
    """One fictitious person for one real card code, stable across files."""
    seed = _seed(f'name:{key}')

    if female is None:
        female = seed % 2 == 0

    first = _pick(FIRST_F if female else FIRST_M, seed)
    last = _pick(LAST, seed, salt=7)

    return {
        'first': first,
        'last': last,
        'name': f'{first} {last}',
        'female': female,
        'tz': national_id(key),
        'phone': phone(key),
        'email': email(key, first, last),
        'street': _pick(STREETS, seed, salt=3),
        'streetNum': str(seed % 120 + 1),
        'apartment': str(seed % 24 + 1),
        'floor': str(seed % 9),
    }


def clinic_name(key, city):
    """A fictitious clinic name that still reads like a real one."""
    seed = _seed(f'clinic:{key}')
    head = _pick(
        ['שורש', 'צמיחה', 'מרפא', 'עלה', 'נטורלי', 'הרמוניה', 'שביל', 'מעיין'],
        seed,
    )

    return f'קליניקת {head} · {city}' if city else f'קליניקת {head}'
