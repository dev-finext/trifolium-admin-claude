# Order migration, SAP → the new system — working instructions

> A prompt for the Claude responsible for production. Every number here was
> verified on 15.10.2026 against the restored backup
> `TR_backup_2026_08_05_180002_6205496.bak` (SAP Business One, database `TR`).
> Do not trust memory — if your database says something different, stop and ask.

---

## 0 · The rule that overrides everything else

**If anything is not unambiguous, stop and ask Avichai. Do not guess and do not
fill gaps on your own.**

This is a migration of 355,000 documents that cannot be run twice without
knowing exactly what the first run did. One wrong guess produces tens of
thousands of broken orders. Section 9 collects the questions already known to
be un-guessable, but it is not a closed list: anything not written here
explicitly is a question.

What you may do without asking: read, count, check, run SELECTs, build a
staging table, and compare numbers.

---

## 1 · The problem, in one line

In the old system **one website order was split across several `ORDR`
documents**. In the new system **one order is one record with several item
lines**. Your job is to merge them correctly — without losing a line, without
merging two different baskets into one, and without inventing a grouping where
the data does not state one.

---

## 2 · How SAP links order to order — the fact

**`ORDR.U_DocEntryWeb` is the website order number, and it is the basket.**
Every document of the same basket carries the same value.

This is not an interpretation — it is what the pharmacy's own SAP code does.
Three pieces of evidence, from objects that exist in the database:

```sql
-- dbo.GetDocOrderLineNumberByWebEntry — numbers the documents inside a basket
FROM ORDR WHERE U_DocEntryWeb = @DocWebEntry AND U_ItemName <> N'משלוח'

-- dbo.GetOrderTypes — returns the basket's other preparations
FROM ORDR WHERE U_DocEntryWeb = @DocEntryWeb AND U_ItemName <> N'משלוח'

-- SBOM_DeliveryNote — "how many orders are in this basket"
(SELECT COUNT(*) FROM ORDR WHERE U_DocEntryWeb = T0.U_DocEntryWeb
 AND U_ItemName <> N'משלוח') AS 'OrdersByWebOrder'
```

---

## 3 · The real structure — not what it looks like

**The split is not per item.** It is **one document per preparation**, plus
**one document for shipping**. Each document holds many item lines.

| Lines on a document | 1 | 3 | 6 | **7** | 8 | 10 | 15 | 30+ |
|---|---|---|---|---|---|---|---|---|
| Documents | 69,485 | 22,927 | 19,612 | **25,846** | 21,632 | 12,148 | 4,297 | 34 |

The fields that hold the structure:

| Field | Role |
|---|---|
| `ORDR.U_DocEntryWeb` | The basket — the website order number |
| `ORDR.U_ItemName` | The preparation type (tincture, capsules, powder, raw infusion, shelf products …). The value `N'משלוח'` marks the shipping document |
| `ORDR.U_NumFrom` | An `n/m` label on the preparation documents, empty on the shipping document. **See 7.2 — it is a label, not a count** |
| `RDR1` | The document's item lines |
| The shipping line | Item code `999016`–`999020` (on 41,961 of 41,962 shipping documents) |

A real basket, 5.8.2026 — four documents that are one order:

```
2640592 | 1/3 | shelf products            | ₪42.00
2640593 | 2/3 | tincture (glycerin+carob) | ₪186.00
2640594 | 3/3 | shelf products            | ₪206.97
2640595 |     | shipping                  | ₪15.00
```

---

## 4 · The merge key

```
basket_key = (ORDR.U_DocEntryWeb, ORDR.CardCode)   where U_DocEntryWeb > 0
```

**`CardCode` is mandatory in the key.** The website number is reused — see 7.1.
Without `CardCode` you will merge baskets belonging to different customers.

Documents with `CANCELED = 'Y'` **do not enter** the new order. If no document
survives that filter, the whole basket does not migrate.

### What becomes what

| In SAP | In the new system |
|---|---|
| A group of documents sharing one `basket_key` | **One order** |
| Every `RDR1` line across all documents in the group | **An item line on that order** |
| The document's `U_ItemName` | The preparation attribute of the lines that came from it |
| A document with `U_ItemName = N'משלוח'` | See question ❓3 — **do not decide alone** |

---

## 5 · The new field `is_old_order`

**A boolean on the order.**

- `is_old_order = true` — every order whose origin is the SAP migration. **All
  275,060 migrated orders get it** (179,878 merged + 95,182 with no website
  number).
- `is_old_order = false` — every order created in the new system from now on.

The field is **not nullable** and **does not change after the migration**. The
default for a new record in the system is `false`.

> Do not use it to drive business behaviour unless Avichai says so explicitly.
> At this stage its job is to identify origin, not to change logic.

---

## 6 · The 95,182 orders with no website number

74,517 documents with `U_DocEntryWeb = 0` and 20,665 with
`U_DocEntryWeb IS NULL` — **95,182** together. These are orders opened directly
in SAP (phone, counter, lab). They have no basket key of any kind: 79,275 of
them do not even carry a preparation type.

**Avichai's decision, 15.10.2026 — do not change it and do not ask about it
again:**

- **Each such document becomes one order of its own.** One to one, no grouping.
- **Every field that describes the basket is written `NULL`** — not `0`, not an
  empty string, not an invented value. `NULL` means "unknown", which is exactly
  the situation.
- `is_old_order = true` on them as well.

**Do not group them by `CardCode + DocDate`.** It is tempting — the same
customer on the same day holds 2 documents in 4,629 cases, 3 in 1,189, with a
tail up to 30 — but it is a guess. No field in the data says those documents
belong together.

---

## 7 · Two traps that will break a naive migration

### 7.1 The website order number is reused

The website numbering restarted. 2018–2023 ran `1` → `131,292`; 2024 jumped to
7 digits; 2025 to 8. The result: the same number describes two different
baskets.

Verified example — `U_DocEntryWeb = 20241`:

```
1911254 | 2019-08-06 | capsules | CardCode 100002   | ₪134
2640543 | 2026-08-05 |          | CardCode 10036408 | ₪430
```

Two different customers, seven years apart.

| Key | Numbers with more than one customer | Groups spanning more than 30 days |
|---|---|---|
| `U_DocEntryWeb` alone | **1,154** | 1,046 |
| `U_DocEntryWeb + CardCode` | 0 | **187** |

**Those remaining 187 groups must be reviewed by hand before the migration.**
Do not merge them automatically and do not split them automatically — export
them and bring them to Avichai.

```sql
SELECT U_DocEntryWeb, CardCode, COUNT(*) AS docs,
       MIN(DocDate) AS first_doc, MAX(DocDate) AS last_doc,
       DATEDIFF(day, MIN(DocDate), MAX(DocDate)) AS span_days
FROM   ORDR
WHERE  U_DocEntryWeb > 0 AND CANCELED = 'N'
GROUP BY U_DocEntryWeb, CardCode
HAVING DATEDIFF(day, MIN(DocDate), MAX(DocDate)) > 30
ORDER BY span_days DESC
```

### 7.2 `U_NumFrom` is a label, not a count

In **14,019 baskets** (2024 onward, not cancelled) the actual document count
differs from the `m` declared in `n/m`. In another 1,302 baskets there is no
`n/m` at all.

Live example — basket `2119082`:

```
2637004 | 17.07 | 1/1 powder | ₪289    ← plus a shipping document the same day
2637195 | 19.07 | 1/1 powder | ₪70
2637196 | 19.07 | 1/1 powder | ₪57
2637197 | 19.07 | 1/1 powder | ₪43      ← and three more like it
```

Seven documents all saying "1/1", added to the basket two days after it opened.

**Do not use `m` to decide a basket is complete, and do not skip a document
because `n` was already seen.** Count actual documents. `U_NumFrom` migrates as
a display label at most.

---

## 8 · Validation — the numbers that must come out

Run these **before** and after the migration. Any deviation = stop and ask.

```sql
-- a. baseline
SELECT COUNT(*) FROM ORDR;                                      -- 355,046

-- b. the split between merged-migration and one-to-one migration
SELECT SUM(CASE WHEN U_DocEntryWeb > 0 THEN 1 ELSE 0 END),      -- 259,864
       SUM(CASE WHEN U_DocEntryWeb = 0 THEN 1 ELSE 0 END),      --  74,517
       SUM(CASE WHEN U_DocEntryWeb IS NULL THEN 1 ELSE 0 END)   --  20,665
FROM ORDR;

-- c. the merge result (live documents only)
SELECT COUNT(*) AS new_orders, SUM(sap_docs) AS merged_docs, SUM(lines) AS item_lines
FROM ( SELECT O.U_DocEntryWeb, O.CardCode,
              COUNT(DISTINCT O.DocEntry) AS sap_docs,
              COUNT(L.LineNum)           AS lines
       FROM   ORDR O LEFT JOIN RDR1 L ON L.DocEntry = O.DocEntry
       WHERE  O.U_DocEntryWeb > 0 AND O.CANCELED = 'N'
       GROUP BY O.U_DocEntryWeb, O.CardCode ) m;
-- new_orders 179,878 | merged_docs 237,823 | item_lines 1,429,055
```

| Check | Required value |
|---|---|
| New orders from baskets | **179,878** |
| SAP documents absorbed into them | 237,823 |
| Item lines on them | **1,429,055** |
| New orders with no website number | **95,182** |
| Total orders with `is_old_order = true` | **275,060** |
| Shipping documents in the source data | 41,962 |

**Zero-loss check:** the sum of item lines across all new orders must equal
exactly the number of `RDR1` rows belonging to those documents. A line that
disappeared is a failed migration, not an edge case.

---

## 9 · Questions you may not guess — bring them to Avichai before writing code

❓**1 · The status of an order whose halves disagree.** In 25% of baskets the
documents sit in more than one `U_OrderState` at the same moment. In basket
`2119280`: the tincture is cancelled (8), the capsules were sent (5). **What
status does the merged order get?**

❓**2 · Cancelled documents inside a live basket.** If two of four preparations
were cancelled — does the new order contain two preparations, or four with two
marked cancelled?

❓**3 · Shipping.** In 41,962 baskets it is a separate document with item code
`99xxxx`. In the new system is it **an item line on the order** or **a field on
the order**? This changes line counts, totals and every report.

❓**4 · Where the SAP reference is stored.** `U_DocEntryWeb` and the list of
merged `DocNum`s must be kept, otherwise the migration cannot be audited and a
customer question cannot be answered. **In which fields?** Do not invent
fields — ask Avichai for the names.

❓**5 · The 187 ambiguous baskets** from 7.1 — merge, split, or leave out?

❓**6 · Re-runnability.** Is the migration one-shot or repeatable? If
repeatable, what key prevents duplicates?

❓**7 · Range.** All history from 2017, or only from a given year onward?

---

## 10 · Suggested order of work

1. Read section 9 and bring the questions to Avichai. **Do not start writing
   before you have answers.**
2. Build a staging table holding `basket_key → [DocNum]` and all the lines.
3. Run the section 8 checks against staging. Do not proceed until they match.
4. Export the 187 ambiguous baskets and bring them to Avichai.
5. Only then write to production, in one transaction that can be rolled back.
6. Run the section 8 checks again against the target.
