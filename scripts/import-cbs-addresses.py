"""Turn the CBS settlement and street lists into the console's address book.

The two source files are published by the Central Bureau of Statistics through
data.gov.il and are encoded cp1255 (Hebrew Windows), not UTF-8:

    ישובים / "רשימת ישובים"   → סמל_ישוב, שם_ישוב, שם_ישוב_לועזי, …
    רחובות / "רשימת רחובות"   → סמל_ישוב, שם_ישוב, סמל_רחוב, שם_רחוב

Run it whenever a newer edition is published:

    python scripts/import-cbs-addresses.py \\
        ~/Downloads/ערים.csv ~/Downloads/רחובות.csv \\
        resources/js/demo/real/cities.json

What it decides, and why:

  * A settlement with no named streets is left out. The CBS marks those with
    street code 9000 — the settlement standing in for a street, which is how an
    address in a kibbutz is written — and there is nothing there to pick from.
  * The ids are the CBS codes: a town is `3000`, a street in it `3000-164`. A
    row is identified by its real identifier, as everywhere else in this
    console.
  * There is no English street name anywhere in the national list, so a street
    record holds Hebrew alone and `loc()` falls back to it. A town keeps the CBS
    transliteration, title-cased because the source is in capitals, and only
    when it differs from the Hebrew.
"""

import csv
import io
import json
import sys
from collections import defaultdict

# At or above this street code the row is not a street: it is the settlement
# standing in for one, for a place whose streets have no names.
PSEUDO_STREET = 9000

ENCODING = 'cp1255'


def rows(path):
    with io.open(path, encoding=ENCODING, errors='replace', newline='') as fh:
        reader = csv.reader(fh)
        head = [cell.strip() for cell in next(reader)]

        for line in reader:
            yield dict(zip(head, [cell.strip() for cell in line]))


def titled(value):
    """CBS writes its transliterations in capitals; a table reads better mixed."""
    out = []
    start = True

    for ch in value.lower():
        out.append(ch.upper() if start and ch.isalpha() else ch)
        start = ch in ' -'

    return ''.join(out)


def main(cities_csv, streets_csv, out_path):
    cities = {}

    for row in rows(cities_csv):
        code = row['סמל_ישוב']
        he = row['שם_ישוב']
        en = titled(row['שם_ישוב_לועזי'])
        name = {'he': he, 'en': en} if en and en != he else {'he': he}
        cities[code] = {'id': code, 'name': name, 'streets': []}

    streets = defaultdict(dict)

    for row in rows(streets_csv):
        if int(row['סמל_רחוב']) >= PSEUDO_STREET:
            continue

        city, code, name = row['סמל_ישוב'], row['סמל_רחוב'], row['שם_רחוב']

        if name and city in cities:
            streets[city][code] = name

    out = []

    for city in sorted(streets, key=lambda c: cities[c]['name']['he']):
        record = cities[city]
        record['streets'] = [
            {'id': f'{city}-{code}', 'name': {'he': name}}
            for code, name in sorted(streets[city].items(), key=lambda kv: kv[1])
        ]
        out.append(record)

    io.open(out_path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    )

    print(
        f'{out_path}: {len(out)} cities, '
        f'{sum(len(city["streets"]) for city in out)} streets'
    )


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
