"""Extract a working sample of the real SAP database into JSON.

Run: PYTHONUTF8=1 python scripts/extract-sap/extract.py

What comes out is a faithful extract, not an interpretation: column names stay
close to SAP's, values are the values, and the only thing that changes is the
identity of people (see people.py). The console reads it through
`resources/js/demo/real/index.js`, which is where the mapping to the console's
own shapes lives.

Every query is a SELECT. Nothing here writes to SQL Server.

Deliberately never read:
  * `RCT3` — credit card numbers and CVV
  * `OCRD.Password` / `U_*Password*` — portal passwords
  * `@SPR_STICKER` — printed stickers, which carry recipient details
"""

import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import people  # noqa: E402
from db import connect, dicts  # noqa: E402

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'resources',
    'js',
    'demo',
    'real',
)

# How many of each the fixture carries. Small enough to read, large enough that
# a filter, a sort and a pager all have something to do.
COUNTS = {
    'ingredients': 200,
    'products': 100,
    'boms': 50,
    'practitioners': 30,
    'patients': 60,
    'orders': 50,
    'suppliers': 40,
    'batches': 120,
}

# Item code prefix → the family the console groups by.
FAMILY_BY_PREFIX = {
    '10': 'herb',
    '11': 'herb_1to1',
    '12': 'extract',
    '13': 'extract',
    '14': 'hydrosol',
    '15': 'essential_oil',
    '16': 'supplement',
    '20': 'tincture',
    '21': 'infused_oil',
    '23': 'formula',
    '24': 'formula',
    '27': 'private_label',
    '30': 'consumable',
    '40': 'packaging',
    '41': 'packaging',
    '42': 'packaging',
    '43': 'packaging',
    '46': 'packaging',
    '47': 'packaging',
    '48': 'admin',
    '50': 'shelf',
    '54': 'bought_shelf',
    '55': 'bought_shelf',
    '60': 'workshop',
    '99': 'labour',
}

INGREDIENT_PREFIXES = ('10', '11', '12', '13', '14', '15', '30')
PRODUCT_PREFIXES = ('50', '55', '16')


def family_of(code):
    return FAMILY_BY_PREFIX.get(str(code)[:2], 'other')


def plain(value):
    """JSON-safe: SAP hands back Decimal and datetime all over."""
    if isinstance(value, Decimal):
        as_float = float(value)

        return int(as_float) if as_float.is_integer() else round(as_float, 4)

    if isinstance(value, (datetime, date)):
        return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()

    if isinstance(value, str):
        stripped = value.strip()

        return stripped or None

    return value


def clean(row):
    return {k: plain(v) for k, v in row.items()}


def write(name, payload):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.json')

    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=1)
        handle.write('\n')

    size = len(payload) if isinstance(payload, list) else 1
    print(f'  {name}.json  ({size} rows)')

    return size


# ---------------------------------------------------------------- reference data
def order_states(conn):
    """The eight values `ORDR.U_OrderState` actually holds, with real counts."""
    labels = dicts(
        conn,
        """
        SELECT v.FldValue AS code, v.Descr AS label
        FROM CUFD f
        JOIN UFD1 v ON v.TableID = f.TableID AND v.FieldID = f.FieldID
        WHERE f.TableID = 'ORDR' AND f.AliasID = 'OrderState'
        ORDER BY v.FldValue
        """,
    )
    counts = {
        str(row['U_OrderState']): row['n']
        for row in dicts(
            conn,
            'SELECT U_OrderState, COUNT(*) AS n FROM ORDR GROUP BY U_OrderState',
        )
    }

    return [
        {
            'code': int(row['code']),
            'label': row['label'],
            'orders': counts.get(str(row['code']), 0),
        }
        for row in labels
    ]


def value_list(conn, table, alias):
    """One UDF's valid values, as SAP defines them."""
    return dicts(
        conn,
        """
        SELECT v.FldValue AS value, v.Descr AS label
        FROM CUFD f
        JOIN UFD1 v ON v.TableID = f.TableID AND v.FieldID = f.FieldID
        WHERE f.TableID = ? AND f.AliasID = ?
        ORDER BY v.IndexID
        """,
        (table, alias),
    )


def prep_types(conn):
    """The item properties that name a preparation type — OITG 1..17."""
    rows = dicts(
        conn,
        """
        SELECT ItmsTypCod AS code, ItmsGrpNam AS name
        FROM OITG
        WHERE ItmsTypCod BETWEEN 1 AND 20
        ORDER BY ItmsTypCod
        """,
    )

    return [
        clean(row)
        for row in rows
        if row['name'] and row['name'].strip('-* ')
    ]


def categories(conn):
    return [
        clean(row)
        for row in dicts(
            conn, 'SELECT Code AS code, Name AS name FROM [@CATEGORIES] ORDER BY Code'
        )
    ]


def item_groups(conn):
    return [
        clean(row)
        for row in dicts(
            conn,
            'SELECT ItmsGrpCod AS code, ItmsGrpNam AS name FROM OITB ORDER BY ItmsGrpCod',
        )
    ]


def warehouses(conn):
    return [
        clean(row)
        for row in dicts(
            conn,
            "SELECT WhsCode AS code, WhsName AS name, Inactive AS inactive FROM OWHS ORDER BY WhsCode",
        )
    ]


def pickup_points(conn):
    return [clean(row) for row in dicts(conn, 'SELECT * FROM [@DELIVERYPOINT]')]


def content_sizes(conn):
    return [clean(row) for row in dicts(conn, 'SELECT * FROM [@COTENTSIZE]')]


# ---------------------------------------------------------------- catalogue
ITEM_COLUMNS = """
    ItemCode AS code, ItemName AS nameHe, FrgnName AS nameForeign,
    ItmsGrpCod AS groupCode, InvntItem AS stockTracked, PrchseItem AS purchase,
    SellItem AS sell, ManBtchNum AS batchManaged, validFor AS active,
    OnHand AS onHand, IsCommited AS committed, OnOrder AS onOrder,
    MinLevel AS minLevel, MaxLevel AS maxLevel,
    BuyUnitMsr AS buyUom, SalUnitMsr AS salesUom, InvntryUom AS stockUom,
    LastPurPrc AS lastPurchasePrice, CardCode AS supplierCode,
    SuppCatNum AS supplierCatalogNum, CodeBars AS barcode,
    TreeType AS treeType, ItemType AS itemType, PriceUnit AS priceUnit,
    U_Alcohol AS alcoholPct, U_Oil AS oilPct, U_ExtrRatio AS extractionRatio,
    U_Size AS packageSize,
    U_PregnancyLimits AS pregnancyLimit,
    U_BreastfeedingLimits AS breastfeedingLimit,
    U_Under2YearsLimits AS under2Limit,
    U_SiteItemName AS siteName, U_SiteUmsr AS siteUom,
    U_SiteQuantity AS siteQuantity, U_SiteComments AS siteComments,
    U_Category1 AS category1, U_Category2 AS category2,
    U_Category3 AS category3, U_Category4 AS category4,
    QryGroup40 AS siteSync, QryGroup19 AS therapistDiscount,
    QryGroup20 AS monthlyPromo,
    CreateDate AS createdOn, UpdateDate AS updatedOn
"""

PREP_FLAGS = ', '.join(f'QryGroup{n} AS prep{n}' for n in range(1, 18))


def active_counts(conn, prefixes):
    """How many active items each family actually holds."""
    out = {}

    for prefix in prefixes:
        rows = dicts(
            conn,
            f"""
            SELECT COUNT(*) AS n FROM OITM
            WHERE validFor = 'Y' AND ItemCode LIKE '{prefix}%'
              AND ItemCode NOT LIKE '[^0-9]%'
            """,
        )
        out[prefix] = rows[0]['n'] if rows else 0

    return out


def items(conn, prefixes, limit, order_by='OnHand DESC'):
    """A sample that keeps the catalogue's own shape.

    Taking the top N by stock would return one family and call it a catalogue.
    Each family instead gets a share of the sample proportional to how many
    active items it really has, so the mix on screen is the pharmacy's mix.
    """
    counts = active_counts(conn, prefixes)
    total = sum(counts.values()) or 1
    out = []

    for prefix in prefixes:
        share = max(1, round(limit * counts[prefix] / total))
        rows = dicts(
            conn,
            f"""
            SELECT TOP {share} {ITEM_COLUMNS}, {PREP_FLAGS}
            FROM OITM
            WHERE validFor = 'Y' AND ItemCode LIKE '{prefix}%'
              AND ItemCode NOT LIKE '[^0-9]%'
            ORDER BY {order_by}
            """,
        )

        for row in rows:
            item = clean(row)
            item['family'] = family_of(item['code'])
            item['prepTypes'] = [n for n in range(1, 18) if row.get(f'prep{n}') == 'Y']

            for n in range(1, 18):
                item.pop(f'prep{n}', None)

            out.append(item)

    return out[:limit] if len(out) > limit else out


def boms(conn, limit, item_codes):
    """Bills of materials whose parent is one of the items we extracted."""
    codes = ','.join(f"'{c}'" for c in item_codes) or "''"
    parents = dicts(
        conn,
        f"""
        SELECT TOP {limit} t.Code AS parent, t.Qauntity AS quantity,
               t.ToWH AS warehouse, i.ItemName AS parentName,
               t.U_Alcohol AS alcoholPct, t.U_Oil AS oilPct,
               t.U_ExtrRatio AS extractionRatio
        FROM OITT t
        JOIN OITM i ON i.ItemCode = t.Code
        WHERE t.Code IN ({codes})
        ORDER BY t.Code
        """,
    )

    if not parents:
        parents = dicts(
            conn,
            f"""
            SELECT TOP {limit} t.Code AS parent, t.Qauntity AS quantity,
                   t.ToWH AS warehouse, i.ItemName AS parentName,
                   t.U_Alcohol AS alcoholPct, t.U_Oil AS oilPct,
                   t.U_ExtrRatio AS extractionRatio
            FROM OITT t
            JOIN OITM i ON i.ItemCode = t.Code
            ORDER BY t.Code
            """,
        )

    out = []

    for parent in parents:
        lines = dicts(
            conn,
            """
            SELECT l.Code AS component, l.Quantity AS quantity,
                   l.Warehouse AS warehouse, i.ItemName AS componentName,
                   i.FrgnName AS componentForeign
            FROM ITT1 l
            JOIN OITM i ON i.ItemCode = l.Code
            WHERE l.Father = ?
            ORDER BY l.ChildNum
            """,
            (parent['parent'],),
        )
        row = clean(parent)
        row['components'] = [clean(line) for line in lines]
        out.append(row)

    return out


def price_tiers(conn):
    """The quantity tiers the consumer site prices by (`SPP2`, CardCode '*8')."""
    return [
        clean(row)
        for row in dicts(
            conn,
            """
            SELECT TOP 400 ItemCode AS code, Amount AS fromQty, Price AS price,
                   Currency AS currency
            FROM SPP2
            WHERE CardCode = '*8'
            ORDER BY ItemCode, Amount
            """,
        )
    ]


def batches(conn, limit):
    return [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} b.DistNumber AS batch, b.ItemCode AS code,
                   i.ItemName AS itemName, b.InDate AS receivedOn,
                   b.ExpDate AS expiresOn, b.MnfDate AS producedOn,
                   q.Quantity AS quantity, q.WhsCode AS warehouse
            FROM OBTN b
            JOIN OITM i ON i.ItemCode = b.ItemCode
            LEFT JOIN OBTQ q ON q.MdAbsEntry = b.AbsEntry
            WHERE b.ExpDate IS NOT NULL
            ORDER BY b.ExpDate DESC
            """,
        )
    ]


# ---------------------------------------------------------------- people
def practitioners(conn, limit):
    """Group 109. Names and personal details are replaced; the rest is real."""
    rows = dicts(
        conn,
        f"""
        SELECT TOP {limit} c.CardCode AS code, c.U_City AS city,
               c.U_UserType AS userType, c.U_Speciality AS speciality,
               c.U_GraduationYear AS graduationYear,
               c.U_CollegeName AS collegeName,
               c.U_discntmetupal AS patientDiscount,
               c.U_discntmetapel AS practitionerDiscount,
               c.U_discntMadaf AS shelfDiscount,
               c.U_discntsum AS pointsBalance,
               c.Balance AS balance, c.CreateDate AS createdOn,
               c.validFor AS active,
               c.QryGroup12 AS monthEndPayer, c.QryGroup14 AS selfPickup,
               c.QryGroup1 AS chineseMedicine, c.QryGroup2 AS naturopathy,
               c.QryGroup3 AS clinicalHerbalism,
               (SELECT COUNT(*) FROM ORDR o WHERE o.U_UnderCardCode = c.CardCode) AS orders
        FROM OCRD c
        WHERE c.GroupCode = 109 AND c.validFor = 'Y'
        ORDER BY orders DESC
        """,
    )
    out = []

    for row in rows:
        card = clean(row)
        fake = people.person(card['code'])
        therapy = (
            'chinese'
            if row.get('chineseMedicine') == 'Y'
            else 'naturopathy'
            if row.get('naturopathy') == 'Y'
            else 'herbalism'
            if row.get('clinicalHerbalism') == 'Y'
            else None
        )

        out.append(
            {
                **card,
                **{k: fake[k] for k in ('first', 'last', 'name', 'tz', 'phone', 'email')},
                'clinicName': people.clinic_name(card['code'], card.get('city')),
                'street': fake['street'],
                'streetNum': fake['streetNum'],
                'therapy': therapy,
                'pseudonymised': True,
            }
        )

    return out


def patients(conn, limit, practitioner_codes):
    """Patients of the practitioners we took, pseudonymised the same way."""
    codes = ','.join(f"'{c}'" for c in practitioner_codes) or "''"
    rows = dicts(
        conn,
        f"""
        SELECT TOP {limit} c.CardCode AS code, c.U_CardCode AS practitionerCode,
               c.U_City AS city, c.U_Gender AS gender,
               c.U_MedicineList AS medications,
               c.u_pregnantLastCheck AS pregnancyChecked,
               c.U_breasfeedingLastCheck AS breastfeedingChecked,
               c.U_PatientDeliveryApproval AS deliveryApproval,
               c.GroupCode AS groupCode, c.CreateDate AS createdOn,
               c.validFor AS active
        FROM OCRD c
        WHERE c.U_CardCode IN ({codes}) AND c.CardType = 'C'
        ORDER BY c.CreateDate DESC
        """,
    )
    out = []

    for row in rows:
        card = clean(row)
        female = str(row.get('gender') or '').strip() in ('F', 'נקבה', 'א')
        fake = people.person(card['code'], female=female)

        out.append(
            {
                **card,
                **{k: fake[k] for k in ('first', 'last', 'name', 'tz', 'phone', 'email')},
                'street': fake['street'],
                'streetNum': fake['streetNum'],
                'apartment': fake['apartment'],
                'floor': fake['floor'],
                'pseudonymised': True,
            }
        )

    return out


def suppliers(conn, limit):
    """Businesses, so the company data is real; the contact person is not."""
    rows = dicts(
        conn,
        f"""
        SELECT TOP {limit} CardCode AS code, CardName AS name,
               GroupCode AS groupCode, Balance AS balance,
               U_City AS city, Currency AS currency,
               validFor AS active, CreateDate AS createdOn,
               (SELECT COUNT(*) FROM OITM i WHERE i.CardCode = OCRD.CardCode) AS items
        FROM OCRD
        WHERE CardType = 'S'
        ORDER BY items DESC
        """,
    )
    out = []

    for row in rows:
        card = clean(row)
        out.append(
            {
                **card,
                'phone': people.phone(card['code'], mobile=False),
                'email': f"orders@{people._translit(card['name'] or 'supplier')[:14] or 'supplier'}.example",
                'contact': people.person(f"contact:{card['code']}")['name'],
                'companyNumber': people.company_number(card['code']),
            }
        )

    return out


# ---------------------------------------------------------------- orders
ORDER_HEADER = """
                   o.DocEntry AS docEntry, o.DocNum AS docNum,
                   o.DocDate AS docDate, o.DocDueDate AS dueDate,
                   o.U_OrderState AS state, o.U_OrderStatus AS legacyStatus,
                   o.CardCode AS patientCardCode,
                   o.U_UnderCardCode AS practitionerCode,
                   o.U_DocEntryWeb AS webEntry,
                   o.NumAtCard AS orderType, o.U_Payement AS whoPays,
                   o.U_whorecived AS whoReceives, o.U_SendTo AS courier,
                   o.U_City AS city, o.U_Mikud AS postcode,
                   o.U_IsufName AS pickupPoint, o.U_PointName AS pickupPointName,
                   o.DocTotal AS total, o.VatSum AS vat,
                   o.DiscPrcnt AS discountPct, o.U_TotalDiscount AS discountSum,
                   o.U_CreditsUsed AS pointsUsed,
                   o.U_CreditsAdded AS pointsEarned,
                   o.U_PS_Points AS sitePoints,
                   o.U_PayedSite AS paidOnline, o.U_Payed AS paid,
                   o.U_PayementDate AS paidOn,
                   o.U_Permited AS practitionerApproved,
                   o.U_Printed AS printed, o.U_Controled AS barcodeChecked,
                   o.U_Ipuycoah AS poaSigned,
                   o.U_Baby AS pregnant, o.U_nurse AS breastfeeding,
                   o.U_Less2 AS under2, o.U_Medicine AS takesMedicine,
                   o.U_Alergia AS allergies,
                   o.U_Dosage AS dosePerDay,
                   o.U_DosageQuantity AS dosageQuantity,
                   o.U_DosageUnit AS dosageUnit,
                   o.U_UnitCotent AS unitCount, o.U_Quantity AS contentTotal,
                   o.U_CotentSizeEach AS contentSizeEach,
                   o.U_PreparationConcentration AS concentration,
                   o.U_HowToUse AS howToUse, o.U_Instructions AS instructions,
                   o.U_Text AS patientInstructions,
                   o.U_ItemGroup AS containsMaterials,
                   o.U_eyStatus AS allocationStatus,
                   o.U_InternNotes AS internalNotes,
                   o.Comments AS comments,
                   o.DocStatus AS docStatus, o.CANCELED AS cancelled
"""

LINES_SQL = """
            SELECT l.LineNum AS line, l.ItemCode AS code, l.Dscription AS name,
                   l.Quantity AS quantity, l.Price AS price,
                   l.LineTotal AS lineTotal, l.WhsCode AS warehouse,
                   l.U_Batch AS batch, l.U_ExpDate AS batchExpiry,
                   l.U_Unit AS unit, l.U_Qty AS udfQty,
                   l.U_SuppName AS supplierName,
                   l.U_FrgnName AS foreignName,
                   l.U_SPR_PackQty AS packQuantity,
                   l.LineStatus AS lineStatus
            FROM RDR1 l
            WHERE l.DocEntry = ?
            ORDER BY l.LineNum
"""

def orders(conn, limit, practitioner_codes):
    """A spread across all eight real states, with their real lines.

    Every field here is one SAP actually carries on `ORDR` — the content /
    units / size trio, the preparation concentration, the patient's
    instructions, the safety answers, the points and the payment flag all
    exist in the real database under the names below.

    Never selected: `U_CreditCardNumber`, `U_CVV`, `U_Token`, `U_EntertPass`.
    """
    codes = ','.join(f"'{c}'" for c in practitioner_codes) or "''"
    per_state = max(2, limit // 8)
    picked = []
    seen = set()

    def take(rows):
        for row in rows:
            if row['docEntry'] not in seen:
                seen.add(row['docEntry'])
                picked.append(row)

    for state in range(1, 9):
        take(
            dicts(
                conn,
                f"""
                SELECT TOP {per_state}
{ORDER_HEADER}
                FROM ORDR o
                WHERE o.U_OrderState = {state}
                  AND o.U_UnderCardCode IN ({codes})
                ORDER BY o.DocEntry DESC
                """,
            )
        )

    # A state with no order under our practitioners still has to appear, or the
    # fixture would quietly hide the states the pharmacy barely uses.
    for state in range(1, 9):
        if not any(int(o['state'] or 0) == state for o in picked):
            take(
                dicts(
                    conn,
                    f"""
                    SELECT TOP 2
{ORDER_HEADER}
                    FROM ORDR o
                    WHERE o.U_OrderState = {state}
                    ORDER BY o.DocEntry DESC
                    """,
                )
            )

    # Still short of the target? Top up from the states that carry volume,
    # so the fixture reaches its size without inventing anything.
    for state in (6, 5, 1, 8, 3):
        if len(picked) >= limit:
            break

        take(
            dicts(
                conn,
                f"""
                SELECT TOP {limit}
{ORDER_HEADER}
                FROM ORDR o
                WHERE o.U_OrderState = {state}
                  AND o.U_UnderCardCode IN ({codes})
                ORDER BY o.DocEntry DESC
                """,
            )
        )

    out = []

    for row in picked[:limit]:
        order = clean(row)
        order['lines'] = [
            clean(line)
            for line in dicts(conn, LINES_SQL, (row['docEntry'],))
        ]

        # The people on the order are the same fictitious ones as everywhere.
        if order.get('practitionerCode'):
            order['practitionerName'] = people.person(
                order['practitionerCode']
            )['name']

        if order.get('patientCardCode'):
            patient = people.person(order['patientCardCode'])
            order['patientName'] = patient['name']
            order['patientPhone'] = patient['phone']
            order['patientTz'] = patient['tz']

        order['pseudonymised'] = True
        out.append(order)

    return out


# ---------------------------------------------------------------- main
def main():
    print('connecting to TR …')
    conn = connect()
    counts = {}

    print('reference data')
    counts['orderStates'] = write('orderStates', order_states(conn))
    counts['prepTypes'] = write('prepTypes', prep_types(conn))
    counts['categories'] = write('categories', categories(conn))
    counts['itemGroups'] = write('itemGroups', item_groups(conn))
    counts['warehouses'] = write('warehouses', warehouses(conn))
    counts['pickupPoints'] = write('pickupPoints', pickup_points(conn))
    counts['contentSizes'] = write('contentSizes', content_sizes(conn))
    counts['valueLists'] = write(
        'valueLists',
        {
            'courier': value_list(conn, 'ORDR', 'SendTo'),
            'whoPays': value_list(conn, 'ORDR', 'Payement'),
            'whoReceives': value_list(conn, 'ORDR', 'whorecived'),
            'dosageUnit': value_list(conn, 'RDR1', 'DosageUnit'),
            'instructions': value_list(conn, 'RDR1', 'Instructions'),
            'use': value_list(conn, 'RDR1', 'Use'),
            'howToUse': value_list(conn, 'RDR1', 'HowToUse'),
            'pregnancyLimits': value_list(conn, 'OITM', 'PregnancyLimits'),
        },
    )

    print('catalogue')
    ingredients = items(conn, INGREDIENT_PREFIXES, COUNTS['ingredients'])
    products = items(conn, PRODUCT_PREFIXES, COUNTS['products'])
    counts['ingredients'] = write('ingredients', ingredients)
    counts['products'] = write('products', products)

    catalogue_codes = [i['code'] for i in ingredients + products]
    counts['boms'] = write('boms', boms(conn, COUNTS['boms'], catalogue_codes))
    counts['priceTiers'] = write('priceTiers', price_tiers(conn))
    counts['batches'] = write('batches', batches(conn, COUNTS['batches']))

    print('people (pseudonymised)')
    practitioner_rows = practitioners(conn, COUNTS['practitioners'])
    counts['practitioners'] = write('practitioners', practitioner_rows)

    practitioner_codes = [p['code'] for p in practitioner_rows]
    counts['patients'] = write(
        'patients', patients(conn, COUNTS['patients'], practitioner_codes)
    )
    counts['suppliers'] = write('suppliers', suppliers(conn, COUNTS['suppliers']))

    print('orders')
    counts['orders'] = write(
        'orders', orders(conn, COUNTS['orders'], practitioner_codes)
    )

    write(
        'meta',
        {
            'source': 'TR_backup_2026_08_05_180002_6205496.bak (SAP Business One)',
            'database': 'TR',
            'extractedOn': date.today().isoformat(),
            'rows': counts,
            'pseudonymised': [
                'practitioners',
                'patients',
                'orders (names only)',
                'suppliers (contact person only)',
            ],
            'verbatim': [
                'items',
                'ingredients',
                'products',
                'boms',
                'batches',
                'priceTiers',
                'categories',
                'prepTypes',
                'itemGroups',
                'warehouses',
                'pickupPoints',
                'orderStates',
                'valueLists',
                'order dates, states, totals, discounts, points and composition',
            ],
            'neverRead': ['RCT3', 'passwords', '@SPR_STICKER'],
        },
    )

    print('done')


if __name__ == '__main__':
    main()
