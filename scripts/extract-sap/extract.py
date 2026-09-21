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
    'ingredients': 320,
    'products': 180,
    'boms': 50,
    'practitioners': 30,
    'patients': 60,
    'orders': 50,
    'suppliers': 40,
    'batches': 120,
}

# Item code prefix -> the family the console groups by. Kept in step with
# ITEM_FAMILIES in resources/js/config/items.js; the counts beside each line are
# what the catalogue held when this was last read (items / of them active).
#
# The family is read from the code and never from the item group: SAP's group
# names carry a number that frequently disagrees with what is filed under them.
#
# 54 is absent on purpose: 39 items, none of them active. 55 is the medicines
# still being sold.
FAMILY_BY_PREFIX = {
    '10': 'herb',           # 626 / 507
    '11': 'herb_1to1',      # 628 / 506
    '12': 'extract',        # 297 / 187
    '13': 'extract',        # 109 /  66  classical Chinese DE
    '14': 'hydrosol',       # 111 / 100
    '15': 'essential_oil',  # 107 /  56
    '16': 'supplement',     #  54 /  30
    '20': 'tincture',       # 691 / 615
    '21': 'infused_oil',    #  30 /  27
    '22': 'homeopathy',     #   5 /   4
    '23': 'formula',        #  71 /  67
    '24': 'formula',        #  32 /  27  oil formulas
    '26': 'formula',        #  10 /   0  herb formulas
    '27': 'private_label',  #  95 /  75
    '30': 'consumable',     #  64 /  57
    '40': 'glass',          #   8 /   6
    '41': 'plastic',        #  21 /  17
    '42': 'cap',            #  13 /  12
    '43': 'box',            #   6 /   1
    '46': 'jar',            #  10 /   8
    '47': 'packaging',      # 257 / 242  packaging and item labels
    '48': 'admin',          #  85 /  85
    '49': 'shelf',          #   5 /   5  shelf products numbered outside 50
    '50': 'shelf',          # 380 / 229
    '55': 'bought_shelf',   # 259 /  87
    '60': 'workshop',       #   4 /   4
    '99': 'labour',         #  60 /  56
}

# What the ingredient catalogue is made of: everything that goes into a
# preparation, plus everything it is made and packed with. Every prefix the
# console knows is drawn from, so no family arrives on screen empty.
INGREDIENT_PREFIXES = (
    '10', '11', '12', '13', '14', '15', '20', '21', '22', '30',
    '40', '41', '42', '43', '46', '47', '48', '99',
)

# The finished goods: shelf products, medicines, supplements, house formulas
# and the private label.
PRODUCT_PREFIXES = ('50', '49', '55', '16', '23', '24', '26', '27', '60')


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


def item_properties(conn):
    """All 64 item properties (`OITG`), with how many items carry each.

    SAP's card shows sixty-four checkboxes; forty-two of them were never named
    and never ticked. `items` is what separates the ones the pharmacy uses.
    """
    return [
        clean(row)
        for row in dicts(
            conn,
            """
            SELECT g.ItmsTypCod AS code, g.ItmsGrpNam AS name,
                   (SELECT COUNT(*) FROM OITM i
                    WHERE CASE g.ItmsTypCod
                    """
            + ' '.join(
                f"WHEN {n} THEN i.QryGroup{n}" for n in range(1, 65)
            )
            + """
                    END = 'Y') AS items
            FROM OITG g
            ORDER BY g.ItmsTypCod
            """,
        )
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


def price_lists(conn):
    """The price lists an item is priced in — ITM1's columns, named."""
    return [
        clean(row)
        for row in dicts(
            conn,
            """
            SELECT ListNum AS code, ListName AS name, BASE_NUM AS baseList,
                   Factor AS factor, PrimCurr AS currency
            FROM OPLN
            ORDER BY ListNum
            """,
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
    ItmsGrpCod AS groupCode, ItemType AS itemType,
    validFor AS active, frozenFor AS frozen,
    frozenFrom AS frozenFrom, frozenTo AS frozenTo,
    ValidComm AS activeComment, FrozenComm AS frozenComment,
    InvntItem AS stockTracked, PrchseItem AS purchase, SellItem AS sell,
    ManBtchNum AS batchManaged, TreeType AS treeType, IssueMthd AS issueMethod,
    CodeBars AS barcode, SWW AS additionalId, PicturName AS picture,
    CardCode AS supplierCode, SuppCatNum AS supplierCatalogNum,
    InvntryUom AS stockUom, BuyUnitMsr AS buyUom, NumInBuy AS numInBuy,
    SalUnitMsr AS salesUom, NumInSale AS numInSale, CntUnitMsr AS countUom,
    UgpEntry AS uomGroup, PriceUnit AS priceUnit,
    PurPackMsr AS packUom, PurPackUn AS packQty,
    OnHand AS onHand, IsCommited AS committed, OnOrder AS onOrder,
    MinLevel AS minLevel, MaxLevel AS maxLevel, ReorderQty AS reorderQty,
    MinOrdrQty AS minOrderQty, LeadTime AS leadTime,
    PlaningSys AS planningMethod, PrcrmntMtd AS procurementMethod,
    ProductSrc AS productSource, CompoWH AS componentWarehouse,
    LastPurPrc AS lastPurchasePrice, LastPurCur AS lastPurchaseCurrency,
    LastPurDat AS lastPurchaseOn, LstEvlPric AS lastEvalPrice,
    LstEvlDate AS lastEvalOn, AvgPrice AS avgPrice,
    GLMethod AS valuationMethod, ByWh AS byWarehouse,
    NoDiscount AS noDiscount, InCostRoll AS inCostRoll,
    U_Alcohol AS alcoholPct, U_Oil AS oilPct, U_ExtrRatio AS extractionRatio,
    U_Size AS packageSize,
    U_PregnancyLimits AS pregnancyLimit,
    U_BreastfeedingLimits AS breastfeedingLimit,
    U_Under2YearsLimits AS under2Limit,
    U_SiteItemName AS siteName, U_SiteUmsr AS siteUom,
    U_SiteQuantity AS siteQuantity, U_SiteComments AS siteComments,
    U_Category1 AS category1, U_Category2 AS category2,
    U_Category3 AS category3, U_Category4 AS category4,
    CAST(UserText AS nvarchar(MAX)) AS remarks,
    CAST(U_Item_SaleText AS nvarchar(MAX)) AS saleText,
    CreateDate AS createdOn, UpdateDate AS updatedOn
"""

# SAP holds the item properties as 64 Y/N columns; the extract turns the ones
# that are set into a list of property numbers (OITG.ItmsTypCod).
PROPERTY_RANGE = range(1, 65)
PROPERTY_FLAGS = ', '.join(f'QryGroup{n} AS prop{n}' for n in PROPERTY_RANGE)


def family_counts(conn, prefixes):
    """How many items each family actually holds — active and not."""
    out = {}

    for prefix in prefixes:
        rows = dicts(
            conn,
            f"""
            SELECT COUNT(*) AS n FROM OITM
            WHERE ItemCode LIKE '{prefix}%'
              AND ItemCode NOT LIKE '[^0-9]%'
            """,
        )
        out[prefix] = rows[0]['n'] if rows else 0

    return out


def items(conn, prefixes, limit, order_by='OnHand DESC'):
    """A sample that keeps the catalogue's own shape.

    Taking the top N by stock would return one family and call it a catalogue.
    Each family instead gets a share of the sample proportional to how many
    items it really has, so the mix on screen is the pharmacy's mix — inactive
    and frozen items included, since a quarter of the real catalogue is one or
    the other.

    Every item comes out with the whole card: the OITM row, its prices in each
    price list (ITM1), its stock in each warehouse (OITW) and the item
    properties that are set (QryGroup1..64).
    """
    counts = family_counts(conn, prefixes)
    total = sum(counts.values()) or 1
    out = []

    for prefix in prefixes:
        share = max(1, round(limit * counts[prefix] / total))
        rows = dicts(
            conn,
            f"""
            SELECT TOP {share} {ITEM_COLUMNS}, {PROPERTY_FLAGS}
            FROM OITM
            WHERE ItemCode LIKE '{prefix}%'
              AND ItemCode NOT LIKE '[^0-9]%'
            ORDER BY {order_by}
            """,
        )

        for row in rows:
            item = clean(row)
            item['family'] = family_of(item['code'])
            item['properties'] = [
                n for n in PROPERTY_RANGE if row.get(f'prop{n}') == 'Y'
            ]

            for n in PROPERTY_RANGE:
                item.pop(f'prop{n}', None)

            out.append(item)

    picked = out[:limit] if len(out) > limit else out
    attach_prices_and_stock(conn, picked)

    return picked


def items_by_code(conn, codes):
    """The same full card, for a named set of item numbers."""
    wanted = [c for c in dict.fromkeys(codes) if c]

    if not wanted:
        return []

    out = []

    for chunk in _chunks(wanted, 200):
        codes_sql = ','.join(f"'{c}'" for c in chunk)
        rows = dicts(
            conn,
            f"""
            SELECT {ITEM_COLUMNS}, {PROPERTY_FLAGS}
            FROM OITM
            WHERE ItemCode IN ({codes_sql})
            """,
        )

        for row in rows:
            item = clean(row)
            item['family'] = family_of(item['code'])
            item['properties'] = [
                n for n in PROPERTY_RANGE if row.get(f'prop{n}') == 'Y'
            ]

            for n in PROPERTY_RANGE:
                item.pop(f'prop{n}', None)

            out.append(item)

    attach_prices_and_stock(conn, out)

    return out


def attach_prices_and_stock(conn, picked):
    """Every item's ITM1 price rows and OITW warehouse rows."""
    by_code = {item['code']: item for item in picked}

    for item in picked:
        item['prices'] = []
        item['warehouses'] = []

    for chunk in _chunks(list(by_code), 200):
        codes_sql = ','.join(f"'{c}'" for c in chunk)

        for row in dicts(
            conn,
            f"""
            SELECT ItemCode AS code, PriceList AS list, Price AS price,
                   Currency AS currency
            FROM ITM1
            WHERE ItemCode IN ({codes_sql})
            ORDER BY ItemCode, PriceList
            """,
        ):
            price = clean(row)
            by_code[price.pop('code')]['prices'].append(price)

        for row in dicts(
            conn,
            f"""
            SELECT ItemCode AS code, WhsCode AS warehouse, OnHand AS onHand,
                   IsCommited AS committed, OnOrder AS onOrder,
                   MinStock AS minLevel, MaxStock AS maxLevel
            FROM OITW
            WHERE ItemCode IN ({codes_sql})
            ORDER BY ItemCode, WhsCode
            """,
        ):
            stock = clean(row)
            by_code[stock.pop('code')]['warehouses'].append(stock)


def _chunks(values, size):
    for start in range(0, len(values), size):
        yield values[start:start + size]



# ----------------------------------------------------------------- V3: planning
# How many months of consumption history the fixture carries. The pharmacy's own
# Excel works on fourteen; twenty-four lets the report also show the same period
# a year back, which is what the purchasing note asks for.
CONSUMPTION_MONTHS = 24

# What counts as consumption, taken verbatim from the pharmacy's own saved SAP
# query (OUQR 0654, "ניתוח מלאי - ללא בחירת קבוצה - ללא ספירת מלאי"):
#
#   * every inventory movement out (OINM.OutQty) EXCEPT
#       10000071  inventory posting - a count corrects the book, it is not demand
#       19        A/P credit memo
#       21        goods return
#       60        goods issue - the general issue used to tidy stock
#       67        warehouse transfer - the note asks for this one too; the saved
#                 query does not exclude it, but the intent is explicit and only
#                 32 transfer rows exist in ten years, so the difference is nil
#   * plus the goods-issue lines a production order raised (IGE1.BaseType = 202),
#     which is the real consumption the blanket exclusion of 60 above removed.
CONSUMPTION_SKIP = (10000071, 19, 21, 60, 67)

# The production order's own object type, as SAP writes it into IGE1.BaseType.
PRODUCTION_ORDER_TYPE = 202

# A sale straight to a customer: the A/R invoice and the delivery note. Column 12
# of the purchasing note is this slice of the consumption above, so the buyer can
# see how much of a herb left as raw material rather than into a production run.
SALES_TYPES = (13, 15)


def consumption(conn, codes, months=CONSUMPTION_MONTHS):
    """Consumption per item per month, on the pharmacy's own definition.

    Returns one row per item that moved at all: `months` maps 'YYYY-MM' to the
    quantity consumed, `direct` the part of it that was sold as raw material.
    Months with nothing in them are left out rather than written as zero.
    """
    wanted = [c for c in dict.fromkeys(codes) if c]

    if not wanted:
        return {'from': None, 'to': None, 'months': [], 'rows': []}

    span = dicts(conn, 'SELECT MAX(DocDate) AS last FROM OINM')
    last = span[0]['last']
    last = last.date() if isinstance(last, datetime) else last
    # The month the data ends in is a stub - the backup was taken on the fifth -
    # so the window closes at the start of it, on the last whole month.
    end_year, end_month = last.year, last.month
    start_year, start_month = end_year, end_month - months

    while start_month <= 0:
        start_month += 12
        start_year -= 1

    first = date(start_year, start_month, 1)
    stop = date(end_year, end_month, 1)

    by_code = {}

    def touch(code):
        if code not in by_code:
            by_code[code] = {'code': code, 'months': {}, 'direct': {}}

        return by_code[code]

    window = (
        f"DocDate >= '{first.isoformat()}' AND DocDate < '{stop.isoformat()}'"
    )

    for chunk in _chunks(wanted, 200):
        codes_sql = ','.join(f"'{c}'" for c in chunk)
        skip_sql = ','.join(str(n) for n in CONSUMPTION_SKIP)

        rows = dicts(
            conn,
            f"""
            SELECT ItemCode AS code,
                   FORMAT(DocDate, 'yyyy-MM') AS ym,
                   SUM(OutQty) AS qty
            FROM OINM
            WHERE ItemCode IN ({codes_sql}) AND {window}
              AND ISNULL(TransType, 0) NOT IN ({skip_sql})
              AND OutQty > 0
            GROUP BY ItemCode, FORMAT(DocDate, 'yyyy-MM')
            """,
        )

        for row in rows:
            touch(row['code'])['months'][row['ym']] = plain(row['qty'])

        rows = dicts(
            conn,
            f"""
            SELECT L.ItemCode AS code,
                   FORMAT(H.DocDate, 'yyyy-MM') AS ym,
                   SUM(L.Quantity) AS qty
            FROM OIGE H
            JOIN IGE1 L ON L.DocEntry = H.DocEntry
            WHERE L.ItemCode IN ({codes_sql})
              AND H.DocDate >= '{first.isoformat()}'
              AND H.DocDate < '{stop.isoformat()}'
              AND L.BaseType = {PRODUCTION_ORDER_TYPE}
            GROUP BY L.ItemCode, FORMAT(H.DocDate, 'yyyy-MM')
            """,
        )

        for row in rows:
            entry = touch(row['code'])
            was = entry['months'].get(row['ym']) or 0
            entry['months'][row['ym']] = plain(Decimal(str(was)) + row['qty'])

        sales_sql = ','.join(str(n) for n in SALES_TYPES)
        rows = dicts(
            conn,
            f"""
            SELECT ItemCode AS code,
                   FORMAT(DocDate, 'yyyy-MM') AS ym,
                   SUM(OutQty) AS qty
            FROM OINM
            WHERE ItemCode IN ({codes_sql}) AND {window}
              AND TransType IN ({sales_sql}) AND OutQty > 0
            GROUP BY ItemCode, FORMAT(DocDate, 'yyyy-MM')
            """,
        )

        for row in rows:
            touch(row['code'])['direct'][row['ym']] = plain(row['qty'])

    months_list = []
    year, month = start_year, start_month

    while (year, month) < (end_year, end_month):
        months_list.append(f'{year:04d}-{month:02d}')
        month += 1

        if month > 12:
            month = 1
            year += 1

    return {
        'from': months_list[0] if months_list else None,
        'to': months_list[-1] if months_list else None,
        'months': months_list,
        'rows': sorted(by_code.values(), key=lambda row: row['code']),
    }


def open_orders(conn, codes):
    """What is on order for an item, and from whom.

    Column 7 of the purchasing note asks for the quantity ordered and the name
    behind it - a supplier for a purchase order, the run itself for a production
    order. SAP keeps the two in different documents; the report needs both.
    """
    wanted = [c for c in dict.fromkeys(codes) if c]

    if not wanted:
        return []

    out = []

    for chunk in _chunks(wanted, 200):
        codes_sql = ','.join(f"'{c}'" for c in chunk)

        rows = dicts(
            conn,
            f"""
            SELECT L.ItemCode AS code, 'purchase' AS kind,
                   H.DocNum AS doc, H.CardCode AS partyCode, H.CardName AS party,
                   L.OpenQty AS qty, L.unitMsr AS uom,
                   L.ShipDate AS due, H.DocDate AS placed
            FROM POR1 L
            JOIN OPOR H ON H.DocEntry = L.DocEntry
            WHERE L.ItemCode IN ({codes_sql})
              AND L.LineStatus = 'O' AND L.OpenQty > 0
            """,
        )
        out.extend(clean(row) for row in rows)

        rows = dicts(
            conn,
            f"""
            SELECT ItemCode AS code, 'production' AS kind,
                   DocNum AS doc, NULL AS partyCode, NULL AS party,
                   (PlannedQty - CmpltQty) AS qty, Uom AS uom,
                   DueDate AS due, PostDate AS placed
            FROM OWOR
            WHERE ItemCode IN ({codes_sql})
              AND Status IN ('P', 'R') AND (PlannedQty - CmpltQty) > 0
            """,
        )
        out.extend(clean(row) for row in rows)

    return out


def purchase_history(conn, codes):
    """Who actually supplied an item, how much and at what price.

    The purchasing note asks the report to recommend a supplier - the leading
    one, what happened when it had none, and the price. That answer is in the
    receipts: one row per item and supplier, with quantity, price and last date.
    """
    wanted = [c for c in dict.fromkeys(codes) if c]

    if not wanted:
        return []

    out = []

    for chunk in _chunks(wanted, 200):
        codes_sql = ','.join(f"'{c}'" for c in chunk)

        rows = dicts(
            conn,
            f"""
            SELECT L.ItemCode AS code, H.CardCode AS supplierCode,
                   H.CardName AS supplier,
                   COUNT(*) AS lines, SUM(L.Quantity) AS qty,
                   MAX(H.DocDate) AS lastOn,
                   MIN(L.Price) AS lowPrice, MAX(L.Price) AS highPrice
            FROM PDN1 L
            JOIN OPDN H ON H.DocEntry = L.DocEntry
            WHERE L.ItemCode IN ({codes_sql}) AND L.Quantity > 0
            GROUP BY L.ItemCode, H.CardCode, H.CardName
            """,
        )
        out.extend(clean(row) for row in rows)

    return out


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
    counts['itemProperties'] = write('itemProperties', item_properties(conn))
    counts['categories'] = write('categories', categories(conn))
    counts['itemGroups'] = write('itemGroups', item_groups(conn))
    counts['warehouses'] = write('warehouses', warehouses(conn))
    counts['priceLists'] = write('priceLists', price_lists(conn))
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

    catalogue_codes = [i['code'] for i in ingredients + products]
    bom_rows = boms(conn, COUNTS['boms'], catalogue_codes)

    print('people (pseudonymised)')
    practitioner_rows = practitioners(conn, COUNTS['practitioners'])
    counts['practitioners'] = write('practitioners', practitioner_rows)

    practitioner_codes = [p['code'] for p in practitioner_rows]
    counts['patients'] = write(
        'patients', patients(conn, COUNTS['patients'], practitioner_codes)
    )
    counts['suppliers'] = write('suppliers', suppliers(conn, COUNTS['suppliers']))

    print('orders')
    order_rows = orders(conn, COUNTS['orders'], practitioner_codes)
    counts['orders'] = write('orders', order_rows)

    # Close the sample over itself: every item an order line or a bill of
    # materials names gets its card too, so no stock row, no recipe component
    # and no order line points at an item the catalogue does not hold.
    known = set(catalogue_codes)
    referenced = [
        line.get('code')
        for order in order_rows
        for line in order.get('lines') or []
    ] + [
        component.get('component')
        for tree in bom_rows
        for component in tree.get('components') or []
    ] + [tree.get('parent') for tree in bom_rows]
    missing = [
        code
        for code in dict.fromkeys(referenced)
        if code and code not in known and str(code).isdigit()
    ]
    extra = items_by_code(conn, missing)

    for item in extra:
        (products if item['code'][:2] in PRODUCT_PREFIXES else ingredients).append(
            item
        )

    print(f'  closure: {len(extra)} items pulled in by orders and trees')
    counts['ingredients'] = write('ingredients', ingredients)
    counts['products'] = write('products', products)
    counts['boms'] = write('boms', bom_rows)
    counts['priceTiers'] = write('priceTiers', price_tiers(conn))

    # V3 - inventory planning and purchasing. The consumption history is the
    # pharmacy's own, on the pharmacy's own definition; see CONSUMPTION_SKIP.
    print('planning history')
    all_codes = [item['code'] for item in ingredients + products]
    counts['consumption'] = write('consumption', consumption(conn, all_codes))
    counts['openOrders'] = write('openOrders', open_orders(conn, all_codes))
    counts['purchaseHistory'] = write(
        'purchaseHistory', purchase_history(conn, all_codes)
    )
    counts['batches'] = write('batches', batches(conn, COUNTS['batches']))

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
