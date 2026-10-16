# The system as it exists — inventory and constraints

What a design has to be built with and inside of. Values that live in code are
not copied here; `scripts/tokens.sh` prints them live. This file holds the
shape of things and the constraints that do not show in a stylesheet.

## Stack

Vue 3.5 (`<script setup>`), Vite 6, Pinia 3, vue-i18n 11, vue-router 4. The
styling is **hand-written CSS**: `resources/css/admin.css` (~4,200 lines, 442
`.a-*` class families) plus scoped `<style>` blocks per component. Tailwind 4
is imported as a base layer in `app.css` and is **not** used for layout or
components in templates — do not start.

Data lives in PGlite (PostgreSQL in WebAssembly) persisted to IndexedDB, with
a read-model cache. Record shapes are stamped with `DATA_VERSION` in
`database/spec.mjs`; a design change never touches data shape, but a design
that needs a new field goes through that door, with its stamp bumped.

Deployed as a static bundle on GitHub Pages (`VITE_DATA_SOURCE=db`), which is
a review environment in the reviewer's own browser. Weight matters: the bundle
already ships a 10 MB WASM engine. A web font is loaded from Google Fonts in
`index.html`; anything self-hosted must be justified.

## Tokens

All in `admin.css` `:root` — colour (36 values), layout (`--a-nav`, `--a-side`,
`--a-r`, `--a-demo-h`, drawer slide distances), fonts (`--font-heb`,
`--font-latin`). Overridden per breakpoint lower in the file. Semantic status
colours each come as a pair: `--a-<tone>` and `--a-<tone>-bg`. There is **no
dark theme** by decision; `color-scheme: light` is declared so native controls
stay light on dark-mode machines.

Run `bash .claude/skills/design-better/scripts/tokens.sh` for the live list.

## Typography

`--font-heb: Assistant, Heebo, Segoe UI` for everything Hebrew (the document
default); `--font-latin: Inter, Helvetica Neue` for Latin text, codes and
numbers inside `.num`, `.a-code`, `ANum`. Weights loaded: Assistant 300–700,
Heebo 400–700, Inter 400–700. Cormorant Garamond (the brand serif) is **not**
loaded in the admin today.

## Shared UI components — `resources/js/components/ui/` (45)

Layout & chrome: `ACard` (title, icon, `pad`), `ADrawer`, `AModal` (with the
minimise-to-tray control), `ATabs`, `ChipStrip`, `FilterBar`, `FilterDrawer`,
`FilterChips`, `FacetCheckList`, `SavedViews`, `DateRangeBar`, `DemoBar`,
`WindowTray` (in layout/).

Data: `ADataTable` (the one table — cols spec, sorting, selected row, custom
scroll bar above the header, `#cell-<k>` and `#empty` slots), `APagination`,
`AKeyValue`, `AKpi`, `FilterKpi`, `ANum` (LTR number), `AMoney`.

Controls: `AButton` (`kind` p/ghost/danger/archive, `sm`, `icon`), `AInput`
(`ltr`), `ASelect`, `ATextarea`, `ASwitch`, `AChip` (`tone`, `size`, `dot`),
`StatusChip`, `PayerChip`, `PaymentChip`, `ExceptionChip`, `RBadge`, `AIcon`
(the icon set is `icons.js` — 50 hand-drawn strokes; adding one means drawing
it in the same stroke weight).

States & feedback: `AEmpty` (icon, title, sub), `AErrorState`, `ASkeleton`,
`AToastHost`, `ConfirmDialog` (title, body, `effects`, `danger`, `pin`,
`reason`), `ActionGate` (`id`, `compact`), `ABubble`, `InteractionCard`,
`ActivitiesPanel`, `ChangeLogPanel`, `AttachmentsPanel`, `FileViewerModal`,
`OrderLink`, `NumericFilter`.

Layout helpers in `admin.css`: `.a-grid`, `.a-2col`, `.a-3col`, `.a-w100`,
`.a-push`, `.a-lbl`, `.a-hint`, `.a-inv` (invalid), `.a-note` with
`--info/--warn/--danger/--ok`, `.a-rowbtns`, `.a-sect-t`, `.a-pagehead`,
`.a-crumbs`, `.a-h1`, `.a-sub`, `.t-strong`, `.t-sub`, `.num`, `.nowrap`.

Every screen opens with `PageHead` (crumbs, title, sub, `#actions`).

## Conventions that are design decisions

- **URL is the state.** `useUrlState()` binds filters, page, sort and the open
  record to the query string; editors and dialogs are local state.
- **RTL via logical properties.** `inline-start/end`, `text-align: start`,
  `dir="auto"` on data that may be either script. The nav sits on the reading
  start; drawers slide from the reading end (`--a-slide-from` flips per
  direction).
- **Paging over long lists** with `usePaged` + `useSorted` + `APagination`,
  keys `pg/ps/sk/sd` (prefixed when two lists share a screen).
- **Money and quantity formatting** follow the figure: `money()`, `qtyText()`,
  `pctText()` in `lib/money.js` — never a fixed two decimals in a template.
- **The i18n check** (`npm run check:i18n`) fails on: a key in one catalog and
  not the other, a `t()` key that does not exist, a Hebrew literal in a `.vue`
  file. Design copy therefore always lands in both catalogs.

## Verification commands

```bash
npx prettier --write <files>          # never the whole tree blindly
npx eslint . --fix --max-warnings 0
npm run check:i18n
npm run verify:prod                   # lint, i18n, privacy, db, build, build-check
```

Browser: `.claude/launch.json` → `trifolium-admin` (dev, :5183) and
`trifolium-admin-preview` (production build, :5184). A fixture or schema
change needs **ניהול מסד הנתונים → בנייה מחדש** in the running app.
