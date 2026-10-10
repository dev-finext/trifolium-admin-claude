# Trifolium — every source there is

Orientation for someone — or something — picking this project up cold. It is a
map, not a tutorial: what exists, where it is on this machine, what it is good
for, and which parts are authoritative when two of them disagree.

Paths are absolute, as they are on Avichai's machine. Anything under
`C:\VS-Code-projects\Trifolium_admin_claude\` is also in the GitHub repository;
everything else is local only.

Read **§1**, then **§10**, then whatever the task needs.

---

## 1 · What the business is, in one page

Trifolium is an Israeli compounding pharmacy that sells to **licensed
practitioners** — naturopaths, herbalists, Chinese-medicine therapists — and not
to the public. A practitioner either buys shelf products or composes a custom
herbal formula for a named patient: a preparation form (tincture, capsules,
powder, tea, decoction, gel, cream, oil), ingredients, a dose and written
patient directions. The pharmacy compounds it in its own lab and either ships it
by courier or holds it for pickup.

Three facts shape nearly every screen:

- **An order can be paid by the practitioner or by the patient.** When the
  patient pays, a payment link goes to them over WhatsApp and the order advances
  by itself once the money lands. Links live 7 days; on expiry the order is
  cancelled and its stock released.
- **Patient personal data never leaves the local system.** It is not sent to
  SAP, and it is not in this repository in any real form.
- **The whole business runs on SAP Business One today**, and is being moved off
  it. That migration is the reason most of this material exists.

### The three systems, and which is which

| | What it is | Where |
|---|---|---|
| **SAP Business One** | The live system of record today. Practitioners are BusinessPartners, herbs and products are Items, orders are Sales Orders. | §4 |
| **Old production** | The PHP site the practitioners use now, talking to SAP through a REST gateway. | §3.3 |
| **New production** | A Laravel 12 rebuild, in progress, that is to replace both. | §3.4 |
| **This console (demo)** | A Vue 3 back-office prototype built on the real data, used to specify the new system screen by screen. Not production. | §3.1 |

The console is **specification, not deployment**. Its job is to be exact enough
that the Laravel team can build from it. That is why its data is real and why
"it must feel completely real" is a standing rule (§10).

---

## 2 · Start here

| Question | File |
|---|---|
| How is the console organised, and what are the domain rules? | `C:\VS-Code-projects\Trifolium_admin_claude\README.md` |
| What is in the browser database and why is it a database at all? | `C:\VS-Code-projects\Trifolium_admin_claude\database\README.md` |
| What is real in the fixture, what is pseudonymised, what is never read? | `C:\VS-Code-projects\Trifolium_admin_claude\resources\js\demo\real\README.md` |
| What does the SAP system actually do, end to end? | `C:\temp\DB_DUMP Trifolium\analysis\trifolium_business_processes.md` |
| What does each SAP table and user-defined field mean? | `C:\temp\DB_DUMP Trifolium\analysis\trifolium_data_dictionary.md` |

---

## 3 · The code

### 3.1 Admin console — this repository

```
C:\VS-Code-projects\Trifolium_admin_claude
https://github.com/dev-finext/trifolium-admin-claude   (branch: main)
```

Vue 3.5 · Vite 6 · Pinia 3 · vue-i18n 11 · PGlite (PostgreSQL in WASM).
Hebrew RTL is the source language; an English toggle switches the whole console,
record content included, and flips to LTR.

Deployed on every push to `main` as a **demo** build on GitHub Pages
(`.github/workflows/pages.yml`, built with `BASE_PATH=/trifolium-admin-claude/`).

| Directory | What lives there |
|---|---|
| `resources\js\config\` | Permanent product configuration — statuses, thresholds, taxonomies, VAT, credit terms. **No sample records, ever.** 26 files. |
| `resources\js\demo\` | Every fabricated record, and nothing else. 24 builder files. |
| `resources\js\demo\real\` | 31 JSON files read straight out of the SAP backup. See §5. |
| `resources\js\data\source.js` | The single seam between the console and its data. Repointing at a real backend is a change to this one file. |
| `resources\js\stores\` | Pinia, one per domain. 22 stores. |
| `resources\js\views\` | One per navigation item. 25 views, 29 routes. |
| `resources\js\components\ui\` | Shared primitives: `ADrawer`, `AModal`, `ADataTable`, `AChip`, `ACard`, `AInput`, `ASelect`, `ConfirmDialog`, filters. |
| `resources\js\components\<area>\` | 18 area folders: orders, items, inventory, production, purchasing, finance, messaging, deliveries, safety, stickers, pricing, content, users, system, wallet, ingredients, layout, ui. |
| `resources\js\locales\he\` · `\en\` | One catalog file per area. ~6,120 keys each side, kept equal by `check:i18n`. |
| `resources\js\lib\` | money, dates, clock, localized records, units, print, csv, **xlsx** (dependency-free writer), barcode, ladder, facets, draft. |
| `resources\js\composables\` | `useUrlState`, `useListFilters`, `useLocalized`, `useToast`, `useSaveGuard`, `useScrollLock`, `usePrepSheet`, `useProductionSheet`, `useSendToLab`, `useStickerData`. |
| `resources\css\admin.css` | The component layer. **This file is the design.** Read its comment blocks before touching layout — several record decisions that must not be re-litigated (see §11). |
| `database\` | The schema and its generator. See §6. |
| `scripts\` | The checks and the SAP extractor. See §5, §9. |
| `dev\questions-2026-09-29.md` | The written questions before the eleven-item round, with the assumptions taken where no answer was needed. Hebrew. |

**Two architectural rules.** They are in `README.md` and they are load-bearing:

1. **Configuration and sample content never share a file.** `config/` has no
   records; `demo/` has every record.
2. **No user-visible string lives in a component.** Interface text comes from
   `locales/` through `t()`. Record content travels with the record as a
   `{ he, en }` pair, authored with `L()` and read with `loc()`.

Two more worth knowing, learned the hard way:

3. **The URL is the state** (`composables\useUrlState.js`). Every open record is
   an address — `?item=100002`. This is what made minimised windows nearly free.
4. **Editors and dialogs are actions, not addresses** (`views\ItemsView.vue:45`).
   Drawers are addressable records; modals are forms. The split decides what can
   be minimised.

### 3.2 Practitioner frontend

```
C:\VS-Code-projects\trifolium-frontend-claude
https://github.com/dev-finext/trifolium-frontend-claude
```

Vue 3 + Inertia.js, built as a high-fidelity port of a Claude Design handoff,
targeting a Laravel backend. Frontend only — every backend seam is marked
`// TODO(backend)`. `npm run preview` serves it with mock props over a tiny
Inertia-speaking middleware, no Laravel needed.

Pages: `Home`, `Catalog`, `Compounding` (the formula wizard), `Cart`,
`MyFormulas`, `Wallet`, `Contact`, `orders/`, `profile/`, `articles/`, `auth/`.

Its `docs\` folder is listed in §7.

### 3.3 Old production — the system running today

```
C:\BUS\Old-Trifolium\public_html\          the PHP site, file by file
C:\BUS\Old-Trifolium\allcode_of_old_my_trifolium.txt   (100 MB, the whole thing as one file)
```

Plain PHP talking to SAP over REST. Useful when you need to know *what the
pharmacy actually does today* rather than what anyone intends. The names tell
the story: `BasketV2.php`, `OrdersV2.php`, `OrdersV3.php`, `ClientInfoModalV2.php`,
`SMSPaymentSender.php`, `SimplePaymentRequestWithInvoiceAndCustomer.php`,
`ClientSignatureCanvas.js`, `MakePDF\`, `PDFs\`.

The 100 MB single-file dump is for grepping. Do not read it whole.

### 3.4 New production — the Laravel rebuild

```
C:\BUS\Trifolium_2026
```

Laravel 12 · PHP 8.4 · MySQL. Its own `CLAUDE.md` (252 lines) carries the
project's rules — controller namespaces (`Auth\`, `Admin\`, `Practitioner\`),
the authentication plan (email+password now, CardCode + 4-digit PIN via SAP
later), and **"do not write tests unless explicitly asked."**

What matters most when comparing against the console:

- `app\Enums\OrderStatus.php` — **seven** values: `pending_payment`, `paid`,
  `in_production`, `ready_for_delivery`, `shipped`, `completed`, `cancelled`.
  SAP has eight states and they do not map cleanly (§11).
- `app\Enums\` — 42 enums in all: `Payer`, `PaymentTerms`, `DeliveryType`,
  `DeliveryCompany`, `FormulaType`, `TreatmentStyle`, `UnitOfMeasure`,
  `PurchaseOrderStatus`, `SapSync*`, `UserStatus`, `Role`.
- `app\Models\` — 31 models: `Order`, `OrderItem`, `OrderStatusHistory`,
  `Patient`, `PatientFormula`, `Product`, `Inventory`, `Supplier`,
  `PurchaseOrder`, `SapSyncLog`, `AuditLog`, `User`.
- `app\Console\` — scheduled commands. `CancelStaleOrders` is a migration
  landmine; see §11.

Also in that folder: `SAP_Buffer_Server_Spec.pdf` — the spec for the buffer
server that mirrors SAP into a local database and pushes changes back.

### 3.5 Things that look relevant and are not

| Path | Verdict |
|---|---|
| `C:\VS-Code-projects\trifo-based-structure` | An **empty** Laravel 13 + Vue starter kit (`laravel/blank-vue-starter-kit`). One model, `User`. No Trifolium content. |
| `C:\VS-Code-projects\Trifolium_data_sap` | A **stale copy of the admin console**, not SAP data — its README is this repo's README. Ignore it; work in `Trifolium_admin_claude`. |
| `C:\VS-Code-projects\supplier-portal` | A separate vanilla-JS supplier-portal demo (phone + OTP, order approval, Excel export). Related product, different project. |

---

## 4 · The SAP database

The pharmacy's production backup, restored locally and queryable.

```
Backup   C:\temp\DB_DUMP Trifolium\TR_backup_2026_08_05_180002_6205496.bak
         7.3 GB compressed · 64.5 GB restored · taken 5.8.2026
Engine   SQL Server 2025 Developer, default instance MSSQLSERVER, Windows auth
Database TR
Files    C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\TR_TR.mdf  (~61 GB)
Connect  Server=localhost;Database=TR;Trusted_Connection=yes;Encrypt=no
         Python package `mssql-python`, or SSMS / Azure Data Studio to localhost
```

**The demo clock is pinned to the day this backup was taken** —
`2026-08-05 14:05`, in `resources\js\demo\clock.js`. The newest real document in
the fixture is therefore "today", and every relative date is an offset from it.

### Never read these

Binding, not advisory. The database holds live personal and medical data.

| | |
|---|---|
| `RCT3` | credit card numbers and CVV |
| `ORDR.U_CreditCardNumber`, `ORDR.U_CVV`, `ORDR.U_Token`, `ORDR.U_EntertPass` | payment credentials on the order |
| `OCRD.Password`, any `U_*Password*` | portal passwords |
| `@SPR_STICKER` | printed stickers — they carry recipient details |

`scripts\extract-sap\extract.py` states this in its own docstring, and every
query it runs is a `SELECT`. Nothing in this project writes to SQL Server.

### The analysis — read this before querying anything

```
C:\temp\DB_DUMP Trifolium\analysis\
```

| File | What it is |
|---|---|
| `README.md` | How the restore was done, how to connect, and the warnings. |
| `trifolium_business_processes.md` (38 KB) | **The main document.** What the system is, its architecture, the business entities, the end-to-end order process, production and inventory, purchasing, pricing and accruals, the consumer web shop, finance and regulation, CRM, users, codes and statuses, volumes, and migration notes. |
| `trifolium_data_dictionary.md` (175 KB) | The 88 relevant tables out of 2,857 — description, size, primary key, main columns, and **every user-defined field with its Hebrew SAP label, English meaning, valid values and fill rate.** Ends with all 605 tables that contain data. |
| `trifolium_schema.json` (3.3 MB) | The same, machine-readable: per table, all columns, types, fill and distinct statistics, UDFs with label, meaning and values. |
| `extracts\queries\` | **The 434 saved SAP queries**, one file each, named `number__category__name.sql`. This is how the pharmacy actually reads its own data. Category `חיפושים מובנים` = formatted searches that auto-fill fields. |
| `extracts\modules\` | Full SQL source of the custom stored procedures, triggers, functions and views — `SBO_SP_*`, `SBOM_*`, the batch and preparation functions, add-on procedures. |
| `extracts\csv\` | Configuration and statistics: groups, properties, price lists, series, users, `sap_user_fields_CUFD.csv` (UDF definitions) and `sap_udf_valid_values_UFD1.csv` (their valid values), `udt_data\` (user-defined tables), yearly volumes, document flows, `column_usage.csv`, `udf_stats.csv`, `udf_top_values.csv`. |
| `scripts\` | `restore.py`, `explore.py`, `extract_schema.py`, `build_summary.py`, `fixups.py`, `db.py`. Re-runnable. |

Ad-hoc query:

```bash
PYTHONUTF8=1 python "C:\temp\DB_DUMP Trifolium\analysis\scripts\explore.py" "SELECT TOP 10 DocNum, U_OrderState FROM ORDR ORDER BY DocEntry DESC"
```

### Queries worth knowing by name

```
C:\temp\DB_DUMP Trifolium\analysis\extracts\queries\
  0641__מלאי__דו__ח ירון ניתוח מלאי.sql
  0649__…ללא בחירת קבוצה.sql
  0654__…ללא בחירת קבוצה - ללא ספירת מלאי.sql      ← the one the console reproduces
  0655__…בדיקה.sql
  0335__מלאי__בדיקת הגעה למלאי מינימום.sql
  0353__מלאי__3. דוח ספירת מלאי.sql
```

`0654` is Yaron's stock-analysis report. The console reproduces it **exactly** —
`resources\js\config\stockAnalysis.js` and `views\StockAnalysisView.vue` — so
that his personal Excel workbook keeps working against the new system. Verified
byte-identical over 14,292 cells. Its definition of consumption is the reference
for everything else: `OINM` minus TransTypes 10000071 / 19 / 21 / 60, plus
`OIGE`/`IGE1` with BaseType 202. **TransType 67 (transfers) is included** — an
earlier extract wrongly excluded it, which was the entire disagreement.

### Gap analysis

```
C:\temp\DB_DUMP Trifolium\gap-analysis\Trifolium_SAP_Separation_Gap_Analysis_v1.docx
```

What separating from SAP costs, by domain.

---

## 5 · The extract — SAP to fixture

```
C:\VS-Code-projects\Trifolium_admin_claude\scripts\extract-sap\
  extract.py     the extraction: every query, and the COUNTS map at the top
  db.py          the connection (read-only by convention)
  people.py      pseudonymisation
  purchasing.py  the purchasing documents
```

```bash
PYTHONUTF8=1 python scripts/extract-sap/extract.py
```

Writes 31 JSON files into `resources\js\demo\real\`. Its README there is the
authority on **what is real and what is not** — read it before trusting a figure.

**Real, verbatim:** item stock levels, minimum and maximum levels, units of
measure, last purchase prices, alcohol and oil percentages, extraction ratios,
pregnancy / breastfeeding / under-two restrictions, site names and quantities,
creation and update dates. On orders: dates, states, totals, VAT, discounts,
points, the content/units/size trio, the preparation concentration, the
patient's written instructions, the safety answers, the courier, the pickup
point. Plus `orderStates`, `prepTypes`, `categories`, `itemGroups`,
`warehouses`, `pickupPoints`, `contentSizes`, `valueLists`, `boms`,
`priceTiers`, `batches`, supplier company data, and the purchasing paper trail:
60 purchase requests, 160 purchase orders, 140 goods receipts, 180 supplier
invoices, 180 production orders, 25 stock counts.

**Pseudonymised at extraction time:** every name, national ID, phone, email,
clinic name and street, on practitioners, patients, orders and supplier
contacts. Deterministic — one real card code always yields the same fictitious
person — so a patient, their practitioner and their orders stay linked.

**Shapes that cannot collide with a real identifier:** phones in the unallocated
`000` subscriber block, national IDs 9-prefixed with a deliberately wrong check
digit, company numbers 8-prefixed, emails under a reserved domain. Enforced by
`scripts\check-fixture-privacy.mjs` (`npm run check:privacy`).

One more thing the fixture does, which is easy to miss: the seeded purchase
requests and orders in `resources\js\demo\buying.js` keep the real document
numbers, so a sheet created on screen takes the **next number in SAP's own
series** — 2600008 for a request, 2600164 for an order. Their working notes are
rewritten, because the real ones name staff and suppliers' contacts by first
name and this build is published.

---

## 6 · The console's own database

PostgreSQL 17 compiled to WebAssembly by PGlite, running inside the page, its
data directory persisted to the browser's IndexedDB. The DDL in `schema.sql` is
what runs; the foreign keys are enforced; a join is a join.

```
C:\VS-Code-projects\Trifolium_admin_claude\database\
  spec.mjs     the one description of every table: key, typed columns, child rows, foreign keys
  schema.mjs   turns the spec into DDL
  schema.sql   the generated DDL — readable artefact, DO NOT EDIT
  rows.mjs     projects fixture records into rows
  README.md    why it is in the browser at all
```

Current: **57 tables, 5,052 records.** Regenerate and verify with
`npm run db:schema` (same script as `check:db`).

Three data sources, chosen by `VITE_DATA_SOURCE`:

| Mode | Behaviour | Set in |
|---|---|---|
| `db` | PGlite + a read-model cache in IndexedDB. **Changes survive a reload.** | `.env.development` — the dev-server default |
| `demo` | The same records assembled in memory, nothing kept. Clean slate every load. | `.env.example`; the GitHub Pages build |
| `api` | The real backend. The fixture branch folds at compile time, so the records are **removed from the bundle**, not merely bypassed — `check:build` proves it. | `.env.production` |

**Consequence worth remembering:** in `db` mode a fixture change does not appear
until the database is rebuilt. In the console: **ניהול מסד הנתונים → בנייה
מחדש**. In code: `dataset.reset()` → `resetData()` in `data\source.js`.

---

## 7 · Documents

### Specifications for the new system

```
C:\BUS\Trifolium_2026\docs\
  Trifolium Backend Spec V1.2.html / .txt   (51 KB / 31 KB) — the backend specification
  Trifolium V2.6.html                       (6.2 MB) — the full product specification
  SAP_API.md                                (21 KB) — the SAP REST gateway, endpoint by endpoint, mapped to the old PHP code (written in Russian)
  SAP_DATA_MIGRATION.md                     (11 KB)
  MIGRATION_PLAN.md                         (5 KB) — SAP MSSQL → Laravel MySQL, databases and procedure
  PATIENTS_REFERENCE.md                     (12 KB)
  questions_for_manager.md                  (9 KB)
  SAP_*_response.json                       (8 files) — captured gateway responses: categories, item properties, items by family (000 raw materials, 100 herbs, 118 shop, 119 medicines, 143 private label), shelf item groups, one single item
C:\BUS\Trifolium_2026\SAP_Buffer_Server_Spec.pdf
```

The SAP gateway, from `SAP_API.md`: base URL `https://gw.trifolium.co.il:55556/SAPB1_API/`
(port 55555 must not be used), authenticated by a header API key, no sessions —
every request carries the key.

### The checkout specification (frontend repo)

```
C:\VS-Code-projects\trifolium-frontend-claude\docs\
  CHECKOUT-PAYER-AND-DELIVERY.md      who pays, who receives — the developer document
  Checkout - who pays, who receives.docx   the same, two pages, for handing over
  CHECKOUT-DIAGRAM-PROMPT.md          a prompt for Claude Design to draw the flow
  CONVERSION-GUIDE.md                 the Claude Design handoff → Vue port
  I18N-GUIDE.md
  UX-AUDIT.md
```

### Design brief

```
C:\VS-Code-projects\Trifolium_Admin_Design_Prompt.md   (328 lines)
```

The original brief the admin console was designed from. Still the clearest
statement of the product context and the quality bar: *"the Order Management
area must be so clear and complete that a support agent can understand and
control everything about any order in seconds."*

---

## 8 · Memory — decisions and answers not in any code

```
C:\Users\GAL-OR\.claude\projects\C--VS-Code-projects-Trifolium-admin-claude\memory\
```

`MEMORY.md` is the index. These hold what the user decided, what the data proved,
and what is still open — none of it derivable from the code:

| File | What it settles |
|---|---|
| `accounting-three-systems.md` | After SAP: the admin owns operations, a SaaS issues documents, the accountant's Priority holds the books. |
| `icount-quote.md` | The September 2026 sales conversation — plan, per-document pricing, API modules, terminal costs, Priority export. |
| `icount-migration-plan.md` | Go-live 1.1.2027, numbering from 2700001, who works where, what does not migrate. |
| `trifolium-open-balances.md` | What is actually open in SAP before the cutover, and the two traps in that data. |
| `sap-item-master.md` | The item card must equal `OITM` field for field — and which fields are real. |
| `item-card-open-threads.md` | Which fields are ours and which are SAP's; the questions still unanswered. |
| `v3-planning-batches.md` | The saved query that defines consumption, the cover formula, the batch-number facts. |
| `order-state-closed-vs-sent.md` | The 2024 workflow cutover, and what actually separates סגור from נשלח. |
| `natalie-batch-numbering.md` | Excel running number today; waste batches named after the production order; auto-expiry by type. |
| `decisions-2026-09-15.md` | The item-card split, production, ladders, accounting answers — and the calls flagged back to the user. |
| `working-style.md` · `ui-simplicity.md` | How to work here. Reproduced in §10. |

---

## 9 · Running and verifying

```bash
cd C:\VS-Code-projects\Trifolium_admin_claude
npm install
npm run dev            # port 5183 — see .claude\launch.json
```

| Command | What it proves |
|---|---|
| `npm run lint:check` | eslint, zero warnings |
| `npm run check:i18n` | every he key has an en counterpart and back; every `t()` key exists; every enum id has a label; **no Hebrew literal in a .vue file** |
| `npm run check:privacy` | no fixture identifier could collide with a real one |
| `npm run check:db` | the schema holds and every record is in it |
| `npm run build` | it compiles |
| `npm run check:build` | **no demo-only data reached a production bundle** |
| `npm run verify` | the first five — what CI runs for the demo deploy |
| `npm run verify:prod` | all six — run this before saying something is done |

The usual edit loop: write a script to the scratchpad with an
assert-exactly-one-match replace helper, apply it, then
`npx prettier --write` → `npx eslint --fix --max-warnings 0` →
`npm run verify:prod` → verify in the browser → commit → push.

**Shell traps on this machine.** Long Bash heredocs containing Hebrew fail;
`$TMPDIR` does not point at the scratchpad. Use the absolute scratchpad path, or
the Write tool.

---

## 10 · Standing rules

These are the user's, in force across sessions. They are not style preferences.

**Working method**
- **Questions at the start and at the end — not in the middle.**
- **If something is unclear or contradictory, do not build it.** Say so and let
  Avichai decide. Building something you do not understand, that cannot become
  real software later, is the worst available outcome.
- **The demo must feel completely real.** No placeholders, no "coming soon".
- **Never invent a field.** Every field needs a real SAP column behind it or an
  explicit request. `אל תמציא לעצמך שדות!`
- **Every field gets its own label.** No header row floating over bare inputs —
  in RTL the eye pairs them the wrong way. See the comment block at the end of
  `resources\css\admin.css`.
- Keep the existing visual design. Code cleanup at the end, not during. Tests
  are not part of this project. Work token-smart: no parallel agents, no
  double-verification.
- **Commit and push after every finished chunk, and say so.**

**Privacy** — see §4. The never-read list is binding, the fixture pseudonymises
every person, and `npm run check:privacy` is what holds the line before
anything is published.

---

## 11 · Traps, open questions, and stale text

Things that have already cost time once.

**Three different order-status systems.** SAP's `ORDR.U_OrderState` (UFD1
FieldID 85) has **eight** states, 1–8; there is no state 0, and state 6 סגור —
which the console originally did not have at all — is **59% of every order ever
placed**. The new Laravel `OrderStatus` enum has **seven**. The console derives
an order's status rather than storing it: it is the *lowest* stage among the
non-cancelled items. Two landmines found when these were mapped:

- `CancelStaleOrders` in `C:\BUS\Trifolium_2026\app\Console\` would cancel
  **17,711 migrated orders** on first run.
- SAP states 7 (on hold) and 8 (cancelled) were merged irreversibly in the
  migration mapping.

**Open, awaiting a decision from Avichai** — do not pick one unilaterally:

- What status a credit order that proceeds should carry: a third new status
  `on_credit`, or straight to `in_production`. This changes
  `CHECKOUT-PAYER-AND-DELIVERY.md`, the DOCX and the diagram prompt.
- The preparation types. The console carries 16; SAP has 14. The console invents
  `טינקטורה בנידוף` as four variants where SAP has one, has one type where SAP
  has two classic-Chinese ones, and treats SAP properties 15/19/20 (`מוצרי מדף`,
  `רשאי להנחת מוצר למטפלים`, `מבצע החודש`) as preparation types when they are
  item flags. **Not corrected** — it moves `typeId` on orders, the sticker
  templates and the lab.
- Whether to bring back any of the 16 purchasing components deleted in commit
  `5bfa782` — notably the **stock-planning report** with its cover and threshold
  columns, and the supplier invoices / payments / notes tabs. Git holds them.

**Do not try this a third time.** `resources\css\admin.css` ends with a comment
block recording that pinning the filter strip and letting the table scroll in its
own box was tried, and was wrong: the table lost more in height than it gained in
position. **A list screen scrolls as one page**, and the sticky header row is
what keeps the columns legible. A wide table scrolls sideways inside `.a-body`,
which is the scrollport for both axes.

**Stale text to be aware of:**

- `README.md` still describes the **V2 badge system** and the development-progress
  article at `/dev/progress`. Both were removed: `V2Badge.vue`, `stores/v2.js`,
  `views/dev/ProgressView.vue` and `resources/js/dev/progress.js` are gone,
  replaced by `components\ui\RBadge.vue` — a small blue **R** meaning "ready in
  production", with a hover tooltip. Which screens carry it is `ready: true` on
  the nav item in `resources\js\config\nav.js` — eight at present: orders, users,
  suppliers, safety, libraries, videos, admins, system contacts.
- `database\README.md` says 64 tables and ~6,200 records. It is **57 tables and
  5,052 records** as of now. Run `npm run db:schema` for the live figure.
- `C:\BUS\Trifolium_2026\docs\MIGRATION_PLAN.md` references
  `docs\import_sap_to_laravel.py`, and its `CLAUDE.md` references
  `.prod-reimport.md`. **Neither file is on disk.** Ask before assuming the
  procedure still holds.
