# Real data from the SAP database

Everything in this folder was read out of the restored production backup
`TR_backup_2026_08_05_180002_6205496.bak` (SAP Business One, database `TR`,
64.5 GB restored) on 8.9.2026. It is produced by
`scripts/extract-sap/extract.py`, which can be re-run at any time against the
local restore.

## What is real and what is not

**Real, verbatim** — every value below is the value SAP holds:

| File | Rows | Source |
|---|---|---|
| `orderStates.json` | 8 | `CUFD`+`UFD1` (ORDR/OrderState) with the live count per state |
| `prepTypes.json` | 17 | `OITG` — the item properties that name a preparation type |
| `categories.json` | 71 | `@CATEGORIES` — the consumer-site category tree |
| `itemGroups.json` | 48 | `OITB` |
| `warehouses.json` | 7 | `OWHS` |
| `pickupPoints.json` | 10 | `@DELIVERYPOINT` |
| `contentSizes.json` | 16 | `@COTENTSIZE` |
| `valueLists.json` | 8 lists | `CUFD`+`UFD1` — couriers, who pays, who receives, dosage units, instructions, use, limits |
| `ingredients.json` | 200 | `OITM` families 10/11/12/13/14/15/30, in proportion to the real catalogue |
| `products.json` | 100 | `OITM` families 50/55/16 |
| `boms.json` | 50 | `OITT`+`ITT1`, with components |
| `priceTiers.json` | 400 | `SPP2` (`CardCode = '*8'`) — the consumer quantity tiers |
| `batches.json` | 120 | `OBTN`+`OBTQ` |
| `suppliers.json` | 40 | `OCRD` CardType S — company data |
| `orders.json` | 50 | `ORDR`+`RDR1`, all eight states represented, 250 real lines |

Item stock levels, minimum and maximum levels, units of measure, last purchase
prices, alcohol and oil percentages, extraction ratios, pregnancy /
breastfeeding / under-two restrictions, site names and quantities, creation and
update dates — all real. On orders: dates, states, totals, VAT, discounts,
points, the content / units / size trio, the preparation concentration, the
patient's written instructions, the safety answers, the courier and the pickup
point — all real.

**Pseudonymised** — replaced at extraction time, so no real personal detail
reaches this repository:

| File | What changed |
|---|---|
| `practitioners.json` | name, national ID, phone, email, clinic name, street |
| `patients.json` | the same |
| `orders.json` | only the names, phone and ID on the order |
| `suppliers.json` | the contact person, phone, email and company number |

The replacement is deterministic — one real card code always yields the same
fictitious person — so a patient, their practitioner and their orders stay
consistently linked. Everything that is not a personal identifier stays real:
the city, the therapy field, the discounts, the balance, the order count, the
month-end-payer and self-pickup flags, the dates.

The shapes follow `scripts/check-fixture-privacy.mjs`: phones in the unallocated
`000` subscriber block, national IDs 9-prefixed with a deliberately wrong check
digit, company numbers 8-prefixed, emails under a reserved domain.

**Never read at all:** `RCT3` (credit card numbers and CVV), `ORDR.U_CreditCardNumber`,
`ORDR.U_CVV`, `ORDR.U_Token`, `ORDR.U_EntertPass`, portal passwords, and
`@SPR_STICKER` (printed stickers carry recipient details).

## Two things the extract proved wrong in the console

**The order states.** See `resources/js/config/statuses.js` — SAP holds eight,
1 to 8; there is no state 0, and state 6 סגור, which was missing entirely, is
59% of every order ever placed. Corrected in this branch.

**The preparation types.** The console carries 16, four of which SAP does not
have: it invents `טינקטורה בנידוף` as four separate variants (גליצרין, דבש,
חרוב, מולסה) where SAP has one. SAP also has two classic-Chinese types
(`8 Tincture-Tang`, `9 אבקה`) where the console has one. And SAP's properties
15 / 19 / 20 (`מוצרי מדף`, `רשאי להנחת מוצר למטפלים`, `מבצע החודש`) are item
flags, not preparation types — so the real count of preparation types is 14,
not 17. **Not yet corrected** — it changes `typeId` on orders, the sticker
templates and the lab, so it needs a decision first.

## Re-running the extraction

Needs the local restore (see `C:\temp\DB_DUMP Trifolium\analysis\README.md`)
and `pip install mssql-python`:

```
PYTHONUTF8=1 python scripts/extract-sap/extract.py
```

Sample sizes are the `COUNTS` map at the top of that file.
