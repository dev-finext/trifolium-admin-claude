# Trifolium Admin

Back-office console for **Trifolium**, an Israeli compounding pharmacy that serves
licensed practitioners — naturopaths, herbalists, Chinese-medicine and other
complementary-medicine therapists.

The practitioner-facing app is a separate project
([`trifolium-frontend`](https://github.com/dev-finext/trifolium-frontend-claude)).
This repository is the console the pharmacy's own staff use to run the operation:
approve practitioners, drive orders end to end, manage the lab queue and
deliveries, message customers on WhatsApp, issue documents and collect debt, and
maintain the clinical and catalog data.

Hebrew (RTL) is the source language. **An English toggle in the top bar switches
the entire console**, including the record content, and flips the layout to LTR.

## Running it

```bash
npm install
npm run dev
```

The console boots against a demo fixture, so it is fully interactive without a
backend. Nothing is stubbed out: filters filter, sorts sort, dialogs commit,
and the changes persist for the session.

```bash
npm run build          # production bundle into dist/
npm run preview        # serve the built bundle
npm run lint           # eslint --fix
npm run format         # prettier --write
```

## How the code is organised

```
resources/
  css/
    app.css        Tailwind entry + design tokens exposed as Tailwind theme vars
    admin.css      the component layer — this file is the design
  js/
    app.js         entry: pinia, router, i18n
    App.vue        root shell
    config/        permanent product configuration — business rules only
    demo/          every fabricated record, and nothing else
    data/source.js the seam between the console and its data
    locales/he|en/ one catalog file per area
    lib/           money, dates, clock, localized-record helpers
    stores/        pinia, one per domain
    components/
      ui/          shared primitives (chips, tables, drawers, dialogs, filters)
      layout/      shell, nav, top bar, search, locale toggle
      <area>/      per-area components
    views/         one per navigation item
```

### Two rules worth knowing before you edit

**Configuration and sample content never share a file.** `config/` holds
permanent product configuration — statuses, thresholds, taxonomies, VAT, credit
terms — and contains no sample records at all. Every fabricated order, person,
price and batch lives in `demo/` and is reached through `data/source.js`.
Repointing the console at a real backend is a change to that one file:

```bash
VITE_DATA_SOURCE=api VITE_API_BASE=/api/admin npm run build
```

**No user-visible string lives in a component.** Interface text comes from
`locales/<lang>/<area>.js` through `t()`. Record content — a practitioner's name,
a herb, a message that was actually sent — travels with the record as a
`{ he, en }` pair, authored with `L()` and read with `loc()`:

```js
// demo/people.js
name: L('רונית מרדכי', 'Ronit Mordechai'),
```

```vue
<!-- any component -->
{{ loc(practitioner.name) }}
```

Free-text search matches either language, so a Hebrew query still finds a record
while the console is in English.

## Domain notes that are easy to get wrong

- **Order status is derived, not stored per order.** Every compounded formula
  carries its own stage; an order's status is always the *lowest* stage among its
  non-cancelled items. There are no split orders and no partial shipments.
- **`credit` (בהקפה) is a paid-equivalent state.** An order that reached the lab
  unpaid under approved credit terms: the money is owed, the work goes ahead.
- **Credit terms warn, they never block.** There is no credit limit. Collection
  is one link for the whole open balance — all or nothing — producing one
  consolidated document.
- **The pharmacy issues no documents itself.** A cloud provider issues a tax
  invoice/receipt the moment money arrives and returns the document number and
  the tax-authority allocation number. A failed issue is a tracked exception with
  a re-issue action.
- **Patient personal data stays local.** It is never sent to an external system.
- **Payment links live 7 days.** On expiry the order is cancelled automatically
  and the stock allocated to it is released.
- **Stock adjustments have three reasons with two behaviours.** A count *sets*
  the quantity to what was physically found and records the variance; damage and
  rejection *deduct* from a named batch.
- **Batch selection is FEFO — first expired, first out — with pharmacist
  approval** before stock is deducted. Since V2 the rule is a setting; FIFO by
  receipt is the alternative.
- **Courier delivery requires a signed power of attorney.** Pickup does not.
- **Loyalty is a credit-points wallet** where 1 point = ₪1.

Every state-changing action writes one immutable row to the system log, and
destructive actions confirm first.

## Deploying it

```bash
npm ci
npm run verify:prod
VITE_DATA_SOURCE=api VITE_API_BASE=/api/admin npm run build
```

`dist/` is a static bundle. Three things the host has to get right:

- **History-mode routing.** Every unmatched path must serve `index.html`, or a
  refresh on `/orders/TF-2851` returns a 404 from the web server itself. On nginx
  that is `try_files $uri $uri/ /index.html;`.
- **A sub-path deploy needs `BASE_PATH` at build time** — `BASE_PATH=/admin/ npm
  run build` — because asset URLs are baked into the bundle.
- **`VITE_DATA_SOURCE=api` is what keeps the fixture out of the build.** Not only
  at runtime: the branch in `data/source.js` folds at compile time, so the
  fabricated records are absent from the output rather than merely unreachable.
  `npm run verify:prod` proves it and fails the build if they are there.

### The test environment

`.github/workflows/pages.yml` publishes a **demo** build to GitHub Pages on every
push to `main`. It is for reviewing screens, not for production: every record comes
from the fixture, and every change is discarded on refresh.

The fixture's phone numbers, national IDs and company numbers are fabricated but
shaped like real Israeli ones, and the test environment is public, so they are
public with it. `npm run check:privacy` reports every such value and stays in the
repository as the tool for neutralising them: phones move to the `000` subscriber
block, national IDs take a `9` prefix and a deliberately failing check digit,
company numbers an `8` prefix, and emails a reserved domain. Production builds do
not carry any of it — `check:build` fails if they do.

## Provenance

Converted from a React 18 / Babel-standalone interactive prototype built in Claude
Design. The conversion moved every fabricated record into `demo/`, extracted every
string into locale catalogs, replaced simulated system behaviour with real state
from the data layer, and hoisted inline thresholds into `config/`.
