"""V3 — the purchasing, stock and batch tables, read as they are.

`extract.py` already reads the catalogue, the consumption history and what is on
order. This is the rest of the paper trail the console needs to feel like the
pharmacy's own: the request, the order raised from it, the goods that arrived
against that order, the invoice that billed them; the shelf, warehouse by
warehouse; and the batches, with every document that touched them.

Everything here is a SELECT, and every value is SAP's. Two things are dropped
rather than carried: a customer's name on a batch movement (a batch reaches a
patient, and the patient is not part of this), and anything the extractor is
forbidden to read at all — see the header of `extract.py`.

Document numbering, which the console had to guess at before this: every type
runs its own counter inside a year-prefixed series. In 2026 the requests had
reached 2600007, the orders 2600163, the receipts 2600071, the supplier invoices
2600158 and the production orders 2601472. A demo that opens a new document
continues the real series rather than inventing one.
"""

# SAP's object types, as the `BaseType` / `DocType` columns spell them.
OBJ = {
    'request': 1470000113,
    'order': 22,
    'receipt': 20,
    'invoice': 18,
    'creditMemo': 19,
    'delivery': 15,
    'customerReturn': 16,
    'goodsReceipt': 59,
    'goodsIssue': 60,
    'transfer': 67,
    'count': 10000071,
    'production': 202,
}

# A movement whose other side is a customer: the document is kept, the customer
# is not. The console shows "ללקוח" and nothing more.
CUSTOMER_DOCS = {15, 16, 13, 14}


def _in(codes):
    return ','.join(f"'{c}'" for c in codes) or "''"


def _chunks(values, size=200):
    for i in range(0, len(values), size):
        yield values[i : i + size]


# ------------------------------------------------------------------ purchasing
def purchase_requests(conn, dicts, clean, limit):
    """`OPRQ` + `PRQ1`.

    A request in SAP carries no supplier — `CardCode` is empty on all 434 of
    them. That is worth knowing: the pharmacy's ask for one request per supplier
    is a change from what SAP does, not a restatement of it.
    """
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} DocEntry AS docEntry, DocNum AS docNum,
                   DocDate AS docDate, DocDueDate AS dueDate,
                   DocStatus AS status, CANCELED AS cancelled,
                   CardCode AS supplierCode, CardName AS supplier,
                   Comments AS comments, DocTotal AS total, DocCur AS currency
            FROM OPRQ
            ORDER BY DocDate DESC, DocNum DESC
            """,
        )
    ]

    heads = _with_lines(conn, dicts, clean, heads, 'PRQ1')

    # Which purchase order each line became, when it became one: `PRQ1`
    # records its target (`TargetType` 22 = `OPOR`), and the console keeps a
    # line that moved on its request, marked with the order it went to, rather
    # than deleting it (12.11.2026). Request 2600003 is a real "בוצע" — all six
    # lines went to order 2600030; 2600001 was closed with 17 of 30 ordered.
    for chunk in _chunks([head['docEntry'] for head in heads]):
        entries = ','.join(str(e) for e in chunk)
        targets = {
            (row['docEntry'], row['line']): row['targetPo']
            for row in dicts(
                conn,
                f"""
                SELECT L.DocEntry AS docEntry, L.LineNum AS line,
                       P.DocNum AS targetPo
                FROM PRQ1 L
                JOIN OPOR P ON P.DocEntry = L.TrgetEntry AND L.TargetType = 22
                WHERE L.DocEntry IN ({entries})
                """,
            )
        }
        by_entry = {head['docEntry']: head for head in heads}

        for (entry, line_no), po in targets.items():
            head = by_entry.get(entry)

            if not head:
                continue

            for line in head['lines']:
                if line['line'] == line_no:
                    line['targetPo'] = po

    return heads


def purchase_orders(conn, dicts, clean, limit):
    """`OPOR` + `POR1`, and the request each line was raised from.

    3,384 of 6,493 order lines name a purchase request as their base — the
    request → order chain the console builds is the pharmacy's own.
    """
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} DocEntry AS docEntry, DocNum AS docNum,
                   DocDate AS docDate, DocDueDate AS dueDate,
                   DocStatus AS status, CANCELED AS cancelled,
                   CardCode AS supplierCode, CardName AS supplier,
                   NumAtCard AS supplierRef, Comments AS comments,
                   DocTotal AS total, DocCur AS currency, DocRate AS rate,
                   VatSum AS vat, DiscPrcnt AS discountPct
            FROM OPOR
            ORDER BY DocDate DESC, DocNum DESC
            """,
        )
    ]

    return _with_lines(conn, dicts, clean, heads, 'POR1', base=True)


def goods_receipts(conn, dicts, clean, limit):
    """`OPDN` + `PDN1`: what actually arrived, against which order."""
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} DocEntry AS docEntry, DocNum AS docNum,
                   DocDate AS docDate, TaxDate AS shippedOn,
                   DocStatus AS status, CANCELED AS cancelled,
                   CardCode AS supplierCode, CardName AS supplier,
                   NumAtCard AS supplierRef, Comments AS comments,
                   DocTotal AS total, DocCur AS currency
            FROM OPDN
            ORDER BY DocDate DESC, DocNum DESC
            """,
        )
    ]

    heads = _with_lines(conn, dicts, clean, heads, 'PDN1', base=True)

    # Two joins the console reads every receipt by (12.11.2026):
    #
    #   poNumber  the purchase order the receipt was booked against — the
    #             `DocNum` behind its lines' base (`BaseType` 22 = `OPOR`).
    #   invoice   the A/P invoice that billed it — an `OPCH` whose lines name
    #             this receipt as their base (`BaseType` 20 = `OPDN`): its
    #             number, the supplier's own number on it (`NumAtCard`) and
    #             its date. A closed receipt with no such invoice was closed
    #             another way (an invoice straight off the order, or by hand);
    #             an open one (`DocStatus` O) is a delivery note still waiting
    #             for its invoice — exactly what "תעודות משלוח פתוחות" lists.
    by_entry = {head['docEntry']: head for head in heads}

    for head in heads:
        head['poNumber'] = None
        head['invoice'] = None

    for chunk in _chunks(list(by_entry)):
        entries = ','.join(str(e) for e in chunk)

        for row in dicts(
            conn,
            f"""
            SELECT DISTINCT L.DocEntry AS docEntry, P.DocNum AS poNumber
            FROM PDN1 L
            JOIN OPOR P ON P.DocEntry = L.BaseEntry AND L.BaseType = 22
            WHERE L.DocEntry IN ({entries})
            """,
        ):
            head = by_entry.get(row['docEntry'])

            if head and head['poNumber'] is None:
                head['poNumber'] = plain_int(row['poNumber'])

        for row in dicts(
            conn,
            f"""
            SELECT DISTINCT L.BaseEntry AS docEntry, I.DocNum AS docNum,
                   I.NumAtCard AS ref, I.DocDate AS date
            FROM PCH1 L
            JOIN OPCH I ON I.DocEntry = L.DocEntry
            WHERE L.BaseType = 20 AND L.BaseEntry IN ({entries})
              AND I.CANCELED = 'N'
            """,
        ):
            head = by_entry.get(row['docEntry'])

            if head and head['invoice'] is None:
                invoice = clean(row)
                invoice.pop('docEntry', None)
                head['invoice'] = invoice

    return heads


def plain_int(value):
    """A document number as SAP hands it back, as a plain integer."""
    return None if value is None else int(value)


def supplier_invoices(conn, dicts, clean, limit):
    """`OPCH` + `PCH1`: the bill, and what it bills.

    4,141 invoice lines come straight off a purchase order and 786 off a goods
    receipt — both routes are real, which is why the console has to hold a
    delivery note that is still waiting for its invoice.
    """
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} DocEntry AS docEntry, DocNum AS docNum,
                   DocDate AS docDate, DocDueDate AS dueDate,
                   TaxDate AS taxDate, DocStatus AS status,
                   CANCELED AS cancelled, CardCode AS supplierCode,
                   CardName AS supplier, NumAtCard AS supplierRef,
                   DocTotal AS total, PaidToDate AS paid, DocCur AS currency,
                   VatSum AS vat, Comments AS comments
            FROM OPCH
            ORDER BY DocDate DESC, DocNum DESC
            """,
        )
    ]

    return _with_lines(conn, dicts, clean, heads, 'PCH1', base=True)


def _with_lines(conn, dicts, clean, heads, table, base=False):
    """Hang each document's lines off its head, in one query per chunk."""
    if not heads:
        return []

    by_entry = {head['docEntry']: head for head in heads}

    for head in heads:
        head['lines'] = []

    base_cols = (
        ', L.BaseType AS baseType, L.BaseEntry AS baseEntry,'
        ' L.BaseRef AS baseRef'
        if base
        else ''
    )

    for chunk in _chunks(list(by_entry)):
        entries = ','.join(str(e) for e in chunk)

        for row in dicts(
            conn,
            f"""
            SELECT L.DocEntry AS docEntry, L.LineNum AS line,
                   L.ItemCode AS code, L.Dscription AS name,
                   L.Quantity AS qty, L.OpenQty AS openQty,
                   L.Price AS price, L.Currency AS currency,
                   L.LineTotal AS total, L.WhsCode AS warehouse,
                   L.ShipDate AS dueOn, L.LineStatus AS status,
                   L.unitMsr AS uom, L.NumPerMsr AS perUom{base_cols}
            FROM {table} L
            WHERE L.DocEntry IN ({entries})
            ORDER BY L.DocEntry, L.LineNum
            """,
        ):
            line = clean(row)
            by_entry[line.pop('docEntry')]['lines'].append(line)

    return heads


# ------------------------------------------------- supplier catalogue numbers
def supplier_catalog(conn, dicts, clean):
    """`OSCN`: what each supplier calls an item — its own catalogue number.

    Read for the supplier's Excel file (12.11.2026), whose "מק״ט ספק" column is
    this number for the order's supplier. SAP fills it onto a purchase order
    line (`POR1.SubCatNum`) from here, by the order's supplier: in the two years
    to the backup 428 order lines carried one, and every one of them came from
    this table — none from the item card's own `OITM.SuppCatNum`, which is a
    single number per item, filled on 141 items, and never reached an order.
    Order 2600160, the one the sample file was made from, carries 22046/500ML
    for 150043 and 90/50ML for 150044 from here.

    130 rows, 129 item–supplier pairs, 11 suppliers. One pair holds two numbers
    (150040 at 950002: CM4/30ML, marked `IsDefault`, and CMS2/50ML); every row
    is read as it is, with the flag, and the console keeps the default one —
    one number per supplier is what an order line can carry. `Descriptio`, the
    supplier's name for the item, is empty on every row and is not read.
    """
    return [
        clean(row)
        for row in dicts(
            conn,
            """
            SELECT ItemCode AS code, CardCode AS supplierCode,
                   Substitute AS catalogNum, IsDefault AS isDefault
            FROM OSCN
            ORDER BY ItemCode, CardCode, IsDefault DESC, Substitute
            """,
        )
    ]


# ----------------------------------------------------------------------- stock
def warehouse_stock(conn, dicts, clean, codes):
    """`OITW`: the shelf, warehouse by warehouse.

    Worth reading before trusting: of seven warehouse codes only `01` holds
    anything to speak of (2,428 items), `02` holds seven and `5` holds one. A
    minimum is set on two items in the whole company and a maximum on none —
    which is why a minimum/maximum recommendation has nothing to stand on yet.
    """
    wanted = [c for c in dict.fromkeys(codes) if c]
    out = []

    for chunk in _chunks(wanted):
        out.extend(
            clean(row)
            for row in dicts(
                conn,
                f"""
                SELECT ItemCode AS code, WhsCode AS warehouse,
                       OnHand AS onHand, IsCommited AS committed,
                       OnOrder AS onOrder, MinStock AS min, MaxStock AS max,
                       MinOrder AS minOrder, AvgPrice AS avgPrice,
                       WasCounted AS counted, Locked AS locked
                FROM OITW
                WHERE ItemCode IN ({_in(chunk)})
                  AND (OnHand <> 0 OR IsCommited <> 0 OR OnOrder <> 0
                       OR MinStock <> 0 OR MaxStock <> 0)
                """,
            )
        )

    return out


def stock_counts(conn, dicts, clean, limit):
    """`OINC` + `INC1`: the counts themselves, with the variance each found."""
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} DocEntry AS docEntry, DocNum AS docNum,
                   CountDate AS countedOn, PostDate AS postedOn,
                   Status AS status, CountType AS kind,
                   DiffQty AS varianceQty, DiffPercen AS variancePct,
                   Remarks AS remarks, Ref2 AS reference
            FROM OINC
            ORDER BY CountDate DESC, DocNum DESC
            """,
        )
    ]

    if not heads:
        return []

    by_entry = {head['docEntry']: head for head in heads}

    for head in heads:
        head['lines'] = []

    entries = ','.join(str(e) for e in by_entry)

    for row in dicts(
        conn,
        f"""
        SELECT L.DocEntry AS docEntry, L.LineNum AS line,
               L.ItemCode AS code, L.ItemDesc AS name,
               L.WhsCode AS warehouse, L.InWhsQty AS onRecord,
               L.Counted AS counted, L.CountQty AS countedQty,
               L.Difference AS variance, L.DiffPercen AS variancePct,
               L.InvUoM AS uom, L.Freeze AS frozen, L.Remark AS remark
        FROM INC1 L
        WHERE L.DocEntry IN ({entries})
        ORDER BY L.DocEntry, L.LineNum
        """,
    ):
        line = clean(row)
        by_entry[line.pop('docEntry')]['lines'].append(line)

    return heads


# --------------------------------------------------------------------- batches
def batches(conn, dicts, clean, limit, codes):
    """`OBTN` + `OBTQ`, weighted towards the items the fixture carries.

    A batch has a key (`AbsEntry`) and a number (`DistNumber`), and they are not
    the same thing: 2,914 numbers are shared by more than one item, because a
    supplier's own batch number is whatever the supplier printed. The console
    keeps both for that reason.

    Two sets, in this order:

    * every batch that still holds stock, for every item the fixture carries
      — all of them, uncut. For a batch-managed item SAP's on-hand is exactly
      the sum of its batches, and a sample that keeps only the newest batches
      leaves older stock with no batch at all: on-hand says 32.6 kg, the
      batches 4 kg, and FEFO finds nothing to draw. Taking the stocked
      batches whole is what keeps the two equal.
    * then the newest batches of those items, empty ones included, up to
      `limit` more — the history the trace screens show.
    """
    wanted = [c for c in dict.fromkeys(codes) if c]
    out = []
    seen = set()

    for chunk in _chunks(wanted):
        for row in dicts(
            conn,
            f"""
            SELECT b.AbsEntry AS batchKey, b.DistNumber AS batch,
                   b.ItemCode AS code, i.ItemName AS itemName,
                   b.InDate AS receivedOn, b.ExpDate AS expiresOn,
                   b.MnfDate AS producedOn, b.MnfSerial AS supplierBatch,
                   b.Notes AS notes, b.Status AS status,
                   b.CreateDate AS createdOn,
                   q.Quantity AS quantity, q.WhsCode AS warehouse
            FROM OBTN b
            JOIN OITM i ON i.ItemCode = b.ItemCode
            JOIN OBTQ q ON q.MdAbsEntry = b.AbsEntry
            WHERE b.ItemCode IN ({_in(chunk)}) AND q.Quantity > 0
            ORDER BY b.AbsEntry DESC
            """,
        ):
            one = clean(row)

            # A batch split over two warehouses is one batch: its rows add up.
            if one['batchKey'] in seen:
                kept = next(r for r in out if r['batchKey'] == one['batchKey'])
                kept['quantity'] = (kept['quantity'] or 0) + (one['quantity'] or 0)
                continue

            seen.add(one['batchKey'])
            out.append(one)

    stocked = len(out)

    for chunk in _chunks(wanted):
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} b.AbsEntry AS batchKey, b.DistNumber AS batch,
                   b.ItemCode AS code, i.ItemName AS itemName,
                   b.InDate AS receivedOn, b.ExpDate AS expiresOn,
                   b.MnfDate AS producedOn, b.MnfSerial AS supplierBatch,
                   b.Notes AS notes, b.Status AS status,
                   b.CreateDate AS createdOn,
                   q.Quantity AS quantity, q.WhsCode AS warehouse
            FROM OBTN b
            JOIN OITM i ON i.ItemCode = b.ItemCode
            LEFT JOIN OBTQ q ON q.MdAbsEntry = b.AbsEntry
            WHERE b.ItemCode IN ({_in(chunk)})
            ORDER BY b.AbsEntry DESC
            """,
        ):
            one = clean(row)

            if one['batchKey'] in seen:
                continue

            seen.add(one['batchKey'])
            out.append(one)

    return out[: stocked + limit]


def batch_movements(conn, dicts, clean, keys, per_batch=8):
    """`OITL` + `ITL1`: every document that touched a batch.

    `OITL` names the other party, and for a delivery or a customer return that
    party is a patient. The party is dropped for those document types — the
    console shows the document and what moved, and nothing about who received it.
    """
    wanted = [k for k in dict.fromkeys(keys) if k is not None]
    out = []

    for chunk in _chunks(wanted, 100):
        entries = ','.join(str(k) for k in chunk)

        for row in dicts(
            conn,
            f"""
            SELECT batchKey, docType, docNum, docDate, quantity,
                   direction, party, partyCode
            FROM (
                SELECT q.MdAbsEntry AS batchKey, l.DocType AS docType,
                       l.DocNum AS docNum, l.DocDate AS docDate,
                       q.Quantity AS quantity, l.StockEff AS direction,
                       l.CardName AS party, l.CardCode AS partyCode,
                       ROW_NUMBER() OVER (
                           PARTITION BY q.MdAbsEntry
                           ORDER BY l.DocDate DESC, l.LogEntry DESC
                       ) AS rn
                FROM ITL1 q
                JOIN OITL l ON l.LogEntry = q.LogEntry
                WHERE q.MdAbsEntry IN ({entries})
            ) ranked
            WHERE rn <= {per_batch}
            ORDER BY batchKey, docDate DESC
            """,
        ):
            one = clean(row)

            if one.get('docType') in CUSTOMER_DOCS:
                one['party'] = None
                one['partyCode'] = None

            out.append(one)

    return out


# ------------------------------------------------------------------ production
def production_orders(conn, dicts, clean, limit):
    """`OWOR` + `WOR1`: the order, what it made and what it consumed."""
    heads = [
        clean(row)
        for row in dicts(
            conn,
            f"""
            SELECT TOP {limit} w.DocEntry AS docEntry, w.DocNum AS docNum,
                   w.ItemCode AS code, i.ItemName AS itemName,
                   w.PlannedQty AS plannedQty, w.CmpltQty AS completedQty,
                   w.RjctQty AS rejectedQty, w.Status AS status,
                   w.Type AS kind, w.PostDate AS openedOn,
                   w.DueDate AS dueOn, w.CloseDate AS closedOn,
                   w.Warehouse AS warehouse, w.Comments AS comments,
                   w.PlannedQty - w.CmpltQty AS openQty
            FROM OWOR w
            JOIN OITM i ON i.ItemCode = w.ItemCode
            ORDER BY w.PostDate DESC, w.DocNum DESC
            """,
        )
    ]

    if not heads:
        return []

    by_entry = {head['docEntry']: head for head in heads}

    for head in heads:
        head['components'] = []

    for chunk in _chunks(list(by_entry)):
        entries = ','.join(str(e) for e in chunk)

        for row in dicts(
            conn,
            f"""
            SELECT L.DocEntry AS docEntry, L.LineNum AS line,
                   L.ItemCode AS code, L.ItemName AS name,
                   L.BaseQty AS perRun, L.PlannedQty AS plannedQty,
                   L.IssuedQty AS issuedQty, L.wareHouse AS warehouse,
                   L.IssueType AS issue, L.UomCode AS uom,
                   L.LineText AS note, L.U_LotNumber AS lotNumber,
                   L.U_ChinaName AS chineseName
            FROM WOR1 L
            WHERE L.DocEntry IN ({entries})
            ORDER BY L.DocEntry, L.LineNum
            """,
        ):
            line = clean(row)
            by_entry[line.pop('docEntry')]['components'].append(line)

    return heads
